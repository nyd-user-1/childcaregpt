import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Real per-geography aggregates for the /launchpad table.
// ?level=district|county|city|zip returns rows of
// { name, county|chamber, slug, providers, capacity } for active OCFS providers.
//
// district: 63 senate + 150 assembly in one list, with a `chamber` field
//           (slug = "senate-32" / "assembly-86")
// county:   all ~62 (slug = name-derived, matches /county/[slug])
// city:     top 150 by capacity (slug = "city-county" to disambiguate dup names)
// zip:      top 150 by capacity (slug = the 5-digit code)
//
// No fabricated fields — providers is a COUNT, capacity is SUM(total_capacity).

const ACTIVE = `(facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')`
const TOP_N = 150

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
                COUNT(*)::int AS providers, COALESCE(SUM(total_capacity),0)::int AS capacity
         FROM facilities WHERE ${ACTIVE} AND senate_district IS NOT NULL
         GROUP BY senate_district
         UNION ALL
         SELECT 'assembly' AS chamber, assembly_district AS num,
                COUNT(*)::int AS providers, COALESCE(SUM(total_capacity),0)::int AS capacity
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
         agg.providers                                              AS providers,
         agg.capacity                                               AS capacity
       FROM agg
       LEFT JOIN legislative_districts ld
         ON ld.chamber = agg.chamber AND ld.district = agg.num
       ORDER BY chamber, num`,
    )
  } else if (level === 'city') {
    rows = await sql.query(
      `SELECT
         city                                                       AS name,
         county,
         regexp_replace(lower(city || '-' || county), '[^a-z0-9]+', '-', 'g') AS slug,
         COUNT(*)::int                                              AS providers,
         COALESCE(SUM(total_capacity), 0)::int                      AS capacity
       FROM facilities
       WHERE ${ACTIVE} AND city IS NOT NULL AND city <> ''
       GROUP BY city, county
       ORDER BY capacity DESC, providers DESC, name
       LIMIT ${TOP_N}`,
    )
  } else if (level === 'zip') {
    rows = await sql.query(
      `SELECT
         zip_code                                                   AS name,
         MIN(county)                                                AS county,
         zip_code                                                   AS slug,
         COUNT(*)::int                                              AS providers,
         COALESCE(SUM(total_capacity), 0)::int                      AS capacity
       FROM facilities
       WHERE ${ACTIVE} AND zip_code IS NOT NULL AND zip_code <> ''
       GROUP BY zip_code
       ORDER BY capacity DESC, providers DESC, name
       LIMIT ${TOP_N}`,
    )
  } else {
    rows = await sql.query(
      `SELECT
         county                                                     AS name,
         county,
         regexp_replace(lower(county), '[^a-z0-9]+', '-', 'g')      AS slug,
         COUNT(*)::int                                              AS providers,
         COALESCE(SUM(total_capacity), 0)::int                      AS capacity
       FROM facilities
       WHERE ${ACTIVE} AND county IS NOT NULL
       GROUP BY county
       ORDER BY name`,
    )
  }

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
