'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { geojsonUrl } from '@/lib/blob-geojson'

const NY_BOUNDS = { north: 45.01, south: 40.49, east: -71.77, west: -79.76 }

const MAP_STYLE = [
  { featureType: 'all',      elementType: 'labels',   stylers: [{ visibility: 'off' }] },
  { featureType: 'water',    elementType: 'geometry', stylers: [{ color: '#e7eef0' }] },
  { featureType: 'landscape',elementType: 'geometry', stylers: [{ color: '#f1ece2' }] },
  { featureType: 'road',     elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',      elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',  elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
]

// Warm teal scale — deep (high) → pale (low).
const COLORS = ['#1e4d4a', '#2f6d6a', '#4f8d8a', '#83b3b0', '#bcd6d4', '#e3ecea']

export type DistrictRow = {
  district: number
  name: string | null
  party: string | null
  provider_count: number
}

function metricColor(value: number, thresholds: number[]): string {
  for (let i = 0; i < thresholds.length; i++) if (value >= thresholds[i]) return COLORS[i]
  return COLORS[COLORS.length - 1]
}

function FitBounds() {
  const map = useMap()
  useEffect(() => { if (map) map.fitBounds(NY_BOUNDS, 40) }, [map])
  return null
}

function DistrictLayer({
  geojsonKey, districtProp, lookup, thresholds, hovered, onHover, onLeave, onSelect,
}: {
  geojsonKey: string
  districtProp: string
  lookup: Record<number, DistrictRow>
  thresholds: number[]
  hovered: number | null
  onHover: (d: number) => void
  onLeave: () => void
  onSelect: (d: number) => void
}) {
  const map = useMap()
  const loadedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const layerRef = useRef<google.maps.Data | null>(null)

  // Keep mutable inputs in refs so the load effect depends only on [map] —
  // otherwise re-renders on hover would tear down and never rebuild the layer.
  const refs = useRef({ lookup, onHover, onLeave, onSelect, districtProp })
  refs.current = { lookup, onHover, onLeave, onSelect, districtProp }

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    const layer = new google.maps.Data()
    layerRef.current = layer

    fetch(geojsonUrl(geojsonKey))
      .then(r => r.json())
      .then((geojson: object) => {
        layer.addGeoJson(geojson)
        layer.setMap(map)
        layer.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
          const d = Number(e.feature.getProperty(refs.current.districtProp))
          if (refs.current.lookup[d]) refs.current.onHover(d)
        })
        layer.addListener('mouseout', () => refs.current.onLeave())
        layer.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const d = Number(e.feature.getProperty(refs.current.districtProp))
          if (refs.current.lookup[d]) refs.current.onSelect(d)
        })
        setReady(true)
      })

    return () => { layer.setMap(null); loadedRef.current = false }
  }, [map, geojsonKey])

  // Re-style on metric/hover change without reloading geometry.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !ready) return
    layer.setStyle((feature: google.maps.Data.Feature) => {
      const d = Number(feature.getProperty(refs.current.districtProp))
      const row = refs.current.lookup[d]
      const value = row ? row.provider_count : 0
      const isHovered = d === hovered
      const dimmed = hovered !== null && !isHovered
      return {
        fillColor:    row ? metricColor(value, thresholds) : '#e5e1d8',
        fillOpacity:  dimmed ? 0.12 : (row ? 0.85 : 0.18),
        strokeColor:  isHovered ? '#1e4d4a' : '#f7f4ee',
        strokeWeight: isHovered ? 2.5 : 0.6,
        strokeOpacity: 1,
        clickable: true,
      }
    })
  }, [ready, hovered, thresholds])

  return null
}

export default function DistrictChoropleth({
  chamber, districtProp, data, legend, thresholds,
}: {
  chamber: 'senate' | 'assembly'
  districtProp: string
  data: DistrictRow[]
  legend: string[]
  thresholds: number[]
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const lookup: Record<number, DistrictRow> = {}
  for (const r of data) lookup[r.district] = r
  const hoveredRow = hovered != null ? lookup[hovered] : null

  const chamberLabel = chamber === 'senate' ? 'Senate' : 'Assembly'

  return (
    <div
      className="relative flex-1 overflow-hidden"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseLeave={() => { setMousePos(null); setHovered(null) }}
      style={{ background: 'var(--paper)' }}
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
          <DistrictLayer
            geojsonKey={chamber}
            districtProp={districtProp}
            lookup={lookup}
            thresholds={thresholds}
            hovered={hovered}
            onHover={setHovered}
            onLeave={() => setHovered(null)}
            onSelect={d => router.push(`/district/${chamber}/${d}`)}
          />
        </GMap>
      </APIProvider>

      {/* Title chip */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[var(--paper)]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-[var(--paper-rule)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--paper-faint)]">NY State {chamberLabel} Districts</p>
          <p className="text-[12px] text-[var(--paper-muted)]">Licensed providers per district · tap a district for your rep</p>
        </div>
      </div>

      {/* Hover chip — follows cursor */}
      {hoveredRow && mousePos && (
        <div className="absolute pointer-events-none z-20" style={{ left: mousePos.x + 14, top: mousePos.y - 64 }}>
          <div className="bg-[var(--paper)]/97 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 border border-[var(--paper-rule)]">
            <p className="text-sm font-bold text-[var(--paper-text)] whitespace-nowrap">{chamberLabel} District {hoveredRow.district}</p>
            {hoveredRow.name && (
              <p className="text-[11px] text-[var(--paper-muted)] mt-0.5 whitespace-nowrap">
                {hoveredRow.name}{hoveredRow.party ? ` · ${hoveredRow.party[0]}` : ''}
              </p>
            )}
            <p className="text-[11px] font-medium mt-0.5" style={{ color: '#2f6d6a' }}>{hoveredRow.provider_count.toLocaleString()} providers</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div className="bg-[var(--paper)]/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-[var(--paper-rule)] flex items-center gap-4">
          {legend.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-5 rounded-sm shrink-0" style={{ background: COLORS[i], border: '1px solid rgba(0,0,0,0.08)' }} />
              <span className="text-[10px] text-[var(--paper-muted)] whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
