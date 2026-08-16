import { executeToolCall } from '@/lib/chat-tools'
import { fundingBlock } from '@/lib/funding'
import { countyToSlug } from '@/lib/ny-counties'
import { sql } from '@/lib/db'
import { geocodeNY } from '@/lib/geocode'

// The ChildcareGPT MCP toolset — READ HALF. Everything here is public record:
// the OCFS provider registry, DOL county cost data, the legislative-district
// join. Nothing here writes; the one write is lib/mcp/interest.ts.
//
// Deliberately THIN. The tool bodies are lib/chat-tools.ts — the same
// executeToolCall the in-app chat runs — so an MCP result and a chat result can
// never disagree about a facility. This module only (a) names the tools the
// way a foreign model needs, (b) attaches site-relative `href`s the route turns
// into absolute urls, and (c) staples the funding block onto every search, so
// help-paying-for-care rides along with every list of providers, every time.

type Row = Record<string, unknown>

const PROGRAM_TYPES = ['DCC', 'FDC', 'GFDC', 'SACC', 'SDCC'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

const countySlug = (county: string) => countyToSlug(county)
// The site's /county/[slug] pages resolve NYC boroughs by their county name
// (kings, new-york, richmond) but the registry stores borough names, so those
// pages currently 404 either way (pre-existing). Don't hand out a dead link.
const NYC_BOROUGHS = new Set(['brooklyn', 'manhattan', 'queens', 'bronx', 'staten island', 'kings', 'new york', 'richmond'])
const countyHref = (county: string) => (NYC_BOROUGHS.has(county.toLowerCase()) ? null : `/county/${countySlug(county)}`)

/** One facility, shaped for a stranger's model + the card. */
function shapeFacility(r: Row) {
  const id = String(r.facility_id ?? '')
  return {
    facility_id: id,
    name: r.facility_name ?? null,
    provider: r.provider_name ?? null,
    program_type: r.program_type ?? null,
    program_type_label: r.program_type_label ?? null,
    status: r.facility_status ?? null,
    city: r.city ?? null,
    county: r.county ?? null,
    zip: r.zip_code ?? null,
    phone: r.phone_number ?? null,
    capacity: {
      total: r.total_capacity ?? null,
      infant: r.infant_capacity ?? null,
      toddler: r.toddler_capacity ?? null,
      preschool: r.preschool_capacity ?? null,
      school_age: r.school_age_capacity ?? null,
    },
    ...(r.distance_miles != null ? { distance_miles: r.distance_miles } : {}),
    lat: r.latitude ?? null,
    lng: r.longitude ?? null,
    ...(r.profile_url ? { ocfs_profile_url: r.profile_url } : {}),
    ...(r.license_expiration_date ? { license_expires: String(r.license_expiration_date).slice(0, 10) } : {}),
    href: `/facility/${id}`,
    ...(r.county && countyHref(String(r.county)) ? { county_href: countyHref(String(r.county)) } : {}),
  }
}

const isErr = (v: unknown): v is { error: string } => !!v && typeof v === 'object' && 'error' in (v as Row)

/** Search the OCFS registry. Every result set carries `funding`. */
export async function runFindFacilities(input: {
  county?: string
  city?: string
  zip?: string
  near?: string
  program_type?: ProgramType
  q?: string
  limit?: number
}) {
  // `near`: a street address, neighbourhood or town → real distance ranking
  // (the same ctx.location path the site uses when a parent enters an
  // address). Geocoded by OpenStreetMap/Nominatim, New York only.
  const loc = input.near ? await geocodeNY(input.near) : null
  if (input.near && !loc) {
    return { kind: 'facilities' as const, error: `Could not place "${input.near}" in New York. Try a fuller address, a town + county, or a ZIP.`, facilities: [], funding: fundingBlock() }
  }
  const res = await executeToolCall(
    'find_facilities',
    { county: loc ? undefined : input.county, city: input.city, zip: input.zip, program_type: input.program_type, search: input.q, limit: input.limit ?? 10 },
    loc ? { location: { lat: loc.lat, lng: loc.lng, description: loc.description } } : undefined,
  )
  if (isErr(res)) return { kind: 'facilities' as const, error: res.error, facilities: [], funding: fundingBlock() }
  const rows = Array.isArray(res) ? (res as Row[]) : []
  return {
    kind: 'facilities' as const,
    query: { county: input.county ?? null, city: input.city ?? null, zip: input.zip ?? null, near: loc ? loc.description : null, program_type: input.program_type ?? null, q: input.q ?? null },
    ...(loc ? { origin: { lat: loc.lat, lng: loc.lng, description: loc.description, county: loc.county } } : {}),
    count: rows.length,
    facilities: rows.map(shapeFacility),
    note: loc
      ? 'Ranked by straight-line distance from the address given (within ~10 mi, widened to 25 if few). Capacity is the licensed maximum, not an open spot — always call to confirm availability.'
      : 'Capacity is the licensed maximum, not an open spot — always call to confirm availability. Ranked by licensed capacity.',
    funding: fundingBlock(),
  }
}

/** Providers inside a State Senate or Assembly district. */
export async function runFindFacilitiesByDistrict(input: {
  chamber: 'senate' | 'assembly'
  district: number
  program_type?: ProgramType
  limit?: number
}) {
  const res = await executeToolCall('find_facilities_by_district', {
    chamber: input.chamber,
    district: input.district,
    program_type: input.program_type,
    limit: input.limit ?? 10,
  })
  if (isErr(res)) return { kind: 'facilities' as const, error: res.error, facilities: [], funding: fundingBlock() }
  const rows = Array.isArray(res) ? (res as Row[]) : []
  const [leg] = (await sql`
    SELECT name, party, phone, dist_phone, email, city
    FROM legislative_districts WHERE chamber = ${input.chamber} AND district = ${input.district} LIMIT 1
  `) as Array<{ name: string; party: string | null; phone: string | null; dist_phone: string | null; email: string | null; city: string | null }>
  const [tot] = (await sql.query(
    `SELECT count(*)::int AS providers, coalesce(sum(total_capacity),0)::int AS seats
       FROM facilities WHERE ${input.chamber === 'senate' ? 'senate_district' : 'assembly_district'} = $1
        AND (facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')`,
    [input.district],
  )) as Array<{ providers: number; seats: number }>
  return {
    kind: 'facilities' as const,
    query: { chamber: input.chamber, district: input.district, program_type: input.program_type ?? null },
    district: {
      chamber: input.chamber,
      number: input.district,
      label: `${input.chamber === 'senate' ? 'State Senate' : 'State Assembly'} District ${input.district}`,
      providers_total: tot?.providers ?? rows.length,
      seats_total: tot?.seats ?? null,
      legislator: leg
        ? { name: leg.name, title: input.chamber === 'senate' ? 'Senator' : 'Assemblymember', party: leg.party, albany_phone: leg.phone, district_phone: leg.dist_phone, email: leg.email, district_office_city: leg.city }
        : null,
      href: `/district/${input.chamber}/${input.district}`,
    },
    count: rows.length,
    facilities: rows.map(shapeFacility),
    note: 'Capacity is the licensed maximum, not an open spot — always call to confirm availability. providers_total/seats_total cover the whole district; facilities is the top slice by capacity.',
    funding: fundingBlock(),
  }
}

/** One provider in full. */
export async function runGetFacility(input: { facility_id: string }) {
  if (!/^\d{1,10}$/.test(String(input.facility_id ?? '').trim())) {
    return { error: `facility_id must be the numeric id from find_facilities, not a name.` }
  }
  const res = (await executeToolCall('get_facility_detail', { facility_id: input.facility_id })) as Row
  if (isErr(res)) return { error: res.error }
  if (!res.found) return { error: `No provider with facility_id ${input.facility_id}. Use an id from find_facilities.` }
  return { kind: 'facility' as const, facility: shapeFacility(res), funding: fundingBlock() }
}

/** DOL county cost data, monthly. */
export async function runGetCountyCosts(input: { county: string; year?: number }) {
  const res = (await executeToolCall('get_county_costs', { county: input.county, year: input.year })) as Row
  if (isErr(res)) return { error: res.error }
  if (!res.found) return { kind: 'costs' as const, ...res }
  const year = Number(res.year) || 2022
  // Statewide medians for the same year, converted the same way (weekly × 52 ÷ 12),
  // so the card can say "this county vs. New York".
  const [m] = (await sql`
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY mcinfant)     AS mcinfant,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY mctoddler)    AS mctoddler,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY mcpreschool)  AS mcpreschool,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY mfccinfant)   AS mfccinfant,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY mfcctoddler)  AS mfcctoddler,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY mfccpreschool) AS mfccpreschool
    FROM county_costs WHERE studyyear = ${year}
  `) as Array<Record<string, unknown>>
  const toMonthly = (w: unknown) => { const n = Number(w); return Number.isFinite(n) ? Math.round((n * 52) / 12) : null }
  return {
    kind: 'costs' as const,
    ...res,
    state_median: m
      ? {
          center_monthly: { infant: toMonthly(m.mcinfant), toddler: toMonthly(m.mctoddler), preschool: toMonthly(m.mcpreschool) },
          family_monthly: { infant: toMonthly(m.mfccinfant), toddler: toMonthly(m.mfcctoddler), preschool: toMonthly(m.mfccpreschool) },
        }
      : null,
    ...(countyHref(input.county) ? { county_href: countyHref(input.county) } : {}),
    funding: fundingBlock(),
  }
}

/** The five regulated program types. */
export async function runListProgramTypes() {
  const res = (await executeToolCall('list_program_types', {})) as Array<{ abbr: string; label: string }>
  const gloss: Record<string, string> = {
    DCC: 'Licensed center; 7+ children; typically infants through preschool, some school-age.',
    FDC: 'Registered care in the provider’s home; up to 6 children (8 with school-age).',
    GFDC: 'Licensed home-based care with an assistant; up to 12 children (16 with school-age).',
    SACC: 'Registered before/after-school and vacation programs for school-age children.',
    SDCC: 'Licensed small center; 3–6 children in a non-residential setting.',
  }
  return { program_types: res.map(p => ({ ...p, what: gloss[p.abbr] ?? null })) }
}

/** Valid filter values — call before guessing a county. */
export async function runFilters() {
  const rows = await sql`
    SELECT county, count(*)::int AS providers
    FROM facilities
    WHERE county IS NOT NULL
      AND (facility_status ILIKE '%license%' OR facility_status ILIKE '%regist%' OR facility_status ILIKE '%active%')
    GROUP BY county ORDER BY county
  `
  return {
    counties: (rows as Array<{ county: string; providers: number }>).map(r => ({ county: r.county, providers: r.providers, ...(countyHref(r.county) ? { href: countyHref(r.county) } : {}) })),
    nyc_boroughs_as_counties: { Manhattan: 'New York', Brooklyn: 'Kings', Queens: 'Queens', Bronx: 'Bronx', 'Staten Island': 'Richmond' },
    note: 'find_facilities takes the borough name for NYC ("Brooklyn", "Manhattan", "Staten Island"); get_county_costs maps boroughs to their county internally.',
    program_types: PROGRAM_TYPES,
    districts: { senate: '1–63', assembly: '1–150' },
  }
}

/** The help-paying-for-care surface on its own. */
export async function runFundingPrograms() {
  return { kind: 'funding' as const, ...fundingBlock() }
}
