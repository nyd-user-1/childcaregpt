// Free-text → coordinates, New York only, via OpenStreetMap's Nominatim.
//
// Open-source replacement for the Google Geocoding API (not enabled on our
// key). Public Nominatim usage policy: identify the app in User-Agent, ≤1
// request/second, cache. We do all three — the cache is per-instance and the
// only caller is the MCP `near` filter, which is a human typing an address.
// If you ever need volume, self-host Nominatim or Photon; the interface here
// does not change.

export type Geocoded = { lat: number; lng: number; description: string; county: string | null }

const UA = 'ChildcareGPT/1.0 (https://childcare.nysgpt.com; hello@nysgpt.com)'
// New York State bounding box (lng/lat), a little generous.
const NY_VIEWBOX = '-79.90,45.05,-71.75,40.45'
const cache = new Map<string, Geocoded | null>()

export async function geocodeNY(query: string): Promise<Geocoded | null> {
  const q = query.trim().replace(/\s+/g, ' ')
  if (!q) return null
  const key = q.toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', /\bny\b|new york/i.test(q) ? q : `${q}, New York`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')
  url.searchParams.set('viewbox', NY_VIEWBOX)
  url.searchParams.set('bounded', '1')
  url.searchParams.set('addressdetails', '1')

  let out: Geocoded | null = null
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; address?: Record<string, string> }>
      const r = rows[0]
      if (r && r.address?.state === 'New York') {
        const county = (r.address.county ?? '').replace(/\s+County$/i, '') || boroughCounty(r.address) || null
        out = { lat: Number(r.lat), lng: Number(r.lon), description: shortName(r.display_name), county }
      }
    }
  } catch {
    out = null
  }
  cache.set(key, out)
  return out
}

// NYC results come back with a borough in `city_district`/`suburb`, not a county.
function boroughCounty(a: Record<string, string>): string | null {
  const s = `${a.city_district ?? ''} ${a.suburb ?? ''} ${a.borough ?? ''}`.toLowerCase()
  if (s.includes('brooklyn')) return 'Brooklyn'
  if (s.includes('manhattan')) return 'Manhattan'
  if (s.includes('queens')) return 'Queens'
  if (s.includes('bronx')) return 'Bronx'
  if (s.includes('staten')) return 'Staten Island'
  return null
}
const shortName = (d: string) => d.split(',').slice(0, 3).map(s => s.trim()).join(', ')
