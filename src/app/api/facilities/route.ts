import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search      = searchParams.get('search')?.trim() ?? '';
  const county      = searchParams.get('county');
  const programType = searchParams.get('program_type');
  const status      = searchParams.get('status');
  const profileUrl  = searchParams.get('profile_url');
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 200);
  const offset      = parseInt(searchParams.get('offset') ?? '0', 10);

  // Single-facility lookup by profile_url — bypass all other filters
  if (profileUrl) {
    const rows = await sql`
      SELECT
        facility_id, facility_name, county, city,
        program_type, facility_status, total_capacity,
        infant_capacity, toddler_capacity, preschool_capacity,
        school_age_capacity, provider_name, license_expiration_date,
        profile_url, phone_number
      FROM facilities
      WHERE profile_url = ${profileUrl}
      LIMIT 1
    `
    return NextResponse.json({ data: rows, total: rows.length, limit: 1, offset: 0 })
  }

  const pattern = search ? `%${search}%` : null;

  const [rows, countRows] = await Promise.all([
    pattern
      ? sql`
          SELECT
            facility_id, facility_name, county, city,
            program_type, facility_status, total_capacity,
            infant_capacity, toddler_capacity, preschool_capacity,
            school_age_capacity, provider_name, license_expiration_date,
            profile_url
          FROM facilities
          WHERE (
            facility_name ILIKE ${pattern}
            OR county ILIKE ${pattern}
            OR city ILIKE ${pattern}
          )
          AND (${county}::text      IS NULL OR county         ILIKE ${county})
          AND (${programType}::text IS NULL OR program_type   = ${programType})
          AND (${status}::text      IS NULL OR facility_status = ${status})
          ORDER BY facility_name
          LIMIT ${limit} OFFSET ${offset}
        `
      : sql`
          SELECT
            facility_id, facility_name, county, city,
            program_type, facility_status, total_capacity,
            infant_capacity, toddler_capacity, preschool_capacity,
            school_age_capacity, provider_name, license_expiration_date,
            profile_url
          FROM facilities
          WHERE
            (${county}::text      IS NULL OR county         ILIKE ${county})
            AND (${programType}::text IS NULL OR program_type   = ${programType})
            AND (${status}::text      IS NULL OR facility_status = ${status})
          ORDER BY facility_name
          LIMIT ${limit} OFFSET ${offset}
        `,
    pattern
      ? sql`
          SELECT COUNT(*)::int AS total FROM facilities
          WHERE (
            facility_name ILIKE ${pattern}
            OR county ILIKE ${pattern}
            OR city ILIKE ${pattern}
          )
        `
      : sql`SELECT COUNT(*)::int AS total FROM facilities`,
  ]);

  return NextResponse.json({
    data: rows,
    total: Number(countRows[0].total),
    limit,
    offset,
  });
}
