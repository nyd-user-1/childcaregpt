import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { CityShell } from './Shell'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    title: `${name} · ChildcareGPT`,
    description: `Licensed child care in ${name}, New York — providers, capacity, and program types.`,
  }
}

export default async function DetailPageCity({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [statsRows, zipRows] = await Promise.all([
    sql`
      SELECT
        MAX(city) AS city,
        MAX(county) AS county,
        COUNT(*) AS provider_count,
        COALESCE(SUM(total_capacity),      0) AS total_capacity,
        COALESCE(SUM(infant_capacity),     0) AS infant_capacity,
        COALESCE(SUM(toddler_capacity),    0) AS toddler_capacity,
        COALESCE(SUM(preschool_capacity),  0) AS preschool_capacity,
        COALESCE(SUM(school_age_capacity), 0) AS school_age_capacity
      FROM facilities
      WHERE regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') = ${slug}
    `,
    sql`
      SELECT zip_code, COUNT(*) AS providers, SUM(total_capacity) AS seats
      FROM facilities
      WHERE regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') = ${slug}
      GROUP BY zip_code
      ORDER BY providers DESC
      LIMIT 20
    `,
  ])

  const stats = statsRows[0]
  if (!stats?.city) notFound()

  const [prevRows, nextRows, firstRows, lastRows] = await Promise.all([
    sql`
      SELECT DISTINCT city, regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') AS slug
      FROM facilities
      WHERE city < ${stats.city as string}
      ORDER BY city DESC LIMIT 1
    `,
    sql`
      SELECT DISTINCT city, regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') AS slug
      FROM facilities
      WHERE city > ${stats.city as string}
      ORDER BY city ASC LIMIT 1
    `,
    sql`
      SELECT DISTINCT city, regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') AS slug
      FROM facilities ORDER BY city ASC LIMIT 1
    `,
    sql`
      SELECT DISTINCT city, regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') AS slug
      FROM facilities ORDER BY city DESC LIMIT 1
    `,
  ])

  const prevSlug = (prevRows[0]?.slug ?? lastRows[0]?.slug ?? slug) as string
  const nextSlug = (nextRows[0]?.slug ?? firstRows[0]?.slug ?? slug) as string

  // Inherit the parent county's typical cost as context (the level-appropriate
  // pattern: each detail page leads with its own real data + county-cost context).
  // county_costs uses "<County> County" with NYC-borough remapping.
  const countyForCost = (() => {
    const c = (stats.county as string) ?? ''
    if (c === 'Brooklyn') return 'Kings County'
    if (c === 'Manhattan') return 'New York County'
    if (c === 'Staten Island') return 'Richmond County'
    return c ? `${c} County` : ''
  })()
  const costRows = countyForCost
    ? await sql`
        SELECT mcinfant, mfccinfant
        FROM county_costs
        WHERE lower(county_name) = lower(${countyForCost}) AND studyyear = 2022
        LIMIT 1
      `
    : []
  const costs = costRows[0] ?? null

  // Per-program-type counts for the city's provider mix.
  const typeCountRows = await sql`
    SELECT program_type, COUNT(*)::int AS n
    FROM facilities
    WHERE regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') = ${slug}
    GROUP BY program_type
  `
  const typeCounts: Record<string, number> = { DCC: 0, FDC: 0, GFDC: 0, SACC: 0, SDCC: 0 }
  for (const r of typeCountRows) typeCounts[r.program_type as string] = Number(r.n)

  return (
    <CityShell
      stats={{
        city:               stats.city as string,
        county:             stats.county as string,
        provider_count:     Number(stats.provider_count),
        total_capacity:     Number(stats.total_capacity),
        infant_capacity:    Number(stats.infant_capacity),
        toddler_capacity:   Number(stats.toddler_capacity),
        preschool_capacity: Number(stats.preschool_capacity),
        school_age_capacity:Number(stats.school_age_capacity),
      }}
      countyCosts={costs ? {
        mcinfant:   costs.mcinfant   != null ? Number(costs.mcinfant)   : null,
        mfccinfant: costs.mfccinfant != null ? Number(costs.mfccinfant) : null,
      } : null}
      typeCounts={typeCounts}
      zips={zipRows.map(z => ({
        zip_code:  z.zip_code as string,
        providers: Number(z.providers),
        seats:     Number(z.seats),
      }))}
      prevSlug={prevSlug}
      nextSlug={nextSlug}
    />
  )
}
