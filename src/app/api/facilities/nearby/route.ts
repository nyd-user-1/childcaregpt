import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Returns licensed providers ranked by real distance from a point. Powers the
// ZIP-code map's local view. Same Haversine approach as the chat's find_facilities
// (no PostGIS dependency on Neon).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const programType = searchParams.get('program_type')
  const radius = Math.min(Number(searchParams.get('radius')) || 5, 25)
  const limit = Math.min(Number(searchParams.get('limit')) || 60, 100)

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return NextResponse.json({ error: 'valid lat/lng required' }, { status: 400 })
  }

  const queryWithin = (r: number) => sql`
    SELECT * FROM (
      SELECT facility_id, facility_name, provider_name, county, city, zip_code,
             program_type, facility_status, total_capacity,
             infant_capacity, toddler_capacity, preschool_capacity, school_age_capacity,
             phone_number, latitude, longitude,
             ROUND((3958.8 * acos(LEAST(1, GREATEST(-1,
               sin(radians(${lat})) * sin(radians(latitude)) +
               cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng}))
             ))))::numeric, 1) AS distance_miles
      FROM facilities
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND (facility_status ILIKE '%license%' OR facility_status ILIKE '%registered%' OR facility_status ILIKE '%active%')
        AND (${programType}::text IS NULL OR program_type = ${programType})
    ) q
    WHERE distance_miles <= ${r}
    ORDER BY distance_miles ASC
    LIMIT ${limit}
  `

  // Start tight; widen once if the neighborhood is sparse.
  let rows = await queryWithin(radius)
  let usedRadius = radius
  if (rows.length < 6 && radius < 25) {
    usedRadius = Math.min(radius * 3, 25)
    rows = await queryWithin(usedRadius)
  }

  const PROGRAM_TYPE_LABEL: Record<string, string> = {
    DCC: 'Day Care Center', FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
    SACC: 'School-Age Child Care', SDCC: 'Small Day Care Center',
  }
  const data = rows.map(r => ({ ...r, program_type_label: PROGRAM_TYPE_LABEL[r.program_type as string] ?? r.program_type }))
  return NextResponse.json({ data, radius: usedRadius, total: data.length })
}
