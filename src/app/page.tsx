'use client'

import { useState, useRef } from 'react'
import { Sun, PanelLeftOpen, PanelLeftClose, MapPin, Mic, ArrowUp } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { PlusMenu } from '@/components/PlusMenu'
import { CardCarousel } from '@/components/CardCarousel'

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }

  return (
    <div
      className="flex h-dvh overflow-hidden p-0 sm:p-[18px]"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-full sm:w-[240px] sm:mr-[18px]' : 'w-0'
        }`}
      >
        <div className="w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel="Chat" />
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--surface)] overflow-hidden">

        {/* Top bar */}
        <div className="px-5 pt-5 pb-3 flex items-center">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-blue-500 transition-colors hover:bg-blue-50"
          >
            {sidebarOpen
              ? <PanelLeftClose className="h-5 w-5 text-[var(--txt)]" />
              : <PanelLeftOpen  className="h-5 w-5 text-[var(--txt)]" />
            }
          </button>
        </div>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            <div className="w-full max-w-[636px] flex flex-col gap-6">

              {/* Logo */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Sun className="h-9 w-9 text-amber-400" style={{ fill: 'rgba(251,191,36,0.2)', stroke: 'rgb(251,191,36)' }} />
                  <h1 className="text-3xl font-bold text-[var(--txt)]">SolarGPT</h1>
                </div>
              </div>

              {/* Chat input container */}
              <div className="relative">
                <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] px-4 pt-3 pb-3 gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => { setInput(e.target.value); autoResize() }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) e.preventDefault()
                    }}
                    placeholder="Ask about solar potential..."
                    className="flex-1 w-full resize-none bg-transparent py-1 text-[17px] text-[var(--txt)] placeholder:text-[var(--muted2)] outline-none leading-relaxed"
                    style={{ minHeight: '40px' }}
                  />

                  {/* Bottom toolbar */}
                  <div className="flex items-center pt-1">
                    <PlusMenu onSelect={t => { setInput(t); textareaRef.current?.focus() }} />

                    <button
                      type="button"
                      className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/7 hover:text-[var(--txt)] transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/7 hover:text-[var(--txt)] transition-colors"
                    >
                      <Mic className="h-4 w-4" />
                    </button>

                    <div className="flex-1" />

                    <button
                      type="button"
                      disabled={!input.trim()}
                      className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a1a1a] text-white disabled:opacity-25 hover:opacity-80 transition-opacity"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Attribution */}
                <p className="text-center text-[10px] text-[var(--muted2)] mt-2">
                  AI-powered solar intelligence · Data from Google Sunroof &amp; NREL Cambium · Design &amp; Development by NYSgpt
                </p>
              </div>

              {/* Explore carousel */}
              <CardCarousel />

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
