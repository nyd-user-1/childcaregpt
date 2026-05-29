import { NextRequest } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FROM = process.env.RESEND_FROM_EMAIL || 'ChildcareGPT <onboarding@resend.dev>'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  email?: string
  firstName?: string
  lastName?: string
  pdfBase64?: string
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
  const firstName = body.firstName?.trim() ?? ''
  const lastName = body.lastName?.trim() ?? ''
  const pdfBase64 = body.pdfBase64 ?? ''

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!pdfBase64) {
    return Response.json({ error: 'No application to send.' }, { status: 400 })
  }

  // Decode + sanity-check the attachment server-side (cap ~10 MB).
  let pdf: Buffer
  try {
    pdf = Buffer.from(pdfBase64, 'base64')
  } catch {
    return Response.json({ error: 'Could not read the application file.' }, { status: 400 })
  }
  if (pdf.length === 0 || pdf.length > 10 * 1024 * 1024) {
    return Response.json({ error: 'The application file looks invalid.' }, { status: 400 })
  }

  const who = [firstName, lastName].filter(Boolean).join(' ').trim()
  const fileName = `OCFS-6025-${firstName || 'Application'}-${lastName || ''}.pdf`.replace(/\s+/g, '-')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your New York child care assistance application (OCFS-6025)',
    text: [
      who ? `Hi ${firstName || who},` : 'Hi,',
      '',
      'Attached is your New York State Child Care Assistance Program application (form OCFS-6025), filled in with the details you entered on ChildcareGPT.',
      '',
      'What to do next:',
      '1. Open the attached PDF and review every field — make sure it’s complete and correct.',
      '2. Sign and date it.',
      '3. Bring it to your local Department of Social Services office, or mail it to the address listed on the form. You can also apply online at mybenefits.ny.gov.',
      '',
      'ChildcareGPT does not decide whether you qualify — your local social services office reviews the application and makes that decision.',
      '',
      '— ChildcareGPT',
    ].join('\n'),
    attachments: [{ filename: fileName, content: pdf }],
  })

  if (error) {
    return Response.json({ error: error.message || 'Could not send the email. Please try again.' }, { status: 502 })
  }

  return Response.json({ ok: true })
}
