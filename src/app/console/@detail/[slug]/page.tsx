'use client'

import { use, useState, useEffect } from 'react'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import { APIProvider, Map as GMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { getCountyBySlug } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'
import { X, Info } from 'lucide-react'
import { ConsoleExplainerPanel } from '../../ConsoleExplainerPanel'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const PROGRAM_TYPES = ['DCC', 'FDC', 'GFDC', 'SACC', 'SDCC'] as const
type TypeKey = 'ALL' | typeof PROGRAM_TYPES[number]
const TABS: TypeKey[] = ['ALL', 'DCC', 'FDC', 'GFDC', 'SACC', 'SDCC']
const TAB_LABELS: Record<string, string> = {
  ALL: 'All Types',
  DCC: 'Day Care Center', FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care', SDCC: 'Small Day Care Center',
}
// Warm, on-palette pin colors (teal → earth tones).
const PIN_COLORS: Record<string, string> = {
  DCC: '#2f6d6a', FDC: '#5a9b8f', GFDC: '#c9a15e', SACC: '#c08457', SDCC: '#8a5a3c',
}

type Facility = {
  facility_id: string; facility_name: string; city: string
  program_type: string; total_capacity: number
  latitude: number | null; longitude: number | null
  facility_status: string; provider_name: string
}

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

  const [activeType, setActiveType] = useState<TypeKey>('ALL')
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Facility | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wantList = searchParams.get('panel') === 'providers'

  useEffect(() => {
    setSelected(null)
    setLoading(true)
    const base = `/api/facilities?county=${encodeURIComponent(county.county)}&limit=200`
    const url = activeType === 'ALL' ? base : `${base}&program_type=${activeType}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setFacilities(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [county.county, activeType])

  const center = COUNTY_CENTERS[slug] ?? { lat: 42.9, lng: -75.5, zoom: 8 }
  const pinFor = (pt: string) => activeType === 'ALL' ? (PIN_COLORS[pt] ?? '#2f6d6a') : (PIN_COLORS[activeType] ?? '#2f6d6a')
  const mappable = facilities.filter(f => f.latitude && f.longitude)

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

      {/* ── County header ── */}
      <div className="flex shrink-0 items-end justify-between gap-3 border-b border-[var(--paper-rule)] px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="leading-none text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-0.015em' }}>
            {county.county} <span className="italic" style={{ color: 'var(--paper-accent)' }}>County</span>
          </h2>
        </div>
        <button onClick={() => setPanelOpen(true)} aria-label="How this works"
          className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--paper-accent)]">
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* ── Type tab bar ── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--paper-rule)] px-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveType(t)} title={TAB_LABELS[t]}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors',
              activeType === t ? 'text-[var(--paper-text)]' : 'border-transparent text-[var(--paper-faint)] hover:text-[var(--paper-text)]',
            )}
            style={{ ...SANS, borderColor: activeType === t ? 'var(--paper-accent)' : 'transparent' }}>
            <span className="h-2 w-2 rounded-sm" style={{ background: t === 'ALL' ? 'var(--paper-text)' : PIN_COLORS[t] }} />
            {t === 'ALL' ? 'All' : t}
          </button>
        ))}
        <span className="ml-auto shrink-0 pl-2 text-[11px] tabular-nums text-[var(--paper-muted)]" style={SANS}>
          {loading ? <span className="animate-pulse">Loading…</span> : `${mappable.length} of ${facilities.length} mapped`}
        </span>
      </div>

      {/* ── Map ── */}
      <div className="relative flex-1">
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
                  background={selected?.facility_id === f.facility_id ? '#1f1d1a' : pinFor(f.program_type)}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  scale={selected?.facility_id === f.facility_id ? 1.3 : 0.9}
                />
              </AdvancedMarker>
            ))}
          </GMap>
        </APIProvider>

        {/* ── Facility info panel ── */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="leading-snug text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{selected.facility_name}</p>
                <p className="mt-0.5 text-[12px] text-[var(--paper-muted)]" style={SANS}>{selected.city} · {TAB_LABELS[selected.program_type] ?? selected.program_type}</p>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-[var(--paper-faint)] transition-colors hover:text-[var(--paper-text)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" style={SANS}>
              <div className="rounded-lg bg-[var(--paper-2)] px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Capacity</p>
                <p className="mt-0.5 tabular-nums text-[1.1rem] font-semibold text-[var(--paper-accent)]">{selected.total_capacity}</p>
              </div>
              <div className="rounded-lg bg-[var(--paper-2)] px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Provider</p>
                <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--paper-text)]">{selected.provider_name ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-[var(--paper-2)] px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Status</p>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--paper-text)]">{selected.facility_status}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConsoleExplainerPanel
        open={panelOpen || wantList}
        onClose={() => { setPanelOpen(false); if (wantList) router.replace(`/console/${slug}`, { scroll: false }) }}
        county={county.county}
        facilities={mappable}
        initialView={wantList ? 'list' : 'explainer'}
        loading={loading}
      />
    </div>
  )
}
