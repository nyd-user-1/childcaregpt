'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { ChatInput } from '@/components/ChatInput'
import { ChatMessage } from '@/components/ChatMessage'
import { useChat } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

type SelectedAddress = { description: string; lat: number; lng: number }

// Real New York starter prompts — the jobs a parent comes here to do.
const STARTERS: { label: string; prompt: string }[] = [
  { label: 'Find care near me',            prompt: 'What licensed child care is near me?' },
  { label: 'How much does care cost?',     prompt: 'How much does infant child care cost in Suffolk County?' },
  { label: 'Can I get help paying?',       prompt: 'Can I get help paying for child care in New York?' },
  { label: 'Help me apply for assistance', prompt: 'Help me apply for child care assistance (CCAP). Walk me through what the OCFS-6025 application needs and help me get it started.' },
  { label: 'What do the program types mean?', prompt: 'What are the different types of child care programs in New York?' },
]

function HomeInner() {
  const { messages, isStreaming, sendMessage } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [address, setAddress] = useState<SelectedAddress | null>(null)
  const hasMessages = messages.length > 0
  const searchParams = useSearchParams()
  const autoSentRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const [prefill, setPrefill] = useState('')

  // Single send path. The selected address rides along as structured location
  // (lat/lng) so the server ranks providers by real distance — never stuffed
  // into the visible message.
  function handleSend(message: string, addr: SelectedAddress | null = address) {
    sendMessage(message, addr ?? null)
  }

  // Deep-link: /?q=... auto-sends once (e.g. "Ask about Suffolk County" from a
  // detail page lands the parent straight in a relevant conversation).
  useEffect(() => {
    if (autoSentRef.current) return
    const q = searchParams.get('q')
    if (q && q.trim()) {
      autoSentRef.current = true
      sendMessage(q.trim(), null)
    }
  }, [searchParams, sendMessage])

  // ── Conversation phase ─────────────────────────────────────────────
  if (hasMessages) {
    return (
      <AppLayout>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
            <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-8 pb-4 flex flex-col gap-7">
              {messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && i === messages.length - 1}
                  onFollowUp={q => handleSend(q)}
                />
              ))}
            </div>
          </div>
          <div className="relative shrink-0 px-5 sm:px-8 py-4" style={{ background: 'var(--paper)' }}>
            {/* Blur-fade mask: softens text scrolling up behind the input,
                replacing the old 1px rule. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-full h-10 backdrop-blur-[2px]"
              style={{ WebkitMaskImage: 'linear-gradient(to top, black, transparent)', maskImage: 'linear-gradient(to top, black, transparent)' }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 -translate-y-full h-8"
              style={{ background: 'linear-gradient(to top, var(--paper), transparent)' }}
            />
            <div className="mx-auto max-w-3xl" style={{ background: 'var(--paper)' }}>
              <ChatInput onSend={handleSend} address={address} onAddressChange={setAddress} value={prefill} onValueChange={setPrefill} />
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 sm:px-10 py-12">

          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · Chat
          </p>
          <h1
            className="paper-rise mt-4 leading-[1.05]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Let’s find care you
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>can actually afford.</span>
          </h1>
          <p className="paper-rise mt-5 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.2rem)', lineHeight: 1.6 }}>
            Ask a question or enter your address. Real New York providers, real
            costs, plain answers — no account, nothing saved.
          </p>

          <div className="paper-rise mt-8" style={{ animationDelay: '180ms' }}>
            <ChatInput onSend={handleSend} address={address} onAddressChange={setAddress} />
          </div>

          {/* Real starter prompts */}
          <div className="paper-rise mt-6 flex flex-wrap gap-2" style={{ animationDelay: '240ms' }}>
            {STARTERS.map(s => (
              <button
                key={s.label}
                onClick={() => handleSend(s.prompt)}
                className="rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] px-3.5 py-1.5 text-[13px] text-[var(--paper-muted)] hover:border-[var(--paper-accent)] hover:text-[var(--paper-text)] transition-colors"
                style={SANS}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className="paper-rise mt-8 text-[10px] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '300ms' }}>
            Childcare data from NY OCFS · costs from the U.S. Department of Labor
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  )
}
