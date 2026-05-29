import { NextRequest, NextResponse } from 'next/server'
import { searchSite } from '@/lib/queries/search'
import { CHART_CONFIGS } from '@/lib/chart-configs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ counties: [], cities: [], zips: [], facilities: [], charts: [] })
  }

  const results = await searchSite(q)
  const ql = q.toLowerCase()
  const charts = CHART_CONFIGS
    .filter(c => c.title.toLowerCase().includes(ql) || c.description.toLowerCase().includes(ql))
    .slice(0, 6)
    .map(c => ({ slug: c.slug, title: c.title, description: c.description }))

  return NextResponse.json({ ...results, charts })
}
