import { sql } from '@/lib/db'

// Tools for ChildcareGPT chat. DATA-FETCH ONLY — no eligibility verdicts.
// Eligibility questions are routed (by the system prompt) to the /eligibility
// screener, which is the safe and authoritative path.

// facilities.county is bare ("Albany", "Brooklyn"); county_costs.county_name is
// "Albany County". NYC boroughs differ between datasets — map them.
const BOROUGH_TO_COST_COUNTY: Record<string, string> = {
  'Brooklyn': 'Kings County',
  'Manhattan': 'New York County',
  'Staten Island': 'Richmond County',
}
function costCountyName(facilityCounty: string): string {
  return BOROUGH_TO_COST_COUNTY[facilityCounty] ?? `${facilityCounty} County`
}

const PROGRAM_TYPE_LABEL: Record<string, string> = {
  DCC:  'Day Care Center',
  FDC:  'Family Day Care',
  GFDC: 'Group Family Day Care',
  SACC: 'School-Age Child Care',
  SDCC: 'Small Day Care Center',
}

export const TOOLS = [
  {
    name: 'find_facilities',
    description: 'Find licensed/registered child care providers in New York. Filter by county, program type, and/or a free-text search on facility or provider name. Returns provider details including capacity and location. Always prefer this over guessing — never invent a facility.',
    input_schema: {
      type: 'object' as const,
      properties: {
        county:       { type: 'string', description: 'County name without the word "County", e.g. "Albany", "Suffolk", "Bronx". For NYC use "Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island".' },
        program_type: { type: 'string', enum: ['DCC', 'FDC', 'GFDC', 'SACC', 'SDCC'], description: 'DCC=Day Care Center, FDC=Family Day Care, GFDC=Group Family Day Care, SACC=School-Age, SDCC=Small Day Care Center' },
        search:       { type: 'string', description: 'Optional free-text match on facility or provider name.' },
        limit:        { type: 'number', description: 'Max results, default 8, max 20.' },
      },
      required: [],
    },
  },
  {
    name: 'get_county_costs',
    description: 'Get typical child care costs for a New York county from U.S. Department of Labor data. Returns median center and family-care prices by age group (infant, toddler, preschool). Use for any "how much does care cost" question.',
    input_schema: {
      type: 'object' as const,
      properties: {
        county: { type: 'string', description: 'County name without "County", e.g. "Albany", "Suffolk".' },
        year:   { type: 'number', description: 'Study year 2008–2022. Omit for latest (2022).' },
      },
      required: ['county'],
    },
  },
  {
    name: 'list_program_types',
    description: 'List the five regulated child care program types in New York and what each means. Use when a parent asks what kinds of care exist or what an acronym (DCC/FDC/GFDC/SACC/SDCC) means.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_facility_detail',
    description: 'Get full detail for one provider by its facility_id (from find_facilities).',
    input_schema: {
      type: 'object' as const,
      properties: {
        facility_id: { type: 'string', description: 'The facility_id returned by find_facilities.' },
      },
      required: ['facility_id'],
    },
  },
] as const

export async function executeToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'find_facilities': {
        const county = typeof input.county === 'string' ? input.county.trim() : null
        const programType = typeof input.program_type === 'string' ? input.program_type : null
        const search = typeof input.search === 'string' ? input.search.trim() : null
        const limit = Math.min(Number(input.limit) || 8, 20)

        const rows = await sql`
          SELECT facility_id, facility_name, provider_name, county, city, zip_code,
                 program_type, facility_status, total_capacity,
                 infant_capacity, toddler_capacity, preschool_capacity, school_age_capacity,
                 phone_number, latitude, longitude
          FROM facilities
          WHERE (facility_status ILIKE '%license%' OR facility_status ILIKE '%registered%' OR facility_status ILIKE '%active%')
            AND (${county}::text IS NULL OR county ILIKE ${county})
            AND (${programType}::text IS NULL OR program_type = ${programType})
            AND (${search}::text IS NULL OR facility_name ILIKE ${'%' + (search ?? '') + '%'} OR provider_name ILIKE ${'%' + (search ?? '') + '%'})
          ORDER BY total_capacity DESC NULLS LAST
          LIMIT ${limit}
        `
        return rows.map(r => ({ ...r, program_type_label: PROGRAM_TYPE_LABEL[r.program_type as string] ?? r.program_type }))
      }

      case 'get_county_costs': {
        const county = typeof input.county === 'string' ? input.county.trim() : ''
        const year = Number(input.year) || 2022
        const name = costCountyName(county)
        const rows = await sql`
          SELECT county_name, studyyear,
                 mcinfant, mctoddler, mcpreschool,
                 mfccinfant, mfcctoddler, mfccpreschool,
                 mhi, pr_f
          FROM county_costs
          WHERE county_name = ${name} AND studyyear = ${year}
          LIMIT 1
        `
        if (!rows.length) return { found: false, note: `No cost data on file for ${name} in ${year}.` }
        const r = rows[0]
        // DOL National Database of Childcare Prices stores WEEKLY prices.
        // Convert to a monthly figure parents can budget against (52 weeks / 12 months).
        const toMonthly = (weekly: unknown) => {
          const w = Number(weekly)
          return Number.isFinite(w) ? Math.round((w * 52) / 12) : null
        }
        return {
          found: true,
          county: r.county_name,
          year: r.studyyear,
          center_monthly: { infant: toMonthly(r.mcinfant), toddler: toMonthly(r.mctoddler), preschool: toMonthly(r.mcpreschool) },
          family_monthly: { infant: toMonthly(r.mfccinfant), toddler: toMonthly(r.mfcctoddler), preschool: toMonthly(r.mfccpreschool) },
          unit: 'USD per month (converted from the weekly DOL median × 52 ÷ 12)',
          note: 'Median prices. Source: U.S. Dept. of Labor National Database of Childcare Prices. Figures are monthly estimates derived from weekly medians.',
        }
      }

      case 'list_program_types': {
        return Object.entries(PROGRAM_TYPE_LABEL).map(([abbr, label]) => ({ abbr, label }))
      }

      case 'get_facility_detail': {
        const id = String(input.facility_id ?? '')
        const rows = await sql`
          SELECT facility_id, facility_name, provider_name, county, city, zip_code,
                 program_type, facility_status, total_capacity,
                 infant_capacity, toddler_capacity, preschool_capacity, school_age_capacity,
                 phone_number, profile_url, license_expiration_date, latitude, longitude
          FROM facilities WHERE facility_id = ${id} LIMIT 1
        `
        if (!rows.length) return { found: false }
        return { found: true, ...rows[0], program_type_label: PROGRAM_TYPE_LABEL[rows[0].program_type as string] ?? rows[0].program_type }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
