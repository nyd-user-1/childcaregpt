import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Compact dot rows for the canvas dot map. Keys are short to keep the payload
// small across ~11k rows: c=slug, n=name, la/lo=coords, m=capacity, t=program type.
// Optional ?county= and ?program_type= narrow the set (county is the bare name,
// e.g. "Suffolk"). Slug is name-derived to match /facility/[slug].
export async function GET(req: NextRequest) {
  const county = req.nextUrl.searchParams.get('county')?.trim() || null
  const programType = req.nextUrl.searchParams.get('program_type')?.trim() || null

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
       AND (facility_status ILIKE '%license%' OR facility_status ILIKE '%registered%' OR facility_status ILIKE '%active%')
       AND ($1::text IS NULL OR county ILIKE $1)
       AND ($2::text IS NULL OR program_type = $2)`,
    [county, programType],
  )

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
