import { sql } from '@/lib/db'
import type { DistrictRow } from '@/components/DistrictChoropleth'

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
