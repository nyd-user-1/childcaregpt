import { NextRequest, NextResponse } from 'next/server';
import { listCountyCosts } from '@/lib/queries/county-costs';

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? '2022', 10);
  const rows = await listCountyCosts(year);
  return NextResponse.json({ data: rows, year });
}
