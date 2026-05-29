import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Real per-geography aggregates for the /launchpad table. Every row carries
// providers, capacity, and a per-program-type breakdown (dcc/fdc/gfdc/sacc/sdcc).
// ?level=district|county|city|zip.
//
// district: 63 senate + 150 assembly in one list (rep name + chamber + code)
// county:   all ~62 (+ fps = families-per-seat, from county_costs need data)
// city:     top 150 by capacity (no fps — no need data at city geography)
// zip:      top 150 by capacity (+ fps, from zip_demographics need data)
//
// No fabricated fields — counts/sums are real; fps is need/seats where the
// Census/DOL need denominator exists (county + zip only).

const ACTIVE = `(facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')`
const TOP_N = 150

// Per-program-type provider counts via conditional aggregation. Same five keys
// the cards/map use. Returned as dcc/fdc/gfdc/sacc/sdcc on every row.
const TYPE_COUNTS = `
  COUNT(*) FILTER (WHERE program_type = 'DCC')::int  AS dcc,
  COUNT(*) FILTER (WHERE program_type = 'FDC')::int  AS fdc,
  COUNT(*) FILTER (WHERE program_type = 'GFDC')::int AS gfdc,
  COUNT(*) FILTER (WHERE program_type = 'SACC')::int AS sacc,
  COUNT(*) FILTER (WHERE program_type = 'SDCC')::int AS sdcc`

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get('level') ?? 'county'

  let rows
  if (level === 'district') {
    // Per-district provider/capacity aggregates joined to the elected
    // representative. `name` is the rep (first column); `code` is the short
    // district label (SD-4 / AD-13); `num`/`chamber`/`slug` drive scoping +
    // the /district/{chamber}/{num} detail link.
    rows = await sql.query(
      `WITH agg AS (
         SELECT 'senate' AS chamber, senate_district AS num,
                COUNT(*)::int AS providers, COALESCE(SUM(total_capacity),0)::int AS capacity,
                ${TYPE_COUNTS}
         FROM facilities WHERE ${ACTIVE} AND senate_district IS NOT NULL
         GROUP BY senate_district
         UNION ALL
         SELECT 'assembly' AS chamber, assembly_district AS num,
                COUNT(*)::int AS providers, COALESCE(SUM(total_capacity),0)::int AS capacity,
                ${TYPE_COUNTS}
         FROM facilities WHERE ${ACTIVE} AND assembly_district IS NOT NULL
         GROUP BY assembly_district
       )
       SELECT
         COALESCE(ld.name,
           CASE WHEN agg.chamber='senate' THEN 'Senate District ' ELSE 'Assembly District ' END || agg.num
         )                                                          AS name,
         ld.party                                                   AS party,
         CASE WHEN agg.chamber='senate' THEN 'SD-' ELSE 'AD-' END || agg.num  AS code,
         INITCAP(agg.chamber)                                       AS chamber,
         agg.num                                                    AS num,
         agg.chamber || '-' || agg.num                              AS slug,
         agg.providers, agg.capacity,
         agg.dcc, agg.fdc, agg.gfdc, agg.sacc, agg.sdcc
       FROM agg
       LEFT JOIN legislative_districts ld
         ON ld.chamber = agg.chamber AND ld.district = agg.num
       ORDER BY chamber, num`,
    )
  } else if (level === 'city') {
    // Raw city values vary in case/whitespace (BRONX / BRonx / bronx), so group
    // on a normalized key and INITCAP a clean display name to avoid dup rows +
    // colliding slugs.
    rows = await sql.query(
      `SELECT
         INITCAP(LOWER(TRIM(city)))                                  AS name,
         county,
         regexp_replace(LOWER(TRIM(city)) || '-' || lower(county), '[^a-z0-9]+', '-', 'g') AS slug,
         COUNT(*)::int                                              AS providers,
         COALESCE(SUM(total_capacity), 0)::int                      AS capacity,
         ${TYPE_COUNTS}
       FROM facilities
       WHERE ${ACTIVE} AND city IS NOT NULL AND TRIM(city) <> ''
       GROUP BY LOWER(TRIM(city)), county
       ORDER BY capacity DESC, providers DESC, name
       LIMIT ${TOP_N}`,
    )
  } else if (level === 'zip') {
    // FPS = working-families-under-6 (zip_demographics) / total seats.
    rows = await sql.query(
      `WITH agg AS (
         SELECT zip_code,
           MIN(county)                          AS county,
           COUNT(*)::int                        AS providers,
           COALESCE(SUM(total_capacity), 0)::int AS capacity,
           ${TYPE_COUNTS}
         FROM facilities
         WHERE ${ACTIVE} AND zip_code IS NOT NULL AND zip_code <> ''
         GROUP BY zip_code
       )
       SELECT
         agg.zip_code AS name, agg.county, agg.zip_code AS slug,
         agg.providers, agg.capacity,
         agg.dcc, agg.fdc, agg.gfdc, agg.sacc, agg.sdcc,
         CASE WHEN agg.capacity > 0 AND zd.working_families_under6 > 0
              THEN ROUND((zd.working_families_under6::numeric / agg.capacity), 1)
              ELSE NULL END AS fps
       FROM agg
       LEFT JOIN zip_demographics zd ON zd.zip = agg.zip_code
       ORDER BY agg.capacity DESC, agg.providers DESC, name
       LIMIT ${TOP_N}`,
    )
  } else {
    // FPS = (h_under6_bothwork + h_under6_singlem) / total seats. Counties join
    // to county_costs by mapped name (boroughs → Kings/New York/Richmond).
    rows = await sql.query(
      `WITH agg AS (
         SELECT county,
           COUNT(*)::int                         AS providers,
           COALESCE(SUM(total_capacity), 0)::int AS capacity,
           ${TYPE_COUNTS}
         FROM facilities WHERE ${ACTIVE} AND county IS NOT NULL
         GROUP BY county
       ),
       need AS (
         SELECT county_name,
           (COALESCE(h_under6_bothwork,0) + COALESCE(h_under6_singlem,0))::numeric AS need_hh
         FROM county_costs WHERE studyyear = 2022
       )
       SELECT
         agg.county AS name, agg.county,
         regexp_replace(lower(agg.county), '[^a-z0-9]+', '-', 'g') AS slug,
         agg.providers, agg.capacity,
         agg.dcc, agg.fdc, agg.gfdc, agg.sacc, agg.sdcc,
         CASE WHEN agg.capacity > 0 AND n.need_hh > 0
              THEN ROUND((n.need_hh / agg.capacity), 1)
              ELSE NULL END AS fps
       FROM agg
       LEFT JOIN need n ON lower(n.county_name) = lower(
         CASE agg.county
           WHEN 'Brooklyn'      THEN 'Kings County'
           WHEN 'Manhattan'     THEN 'New York County'
           WHEN 'Staten Island' THEN 'Richmond County'
           ELSE agg.county || ' County'
         END)
       ORDER BY name`,
    )
  }

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
