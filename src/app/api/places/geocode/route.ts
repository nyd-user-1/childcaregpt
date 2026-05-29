import { NextRequest, NextResponse } from 'next/server'

type Component = { long_name: string; short_name: string; types: string[] }

// Derive a bare NY county name ("Suffolk", "Kings") from Google's address
// components. administrative_area_level_2 is the county for most of NY; some NYC
// borough results omit it, so fall back to the borough sublocality and map it.
const BOROUGH_TO_COUNTY: Record<string, string> = {
  'Brooklyn': 'Kings',
  'Manhattan': 'New York',
  'The Bronx': 'Bronx',
  'Bronx': 'Bronx',
  'Queens': 'Queens',
  'Staten Island': 'Richmond',
}

function countyFrom(components: Component[]): string {
  const admin2 = components.find(c => c.types.includes('administrative_area_level_2'))
  if (admin2) return admin2.long_name.replace(/\s+County$/i, '').trim()

  const boroughTypes = ['sublocality_level_1', 'sublocality', 'administrative_area_level_3', 'locality']
  for (const t of boroughTypes) {
    const c = components.find(x => x.types.includes(t))
    if (c && BOROUGH_TO_COUNTY[c.long_name]) return BOROUGH_TO_COUNTY[c.long_name]
  }
  return ''
}

export async function GET(req: NextRequest) {
  const place_id = req.nextUrl.searchParams.get('place_id')
  if (!place_id) return NextResponse.json({ error: 'Missing place_id' }, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry,address_components&key=${key}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    const loc = data.result?.geometry?.location
    if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    const county = countyFrom((data.result?.address_components ?? []) as Component[])
    return NextResponse.json({ lat: loc.lat, lng: loc.lng, county })
  } catch {
    return NextResponse.json({ error: 'Geocode failed' }, { status: 500 })
  }
}
