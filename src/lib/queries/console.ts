import { sql } from '@/lib/db'

// Server-only. The Console's supply-vs-need analysis, computed from real data:
//   supply = total licensed seats (facilities.total_capacity)
//   need   = working-parent households with a child under 6
//            (county_costs.h_under6_bothwork + h_under6_singlem)
//   ratio  = families per seat — higher means tighter (a care desert).
// It's a coverage proxy / relative index, not an exact shortage count.

export interface CountySupplyNeed {
  county: string
  slug: string
  providers: number
  seats: number
  needHh: number
  familiesPerSeat: number
}

export async function getCountySupplyNeed(): Promise<CountySupplyNeed[]> {
  const rows = await sql`
    WITH supply AS (
      SELECT county, COUNT(*)::int AS providers, COALESCE(SUM(total_capacity),0)::int AS seats
      FROM facilities GROUP BY county
    ),
    need AS (
      SELECT county_name,
             (COALESCE(h_under6_bothwork,0) + COALESCE(h_under6_singlem,0))::numeric AS need_hh
      FROM county_costs WHERE studyyear = 2022
    ),
    mapped AS (
      SELECT s.county, s.providers, s.seats,
        CASE s.county
          WHEN 'Brooklyn'      THEN 'Kings County'
          WHEN 'Manhattan'     THEN 'New York County'
          WHEN 'Staten Island' THEN 'Richmond County'
          ELSE s.county || ' County'
        END AS cost_name
      FROM supply s
    )
    SELECT m.county, m.providers, m.seats,
      ROUND(n.need_hh)::int AS need_hh,
      (n.need_hh / NULLIF(m.seats,0))::float8 AS families_per_seat
    FROM mapped m
    JOIN need n ON lower(n.county_name) = lower(m.cost_name)
    WHERE m.seats > 0 AND n.need_hh > 0
    ORDER BY families_per_seat DESC
  `
  return rows.map(r => ({
    county: r.county as string,
    slug: (r.county as string).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    providers: Number(r.providers),
    seats: Number(r.seats),
    needHh: Number(r.need_hh),
    familiesPerSeat: Number(r.families_per_seat),
  }))
}
