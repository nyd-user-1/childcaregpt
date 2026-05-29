import { sql } from '@/lib/db'

// Server-only home for county_costs queries. /api/county-costs calls this today;
// the county detail + cost surfaces can adopt it later.

// All NY counties' cost/income/LFPR row for a given study year.
export async function listCountyCosts(year: number) {
  return sql`
    SELECT
      county_fips_code,
      county_name,
      studyyear,
      mcinfant, mctoddler, mcpreschool,
      mfccinfant, mfcctoddler, mfccpreschool,
      _75cinfant, _75ctoddler, _75cpreschool,
      flfpr_20to64_under6,
      mhi, mfi,
      pr_f, pr_p,
      h_under6_bothwork, h_under6_singlem
    FROM county_costs
    WHERE studyyear = ${year}
    ORDER BY county_name
  `
}
