'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { APIProvider, Map as GMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { Search, MapPin, Phone, Users, Navigation, X, Loader2 } from 'lucide-react'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const ACCENT = '#2f6d6a'

const MAP_STYLE = [
  { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water',   elementType: 'geometry', stylers: [{ color: '#e7eef0' }] },
]

type Suggestion = { place_id: string; description: string }
type Facility = {
  facility_id: number
  facility_name: string
  city?: string | null
  county?: string | null
  program_type?: string | null
  total_capacity?: number | null
  phone_number?: string | null
  latitude?: number | null
  longitude?: number | null
  distance_miles?: number | null
}
type Located = { lat: number; lng: number; label: string }

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw
}
function telHref(raw: string): string {
  return `tel:+1${raw.replace(/\D/g, '').replace(/^1/, '')}`
}

function MapController({ center, facilities }: { center: Located | null; facilities: Facility[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !center) return
    const pts = facilities.filter(f => f.latitude != null && f.longitude != null)
      .map(f => ({ lat: Number(f.latitude), lng: Number(f.longitude) }))
    if (pts.length === 0) { map.setCenter({ lat: center.lat, lng: center.lng }); map.setZoom(13); return }
    const bounds = new google.maps.LatLngBounds()
    bounds.extend({ lat: center.lat, lng: center.lng })
    pts.forEach(p => bounds.extend(p))
    map.fitBounds(bounds, 64)
  }, [map, center, facilities])
  return null
}

export function ZipMapClient() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [located, setLocated] = useState<Located | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?input=${encodeURIComponent(value)}`)
        const data = await res.json()
        if (Array.isArray(data)) setSuggestions(data)
      } catch { /* silent */ }
    }, 150)
  }, [])

  const runSearch = useCallback(async (lat: number, lng: number, label: string) => {
    setLocated({ lat, lng, label })
    setSuggestions([])
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/facilities/nearby?lat=${lat}&lng=${lng}&radius=3`)
      const data = await res.json()
      setFacilities(Array.isArray(data.data) ? data.data : [])
    } catch {
      setFacilities([])
    } finally {
      setLoading(false)
    }
  }, [])

  const selectSuggestion = useCallback(async (s: Suggestion) => {
    setInput(s.description)
    try {
      const res = await fetch(`/api/places/geocode?place_id=${s.place_id}`)
      const geo = await res.json()
      if (geo.lat && geo.lng) await runSearch(geo.lat, geo.lng, s.description)
    } catch { /* silent */ }
  }, [runSearch])

  const clear = () => { setInput(''); setSuggestions([]); setLocated(null); setFacilities([]); setSearched(false) }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
      <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-12 sm:pt-14 pb-16">

        {/* Masthead */}
        <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
          ChildcareGPT · By ZIP Code
        </p>
        <h1 className="paper-rise mt-4 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
          Care in <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>your neighborhood.</span>
        </h1>
        <p className="paper-rise mt-5 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: '1.12rem', lineHeight: 1.6 }}>
          Enter your ZIP code or address. We’ll map every licensed provider near
          you and list them closest-first.
        </p>

        {/* Search */}
        <div className="paper-rise relative mt-8" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-2 rounded-2xl border bg-[var(--inp-bg)] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]" style={{ borderColor: located ? ACCENT : 'var(--border)' }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
            <input
              value={input}
              onChange={e => { setInput(e.target.value); fetchSuggestions(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter' && suggestions.length) { e.preventDefault(); selectSuggestion(suggestions[0]) } }}
              placeholder="Enter a ZIP code or address…"
              className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--muted2)]"
              style={SANS}
            />
            {input && <button onClick={clear} className="text-[var(--muted)] hover:text-[var(--txt)] transition-colors"><X className="h-4 w-4" /></button>}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--surface)] shadow-xl">
              {suggestions.map(s => (
                <button key={s.place_id} onClick={() => selectSuggestion(s)}
                  className="flex w-full items-start gap-3 border-b border-[var(--paper-rule)] px-4 py-3 text-left text-sm text-[var(--txt)] transition-colors last:border-0 hover:bg-[var(--inp-bg)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                  <span>{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="paper-rise mt-7 overflow-hidden rounded-2xl border border-[var(--paper-rule)]" style={{ animationDelay: '240ms' }}>
          <div className="relative aspect-[3/2] w-full">
            <APIProvider apiKey={apiKey}>
              <GMap
                defaultCenter={{ lat: 42.9, lng: -75.6 }}
                defaultZoom={6}
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
                styles={MAP_STYLE}
                mapId="childcare-zip-map"
                style={{ width: '100%', height: '100%' }}
              >
                <MapController center={located} facilities={facilities} />
                {located && (
                  <AdvancedMarker position={{ lat: located.lat, lng: located.lng }}>
                    <span className="block h-4 w-4 rounded-full border-2 border-white shadow-lg" style={{ background: '#1a1a1a' }} />
                  </AdvancedMarker>
                )}
                {facilities.filter(f => f.latitude != null && f.longitude != null).map(f => (
                  <AdvancedMarker key={f.facility_id} position={{ lat: Number(f.latitude), lng: Number(f.longitude) }}>
                    <span className="block h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: ACCENT }} />
                  </AdvancedMarker>
                ))}
              </GMap>
            </APIProvider>
            {!searched && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--paper) 55%, transparent)' }}>
                <p className="rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-2 text-[13px] text-[var(--paper-muted)] shadow-sm" style={SANS}>
                  Enter a ZIP or address to see providers near you
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="mt-7">
            {loading ? (
              <div className="flex items-center gap-2 text-[var(--paper-muted)]" style={SANS}>
                <Loader2 className="h-4 w-4 animate-spin" /> Finding providers near you…
              </div>
            ) : facilities.length === 0 ? (
              <p className="text-[var(--paper-muted)]" style={SERIF}>No licensed providers found within range. Try a nearby ZIP or a wider area.</p>
            ) : (
              <>
                <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                  {facilities.length} provider{facilities.length === 1 ? '' : 's'} near {located?.label}
                </p>
                <div className="flex flex-col gap-2">
                  {facilities.map(f => (
                    <div key={f.facility_id} className="rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/facility/${f.facility_id}`} className="min-w-0">
                          <h3 className="text-[16px] leading-tight text-[var(--paper-text)] hover:opacity-80 transition-opacity" style={{ ...SERIF, fontWeight: 500 }}>{f.facility_name}</h3>
                        </Link>
                        {f.program_type && (
                          <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide" style={{ ...SANS, background: 'var(--paper-accent-soft)', color: ACCENT }}>{f.program_type}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--paper-muted)]" style={SANS}>
                        {f.distance_miles != null && (
                          <span className="inline-flex items-center gap-1 font-medium" style={{ color: ACCENT }}><Navigation className="h-3 w-3" />{f.distance_miles} mi away</span>
                        )}
                        {(f.city || f.county) && (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[f.city, f.county].filter(Boolean).join(', ')}</span>
                        )}
                        {f.total_capacity != null && (
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{f.total_capacity} seats</span>
                        )}
                        {f.phone_number && (
                          <a href={telHref(f.phone_number)} className="inline-flex items-center gap-1 transition-colors hover:text-[var(--paper-accent)]"><Phone className="h-3 w-3" />{formatPhone(f.phone_number)}</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
