import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Provider cards for the /launchpad gallery. Real OCFS fields only — no
// fabricated stats. Scoped by ?county= / ?city= / ?zip= / ?senate_district= /
// ?assembly_district= and required ?program_type=. Ranked by capacity so the
// strongest providers surface first. Slug is name-derived for /facility/[slug].

const ACTIVE = `(facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')`

const numOrNull = (v: string | null): number | null => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const county = req.nextUrl.searchParams.get('county')?.trim() || null
  const city = req.nextUrl.searchParams.get('city')?.trim() || null
  const zip = req.nextUrl.searchParams.get('zip')?.trim() || null
  const programType = req.nextUrl.searchParams.get('program_type')?.trim() || null
  const senate = numOrNull(req.nextUrl.searchParams.get('senate_district'))
  const assembly = numOrNull(req.nextUrl.searchParams.get('assembly_district'))
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 60, 120)

  const rows = await sql.query(
    `SELECT
       facility_id                                                  AS id,
       regexp_replace(lower(facility_name), '[^a-z0-9]+', '-', 'g') AS slug,
       facility_name                                                AS name,
       county, city,
       program_type                                                 AS type,
       COALESCE(total_capacity, 0)::int                             AS seats,
       COALESCE(infant_capacity, 0)::int                            AS infant,
       COALESCE(toddler_capacity, 0)::int                           AS toddler,
       COALESCE(preschool_capacity, 0)::int                         AS preschool,
       COALESCE(school_age_capacity, 0)::int                        AS school_age,
       license_issue_date                                           AS since
     FROM facilities
     WHERE ${ACTIVE}
       AND ($1::text IS NULL OR county ILIKE $1)
       AND ($2::text IS NULL OR city ILIKE $2)
       AND ($3::text IS NULL OR zip_code = $3)
       AND ($4::text IS NULL OR program_type = $4)
       AND ($5::int IS NULL OR senate_district = $5)
       AND ($6::int IS NULL OR assembly_district = $6)
     ORDER BY total_capacity DESC NULLS LAST, facility_name
     LIMIT $7`,
    [county, city, zip, programType, senate, assembly, limit],
  )

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  })
}
