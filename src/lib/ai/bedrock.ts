import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

// Claude on Amazon Bedrock — the inference path for ChildcareGPT chat.
//
// Ported from leuk's lib/ai/bedrock.ts + app/api/ai/directory/route.ts
// (2026-08-15). Same AWS account, same credential shapes, same provider — the
// only thing that changed is the env-var prefix. Nothing here is PHI, so
// there is no BAA argument in play; the reason to be on Bedrock is that the
// inference credit is on AWS, not Anthropic direct, and one account serves
// leuk, 44b and childcare.
//
// Config (absent → bedrockConfigured() is false and /api/chat says so plainly
// instead of fabricating). A region + EITHER credential shape is required:
//   CHILDCARE_BEDROCK_REGION       region where the model is enabled (us-east-1)
//   CHILDCARE_BEDROCK_MODEL_ID     inference-profile id, e.g.
//                                   us.anthropic.claude-haiku-4-5-20251001-v1:0
//   — then ONE of —
//   CHILDCARE_BEDROCK_API_KEY      Bedrock API key (bearer token; the console
//                                   one-click key). Takes precedence.
//   CHILDCARE_AWS_ACCESS_KEY_ID / CHILDCARE_AWS_SECRET_ACCESS_KEY
//                                   IAM access key scoped to bedrock:InvokeModel*.
//
// NEVER LOG prompt or completion text from here — model id and token counts only.

export const DEFAULT_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

/** Verified against this AWS account by leuk (lib/ai/model-options.ts): granted
 *  AND streaming-tool-compatible. Anything else is a 503 waiting to happen. */
export const CLAUDE_MODEL_IDS = new Set([
  'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  'us.anthropic.claude-sonnet-4-6',
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'us.anthropic.claude-opus-4-6-v1',
  'us.anthropic.claude-opus-4-5-20251101-v1:0',
])

export function bedrockCredentials():
  | { region: string; apiKey: string }
  | { region: string; accessKeyId: string; secretAccessKey: string }
  | null {
  const region = process.env.CHILDCARE_BEDROCK_REGION
  if (!region) return null
  const apiKey = process.env.CHILDCARE_BEDROCK_API_KEY
  if (apiKey) return { region, apiKey }
  const accessKeyId = process.env.CHILDCARE_AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.CHILDCARE_AWS_SECRET_ACCESS_KEY
  if (accessKeyId && secretAccessKey) return { region, accessKeyId, secretAccessKey }
  return null
}

export function bedrockModelId(): string {
  const id = process.env.CHILDCARE_BEDROCK_MODEL_ID?.trim()
  return id && CLAUDE_MODEL_IDS.has(id) ? id : DEFAULT_MODEL_ID
}

let provider: ReturnType<typeof createAmazonBedrock> | null = null
/** The AI SDK Bedrock provider, built once per instance. Null when unconfigured. */
export function bedrock(): ReturnType<typeof createAmazonBedrock> | null {
  if (provider) return provider
  const creds = bedrockCredentials()
  if (!creds) return null
  provider = createAmazonBedrock(
    'apiKey' in creds
      ? { region: creds.region, apiKey: creds.apiKey }
      : { region: creds.region, accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
  )
  return provider
}

export function bedrockConfigured(): boolean {
  return !!bedrock()
}

// ── Fallback ────────────────────────────────────────────────────────────────
// Until CHILDCARE_BEDROCK_* is set on a deployment, the chat keeps working on
// the first-party Anthropic API with the key it always used. SAME code path
// (AI SDK streamText), different provider — not a second engine. Once Bedrock
// is live everywhere this block and CLAUDE_CHILDCARE_API_KEY can go.
const ANTHROPIC_FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

/** The chat model to use right now, and which lane it is on. Null if neither
 *  Bedrock nor the Anthropic fallback is configured. */
export function chatModel(): { model: LanguageModel; lane: 'bedrock' | 'anthropic' } | null {
  const b = bedrock()
  if (b) return { model: b(bedrockModelId()), lane: 'bedrock' }
  const key = process.env.CLAUDE_CHILDCARE_API_KEY?.trim()
  if (key) return { model: createAnthropic({ apiKey: key })(ANTHROPIC_FALLBACK_MODEL), lane: 'anthropic' }
  return null
}
