import { sql } from '@/lib/db'

// Server-only home for the place-rollup queries (cities + zips), which both
// aggregate facilities by location. /api/cities and /api/zips call these.

const LIST_LIMIT = 200

// Cities rolled up from facilities, grouped case-insensitively by city name.
// NOTE: `total` reflects the search filter only (or all cities when not
// searching) — preserved from the original route; see report flag.
export async function listCities(search: string) {
  const pattern = search ? `%${search}%` : null

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT MAX(city) AS city, MAX(county) AS county,
        regexp_replace(lower(MAX(city)), '[^a-z0-9]+', '-', 'g') AS slug,
        COUNT(*)::int                              AS provider_count,
        COALESCE(SUM(total_capacity),      0)::int AS total_capacity,
        COALESCE(SUM(infant_capacity),     0)::int AS infant_capacity,
        COALESCE(SUM(toddler_capacity),    0)::int AS toddler_capacity,
        COALESCE(SUM(preschool_capacity),  0)::int AS preschool_capacity,
        COALESCE(SUM(school_age_capacity), 0)::int AS school_age_capacity
      FROM facilities
      WHERE (${pattern}::text IS NULL OR city ILIKE ${pattern} OR county ILIKE ${pattern})
      GROUP BY lower(city) ORDER BY MAX(city) LIMIT ${LIST_LIMIT}
    `,
    sql`
      SELECT COUNT(DISTINCT lower(city))::int AS total FROM facilities
      WHERE (${pattern}::text IS NULL OR city ILIKE ${pattern} OR county ILIKE ${pattern})
    `,
  ])

  return { data: rows, total: Number(countRows[0].total) }
}

// ZIP codes rolled up from facilities, grouped by zip_code.
// NOTE: same `total` semantics as listCities — search filter only.
export async function listZips(search: string) {
  const pattern = search ? `%${search}%` : null

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT zip_code, MAX(city) AS city, MAX(county) AS county,
        COUNT(*)::int                              AS provider_count,
        COALESCE(SUM(total_capacity),      0)::int AS total_capacity,
        COALESCE(SUM(infant_capacity),     0)::int AS infant_capacity,
        COALESCE(SUM(toddler_capacity),    0)::int AS toddler_capacity,
        COALESCE(SUM(preschool_capacity),  0)::int AS preschool_capacity,
        COALESCE(SUM(school_age_capacity), 0)::int AS school_age_capacity
      FROM facilities
      WHERE (${pattern}::text IS NULL OR zip_code ILIKE ${pattern} OR city ILIKE ${pattern} OR county ILIKE ${pattern})
      GROUP BY zip_code ORDER BY zip_code LIMIT ${LIST_LIMIT}
    `,
    sql`
      SELECT COUNT(DISTINCT zip_code)::int AS total FROM facilities
      WHERE (${pattern}::text IS NULL OR zip_code ILIKE ${pattern} OR city ILIKE ${pattern} OR county ILIKE ${pattern})
    `,
  ])

  return { data: rows, total: Number(countRows[0].total) }
}
