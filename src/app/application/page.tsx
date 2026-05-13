'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Download, ArrowLeft, ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PDFDocument, StandardFonts } from 'pdf-lib'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EligData {
  firstName: string; lastName: string; email: string; phone: string
  address: string; county: string
  dateOfBirth: string; maritalStatus: string; language: string
  employed: string; employerName: string
  jobSearchOrTraining: string; vocationalProgram: string
  college: string; basicEducation: string; hsOrGed: string
  homeless: string; domesticViolence: string; disability: string
  substanceProgram: string; dssActivities: string
  householdSize: string; monthlyIncome: string
  benefits: string[]
  childSpecialNeeds: string
}

interface HouseholdMember {
  name: string; dob: string; sex: string; relationship: string; needsCare: string
  citizen: string; specialNeeds: string; bothParents: string
  parentAvailable: string; parentReason: string; parentReasonOther: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filled(v: string | undefined) { return !!(v && v.trim() && v !== 'No') }

function parseAddress(addr: string): { street: string; city: string; state: string; zip: string } {
  if (!addr.trim()) return { street: '', city: '', state: 'NY', zip: '' }
  const s = addr.trim().toLowerCase()
  const zipMatch = s.match(/\b(\d{5})(-\d{4})?\s*$/)
  const zip = zipMatch ? zipMatch[1] : ''
  let rest = zip ? s.slice(0, s.lastIndexOf(zip)).trim() : s
  const stateMatch = rest.match(/\s+([a-z]{2})\s*$/)
  const state = stateMatch ? stateMatch[1].toUpperCase() : 'NY'
  if (stateMatch) rest = rest.slice(0, rest.lastIndexOf(stateMatch[0])).trim()
  const typeRe = /\b(avenue|ave|street|st|road|rd|drive|dr|boulevard|blvd|court|ct|lane|ln|place|pl|way|circle|cir|highway|hwy|trail|trl|parkway|pkwy|square|sq|loop|run)\b/i
  const m = typeRe.exec(rest)
  const titleCase = (t: string) => t.replace(/\b\w/g, c => c.toUpperCase())
  if (m) {
    const end = m.index + m[0].length
    return { street: titleCase(rest.slice(0, end).trim()), city: titleCase(rest.slice(end).trim()), state, zip }
  }
  return { street: titleCase(rest), city: '', state, zip }
}

function PortalTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  function show() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.top + window.scrollY, left: r.left + window.scrollX })
    setVisible(true)
  }

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={() => setVisible(false)} className="cursor-default">
      {children}
      {visible && ReactDOM.createPortal(
        <div
          style={{ position: 'absolute', top: pos.top - 4, left: pos.left, transform: 'translateY(-100%)', zIndex: 9999 }}
          className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
}

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, prefilled = false, placeholder = '', type = 'text', half = false, noUppercase = false, warned = false, id,
}: {
  label: string; value: string; onChange: (v: string) => void
  prefilled?: boolean; placeholder?: string; type?: string; half?: boolean; noUppercase?: boolean; warned?: boolean; id?: string
}) {
  const shouldWarn = warned && !value
  return (
    <div className={half ? 'flex-1 min-w-0' : 'w-full'}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <span className={shouldWarn ? 'warn-pulse rounded-lg block' : 'block'}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
          prefilled
            ? 'border-[#0ea5e9] bg-sky-50 text-gray-800'
            : 'border-gray-200 bg-white text-gray-700 focus:border-[#0ea5e9]'
        }`}
      />
      </span>
    </div>
  )
}

function CheckField({ label, checked, onChange, prefilled = false }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; prefilled?: boolean
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer text-sm ${prefilled ? 'text-[#0ea5e9] font-medium' : 'text-gray-700'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 rounded"
        style={{ accentColor: '#0ea5e9' }}
      />
      {label}
    </label>
  )
}

function SectionCard({ title, subtitle, prefilled, status, warned, ready, onConfirm, collapsed, onToggle, children }: {
  title: string; subtitle?: string; prefilled?: boolean
  status?: 'confirmed' | 'flagged'; warned?: boolean; ready?: boolean; onConfirm?: () => void
  collapsed?: boolean; onToggle?: () => void; children: React.ReactNode
}) {
  const hasStatus = !!status
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-visible">
      <div
        className={`px-6 py-4 bg-gray-50 flex items-center justify-between gap-4 rounded-t-2xl ${!collapsed ? 'border-b border-gray-100' : ''} ${hasStatus ? 'cursor-pointer select-none' : ''}`}
        onClick={hasStatus ? onToggle : undefined}
      >
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && !collapsed && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {prefilled && (
          <div className="relative group shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onConfirm?.() }}
              className={`inline-flex items-center justify-center h-6 w-6 rounded-full border text-xs font-bold transition-colors ${
                status === 'confirmed'
                  ? 'bg-green-50 border-green-500 text-green-600 cursor-pointer ring-2 ring-green-400 ring-offset-1'
                  : status === 'flagged'
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-600 cursor-pointer ring-2 ring-yellow-300 ring-offset-1'
                  : warned
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-600 cursor-pointer warn-pulse'
                  : ready
                  ? 'bg-sky-50 border-[#0ea5e9] text-[#0ea5e9] cursor-pointer ready-pulse'
                  : 'bg-sky-50 border-[#0ea5e9] text-[#0ea5e9] cursor-pointer hover:bg-sky-100 hover:ring-2 hover:ring-[#0ea5e9] hover:ring-offset-1'
              }`}
            >
              ✓
            </button>
            <div className="pointer-events-none absolute right-0 top-8 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50">
              {warned ? 'Click the yellow items first' : status === 'confirmed' ? 'Mark as incomplete' : 'Click to confirm'}
            </div>
          </div>
        )}
      </div>
      {!collapsed && <div className="px-6 py-5 space-y-4">{children}</div>}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 flex-wrap">{children}</div>
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ScheduleGrid({ label, schedule, onChange }: {
  label: string; schedule: Record<string, string>; onChange: (s: Record<string, string>) => void
}) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm text-gray-700">{label}</p>}
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map(day => (
          <div key={day}>
            <div className="text-[10px] font-semibold text-gray-400 text-center uppercase mb-1">{day}</div>
            <input
              value={schedule[day.toLowerCase()] || ''}
              onChange={e => onChange({ ...schedule, [day.toLowerCase()]: e.target.value })}
              placeholder="—"
              className="w-full rounded border border-gray-200 px-1 py-1 text-xs text-center outline-none focus:border-[#0ea5e9]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PrefilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-[#0ea5e9] px-2 py-0.5 text-[10px] font-semibold text-[#0ea5e9]">
      ✓ Pre-filled
    </span>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = ['About', 'Household', 'Activities', 'Household Income', 'Signature']

function TabBar({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex items-center gap-0 overflow-x-auto no-scrollbar">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`shrink-0 px-4 pb-3 pt-1 text-sm border-b-2 transition-colors whitespace-nowrap ${
              active === i
                ? 'border-[#0ea5e9] text-gray-900 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-700 font-medium'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 pb-2 shrink-0">
          <button
            onClick={() => onChange(Math.max(0, active - 1))}
            disabled={active === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChange(Math.min(TABS.length - 1, active + 1))}
            disabled={active === TABS.length - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const [elig, setElig] = useState<EligData | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)

  function goToTab(next: number) {
    setSlideDir(next > activeTab ? 'forward' : 'back')
    setAnimKey(k => k + 1)
    setActiveTab(next)
  }

  // ── Form state ───────────────────────────────────────────────────────────
  const [firstName,      setFirstName]      = useState('')
  const [lastName,       setLastName]       = useState('')
  const [street,         setStreet]         = useState('')
  const [city,           setCity]           = useState('')
  const [stateField,     setStateField]     = useState('NY')
  const [county,         setCounty]         = useState('')
  const [zip,            setZip]            = useState('')
  const [phone,          setPhone]          = useState('')
  const [phoneType,      setPhoneType]      = useState('')
  const [email,          setEmail]          = useState('')
  const [language,       setLanguage]       = useState('')
  const [maritalStatus,  setMaritalStatus]  = useState('')
  const [dateOfBirth,    setDateOfBirth]    = useState('')

  // Benefits
  const [benefits, setBenefits] = useState<Record<string, boolean>>({
    Medicaid: false, SNAP: false, 'Housing Assistance': false, HEAP: false, WIC: false,
    'Social Security Income': false, 'Head Start or Early Head Start': false,
    'Cash Assistance': false, 'None of these': false,
  })

  // Circumstances
  const [homeless,       setHomeless]       = useState('')
  const [military,       setMilitary]       = useState('No')
  const [natGuard,       setNatGuard]       = useState('No')
  const [otherFunding,   setOtherFunding]   = useState('No')
  const [otherAgency,    setOtherAgency]    = useState('')
  const [reasonForCare,  setReasonForCare]  = useState('')

  // Household members
  const [members, setMembers] = useState<HouseholdMember[]>(
    Array.from({ length: 12 }, (_, i) => ({ name: '', dob: '', sex: '', relationship: i === 0 ? 'Self' : '', needsCare: '', citizen: '', specialNeeds: '', bothParents: '', parentAvailable: 'No', parentReason: '', parentReasonOther: '' }))
  )
  const [visibleRows, setVisibleRows] = useState(4)

  // Activities
  const [employed,       setEmployed]       = useState('')
  const [employerName,   setEmployerName]   = useState('')
  const [hoursPerWeek,   setHoursPerWeek]   = useState('')
  const [lookingForWork, setLookingForWork] = useState('')
  const [startingNewJob,         setStartingNewJob]         = useState('')
  const [newJobStartDate,        setNewJobStartDate]        = useState('')
  const [jobScheduleChanges,     setJobScheduleChanges]     = useState('No')
  const [workSchedule,           setWorkSchedule]           = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })
  const [multipleJobs,           setMultipleJobs]           = useState('No')
  const [inTraining,     setInTraining]     = useState('')
  const [trainingName,   setTrainingName]   = useState('')
  const [trainingHours,  setTrainingHours]  = useState('')
  const [startingTraining,       setStartingTraining]       = useState('')
  const [trainingStartDate,      setTrainingStartDate]      = useState('')
  const [trainingScheduleChanges,setTrainingScheduleChanges]= useState('No')
  const [trainingSchedule,       setTrainingSchedule]       = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })
  const [inCollege,      setInCollege]      = useState('')
  const [schoolName,     setSchoolName]     = useState('')
  const [schoolHours,    setSchoolHours]    = useState('')
  const [startingCollege,        setStartingCollege]        = useState('')
  const [collegeStartDate,       setCollegeStartDate]       = useState('')
  const [collegeScheduleChanges, setCollegeScheduleChanges] = useState('No')
  const [classSchedule,          setClassSchedule]          = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })

  // Adult 2 Activities
  const [a2Employed,             setA2Employed]             = useState('')
  const [a2EmployerName,         setA2EmployerName]         = useState('')
  const [a2HoursPerWeek,         setA2HoursPerWeek]         = useState('')
  const [a2StartingNewJob,       setA2StartingNewJob]       = useState('')
  const [a2NewJobStartDate,      setA2NewJobStartDate]      = useState('')
  const [a2JobScheduleChanges,   setA2JobScheduleChanges]   = useState('No')
  const [a2WorkSchedule,         setA2WorkSchedule]         = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })
  const [a2MultipleJobs,         setA2MultipleJobs]         = useState('')
  const [a2LookingForWork,       setA2LookingForWork]       = useState('')
  const [a2InTraining,           setA2InTraining]           = useState('')
  const [a2TrainingName,         setA2TrainingName]         = useState('')
  const [a2TrainingHours,        setA2TrainingHours]        = useState('')
  const [a2StartingTraining,     setA2StartingTraining]     = useState('')
  const [a2TrainingStartDate,    setA2TrainingStartDate]    = useState('')
  const [a2TrainingScheduleChanges, setA2TrainingScheduleChanges] = useState('No')
  const [a2TrainingSchedule,     setA2TrainingSchedule]     = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })
  const [a2InCollege,            setA2InCollege]            = useState('')
  const [a2SchoolName,           setA2SchoolName]           = useState('')
  const [a2SchoolHours,          setA2SchoolHours]          = useState('')
  const [a2StartingCollege,      setA2StartingCollege]      = useState('')
  const [a2CollegeStartDate,     setA2CollegeStartDate]     = useState('')
  const [a2CollegeScheduleChanges, setA2CollegeScheduleChanges] = useState('No')
  const [a2ClassSchedule,        setA2ClassSchedule]        = useState<Record<string,string>>({ sun:'',mon:'',tue:'',wed:'',thu:'',fri:'',sat:'' })

  // Income
  const [incomeAmount,   setIncomeAmount]   = useState('')
  const [incomePeriod,   setIncomePeriod]   = useState('month')

  const INCOME_KEYS = ['work', 'selfEmp', 'childSupport', 'alimony', 'unemp', 'ssa', 'disability', 'rental', 'dividends', 'pension', 'pa', 'other']
  const [incomeSelections, setIncomeSelections] = useState<Record<string, 'yes' | 'no'>>(() =>
    Object.fromEntries(INCOME_KEYS.map(k => [k, 'no'])) as Record<string, 'yes' | 'no'>
  )
  const [incomeConfirmed, setIncomeConfirmed] = useState<Set<string>>(new Set())
  const [incomeWho1,   setIncomeWho1]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomeAmt1,   setIncomeAmt1]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomePer1,   setIncomePer1]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomeWho2,   setIncomeWho2]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomeAmt2,   setIncomeAmt2]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomePer2,   setIncomePer2]   = useState<Record<string,string>>(() => Object.fromEntries(INCOME_KEYS.map(k => [k, ''])))
  const [incomeOtherLabel, setIncomeOtherLabel] = useState('')
  const [showPerson2, setShowPerson2] = useState(false)

  const incomeDragging = useRef(false)
  const incomeDragCol  = useRef<'yes' | 'no'>('no')

  useEffect(() => {
    const stop = () => { incomeDragging.current = false }
    document.addEventListener('mouseup', stop)
    return () => document.removeEventListener('mouseup', stop)
  }, [])

  function selectIncome(key: string, val: 'yes' | 'no') {
    setIncomeSelections(prev => ({ ...prev, [key]: val }))
    setIncomeConfirmed(prev => { const next = new Set(prev); next.add(key); return next })
  }

  function startIncomeDrag(key: string, col: 'yes' | 'no') {
    incomeDragging.current = true
    incomeDragCol.current  = col
    selectIncome(key, col)
  }

  function enterIncomeCell(key: string, col: 'yes' | 'no') {
    if (incomeDragging.current && incomeDragCol.current === col) selectIncome(key, col)
  }

  // Signature
  const [printName,          setPrintName]          = useState('')
  const [dateSigned,         setDateSigned]         = useState('')
  const [attestationChecked, setAttestationChecked] = useState(false)

  // Confirmation tracking
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'confirmed' | 'flagged'>>({})
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [warnedSections, setWarnedSections] = useState<Set<string>>(new Set())

  function warnSection(key: string) {
    setWarnedSections(prev => { const next = new Set(prev); next.add(key); return next })
  }

  function confirmSection(key: string) {
    setWarnedSections(prev => { const next = new Set(prev); next.delete(key); return next })
    setSectionStatus(prev => {
      const current = prev[key]
      const next = { ...prev }
      if (!current || current === 'flagged') {
        next[key] = 'confirmed'
        setCollapsedSections(c => { const n = new Set(c); n.add(key); return n })
      } else {
        next[key] = 'flagged'
        setCollapsedSections(c => { const n = new Set(c); n.delete(key); return n })
      }
      return next
    })
  }

  function toggleSection(key: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // Auto-confirm warned sections once their yellow items are all clicked
  useEffect(() => {
    if (warnedSections.has('circumstances') && !!homeless && !!military && !!natGuard && !!otherFunding) confirmSection('circumstances')
    if (warnedSections.has('activities') && checkActivitiesOk()) confirmSection('activities')
  }, [touched]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (warnedSections.has('members') && !members.slice(0, visibleRows).some(m => m.name && !m.sex)) confirmSection('members')
  }, [members]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance tab when all confirmable sections on current tab are confirmed
  useEffect(() => {
    const hasAbsentParent = members.slice(0, visibleRows).some(m => m.needsCare === 'Y' && m.bothParents === 'N')
    const tabSections: Record<number, string[]> = {
      0: ['about', 'benefits'],
      1: [...(!!homeless ? ['circumstances'] : []), 'members', ...(hasAbsentParent ? ['absentParent'] : [])],
      2: ['activities', ...(members.slice(1, visibleRows).some(m => m.name.trim() && m.relationship.toLowerCase().includes('adult')) ? ['activities2'] : [])],
      3: !!incomeAmount ? ['income'] : [],
    }
    const required = tabSections[activeTab] ?? []
    if (required.length > 0 && required.every(k => sectionStatus[k] === 'confirmed')) {
      setSlideDir('forward')
      setAnimKey(k => k + 1)
      setActiveTab(t => Math.min(t + 1, TABS.length - 1))
    }
  }, [sectionStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  function markTouched(key: string) {
    setTouched(prev => { const next = new Set(prev); next.add(key); return next })
  }

  // Auto-populate Who? fields with applicant name when name changes (only if field is still blank)
  useEffect(() => {
    const fullName = `${firstName} ${lastName}`.trim()
    if (!fullName) return
    setIncomeWho1(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v || fullName])))
  }, [firstName, lastName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load & pre-fill from eligibility ────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('ccap-eligibility-data')
    if (!raw) return
    const d: EligData = JSON.parse(raw)
    setElig(d)

    setFirstName(d.firstName || '')
    setLastName(d.lastName || '')
    setPhone(formatPhone(d.phone || ''))
    setPhoneType('Cell')
    setEmail(d.email || '')
    setCounty(d.county || '')
    setDateOfBirth(formatDob(d.dateOfBirth || ''))
    setMaritalStatus(d.maritalStatus || '')
    setLanguage(d.language || '')
    setEmployerName(d.employerName || '')
    setPrintName(`${d.firstName || ''} ${d.lastName || ''}`.trim())

    if (d.address) {
      const parsed = parseAddress(d.address)
      setStreet(parsed.street)
      setCity(parsed.city)
      setStateField(parsed.state || 'NY')
      setZip(parsed.zip)
    }

    const newTouched = new Set<string>()

    if (d.homeless) { setHomeless(d.homeless); newTouched.add('homeless') }
    else setHomeless('No')

    if (d.employed) { setEmployed(d.employed); newTouched.add('employed') }
    else setEmployed('')

    if (d.jobSearchOrTraining === 'Yes') { setLookingForWork('Yes'); newTouched.add('lookingForWork') }
    else setLookingForWork('')

    const hasTraining = (['vocationalProgram', 'basicEducation', 'hsOrGed', 'substanceProgram'] as (keyof EligData)[]).some(k => d[k] === 'Yes')
    if (hasTraining) { setInTraining('Yes'); newTouched.add('inTraining') }
    else setInTraining('')

    if (d.college === 'Yes') { setInCollege('Yes'); newTouched.add('inCollege') }
    else setInCollege('')

    setTouched(newTouched)

    if (d.monthlyIncome) {
      setIncomeAmount(d.monthlyIncome)
      setIncomeSelections(prev => ({ ...prev, work: 'yes' }))
      setIncomeConfirmed(prev => { const next = new Set(prev); next.add('work'); return next })
    }

    if (d.benefits?.length) {
      setBenefits(prev => {
        const next = { ...prev }
        d.benefits.forEach(b => { if (b in next) next[b] = true })
        return next
      })
    }

    setMembers(prev => {
      const next = [...prev]
      next[0] = {
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        dob: d.dateOfBirth || '',
        sex: '',
        relationship: 'Self',
        needsCare: 'N',
        citizen: '', specialNeeds: '', bothParents: '',
        parentAvailable: 'No', parentReason: '', parentReasonOther: '',
      }
      return next
    })

    const reasons: string[] = []
    if (d.employed === 'Yes')            reasons.push('Employment')
    if (d.jobSearchOrTraining === 'Yes') reasons.push('Job search / training')
    if (d.college === 'Yes')             reasons.push('College')
    if (d.basicEducation === 'Yes')      reasons.push('Basic education')
    if (d.hsOrGed === 'Yes')             reasons.push('HS / GED classes')
    if (d.disability === 'Yes')          reasons.push('Disability')
    if (d.domesticViolence === 'Yes')    reasons.push('Domestic violence')
    if (d.substanceProgram === 'Yes')    reasons.push('Substance treatment')
    if (d.dssActivities === 'Yes')       reasons.push('DSS-required activities')
    setReasonForCare(reasons.join('; '))
  }, [])

  function updateMember(idx: number, field: keyof HouseholdMember, val: string) {
    setMembers(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: val }; return next })
  }

  const hasPrefill = !!elig
  const prefilled = (val: string) => filled(val)

  function checkActivitiesOk() {
    if (inTraining === '' || inCollege === '') return false
    if (inTraining === 'No' && startingTraining === '') return false
    if (inCollege === 'No' && startingCollege === '') return false
    if (employed === 'No' || employed === '') {
      if (startingNewJob === '') return false
      if (startingNewJob === 'No' && lookingForWork === '') return false
    }
    return true
  }

  const hasOtherAdult = members.slice(1, visibleRows).some(m => m.name.trim() && m.relationship.toLowerCase().includes('adult'))

  function rowStyle(_key: string, _val: string): string {
    return 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors'
  }

  function blockStyle(_key: string, _val: string): string {
    return 'border-gray-100'
  }

  function confirmCircumstances() {
    const ok = !!homeless && !!military && !!natGuard && !!otherFunding
    ok ? confirmSection('circumstances') : warnSection('circumstances')
  }

  const unconfirmedMap: Record<string, string> = {
    military, natGuard, otherFunding, lookingForWork, inTraining, inCollege,
  }
  const unconfirmedCount = Object.entries(unconfirmedMap).filter(([k, v]) => v && !touched.has(k)).length

  async function exportPDF() {
    try {
    const baseBytes = await fetch('/OCFS-6025.pdf').then(r => r.arrayBuffer())
    const pdfDoc = await PDFDocument.load(baseBytes)
    const form  = pdfDoc.getForm()

    function tf(name: string, val: string) {
      try { form.getTextField(name).setText(val || '') } catch {}
    }
    function cb(name: string, checked: boolean) {
      try { const f = form.getCheckBox(name); checked ? f.check() : f.uncheck() } catch {}
    }
    function yn(base: string, val: string | undefined) {
      cb(`${base}_yes`, val === 'Yes')
      cb(`${base}_no`,  val === 'No')
    }

    // ── PAGE 1 ───────────────────────────────────────────────────────────────
    tf('full_name',      `${firstName} ${lastName}`.trim())
    tf('address_street', street)
    tf('address_city',   city)
    tf('address_state',  stateField)
    tf('address_county', county)
    tf('address_zip',    zip)

    const phoneDigits = phone.replace(/\D/g, '')
    tf('phone_area',   phoneDigits.slice(0, 3))
    tf('phone_prefix', phoneDigits.slice(3, 6))
    tf('phone_line',   phoneDigits.slice(6, 10))
    cb('phone_type_cell', true)

    tf('email', email)

    cb('lang_english', language === 'English')
    cb('lang_spanish', language === 'Spanish')
    cb('lang_other',   language === 'Haitian' || language === 'Other')

    cb('marital_single',    maritalStatus === 'Single')
    cb('marital_married',   maritalStatus === 'Married')
    cb('marital_divorced',  maritalStatus === 'Divorced')
    cb('marital_separated', maritalStatus === 'Separated')
    cb('marital_widowed',   maritalStatus === 'Widowed')

    cb('benefit_medicaid',   !!benefits['Medicaid'])
    cb('benefit_snap',       !!benefits['SNAP'])
    cb('benefit_housing',    !!benefits['Housing Assistance'])
    cb('benefit_heap',       !!benefits['HEAP'])
    cb('benefit_wic',        !!benefits['WIC'])
    cb('benefit_headstart',  !!benefits['Head Start or Early Head Start'])
    cb('benefit_tanf',       !!benefits['Cash Assistance'])
    cb('benefit_none',       !!benefits['None of these'])

    yn('homeless',        homeless)
    yn('military_active', military)
    yn('military_reserve', natGuard)
    yn('other_funding',   otherFunding)
    tf('other_funding_agency',    otherAgency)
    tf('reason_child_care_needed', reasonForCare)

    // ── PAGE 2 ───────────────────────────────────────────────────────────────
    members.slice(0, visibleRows).forEach((m, i) => {
      const n = i + 1
      tf(`hh${n}_name`,         m.name)
      tf(`hh${n}_dob`,          m.dob)
      tf(`hh${n}_sex`,          m.sex)
      tf(`hh${n}_relationship`,  m.relationship)
      tf(`hh${n}_needs_care`,   m.needsCare)
      tf(`hh${n}_us_citizen`,   m.citizen)
      tf(`hh${n}_special_needs`, m.specialNeeds)
      tf(`hh${n}_both_parents`,  m.bothParents)
    })

    const absentKids = members.slice(0, visibleRows).filter(m => m.needsCare === 'Y' && m.bothParents === 'N')
    absentKids.forEach((m, i) => {
      const n = i + 1
      tf(`parent_not_home_${n}_name`, m.name)
      cb(`parent_not_home_${n}_available_yes`, m.parentAvailable === 'Yes')
      cb(`parent_not_home_${n}_available_no`,  m.parentAvailable === 'No')
      if (m.parentAvailable === 'No') {
        tf(`parent_not_home_${n}_reason`,
          m.parentReason === 'Other' ? m.parentReasonOther : m.parentReason)
      }
    })

    // ── PAGE 3 ───────────────────────────────────────────────────────────────
    yn('work_need_care',        employed)
    yn('work_about_to_start',   startingNewJob)
    yn('work_looking_work',     lookingForWork)
    yn('work_schedule_changes', jobScheduleChanges)
    yn('work_more_than_one',    multipleJobs)
    tf('work_start_date',    newJobStartDate)
    tf('work_employer_name', employerName)
    tf('work_hours_per_week', hoursPerWeek)
    tf('work_sched_sun', workSchedule['sun']); tf('work_sched_mon', workSchedule['mon'])
    tf('work_sched_tue', workSchedule['tue']); tf('work_sched_wed', workSchedule['wed'])
    tf('work_sched_thu', workSchedule['thu']); tf('work_sched_fri', workSchedule['fri'])
    tf('work_sched_sat', workSchedule['sat'])

    yn('training_need_care',        inTraining)
    yn('training_about_to_start',   startingTraining)
    yn('training_schedule_changes', trainingScheduleChanges)
    tf('training_start_date',    trainingStartDate)
    tf('training_program_name',  trainingName)
    tf('training_hours_per_week', trainingHours)
    tf('training_sched_sun', trainingSchedule['sun']); tf('training_sched_mon', trainingSchedule['mon'])
    tf('training_sched_tue', trainingSchedule['tue']); tf('training_sched_wed', trainingSchedule['wed'])
    tf('training_sched_thu', trainingSchedule['thu']); tf('training_sched_fri', trainingSchedule['fri'])
    tf('training_sched_sat', trainingSchedule['sat'])

    yn('college_need_care',        inCollege)
    yn('college_about_to_start',   startingCollege)
    yn('college_schedule_changes', collegeScheduleChanges)
    tf('college_start_date',   collegeStartDate)
    tf('college_school_name',  schoolName)
    tf('college_hours_per_week', schoolHours)
    tf('college_sched_sun', classSchedule['sun']); tf('college_sched_mon', classSchedule['mon'])
    tf('college_sched_tue', classSchedule['tue']); tf('college_sched_wed', classSchedule['wed'])
    tf('college_sched_thu', classSchedule['thu']); tf('college_sched_fri', classSchedule['fri'])
    tf('college_sched_sat', classSchedule['sat'])

    // ── PAGE 4: Income ───────────────────────────────────────────────────────
    const incomeSources: [string, string][] = [
      ['work', 'work'], ['selfEmp', 'self_employment'], ['childSupport', 'child_support'],
      ['alimony', 'alimony'], ['unemp', 'unemployment'], ['ssa', 'social_security'],
      ['disability', 'disability'], ['rental', 'rental'], ['dividends', 'dividends'],
      ['pension', 'pensions'], ['pa', 'public_assistance'], ['other', 'other'],
    ]
    incomeSources.forEach(([key, field]) => {
      cb(`income_${field}_yes`, incomeSelections[key] === 'yes')
      cb(`income_${field}_no`,  incomeSelections[key] === 'no')
      tf(`income_${field}_who1`,   incomeWho1[key] || '')
      tf(`income_${field}_amount1`, incomeAmt1[key] || (key === 'work' && incomeAmount ? `$${Number(incomeAmount).toLocaleString()}` : ''))
      tf(`income_${field}_period1`, incomePer1[key] || (key === 'work' ? incomePeriod || '' : ''))
      tf(`income_${field}_who2`,   incomeWho2[key] || '')
      tf(`income_${field}_amount2`, incomeAmt2[key] || '')
      tf(`income_${field}_period2`, incomePer2[key] || '')
    })
    if (incomeOtherLabel) tf('income_other_label', incomeOtherLabel)

    // ── PAGE 5: Signature ─────────────────────────────────────────────────────
    cb('attestation_agree', attestationChecked)
    tf('sig_applicant_print_name',  printName)
    tf('sig_applicant_date_signed', dateSigned)

    // Regenerate appearance streams so checkboxes render visually checked
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica)
    form.updateFieldAppearances(helv)

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `OCFS-6025-${firstName || 'Application'}-${lastName || ''}.pdf`.replace(/\s+/g, '-')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (err) {
      console.error('Export failed:', err)
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-4xl px-5 py-8">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NYS Application for Child Care Assistance</h1>
              <p className="text-xs text-gray-400 mt-1">OCFS-6025 (Rev. 06/2024)</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { localStorage.removeItem('ccap-eligibility-data'); window.location.reload() }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restart
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <TabBar active={activeTab} onChange={goToTab} />

          <style>{`
            @keyframes slideInRight { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInLeft  { from { transform: translateX(-28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            .slide-forward { animation: slideInRight 0.38s ease-out; }
            .slide-back    { animation: slideInLeft  0.38s ease-out; }
            @keyframes warn-pulse { 0%, 100% { box-shadow: 0 0 0 2px rgba(234,179,8,0.5); } 50% { box-shadow: 0 0 0 5px rgba(234,179,8,0.08); } }
            .warn-pulse { animation: warn-pulse 1.4s ease-in-out infinite; }
            @keyframes ready-pulse { 0%, 100% { box-shadow: 0 0 0 2px rgba(14,165,233,0.6); } 50% { box-shadow: 0 0 0 5px rgba(14,165,233,0.1); } }
            .ready-pulse { animation: ready-pulse 1.4s ease-in-out infinite; }
          `}</style>

          <div key={animKey} className={slideDir === 'forward' ? 'slide-forward' : 'slide-back'}>
          <div className="space-y-5">

            {/* ── Tab 0: About ── */}
            {activeTab === 0 && (
              <>
              <SectionCard title="Tell us about yourself." prefilled={true} status={sectionStatus['about']} warned={warnedSections.has('about')} ready={!sectionStatus['about'] && !warnedSections.has('about') && !!(firstName && lastName && street && city && stateField && zip && county && phone && dateOfBirth && language && maritalStatus)} onConfirm={() => {
                  const ok = firstName && lastName && street && city && stateField && zip && county && phone && dateOfBirth && language && maritalStatus
                  ok ? confirmSection('about') : warnSection('about')
                }} collapsed={collapsedSections.has('about')} onToggle={() => toggleSection('about')}>
                {(() => { const w = warnedSections.has('about'); return (
                <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><Field label="First Name" value={firstName} onChange={setFirstName} prefilled={prefilled(firstName)} warned={w} /></div>
                  <div className="col-span-2"><Field label="Last Name"  value={lastName}  onChange={setLastName}  prefilled={prefilled(lastName)}  warned={w} /></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><Field label="Street Address" value={street} onChange={setStreet} prefilled={prefilled(street)} warned={w} /></div>
                  <div className="col-span-1"><Field label="City"  value={city}       onChange={setCity}       prefilled={!!city} placeholder="City" warned={w} /></div>
                  <div className="col-span-1"><Field label="State" value={stateField} onChange={setStateField} prefilled={!!stateField} placeholder="NY" warned={w} /></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1"><Field label="Zip Code" value={zip} onChange={v => { const z = v.replace(/\D/g,'').slice(0,5); setZip(z); if (z.length === 5) setTimeout(() => document.getElementById('county-field')?.focus(), 0) }} prefilled={!!zip} placeholder="00000" type="tel" warned={w} /></div>
                  <div className="col-span-1"><Field id="county-field" label="County" value={county} onChange={setCounty} prefilled={prefilled(county)} warned={w} /></div>
                  <div className="col-span-2"><Field label="Phone Number"  value={phone}  onChange={v => setPhone(formatPhone(v))}  prefilled={prefilled(phone)} type="tel" warned={w} /></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><Field label="Email (optional)" value={email} onChange={v => setEmail(v.toLowerCase())} prefilled={prefilled(email)} type="email" /></div>
                  <div className="col-span-2"><Field label="Date of Birth"    value={dateOfBirth} onChange={v => setDateOfBirth(formatDob(v))} prefilled={prefilled(dateOfBirth)} placeholder="MM-DD-YYYY" warned={w} /></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Primary Language</label>
                    <span className={w && !language ? 'warn-pulse rounded-lg inline-flex flex-wrap gap-2' : 'inline-flex flex-wrap gap-2'}>
                      {['English', 'Spanish', 'Haitian', 'Other'].map(l => (
                        <button key={l} type="button" onClick={() => setLanguage(l)}
                          className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                            language === l
                              ? 'border-[#0ea5e9] bg-sky-50 text-gray-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                          }`}>
                          {l}
                        </button>
                      ))}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Marital Status</label>
                    <span className={w && !maritalStatus ? 'warn-pulse rounded-lg inline-flex flex-wrap gap-2' : 'inline-flex flex-wrap gap-2'}>
                      {['Single', 'Married', 'Divorced', 'Separated', 'Widowed'].map(m => (
                        <button key={m} type="button" onClick={() => setMaritalStatus(m)}
                          className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                            maritalStatus === m
                              ? 'border-[#0ea5e9] bg-sky-50 text-gray-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                          }`}>
                          {m}
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
                </>
                )})()}
              </SectionCard>

              {sectionStatus['about'] === 'confirmed' && (
              <SectionCard
                title="Do you or any adult applying with you receive any of the following benefits?"
                prefilled={true}
                status={sectionStatus['benefits']}
                warned={warnedSections.has('benefits')}
                onConfirm={() => {
                  const anySelected = Object.values(benefits).some(Boolean)
                  anySelected ? confirmSection('benefits') : warnSection('benefits')
                }}
                collapsed={collapsedSections.has('benefits')}
                onToggle={() => toggleSection('benefits')}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(benefits).map(([label, checked]) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 -mx-2 -my-1 hover:bg-gray-100 transition-colors">
                      <input
                        type="radio"
                        name={`benefit-${label}`}
                        checked={checked}
                        onChange={() => {
                          if (label === 'None of these') {
                            // Clear all others, select only this
                            setBenefits(prev => Object.fromEntries(Object.keys(prev).map(k => [k, k === 'None of these'])) as typeof prev)
                          } else {
                            // Clear "None of these", toggle this one on
                            setBenefits(prev => ({ ...prev, 'None of these': false, [label]: true }))
                          }
                        }}
                        onClick={() => {
                          if (checked) setBenefits(prev => ({ ...prev, [label]: false }))
                        }}
                        style={{ accentColor: '#0ea5e9' }}
                      />
                      <span className={`text-sm ${checked ? 'text-[#0ea5e9] font-medium' : 'text-gray-700'}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </SectionCard>
              )}
              </>
            )}

            {/* ── Tab 1: Household ── */}
            {activeTab === 1 && (
              <>
              <SectionCard title="Tell us about your household's circumstances." subtitle="Do any of these apply to you or any adult(s) applying with you?" prefilled={true} status={sectionStatus['circumstances']} warned={warnedSections.has('circumstances')} ready={!sectionStatus['circumstances'] && !warnedSections.has('circumstances') && !!homeless && !!military && !!natGuard && !!otherFunding} onConfirm={confirmCircumstances} collapsed={collapsedSections.has('circumstances')} onToggle={() => toggleSection('circumstances')}>
                <div className="space-y-3">
                  {[
                    { label: 'Homeless (no fixed, regular and adequate place to stay at night)', val: homeless, set: setHomeless, key: 'homeless', pre: false },
                    { label: 'A parent is on active duty (serving full time) in the U.S. Military', val: military, set: setMilitary, key: 'military', pre: false },
                    { label: 'A parent is a member of the National Guard or Military Reserve Unit', val: natGuard, set: setNatGuard, key: 'natGuard', pre: false },
                    { label: 'Receiving or applying for other child care funding', val: otherFunding, set: setOtherFunding, key: 'otherFunding', pre: false },
                  ].map(({ label, val, set, key, pre }) => (
                    <div
                      key={label}
                      onClick={() => markTouched(key)}
                      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle(key, val)}`}
                    >
                      <span className={`text-sm ${pre ? 'font-medium text-[#0ea5e9]' : 'text-gray-700'}`}>
                        {label}
                      </span>
                      <div className="flex gap-4 shrink-0">
                        {['Yes', 'No'].map(o => {
                          const isYellow = o === 'No' && !!val && !touched.has(key)
                          const shouldPulse = isYellow && warnedSections.has('circumstances')
                          return (
                            <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                              <span className={shouldPulse ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                <input type="radio" name={label} value={o}
                                  checked={val === o}
                                  onChange={() => { set(o); markTouched(key) }}
                                  onClick={() => markTouched(key)}
                                  style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                              </span>
                              {o}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {otherFunding === 'Yes' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 ${rowStyle('otherAgency', otherAgency)}`}>
                      <span className="text-sm text-gray-700">Other funding agency name</span>
                      <input
                        autoFocus
                        value={otherAgency}
                        onChange={e => setOtherAgency(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('reasonForCare')?.focus() }}
                        placeholder="Agency name"
                        className={`w-1/2 border-0 border-b px-1 py-0 text-sm text-right outline-none transition-colors bg-transparent ${
                          otherAgency ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'
                        }`}
                      />
                    </div>
                  )}
                  <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 ${rowStyle('reasonForCare', reasonForCare)}`}>
                    <span className="text-sm text-gray-700">
                      Reason(s) child care is needed
                    </span>
                    <input
                      id="reasonForCare"
                      value={reasonForCare}
                      onChange={e => setReasonForCare(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmCircumstances() }}
                      placeholder="e.g. Employment, College"
                      className={`w-1/3 border-0 border-b px-1 py-0 text-sm text-right outline-none transition-colors bg-transparent ${
                        prefilled(reasonForCare)
                          ? 'border-[#0ea5e9] text-gray-800'
                          : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'
                      }`}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Tell us about everyone in your home."
                subtitle="Complete remaining rows for all household members."
                prefilled={true}
                status={sectionStatus['members']}
                onConfirm={() => {
                  const missingSex = members.slice(0, visibleRows).some(m => m.name && !m.sex)
                  missingSex ? warnSection('members') : confirmSection('members')
                }}
                warned={warnedSections.has('members')}
                collapsed={collapsedSections.has('members')}
                onToggle={() => toggleSection('members')}
              >
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-2 py-2 font-semibold text-gray-500">Name</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-500 w-28">Date of Birth</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-500 w-28">Sex</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-500 w-36">
                          <PortalTooltip text="Does the child need care?">Needs Care?</PortalTooltip>
                        </th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-500 w-36">
                          <PortalTooltip text="Relationship to You">Relationship</PortalTooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.slice(0, visibleRows).map((m, i) => {
                        const isPrefilled = i === 0 && !!elig
                        const isComplete = !!(m.name && m.dob.length === 10 && m.sex && m.relationship && m.needsCare)
                        const rowBg = isPrefilled || isComplete ? 'bg-sky-50' : ''
                        const blue = isPrefilled || isComplete
                        const cellClass = (pre: boolean) => `w-full rounded border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-0 ${(pre || isComplete) ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`
                        const selectClass = `w-full rounded border px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-0 ${blue ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`
                        const sexWarn = warnedSections.has('members') && !!m.name && !m.sex
                        const sexClass = `w-full rounded border px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-offset-0 ${sexWarn ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : blue ? 'border-[#0ea5e9] bg-sky-50 focus:ring-[#0ea5e9]' : 'border-gray-200 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]'}`

                        function focusNext(col: 'dob' | 'sex' | 'rel' | 'care' | 'nextName') {
                          const id = col === 'nextName' ? `member-name-${i + 1}` : `member-${col}-${i}`
                          setTimeout(() => { (document.getElementById(id) as HTMLElement | null)?.focus() }, 0)
                        }

                        return (
                          <React.Fragment key={i}>
                            <tr className={`border-b border-gray-50 ${rowBg}`}>
                              <td className="px-2 py-1.5">
                                <input id={`member-name-${i}`} value={m.name}
                                  onChange={e => updateMember(i, 'name', e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') focusNext('dob') }}
                                  className={cellClass(isPrefilled)} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input id={`member-dob-${i}`} value={m.dob}
                                  onChange={e => { const fmt = formatDob(e.target.value); updateMember(i, 'dob', fmt); if (fmt.length === 10) focusNext('sex') }}
                                  placeholder="MM-DD-YYYY" className={cellClass(isPrefilled && !!m.dob)} />
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={sexWarn ? 'warn-pulse rounded inline-block w-full' : 'inline-block w-full'}>
                                  <select id={`member-sex-${i}`} value={m.sex}
                                    onChange={e => { updateMember(i, 'sex', e.target.value); if (e.target.value) focusNext('care') }}
                                    className={sexClass}>
                                    <option value="">—</option>
                                    <option>M</option><option>F</option><option>X</option>
                                  </select>
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <select id={`member-care-${i}`} value={m.needsCare}
                                  onChange={e => {
                                    updateMember(i, 'needsCare', e.target.value)
                                    if (e.target.value) focusNext('rel')
                                  }}
                                  className={selectClass}>
                                  <option value="">—</option>
                                  <option value="Y">Yes</option><option value="N">No</option>
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                {i === 0 ? (
                                  <input value="Self" readOnly className={`w-full rounded border px-2 py-1 text-xs border-[#0ea5e9] bg-sky-50 text-gray-800 outline-none`} />
                                ) : (
                                  <select id={`member-rel-${i}`} value={m.relationship}
                                    onChange={e => {
                                      updateMember(i, 'relationship', e.target.value)
                                      if (e.target.value && m.needsCare === 'Y' && i + 1 < visibleRows) focusNext('nextName')
                                    }}
                                    className={selectClass}>
                                    <option value="">—</option>
                                    <option value="Child">Child</option>
                                    <option value="Adult">Adult</option>
                                  </select>
                                )}
                              </td>
                            </tr>
                            {isComplete && m.needsCare === 'Y' && i > 0 && (
                              <tr className={`border-b border-dashed border-gray-100 ${rowBg}`}>
                                <td className="px-2 py-1.5 text-[#0ea5e9] flex items-center gap-1.5 text-[10px] text-gray-400 italic">
                                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-[#0ea5e9]" />
                                  child details
                                </td>
                                <td colSpan={2} className="px-2 py-1.5">
                                  <select id={`member-sn-${i}`} value={m.specialNeeds}
                                    onChange={e => { updateMember(i, 'specialNeeds', e.target.value); if (e.target.value) setTimeout(() => document.getElementById(`member-bp-${i}`)?.focus(), 0) }}
                                    className={selectClass}>
                                    <option value="">Special needs?</option><option value="Y">Yes</option><option value="N">No</option>
                                  </select>
                                </td>
                                <td className="px-2 py-1.5">
                                  <select id={`member-bp-${i}`} value={m.bothParents}
                                    onChange={e => { updateMember(i, 'bothParents', e.target.value); if (e.target.value) setTimeout(() => document.getElementById(`member-citizen-${i}`)?.focus(), 0) }}
                                    className={selectClass}>
                                    <option value="">Both parents?</option><option value="Y">Yes</option><option value="N">No</option>
                                  </select>
                                </td>
                                <td className="px-2 py-1.5">
                                  <select id={`member-citizen-${i}`} value={m.citizen}
                                    onChange={e => {
                                      updateMember(i, 'citizen', e.target.value)
                                      if (e.target.value) {
                                        if (i + 1 < visibleRows) setTimeout(() => document.getElementById(`member-name-${i + 1}`)?.focus(), 0)
                                        else if (i + 1 < 12) { setVisibleRows(v => Math.min(v + 1, 12)); setTimeout(() => document.getElementById(`member-name-${i + 1}`)?.focus(), 50) }
                                      }
                                    }}
                                    className={selectClass}>
                                    <option value="">Citizen?</option><option value="Y">Yes</option><option value="N">No</option>
                                  </select>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                      {visibleRows < 12 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-2">
                            <button onClick={() => setVisibleRows(v => Math.min(v + 1, 12))}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0ea5e9] transition-colors">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 hover:border-[#0ea5e9] text-sm leading-none">+</span>
                              Add member
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              {/* Absent parent section — only shown when any child has bothParents = N */}
              {members.slice(0, visibleRows).some(m => m.needsCare === 'Y' && m.bothParents === 'N') && (
                <SectionCard
                  title="Tell us about parent(s) who do not live in the home."
                  subtitle="List all the children who need child care, whose parent does not live in the home."
                  prefilled
                  status={sectionStatus['absentParent']}
                  warned={warnedSections.has('absentParent')}
                  onConfirm={() => {
                    const ok = members.slice(0, visibleRows).filter(m => m.needsCare === 'Y' && m.bothParents === 'N').every((_, idx) => touched.has(`parentAvail-${idx}`))
                    ok ? confirmSection('absentParent') : warnSection('absentParent')
                  }}
                  collapsed={collapsedSections.has('absentParent')}
                  onToggle={() => toggleSection('absentParent')}
                >
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-3 py-2 font-semibold text-gray-500">Name of child</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-500 w-64">Is the parent that does not live in the home available to provide care?</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-500">If no, please provide the reason.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.slice(0, visibleRows).map((m, i) => {
                          if (m.needsCare !== 'Y' || m.bothParents !== 'N') return null
                          const paKey = `parentAvail-${i}`
                          const paTouched = touched.has(paKey)
                          const paColor = m.parentAvailable === 'No' && !paTouched ? '#eab308' : '#0ea5e9'
                          return (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-700 font-medium">{m.name || '—'}</td>
                              <td className="px-3 py-2">
                                <div className="flex gap-4">
                                  {['Yes', 'No'].map(o => (
                                    <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1 -m-1">
                                      <input type="radio" name={`parentAvail-${i}`} value={o}
                                        checked={m.parentAvailable === o}
                                        onChange={() => { updateMember(i, 'parentAvailable', o); markTouched(paKey) }}
                                        onClick={() => {
                                          markTouched(paKey)
                                          if (o === 'No') setTimeout(() => document.getElementById(`parentReason-${i}`)?.focus(), 0)
                                        }}
                                        style={{ accentColor: paColor }} />
                                      {o}
                                    </label>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2 space-y-1.5">
                                <select
                                  id={`parentReason-${i}`}
                                  value={m.parentReason}
                                  onChange={e => updateMember(i, 'parentReason', e.target.value)}
                                  disabled={m.parentAvailable !== 'No'}
                                  className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9] disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                  <option value="">Select…</option>
                                  <option value="Unavailable">Unavailable</option>
                                  <option value="Incarcerated">Incarcerated</option>
                                  <option value="Deceased">Deceased</option>
                                  <option value="Other">Other</option>
                                </select>
                                {m.parentReason === 'Other' && (
                                  <input
                                    value={m.parentReasonOther}
                                    onChange={e => updateMember(i, 'parentReasonOther', e.target.value)}
                                    placeholder="Please describe…"
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]"
                                  />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}
              </>
            )}

            {/* ── Tab 2: Job / Activities ── */}
            {activeTab === 2 && (
              <>
              <SectionCard title="Tell us about your job and other activities." prefilled={true} status={sectionStatus['activities']} warned={warnedSections.has('activities')} ready={!sectionStatus['activities'] && !warnedSections.has('activities') && checkActivitiesOk()} onConfirm={() => { checkActivitiesOk() ? confirmSection('activities') : warnSection('activities') }}>

                {/* Employment — three bordered rows */}
                <div className="space-y-3">

                  {/* Row 1: Do you need child care because you are working? */}
                  <div onClick={() => markTouched('employed')} className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('employed', employed)}`}>
                    <span className="text-sm text-gray-700">Do you need child care because you are working?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => (
                        <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                          <input type="radio" name="employed" value={o} checked={employed === o}
                            onChange={() => { setEmployed(o); markTouched('employed'); if (o !== 'No') { setStartingNewJob(''); setLookingForWork('') } }}
                            style={{ accentColor: '#0ea5e9' }} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sub-fields when working = Yes */}
                  {employed === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input
                          value={employerName}
                          onChange={e => setEmployerName(e.target.value)}
                          placeholder="Employer Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${
                            employerName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'
                          }`}
                        />
                        <input
                          value={hoursPerWeek}
                          onChange={e => setHoursPerWeek(e.target.value.replace(/\D/g,'').slice(0,3))}
                          placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${
                            hoursPerWeek ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'
                          }`}
                        />
                      </div>
                      {employerName && hoursPerWeek && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={workSchedule} onChange={setWorkSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does your work schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => {
                              const isYellow = o === 'No' && !!jobScheduleChanges && !touched.has('jobScheduleChanges')
                              return (
                                <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                  <span className={isYellow ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                    <input type="radio" name="jobScheduleChanges" value={o} checked={jobScheduleChanges === o}
                                      onChange={() => { setJobScheduleChanges(o); markTouched('jobScheduleChanges') }}
                                      style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                                  </span>
                                  {o}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Do you have more than one job?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => {
                              const isYellow = o === 'No' && !!multipleJobs && !touched.has('multipleJobs')
                              return (
                                <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                  <span className={isYellow ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                    <input type="radio" name="multipleJobs" value={o} checked={multipleJobs === o}
                                      onChange={() => { setMultipleJobs(o); markTouched('multipleJobs') }}
                                      style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                                  </span>
                                  {o}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {/* Row 2: Are you about to start a new job? — only when not working */}
                  {employed === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('startingNewJob', startingNewJob)}`}>
                      <span className="text-sm text-gray-700">Are you about to start a new job?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="startingNewJob" value={o} checked={startingNewJob === o}
                              onChange={() => { setStartingNewJob(o); if (o !== 'No') setLookingForWork('') }} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {startingNewJob === 'Yes' && (
                          <input value={newJobStartDate} onChange={e => setNewJobStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY"
                            className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Are you looking for work? — only when not working and not about to start */}
                  {employed === 'No' && startingNewJob === 'No' && (
                    <div onClick={() => markTouched('lookingForWork')} className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('lookingForWork', lookingForWork)}`}>
                      <span className="text-sm text-gray-700">Looking for work</span>
                      <div className="flex gap-4 shrink-0">
                        {['Yes', 'No'].map(o => {
                          const isYellow = o === 'No' && !!lookingForWork && !touched.has('lookingForWork')
                          const shouldPulse = isYellow && warnedSections.has('activities')
                          return (
                            <label key={o} onClick={o === 'Yes' ? e => e.stopPropagation() : undefined} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                              <span className={shouldPulse ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                <input type="radio" name="lookingForWork" value={o} checked={lookingForWork === o}
                                  onChange={() => { setLookingForWork(o); markTouched('lookingForWork') }}
                                  onClick={() => markTouched('lookingForWork')}
                                  style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                              </span>
                              {o}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Training */}
                <div className="space-y-3">
                  <div onClick={() => markTouched('inTraining')} className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('inTraining', inTraining)}`}>
                    <span className="text-sm text-gray-700">Do you need child care because you are in a training program?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => {
                        const isYellow = o === 'No' && !!inTraining && !touched.has('inTraining')
                        const shouldPulse = isYellow && warnedSections.has('activities')
                        return (
                          <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <span className={shouldPulse ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                              <input type="radio" name="inTraining" value={o} checked={inTraining === o}
                                onChange={() => { setInTraining(o); markTouched('inTraining'); if (o !== 'No') setStartingTraining('') }}
                                onClick={() => markTouched('inTraining')}
                                style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                            </span>
                            {o}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {inTraining === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input value={trainingName} onChange={e => setTrainingName(e.target.value)} placeholder="Training Program / Facility Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${trainingName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                        <input value={trainingHours} onChange={e => setTrainingHours(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${trainingHours ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                      </div>
                      {trainingName && trainingHours && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={trainingSchedule} onChange={setTrainingSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does your training schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => {
                              const isYellow = o === 'No' && !!trainingScheduleChanges && !touched.has('trainingScheduleChanges')
                              return (
                                <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5" onClick={e => e.stopPropagation()}>
                                  <span className={isYellow ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                    <input type="radio" name="trainingScheduleChanges" value={o} checked={trainingScheduleChanges === o}
                                      onChange={() => { setTrainingScheduleChanges(o); markTouched('trainingScheduleChanges') }}
                                      style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                                  </span>
                                  {o}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {inTraining === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('startingTraining', startingTraining)}`}>
                      <span className="text-sm text-gray-700">Are you about to start a training program?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="startingTraining" value={o} checked={startingTraining === o}
                              onChange={() => setStartingTraining(o)} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {startingTraining === 'Yes' && (
                          <input value={trainingStartDate} onChange={e => setTrainingStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* College */}
                <div className="space-y-3">
                  <div onClick={() => markTouched('inCollege')} className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('inCollege', inCollege)}`}>
                    <span className="text-sm text-gray-700">Do you need child care because you are attending college or classes?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => {
                        const isYellow = o === 'No' && !!inCollege && !touched.has('inCollege')
                        const shouldPulse = isYellow && warnedSections.has('activities')
                        return (
                          <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <span className={shouldPulse ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                              <input type="radio" name="inCollege" value={o} checked={inCollege === o}
                                onChange={() => { setInCollege(o); markTouched('inCollege'); if (o !== 'No') setStartingCollege('') }}
                                onClick={() => markTouched('inCollege')}
                                style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                            </span>
                            {o}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {inCollege === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="School or College Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${schoolName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                        <input value={schoolHours} onChange={e => setSchoolHours(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${schoolHours ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                      </div>
                      {schoolName && schoolHours && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={classSchedule} onChange={setClassSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does your class schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => {
                              const isYellow = o === 'No' && !!collegeScheduleChanges && !touched.has('collegeScheduleChanges')
                              return (
                              <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5" onClick={e => e.stopPropagation()}>
                                <span className={isYellow ? 'warn-pulse rounded-full inline-flex' : 'inline-flex'}>
                                <input type="radio" name="collegeScheduleChanges" value={o} checked={collegeScheduleChanges === o}
                                  onChange={() => { setCollegeScheduleChanges(o); markTouched('collegeScheduleChanges') }} style={{ accentColor: isYellow ? '#eab308' : '#0ea5e9' }} />
                                </span>
                                {o}
                              </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {inCollege === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('startingCollege', startingCollege)}`}>
                      <span className="text-sm text-gray-700">Are you about to start college or classes?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="startingCollege" value={o} checked={startingCollege === o}
                              onChange={() => setStartingCollege(o)} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {startingCollege === 'Yes' && (
                          <input value={collegeStartDate} onChange={e => setCollegeStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ── Adult 2 Activities (conditional) ── */}
              {hasOtherAdult && (
              <SectionCard title="Tell us about the other adult(s) applying with you and their activities." status={sectionStatus['activities2']} onConfirm={() => confirmSection('activities2')}>

                {/* Employment */}
                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2Employed', a2Employed)}`}>
                    <span className="text-sm text-gray-700">Do they need child care because they are working?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => (
                        <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                          <input type="radio" name="a2_employed" value={o} checked={a2Employed === o}
                            onChange={() => { setA2Employed(o); if (o !== 'No') { setA2StartingNewJob(''); setA2LookingForWork('') } }}
                            style={{ accentColor: '#0ea5e9' }} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>

                  {a2Employed === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input value={a2EmployerName} onChange={e => setA2EmployerName(e.target.value)} placeholder="Employer Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${a2EmployerName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                        <input value={a2HoursPerWeek} onChange={e => setA2HoursPerWeek(e.target.value)} placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${a2HoursPerWeek ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                      </div>
                      {a2EmployerName && a2HoursPerWeek && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={a2WorkSchedule} onChange={setA2WorkSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does their work schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                <input type="radio" name="a2_jobScheduleChanges" value={o} checked={a2JobScheduleChanges === o}
                                  onChange={() => setA2JobScheduleChanges(o)} style={{ accentColor: '#0ea5e9' }} />
                                {o}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Do they have more than one job?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                <input type="radio" name="a2_multipleJobs" value={o} checked={a2MultipleJobs === o}
                                  onChange={() => setA2MultipleJobs(o)} style={{ accentColor: '#0ea5e9' }} />
                                {o}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {a2Employed === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2StartingNewJob', a2StartingNewJob)}`}>
                      <span className="text-sm text-gray-700">Are they about to start a new job?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="a2_startingNewJob" value={o} checked={a2StartingNewJob === o}
                              onChange={() => { setA2StartingNewJob(o); if (o !== 'No') setA2LookingForWork('') }} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {a2StartingNewJob === 'Yes' && (
                          <input value={a2NewJobStartDate} onChange={e => setA2NewJobStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}

                  {a2Employed === 'No' && a2StartingNewJob === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2LookingForWork', a2LookingForWork)}`}>
                      <span className="text-sm text-gray-700">Looking for work</span>
                      <div className="flex gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="a2_lookingForWork" value={o} checked={a2LookingForWork === o}
                              onChange={() => setA2LookingForWork(o)} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Training */}
                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2InTraining', a2InTraining)}`}>
                    <span className="text-sm text-gray-700">Do they need child care because they are in a training program?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => (
                        <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                          <input type="radio" name="a2_inTraining" value={o} checked={a2InTraining === o}
                            onChange={() => { setA2InTraining(o); if (o !== 'No') setA2StartingTraining('') }}
                            style={{ accentColor: '#0ea5e9' }} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>

                  {a2InTraining === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input value={a2TrainingName} onChange={e => setA2TrainingName(e.target.value)} placeholder="Training Program / Facility Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${a2TrainingName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                        <input value={a2TrainingHours} onChange={e => setA2TrainingHours(e.target.value)} placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${a2TrainingHours ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                      </div>
                      {a2TrainingName && a2TrainingHours && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={a2TrainingSchedule} onChange={setA2TrainingSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does their training schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                <input type="radio" name="a2_trainingScheduleChanges" value={o} checked={a2TrainingScheduleChanges === o}
                                  onChange={() => setA2TrainingScheduleChanges(o)} style={{ accentColor: '#0ea5e9' }} />
                                {o}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {a2InTraining === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2StartingTraining', a2StartingTraining)}`}>
                      <span className="text-sm text-gray-700">Are they about to start a training program?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="a2_startingTraining" value={o} checked={a2StartingTraining === o}
                              onChange={() => setA2StartingTraining(o)} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {a2StartingTraining === 'Yes' && (
                          <input value={a2TrainingStartDate} onChange={e => setA2TrainingStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* College */}
                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2InCollege', a2InCollege)}`}>
                    <span className="text-sm text-gray-700">Do they need child care because they are attending college or classes?</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => (
                        <label key={o} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                          <input type="radio" name="a2_inCollege" value={o} checked={a2InCollege === o}
                            onChange={() => { setA2InCollege(o); if (o !== 'No') setA2StartingCollege('') }}
                            style={{ accentColor: '#0ea5e9' }} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>

                  {a2InCollege === 'Yes' && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-6">
                        <input value={a2SchoolName} onChange={e => setA2SchoolName(e.target.value)} placeholder="School or College Name"
                          className={`w-full border-0 border-b px-1 py-1 text-sm outline-none bg-transparent placeholder:text-gray-400 ${a2SchoolName ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                        <input value={a2SchoolHours} onChange={e => setA2SchoolHours(e.target.value)} placeholder="Total Hours Per Week"
                          className={`w-full border-0 border-b px-1 py-1 text-sm text-right outline-none bg-transparent placeholder:text-gray-400 ${a2SchoolHours ? 'border-[#0ea5e9] text-gray-800' : 'border-gray-300 text-gray-700 focus:border-[#0ea5e9]'}`} />
                      </div>
                      {a2SchoolName && a2SchoolHours && (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
                        <ScheduleGrid label="" schedule={a2ClassSchedule} onChange={setA2ClassSchedule} />
                        <hr className="border-gray-200 my-5" />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                          <span className="text-sm text-gray-700">Does their class schedule change week to week?</span>
                          <div className="flex gap-4 shrink-0">
                            {['Yes', 'No'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                                <input type="radio" name="a2_collegeScheduleChanges" value={o} checked={a2CollegeScheduleChanges === o}
                                  onChange={() => setA2CollegeScheduleChanges(o)} style={{ accentColor: '#0ea5e9' }} />
                                {o}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {a2InCollege === 'No' && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 cursor-pointer ${rowStyle('a2StartingCollege', a2StartingCollege)}`}>
                      <span className="text-sm text-gray-700">Are they about to start college or classes?</span>
                      <div className="flex items-center gap-4 shrink-0">
                        {['Yes', 'No'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer p-1.5 -m-1.5">
                            <input type="radio" name="a2_startingCollege" value={o} checked={a2StartingCollege === o}
                              onChange={() => setA2StartingCollege(o)} style={{ accentColor: '#0ea5e9' }} />
                            {o}
                          </label>
                        ))}
                        {a2StartingCollege === 'Yes' && (
                          <input value={a2CollegeStartDate} onChange={e => setA2CollegeStartDate(formatDob(e.target.value))}
                            placeholder="MM-DD-YYYY" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-28" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </SectionCard>
              )}
              </>
            )}

            {/* ── Tab 3: Household Income ── */}
            {activeTab === 3 && (
              <SectionCard title="Tell us about your household income." prefilled={true} status={sectionStatus['income']} onConfirm={() => confirmSection('income')}>
                <div className="overflow-x-auto -mx-2">
                  <table className={`w-full text-sm ${showPerson2 ? 'min-w-[900px]' : 'min-w-[560px]'}`}>
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 w-56">
                          <div className="flex items-center gap-2">
                            <span>Income Source</span>
                            {!showPerson2 && (
                              <div className="relative group">
                                <button type="button" onClick={() => setShowPerson2(true)} className="text-gray-400 hover:text-[#0ea5e9] transition-colors text-base leading-none font-bold">+</button>
                                <div className="pointer-events-none absolute left-0 top-6 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50">Add a person</div>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-500 w-10">Yes</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-500 w-10">No</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 border-l border-gray-100 w-28">Who?</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Gross Amt</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Period</th>
                        {showPerson2 && <th className="text-left px-3 py-2 font-semibold text-gray-500 border-l border-gray-100 w-28">Who?</th>}
                        {showPerson2 && <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Gross Amt</th>}
                        {showPerson2 && <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Period</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Income From Work (wages, salary, overtime, tips)', key: 'work' },
                        { label: 'Net Self-Employment Income', key: 'selfEmp' },
                        { label: 'Child Support Payments (received)', key: 'childSupport' },
                        { label: 'Alimony / Spousal Support (received)', key: 'alimony' },
                        { label: 'Unemployment Insurance / Workers\' Comp', key: 'unemp' },
                        { label: 'Social Security Benefits (including SSI)', key: 'ssa' },
                        { label: 'Disability Benefits', key: 'disability' },
                        { label: 'Rental / Boarder / Lodger Income', key: 'rental' },
                        { label: 'Dividends / Interest / Stocks / Bonds', key: 'dividends' },
                        { label: 'Pensions / Annuities', key: 'pension' },
                        { label: 'Public Assistance / Safety Net Benefits', key: 'pa' },
                      ].map(({ label, key }) => (
                        <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-700">{label}</td>
                          <td className="px-3 py-2 text-center select-none"
                            onMouseDown={e => { e.preventDefault(); startIncomeDrag(key, 'yes') }}
                            onMouseEnter={() => enterIncomeCell(key, 'yes')}
                          >
                            <label className="inline-flex items-center justify-center p-2 cursor-pointer">
                              <input type="radio" name={key} value="yes" checked={incomeSelections[key] === 'yes'} onChange={() => selectIncome(key, 'yes')} style={{ accentColor: '#0ea5e9' }} />
                            </label>
                          </td>
                          <td className="px-3 py-2 text-center select-none"
                            onMouseDown={e => { e.preventDefault(); startIncomeDrag(key, 'no') }}
                            onMouseEnter={() => enterIncomeCell(key, 'no')}
                          >
                            <label className="inline-flex items-center justify-center p-2 cursor-pointer">
                              <input type="radio" name={key} value="no" checked={incomeSelections[key] === 'no'} onChange={() => selectIncome(key, 'no')} onClick={() => selectIncome(key, 'no')} style={{ accentColor: incomeConfirmed.has(key) ? '#0ea5e9' : '#eab308' }} />
                            </label>
                          </td>
                          <td className="px-2 py-1.5 border-l border-gray-100">
                            <input value={incomeWho1[key]} onChange={e => setIncomeWho1(p => ({...p, [key]: e.target.value}))} placeholder="Name" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={incomeAmt1[key]} onChange={e => setIncomeAmt1(p => ({...p, [key]: e.target.value}))} placeholder="$0" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={incomePer1[key]} onChange={e => setIncomePer1(p => ({...p, [key]: e.target.value}))} className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                              <option value="">—</option><option value="week">Weekly</option><option value="biweek">Bi-weekly</option><option value="month">Monthly</option><option value="year">Annual</option>
                            </select>
                          </td>
                          {showPerson2 && <td className="px-2 py-1.5 border-l border-gray-100">
                            <input value={incomeWho2[key]} onChange={e => setIncomeWho2(p => ({...p, [key]: e.target.value}))} placeholder="Name" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                          </td>}
                          {showPerson2 && <td className="px-2 py-1.5">
                            <input value={incomeAmt2[key]} onChange={e => setIncomeAmt2(p => ({...p, [key]: e.target.value}))} placeholder="$0" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                          </td>}
                          {showPerson2 && <td className="px-2 py-1.5">
                            <select value={incomePer2[key]} onChange={e => setIncomePer2(p => ({...p, [key]: e.target.value}))} className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                              <option value="">—</option><option value="week">Weekly</option><option value="biweek">Bi-weekly</option><option value="month">Monthly</option><option value="year">Annual</option>
                            </select>
                          </td>}
                        </tr>
                      ))}
                      {/* Other row */}
                      <tr className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                          <span className="shrink-0">Other</span>
                          <input value={incomeOtherLabel} onChange={e => setIncomeOtherLabel(e.target.value)} placeholder="Please specify" className="rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-[#0ea5e9] w-36" />
                        </td>
                        <td className="px-3 py-2 text-center select-none"
                          onMouseDown={e => { e.preventDefault(); startIncomeDrag('other', 'yes') }}
                          onMouseEnter={() => enterIncomeCell('other', 'yes')}
                        >
                          <label className="inline-flex items-center justify-center p-2 cursor-pointer">
                            <input type="radio" name="other" value="yes" checked={incomeSelections['other'] === 'yes'} onChange={() => selectIncome('other', 'yes')} style={{ accentColor: '#0ea5e9' }} />
                          </label>
                        </td>
                        <td className="px-3 py-2 text-center select-none"
                          onMouseDown={e => { e.preventDefault(); startIncomeDrag('other', 'no') }}
                          onMouseEnter={() => enterIncomeCell('other', 'no')}
                        >
                          <label className="inline-flex items-center justify-center p-2 cursor-pointer">
                            <input type="radio" name="other" value="no" checked={incomeSelections['other'] === 'no'} onChange={() => selectIncome('other', 'no')} onClick={() => selectIncome('other', 'no')} style={{ accentColor: incomeConfirmed.has('other') ? '#0ea5e9' : '#eab308' }} />
                          </label>
                        </td>
                        <td className="px-2 py-1.5 border-l border-gray-100">
                          <input value={incomeWho1['other']} onChange={e => setIncomeWho1(p => ({...p, other: e.target.value}))} placeholder="Name" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={incomeAmt1['other']} onChange={e => setIncomeAmt1(p => ({...p, other: e.target.value}))} placeholder="$0" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={incomePer1['other']} onChange={e => setIncomePer1(p => ({...p, other: e.target.value}))} className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                            <option value="">—</option><option value="week">Weekly</option><option value="biweek">Bi-weekly</option><option value="month">Monthly</option><option value="year">Annual</option>
                          </select>
                        </td>
                        {showPerson2 && <td className="px-2 py-1.5 border-l border-gray-100">
                          <input value={incomeWho2['other']} onChange={e => setIncomeWho2(p => ({...p, other: e.target.value}))} placeholder="Name" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                        </td>}
                        {showPerson2 && <td className="px-2 py-1.5">
                          <input value={incomeAmt2['other']} onChange={e => setIncomeAmt2(p => ({...p, other: e.target.value}))} placeholder="$0" className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0ea5e9]" />
                        </td>}
                        {showPerson2 && <td className="px-2 py-1.5">
                          <select value={incomePer2['other']} onChange={e => setIncomePer2(p => ({...p, other: e.target.value}))} className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                            <option value="">—</option><option value="week">Weekly</option><option value="biweek">Bi-weekly</option><option value="month">Monthly</option><option value="year">Annual</option>
                          </select>
                        </td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* ── Tab 4: Signature ── */}
            {activeTab === 4 && (
              <>
                <SectionCard title="Attestation and Signature">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed space-y-2">
                    <p>By submitting this application, I agree that I have read and understand the notices above, I want to apply for child care assistance, and I have been honest on this application to the best of my knowledge.</p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={attestationChecked} onChange={e => setAttestationChecked(e.target.checked)} style={{ accentColor: '#0ea5e9' }} className="mt-0.5 shrink-0" />
                      <span className="font-semibold">I attest that the information I provided on this application is correct and complete to the best of my knowledge.</span>
                    </label>
                  </div>
                  <Row>
                    <Field label="Print Name" value={printName} onChange={setPrintName} prefilled={prefilled(printName)} half />
                    <Field label="Date Signed" value={dateSigned} onChange={v => setDateSigned(formatDob(v))} placeholder="MM-DD-YYYY" half />
                  </Row>
                  <div className="rounded-xl border-2 border-dashed border-gray-200 h-16 flex items-center justify-center">
                    <span className="text-sm text-gray-400">Signature (sign when submitting in person)</span>
                  </div>
                </SectionCard>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
                  <p className="font-semibold text-gray-800 mb-1">How to submit this application</p>
                  <p>Print this form and bring it to your local Department of Social Services office, or mail it to the address listed on the OCFS-6025 form. You can also apply online at <span className="text-[#0ea5e9]">mybenefits.ny.gov</span>.</p>
                </div>

                <div className="flex justify-center pb-4">
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#0ea5e9' }}
                  >
                    <Download className="h-5 w-5" />
                    Export
                  </button>
                </div>
              </>
            )}

          </div>
          </div>{/* animation wrapper */}
        </div>
      </div>
    </AppLayout>
  )
}
