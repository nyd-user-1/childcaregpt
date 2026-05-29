import { sql } from '@/lib/db'
import type { StdRow, MultiRow, ScatterRow } from '@/components/ChartDetailPage'

// Single source for every chart's data query. Server-only: it imports the Neon
// client, so it must never be pulled into a client bundle (that's why this lives
// here and not in chart-configs.ts, which client components import). A clone
// rewrites this file + chart-configs.ts and nothing else.

export interface ChartData {
  tableRows: StdRow[]
  chartPoints: StdRow[]
  multiPoints: MultiRow[]
  scatterPoints: ScatterRow[]
  kpiValue: number
}

function data(partial: Partial<ChartData>): ChartData {
  return { tableRows: [], chartPoints: [], multiPoints: [], scatterPoints: [], kpiValue: 0, ...partial }
}

const sum = (rows: StdRow[]) => rows.reduce((s, r) => s + r.value, 0)
const avg = (rows: StdRow[]) => (rows.length ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0)

const CHART_QUERIES: Record<string, () => Promise<ChartData>> = {

  'providers-by-county': async () => {
    const rows = await sql`
      SELECT county AS name, COUNT(*)::int AS value
      FROM facilities GROUP BY county ORDER BY value DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows.slice(0, 30), kpiValue: sum(tableRows) })
  },

  'capacity-by-county': async () => {
    const rows = await sql`
      SELECT county AS name, SUM(total_capacity)::int AS value
      FROM facilities GROUP BY county ORDER BY value DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows.slice(0, 30), kpiValue: sum(tableRows) })
  },

  'program-types': async () => {
    const LABELS: Record<string, string> = {
      DCC: 'Day Care Center (DCC)',
      FDC: 'Family Day Care (FDC)',
      GFDC: 'Group Family Day Care (GFDC)',
      SACC: 'School-Age Child Care (SACC)',
      SDCC: 'Small Day Care Center (SDCC)',
    }
    const rows = await sql`
      SELECT program_type AS name, COUNT(*)::int AS value
      FROM facilities GROUP BY program_type ORDER BY value DESC
    `
    const tableRows = rows.map(r => ({
      name: LABELS[r.name as string] ?? (r.name as string),
      value: Number(r.value),
    }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: sum(tableRows) })
  },

  'facilities-by-year': async () => {
    const rows = await sql`
      SELECT EXTRACT(YEAR FROM facility_opened_date)::int AS yr, COUNT(*)::int AS value
      FROM facilities WHERE facility_opened_date IS NOT NULL
      GROUP BY yr ORDER BY yr
    `
    const tableRows = rows.map(r => ({ name: String(r.yr), value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: sum(tableRows) })
  },

  'age-group-capacity': async () => {
    const [agg] = await sql`
      SELECT
        SUM(infant_capacity)::int     AS infant,
        SUM(toddler_capacity)::int    AS toddler,
        SUM(preschool_capacity)::int  AS preschool,
        SUM(school_age_capacity)::int AS school_age
      FROM facilities
    `
    const tableRows = [
      { name: 'Infant',     value: Number(agg.infant) },
      { name: 'Toddler',    value: Number(agg.toddler) },
      { name: 'Preschool',  value: Number(agg.preschool) },
      { name: 'School-Age', value: Number(agg.school_age) },
    ]
    return data({ tableRows, chartPoints: tableRows, kpiValue: sum(tableRows) })
  },

  'facility-status': async () => {
    const rows = await sql`
      SELECT COALESCE(facility_status, 'Unknown') AS name, COUNT(*)::int AS value
      FROM facilities GROUP BY facility_status ORDER BY value DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: sum(tableRows) })
  },

  'license-expiration': async () => {
    const rows = await sql`
      SELECT EXTRACT(YEAR FROM license_expiration_date)::int AS yr, COUNT(*)::int AS value
      FROM facilities
      WHERE license_expiration_date IS NOT NULL
        AND EXTRACT(YEAR FROM license_expiration_date) BETWEEN 2024 AND 2032
      GROUP BY yr ORDER BY yr
    `
    const tableRows = rows.map(r => ({ name: String(r.yr), value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: sum(tableRows) })
  },

  'infant-care-cost': async () => {
    const rows = await sql`
      SELECT county_name AS name, mcinfant AS value
      FROM county_costs WHERE studyyear = 2022 AND mcinfant IS NOT NULL
      ORDER BY mcinfant DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: avg(tableRows) })
  },

  'toddler-care-cost': async () => {
    const rows = await sql`
      SELECT county_name AS name, mctoddler AS value
      FROM county_costs WHERE studyyear = 2022 AND mctoddler IS NOT NULL
      ORDER BY mctoddler DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: avg(tableRows) })
  },

  'preschool-care-cost': async () => {
    const rows = await sql`
      SELECT county_name AS name, mcpreschool AS value
      FROM county_costs WHERE studyyear = 2022 AND mcpreschool IS NOT NULL
      ORDER BY mcpreschool DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: avg(tableRows) })
  },

  'household-income': async () => {
    const rows = await sql`
      SELECT county_name AS name, mhi AS value
      FROM county_costs WHERE studyyear = 2022 AND mhi IS NOT NULL
      ORDER BY mhi DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: avg(tableRows) })
  },

  'cost-trend': async () => {
    const rows = await sql`
      SELECT studyyear::int AS yr, AVG(mcinfant) AS value
      FROM county_costs WHERE mcinfant IS NOT NULL
      GROUP BY studyyear ORDER BY studyyear
    `
    const tableRows = rows.map(r => ({ name: String(r.yr), value: Number(r.value) }))
    const last = rows[rows.length - 1]
    return data({ tableRows, chartPoints: tableRows, kpiValue: last ? Number(last.value) : 0 })
  },

  'center-vs-family': async () => {
    const rows = await sql`
      SELECT studyyear::int AS yr, AVG(mcinfant) AS center, AVG(mfccinfant) AS family
      FROM county_costs WHERE mcinfant IS NOT NULL AND mfccinfant IS NOT NULL
      GROUP BY studyyear ORDER BY studyyear
    `
    const multiPoints = rows.map(r => ({
      name: String(r.yr),
      center: Number(r.center),
      family: Number(r.family),
    } as unknown as MultiRow))
    const last = rows[rows.length - 1]
    return data({ multiPoints, kpiValue: last ? Math.abs(Number(last.center) - Number(last.family)) : 0 })
  },

  'income-vs-cost': async () => {
    const rows = await sql`
      SELECT county_name AS name, mhi AS x, mcinfant * 52 AS y
      FROM county_costs WHERE studyyear = 2022 AND mhi IS NOT NULL AND mcinfant IS NOT NULL
      ORDER BY county_name
    `
    const scatterPoints = rows.map(r => ({
      name: r.name as string,
      x: Number(r.x),
      y: Number(r.y),
    }))
    return data({ scatterPoints, kpiValue: scatterPoints.length })
  },

  'lfpr-by-county': async () => {
    const rows = await sql`
      SELECT county_name AS name, flfpr_20to64_under6 AS value
      FROM county_costs WHERE studyyear = 2022 AND flfpr_20to64_under6 IS NOT NULL
      ORDER BY flfpr_20to64_under6 DESC
    `
    const tableRows = rows.map(r => ({ name: r.name as string, value: Number(r.value) }))
    return data({ tableRows, chartPoints: tableRows, kpiValue: avg(tableRows) })
  },
}

/**
 * Runs the registered SQL + transform for a chart slug and returns the unified
 * ChartData. Returns null when the slug has a config but no query is registered
 * here — callers should treat null as notFound().
 */
export async function getChartData(slug: string): Promise<ChartData | null> {
  const fn = CHART_QUERIES[slug]
  if (!fn) return null
  return fn()
}
