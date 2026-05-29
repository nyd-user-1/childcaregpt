'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'

// ---------------------------------------------------------------------------
// Types — short keys keep the ~11k-row payload small
// ---------------------------------------------------------------------------
type DotRow = { c: string; n: string; la: number | string; lo: number | string; m: number; t: string }
type HitEntry = { x: number; y: number; r: number; dot: DotRow }

// ---------------------------------------------------------------------------
// Program types — NY OCFS regulated child care. Most common types (GFDC, SACC,
// DCC) get the strongest paper-voice colors. Avoids the officials-page red.
// ---------------------------------------------------------------------------
const TYPE_CFG: Record<string, { label: string; color: string }> = {
  GFDC: { label: 'Group Family Day Care', color: '#2f6d6a' },
  SACC: { label: 'School-Age Care',       color: '#c9a15e' },
  DCC:  { label: 'Day Care Center',       color: '#3f6184' },
  FDC:  { label: 'Family Day Care',       color: '#b5734e' },
  SDCC: { label: 'Small Day Care Center', color: '#8a6d9c' },
}
const ALL_TYPES = Object.keys(TYPE_CFG)

// Seats range ~0–1300, p90≈120. Tuned so small home programs are still visible
// and large centers stand out without swallowing the map.
function seatsToRadius(seats: number, zoom: number): number {
  if (seats <= 0) return 1.5
  const zf = Math.max(0.6, Math.min(1, (zoom - 4) / 6))
  return Math.max(1.5, Math.min(15, (2 + Math.sqrt(seats / 25) * 2) * zf))
}

// Paper-voice base map — matches DistrictMiniMap (warm water + paper-2 land).
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'all',       elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#d8d1c4' }, { visibility: 'on' }] },
  { featureType: 'water',     elementType: 'geometry',        stylers: [{ color: '#e7eef0' }] },
  { featureType: 'landscape', elementType: 'geometry',        stylers: [{ color: '#f1ece2' }] },
  { featureType: 'road',      elementType: 'all',             stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',       elementType: 'all',             stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',   elementType: 'all',             stylers: [{ visibility: 'off' }] },
]

// ---------------------------------------------------------------------------
// Canvas overlay — batched draws + viewport culling for ~11k dots
// ---------------------------------------------------------------------------
function CanvasLayer({ dots, visibleTypes }: { dots: DotRow[] | null; visibleTypes: Set<string> }) {
  const map = useMap()
  const dotsRef    = useRef<DotRow[]>([])
  const visibleRef = useRef<Set<string>>(new Set(ALL_TYPES))
  const redrawRef  = useRef<() => void>(() => {})
  const hitsRef    = useRef<HitEntry[]>([])

  dotsRef.current    = dots ?? []
  visibleRef.current = visibleTypes

  useEffect(() => {
    if (!map) return
    const m = map
    let canvas: HTMLCanvasElement | null = null

    function redraw() {
      if (!canvas) return
      const container = m.getDiv()
      const w = container.offsetWidth
      const h = container.offsetHeight
      const proj = overlay.getProjection()
      const bounds = m.getBounds()
      if (!bounds || !proj) return

      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const zoom = m.getZoom() ?? 7

      const origin = proj.fromLatLngToDivPixel(new google.maps.LatLng(ne.lat(), sw.lng()))!

      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.left = `${origin.x}px`
      canvas.style.top = `${origin.y}px`
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const currentDots = dotsRef.current
      const currentVisible = visibleRef.current

      const byType: Record<string, { x: number; y: number; r: number }[]> = {}
      const newHits: HitEntry[] = []

      for (const dot of currentDots) {
        if (!currentVisible.has(dot.t)) continue
        const la = Number(dot.la)
        const lo = Number(dot.lo)
        if (la < sw.lat() - 1 || la > ne.lat() + 1) continue
        if (lo < sw.lng() - 1 || lo > ne.lng() + 1) continue

        const px = proj.fromLatLngToDivPixel(new google.maps.LatLng(la, lo))
        if (!px) continue
        const x = px.x - origin.x
        const y = px.y - origin.y
        const r = seatsToRadius(Number(dot.m), zoom)

        if (x < -(r + 2) || x > w + r + 2 || y < -(r + 2) || y > h + r + 2) continue

        if (!byType[dot.t]) byType[dot.t] = []
        byType[dot.t].push({ x, y, r })
        newHits.push({ x, y, r, dot })
      }

      hitsRef.current = newHits

      ctx.globalAlpha = 0.75
      for (const [t, pts] of Object.entries(byType)) {
        ctx.fillStyle = TYPE_CFG[t]?.color ?? '#8a8278'
        ctx.beginPath()
        for (const { x, y, r } of pts) {
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        }
        ctx.fill()
      }

      ctx.globalAlpha = 0.55
      ctx.strokeStyle = '#f7f4ee'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      for (const { x, y, r } of newHits) {
        if (r < 4) continue
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    redrawRef.current = redraw

    const overlay = new (class extends google.maps.OverlayView {
      onAdd() {
        canvas = document.createElement('canvas')
        canvas.style.cssText = 'position:absolute;pointer-events:none'
        this.getPanes()!.overlayLayer.appendChild(canvas)
      }
      draw() { redraw() }
      onRemove() { canvas?.remove(); canvas = null }
    })()

    overlay.setMap(m)

    const iw = new google.maps.InfoWindow()
    const clickListener = m.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!canvas || !e.latLng) return
      const me = e.domEvent as MouseEvent
      const rect = canvas.getBoundingClientRect()
      const cx = me.clientX - rect.left
      const cy = me.clientY - rect.top
      let best: HitEntry | null = null
      let bestD2 = Infinity
      for (const hit of hitsRef.current) {
        const d2 = (cx - hit.x) ** 2 + (cy - hit.y) ** 2
        if (d2 <= (hit.r + 6) ** 2 && d2 < bestD2) { best = hit; bestD2 = d2 }
      }
      if (best) {
        const { dot } = best
        const seats = Number(dot.m)
        iw.setContent(
          `<div style="font-family:'DM Sans',system-ui,sans-serif;font-size:13px;padding:2px 0;min-width:160px">` +
          `<p style="margin:0 0 3px;font-weight:600;color:#1f1d1a">${dot.n}</p>` +
          `<p style="margin:0 0 6px;color:#6b6457;font-size:12px">${TYPE_CFG[dot.t]?.label ?? dot.t}${seats > 0 ? ' · ' + seats.toLocaleString() + ' seats' : ''}</p>` +
          `<a href="/facility/${dot.c}" style="color:#2f6d6a;font-size:12px;font-weight:600;text-decoration:none">View provider →</a>` +
          `</div>`,
        )
        iw.setPosition(e.latLng)
        iw.open(m)
      }
    })

    return () => {
      overlay.setMap(null)
      google.maps.event.removeListener(clickListener)
      iw.close()
      redrawRef.current = () => {}
    }
  }, [map])

  useEffect(() => { redrawRef.current() }, [dots, visibleTypes])

  return null
}

// ---------------------------------------------------------------------------
// Fits the map to the current dot set. Used when the map is scoped to a county /
// city / zip so the dots fill the frame instead of clustering in a corner at the
// statewide default center. No-op for 0 dots; a sensible zoom for a single dot.
// ---------------------------------------------------------------------------
function MapFitter({ dots, enabled }: { dots: DotRow[] | null; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !enabled || !dots || dots.length === 0) return
    if (dots.length === 1) {
      map.setCenter({ lat: Number(dots[0].la), lng: Number(dots[0].lo) })
      map.setZoom(12)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const d of dots) bounds.extend({ lat: Number(d.la), lng: Number(d.lo) })
    map.fitBounds(bounds, 48)
  }, [map, dots, enabled])
  return null
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
function Legend({ visibleTypes, onToggle, onToggleAll }: {
  visibleTypes: Set<string>
  onToggle: (t: string) => void
  onToggleAll: (show: boolean) => void
}) {
  const allOn = visibleTypes.size >= ALL_TYPES.length
  return (
    <div className="absolute bottom-12 left-4 z-10 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)]/95 p-4 text-xs shadow-lg backdrop-blur-sm max-w-[230px]">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-semibold text-[var(--paper-text)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Program type</p>
        <button onClick={() => onToggleAll(!allOn)} className="text-[10px] text-[var(--paper-accent)] hover:underline">
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-y-1.5">
        {ALL_TYPES.map(tk => (
          <button key={tk} onClick={() => onToggle(tk)}
            className={`flex items-center gap-1.5 text-left transition-opacity ${visibleTypes.has(tk) ? 'opacity-100' : 'opacity-30'}`}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TYPE_CFG[tk].color }} />
            <span className="leading-none text-[var(--paper-text)]">{TYPE_CFG[tk].label}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 font-semibold text-[var(--paper-text)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Capacity (seats)</p>
      <div className="flex items-end gap-5">
        {([['15', 4], ['75', 7], ['250+', 11]] as [string, number][]).map(([label, r]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="rounded-full" style={{ width: r * 2, height: r * 2, background: 'var(--paper-faint)' }} />
            <span className="text-[var(--paper-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main — reusable. Defaults to all-NY; pass apiUrl / center / zoom to scope it.
// ---------------------------------------------------------------------------
export default function ChildcareDotMap({
  apiUrl = '/api/facilities-dot-map',
  defaultCenter = { lat: 42.9, lng: -75.6 },
  defaultZoom = 7,
  countLabel = 'providers',
  fitToData = false,
}: {
  apiUrl?: string
  defaultCenter?: { lat: number; lng: number }
  defaultZoom?: number
  countLabel?: string
  fitToData?: boolean
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const [dots, setDots] = useState<DotRow[] | null>(null)
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  // Default the legend OPEN on desktop, CLOSED on mobile (it eats too much map).
  const [legendVisible, setLegendVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.matchMedia('(max-width: 639px)').matches
  })

  useEffect(() => {
    let cancelled = false
    setDots(null)
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => { if (!cancelled) setDots(d) })
      .catch(() => { if (!cancelled) setDots([]) })
    return () => { cancelled = true }
  }, [apiUrl])

  const toggleType = useCallback((tk: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev)
      if (next.has(tk)) next.delete(tk); else next.add(tk)
      return next
    })
  }, [])

  const toggleAll = useCallback((show: boolean) => {
    setVisibleTypes(show ? new Set(ALL_TYPES) : new Set())
  }, [])

  return (
    <div className="relative h-full w-full" style={{ background: 'var(--paper-2)' }}>
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          styles={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <CanvasLayer dots={dots} visibleTypes={visibleTypes} />
          <MapFitter dots={dots} enabled={fitToData} />
        </GoogleMap>
      </APIProvider>

      {!dots && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)]/90 px-5 py-3 text-sm text-[var(--paper-muted)] shadow">
            Loading <span className="animate-pulse font-semibold text-[var(--paper-accent)]">providers…</span>
          </div>
        </div>
      )}

      {legendVisible && (
        <Legend visibleTypes={visibleTypes} onToggle={toggleType} onToggleAll={toggleAll} />
      )}

      <button onClick={() => setLegendVisible(v => !v)}
        className="absolute bottom-4 left-4 z-10 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper)]/95 px-3 py-1.5 text-[11px] font-medium text-[var(--paper-text)] shadow transition-colors hover:bg-[var(--paper-2)]">
        {legendVisible ? 'Hide legend' : 'Legend'}
      </button>

      {dots && (
        <div className="absolute top-4 right-4 z-10 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper)]/90 px-3 py-1.5 text-[11px] tabular-nums text-[var(--paper-muted)] shadow">
          {dots.length.toLocaleString()} {countLabel}
        </div>
      )}
    </div>
  )
}
