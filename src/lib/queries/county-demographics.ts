import { sql } from '@/lib/db'

// Server-only. County-level Census ACS figures (zip_demographics' county sibling).
// Looked up by the bare facilities county name, mapped to the Census county_name
// ("Brooklyn" → "Kings County", etc.).

export interface CountyDemographics {
  population: number | null
  childrenUnder6: number | null
  workingFamiliesUnder6: number | null
}

export async function getCountyDemographics(bareCountyName: string): Promise<CountyDemographics | null> {
  const name =
    bareCountyName === 'Brooklyn'      ? 'Kings County'
    : bareCountyName === 'Manhattan'     ? 'New York County'
    : bareCountyName === 'Staten Island' ? 'Richmond County'
    : `${bareCountyName} County`
  const rows = await sql`
    SELECT population, children_under6, working_families_under6
    FROM county_demographics WHERE lower(county_name) = lower(${name}) LIMIT 1
  `
  if (!rows.length) return null
  const r = rows[0]
  return {
    population:            r.population              != null ? Number(r.population)              : null,
    childrenUnder6:        r.children_under6         != null ? Number(r.children_under6)         : null,
    workingFamiliesUnder6: r.working_families_under6 != null ? Number(r.working_families_under6) : null,
  }
}
