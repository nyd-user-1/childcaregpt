import { NextRequest } from 'next/server'
import { get } from '@vercel/blob'
import { GEOJSON_BLOB_PATHS } from '@/lib/blob-geojson'

export const dynamic = 'force-dynamic'

// Streams district GeoJSON from the private Blob store to the browser, with an
// immutable long cache so the heavy polygons are fetched once per client.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const pathname = GEOJSON_BLOB_PATHS[key]
  if (!pathname) {
    return new Response(JSON.stringify({ error: 'Unknown geojson key' }), { status: 404 })
  }

  try {
    const result = await get(pathname, { access: 'private' })
    if (!result) {
      return new Response(JSON.stringify({ error: 'Not found in store' }), { status: 404 })
    }
    return new Response(result.stream, {
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 502 })
  }
}
