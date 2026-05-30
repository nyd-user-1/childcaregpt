'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { AppPanel } from './AppPanel'
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  type GlossaryTerm,
  type GlossaryCategory,
} from '@/lib/glossary-terms'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }

type GlossaryPanelContext = {
  open: (termId?: string) => void
  close: () => void
}

const Ctx = createContext<GlossaryPanelContext | null>(null)

export function useGlossaryPanel(): GlossaryPanelContext {
  const v = useContext(Ctx)
  if (!v) return { open: () => {}, close: () => {} }
  return v
}

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [termId, setTermId] = useState<string | null>(null)

  const value = useMemo<GlossaryPanelContext>(
    () => ({
      open: (id?: string) => {
        setTermId(id ?? null)
        setOpen(true)
      },
      close: () => setOpen(false),
    }),
    [],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <PanelGlossary
        open={open}
        termId={termId}
        onSelect={setTermId}
        onClose={() => setOpen(false)}
      />
    </Ctx.Provider>
  )
}

function PanelGlossary({
  open,
  termId,
  onSelect,
  onClose,
}: {
  open: boolean
  termId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}) {
  const term = termId ? GLOSSARY_TERMS.find(t => t.id === termId) ?? null : null
  const title = term ? term.name : 'Glossary'

  const footer = (
    <div className="px-5 py-3">
      <Link
        href="/glossary"
        onClick={onClose}
        className="text-[12px] uppercase tracking-[0.18em] text-[var(--paper-accent)] hover:opacity-80"
      >
        Glossary panel →
      </Link>
    </div>
  )

  return (
    <AppPanel open={open} onClose={onClose} title={title} footer={footer}>
      {term ? (
        <TermDetail term={term} onBack={() => onSelect(null)} />
      ) : (
        <AllTerms onPick={onSelect} />
      )}
    </AppPanel>
  )
}

function AllTerms({ onPick }: { onPick: (id: string) => void }) {
  const byCategory = useMemo(() => {
    const map = new Map<GlossaryCategory, GlossaryTerm[]>()
    for (const t of GLOSSARY_TERMS) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return map
  }, [])

  return (
    <div className="px-5 py-5">
      <div className="mb-5 flex items-start gap-2.5">
        <BookOpen className="h-4 w-4 mt-[3px] shrink-0 text-[var(--paper-accent)]" />
        <p className="text-[13.5px] leading-[1.6] text-[var(--paper-muted)]">
          Plain-English definitions for every term ChildcareGPT uses. Tap one for the full explainer.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {GLOSSARY_CATEGORIES.map(({ name }) => {
          const list = byCategory.get(name)
          if (!list?.length) return null
          return (
            <section key={name}>
              <h3 className="mb-2.5 text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]">
                {name}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {list.map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => onPick(t.id)}
                      className="w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-[var(--paper-2)]"
                    >
                      <span className="text-[14.5px] font-medium text-[var(--paper-text)]">
                        {t.name}
                      </span>
                      {t.abbr && (
                        <span className="ml-1.5 text-[12px] text-[var(--paper-faint)]">
                          ({t.abbr})
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function TermDetail({ term, onBack }: { term: GlossaryTerm; onBack: () => void }) {
  return (
    <div className="px-5 py-5">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)] hover:text-[var(--paper-accent)]"
      >
        <ArrowLeft className="h-3 w-3" />
        All terms
      </button>

      <div className="mb-4 text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]">
        {term.category}
      </div>

      <h2
        style={SERIF}
        className="text-[24px] italic leading-[1.15] text-[var(--paper-accent)]"
      >
        {term.name}
        {term.abbr && (
          <span className="ml-2 text-[14px] not-italic tracking-[0.06em] text-[var(--paper-faint)]">
            {term.abbr}
          </span>
        )}
      </h2>

      <p className="mt-5 text-[15.5px] leading-[1.7] text-[var(--paper-text)]">
        {term.plain}
      </p>

      {term.body && (
        <>
          <h4 className="mt-5 mb-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]">
            More detail
          </h4>
          <p className="text-[14px] leading-[1.65] text-[var(--paper-muted)]">{term.body}</p>
        </>
      )}

      {term.whereSeen && (
        <>
          <h4 className="mt-5 mb-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]">
            Where you'll see it
          </h4>
          <p className="text-[14px] leading-[1.65] text-[var(--paper-muted)]">{term.whereSeen}</p>
        </>
      )}

      {term.link && (
        <a
          href={term.link.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block text-[12px] uppercase tracking-[0.18em] text-[var(--paper-accent)] hover:opacity-80"
        >
          {term.link.label} →
        </a>
      )}
    </div>
  )
}

export function GlossaryLink({ id, children }: { id: string; children: React.ReactNode }) {
  const { open } = useGlossaryPanel()
  return (
    <button
      type="button"
      onClick={() => open(id)}
      className="cursor-pointer underline decoration-[var(--paper-rule)] decoration-1 underline-offset-[3px] font-semibold text-[var(--paper-accent)] transition-colors hover:decoration-[var(--paper-accent)]"
    >
      {children}
    </button>
  )
}
