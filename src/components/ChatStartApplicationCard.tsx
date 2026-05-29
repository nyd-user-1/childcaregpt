'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, ClipboardCheck } from 'lucide-react'
import type { EligDraft } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Human label for each draft field, in the order a parent reads them. Only
// fields the model actually captured are shown.
const FIELD_LABELS: { key: keyof EligDraft; label: string }[] = [
  { key: 'firstName',     label: 'Name' },          // paired with lastName below
  { key: 'address',       label: 'Address' },
  { key: 'county',        label: 'County' },
  { key: 'dateOfBirth',   label: 'Date of birth' },
  { key: 'maritalStatus', label: 'Marital status' },
  { key: 'householdSize', label: 'Household size' },
  { key: 'monthlyIncome', label: 'Monthly income' },
  { key: 'phone',         label: 'Phone' },
]

function summarize(draft: EligDraft): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  for (const { key, label } of FIELD_LABELS) {
    if (key === 'firstName') {
      const name = [draft.firstName, draft.lastName].filter(Boolean).join(' ').trim()
      if (name) out.push({ label: 'Name', value: name })
      continue
    }
    const v = draft[key]
    if (typeof v === 'string' && v.trim()) {
      const value = key === 'monthlyIncome' ? `$${Number(v).toLocaleString()}/mo` : v
      out.push({ label, value })
    }
  }
  return out
}

export function ChatStartApplicationCard({ draft }: { draft: EligDraft }) {
  const router = useRouter()
  const items = summarize(draft)
  if (!items.length) return null

  function start() {
    try {
      // /application reads this exact key on mount and pre-fills its form.
      localStorage.setItem('ccap-eligibility-data', JSON.stringify(draft))
    } catch { /* private mode — the form just opens blank, no harm */ }
    router.push('/application')
  }

  return (
    <div className="mt-5 rounded-xl border border-[var(--paper-accent)] bg-[var(--paper-accent-soft)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--paper-accent)' }}>
          <ClipboardCheck className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[16px] leading-tight text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>
            Start your application with this ready
          </h4>
          <p className="mt-1 text-[13px] text-[var(--paper-muted)]" style={SANS}>
            We can carry what you’ve shared into the official New York child care
            assistance form so you don’t retype it.
          </p>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2" style={SANS}>
            {items.map(it => (
              <div key={it.label} className="flex items-baseline justify-between gap-2 border-b border-[var(--paper-rule-soft)] pb-1.5">
                <dt className="text-[11px] uppercase tracking-wide text-[var(--paper-faint)]">{it.label}</dt>
                <dd className="truncate text-right text-[13px] font-medium text-[var(--paper-text)]">{it.value}</dd>
              </div>
            ))}
          </dl>

          <button
            onClick={start}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ ...SANS, background: 'var(--paper-accent)' }}
          >
            Start the application
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-2 text-[11px] text-[var(--paper-faint)]" style={SANS}>
            You can edit anything before submitting. Eligibility is decided by the official screening, not here.
          </p>
        </div>
      </div>
    </div>
  )
}
