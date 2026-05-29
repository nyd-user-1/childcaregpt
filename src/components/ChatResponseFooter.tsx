'use client'

import { useState } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react'
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
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const followUps = extractFollowUps(content).slice(0, 3)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const iconCls = 'flex h-7 w-7 items-center justify-center rounded-md text-[var(--paper-faint)] hover:text-[var(--paper-text)] hover:bg-black/5 transition-colors'

  return (
    <div className="mt-5 pt-4 border-t border-[var(--paper-rule-soft)]">
      {/* Action row: copy on the left, feedback on the right */}
      <div className="flex items-center">
        <button onClick={handleCopy} className={iconCls} title={copied ? 'Copied' : 'Copy'} aria-label="Copy answer">
          {copied ? <Check className="h-4 w-4" style={{ color: 'var(--paper-accent)' }} /> : <Copy className="h-4 w-4" />}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
          className={iconCls}
          title="Helpful"
          aria-label="Mark helpful"
          style={feedback === 'up' ? { color: 'var(--paper-accent)' } : undefined}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => setFeedback(f => f === 'down' ? null : 'down')}
          className={`${iconCls} ml-1`}
          title="Not helpful"
          aria-label="Mark not helpful"
          style={feedback === 'down' ? { color: '#b4452f' } : undefined}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>

      {followUps.length > 0 && onFollowUp && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)] mb-2.5" style={SANS}>
            Follow-ups
          </p>
          <ul className="flex flex-col gap-2">
            {followUps.map((q, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[3px] shrink-0 text-[15px] leading-none" style={{ color: 'var(--paper-accent)' }}>↳</span>
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
