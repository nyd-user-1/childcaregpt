import { sql } from '@/lib/db'
import type { DistrictRow } from '@/components/DistrictChoropleth'

export type Chamber = 'senate' | 'assembly'

export type DistrictDetail = {
  chamber: Chamber
  district: number
  name: string | null
  party: string | null
  phone: string | null        // Albany / legislative office
  dist_phone: string | null   // local district office — what a parent should call
  email: string | null
  address: string | null
  address2: string | null
  city: string | null
  state: string | null
  zip: string | null
  provider_count: number
}

const CHAMBER_COUNTS: Record<Chamber, number> = { senate: 63, assembly: 150 }

export function districtCount(chamber: Chamber): number {
  return CHAMBER_COUNTS[chamber]
}

// One district's rep + contact info + the count of licensed providers that
// spatially fall inside it. Returns null when the district number is unknown.
export async function getDistrictDetail(chamber: Chamber, district: number): Promise<DistrictDetail | null> {
  const col = chamber === 'senate' ? 'senate_district' : 'assembly_district'
  const rows = await sql.query(
    `SELECT ld.chamber, ld.district, ld.name, ld.party, ld.phone, ld.dist_phone,
            ld.email, ld.address, ld.address2, ld.city, ld.state, ld.zip,
            (SELECT COUNT(*)::int FROM facilities WHERE ${col} = ld.district) AS provider_count
     FROM legislative_districts ld
     WHERE ld.chamber = $1 AND ld.district = $2
     LIMIT 1`,
    [chamber, district],
  )
  if (!rows.length) return null
  const r = rows[0]
  return {
    chamber: r.chamber as Chamber,
    district: Number(r.district),
    name: r.name as string | null,
    party: r.party as string | null,
    phone: r.phone as string | null,
    dist_phone: r.dist_phone as string | null,
    email: r.email as string | null,
    address: r.address as string | null,
    address2: r.address2 as string | null,
    city: r.city as string | null,
    state: r.state as string | null,
    zip: r.zip as string | null,
    provider_count: Number(r.provider_count),
  }
}

// Provider count per legislative district, joined to the rep's name/party.
export async function getDistrictRows(chamber: 'senate' | 'assembly'): Promise<DistrictRow[]> {
  const col = chamber === 'senate' ? 'senate_district' : 'assembly_district'
  const rows = await sql.query(
    `SELECT ld.district, ld.name, ld.party,
            COALESCE(fa.provider_count, 0)::int AS provider_count
     FROM legislative_districts ld
     LEFT JOIN (
       SELECT ${col} AS district, COUNT(*)::int AS provider_count
       FROM facilities WHERE ${col} IS NOT NULL GROUP BY ${col}
     ) fa ON fa.district = ld.district
     WHERE ld.chamber = $1
     ORDER BY ld.district`,
    [chamber],
  )
  return rows.map(r => ({
    district: Number(r.district),
    name: r.name as string | null,
    party: r.party as string | null,
    provider_count: Number(r.provider_count),
  }))
}
