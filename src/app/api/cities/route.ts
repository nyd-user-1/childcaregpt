import { NextRequest, NextResponse } from 'next/server'
import { listCities } from '@/lib/queries/geo'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const { data, total } = await listCities(search)
  return NextResponse.json({ data, total })
}
