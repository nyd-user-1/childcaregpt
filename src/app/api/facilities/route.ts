import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const county = searchParams.get('county');
  const programType = searchParams.get('program_type');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const rows = await sql`
    SELECT
      facility_id, program_type, region_code, county, facility_status,
      facility_name, street_number, street_name, additional_address,
      city, state, zip_code, phone_number, provider_name,
      school_district_name, capacity_description,
      infant_capacity, toddler_capacity, preschool_capacity,
      school_age_capacity, total_capacity,
      profile_url, latitude, longitude
    FROM facilities
    WHERE
      (${county}::text    IS NULL OR county       ILIKE ${county})
      AND (${programType}::text IS NULL OR program_type = ${programType})
      AND (${status}::text      IS NULL OR facility_status = ${status})
    ORDER BY facility_name
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return NextResponse.json({ data: rows, limit, offset });
}
