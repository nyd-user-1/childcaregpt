import { sql } from '@/lib/db'

// Server-only home for facilities queries (imports the Neon client, so never
// import this from a client component). /api/facilities calls these today; the
// facility/county detail pages can adopt them later to retire their own copies.

// Full detail for one provider by facility_id (includes lat/lng + phone).
export async function getFacilityById(facilityId: string) {
  return sql`
    SELECT
      facility_id, facility_name, county, city,
      program_type, facility_status, total_capacity,
      infant_capacity, toddler_capacity, preschool_capacity,
      school_age_capacity, provider_name, license_expiration_date,
      profile_url, phone_number, latitude, longitude
    FROM facilities
    WHERE facility_id = ${facilityId}
    LIMIT 1
  `
}

// Lookup by profile_url (kept for any caller still keyed on it; facility_id is preferred).
export async function getFacilityByProfileUrl(profileUrl: string) {
  return sql`
    SELECT facility_id, facility_name, county, city,
      program_type, facility_status, total_capacity,
      infant_capacity, toddler_capacity, preschool_capacity,
      school_age_capacity, provider_name, license_expiration_date,
      profile_url, phone_number
    FROM facilities WHERE profile_url = ${profileUrl} LIMIT 1
  `
}

export interface ListFacilitiesParams {
  search?: string
  county?: string | null
  programType?: string | null
  status?: string | null
  limit: number
  offset: number
}

// Paged, filtered list. NOTE: `total` intentionally reflects only the free-text
// search (or the whole table when not searching) — it does NOT narrow by
// county/program/status. Preserved from the original route; see report flag.
export async function listFacilities(params: ListFacilitiesParams) {
  const county      = params.county ?? null
  const programType = params.programType ?? null
  const status      = params.status ?? null
  const pattern     = params.search ? `%${params.search}%` : null

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        facility_id, facility_name, county, city,
        program_type, facility_status, total_capacity,
        infant_capacity, toddler_capacity, preschool_capacity,
        school_age_capacity, provider_name, license_expiration_date,
        profile_url, latitude, longitude
      FROM facilities
      WHERE (${pattern}::text IS NULL
             OR facility_name ILIKE ${pattern}
             OR county ILIKE ${pattern}
             OR city ILIKE ${pattern})
        AND (${county}::text      IS NULL OR county          ILIKE ${county})
        AND (${programType}::text IS NULL OR program_type    = ${programType})
        AND (${status}::text      IS NULL OR facility_status = ${status})
      ORDER BY facility_name
      LIMIT ${params.limit} OFFSET ${params.offset}
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
  ])

  return { data: rows, total: Number(countRows[0].total) }
}
