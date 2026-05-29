import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const numOrNull = (v: string | null): number | null => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? n : null
}

// Compact dot rows for the canvas dot map. Keys are short to keep the payload
// small across ~11k rows: c=slug, n=name, la/lo=coords, m=capacity, t=program type.
// Optional ?county= / ?city= / ?zip= and ?program_type= narrow the set (county and
// city are bare names, e.g. "Suffolk" / "Brentwood"; zip is the 5-digit code).
// Slug is name-derived to match /facility/[slug].
export async function GET(req: NextRequest) {
  const county = req.nextUrl.searchParams.get('county')?.trim() || null
  const city = req.nextUrl.searchParams.get('city')?.trim() || null
  const zip = req.nextUrl.searchParams.get('zip')?.trim() || null
  const programType = req.nextUrl.searchParams.get('program_type')?.trim() || null
  const senate = numOrNull(req.nextUrl.searchParams.get('senate_district'))
  const assembly = numOrNull(req.nextUrl.searchParams.get('assembly_district'))

  const rows = await sql.query(
    `SELECT
       regexp_replace(lower(facility_name), '[^a-z0-9]+', '-', 'g') AS c,
       facility_name                       AS n,
       ROUND(latitude::numeric,  4)        AS la,
       ROUND(longitude::numeric, 4)        AS lo,
       COALESCE(total_capacity, 0)::int    AS m,
       program_type                        AS t
     FROM facilities
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND (facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')
       AND ($1::text IS NULL OR county ILIKE $1)
       AND ($2::text IS NULL OR program_type = $2)
       AND ($3::text IS NULL OR city ILIKE $3)
       AND ($4::text IS NULL OR zip_code = $4)
       AND ($5::int IS NULL OR senate_district = $5)
       AND ($6::int IS NULL OR assembly_district = $6)`,
    [county, programType, city, zip, senate, assembly],
  )

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
