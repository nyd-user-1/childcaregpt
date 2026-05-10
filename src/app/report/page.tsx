'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, X, ArrowUp, MapPin, CheckCircle } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { AppLogo } from '@/components/AppLogo'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT       = '#0ea5e9'
const ACCENT_HOVER = '#0284c7'

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
      <div className="h-4 w-full rounded-full bg-gray-200">
        <div className="h-4 rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
      </div>
      <p className="mt-2 text-center text-sm font-semibold" style={{ color: ACCENT }}>
        {pct}% · {progressLabel(pct)}
      </p>
    </div>
  )
}

function CardOption({ label, tooltip, selected, onClick }: {
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
        className={
          'w-full cursor-pointer rounded-xl border-2 px-6 py-4 text-center text-lg font-medium transition-all ' +
          (selected
            ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:border-[#0ea5e9]')
        }
      >
        {label}
      </button>
    </div>
  )
}

function AccentButton({ children, onClick, disabled = false }: {
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

// ─── Childcare Assistant Drawer ───────────────────────────────────────────────

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

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
      content: `AI integration coming soon. Explore childcare options${formData.address ? ` near ${formData.address}` : ''} using the maps and data pages.`,
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
              <p className="text-sm text-gray-400 max-w-[200px]">Ask anything about childcare options and costs in your area.</p>
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
              placeholder="Ask about childcare in your area…"
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

export default function ReportPage() {
  const [step, setStep]         = useState<Step>('address')
  const [stepIdx, setStepIdx]   = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData())
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [animating, setAnimating]     = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
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
        <div className="flex flex-1 flex-col items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <AppLogo className="h-12 w-12 animate-spin" />
            <p className="text-xl font-semibold text-gray-800">Finding childcare options near you…</p>
            <p className="text-sm text-gray-500 max-w-xs">Searching licensed providers, costs, and subsidy programs</p>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 pb-10 pt-4">
              <div className="mx-auto max-w-lg">
                <h1 className="text-2xl font-bold text-gray-900">Here&apos;s your childcare snapshot</h1>
                {formData.address && <p className="mt-1 text-sm text-gray-400">{formData.address}</p>}

                {/* Cost card */}
                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-4xl font-bold text-gray-900">
                        ${snapshot.weeklyCost.toLocaleString()}<span className="text-xl font-normal text-gray-400">/wk</span>
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        median {formData.ageGroup || 'center-based'} care cost · NY 2022
                      </p>
                      <p className="mt-1 text-sm font-medium text-green-600">
                        ~${snapshot.annualCost.toLocaleString()}/yr before subsidies
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssistantOpen(true)}
                      className="relative rounded-xl bg-sky-50 px-3 py-2 border border-transparent hover:border-[#0ea5e9] transition-colors shrink-0"
                      style={{ color: ACCENT }}
                      title="Ask about your options"
                    >
                      <AppLogo className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-1">
                    {[
                      { name: 'Child Care Subsidy (CCDF)',       value: 'Up to $12,000/yr'   },
                      { name: 'Child Tax Credit (CTC)',           value: 'Up to $2,000/child' },
                      { name: 'Child & Dependent Care Credit',   value: 'Up to $1,050/child' },
                    ].map(r => (
                      <div key={r.name} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-gray-800">{r.name}</span>
                        </div>
                        <span className="font-medium text-green-600">{r.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="my-4 flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-xs text-gray-300">Your search</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>

                  <div className="space-y-1">
                    {[
                      formData.numChildren && { label: 'Children needing care', value: formData.numChildren },
                      formData.ageGroup    && { label: 'Age group',             value: formData.ageGroup    },
                      formData.careType    && { label: 'Care type',             value: formData.careType    },
                      formData.settingPref && { label: 'Setting preference',    value: formData.settingPref },
                    ].filter(Boolean).map(row => row && (
                      <div key={row.label} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-300 shrink-0" />
                          <span className="text-gray-400">{row.label}</span>
                        </div>
                        <span className="text-gray-500 font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA card */}
                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-400 text-center">Ready to find licensed providers near you?</p>
                  <button
                    className="mt-4 w-full rounded-xl py-3 text-base font-semibold text-white transition-colors"
                    style={{ backgroundColor: ACCENT }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT_HOVER }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT }}
                  >
                    Find Providers Near You
                  </button>
                  <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-xs text-gray-300">or</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  <p className="text-sm text-gray-400 text-center">Have questions? Talk to a childcare advisor.</p>
                  <a href="tel:18003459152" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gray-100 px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                    (800) 345-9152
                  </a>
                  <p className="mt-3 text-center text-xs text-gray-400">No obligation · Free resource · NYS Child Care Hotline</p>
                </div>

                <p className="mt-6 text-center text-xs text-gray-300">
                  Costs based on DOL National Database of Childcare Prices · NY 2022. Your actual costs will vary by provider and location. Powered by ChildcareGPT.
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

                {stepIdx > 0 && (
                  <button type="button" onClick={goBack}
                    className="mb-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Previous Question
                  </button>
                )}

                {/* ADDRESS */}
                {currentStep === 'address' && (
                  <div>
                    <div className="mb-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-400">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Find childcare options in your area.</h2>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border-2 border-transparent bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.10)] focus-within:border-[#0ea5e9] focus-within:shadow-none transition-all">
                        <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={e => { update('address', e.target.value); update('placeId', ''); fetchSuggestions(e.target.value) }}
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
                    <AccentButton onClick={goNext} disabled={!formData.address}>
                      GET MY CHILDCARE REPORT →
                    </AccentButton>
                    <p className="mt-2 text-xs text-gray-400">*Supported by data from NYS OCFS and DOL.</p>
                  </div>
                )}

                {/* NUM CHILDREN */}
                {currentStep === 'numChildren' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">How many children need care?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['1 child', '2 children', '3 children', '4+ children'].map(o => (
                        <CardOption key={o} label={o} selected={formData.numChildren === o}
                          onClick={() => { update('numChildren', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.numChildren}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* AGE GROUP — no sub-text */}
                {currentStep === 'ageGroup' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What are the ages of your children?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Infant (0–12 mo)', 'Toddler (1–3 yr)', 'Preschool (3–5 yr)', 'School-age (5+ yr)'].map(o => (
                        <CardOption key={o} label={o} selected={formData.ageGroup === o}
                          onClick={() => { update('ageGroup', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.ageGroup}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* CARE TYPE */}
                {currentStep === 'careType' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What type of care are you looking for?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Full-time', 'Part-time', 'Before & After School', 'Occasional / Drop-in'].map(o => (
                        <CardOption key={o} label={o} selected={formData.careType === o}
                          onClick={() => { update('careType', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.careType}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* BUDGET */}
                {currentStep === 'budget' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What&apos;s your weekly childcare budget?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(BUDGET_MAP).map(o => (
                        <CardOption key={o} label={o} selected={formData.budget === o}
                          onClick={() => { update('budget', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <AccentButton onClick={goNext} disabled={!formData.budget}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* START DATE */}
                {currentStep === 'startDate' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">When do you need care to start?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['ASAP', '1–3 months', '3–6 months', 'Just exploring'].map(o => (
                        <CardOption key={o} label={o} selected={formData.startDate === o}
                          onClick={() => { update('startDate', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.startDate}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* PRIORITY — no tooltips */}
                {currentStep === 'priority' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">What matters most in a provider?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Location / Proximity', 'Cost / Affordability', 'Curriculum / Education', 'Flexible Hours'].map(o => (
                        <CardOption key={o} label={o} selected={formData.priority === o}
                          onClick={() => { update('priority', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.priority}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* SUBSIDY — no tooltips */}
                {currentStep === 'subsidy' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Are you interested in subsidy assistance?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes, definitely', 'Possibly', 'Not sure', 'No'].map(o => (
                        <CardOption key={o} label={o} selected={formData.subsidy === o}
                          onClick={() => { update('subsidy', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.subsidy}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* SETTING PREF — tooltips kept, fixed wrapping */}
                {currentStep === 'settingPref' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Do you have a preference for care setting?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {['Day Care Center', 'Family Day Care', 'Group Family Care', 'No preference'].map(o => (
                        <CardOption key={o} label={o} selected={formData.settingPref === o}
                          onClick={() => { update('settingPref', o); setTimeout(goNext, 120) }} />
                      ))}
                    </div>
                    <div className="h-[68px]" />
                    <AccentButton onClick={goNext} disabled={!formData.settingPref}>CONTINUE →</AccentButton>
                  </div>
                )}

                {/* CONTACT */}
                {currentStep === 'contact' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                      {formData.firstName ? `${formData.firstName}, great news!` : 'Great news!'} We found options in your area.
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
                    <AccentButton onClick={goNext} disabled={!canContinue.contact}>
                      Find My Childcare Options →
                    </AccentButton>
                    <p className="mt-3 text-center text-xs text-gray-400">
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
