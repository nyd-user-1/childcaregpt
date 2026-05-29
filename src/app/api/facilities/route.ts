import { NextRequest, NextResponse } from 'next/server';
import { getFacilityById, getFacilityByProfileUrl, listFacilities } from '@/lib/queries/facilities';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Single-facility lookup by facility_id — bypasses all other filters.
  const facilityId = searchParams.get('facility_id');
  if (facilityId) {
    const rows = await getFacilityById(facilityId);
    return NextResponse.json({ data: rows, total: rows.length, limit: 1, offset: 0 });
  }

  // (profile_url kept for any future use, but facility_id is preferred.)
  const profileUrl = searchParams.get('profile_url');
  if (profileUrl) {
    const rows = await getFacilityByProfileUrl(profileUrl);
    return NextResponse.json({ data: rows, total: rows.length, limit: 1, offset: 0 });
  }

  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const { data, total } = await listFacilities({
    search:      searchParams.get('search')?.trim() ?? '',
    county:      searchParams.get('county'),
    programType: searchParams.get('program_type'),
    status:      searchParams.get('status'),
    limit,
    offset,
  });

  return NextResponse.json({ data, total, limit, offset });
}
