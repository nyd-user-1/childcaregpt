import { appBaseUrl } from '@/lib/site'

/**
 * /.well-known/mcp.json — the MCP server card.
 *
 * ChildcareGPT runs a real MCP server at /api/mcp (app/api/mcp/route.ts):
 * eight tools over the OCFS provider registry, DOL cost data, the funding
 * forms, and one write (express_interest). This card exists so an agent can
 * DISCOVER that without being told. The route is the implementation and this
 * is the advertisement; if they ever disagree, the route wins and this file is
 * the bug. `authentication` is absent on purpose — the server is authless.
 * Ported from leuk.
 */

export const dynamic = 'force-dynamic'

const TOOLS: [string, string][] = [
  ['find_facilities', 'Search ~17,000 OCFS-licensed New York child care providers by county, city, ZIP, program type or name — with licensed capacity by age and the help-paying-for-care forms.'],
  ['find_facilities_by_district', 'Providers inside a State Senate or Assembly district.'],
  ['get_facility', 'One provider in full: phone, capacity by age, license expiry, state profile.'],
  ['get_county_costs', 'Typical monthly child care prices for a county by age group, from the U.S. Department of Labor.'],
  ['funding_programs', 'The three help-paying-for-care forms: CCAP eligibility check, the official NYS application (OCFS-6025), and a personal cost snapshot.'],
  ['list_program_types', 'The five regulated program types and what each means.'],
  ['filters', 'Valid counties (with provider counts), NYC borough naming, program types, district ranges.'],
  ['express_interest', 'Record a family\'s interest in a provider and email them the provider\'s phone, profile and funding links.'],
]

export function GET() {
  const site = appBaseUrl()
  return Response.json(
    {
      name: 'ChildcareGPT',
      description:
        'Find licensed child care in New York State: every OCFS-regulated provider with capacity and phone, ' +
        'what care costs by county, help paying for it (CCAP), and a way to tell a provider you\'re interested.',
      version: '1.0.0',
      documentationUrl: `${site}/facility`,
      iconUrl: `${site}/icon.svg`,
      icons: [{ src: `${site}/icon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] }],
      remotes: [{ type: 'streamable-http', url: `${site}/api/mcp`, transport: 'streamable-http' }],
      capabilities: { tools: true, resources: true, prompts: false, sampling: false },
      tools: TOOLS.map(([name, description]) => ({ name, description })),
    },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
