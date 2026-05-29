import { sql } from '@/lib/db'

// Server-only. ZIP-level (ZCTA) demand figures from the Census ACS 5-year,
// ingested into zip_demographics. `workingFamiliesUnder6` mirrors the county
// h_under6_bothwork + h_under6_singlem metric, now at the ZIP level.

export interface ZipDemand {
  population: number | null
  childrenUnder6: number | null
  workingFamiliesUnder6: number | null
}

export async function getZipDemand(zip5: string): Promise<ZipDemand | null> {
  const rows = await sql`
    SELECT population, children_under6, working_families_under6
    FROM zip_demographics WHERE zip = ${zip5} LIMIT 1
  `
  if (!rows.length) return null
  const r = rows[0]
  return {
    population:            r.population              != null ? Number(r.population)              : null,
    childrenUnder6:        r.children_under6         != null ? Number(r.children_under6)         : null,
    workingFamiliesUnder6: r.working_families_under6 != null ? Number(r.working_families_under6) : null,
  }
}
