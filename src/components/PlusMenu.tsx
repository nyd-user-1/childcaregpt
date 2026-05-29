'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronRight, ArrowLeft, Lightbulb, MapPin } from 'lucide-react'

// Childcare sample questions — the real jobs a NY parent comes here to do.
const SAMPLE_QUESTIONS = [
  'How much does infant child care cost in my county?',
  'Find licensed day care centers near me',
  'Can I get help paying for child care in New York?',
  'What’s the difference between a day care center and family day care?',
  'Which counties have the most affordable child care?',
]

// NY counties (+ NYC boroughs) for a "find care in {county}" shortcut.
const NY_COUNTIES = [
  'Albany', 'Bronx', 'Brooklyn', 'Broome', 'Dutchess', 'Erie', 'Manhattan',
  'Monroe', 'Nassau', 'Niagara', 'Oneida', 'Onondaga', 'Orange', 'Putnam',
  'Queens', 'Rockland', 'Saratoga', 'Schenectady', 'Staten Island', 'Suffolk',
  'Ulster', 'Westchester',
]

type Panel = 'main' | 'questions' | 'counties'

interface PlusMenuProps {
  onSelect?: (text: string) => void
}

export function PlusMenu({ onSelect }: PlusMenuProps) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('main')
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function close() { setOpen(false); setPanel('main'); setSearch('') }
  function goBack() { setPanel('main'); setSearch('') }
  function drillTo(p: Panel) { setPanel(p); setSearch('') }

  const panelLabel = panel === 'questions' ? 'questions' : 'counties'
  const filteredQuestions = SAMPLE_QUESTIONS.filter(q => !search || q.toLowerCase().includes(search.toLowerCase()))
  const filteredCounties  = NY_COUNTIES.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={`relative ${open ? 'z-50' : ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => open ? close() : setOpen(true)}
        title="More"
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors text-[var(--muted)] hover:bg-black/7 hover:text-[var(--txt)]"
        style={open ? { color: 'var(--paper-accent)', background: 'var(--paper-accent-soft)' } : undefined}
      >
        {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      {/* Main panel */}
      {open && panel === 'main' && (
        <div className="absolute left-0 bottom-full mb-2 w-60 rounded-2xl border border-[var(--paper-rule)] bg-[var(--surface)] shadow-xl overflow-hidden z-50">
          {[
            { key: 'questions', label: 'Things to ask',     icon: <Lightbulb className="h-5 w-5" /> },
            { key: 'counties',  label: 'Find care by county', icon: <MapPin className="h-5 w-5" />   },
          ].map(({ key, label, icon }, i) => (
            <button
              key={key}
              onClick={() => drillTo(key as Panel)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-[var(--inp-bg)] transition-colors ${i > 0 ? 'border-t border-[var(--paper-rule)]' : ''}`}
            >
              <span className="text-[var(--paper-accent)]">{icon}</span>
              <span className="flex-1 text-left text-[var(--txt)]">{label}</span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </button>
          ))}
        </div>
      )}

      {/* Drill-down panel */}
      {open && panel !== 'main' && (
        <div className="absolute left-0 bottom-full mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--paper-rule)] bg-[var(--surface)] shadow-xl overflow-hidden z-50">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--paper-rule)]">
            <button onClick={goBack} className="text-[var(--muted)] hover:text-[var(--txt)] shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${panelLabel}…`}
              autoFocus
              className="flex-1 bg-transparent text-base text-[var(--txt)] outline-none placeholder:text-[var(--muted2)]"
            />
          </div>

          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {panel === 'questions' && filteredQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { onSelect?.(q); close() }}
                className={`flex w-full items-start px-4 py-3 hover:bg-[var(--inp-bg)] transition-colors ${i > 0 ? 'border-t border-[var(--paper-rule)]' : ''}`}
              >
                <span className="text-sm text-[var(--txt)] text-left">{q}</span>
              </button>
            ))}

            {panel === 'counties' && filteredCounties.map((c, i) => (
              <button
                key={c}
                onClick={() => { onSelect?.(`Find licensed child care in ${c} County`); close() }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--inp-bg)] transition-colors ${i > 0 ? 'border-t border-[var(--paper-rule)]' : ''}`}
              >
                <MapPin className="h-3.5 w-3.5 text-[var(--paper-accent)] shrink-0" />
                <span className="text-sm text-[var(--txt)] text-left">{c}</span>
              </button>
            ))}

            {panel === 'counties' && filteredCounties.length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--muted)]">No NY county matches “{search}”.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
