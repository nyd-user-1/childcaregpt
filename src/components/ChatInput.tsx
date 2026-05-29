'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Mic, ArrowUp, X } from 'lucide-react'
import { PlusMenu } from '@/components/PlusMenu'
import { ACCENT_COLOR } from '@/lib/app-config'

type PlaceSuggestion = { place_id: string; description: string }
type SelectedAddress = { description: string; lat: number; lng: number }

export function ChatInput({ onSend }: { onSend?: (message: string, address?: SelectedAddress | null) => void } = {}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Geo-mode (address lookup) — ported from SolarGPT NewChatClient
  const [addressMode, setAddressMode] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Geolocation for address bias (best-effort, non-blocking)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { timeout: 5000 },
      )
    }
  }, [])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    autoResize()
  }

  const fetchSuggestions = useCallback((value: string, loc?: { lat: number; lng: number } | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        let url = `/api/places?input=${encodeURIComponent(value)}`
        if (loc) url += `&lat=${loc.lat}&lng=${loc.lng}`
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data)) setSuggestions(data)
      } catch { /* silent */ }
    }, 150)
  }, [])

  const enterAddressMode = () => {
    setAddressMode(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const exitAddressMode = () => {
    setAddressMode(false)
    setAddressInput('')
    setSuggestions([])
  }

  const selectAddress = useCallback(async (s: PlaceSuggestion) => {
    try {
      const geoRes = await fetch(`/api/places/geocode?place_id=${s.place_id}`)
      const geo = await geoRes.json()
      if (!geo.lat || !geo.lng) throw new Error('Geocode failed')
      setSelectedAddress({ description: s.description, lat: geo.lat, lng: geo.lng })
    } catch {
      setSelectedAddress({ description: s.description, lat: 0, lng: 0 })
    }
    exitAddressMode()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const clearAddress = () => setSelectedAddress(null)

  const submit = () => {
    const msg = input.trim()
    if (!msg || !onSend) return
    onSend(msg, selectedAddress)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const accentActive = addressMode || !!selectedAddress

  return (
    <div className="relative">

      {/* Address suggestions dropdown (address mode) */}
      {addressMode && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden z-20 max-h-[320px] overflow-y-auto">
          {suggestions.map(s => (
            <button key={s.place_id} onClick={() => selectAddress(s)}
              className="flex w-full items-start gap-3 px-4 py-3 text-sm text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors text-left border-b border-[var(--border)] last:border-0">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: ACCENT_COLOR }} />
              <span>{s.description}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="flex flex-col rounded-2xl border bg-[var(--inp-bg)] px-4 pt-3 pb-3 transition-all gap-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ borderColor: addressMode ? ACCENT_COLOR : 'var(--border)' }}
      >

        {/* Selected address chip */}
        {selectedAddress && (
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-[var(--border)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT_COLOR }} />
            <span className="text-xs truncate flex-1 font-medium" style={{ color: ACCENT_COLOR }}>{selectedAddress.description}</span>
            <button onClick={clearAddress} className="text-[var(--muted)] hover:text-[var(--txt)] transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ChatTextArea */}
        <div className="flex items-start">
          <textarea
            ref={textareaRef}
            rows={1}
            value={addressMode ? addressInput : input}
            onChange={e => {
              if (addressMode) {
                setAddressInput(e.target.value)
                fetchSuggestions(e.target.value, userLocation)
              } else {
                handleInputChange(e.target.value)
              }
            }}
            onKeyDown={e => {
              if (addressMode) {
                if (e.key === 'Escape') { e.preventDefault(); exitAddressMode() }
                if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); selectAddress(suggestions[0]) }
              } else {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
              }
            }}
            placeholder={addressMode ? 'Enter an address…' : selectedAddress ? 'Ask about this area…' : 'Ask about childcare...'}
            className="flex-1 resize-none bg-transparent py-1 text-[17px] text-[var(--txt)] placeholder:text-[var(--muted2)] outline-none leading-relaxed"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* ChatToolBar */}
        <div className="flex items-center pt-1">
          {/* IconPlus */}
          <PlusMenu onSelect={t => { handleInputChange(t); textareaRef.current?.focus() }} />
          {/* IconMapPin — geo-mode toggle */}
          <button
            type="button"
            onClick={() => addressMode ? exitAddressMode() : enterAddressMode()}
            title={addressMode ? 'Exit address mode' : 'Look up an address'}
            className={`ml-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              accentActive ? '' : 'text-[var(--muted)] hover:bg-black/7 hover:text-[var(--txt)]'
            }`}
            style={accentActive ? { color: ACCENT_COLOR, background: `${ACCENT_COLOR}1a` } : undefined}
          >
            <MapPin className="h-4 w-4" />
          </button>
          {/* IconMic */}
          <button type="button" className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/7 hover:text-[var(--txt)] transition-colors">
            <Mic className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          {/* ButtonSendChat */}
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim()}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a1a1a] text-white disabled:opacity-25 hover:opacity-80 transition-opacity"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
