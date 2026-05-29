'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { APIProvider, Map as GMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { MapPin, Phone, Users, Navigation } from 'lucide-react'
import type { ChatFacility } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Fit the map to all markers so the providers shown are actually in view
// (a plain average center + fixed zoom drifts off when results are spread out).
function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !points.length) return
    if (points.length === 1) {
      map.setCenter(points[0]); map.setZoom(13); return
    }
    const bounds = new google.maps.LatLngBounds()
    points.forEach(p => bounds.extend(p))
    map.fitBounds(bounds, 32)
  }, [map, points])
  return null
}

export function ChatFacilityCards({ facilities }: { facilities: ChatFacility[] }) {
  if (!facilities?.length) return null
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mappable = facilities.filter(f => f.latitude != null && f.longitude != null)
  const points = mappable.map(f => ({ lat: Number(f.latitude), lng: Number(f.longitude) }))

  return (
    <div className="mt-5 flex flex-col gap-4">
      {/* Mini-map — full chat width, above the cards */}
      {apiKey && points.length > 0 && (
        <div className="aspect-[2/1] w-full rounded-xl overflow-hidden border border-[var(--paper-rule)]">
          <APIProvider apiKey={apiKey}>
            <GMap
              defaultCenter={points[0]}
              defaultZoom={11}
              gestureHandling="cooperative"
              disableDefaultUI
              mapId="childcare-chat-mini"
              style={{ width: '100%', height: '100%' }}
            >
              <FitBounds points={points} />
              {mappable.map(f => (
                <AdvancedMarker key={f.facility_id} position={{ lat: Number(f.latitude), lng: Number(f.longitude) }}>
                  <span className="block h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: 'var(--paper-accent)' }} />
                </AdvancedMarker>
              ))}
            </GMap>
          </APIProvider>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {facilities.slice(0, 6).map(f => (
          <Link
            key={f.facility_id}
            href={`/facility/${f.facility_id}`}
            className="group/card block rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-3 hover:border-[var(--paper-accent)] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-[16px] leading-tight text-[var(--paper-text)] group-hover/card:opacity-80 transition-opacity" style={{ ...SERIF, fontWeight: 500 }}>
                {f.facility_name}
              </h4>
              {f.program_type && (
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide" style={{ ...SANS, background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                  {f.program_type}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--paper-muted)]" style={SANS}>
              {f.distance_miles != null && (
                <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--paper-accent)' }}>
                  <Navigation className="h-3 w-3" />{f.distance_miles} mi away
                </span>
              )}
              {(f.city || f.county) && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[f.city, f.county].filter(Boolean).join(', ')}</span>
              )}
              {f.total_capacity != null && (
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{f.total_capacity} seats</span>
              )}
              {f.phone_number && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{f.phone_number}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
