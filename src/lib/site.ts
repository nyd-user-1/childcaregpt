/** Absolute origin of this deployment — for links a foreign client (an MCP
 *  host, an email) needs to be citable. Never hard-coded, or every host but one
 *  gets the wrong links. Mirrors leuk's appBaseUrl(). */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production') return 'https://childcare.nysgpt.com'
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
