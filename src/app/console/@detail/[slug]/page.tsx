'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { APIProvider, Map as GMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { getCountyBySlug } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const PROGRAM_TYPES = ['FDC', 'GFDC', 'SACC', 'SDCC'] as const
const TAB_LABELS: Record<string, string> = {
  FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care', SDCC: 'Small Day Care Center',
}
const PIN_COLORS: Record<string, string> = {
  FDC: '#0ea5e9', GFDC: '#10b981', SACC: '#f59e0b', SDCC: '#8b5cf6',
}

type Facility = {
  facility_id: string; facility_name: string; city: string
  program_type: string; total_capacity: number
  latitude: number | null; longitude: number | null
  facility_status: string; provider_name: string
}

type SelectedFacility = Facility & { x: number; y: number }

// County approximate centers for map focus
const COUNTY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  albany: { lat: 42.65, lng: -73.75, zoom: 11 },
  allegany: { lat: 42.27, lng: -78.02, zoom: 10 },
  bronx: { lat: 40.84, lng: -73.87, zoom: 12 },
  broome: { lat: 42.10, lng: -75.90, zoom: 11 },
  cattaraugus: { lat: 42.25, lng: -78.67, zoom: 10 },
  cayuga: { lat: 42.90, lng: -76.56, zoom: 10 },
  chautauqua: { lat: 42.28, lng: -79.35, zoom: 10 },
  chemung: { lat: 42.14, lng: -76.86, zoom: 11 },
  chenango: { lat: 42.48, lng: -75.60, zoom: 10 },
  clinton: { lat: 44.74, lng: -73.67, zoom: 10 },
  columbia: { lat: 42.25, lng: -73.63, zoom: 10 },
  cortland: { lat: 42.60, lng: -76.07, zoom: 11 },
  delaware: { lat: 42.20, lng: -74.97, zoom: 10 },
  dutchess: { lat: 41.77, lng: -73.74, zoom: 10 },
  erie: { lat: 42.76, lng: -78.85, zoom: 10 },
  essex: { lat: 44.12, lng: -73.76, zoom: 9 },
  franklin: { lat: 44.60, lng: -74.30, zoom: 9 },
  fulton: { lat: 43.12, lng: -74.42, zoom: 10 },
  genesee: { lat: 43.00, lng: -78.18, zoom: 10 },
  greene: { lat: 42.27, lng: -74.23, zoom: 10 },
  hamilton: { lat: 43.66, lng: -74.52, zoom: 9 },
  herkimer: { lat: 43.40, lng: -74.95, zoom: 9 },
  jefferson: { lat: 44.00, lng: -75.98, zoom: 9 },
  kings: { lat: 40.65, lng: -73.95, zoom: 12 },
  lewis: { lat: 43.78, lng: -75.45, zoom: 9 },
  livingston: { lat: 42.68, lng: -77.78, zoom: 10 },
  madison: { lat: 42.91, lng: -75.66, zoom: 10 },
  monroe: { lat: 43.16, lng: -77.61, zoom: 11 },
  montgomery: { lat: 42.91, lng: -74.44, zoom: 10 },
  nassau: { lat: 40.73, lng: -73.59, zoom: 11 },
  'new-york': { lat: 40.78, lng: -73.97, zoom: 13 },
  niagara: { lat: 43.22, lng: -78.87, zoom: 10 },
  oneida: { lat: 43.24, lng: -75.44, zoom: 10 },
  onondaga: { lat: 43.00, lng: -76.17, zoom: 11 },
  ontario: { lat: 42.85, lng: -77.30, zoom: 10 },
  orange: { lat: 41.40, lng: -74.35, zoom: 10 },
  orleans: { lat: 43.23, lng: -78.18, zoom: 10 },
  oswego: { lat: 43.46, lng: -76.20, zoom: 10 },
  otsego: { lat: 42.63, lng: -75.04, zoom: 10 },
  putnam: { lat: 41.43, lng: -73.76, zoom: 11 },
  queens: { lat: 40.73, lng: -73.79, zoom: 12 },
  rensselaer: { lat: 42.71, lng: -73.51, zoom: 10 },
  richmond: { lat: 40.58, lng: -74.15, zoom: 12 },
  rockland: { lat: 41.15, lng: -74.02, zoom: 11 },
  'st-lawrence': { lat: 44.50, lng: -75.00, zoom: 9 },
  saratoga: { lat: 43.10, lng: -73.88, zoom: 10 },
  schenectady: { lat: 42.82, lng: -74.02, zoom: 11 },
  schoharie: { lat: 42.58, lng: -74.44, zoom: 10 },
  schuyler: { lat: 42.39, lng: -76.87, zoom: 10 },
  seneca: { lat: 42.78, lng: -76.83, zoom: 10 },
  steuben: { lat: 42.26, lng: -77.38, zoom: 10 },
  suffolk: { lat: 40.92, lng: -72.68, zoom: 10 },
  sullivan: { lat: 41.72, lng: -74.77, zoom: 10 },
  tioga: { lat: 42.17, lng: -76.30, zoom: 10 },
  tompkins: { lat: 42.45, lng: -76.48, zoom: 11 },
  ulster: { lat: 41.89, lng: -74.27, zoom: 10 },
  warren: { lat: 43.65, lng: -73.83, zoom: 10 },
  washington: { lat: 43.31, lng: -73.43, zoom: 10 },
  wayne: { lat: 43.07, lng: -77.10, zoom: 10 },
  westchester: { lat: 41.13, lng: -73.79, zoom: 11 },
  wyoming: { lat: 42.70, lng: -78.24, zoom: 10 },
  yates: { lat: 42.64, lng: -77.11, zoom: 10 },
}

export default function ConsoleDetailSlot({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const county = getCountyBySlug(slug)
  if (!county) notFound()

  const [activeType, setActiveType] = useState<typeof PROGRAM_TYPES[number]>('FDC')
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Facility | null>(null)

  useEffect(() => {
    setSelected(null)
    setLoading(true)
    fetch(`/api/facilities?county=${encodeURIComponent(county.county)}&program_type=${activeType}&limit=200`)
      .then(r => r.json())
      .then(d => { setFacilities(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [county.county, activeType])

  const center = COUNTY_CENTERS[slug] ?? { lat: 42.9, lng: -75.5, zoom: 8 }
  const pinColor = PIN_COLORS[activeType]
  const mappable = facilities.filter(f => f.latitude && f.longitude)

  return (
    <div className="h-full flex flex-col">
      {/* ── Type tab bar ── */}
      <div className="shrink-0 flex items-center gap-0 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        {PROGRAM_TYPES.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={cn(
              'px-3 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeType === t
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--txt)]'
            )}>
            {TAB_LABELS[t]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)] py-3">
          {loading ? (
            <span className="animate-pulse">Loading…</span>
          ) : (
            <span>{mappable.length} mapped · {facilities.length - mappable.length} no coords</span>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
          <GMap
            mapId="console-provider-map"
            defaultCenter={{ lat: center.lat, lng: center.lng }}
            defaultZoom={center.zoom}
            key={`${slug}-${activeType}`}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            {mappable.map(f => (
              <AdvancedMarker
                key={f.facility_id}
                position={{ lat: Number(f.latitude), lng: Number(f.longitude) }}
                onClick={() => setSelected(f)}
                title={f.facility_name}
              >
                <Pin
                  background={selected?.facility_id === f.facility_id ? '#0f172a' : pinColor}
                  borderColor="white"
                  glyphColor="white"
                  scale={selected?.facility_id === f.facility_id ? 1.3 : 0.9}
                />
              </AdvancedMarker>
            ))}
          </GMap>
        </APIProvider>

        {/* ── Facility info panel ── */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 leading-snug">{selected.facility_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.city} · {TAB_LABELS[selected.program_type] ?? selected.program_type}</p>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 px-2 py-1.5">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-bold text-sky-600">{selected.total_capacity}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-2 py-1.5">
                <p className="text-xs text-gray-500">Provider</p>
                <p className="text-xs font-medium text-gray-700 truncate">{selected.provider_name ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-2 py-1.5">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-xs font-medium text-gray-700">{selected.facility_status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
