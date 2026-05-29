'use client'

import Link from 'next/link'
import { Fragment } from 'react'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Inline markdown: **bold**, [text](href). No external deps.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Split on links and bold, processing in one pass.
  const pattern = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, m.index)}</Fragment>)
    const token = m[0]
    if (token.startsWith('[')) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
      if (lm) {
        const [, label, href] = lm
        const internal = href.startsWith('/')
        nodes.push(
          internal
            ? <Link key={`${keyBase}-l${i++}`} href={href} className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: 'var(--paper-accent)' }}>{label}</Link>
            : <a key={`${keyBase}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: 'var(--paper-accent)' }}>{label}</a>
        )
      }
    } else {
      nodes.push(<strong key={`${keyBase}-b${i++}`} className="font-semibold text-[var(--paper-text)]">{token.slice(2, -2)}</strong>)
    }
    last = m.index + token.length
  }
  if (last < text.length) nodes.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last)}</Fragment>)
  return nodes
}

// Block-level renderer: ## headers, - bullets, blank-line paragraphs, *italic notes*.
export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let para: string[] = []
  let list: string[] = []
  let k = 0

  const flushPara = () => {
    if (!para.length) return
    const joined = para.join(' ').trim()
    if (joined) {
      // Whole-line italic note: *text*
      if (/^\*[^*].*\*$/.test(joined) && !joined.includes('**')) {
        blocks.push(<p key={`p${k++}`} className="mt-3 text-[13px] italic text-[var(--paper-faint)]" style={SERIF}>{joined.slice(1, -1)}</p>)
      } else {
        blocks.push(<p key={`p${k++}`} className="mt-3 first:mt-0 text-[15.5px] leading-[1.7] text-[var(--paper-text)]" style={SANS}>{renderInline(joined, `p${k}`)}</p>)
      }
    }
    para = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push(
      <ul key={`u${k++}`} className="mt-3 flex flex-col gap-1.5">
        {list.map((li, idx) => (
          <li key={idx} className="flex gap-2.5 text-[15px] leading-[1.6] text-[var(--paper-text)]" style={SANS}>
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--paper-accent)' }} />
            <span>{renderInline(li, `u${k}-${idx}`)}</span>
          </li>
        ))}
      </ul>
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^##+\s/.test(line)) {
      flushPara(); flushList()
      blocks.push(
        <h3 key={`h${k++}`} className="mt-6 mb-1 first:mt-0 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
          {line.replace(/^##+\s/, '')}
        </h3>
      )
    } else if (/^[-*]\s/.test(line)) {
      flushPara()
      list.push(line.replace(/^[-*]\s/, ''))
    } else if (line.trim() === '') {
      flushPara(); flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara(); flushList()

  return <div>{blocks}</div>
}
