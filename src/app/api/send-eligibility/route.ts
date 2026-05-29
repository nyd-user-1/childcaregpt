import { NextRequest } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FROM = process.env.RESEND_FROM_EMAIL || 'ChildcareGPT <onboarding@resend.dev>'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Row = { label: string; value: string }
type Body = {
  email?: string
  eligible?: boolean
  headline?: string
  summary?: string
  rows?: Row[]
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Mirrors the warm-editorial results card so the email reads like the page.
function renderHtml(b: Body): string {
  const rows = (b.rows ?? [])
    .map(
      r => `<tr>
        <td style="padding:7px 0;color:#6b6457;font-family:Arial,sans-serif;font-size:14px;">${esc(r.label)}</td>
        <td style="padding:7px 0;color:#2a2620;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-align:right;">${esc(r.value)}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html><html><body style="margin:0;background:#f7f4ee;padding:24px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 24px;">
          <p style="margin:0 0 6px;color:#a39b8c;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ChildcareGPT · Eligibility</p>
          <h1 style="margin:0 0 10px;color:#2a2620;font-family:Georgia,serif;font-size:28px;font-weight:400;">${esc(b.headline ?? 'Your eligibility results')}</h1>
          <p style="margin:0 0 22px;color:#6b6457;font-family:Georgia,serif;font-size:16px;line-height:1.55;">${esc(b.summary ?? '')}</p>
        </td></tr>
        ${rows ? `<tr><td style="padding:0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ece2;border:1px solid #e0d9cc;border-radius:14px;">
            <tr><td style="padding:20px 22px 8px;">
              <p style="margin:0 0 2px;color:#2a2620;font-family:Georgia,serif;font-size:18px;font-weight:600;">Child Care Assistance Program (CCAP)</p>
              <p style="margin:0 0 12px;color:#6b6457;font-family:Arial,sans-serif;font-size:13px;">NYS Office of Children &amp; Family Services · income-based, up to full coverage</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            </td></tr>
          </table>
        </td></tr>` : ''}
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 6px;color:#6b6457;font-family:Arial,sans-serif;font-size:14px;">Have questions? Call the NY Child Care Helpline — free, no obligation:</p>
          <p style="margin:0 0 18px;color:#2f6d6a;font-family:Arial,sans-serif;font-size:18px;font-weight:700;">(800) 345-9152</p>
          <p style="margin:0;color:#a39b8c;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;">This screening uses general CCAP eligibility criteria. Final eligibility is determined by your local Department of Social Services.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Email isn’t configured yet — RESEND_API_KEY is missing.' }, { status: 500 })
  }

  let body: Body
  try {
    body = await req.json() as Body
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = body.email?.trim() ?? ''
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your New York child care assistance results (CCAP)',
    html: renderHtml(body),
  })

  if (error) {
    return Response.json({ error: error.message || 'Could not send the email. Please try again.' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
