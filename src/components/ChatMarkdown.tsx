'use client'

import Link from 'next/link'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// The "## Follow-ups" section is rendered separately by the footer, so strip it
// from the markdown body. extractFollowUps pulls the bullets back out for it.
const FOLLOWUP_RE = /\n#{1,6}\s*follow[\s-]?ups?\s*\n/i

export function stripFollowUps(md: string): string {
  const m = FOLLOWUP_RE.exec(md)
  return m ? md.slice(0, m.index).trimEnd() : md
}

export function extractFollowUps(md: string): string[] {
  const m = FOLLOWUP_RE.exec(md)
  if (!m) return []
  const tail = md.slice(m.index + m[0].length)
  return tail
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/\?+\s*$/, '').trim())
    .filter(Boolean)
}

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="mt-3 first:mt-0 text-[15.5px] leading-[1.7] text-[var(--paper-text)]" style={SANS}>{children}</p>
  ),
  h1: ({ children }) => (
    <h3 className="mt-6 mb-1 first:mt-0 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-6 mb-1 first:mt-0 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-1 first:mt-0 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>{children}</h3>
  ),
  strong: ({ children }) => <strong className="font-semibold text-[var(--paper-text)]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[var(--paper-muted)]">{children}</em>,
  ul: ({ children }) => <ul className="mt-3 flex flex-col gap-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 flex flex-col gap-1.5 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-2.5 text-[15px] leading-[1.6] text-[var(--paper-text)]" style={SANS}>
      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--paper-accent)' }} />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  ),
  a: ({ href, children }) => {
    const url = href ?? '#'
    const cls = 'font-medium hover:opacity-70 transition-opacity'
    const style = { color: 'var(--paper-accent)' }
    return url.startsWith('/')
      ? <Link href={url} className={cls} style={style}>{children}</Link>
      : <a href={url} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>
  },
  hr: () => <hr className="my-4 border-t border-[var(--paper-rule-soft)]" />,
  code: ({ children }) => (
    <code className="rounded px-1 py-0.5 text-[13px]" style={{ background: 'var(--paper-2)', fontFamily: 'ui-monospace, monospace' }}>{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 pl-3 italic text-[var(--paper-muted)]" style={{ borderColor: 'var(--paper-rule)', ...SERIF }}>{children}</blockquote>
  ),
}

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {stripFollowUps(text)}
      </ReactMarkdown>
    </div>
  )
}
