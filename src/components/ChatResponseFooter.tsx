'use client'

import { useState } from 'react'
import { extractFollowUps } from '@/components/ChatMarkdown'

const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Thin rule separating the message body from footer elements (copy + follow-ups),
// mirroring the SportsGPT/SolarGPT chat-response footer.
export function ChatResponseFooter({
  content,
  onFollowUp,
}: {
  content: string
  onFollowUp?: (q: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const followUps = extractFollowUps(content)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const linkCls = 'text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)] hover:text-[var(--paper-muted)] transition-colors'

  return (
    <div className="mt-5 pt-4 border-t border-[var(--paper-rule-soft)]">
      <button onClick={handleCopy} className={linkCls} style={SANS}>
        {copied ? 'Copied ✓' : 'Copy'}
      </button>

      {followUps.length > 0 && onFollowUp && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)] mb-2.5" style={SANS}>
            Follow-ups
          </p>
          <ul className="flex flex-col gap-2">
            {followUps.map((q, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--paper-accent)' }} />
                <button
                  onClick={() => onFollowUp(q)}
                  className="text-left text-[15px] font-medium leading-[1.5] hover:opacity-70 transition-opacity"
                  style={{ ...SANS, color: 'var(--paper-accent)' }}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
