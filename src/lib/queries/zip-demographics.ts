import { sql } from '@/lib/db'

// Server-only. ZIP-level (ZCTA) demand figures from the Census ACS 5-year,
// ingested into zip_demographics. `workingFamiliesUnder6` mirrors the county
// h_under6_bothwork + h_under6_singlem metric, now at the ZIP level.

export interface ZipDemand {
  population: number | null
  childrenUnder6: number | null
  workingFamiliesUnder6: number | null
  oneParentUnder6: number | null
  birthsPastYear: number | null
  under5PovertyRate: number | null
}

export async function getZipDemand(zip5: string): Promise<ZipDemand | null> {
  const rows = await sql`
    SELECT population, children_under6, working_families_under6,
           under6_one_parent, births_past_year,
           under5_below_poverty, under5_above_poverty
    FROM zip_demographics WHERE zip = ${zip5} LIMIT 1
  `
  if (!rows.length) return null
  const r = rows[0]
  const below = r.under5_below_poverty != null ? Number(r.under5_below_poverty) : null
  const above = r.under5_above_poverty != null ? Number(r.under5_above_poverty) : null
  const universe = (below ?? 0) + (above ?? 0)
  return {
    population:            r.population              != null ? Number(r.population)              : null,
    childrenUnder6:        r.children_under6         != null ? Number(r.children_under6)         : null,
    workingFamiliesUnder6: r.working_families_under6 != null ? Number(r.working_families_under6) : null,
    oneParentUnder6:       r.under6_one_parent       != null ? Number(r.under6_one_parent)       : null,
    birthsPastYear:        r.births_past_year        != null ? Number(r.births_past_year)        : null,
    under5PovertyRate:     below != null && universe > 0 ? (below / universe) * 100 : null,
  }
}
