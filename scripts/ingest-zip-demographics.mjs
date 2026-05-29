/**
 * Ingests ZIP-level (ZCTA) demographics from the U.S. Census ACS 5-year (2022)
 * into the Neon `zip_demographics` table, filtered to the ZIPs that have NY
 * OCFS providers on file.
 *
 * Variables (B23008 = age of own children under 18 by parents' employment):
 *   B01003_001E  total population
 *   B23008_002E  own children under 6 (total)
 *   B23008_004E  under 6 · two parents · both in labor force
 *   B23008_010E  under 6 · single father · in labor force
 *   B23008_013E  under 6 · single mother · in labor force
 *
 * `working_families_under6` (both-working + single-mother-working) is a generated
 * column on the table — it mirrors the county `h_under6_bothwork`/`h_under6_singlem`
 * demand metric, now at the ZIP level.
 *
 * Usage: node --env-file=.env.local scripts/ingest-zip-demographics.mjs
 */

import pg from 'pg'
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL
const CENSUS_API_KEY = process.env.CENSUS_API_KEY
if (!DATABASE_URL) { console.error('Set DATABASE_URL'); process.exit(1) }
if (!CENSUS_API_KEY) { console.error('Set CENSUS_API_KEY'); process.exit(1) }

const YEAR = 2022
const VARS = ['B01003_001E', 'B23008_002E', 'B23008_004E', 'B23008_010E', 'B23008_013E']
const ACS_URL =
  `https://api.census.gov/data/${YEAR}/acs/acs5?get=NAME,${VARS.join(',')}` +
  `&for=zip%20code%20tabulation%20area:*&key=${CENSUS_API_KEY}`

// Census uses large negatives for suppressed/missing values; treat negatives
// and non-numbers as null. Counts are otherwise non-negative integers.
const toCount = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: true })

async function main() {
  const client = await pool.connect()
  try {
    // ZIPs we care about: distinct 5-digit prefixes of facility zip codes.
    const { rows: zr } = await client.query(
      `SELECT DISTINCT left(zip_code, 5) AS z FROM facilities
       WHERE zip_code IS NOT NULL AND length(zip_code) >= 5`,
    )
    const wanted = new Set(zr.map(r => r.z).filter(Boolean))
    console.log('facility ZIPs to match:', wanted.size)

    console.log(`fetching ACS5 ${YEAR} (all ZCTAs)…`)
    const res = await fetch(ACS_URL)
    if (!res.ok) throw new Error('Census HTTP ' + res.status)
    const data = await res.json()
    const idx = Object.fromEntries(data[0].map((h, i) => [h, i]))
    const zi = idx['zip code tabulation area']

    const matched = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const zip = row[zi]
      if (!wanted.has(zip)) continue
      matched.push({
        zip,
        population: toCount(row[idx['B01003_001E']]),
        under6:     toCount(row[idx['B23008_002E']]),
        both:       toCount(row[idx['B23008_004E']]),
        sfather:    toCount(row[idx['B23008_010E']]),
        smother:    toCount(row[idx['B23008_013E']]),
      })
    }
    console.log('matched ZCTAs:', matched.length)

    const cols = [
      'zip', 'studyyear', 'population', 'children_under6',
      'under6_both_working', 'under6_single_father_working', 'under6_single_mother_working',
    ]
    const BATCH = 100
    let total = 0
    for (let i = 0; i < matched.length; i += BATCH) {
      const batch = matched.slice(i, i + BATCH)
      const values = []
      const ph = batch.map((r, j) => {
        values.push(r.zip, YEAR, r.population, r.under6, r.both, r.sfather, r.smother)
        const b = j * cols.length
        return `(${cols.map((_, k) => `$${b + k + 1}`).join(',')})`
      })
      await client.query(
        `INSERT INTO zip_demographics (${cols.join(',')}) VALUES ${ph.join(',')}
         ON CONFLICT (zip) DO UPDATE SET
           studyyear = EXCLUDED.studyyear,
           population = EXCLUDED.population,
           children_under6 = EXCLUDED.children_under6,
           under6_both_working = EXCLUDED.under6_both_working,
           under6_single_father_working = EXCLUDED.under6_single_father_working,
           under6_single_mother_working = EXCLUDED.under6_single_mother_working,
           ingested_at = now()`,
        values,
      )
      total += batch.length
    }
    console.log('Done. zip_demographics rows upserted:', total)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
