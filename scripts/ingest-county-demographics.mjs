/**
 * Ingests county-level demographics from the U.S. Census ACS 5-year (2022) for
 * all New York counties into the Neon `county_demographics` table — same
 * variables/structure as the ZIP ingest, at county geography (state 36).
 *
 *   B01003_001E  total population
 *   B23008_002E  own children under 6 (total)
 *   B23008_004E  under 6 · two parents · both in labor force
 *   B23008_008E  under 6 · living with one parent (single-parent total)
 *   B23008_010E  under 6 · single father · in labor force
 *   B23008_013E  under 6 · single mother · in labor force
 *   B13002_002E  women 15–50 who had a birth in the past 12 months
 *   B17020_003E  under 5 · income below poverty level
 *   B17020_011E  under 5 · income at or above poverty level
 *
 * (Poverty is published for "under 5", a tighter bracket than the "under 6"
 * family used elsewhere — surface it as an "under-5" rate, not "under-6".)
 *
 * Usage: node --env-file=.env.local scripts/ingest-county-demographics.mjs
 */

import pg from 'pg'
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL
const CENSUS_API_KEY = process.env.CENSUS_API_KEY
if (!DATABASE_URL) { console.error('Set DATABASE_URL'); process.exit(1) }
if (!CENSUS_API_KEY) { console.error('Set CENSUS_API_KEY'); process.exit(1) }

const YEAR = 2022
const VARS = [
  'B01003_001E', 'B23008_002E', 'B23008_004E', 'B23008_010E', 'B23008_013E',
  'B23008_008E', 'B13002_002E', 'B17020_003E', 'B17020_011E',
]
const ACS_URL =
  `https://api.census.gov/data/${YEAR}/acs/acs5?get=NAME,${VARS.join(',')}` +
  `&for=county:*&in=state:36&key=${CENSUS_API_KEY}`

const toCount = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: true })

async function main() {
  const client = await pool.connect()
  try {
    console.log(`fetching ACS5 ${YEAR} (NY counties)…`)
    const res = await fetch(ACS_URL)
    if (!res.ok) throw new Error('Census HTTP ' + res.status)
    const data = await res.json()
    const idx = Object.fromEntries(data[0].map((h, i) => [h, i]))

    const rows = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      rows.push({
        fips: String(row[idx['state']]) + String(row[idx['county']]),
        name: String(row[idx['NAME']]).split(',')[0].trim(),
        population: toCount(row[idx['B01003_001E']]),
        under6:     toCount(row[idx['B23008_002E']]),
        both:       toCount(row[idx['B23008_004E']]),
        sfather:    toCount(row[idx['B23008_010E']]),
        smother:    toCount(row[idx['B23008_013E']]),
        oneParent:  toCount(row[idx['B23008_008E']]),
        births:     toCount(row[idx['B13002_002E']]),
        povBelow:   toCount(row[idx['B17020_003E']]),
        povAbove:   toCount(row[idx['B17020_011E']]),
      })
    }

    const cols = [
      'county_fips', 'county_name', 'studyyear', 'population', 'children_under6',
      'under6_both_working', 'under6_single_father_working', 'under6_single_mother_working',
      'under6_one_parent', 'births_past_year', 'under5_below_poverty', 'under5_above_poverty',
    ]
    const values = []
    const ph = rows.map((r, j) => {
      values.push(
        r.fips, r.name, YEAR, r.population, r.under6, r.both, r.sfather, r.smother,
        r.oneParent, r.births, r.povBelow, r.povAbove,
      )
      const b = j * cols.length
      return `(${cols.map((_, k) => `$${b + k + 1}`).join(',')})`
    })

    await client.query(
      `INSERT INTO county_demographics (${cols.join(',')}) VALUES ${ph.join(',')}
       ON CONFLICT (county_fips) DO UPDATE SET
         county_name = EXCLUDED.county_name,
         studyyear = EXCLUDED.studyyear,
         population = EXCLUDED.population,
         children_under6 = EXCLUDED.children_under6,
         under6_both_working = EXCLUDED.under6_both_working,
         under6_single_father_working = EXCLUDED.under6_single_father_working,
         under6_single_mother_working = EXCLUDED.under6_single_mother_working,
         under6_one_parent = EXCLUDED.under6_one_parent,
         births_past_year = EXCLUDED.births_past_year,
         under5_below_poverty = EXCLUDED.under5_below_poverty,
         under5_above_poverty = EXCLUDED.under5_above_poverty,
         ingested_at = now()`,
      values,
    )
    console.log('Done. county_demographics rows upserted:', rows.length)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
