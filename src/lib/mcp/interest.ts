import { appBaseUrl } from '@/lib/site'
import type { InterestInput } from '@/lib/interest'

// The ChildcareGPT MCP toolset — WRITE HALF: express_interest, and nothing
// else. Modelled on leuk's lib/mcp/booking.ts.
//
// The write goes through our own POST /api/interest over HTTP rather than
// importing createInterest directly. Same reason as leuk: the route is the
// one place that validates, records and emails; a second in-process path
// would be a second thing to keep in sync, and the day they diverged, MCP
// interest would quietly stop emailing anyone. It also means an MCP call adds
// a caller, not a capability — /api/interest has always been public.
//
// There is no read path here. No listing who has expressed interest, no
// checking whether an email has already been seen. "Recorded" reads
// identically for a first-timer and a repeat — anything else turns a form
// into a membership oracle.

const fmtPhone = (p: string | null) => {
  if (!p) return p
  const d = p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p
}

export async function runExpressInterest(input: InterestInput) {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const facilityId = str(input.facility_id ?? '') || String(input.facility_id ?? '')
  const first = str(input.first_name)
  const last = str(input.last_name)
  const email = str(input.email).toLowerCase()

  if (!facilityId) return { kind: 'interest' as const, recorded: false, error: 'facility_id is required. Use an id from find_facilities.' }
  if (!first || !last) return { kind: 'interest' as const, recorded: false, error: 'first_name and last_name are required. Ask the person — never guess a name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { kind: 'interest' as const, recorded: false, error: 'A valid email is required — the confirmation with the provider’s number goes there. Ask; never guess.' }

  const res = await fetch(`${appBaseUrl()}/api/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-childcare-source': 'mcp' },
    body: JSON.stringify({
      facility_id: facilityId,
      first_name: first,
      last_name: last,
      email,
      phone: str(input.phone) || undefined,
      children: str(input.children) || undefined,
      start_when: str(input.start_when) || undefined,
      message: str(input.message) || undefined,
    }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    facility?: { facility_id: number; facility_name: string; phone_number: string | null; profile_url: string | null; href: string }
    emailed?: boolean
  }
  if (!res.ok || !json.facility) {
    return { kind: 'interest' as const, recorded: false, error: json.error ?? 'Your interest could not be recorded.' }
  }
  return {
    kind: 'interest' as const,
    recorded: true,
    facility: {
      facility_id: String(json.facility.facility_id),
      name: json.facility.facility_name,
      phone: fmtPhone(json.facility.phone_number),
      ocfs_profile_url: json.facility.profile_url,
      href: json.facility.href,
    },
    confirmation: json.emailed
      ? `Recorded. A confirmation is on its way to ${email} with ${json.facility.facility_name}’s phone number and profile, plus the help-paying-for-care links.`
      : `Recorded. A confirmation email could not be sent to that address — give the person the phone number directly.`,
    next_step: json.facility.phone_number
      ? `Providers list a phone with the state, not an email. The fastest way to a spot is to call ${fmtPhone(json.facility.phone_number)} and ask about openings for the ages given.`
      : 'Providers list a phone with the state, not an email. Open the state profile for contact details and call to ask about openings.',
  }
}
