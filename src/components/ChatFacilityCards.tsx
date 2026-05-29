'use client'

import Link from 'next/link'
import { APIProvider, Map as GMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import { MapPin, Phone, Users } from 'lucide-react'
import type { ChatFacility } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

function center(facilities: ChatFacility[]): { lat: number; lng: number } | null {
  const pts = facilities.filter(f => f.latitude != null && f.longitude != null)
  if (!pts.length) return null
  const lat = pts.reduce((s, f) => s + Number(f.latitude), 0) / pts.length
  const lng = pts.reduce((s, f) => s + Number(f.longitude), 0) / pts.length
  return { lat, lng }
}

export function ChatFacilityCards({ facilities }: { facilities: ChatFacility[] }) {
  if (!facilities?.length) return null
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const c = center(facilities)
  const mappable = facilities.filter(f => f.latitude != null && f.longitude != null)

  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
      {/* Mini-map */}
      {apiKey && c && mappable.length > 0 && (
        <div className="h-[200px] sm:h-auto sm:min-h-[200px] rounded-xl overflow-hidden border border-[var(--paper-rule)]">
          <APIProvider apiKey={apiKey}>
            <GMap
              defaultCenter={c}
              defaultZoom={11}
              gestureHandling="cooperative"
              disableDefaultUI
              mapId="childcare-chat-mini"
              style={{ width: '100%', height: '100%' }}
            >
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
