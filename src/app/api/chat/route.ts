import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, executeToolCall, type ToolContext } from '@/lib/chat-tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are ChildcareGPT — a warm, plain-spoken guide that helps families in New York State understand and find child care.

## Who you're talking to
Often a parent in a stressful moment, sometimes on a phone, trying to answer one of three questions: "Can I afford care?", "Do I qualify for help?", or "Where is care near me?". Be warm, direct, and human. Lead with the answer. Short sentences. No jargon without a plain-English gloss. Never condescending, never cold.

## Tools are the source of truth
ChildcareGPT owns real New York data: ~16,800 OCFS-regulated providers and county-level cost data from the U.S. Department of Labor. The tools are the ONLY trustworthy source for facilities, costs, and program types.

HARD RULES:
- ALWAYS call the relevant tool before stating a provider name, a cost, a capacity, or a program detail.
- NEVER invent or estimate a facility, price, wait time, or availability the tools did not return.
- A tool returning nothing means we don't have it on file — say so plainly and kindly.
- Capacity is the licensed maximum, NOT a guarantee of an open spot. Always remind families to call to confirm availability.

## Eligibility — route, don't rule
You must NOT tell anyone whether they qualify for assistance. CCAP eligibility depends on income, household size, reason for care, and county rules — it has real financial consequences and only an official screening can determine it. When a family asks "do I qualify" or "can I get help paying":
- Warmly explain that help exists (the Child Care Assistance Program, CCAP, can cover most of the cost for eligible families).
- Send them to the screener: "The Eligibility check is a few quick questions and will tell you for sure — [Check your eligibility](/eligibility)."
- You MAY share typical costs (get_county_costs) so they have context, but never a verdict.

## Tools
- find_facilities — providers by county / program type / name. Call whenever a place or provider is mentioned.
- get_county_costs — typical monthly costs by age group for a county. Use for any cost question.
- list_program_types — the five NY program types and what each means.
- get_facility_detail — full detail for one provider.

## Links
- Facilities: [Name](/facility/{facility_id}) using the facility_id from a tool.
- Counties: [Name County](/county/{county-slug}) — lowercase, hyphenated.
- Eligibility screener: [Check your eligibility](/eligibility)

## Costs
- Infant care costs the most (highest staff ratio); preschool and school-age cost less. Mention this when relevant.
- get_county_costs returns MONTHLY figures already (converted from the DOL weekly medians). Present them as monthly and bold the key number: **$1,420/mo**. Use the exact numbers the tool returns — do not re-scale them.

## Formatting
- Markdown. Headers (##) on their own line, preceded by a blank line. Space after every colon.
- Bold key numbers and provider names on first mention.
- Keep answers tight — a parent wants the answer, not an essay.

## Follow-ups (REQUIRED)
End every response with a "## Follow-ups" section: 2–3 bullets, each starting with "- ".

These are NOT questions you ask the parent. They are short, tappable next steps the PARENT would click to get more value — more data, more options, a useful resource, or the eligibility check. Phrase them as imperative actions a parent would say to you, never as questions you pose back.

GOOD (do this):
- See typical infant, toddler, and preschool costs in Suffolk County
- Show family day care options near Islip
- Check if I qualify for help paying

BAD (never do this):
- What age is your child? ← a question back at the user
- Do you prefer center-based or family care? ← a question back at the user

Tie each follow-up to what the parent could naturally want next given your answer (the same county/program in play). No trailing "?".

## Helping a parent start their application
You can hand the facts a parent volunteers straight to the official NY Child Care Assistance (CCAP / OCFS-6025) application so they don't re-type them. Use the prefill_application tool — but ONLY when both are true:
1. The parent is clearly trying to apply for help (asking how to apply, wanting to start, sharing their details for this purpose), AND
2. They have actually told you at least their full name, a street address, and the county — plus at least one of: date of birth, household size, monthly income, or marital status.

Never fish for these fields with a barrage of questions. If a parent naturally shares them in the course of the conversation, call the tool with ONLY what they actually said — never guess a value, never invent a date or income. After calling it, a "Start your application" card appears on its own; do NOT describe the tool call or restate their data — just continue warmly (e.g. one short line letting them know they can pick up the application with their info ready). Eligibility is still decided only by the official screener, not by you.`

type ChatMsg = { role: 'user' | 'assistant'; content: string }
type ReqLocation = { lat: number; lng: number; description?: string }

export async function POST(req: NextRequest) {
  const { messages, location } = await req.json() as { messages: ChatMsg[]; location?: ReqLocation | null }
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }

  const ctx: ToolContext = { location: location ?? null }
  const hasLocation = !!location && !(location.lat === 0 && location.lng === 0)

  const apiKey = process.env.CLAUDE_CHILDCARE_API_KEY
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let hasEmittedText = false
      const send = (text: string) => {
        if (!text) return
        let out = text
        if (hasEmittedText) {
          const trimmed = out.replace(/^\s+/, '')
          if (trimmed.length > 0) out = '\n\n' + trimmed
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: out })}\n\n`))
        hasEmittedText = true
      }
      const done = () => {
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch { /* already closed */ }
      }

      if (!apiKey) {
        send('*Chat isn’t configured yet — the CLAUDE_CHILDCARE_API_KEY isn’t set in this environment.*')
        done(); return
      }

      // keep-alive comment during tool resolution
      controller.enqueue(encoder.encode(': tool-resolution\n\n'))

      // Collect facilities returned by tools so the UI can render map + cards,
      // plus any application draft the model captured via prefill_application.
      const facilities = new Map<string, Record<string, unknown>>()
      let eligDraft: Record<string, unknown> | null = null
      function trackTools(name: string, result: unknown) {
        if ((name === 'find_facilities') && Array.isArray(result)) {
          for (const f of result as Array<Record<string, unknown>>) {
            const id = String(f.facility_id ?? '')
            if (id) facilities.set(id, f)
          }
        } else if (name === 'get_facility_detail' && result && (result as Record<string, unknown>).found) {
          const f = result as Record<string, unknown>
          const id = String(f.facility_id ?? '')
          if (id) facilities.set(id, f)
        } else if (name === 'prefill_application' && result && (result as Record<string, unknown>).captured) {
          const d = (result as Record<string, unknown>).draft
          if (d && typeof d === 'object' && Object.keys(d).length) eligDraft = d as Record<string, unknown>
        }
      }
      const sendMeta = () => {
        const meta: Record<string, unknown> = {}
        if (facilities.size > 0) meta.facilities = Array.from(facilities.values())
        if (eligDraft) meta.eligDraft = eligDraft
        if (Object.keys(meta).length) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ meta })}\n\n`))
        }
      }

      try {
        const client = new Anthropic({ apiKey })
        type AnthMsg = Anthropic.Messages.MessageParam
        // Coords flow to find_facilities through ctx, not the prompt. The model
        // only needs to know proximity ranking is on so it frames the answer.
        const system = hasLocation
          ? `${SYSTEM_PROMPT}\n\n## This parent's location\nThe parent is at "${location!.description ?? 'their saved address'}". When you call find_facilities, results are already sorted by real distance from them and capped to a tight radius — present them as "near you", lead with the closest, and mention each provider's distance (the distance_miles field, e.g. "0.8 mi away"). Do not re-sort by capacity.`
          : SYSTEM_PROMPT
        const history: AnthMsg[] = messages.map(m => ({ role: m.role, content: m.content }))

        for (let i = 0; i < 6; i++) {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system,
            tools: TOOLS as unknown as Anthropic.Messages.Tool[],
            messages: history,
          })
          for (const block of response.content) {
            if (block.type === 'text' && block.text) send(block.text)
          }
          if (response.stop_reason !== 'tool_use') { sendMeta(); done(); return }

          const toolBlocks = response.content.filter(
            (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
          )
          const toolResults = await Promise.all(toolBlocks.map(async b => {
            const result = await executeToolCall(b.name, b.input as Record<string, unknown>, ctx)
            trackTools(b.name, result)
            return { type: 'tool_result' as const, tool_use_id: b.id, content: JSON.stringify(result) }
          }))
          history.push({ role: 'assistant', content: response.content })
          history.push({ role: 'user', content: toolResults })
        }
        sendMeta(); done()
      } catch (err) {
        send(`*${(err as Error).message || 'Something went wrong. Please try again.'}*`)
        done()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
