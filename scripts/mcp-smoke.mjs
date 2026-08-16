#!/usr/bin/env node
// Smoke-test the ChildcareGPT MCP server end to end.
//   node scripts/mcp-smoke.mjs [http://localhost:3000/api/mcp] [--interest you@example.com]
// initialize → tools/list → find_facilities → get_county_costs → funding_programs
// → resources/read (the card) → optionally express_interest (real write + email).
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const args = process.argv.slice(2)
const url = args.find(a => a.startsWith('http')) ?? 'http://localhost:3000/api/mcp'
const iIdx = args.indexOf('--interest')
const interestEmail = iIdx >= 0 ? args[iIdx + 1] : null

const client = new Client({ name: 'childcare-smoke', version: '0.0.1' })
await client.connect(new StreamableHTTPClientTransport(new URL(url)))
const info = client.getServerVersion()
console.log('server:', info?.name, info?.version, '| instructions:', (client.getInstructions() ?? '').length, 'chars')

const { tools } = await client.listTools()
console.log('tools:', tools.map(t => t.name + (t._meta?.ui ? '*' : '')).join(', '), '(* = renders the card)')

const text = r => r.content?.find(c => c.type === 'text')?.text ?? ''
const call = async (name, a) => { const r = await client.callTool({ name, arguments: a }); return { r, j: JSON.parse(text(r)) } }

const ff = await call('find_facilities', { county: 'Suffolk', program_type: 'DCC', limit: 3 })
console.log(`find_facilities: ${ff.j.count} rows; first = ${ff.j.facilities?.[0]?.name} → ${ff.j.facilities?.[0]?.url}; funding forms = ${ff.j.funding?.forms?.length}; structured = ${!!ff.r.structuredContent}`)
const fd = await call('find_facilities_by_district', { chamber: 'senate', district: 2, limit: 2 })
console.log(`find_facilities_by_district: ${fd.j.count} rows; first = ${fd.j.facilities?.[0]?.name}`)
const gf = await call('get_facility', { facility_id: ff.j.facilities[0].facility_id })
console.log(`get_facility: ${gf.j.facility?.name} · phone ${gf.j.facility?.phone} · ${gf.j.facility?.ocfs_profile_url ? 'has OCFS url' : 'no OCFS url'}`)
const cc = await call('get_county_costs', { county: 'Brooklyn' })
console.log(`get_county_costs(Brooklyn): ${cc.j.county} ${cc.j.year} infant center $${cc.j.center_monthly?.infant}/mo → ${cc.j.county_url}`)
const fp = await call('funding_programs', {})
console.log(`funding_programs: ${fp.j.forms?.map(f => f.id + '→' + f.url).join('  ')}`)
const fl = await call('filters', {})
console.log(`filters: ${fl.j.counties?.length} counties`)
const bad = await call('get_facility', { facility_id: 'nope' })
console.log(`get_facility(bad): ${bad.j.error}`)

const { resources } = await client.listResources()
console.log('resources:', resources.map(r => r.uri).join(', '))
const res = await client.readResource({ uri: resources[0].uri })
const html = res.contents[0].text
console.log(`card: ${(html.length/1024).toFixed(0)} KB, mime ${res.contents[0].mimeType}, maps key injected: ${!html.includes('__MAPS_KEY__')}, csp:`, JSON.stringify(res._meta?.ui?.csp))

if (interestEmail) {
  const ei = await call('express_interest', { facility_id: ff.j.facilities[0].facility_id, first_name: 'Smoke', last_name: 'Test', email: interestEmail, children: 'an infant', start_when: 'September' })
  console.log('express_interest:', JSON.stringify(ei.j, null, 1))
} else {
  const ei = await call('express_interest', { facility_id: ff.j.facilities[0].facility_id, first_name: 'Smoke', last_name: '', email: 'x' })
  console.log('express_interest(validation):', ei.j.error)
}
await client.close()
