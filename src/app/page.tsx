'use client'

import { useEffect, useRef, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { ChatInput } from '@/components/ChatInput'
import { ChatMessage } from '@/components/ChatMessage'
import { useChat } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

type SelectedAddress = { description: string; lat: number; lng: number }

// Real New York starter prompts — the three jobs a parent comes here to do.
const STARTERS: { label: string; prompt: string }[] = [
  { label: 'Find care near me',            prompt: 'What licensed child care is near me?' },
  { label: 'How much does care cost?',     prompt: 'How much does infant child care cost in Suffolk County?' },
  { label: 'Can I get help paying?',       prompt: 'Can I get help paying for child care in New York?' },
  { label: 'What do the program types mean?', prompt: 'What are the different types of child care programs in New York?' },
]

export default function HomePage() {
  const { messages, isStreaming, sendMessage } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [address, setAddress] = useState<SelectedAddress | null>(null)
  const hasMessages = messages.length > 0

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const [prefill, setPrefill] = useState('')

  // Single send path. The visible bubble shows the clean message; the address
  // rides along as hidden apiContent so geo context is never dropped from the
  // model's view but never clutters the chat.
  function handleSend(message: string, addr: SelectedAddress | null = address) {
    const api = addr ? `${message}\n\n[My address: ${addr.description}]` : undefined
    sendMessage(message, api)
  }

  // ── Conversation phase ─────────────────────────────────────────────
  if (hasMessages) {
    return (
      <AppLayout>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
            <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 flex flex-col gap-7">
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
          <div className="shrink-0 border-t border-[var(--paper-rule)] px-5 sm:px-8 py-4" style={{ background: 'var(--paper)' }}>
            <div className="mx-auto max-w-3xl">
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
            ChildcareGPT · New York State
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
