import { notFound } from 'next/navigation'
import { getChartConfig, CHART_CONFIGS } from '@/lib/chart-configs'
import { getChartData } from '@/lib/chart-queries'
import { ChartDetailPage } from '@/components/ChartDetailPage'

export async function generateStaticParams() {
  return CHART_CONFIGS.map(c => ({ slug: c.slug }))
}

export default async function ChartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = getChartConfig(slug)
  if (!config) notFound()

  const idx      = CHART_CONFIGS.findIndex(c => c.slug === slug)
  const prevHref = idx === 0
    ? '/charts'
    : `/chart/${CHART_CONFIGS[idx - 1].slug}`
  const nextHref = idx === CHART_CONFIGS.length - 1
    ? '/maps'
    : `/chart/${CHART_CONFIGS[idx + 1].slug}`

  const data = await getChartData(slug)
  if (!data) notFound()

  return (
    <ChartDetailPage
      config={config}
      prevHref={prevHref}
      nextHref={nextHref}
      kpiValue={data.kpiValue}
      tableRows={data.tableRows}
      chartPoints={data.chartPoints}
      multiPoints={data.multiPoints}
      scatterPoints={data.scatterPoints}
    />
  )
}
