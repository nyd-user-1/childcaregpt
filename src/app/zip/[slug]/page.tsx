import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getZipDemand } from '@/lib/queries/zip-demographics'
import { ZipShell } from './Shell'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return {
    title: `Child care in ${slug} · ChildcareGPT`,
    description: `Licensed child care providers in ZIP code ${slug}, New York — capacity and program types.`,
  }
}

export default async function DetailPageZipCode({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [statsRows, facilityRows, prevRows, nextRows, firstRows, lastRows] = await Promise.all([
    sql`
      SELECT
        zip_code,
        MAX(city) AS city,
        MAX(county) AS county,
        COUNT(*) AS provider_count,
        COALESCE(SUM(total_capacity),      0) AS total_capacity,
        COALESCE(SUM(infant_capacity),     0) AS infant_capacity,
        COALESCE(SUM(toddler_capacity),    0) AS toddler_capacity,
        COALESCE(SUM(preschool_capacity),  0) AS preschool_capacity,
        COALESCE(SUM(school_age_capacity), 0) AS school_age_capacity
      FROM facilities
      WHERE zip_code = ${slug}
      GROUP BY zip_code
    `,
    sql`
      SELECT facility_id, facility_name, program_type, total_capacity,
        regexp_replace(lower(facility_name), '[^a-z0-9]+', '-', 'g') AS slug
      FROM facilities
      WHERE zip_code = ${slug}
      ORDER BY facility_name
      LIMIT 20
    `,
    sql`
      SELECT DISTINCT zip_code AS slug FROM facilities
      WHERE zip_code < ${slug} ORDER BY zip_code DESC LIMIT 1
    `,
    sql`
      SELECT DISTINCT zip_code AS slug FROM facilities
      WHERE zip_code > ${slug} ORDER BY zip_code ASC LIMIT 1
    `,
    sql`
      SELECT DISTINCT zip_code AS slug FROM facilities ORDER BY zip_code ASC LIMIT 1
    `,
    sql`
      SELECT DISTINCT zip_code AS slug FROM facilities ORDER BY zip_code DESC LIMIT 1
    `,
  ])

  const stats = statsRows[0]
  if (!stats?.zip_code) notFound()

  const prevSlug = (prevRows[0]?.slug ?? lastRows[0]?.slug ?? slug) as string
  const nextSlug = (nextRows[0]?.slug ?? firstRows[0]?.slug ?? slug) as string

  const seats = Number(stats.total_capacity)
  const demand = await getZipDemand((stats.zip_code as string).slice(0, 5))
  const familiesPerSeat = demand?.workingFamiliesUnder6 != null && seats > 0
    ? demand.workingFamiliesUnder6 / seats
    : null

  return (
    <ZipShell
      familiesPerSeat={familiesPerSeat}
      population={demand?.population ?? null}
      childrenUnder6={demand?.childrenUnder6 ?? null}
      oneParentUnder6={demand?.oneParentUnder6 ?? null}
      birthsPastYear={demand?.birthsPastYear ?? null}
      under5PovertyRate={demand?.under5PovertyRate ?? null}
      stats={{
        zip_code:           stats.zip_code as string,
        city:               stats.city as string,
        county:             stats.county as string,
        provider_count:     Number(stats.provider_count),
        total_capacity:     Number(stats.total_capacity),
        infant_capacity:    Number(stats.infant_capacity),
        toddler_capacity:   Number(stats.toddler_capacity),
        preschool_capacity: Number(stats.preschool_capacity),
        school_age_capacity:Number(stats.school_age_capacity),
      }}
      facilities={facilityRows.map(f => ({
        facility_id:    Number(f.facility_id),
        facility_name:  f.facility_name as string,
        program_type:   f.program_type as string,
        total_capacity: Number(f.total_capacity),
        slug:           f.slug as string,
      }))}
      prevSlug={prevSlug}
      nextSlug={nextSlug}
    />
  )
}
