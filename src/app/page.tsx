'use client'

import { useState, useRef } from 'react'
import { MapPin, Mic, ArrowUp, Blocks } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PlusMenu } from '@/components/PlusMenu'
import { CardCarouselPortrait } from '@/components/CardCarouselPortrait'

export default function HomePage() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Ported exactly from SolarGPT NewChatClient — synchronous, called before re-render
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

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
          <div className="w-full max-w-[636px] flex flex-col gap-6">

            {/* Logo */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <Blocks className="h-9 w-9" style={{ stroke: '#38bdf8', fill: 'rgba(56,189,248,0.15)' }} />
                <h1 className="text-3xl font-bold text-[var(--txt)]">ChildcareGPT</h1>
              </div>
            </div>

            {/* Chat input container — structure ported from SolarGPT */}
            <div className="relative">
              <div className={`flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] px-4 pt-3 pb-3 transition-all gap-1 ${isFocused ? 'shadow-[0_8px_24px_rgba(0,0,0,0.08)]' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}>

                {/* Textarea wrapped in flex items-start — exact SolarGPT pattern */}
                <div className="flex items-start">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault() }}
                    placeholder="Ask about childcare..."
                    className="flex-1 resize-none bg-transparent py-1 text-[17px] text-[var(--txt)] placeholder:text-[var(--muted2)] outline-none leading-relaxed"
                    style={{ minHeight: '40px' }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                </div>

                <div className="flex items-center pt-1">
                  <PlusMenu onSelect={t => { handleInputChange(t); textareaRef.current?.focus() }} />
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
              <p className="text-center text-[10px] text-[var(--muted2)] mt-2">
                AI-powered childcare intelligence · Design &amp; Development by NYSgpt
              </p>
            </div>

            {/* Explore carousel */}
            <CardCarousel />

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
