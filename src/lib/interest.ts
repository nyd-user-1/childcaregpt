import { Resend } from 'resend'
import { sql } from '@/lib/db'
import { appBaseUrl } from '@/lib/site'
import { FUNDING_FORMS } from '@/lib/funding'

// Expressing interest in a facility — the one WRITE ChildcareGPT accepts from
// the public, and the analogue of leuk's booking. Used by POST /api/interest
// (the site) and by the MCP express_interest tool (through that same route —
// one write path, one validation, one email; see lib/mcp/interest.ts).
//
// What it is honestly: OCFS publishes a phone number and a profile for every
// provider, not an email. So "interest" is recorded here, and the PARENT gets
// a confirmation carrying the provider's number, profile link and the funding
// forms — a tidy hand-off, not a promise the provider will call. The receipt
// says exactly that.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FROM = process.env.RESEND_FROM_EMAIL || 'ChildcareGPT <onboarding@resend.dev>'

export type InterestInput = {
  facility_id?: string | number
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  children?: string
  start_when?: string
  message?: string
  source?: 'web' | 'mcp' | 'chat'
}

export type InterestResult =
  | { ok: true; interest_id: number; facility: { facility_id: number; facility_name: string; phone_number: string | null; profile_url: string | null; href: string }; emailed: boolean }
  | { ok: false; error: string; status: number }

const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function createInterest(input: InterestInput): Promise<InterestResult> {
  const facilityId = Number.parseInt(String(input.facility_id ?? ''), 10)
  const first = clean(input.first_name, 80)
  const last = clean(input.last_name, 80)
  const email = clean(input.email, 200)
  const phone = clean(input.phone, 40) || null
  const children = clean(input.children, 300) || null
  const startWhen = clean(input.start_when, 120) || null
  const message = clean(input.message, 1500) || null
  const source = input.source === 'mcp' || input.source === 'chat' ? input.source : 'web'

  if (!Number.isInteger(facilityId)) return { ok: false, error: 'facility_id is required.', status: 400 }
  if (!first || !last) return { ok: false, error: 'First and last name are required.', status: 400 }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.', status: 400 }

  const rows = await sql`
    SELECT facility_id, facility_name, program_type, city, county, phone_number, profile_url
    FROM facilities WHERE facility_id = ${facilityId} LIMIT 1
  `
  if (!rows.length) return { ok: false, error: 'No provider with that facility_id.', status: 404 }
  const f = rows[0] as { facility_id: number; facility_name: string; program_type: string; city: string | null; county: string | null; phone_number: string | null; profile_url: string | null }

  const inserted = await sql`
    INSERT INTO facility_interest (facility_id, first_name, last_name, email, phone, children, start_when, message, source)
    VALUES (${facilityId}, ${first}, ${last}, ${email}, ${phone}, ${children}, ${startWhen}, ${message}, ${source})
    RETURNING id
  `
  const interestId = Number((inserted[0] as { id: number | string }).id)

  const base = appBaseUrl()
  const href = `/facility/${facilityId}`
  let emailed = false
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your interest in ${f.facility_name}`,
      text: [
        `Hi ${first},`,
        '',
        `We’ve noted your interest in ${f.facility_name}${f.city ? ` in ${f.city}` : ''}${f.county ? ` (${f.county} County)` : ''} — a New York State licensed ${labelFor(f.program_type)}.`,
        '',
        'The fastest way to a spot is a call. Providers list a phone number with the state, not an email, so we can’t message them for you:',
        f.phone_number ? `  Phone: ${f.phone_number}` : '  Phone: not listed — see the state profile below.',
        f.profile_url ? `  NYS OCFS profile: ${f.profile_url}` : '',
        `  On ChildcareGPT: ${base}${href}`,
        '',
        children ? `You told us about your child(ren): ${children}` : '',
        startWhen ? `When you’d like to start: ${startWhen}` : '',
        message ? `Your note: ${message}` : '',
        '',
        'Help paying for care:',
        ...FUNDING_FORMS.map(fm => `  • ${fm.title} — ${base}${fm.href}`),
        '',
        'ChildcareGPT is a guide, not the provider and not the state. Licensed capacity is a maximum, not an open spot — always confirm availability directly.',
        '',
        '— ChildcareGPT',
      ].filter(l => l !== '').join('\n'),
    })
    emailed = !error
  }

  return {
    ok: true,
    interest_id: interestId,
    facility: { facility_id: f.facility_id, facility_name: f.facility_name, phone_number: f.phone_number, profile_url: f.profile_url, href },
    emailed,
  }
}

const LABEL: Record<string, string> = {
  DCC: 'day care center', FDC: 'family day care', GFDC: 'group family day care',
  SACC: 'school-age child care program', SDCC: 'small day care center',
}
function labelFor(t: string) { return LABEL[t] ?? 'child care provider' }
