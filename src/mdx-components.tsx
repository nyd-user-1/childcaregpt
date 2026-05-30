import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'
import { GlossaryLink } from '@/components/PanelGlossary'

// Paper-voice prose styling for every MDX post. Headings in Fraunces, body in
// a comfortable serif measure, teal links, warm rules — matches the glossary /
// data hub vocabulary. Editing here restyles all posts at once.

const SERIF = 'var(--font-display), Georgia, serif'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mt-12 mb-5 leading-[1.08] text-[var(--paper-text)]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 500, letterSpacing: '-0.02em' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-12 mb-4 scroll-mt-24 leading-tight text-[var(--paper-text)]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', fontWeight: 500, letterSpacing: '-0.01em' }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-9 mb-3 scroll-mt-24 leading-snug text-[var(--paper-text)]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.2rem, 2vw, 1.45rem)', fontWeight: 500 }}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="my-5 text-[17px] leading-[1.75] text-[var(--paper-text)]">{children}</p>
    ),
    a: ({ href, children }) => {
      const external = href?.startsWith('http')
      const cls = 'text-[var(--paper-accent)] underline decoration-[var(--paper-rule)] underline-offset-[3px] transition-colors hover:decoration-[var(--paper-accent)]'
      return external
        ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
        : <Link href={href ?? '#'} className={cls}>{children}</Link>
    },
    ul: ({ children }) => (
      <ul className="my-5 ml-5 flex list-disc flex-col gap-2.5 marker:text-[var(--paper-accent)]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-5 ml-5 flex list-decimal flex-col gap-2.5 marker:text-[var(--paper-faint)]">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="pl-1.5 text-[16.5px] leading-[1.7] text-[var(--paper-text)]">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-7 border-l-[3px] border-[var(--paper-accent)] pl-5 text-[var(--paper-muted)]" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '18px', lineHeight: 1.65 }}>
        {children}
      </blockquote>
    ),
    strong: ({ children }) => <strong className="font-semibold text-[var(--paper-text)]">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    hr: () => <hr className="my-10 border-0 border-t border-[var(--paper-rule)]" />,
    code: ({ children }) => (
      <code className="rounded-md bg-[var(--paper-2)] px-1.5 py-0.5 text-[14.5px] text-[var(--paper-accent)]" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
        {children}
      </code>
    ),
    table: ({ children }) => (
      <div className="my-7 overflow-x-auto rounded-xl border border-[var(--paper-rule)]">
        <table className="w-full text-[15px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)]">{children}</th>,
    td: ({ children }) => <td className="border-b border-[var(--paper-rule-soft)] px-4 py-2.5 text-[var(--paper-text)]">{children}</td>,
    Term: GlossaryLink,
    ...components,
  }
}
