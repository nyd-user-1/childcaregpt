'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, MapPin, CheckCircle, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { BottleBaby } from '@/components/BottleBaby'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT       = '#2f6d6a'
const ACCENT_HOVER = '#255856'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  address:     string
  placeId:     string
  lat:         number | null
  lng:         number | null
  numChildren: string
  ageGroup:    string
  careType:    string
  budget:      string
  startDate:   string
  priority:    string
  subsidy:     string
  settingPref: string
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
}

interface PlaceSuggestion {
  place_id:    string
  description: string
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const QUESTION_STEPS = [
  'address', 'numChildren', 'ageGroup', 'careType',
  'budget', 'startDate', 'priority', 'subsidy', 'settingPref', 'contact',
] as const

type QuestionStep = typeof QUESTION_STEPS[number]
type Step = QuestionStep | 'loading' | 'result'

function defaultFormData(): FormData {
  return {
    address: '', placeId: '', lat: null, lng: null,
    numChildren: '', ageGroup: '', careType: '', budget: '',
    startDate: '', priority: '', subsidy: '', settingPref: '',
    firstName: '', lastName: '', email: '', phone: '',
  }
}

// ─── Snapshot calc ────────────────────────────────────────────────────────────

const BUDGET_MAP: Record<string, number> = {
  'Under $200/wk': 175,
  '$200–$300/wk':  250,
  '$300–$400/wk':  350,
  '$400+/wk':      450,
}

const MEDIAN_COST: Record<string, number> = {
  'Infant (0–12 mo)':    310,
  'Toddler (1–3 yr)':    285,
  'Preschool (3–5 yr)':  260,
  'School-age (5+ yr)':  195,
}

function calcSnapshot(ageGroup: string, budget: string) {
  const weeklyCost = MEDIAN_COST[ageGroup] ?? 285
  const annualCost = weeklyCost * 52
  const budgetAmt  = BUDGET_MAP[budget] ?? 250
  const gap        = Math.max(weeklyCost - budgetAmt, 0)
  return { weeklyCost, annualCost, gap }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function stepProgress(stepIdx: number): number {
  if (stepIdx <= 2) return 25
  if (stepIdx <= 5) return 50
  if (stepIdx <= 8) return 75
  return 90
}

function progressLabel(pct: number) {
  if (pct <= 25) return 'Getting started'
  if (pct <= 50) return 'Halfway there'
  if (pct <= 75) return 'Almost done'
  return 'Just a few more details'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ stepIdx }: { stepIdx: number }) {
  const pct = stepProgress(stepIdx)
  return (
    <div className="w-full">
      <div className="h-4 w-full rounded-full bg-[var(--paper-2)]">
        <div className="h-4 rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
      </div>
      <p className="mt-2 text-center text-sm font-semibold" style={{ ...SANS, color: ACCENT }}>
        {pct}% · {progressLabel(pct)}
      </p>
    </div>
  )
}

function BigButton({ label, tooltip, selected, onClick }: {
  label: string; tooltip?: string; selected: boolean; onClick: () => void
}) {
  return (
    <div className="relative group">
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="bg-black text-white text-xs rounded-lg px-3 py-1.5 text-center leading-snug whitespace-normal max-w-[160px]">
            {tooltip}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        style={SANS}
        className={
          'w-full cursor-pointer rounded-xl border-2 px-6 py-4 text-center text-lg font-medium transition-all ' +
          (selected
            ? 'border-[#2f6d6a] bg-[#2f6d6a] text-white'
            : 'border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-text)] hover:border-[#2f6d6a]')
        }
      >
        {label}
      </button>
    </div>
  )
}

function BiggerButton({ children, onClick, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 w-full cursor-pointer rounded-xl px-8 py-4 text-lg font-semibold text-white transition-colors disabled:opacity-50"
      style={{ ...SANS, backgroundColor: disabled ? 'var(--paper-faint)' : ACCENT }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = ACCENT }}
    >
      {children}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [step, setStep]         = useState<Step>('address')
  const [stepIdx, setStepIdx]   = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData())
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [animating, setAnimating]     = useState(false)
  const [smsConsent, setSmsConsent]   = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setFormData(prev => ({ ...prev, [k]: v }))
  }

  function goNext() {
    const nextIdx = stepIdx + 1
    setAnimating(true)
    setTimeout(() => {
      if (nextIdx < QUESTION_STEPS.length) {
        setStep(QUESTION_STEPS[nextIdx])
        setStepIdx(nextIdx)
      } else {
        setStep('loading')
        setTimeout(() => setStep('result'), 2000)
      }
      setAnimating(false)
    }, 150)
  }

  function goBack() {
    if (stepIdx === 0) return
    const prevIdx = stepIdx - 1
    setAnimating(true)
    setTimeout(() => {
      setStep(QUESTION_STEPS[prevIdx])
      setStepIdx(prevIdx)
      setAnimating(false)
    }, 150)
  }

  function resetForm() {
    setFormData(defaultFormData())
    setStep('address')
    setStepIdx(0)
    setAnimating(false)
    setSuggestions([])
  }

  const fetchSuggestions = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?input=${encodeURIComponent(val)}`)
        const data = await res.json()
        if (Array.isArray(data)) setSuggestions(data)
      } catch { /* silent */ }
    }, 150)
  }, [])

  const selectAddress = useCallback((s: PlaceSuggestion) => {
    setFormData(prev => ({ ...prev, address: s.description, placeId: s.place_id }))
    setSuggestions([])
    goNext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const snapshot = calcSnapshot(formData.ageGroup, formData.budget)
  // DOL medians are weekly; show a monthly figure parents can budget against
  // (matches the chat + county pages: ×52/12). Annual stays weekly×52.
  const monthlyCost = Math.round((snapshot.weeklyCost * 52) / 12)
  const annualCost  = snapshot.annualCost

  const canContinue: Partial<Record<QuestionStep, boolean>> = {
    address:     !!formData.address,
    numChildren: !!formData.numChildren,
    ageGroup:    !!formData.ageGroup,
    careType:    !!formData.careType,
    budget:      !!formData.budget,
    startDate:   !!formData.startDate,
    priority:    !!formData.priority,
    subsidy:     !!formData.subsidy,
    settingPref: !!formData.settingPref,
    contact:     !!(formData.firstName && formData.lastName && formData.email && formData.phone),
  }

  const currentStep = step as QuestionStep

  return (
    <AppLayout>

      {/* ── Loading ── */}
      {step === 'loading' && (
        <div className="flex flex-1 flex-col items-center justify-center" style={{ background: 'var(--paper)' }}>
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <BottleBaby className="h-12 w-12 animate-spin" style={{ color: ACCENT }} />
            <p className="text-xl text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Finding childcare options near you…</p>
            <p className="text-sm text-[var(--paper-muted)] max-w-xs" style={SANS}>Searching licensed providers, costs, and subsidy programs</p>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && (
        <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-5 pb-14 pt-10 sm:pt-14">
              <div className="mx-auto max-w-2xl">

                {/* Masthead */}
                <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                  ChildcareGPT · Your Report
                </p>
                <h1 className="paper-rise mt-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.9rem, 4.5vw, 2.6rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                  Here&apos;s your childcare <span style={{ fontStyle: 'italic', color: ACCENT }}>snapshot.</span>
                </h1>
                {formData.address && <p className="paper-rise mt-2 text-sm text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '90ms' }}>{formData.address}</p>}

                {/* The number — the answer, big */}
                <div className="paper-rise mt-8 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-7" style={{ animationDelay: '120ms' }}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                    Typical cost · {formData.ageGroup || 'center-based care'}
                  </p>
                  <p className="mt-2 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(2.75rem, 8vw, 3.75rem)', fontWeight: 500, lineHeight: 1 }}>
                    ${monthlyCost.toLocaleString()}<span className="text-2xl font-normal text-[var(--paper-faint)]" style={SANS}>/month</span>
                  </p>
                  <p className="mt-2 text-sm text-[var(--paper-muted)]" style={SANS}>
                    ≈ ${annualCost.toLocaleString()} a year, before any help paying · median for NY, 2022
                  </p>
                </div>

                {/* Help paying — the "do I qualify" route */}
                <div className="paper-rise mt-5 rounded-2xl border border-[var(--paper-accent)] p-6" style={{ background: 'var(--paper-accent-soft)', animationDelay: '180ms' }}>
                  <h2 className="text-[19px] leading-snug text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>
                    You may not have to pay all of that.
                  </h2>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>
                    Eligible NY families can have most or all of the cost covered. These programs may apply to you:
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {[
                      { name: 'Child Care Assistance (CCAP)',     value: 'Most of the cost' },
                      { name: 'Child Tax Credit (CTC)',            value: 'Up to $2,000/child' },
                      { name: 'Child & Dependent Care Credit',     value: 'Up to $1,050/child' },
                    ].map(r => (
                      <div key={r.name} className="flex items-center justify-between text-sm" style={SANS}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                          <span className="text-[var(--paper-text)]">{r.name}</span>
                        </div>
                        <span className="font-medium" style={{ color: ACCENT }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/eligibility"
                    className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ ...SANS, background: ACCENT }}
                  >
                    Check if you qualify <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Find care + advisor */}
                <div className="paper-rise mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '240ms' }}>
                  <Link href="/maps/zip-code" className="group/c flex flex-col rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: ACCENT }}>
                      <MapPin className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Find providers near you</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Map every licensed provider in your neighborhood.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: ACCENT }}>
                      Open the ZIP map <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
                    </span>
                  </Link>
                  <a href="tel:18003459152" className="group/c flex flex-col rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: ACCENT }}>
                      <CheckCircle className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Talk to an advisor</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Free help from the NYS Child Care Hotline.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: ACCENT }}>(800) 345-9152</span>
                  </a>
                </div>

                {/* Your search summary */}
                <div className="paper-rise mt-8" style={{ animationDelay: '300ms' }}>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>Your search</p>
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    {[
                      formData.numChildren && { label: 'Children', value: formData.numChildren },
                      formData.ageGroup    && { label: 'Age',      value: formData.ageGroup    },
                      formData.careType    && { label: 'Care type', value: formData.careType   },
                      formData.settingPref && { label: 'Setting',  value: formData.settingPref },
                    ].filter(Boolean).map(row => row && (
                      <div key={row.label}>
                        <p className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--paper-faint)]" style={SANS}>{row.label}</p>
                        <p className="mt-0.5 text-[15px] text-[var(--paper-text)]" style={{ ...SANS, fontWeight: 500 }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-10 text-xs text-[var(--paper-faint)]" style={SANS}>
                  Costs from the U.S. Dept. of Labor National Database of Childcare Prices (NY, 2022), shown as a monthly estimate. Your actual cost varies by provider — always call to confirm. Eligibility for help is determined only by the official screener.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form steps ── */}
      {step !== 'loading' && step !== 'result' && (
        <div className={`flex flex-1 flex-col animate-zoom-in transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'}`} style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col justify-center px-4 py-6">
              <div className="mx-auto w-full max-w-3xl min-h-[400px]">

                <div className="mb-4 flex items-center justify-between">
                  {stepIdx > 0 ? (
                    <button type="button" onClick={goBack} style={SANS}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors">
                      <ArrowLeft className="h-4 w-4" />
                      Previous Question
                    </button>
                  ) : <div />}
                  {stepIdx > 0 && (
                    <button type="button" onClick={resetForm} style={SANS}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors">
                      <RotateCcw className="h-4 w-4" />
                      Start Over
                    </button>
                  )}
                </div>

                {/* ADDRESS */}
                {currentStep === 'address' && (
                  <div>
                    <div className="mb-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--paper-faint)]" style={SANS}>
                      Get Started <ArrowRight className="h-4 w-4" />
                    </div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Find childcare options in your area.</h2>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border-2 border-transparent bg-[var(--paper-2)] px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-within:border-[#2f6d6a] focus-within:shadow-none transition-all">
                        <MapPin className="h-5 w-5 text-[var(--paper-faint)] shrink-0" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={e => { update('address', e.target.value); update('placeId', ''); fetchSuggestions(e.target.value) }}
                          placeholder="Enter an address"
                          style={SANS}
                          className="flex-1 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none bg-transparent"
                        />
                      </div>
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full rounded-xl bg-[var(--surface)] shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-10 overflow-hidden border border-[var(--paper-rule)]">
                          {suggestions.map(s => (
                            <button key={s.place_id} type="button" onClick={() => selectAddress(s)} style={SANS}
                              className="flex w-full items-start gap-3 px-4 py-3 text-sm text-[var(--paper-text)] hover:bg-[var(--paper-2)] transition-colors text-left border-b border-[var(--paper-rule)] last:border-0">
                              <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
                              {s.description}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.address}>
                      GET MY CHILDCARE REPORT →
                    </BiggerButton>
                    <p className="mt-2 text-xs text-[var(--paper-faint)]" style={SANS}>*Supported by data from NYS OCFS and DOL.</p>
                  </div>
                )}

                {/* NUM CHILDREN */}
                {currentStep === 'numChildren' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>How many children need care?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['1 child', '2 children', '3 children', '4+ children'].map(o => (
                        <BigButton key={o} label={o} selected={formData.numChildren === o}
                          onClick={() => { update('numChildren', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.numChildren}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* AGE GROUP — no sub-text */}
                {currentStep === 'ageGroup' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What are the ages of your children?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Infant (0–12 mo)', 'Toddler (1–3 yr)', 'Preschool (3–5 yr)', 'School-age (5+ yr)'].map(o => (
                        <BigButton key={o} label={o} selected={formData.ageGroup === o}
                          onClick={() => { update('ageGroup', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.ageGroup}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* CARE TYPE */}
                {currentStep === 'careType' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What type of care are you looking for?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Full-time', 'Part-time', 'Before & After School', 'Occasional / Drop-in'].map(o => (
                        <BigButton key={o} label={o} selected={formData.careType === o}
                          onClick={() => { update('careType', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.careType}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* BUDGET */}
                {currentStep === 'budget' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What&apos;s your weekly childcare budget?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(BUDGET_MAP).map(o => (
                        <BigButton key={o} label={o} selected={formData.budget === o}
                          onClick={() => { update('budget', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <BiggerButton onClick={goNext} disabled={!formData.budget}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* START DATE */}
                {currentStep === 'startDate' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>When do you need care to start?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['ASAP', '1–3 months', '3–6 months', 'Just exploring'].map(o => (
                        <BigButton key={o} label={o} selected={formData.startDate === o}
                          onClick={() => { update('startDate', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.startDate}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* PRIORITY — no tooltips */}
                {currentStep === 'priority' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What matters most in a provider?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Location / Proximity', 'Cost / Affordability', 'Curriculum / Education', 'Flexible Hours'].map(o => (
                        <BigButton key={o} label={o} selected={formData.priority === o}
                          onClick={() => { update('priority', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.priority}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* SUBSIDY — no tooltips */}
                {currentStep === 'subsidy' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you interested in subsidy assistance?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes, definitely', 'Possibly', 'Not sure', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.subsidy === o}
                          onClick={() => { update('subsidy', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.subsidy}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* SETTING PREF — tooltips kept, fixed wrapping */}
                {currentStep === 'settingPref' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you have a preference for care setting?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Day Care Center', 'Family Day Care', 'Group Family Care', 'No preference'].map(o => (
                        <BigButton key={o} label={o} selected={formData.settingPref === o}
                          onClick={() => { update('settingPref', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.settingPref}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* CONTACT */}
                {currentStep === 'contact' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                      {formData.firstName ? `${formData.firstName}, great news!` : 'Great news!'} We found options in your area.
                    </h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="text" value={formData.firstName} onChange={e => update('firstName', e.target.value)}
                        placeholder="Sarah" style={SANS}
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                      <input type="text" value={formData.lastName} onChange={e => update('lastName', e.target.value)}
                        placeholder="Johnson" style={SANS}
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input type="email" value={formData.email} onChange={e => update('email', e.target.value)}
                        placeholder="sarah@mail.com" style={SANS}
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                      <input type="tel" value={formData.phone} onChange={e => update('phone', formatPhone(e.target.value))}
                        placeholder="(555) 555-5555" style={SANS}
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                    </div>
                    <div className="flex items-start gap-3 mb-4">
                      <input id="sms-consent" type="checkbox" checked={smsConsent}
                        onChange={e => setSmsConsent(e.target.checked)}
                        className="mt-1 h-4 w-4" style={{ accentColor: ACCENT }} />
                      <label htmlFor="sms-consent" className="text-xs text-[var(--paper-muted)] leading-relaxed" style={SANS}>
                        By submitting this form, you agree to receive SMS messages from ChildcareGPT at the phone number provided. Message &amp; data rates may apply. Reply STOP to opt out and HELP for help.
                      </label>
                    </div>
                    <BiggerButton onClick={goNext} disabled={!canContinue.contact}>
                      Find My Childcare Options →
                    </BiggerButton>
                    <p className="mt-3 text-center text-xs text-[var(--paper-faint)]" style={SANS}>
                      By clicking &quot;Find My Childcare Options&quot;, I provide my express consent to be contacted by ChildcareGPT and its partners. Consent is not a condition of service.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 pt-2 pb-4">
            <div className="mx-auto max-w-3xl">
              <ProgressBar stepIdx={stepIdx} />
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  )
}
