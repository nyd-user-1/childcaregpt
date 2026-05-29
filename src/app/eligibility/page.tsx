'use client'

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, X, ArrowUp, MapPin, CheckCircle, XCircle, ChevronDown, Check, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { AppLogo } from '@/components/AppLogo'
import { RevealFx } from '@/components/RevealFx'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT       = '#0ea5e9'
const ACCENT_HOVER = '#0284c7'

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
    address: '', placeId: '',
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
      <div className="h-4 w-full rounded-full bg-gray-200">
        <div className="h-4 rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
      </div>
      <p className="mt-2 text-center text-sm font-semibold" style={{ color: ACCENT }}>
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
      className={
        'w-full cursor-pointer rounded-xl border-2 px-6 py-4 text-center text-lg font-medium transition-all ' +
        (selected
          ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#0ea5e9]')
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
      style={{ backgroundColor: disabled ? '#ccc' : ACCENT }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = ACCENT }}
    >
      {children}
    </button>
  )
}

// ─── Assistant Drawer ─────────────────────────────────────────────────────────

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

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
        className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
          checked
            ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9]'
            : 'border-gray-200 bg-white text-gray-700 hover:border-[#0ea5e9]'
        }`}
      >
        <div className={`h-5 w-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
          checked ? 'border-[#0ea5e9] bg-[#0ea5e9]' : 'border-gray-300'
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative mt-4" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-base transition-all ${
          open ? 'border-[#0ea5e9] shadow-none' : 'border-gray-200'
        }`}
      >
        <span className={value ? 'text-gray-700' : 'text-gray-400'}>{value || 'Select your county…'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-20 overflow-hidden border border-gray-100">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {NY_COUNTIES.map(county => (
              <button
                key={county}
                type="button"
                onClick={() => { onChange(county); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                  value === county
                    ? 'bg-sky-50 text-[#0ea5e9] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
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

function AssistantContent({ open, onClose, formData }: {
  open: boolean; onClose: () => void; formData: FormData
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMsg(text: string) {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `AI integration coming soon. For CCAP eligibility questions${formData.address ? ` in ${formData.address}` : ''}, contact your local Department of Social Services.`,
    }])
    setLoading(false)
  }

  function handleSubmit() {
    const t = input.trim()
    if (!t || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendMsg(t)
  }

  return (
    <div className={`fixed inset-y-0 right-0 z-50 sm:static sm:inset-auto sm:z-auto shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${open ? 'w-full sm:w-[418px] sm:ml-[18px]' : 'w-0'}`}>
      {open && <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={onClose} />}
      <div className="relative h-full w-full sm:w-[418px] bg-white sm:rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 shrink-0">
          <span className="flex-1 text-base font-semibold text-gray-900">Childcare Assistant</span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 pt-12 text-center">
              <AppLogo className="h-10 w-10" />
              <p className="text-sm text-gray-400 max-w-[200px]">Ask anything about CCAP eligibility and how to apply.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-2.5">
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {msg.content || (loading && i === messages.length - 1 && (
                    <div className="flex items-center gap-2 py-2">
                      <AppLogo className="h-4 w-4 animate-pulse" />
                      <span className="text-gray-400">Thinking…</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="pointer-events-none relative h-8 -mt-8 shrink-0 bg-gradient-to-t from-white to-transparent" />
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-gray-100">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="Ask about CCAP eligibility…"
              className="flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none leading-relaxed"
              style={{ minHeight: '20px', maxHeight: '120px' }}
            />
            <button onClick={handleSubmit} disabled={!input.trim() || loading}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40 transition-opacity hover:opacity-80"
              style={{ backgroundColor: ACCENT }}>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssistantDrawer(props: Parameters<typeof AssistantContent>[0]) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const root = document.getElementById('chat-panel-root')
  if (!root) return null
  return createPortal(<AssistantContent {...props} />, root)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EligibilityPage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>('address')
  const [stepIdx, setStepIdx]   = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData())
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [animating, setAnimating]     = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [smsConsent, setSmsConsent]   = useState(true)
  const [selectedCounty, setSelectedCounty] = useState('')
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const incomeRef    = useRef<HTMLInputElement>(null)

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
    setFormData(prev => ({ ...prev, address: s.description, placeId: s.place_id }))
    setSuggestions([])
    goNext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const { outcome: eligibility, failReason, incomeLimit } = determineEligibility(formData)

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
        <div className="flex flex-1 flex-col items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <AppLogo className="h-12 w-12 animate-spin" />
            <p className="text-xl font-semibold text-gray-800">Checking your eligibility…</p>
            <p className="text-sm text-gray-500 max-w-xs">Reviewing your answers against CCAP program requirements</p>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 pb-10 pt-4">
              <div className="mx-auto max-w-lg">

                {eligibility === 'eligible' ? (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
                      <h1 className="text-2xl font-bold text-gray-900">You May Be Eligible</h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      Based on your answers, you may qualify for the Child Care Assistance Program (CCAP).
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <XCircle className="h-8 w-8 text-red-400 shrink-0" />
                      <h1 className="text-2xl font-bold text-gray-900">You May Not Be Eligible</h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {failReason === 'assets' && 'Households with resources over $1,000,000 do not qualify for CCAP.'}
                      {failReason === 'no-activity' && 'CCAP requires a qualifying activity such as employment, job search, or education. None were indicated.'}
                      {failReason === 'income' && incomeLimit != null && `Your household income exceeds the 2026 CCAP limit of $${incomeLimit.toLocaleString()}/mo for a household of ${formData.householdSize}.`}
                    </p>
                  </>
                )}

                {/* Summary card */}
                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700">Child Care Assistance Program (CCAP)</p>
                      <p className="mt-0.5 text-sm text-gray-500">NYS Office of Children and Family Services</p>
                      {eligibility === 'eligible' && (
                        <p className="mt-1 text-sm font-medium text-green-600">Income-based subsidy · Up to full coverage</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssistantOpen(true)}
                      className="relative rounded-xl bg-sky-50 px-3 py-2 border border-transparent hover:border-[#0ea5e9] transition-colors shrink-0"
                      style={{ color: ACCENT }}
                      title="Ask about CCAP"
                    >
                      <AppLogo className="h-4 w-4" />
                    </button>
                  </div>

                  {eligibility === 'eligible' && (
                    <div className="mt-5 space-y-1">
                      {[
                        { label: 'Program',             value: 'Child Care Assistance Program' },
                        { label: 'Administered by',     value: 'Local Dept. of Social Services' },
                        { label: 'Date of birth',       value: formData.dateOfBirth || '—' },
                        { label: 'Marital status',      value: formData.maritalStatus || '—' },
                        { label: 'Primary language',    value: formData.language || '—' },
                        { label: 'Household size',      value: formData.householdSize ? `${formData.householdSize} ${Number(formData.householdSize) === 1 ? 'person' : 'people'}` : '—' },
                        { label: 'Your monthly income', value: formData.monthlyIncome ? `$${Number(formData.monthlyIncome).toLocaleString()}/mo` : '—' },
                        { label: '2026 income limit',   value: incomeLimit != null ? `$${incomeLimit.toLocaleString()}/mo` : '—' },
                        { label: 'Benefits received',   value: formData.benefits.length > 0 ? formData.benefits.join(', ') : '—' },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-300 shrink-0" />
                            <span className="text-gray-400">{r.label}</span>
                          </div>
                          <span className="text-gray-500 font-medium">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA card */}
                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-400 text-center">
                    {eligibility === 'eligible'
                      ? 'Select your county to find your local office and apply.'
                      : 'Select your county for other childcare resources near you.'}
                  </p>

                  <CountySelect value={selectedCounty} onChange={setSelectedCounty} />

                  <button
                    className="mt-3 w-full rounded-xl py-3 text-base font-semibold text-white transition-colors"
                    style={{ backgroundColor: ACCENT }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT }}
                    onClick={() => {
                      if (eligibility === 'eligible') {
                        localStorage.setItem('ccap-eligibility-data', JSON.stringify({ ...formData, county: selectedCounty }))
                        router.push('/application')
                      }
                    }}
                  >
                    {eligibility === 'eligible' ? 'Apply for CCAP →' : 'Find Local Resources →'}
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-xs text-gray-300">or</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>

                  <p className="text-sm text-gray-400 text-center">Have questions? Call the NY Child Care Helpline.</p>
                  <a href="tel:18003459152" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gray-100 px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                    (800) 345-9152
                  </a>
                  <p className="mt-3 text-center text-xs text-gray-400">
                    No obligation · Free service · NYS OCFS
                  </p>
                </div>

                <p className="mt-6 text-center text-xs text-gray-300">
                  This screening is based on general CCAP eligibility criteria. Final eligibility is determined by your local Department of Social Services. Powered by ChildcareGPT.
                </p>
              </div>
            </div>
          </div>

          <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} formData={formData} />
        </div>
      )}

      {/* ── Form steps ── */}
      {step !== 'loading' && step !== 'result' && (
        <div className={`flex flex-1 flex-col bg-white animate-zoom-in transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col justify-center px-4 py-6">
              <div className="mx-auto w-full max-w-3xl min-h-[400px]">

                <div className="mb-4 flex items-center justify-between">
                  {stepIdx > 0 ? (
                    <button type="button" onClick={goBack}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <ArrowLeft className="h-4 w-4" />
                      Previous Question
                    </button>
                  ) : <div />}
                  {stepIdx > 0 && (
                    <button type="button" onClick={resetForm}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <RotateCcw className="h-4 w-4" />
                      Start Over
                    </button>
                  )}
                </div>

                {/* ADDRESS */}
                {currentStep === 'address' && (
                  <div>
                    <div className="mb-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-400">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Check if you qualify for low or no-cost child care.</h2>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border-2 border-transparent bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.10)] focus-within:border-[#0ea5e9] focus-within:shadow-none transition-all">
                        <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={e => { update('address', e.target.value); update('placeId', ''); fetchSuggestions(e.target.value) }}
                          onKeyDown={e => { if (e.key === 'Enter' && formData.address) goNext() }}
                          placeholder="Enter an address"
                          className="flex-1 text-lg text-gray-700 outline-none bg-transparent"
                        />
                      </div>
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-10 overflow-hidden">
                          {suggestions.map(s => (
                            <button key={s.place_id} type="button" onClick={() => selectAddress(s)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
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
                    <p className="mt-2 text-xs text-gray-400">*Screening based on NYS CCAP eligibility criteria. Your answers will not be saved.</p>
                  </div>
                )}

                {/* DATE OF BIRTH */}
                {currentStep === 'dateOfBirth' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What is your date of birth?</h2>
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
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]"
                    />
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext} disabled={!formData.dateOfBirth}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* MARITAL STATUS */}
                {currentStep === 'maritalStatus' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What is your marital status?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What is your primary language?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you have a child younger than 18 with special needs or under court supervision in need of child care?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you have a child aged 18 with special needs or under court supervision who attends high school or job-specific training?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you a foster parent in need of care for a foster child?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you work?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <BigButton label="Yes" selected={formData.employed === 'Yes'}
                        onClick={() => update('employed', 'Yes')} />
                      <BigButton label="No" selected={formData.employed === 'No'}
                        onClick={() => { update('employed', 'No'); update('employerName', ''); setTimeout(goNext, 120) }} />
                    </div>
                    {formData.employed === 'Yes' && (
                      <div className="mt-5">
                        <p className="text-lg font-semibold text-gray-700 mb-3">What is your employer&apos;s name?</p>
                        <input
                          type="text"
                          autoFocus
                          value={formData.employerName}
                          onChange={e => update('employerName', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') goNext() }}
                          placeholder="Employer name"
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]"
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you looking for a job or going to a training program for work?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you participate in activities required by your local Department of Social Services?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you need help paying for child care while attending a trade or vocational program?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you attending a community college, two-year college, or four-year college?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you need help paying for child care while taking classes to learn to read, write, do math, or speak English?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you need help paying for child care while taking high school or GED classes?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you have family duties that take you away from home?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you need help paying for child care because you are not physically or mentally able to care for a child?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you a victim of domestic violence in need of child care?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you currently attending drug or alcohol treatment programs?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you currently experiencing homelessness? This can include going through a short-term emergency.</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you have family resources or assets worth more than one million dollars?</h2>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Almost there.</h2>
                    <p className="text-lg text-gray-600 leading-relaxed mb-2">
                      The next questions have to do with how much money you and the people in your household receive.
                    </p>
                    <p className="text-base text-gray-500 leading-relaxed">
                      We know that money is a very private matter, but we need to ask about it to see if you might be able to receive help paying for child care.
                    </p>
                    <div className="h-[68px]" />
                    <BiggerButton onClick={goNext}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* INCOME */}
                {currentStep === 'income' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Tell us about your household income.</h2>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
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
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Total gross monthly household income (before taxes)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">$</span>
                          <input
                            ref={incomeRef}
                            type="number"
                            min="0"
                            value={formData.monthlyIncome}
                            onChange={e => update('monthlyIncome', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && canContinue.income) goNext() }}
                            placeholder="e.g. 3500"
                            className="w-full rounded-xl border-2 border-gray-200 bg-white pl-8 pr-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-gray-400">Include income from work and all other sources for everyone age 18 or older in your household.</p>
                      </div>
                    </div>
                    <BiggerButton onClick={goNext} disabled={!canContinue.income}>CONTINUE →</BiggerButton>
                  </div>
                )}

                {/* BENEFITS */}
                {currentStep === 'benefits' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Do you or any adult applying with you currently receive any of the following?</h2>
                    <p className="text-base text-gray-500 mb-6">Select all that apply.</p>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                      {formData.firstName ? `${formData.firstName}, almost done!` : 'Almost done!'} Where should we send your results?
                    </h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="text" value={formData.firstName} onChange={e => update('firstName', e.target.value)}
                        placeholder="Sarah"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]" />
                      <input type="text" value={formData.lastName} onChange={e => update('lastName', e.target.value)}
                        placeholder="Johnson"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input type="email" value={formData.email} onChange={e => update('email', e.target.value)}
                        placeholder="sarah@mail.com"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]" />
                      <input type="tel" value={formData.phone} onChange={e => update('phone', formatPhone(e.target.value))}
                        placeholder="(555) 555-5555"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#0ea5e9]" />
                    </div>
                    <div className="flex items-start gap-3 mb-4">
                      <input id="sms-consent" type="checkbox" checked={smsConsent}
                        onChange={e => setSmsConsent(e.target.checked)}
                        className="mt-1 h-4 w-4" style={{ accentColor: ACCENT }} />
                      <label htmlFor="sms-consent" className="text-xs text-gray-500 leading-relaxed">
                        By submitting this form, you agree to receive SMS messages from ChildcareGPT at the phone number provided. Message &amp; data rates may apply. Reply STOP to opt out and HELP for help.
                      </label>
                    </div>
                    <BiggerButton onClick={goNext} disabled={!canContinue.contact}>
                      GET MY ELIGIBILITY RESULTS →
                    </BiggerButton>
                    <p className="mt-3 text-center text-xs text-gray-400">
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
