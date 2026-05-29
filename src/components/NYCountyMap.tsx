'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { useRouter } from 'next/navigation'

const COUNTIES_URL = 'https://raw.githubusercontent.com/nyd-user-1/nyd-geojson/main/us-counties.geojson'
const NY_STATE_FIPS = '36'
const NY_BOUNDS     = { north: 45.01, south: 40.49, east: -71.77, west: -79.76 }

const MAP_STYLE = [
  { featureType: 'all',      elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'water',    elementType: 'geometry',         stylers: [{ color: '#e7eef0' }] },
  { featureType: 'landscape',elementType: 'geometry',         stylers: [{ color: '#f1ece2' }] },
  { featureType: 'road',     elementType: 'all',              stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',      elementType: 'all',              stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',  elementType: 'all',              stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country',  elementType: 'geometry.stroke', stylers: [{ color: '#d8d2c6' }, { visibility: 'on' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
]

// Warm teal scale — deep (high) → pale (low). Matches the paper accent.
const COLORS = ['#1e4d4a', '#2f6d6a', '#4f8d8a', '#83b3b0', '#bcd6d4', '#e3ecea']
const ACCENT = '#2f6d6a'

export type CountyMapRow = {
  county_fips_code: string
  county_name: string
  provider_count: number
  dcc_pct: number
  mcinfant: number | null
  mctoddler: number | null
  mcpreschool: number | null
  mhi: number | null
}

type Metric = 'providers' | 'mcinfant' | 'licenseTypeMix'

const METRIC_CONFIG: Record<Metric, {
  label: string
  description: string
  thresholds: number[]
  legend: string[]
  getValue: (r: CountyMapRow) => number
  format: (v: number) => string
}> = {
  providers: {
    label: 'County Coverage',
    description: 'Licensed providers by county · NYS 2024',
    thresholds: [800, 400, 200, 100, 50],
    legend: ['800+', '400–800', '200–400', '100–200', '50–100', '< 50'],
    getValue: r => r.provider_count,
    format: v => `${v.toLocaleString()} providers`,
  },
  mcinfant: {
    label: 'Infant Care Cost',
    description: 'Median weekly center-based infant care cost · 2022',
    thresholds: [310, 290, 275, 260, 248],
    legend: ['$310+/wk', '$290–310', '$275–290', '$260–275', '$248–260', '< $248'],
    getValue: r => r.mcinfant ?? 0,
    format: v => `$${Math.round(v)}/wk median infant cost`,
  },
  licenseTypeMix: {
    label: 'License Type Mix',
    description: 'Day Care Centers (DCC) as % of all providers · 2024',
    thresholds: [20, 15, 10, 7, 4],
    legend: ['20%+ DCC', '15–20%', '10–15%', '7–10%', '4–7%', '< 4%'],
    getValue: r => r.dcc_pct,
    format: v => `${v.toFixed(1)}% center-based (DCC)`,
  },
}

function metricColor(value: number, thresholds: number[]): string {
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return COLORS[i]
  }
  return COLORS[COLORS.length - 1]
}

function toCountySlug(countyName: string) {
  return countyName
    .replace(/ County$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.fitBounds(NY_BOUNDS, 40)
  }, [map])
  return null
}

function NYCountyLayer({
  data, metric, hoveredFips, onHover, onLeave, onClick,
}: {
  data: CountyMapRow[]
  metric: Metric
  hoveredFips: string | null
  onHover: (fips: string, row: CountyMapRow) => void
  onLeave: () => void
  onClick: (row: CountyMapRow) => void
}) {
  const map = useMap()
  const loadedRef  = useRef(false)
  const [ready, setReady] = useState(false)
  const layerRef   = useRef<google.maps.Data | null>(null)
  const lookupRef  = useRef<Record<string, CountyMapRow>>({})

  // Keep the latest callbacks/data in refs so the GeoJSON load effect can depend
  // only on [map]. Previously these were in the dep array — every parent re-render
  // (e.g. on hover) created new callback identities, ran the cleanup that did
  // layer.setMap(null), and the loadedRef guard blocked re-adding it, so the
  // choropleth vanished after the first interaction.
  const handlersRef = useRef({ onHover, onLeave, onClick })
  handlersRef.current = { onHover, onLeave, onClick }

  const lookup: Record<string, CountyMapRow> = {}
  for (const r of data) lookup[r.county_fips_code] = r
  lookupRef.current = lookup

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    const layer = new google.maps.Data()
    layerRef.current = layer

    fetch(COUNTIES_URL)
      .then(r => r.json())
      .then((geojson: { type: string; features: { properties: Record<string, string>; geometry: object; type: string }[] }) => {
        const ny = {
          type: 'FeatureCollection',
          features: geojson.features.filter(f => f.properties.STATEFP === NY_STATE_FIPS),
        }
        layer.addGeoJson(ny)
        layer.setMap(map)

        layer.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
          const fips = (e.feature.getProperty('STATEFP') as string) + (e.feature.getProperty('COUNTYFP') as string)
          const row  = lookupRef.current[fips]
          if (row) handlersRef.current.onHover(fips, row)
        })
        layer.addListener('mouseout',  () => handlersRef.current.onLeave())
        layer.addListener('click',     (e: google.maps.Data.MouseEvent) => {
          const fips = (e.feature.getProperty('STATEFP') as string) + (e.feature.getProperty('COUNTYFP') as string)
          const row  = lookupRef.current[fips]
          if (row) handlersRef.current.onClick(row)
        })

        setReady(true)
      })

    return () => { layer.setMap(null); loadedRef.current = false }
  }, [map])

  // Re-style whenever metric or hover changes — without reloading GeoJSON
  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !ready) return
    const config = METRIC_CONFIG[metric]

    layer.setStyle((feature: google.maps.Data.Feature) => {
      const fips      = (feature.getProperty('STATEFP') as string) + (feature.getProperty('COUNTYFP') as string)
      const row       = lookupRef.current[fips]
      const value     = row ? config.getValue(row) : 0
      const isHovered = fips === hoveredFips
      const dimmed    = hoveredFips !== null && !isHovered

      return {
        fillColor:    row ? metricColor(value, config.thresholds) : '#e5e1d8',
        fillOpacity:  dimmed ? 0.12 : (row ? 0.85 : 0.18),
        strokeColor:  isHovered ? '#1e4d4a' : '#f7f4ee',
        strokeWeight: isHovered ? 2.5 : 0.8,
        strokeOpacity: 1,
        clickable: true,
      }
    })
  }, [ready, metric, hoveredFips])

  return null
}

export default function NYCountyMap({ data }: { data: CountyMapRow[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const router = useRouter()

  const [metric,      setMetric]     = useState<Metric>('providers')
  const [hoveredFips, setHoveredFips] = useState<string | null>(null)
  const [hoveredRow,  setHoveredRow]  = useState<CountyMapRow | null>(null)
  const [mousePos,    setMousePos]    = useState<{ x: number; y: number } | null>(null)

  const config = METRIC_CONFIG[metric]

  return (
    <div
      className="relative flex-1 overflow-hidden"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseLeave={() => { setMousePos(null); setHoveredFips(null); setHoveredRow(null) }}
    >
      <APIProvider apiKey={apiKey}>
        <GMap
          defaultCenter={{ lat: 42.9, lng: -75.6 }}
          defaultZoom={6}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          styles={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <FitBounds />
          <NYCountyLayer
            data={data}
            metric={metric}
            hoveredFips={hoveredFips}
            onHover={(fips, row) => { setHoveredFips(fips); setHoveredRow(row) }}
            onLeave={() => { setHoveredFips(null); setHoveredRow(null) }}
            onClick={row => router.push(`/county/${toCountySlug(row.county_name)}`)}
          />
        </GMap>
      </APIProvider>

      {/* Metric selector — top left */}
      <div className="absolute top-4 left-4 z-10 flex gap-1.5 flex-wrap">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors shadow-sm whitespace-nowrap ${
              metric === m
                ? 'text-white'
                : 'bg-white/92 backdrop-blur-sm text-[#444] hover:bg-white'
            }`}
            style={metric === m ? { background: ACCENT } : undefined}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Description chip — top left below metric selector */}
      <div className="absolute top-14 left-4 z-10 pointer-events-none">
        <div className="bg-white/85 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <p className="text-[10px] text-[#666]">{config.description}</p>
        </div>
      </div>

      {/* Floating hover chip — follows cursor */}
      {hoveredRow && mousePos && (
        <div
          className="absolute pointer-events-none z-20"
          style={{ left: mousePos.x + 14, top: mousePos.y - 60 }}
        >
          <div className="bg-white/96 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
            <p className="text-sm font-bold text-[#1a1a1a] whitespace-nowrap">{hoveredRow.county_name}</p>
            <p className="text-[11px] text-[#666] mt-0.5">{config.format(config.getValue(hoveredRow))}</p>
          </div>
        </div>
      )}

      {/* Bottom center legend bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm flex items-center gap-4">
          {config.legend.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-5 rounded-sm shrink-0"
                style={{ background: COLORS[i], border: '1px solid rgba(0,0,0,0.08)' }}
              />
              <span className="text-[10px] text-[#555] whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
