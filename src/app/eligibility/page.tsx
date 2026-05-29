'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, MapPin, CheckCircle, XCircle, ChevronDown, Check, RotateCcw, Phone, Mail, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { BottleBaby } from '@/components/BottleBaby'
import { RevealFx } from '@/components/RevealFx'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT       = '#2f6d6a'
const ACCENT_HOVER = '#255856'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Hover/focus tooltip for the icon actions on the results card.
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
        style={{ ...SANS, background: 'var(--paper-text)', color: 'var(--paper)' }}
      >
        {label}
      </span>
    </span>
  )
}

const NY_COUNTIES = [
  'Albany','Allegany','Bronx','Broome','Cattaraugus','Cayuga','Chautauqua',
  'Chemung','Chenango','Clinton','Columbia','Cortland','Delaware','Dutchess',
  'Erie','Essex','Franklin','Fulton','Genesee','Greene','Hamilton','Herkimer',
  'Jefferson','Kings','Lewis','Livingston','Madison','Monroe','Montgomery',
  'Nassau','New York','Niagara','Oneida','Onondaga','Ontario','Orange',
  'Orleans','Oswego','Otsego','Putnam','Queens','Rensselaer','Richmond',
  'Rockland','St. Lawrence','Saratoga','Schenectady','Schoharie','Schuyler',
  'Seneca','Steuben','Suffolk','Sullivan','Tioga','Tompkins','Ulster',
  'Warren','Washington','Wayne','Westchester','Wyoming','Yates',
  'New York City','Saint Regis Mohawk Tribe',
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  address:            string
  placeId:            string
  county:             string
  dateOfBirth:        string
  maritalStatus:      string
  language:           string
  childSpecialNeeds:  string
  childAged18:        string
  fosterParent:       string
  employed:           string
  employerName:       string
  jobSearchOrTraining: string
  dssActivities:      string
  vocationalProgram:  string
  college:            string
  basicEducation:     string
  hsOrGed:            string
  familyDuties:       string
  disability:         string
  domesticViolence:   string
  substanceProgram:   string
  homeless:           string
  assets:             string
  householdSize:      string
  monthlyIncome:      string
  benefits:           string[]
  firstName:          string
  lastName:           string
  email:              string
  phone:              string
}

interface PlaceSuggestion {
  place_id:    string
  description: string
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const QUESTION_STEPS = [
  'address',
  'dateOfBirth', 'maritalStatus', 'language',
  'childSpecialNeeds', 'childAged18', 'fosterParent',
  'employed', 'jobSearchOrTraining', 'dssActivities',
  'vocationalProgram', 'college', 'basicEducation', 'hsOrGed',
  'familyDuties', 'disability', 'domesticViolence',
  'substanceProgram', 'homeless', 'assets',
  'incomeIntro', 'income', 'benefits',
  'contact',
] as const

type QuestionStep = typeof QUESTION_STEPS[number]
type Step = QuestionStep | 'loading' | 'result'

function defaultFormData(): FormData {
  return {
    address: '', placeId: '', county: '',
    dateOfBirth: '', maritalStatus: '', language: '',
    childSpecialNeeds: '', childAged18: '', fosterParent: '',
    employed: '', employerName: '', jobSearchOrTraining: '', dssActivities: '',
    vocationalProgram: '', college: '', basicEducation: '', hsOrGed: '',
    familyDuties: '', disability: '', domesticViolence: '',
    substanceProgram: '', homeless: '', assets: '',
    householdSize: '', monthlyIncome: '', benefits: [],
    firstName: '', lastName: '', email: '', phone: '',
  }
}

// ─── Income limits — 85% NYS State Median Income, 2026 ───────────────────────

const MONTHLY_INCOME_LIMITS: Record<number, number> = {
  1: 4707,
  2: 6156,
  3: 7604,
  4: 9053,
  5: 10501,
  6: 11949,
}

// Each additional person beyond 6 adds ~$1,448/mo
function getMonthlyIncomeLimit(householdSize: number): number {
  const size = Math.max(1, householdSize)
  if (size <= 6) return MONTHLY_INCOME_LIMITS[size]
  return MONTHLY_INCOME_LIMITS[6] + (size - 6) * 1448
}

// ─── Eligibility logic ────────────────────────────────────────────────────────

type EligibilityResult = {
  outcome: 'eligible' | 'not-eligible'
  failReason: 'assets' | 'no-activity' | 'income' | null
  incomeLimit: number | null
}

function determineEligibility(d: FormData): EligibilityResult {
  // 1. Asset test
  if (d.assets === 'Yes') return { outcome: 'not-eligible', failReason: 'assets', incomeLimit: null }

  // 2. Qualifying activity test
  const qualifying: (keyof FormData)[] = [
    'childSpecialNeeds','childAged18','fosterParent',
    'employed','jobSearchOrTraining','dssActivities',
    'vocationalProgram','college','basicEducation','hsOrGed',
    'familyDuties','disability','domesticViolence',
    'substanceProgram','homeless',
  ]
  if (!qualifying.some(k => d[k] === 'Yes')) {
    return { outcome: 'not-eligible', failReason: 'no-activity', incomeLimit: null }
  }

  // 3. Income test (85% NYS SMI, 2026)
  if (d.householdSize && d.monthlyIncome) {
    const size   = parseInt(d.householdSize, 10)
    const income = parseFloat(d.monthlyIncome)
    const limit  = getMonthlyIncomeLimit(size)
    if (income > limit) return { outcome: 'not-eligible', failReason: 'income', incomeLimit: limit }
    return { outcome: 'eligible', failReason: null, incomeLimit: limit }
  }

  return { outcome: 'eligible', failReason: null, incomeLimit: null }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function stepProgress(stepIdx: number): number {
  if (stepIdx <= 6)  return 25
  if (stepIdx <= 12) return 50
  if (stepIdx <= 18) return 75
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

function BigButton({ label, selected, onClick }: {
  label: string; selected: boolean; onClick: () => void
}) {
  return (
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

const BENEFIT_OPTIONS: { label: string; tooltip?: string }[] = [
  { label: 'Medicaid' },
  { label: 'SNAP',                   tooltip: 'Food Stamps' },
  { label: 'Housing Assistance' },
  { label: 'HEAP',                   tooltip: 'Home Energy Assistance Program' },
  { label: 'WIC' },
  { label: 'Social Security Income', tooltip: 'SSI or other federal assistance' },
  { label: 'Head Start' },
  { label: 'Cash Assistance',        tooltip: 'TANF' },
  { label: 'None of these' },
]

function CheckItem({ label, tooltip, checked, onClick }: { label: string; tooltip?: string; checked: boolean; onClick: () => void }) {
  return (
    <div className="relative group">
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
        className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
          checked
            ? 'border-[#2f6d6a] bg-[var(--paper-accent-soft)] text-[#2f6d6a]'
            : 'border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-text)] hover:border-[#2f6d6a]'
        }`}
      >
        <div className={`h-5 w-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
          checked ? 'border-[#2f6d6a] bg-[#2f6d6a]' : 'border-[var(--paper-rule)]'
        }`}>
          {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
        {label}
      </button>
    </div>
  )
}

function CountySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = NY_COUNTIES.filter(c => c.toLowerCase().includes(query.trim().toLowerCase()))

  const select = (county: string) => { onChange(county); setOpen(false); setQuery('') }

  return (
    <div className="relative mt-4" ref={ref}>
      <div
        className={`flex items-center gap-2 rounded-xl border-2 bg-[var(--paper)] px-4 py-3 transition-all ${
          open ? 'border-[#2f6d6a] shadow-none' : 'border-[var(--paper-rule)]'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length) { e.preventDefault(); select(filtered[0]) }
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
          }}
          placeholder="Type or select your county…"
          style={SANS}
          className="flex-1 bg-transparent text-base text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none"
        />
        <button type="button" onClick={() => { setOpen(o => !o); inputRef.current?.focus() }} aria-label="Toggle county list">
          <ChevronDown className={`h-4 w-4 text-[var(--paper-faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-[var(--surface)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-20 overflow-hidden border border-[var(--paper-rule)]">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--paper-muted)]" style={SANS}>No county matches “{query}”.</p>
            ) : filtered.map(county => (
              <button
                key={county}
                type="button"
                onClick={() => select(county)}
                style={SANS}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-[var(--paper-rule)] last:border-0 ${
                  value === county
                    ? 'bg-[var(--paper-accent-soft)] text-[#2f6d6a] font-medium'
                    : 'text-[var(--paper-text)] hover:bg-[var(--paper-2)]'
                }`}
              >
                {county}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EligibilityPage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>('address')
  const [stepIdx, setStepIdx]   = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData())
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [animating, setAnimating]     = useState(false)
  const [smsConsent, setSmsConsent]   = useState(true)
  const [selectedCounty, setSelectedCounty] = useState('')
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const incomeRef    = useRef<HTMLInputElement>(null)

  // Email-me-my-results (revealed by the mail icon on the summary card)
  const [emailOpen, setEmailOpen]   = useState(false)
  const [resultEmail, setResultEmail] = useState('')
  const [emailSendState, setEmailSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailSendMsg, setEmailSendMsg] = useState('')

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

  function resetForm() {
    setFormData(defaultFormData())
    setStep('address')
    setStepIdx(0)
    setAnimating(false)
    setSuggestions([])
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
    setFormData(prev => ({ ...prev, address: s.description, placeId: s.place_id, county: '' }))
    setSuggestions([])
    goNext()
    // Resolve the county in the background — the parent has 20+ questions to
    // answer before the result screen needs it, so don't block the click.
    fetch(`/api/places/geocode?place_id=${encodeURIComponent(s.place_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.county) setFormData(prev => ({ ...prev, county: data.county })) })
      .catch(() => { /* fallback county select stays available on the result screen */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const { outcome: eligibility, failReason, incomeLimit } = determineEligibility(formData)

  // County resolved from the address step (via geocode). Only treat it as usable
  // when it's a real NY county — otherwise the result screen falls back to the
  // manual select so an out-of-state or unresolved address never dead-ends.
  const autoCounty = formData.county && NY_COUNTIES.includes(formData.county) ? formData.county : ''

  // The summary rows — single source of truth for both the on-page card and the
  // emailed copy, so they never drift apart.
  const summaryRows: { label: string; value: string }[] = [
    { label: 'Date of birth',       value: formData.dateOfBirth || '—' },
    { label: 'Marital status',      value: formData.maritalStatus || '—' },
    { label: 'Primary language',    value: formData.language || '—' },
    { label: 'Household size',      value: formData.householdSize ? `${formData.householdSize} ${Number(formData.householdSize) === 1 ? 'person' : 'people'}` : '—' },
    { label: 'Your monthly income', value: formData.monthlyIncome ? `$${Number(formData.monthlyIncome).toLocaleString()}/mo` : '—' },
    { label: '2026 income limit',   value: incomeLimit != null ? `$${incomeLimit.toLocaleString()}/mo` : '—' },
    { label: 'Benefits received',   value: formData.benefits.length > 0 ? formData.benefits.join(', ') : '—' },
  ]

  async function sendResultsEmail() {
    const to = resultEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setEmailSendState('error'); setEmailSendMsg('Enter a valid email address.'); return
    }
    setEmailSendState('sending'); setEmailSendMsg('')
    try {
      const res = await fetch('/api/send-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: to,
          eligible: true,
          headline: 'You may qualify.',
          summary: 'Based on your answers, you may qualify for the Child Care Assistance Program (CCAP). Here is a copy of your results.',
          rows: summaryRows,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send the email.')
      setEmailSendState('sent'); setEmailSendMsg(`Sent to ${to}.`)
    } catch (err) {
      setEmailSendState('error'); setEmailSendMsg(err instanceof Error ? err.message : 'Could not send the email.')
    }
  }

  const canContinue: Partial<Record<QuestionStep, boolean>> = {
    address:            !!formData.address,
    dateOfBirth:        !!formData.dateOfBirth,
    maritalStatus:      !!formData.maritalStatus,
    language:           !!formData.language,
    childSpecialNeeds:  !!formData.childSpecialNeeds,
    childAged18:        !!formData.childAged18,
    fosterParent:       !!formData.fosterParent,
    employed:           !!formData.employed,
    jobSearchOrTraining: !!formData.jobSearchOrTraining,
    dssActivities:      !!formData.dssActivities,
    vocationalProgram:  !!formData.vocationalProgram,
    college:            !!formData.college,
    basicEducation:     !!formData.basicEducation,
    hsOrGed:            !!formData.hsOrGed,
    familyDuties:       !!formData.familyDuties,
    disability:         !!formData.disability,
    domesticViolence:   !!formData.domesticViolence,
    substanceProgram:   !!formData.substanceProgram,
    homeless:           !!formData.homeless,
    assets:             !!formData.assets,
    benefits:           formData.benefits.length > 0,
    incomeIntro:        true,
    income:             !!(formData.householdSize && formData.monthlyIncome),
    contact:            !!(formData.firstName && formData.lastName && formData.email && formData.phone),
  }

  const currentStep = step as QuestionStep

  return (
    <AppLayout>
     <RevealFx className="flex flex-1 flex-col min-h-0" translateY={8}>

      {/* ── Loading ── */}
      {step === 'loading' && (
        <div className="flex flex-1 flex-col items-center justify-center" style={{ background: 'var(--paper)' }}>
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <BottleBaby className="h-12 w-12 animate-spin" style={{ color: ACCENT }} />
            <p className="text-xl text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Checking your eligibility…</p>
            <p className="text-sm text-[var(--paper-muted)] max-w-xs" style={SANS}>Reviewing your answers against CCAP program requirements</p>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && (
        <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-5 pb-14 pt-10 sm:pt-14">
              <div className="mx-auto max-w-2xl">

                <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                  ChildcareGPT · Eligibility
                </p>

                {eligibility === 'eligible' ? (
                  <>
                    <h1 className="paper-rise mt-3 flex items-center gap-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.9rem, 4.5vw, 2.6rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                      <CheckCircle className="h-8 w-8 shrink-0" style={{ color: ACCENT }} />
                      You may <span style={{ fontStyle: 'italic', color: ACCENT }}>qualify.</span>
                    </h1>
                    <p className="paper-rise mt-3 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '90ms', fontSize: '1.12rem', lineHeight: 1.6 }}>
                      Based on your answers, you may qualify for the Child Care Assistance Program (CCAP). We’ve saved your answers to pre-fill the official application for you.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="paper-rise mt-3 flex items-center gap-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.9rem, 4.5vw, 2.6rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                      <XCircle className="h-8 w-8 shrink-0 text-[#b4452f]" />
                      This may <span style={{ fontStyle: 'italic', color: '#b4452f' }}>not</span> be a fit.
                    </h1>
                    <p className="paper-rise mt-3 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '90ms', fontSize: '1.12rem', lineHeight: 1.6 }}>
                      {failReason === 'assets' && 'Households with resources over $1,000,000 do not qualify for CCAP. There may still be other resources near you.'}
                      {failReason === 'no-activity' && 'CCAP requires a qualifying activity such as employment, job search, or education — none were indicated. If that changes, you can check again any time.'}
                      {failReason === 'income' && incomeLimit != null && `Your household income is above the 2026 CCAP limit of $${incomeLimit.toLocaleString()}/mo for a household of ${formData.householdSize}. Other resources near you may still help.`}
                    </p>
                  </>
                )}

                {/* Summary card (eligible only) */}
                {eligibility === 'eligible' && (
                  <div className="paper-rise mt-7 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-6" style={{ animationDelay: '140ms' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.15rem', fontWeight: 500 }}>Child Care Assistance Program (CCAP)</p>
                        <p className="mt-0.5 text-sm text-[var(--paper-muted)]" style={SANS}>NYS Office of Children &amp; Family Services · income-based, up to full coverage</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {/* Call the NY Child Care Helpline */}
                        <Tip label="Call the NY Child Care Helpline · (800) 345-9152">
                          <a
                            href="tel:18003459152"
                            aria-label="Call the NY Child Care Helpline at (800) 345-9152"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-muted)] transition-colors hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)]"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </Tip>
                        {/* Email me my results */}
                        <Tip label="Email me my results">
                          <button
                            type="button"
                            aria-label="Email me my results"
                            onClick={() => setEmailOpen(o => !o)}
                            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${emailOpen ? 'border-[var(--paper-accent)] text-[var(--paper-accent)]' : 'border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-muted)] hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)]'}`}
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </Tip>
                      </div>
                    </div>

                    <div className="mt-5 space-y-1.5">
                      {summaryRows.map(r => (
                        <div key={r.label} className="flex items-center justify-between gap-3 text-sm" style={SANS}>
                          <span className="text-[var(--paper-muted)]">{r.label}</span>
                          <span className="text-right font-medium text-[var(--paper-text)]">{r.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Reveal-able email field */}
                    {emailOpen && (
                      <div className="mt-5 border-t border-[var(--paper-rule)] pt-4">
                        <label className="block text-xs uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>Email me a copy of these results</label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="email"
                            inputMode="email"
                            autoFocus
                            placeholder="you@email.com"
                            value={resultEmail}
                            onChange={e => { setResultEmail(e.target.value.toLowerCase()); if (emailSendState !== 'idle') { setEmailSendState('idle'); setEmailSendMsg('') } }}
                            onKeyDown={e => { if (e.key === 'Enter') sendResultsEmail() }}
                            className="flex-1 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-2.5 text-[15px] text-[var(--paper-text)] outline-none focus:border-[var(--paper-accent)]"
                            style={SANS}
                          />
                          <button
                            type="button"
                            onClick={sendResultsEmail}
                            disabled={emailSendState === 'sending'}
                            className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                            style={{ ...SANS, backgroundColor: ACCENT }}
                          >
                            {emailSendState === 'sending'
                              ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                              : emailSendState === 'sent'
                              ? <><Check className="h-4 w-4" />Sent</>
                              : 'Send'}
                          </button>
                        </div>
                        {emailSendMsg && (
                          <p className="mt-2 text-xs" style={{ ...SANS, color: emailSendState === 'error' ? '#b4452f' : ACCENT }}>{emailSendMsg}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CTA card */}
                <div className="paper-rise mt-5 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-6" style={{ animationDelay: '200ms' }}>
                  {eligibility === 'eligible' && autoCounty ? (
                    // County came from the address — skip the manual select.
                    <>
                      <p className="text-sm text-[var(--paper-muted)] text-center" style={SANS}>
                        We’ve pre-filled your application for <span className="font-medium text-[var(--paper-text)]">{autoCounty} County</span>.
                      </p>
                      <button
                        className="mt-3 w-full rounded-xl py-3 text-base font-semibold text-white transition-colors"
                        style={{ ...SANS, backgroundColor: ACCENT }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT }}
                        onClick={() => {
                          localStorage.setItem('ccap-eligibility-data', JSON.stringify({ ...formData, county: autoCounty }))
                          router.push('/application')
                        }}
                      >
                        View my pre-filled application →
                      </button>
                    </>
                  ) : (
                    // No usable county from the address — fall back to the select.
                    <>
                      <p className="text-sm text-[var(--paper-muted)] text-center" style={SANS}>
                        {eligibility === 'eligible'
                          ? 'Select your county and we’ll start your pre-filled application.'
                          : 'Select your county for other childcare resources near you.'}
                      </p>

                      <CountySelect value={selectedCounty} onChange={setSelectedCounty} />

                      <button
                        className="mt-3 w-full rounded-xl py-3 text-base font-semibold text-white transition-colors disabled:opacity-50"
                        style={{ ...SANS, backgroundColor: ACCENT }}
                        disabled={!selectedCounty}
                        onMouseEnter={e => { if (selectedCounty) e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT }}
                        onClick={() => {
                          if (eligibility === 'eligible') {
                            localStorage.setItem('ccap-eligibility-data', JSON.stringify({ ...formData, county: selectedCounty }))
                            router.push('/application')
                          }
                        }}
                      >
                        {eligibility === 'eligible' ? 'Start my application →' : 'Find local resources →'}
                      </button>
                    </>
                  )}
                </div>

                <p className="mt-8 text-center text-xs text-[var(--paper-faint)]" style={SANS}>
                  This screening uses general CCAP eligibility criteria. Final eligibility is determined by your local Department of Social Services. Your answers are not saved on our servers.
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
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Check if you qualify for low or no-cost child care.</h2>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border-2 border-transparent bg-[var(--paper-2)] px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-within:border-[#2f6d6a] focus-within:shadow-none transition-all">
                        <MapPin className="h-5 w-5 text-[var(--paper-faint)] shrink-0" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={e => { update('address', e.target.value); update('placeId', ''); fetchSuggestions(e.target.value) }}
                          onKeyDown={e => { if (e.key === 'Enter' && formData.address) goNext() }}
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
                      CHECK MY ELIGIBILITY →
                    </BiggerButton>
                    <p className="mt-2 text-xs text-[var(--paper-faint)]" style={SANS}>*Screening based on NYS CCAP eligibility criteria. Your answers will not be saved.</p>
                  </div>
                )}

                {/* DATE OF BIRTH */}
                {currentStep === 'dateOfBirth' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What is your date of birth?</h2>
                    <input
                      type="text"
                      autoFocus
                      value={formData.dateOfBirth}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                        let masked = digits
                        if (digits.length > 4) masked = `${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4)}`
                        else if (digits.length > 2) masked = `${digits.slice(0,2)}-${digits.slice(2)}`
                        update('dateOfBirth', masked)
                        if (masked.length === 10) setTimeout(() => goNext(), 300)
                      }}
                      placeholder="MM-DD-YYYY"
                      maxLength={10}
                      className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]"
                    />
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.dateOfBirth}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* MARITAL STATUS */}
                {currentStep === 'maritalStatus' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What is your marital status?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Single', 'Married', 'Divorced', 'Separated', 'Widowed'].map(o => (
                        <BigButton key={o} label={o} selected={formData.maritalStatus === o}
                          onClick={() => { update('maritalStatus', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[60px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.maritalStatus}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* PRIMARY LANGUAGE */}
                {currentStep === 'language' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>What is your primary language?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['English', 'Spanish', 'Haitian Creole', 'Other'].map(o => (
                        <BigButton key={o} label={o} selected={formData.language === o}
                          onClick={() => { update('language', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.language}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* CHILD SPECIAL NEEDS */}
                {currentStep === 'childSpecialNeeds' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you have a child younger than 18 with special needs or under court supervision in need of child care?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.childSpecialNeeds === o}
                          onClick={() => { update('childSpecialNeeds', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.childSpecialNeeds}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* CHILD AGED 18 */}
                {currentStep === 'childAged18' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you have a child aged 18 with special needs or under court supervision who attends high school or job-specific training?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.childAged18 === o}
                          onClick={() => { update('childAged18', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.childAged18}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* FOSTER PARENT */}
                {currentStep === 'fosterParent' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you a foster parent in need of care for a foster child?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.fosterParent === o}
                          onClick={() => { update('fosterParent', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.fosterParent}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* EMPLOYED */}
                {currentStep === 'employed' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you work?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <BigButton label="Yes" selected={formData.employed === 'Yes'}
                        onClick={() => update('employed', 'Yes')} />
                      <BigButton label="No" selected={formData.employed === 'No'}
                        onClick={() => { update('employed', 'No'); update('employerName', ''); setTimeout(goNext, 120) }} />
                    </div>
                    {formData.employed === 'Yes' && (
                      <div className="mt-5">
                        <p className="text-lg font-semibold text-[var(--paper-text)] mb-3" style={SANS}>What is your employer&apos;s name?</p>
                        <input
                          type="text"
                          autoFocus
                          value={formData.employerName}
                          onChange={e => update('employerName', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') goNext() }}
                          placeholder="Employer name"
                          className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]"
                        />
                      </div>
                    )}
                    <div className="h-[60px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.employed}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* JOB SEARCH OR TRAINING */}
                {currentStep === 'jobSearchOrTraining' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you looking for a job or going to a training program for work?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.jobSearchOrTraining === o}
                          onClick={() => { update('jobSearchOrTraining', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.jobSearchOrTraining}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* DSS ACTIVITIES */}
                {currentStep === 'dssActivities' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you participate in activities required by your local Department of Social Services?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.dssActivities === o}
                          onClick={() => { update('dssActivities', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.dssActivities}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* VOCATIONAL PROGRAM */}
                {currentStep === 'vocationalProgram' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you need help paying for child care while attending a trade or vocational program?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.vocationalProgram === o}
                          onClick={() => { update('vocationalProgram', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.vocationalProgram}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* COLLEGE */}
                {currentStep === 'college' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you attending a community college, two-year college, or four-year college?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.college === o}
                          onClick={() => { update('college', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.college}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* BASIC EDUCATION */}
                {currentStep === 'basicEducation' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you need help paying for child care while taking classes to learn to read, write, do math, or speak English?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.basicEducation === o}
                          onClick={() => { update('basicEducation', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.basicEducation}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* HS OR GED */}
                {currentStep === 'hsOrGed' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you need help paying for child care while taking high school or GED classes?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.hsOrGed === o}
                          onClick={() => { update('hsOrGed', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.hsOrGed}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* FAMILY DUTIES */}
                {currentStep === 'familyDuties' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you have family duties that take you away from home?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.familyDuties === o}
                          onClick={() => { update('familyDuties', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.familyDuties}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* DISABILITY */}
                {currentStep === 'disability' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you need help paying for child care because you are not physically or mentally able to care for a child?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.disability === o}
                          onClick={() => { update('disability', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.disability}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* DOMESTIC VIOLENCE */}
                {currentStep === 'domesticViolence' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you a victim of domestic violence in need of child care?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.domesticViolence === o}
                          onClick={() => { update('domesticViolence', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.domesticViolence}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* SUBSTANCE PROGRAM */}
                {currentStep === 'substanceProgram' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you currently attending drug or alcohol treatment programs?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.substanceProgram === o}
                          onClick={() => { update('substanceProgram', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.substanceProgram}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* HOMELESS */}
                {currentStep === 'homeless' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Are you currently experiencing homelessness? This can include going through a short-term emergency.</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.homeless === o}
                          onClick={() => { update('homeless', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.homeless}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* ASSETS */}
                {currentStep === 'assets' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you have family resources or assets worth more than one million dollars?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(o => (
                        <BigButton key={o} label={o} selected={formData.assets === o}
                          onClick={() => { update('assets', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.assets}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* INCOME INTRO */}
                {currentStep === 'incomeIntro' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Almost there.</h2>
                    <p className="text-lg text-[var(--paper-text)] leading-relaxed mb-2" style={SANS}>
                      The next questions have to do with how much money you and the people in your household receive.
                    </p>
                    <p className="text-base text-[var(--paper-muted)] leading-relaxed" style={SANS}>
                      We know that money is a very private matter, but we need to ask about it to see if you might be able to receive help paying for child care.
                    </p>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* INCOME */}
                {currentStep === 'income' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Tell us about your household income.</h2>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--paper-muted)] mb-1.5" style={SANS}>
                          Total number of people living in your household (including yourself)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          autoFocus
                          value={formData.householdSize}
                          onChange={e => update('householdSize', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && formData.householdSize) incomeRef.current?.focus() }}
                          placeholder="e.g. 3"
                          className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--paper-muted)] mb-1.5" style={SANS}>
                          Total gross monthly household income (before taxes)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--paper-faint)]" style={SANS}>$</span>
                          <input
                            ref={incomeRef}
                            type="number"
                            min="0"
                            value={formData.monthlyIncome}
                            onChange={e => update('monthlyIncome', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && canContinue.income) goNext() }}
                            placeholder="e.g. 3500"
                            style={SANS}
                            className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] pl-8 pr-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--paper-faint)]" style={SANS}>Include income from work and all other sources for everyone age 18 or older in your household.</p>
                      </div>
                    </div>
                    <BiggerButton onClick={goNext} disabled={!canContinue.income}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* BENEFITS */}
                {currentStep === 'benefits' && (
                  <div>
                    <h2 className="mb-2 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Do you or any adult applying with you currently receive any of the following?</h2>
                    <p className="text-base text-[var(--paper-muted)] mb-6" style={SANS}>Select all that apply.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {BENEFIT_OPTIONS.map(({ label, tooltip }) => {
                        const isNone = label === 'None of these'
                        const checked = formData.benefits.includes(label)
                        return (
                          <CheckItem
                            key={label}
                            label={label}
                            tooltip={tooltip}
                            checked={checked}
                            onClick={() => {
                              if (isNone) {
                                update('benefits', checked ? [] : ['None of these'])
                              } else {
                                const next = checked
                                  ? formData.benefits.filter(b => b !== label)
                                  : [...formData.benefits.filter(b => b !== 'None of these'), label]
                                update('benefits', next)
                              }
                            }}
                          />
                        )
                      })}
                    </div>
                    <BiggerButton onClick={goNext} disabled={!canContinue.benefits} >CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* CONTACT */}
                {currentStep === 'contact' && (
                  <div>
                    <h2 className="mb-6 leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                      {formData.firstName ? `${formData.firstName}, almost done!` : 'Almost done!'} Where should we send your results?
                    </h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="text" value={formData.firstName} onChange={e => update('firstName', e.target.value)}
                        placeholder="Sarah"
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                      <input type="text" value={formData.lastName} onChange={e => update('lastName', e.target.value)}
                        placeholder="Johnson"
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input type="email" value={formData.email} onChange={e => update('email', e.target.value)}
                        placeholder="sarah@mail.com"
                        className="w-full rounded-xl border-2 border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 text-lg text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[#2f6d6a]" />
                      <input type="tel" value={formData.phone} onChange={e => update('phone', formatPhone(e.target.value))}
                        placeholder="(555) 555-5555"
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
                      GET MY ELIGIBILITY RESULTS →
                    </BiggerButton>
                    <p className="mt-3 text-center text-xs text-[var(--paper-faint)]" style={SANS}>
                      Your answers will not be shared with government agencies without your consent.
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

     </RevealFx>
    </AppLayout>
  )
}
