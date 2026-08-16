import { NextRequest } from 'next/server'
import { createInterest, type InterestInput } from '@/lib/interest'

// POST /api/interest — record a parent's interest in a facility and email them
// a confirmation with the provider's phone, profile and the funding forms.
// Public and unauthenticated, like /api/send-application: it accepts only
// what the person typed and reveals nothing about anyone else. The MCP
// express_interest tool posts here too (X-Childcare-Source: mcp is
// attribution only, never authorization).

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: InterestInput
  try {
    body = await req.json() as InterestInput
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const src = req.headers.get('x-childcare-source')
  const source: InterestInput['source'] = src === 'mcp' ? 'mcp' : src === 'chat' ? 'chat' : 'web'

  try {
    const result = await createInterest({ ...body, source })
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json(result)
  } catch {
    return Response.json({ error: 'Could not record your interest right now. Please try again.' }, { status: 502 })
  }
}
