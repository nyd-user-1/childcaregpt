'use client'

import { useState, useEffect } from 'react'
import { Printer } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filled(v: string | undefined) { return !!(v && v.trim() && v !== 'No') }

// ─── Field components ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, prefilled = false, placeholder = '', type = 'text', half = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  prefilled?: boolean; placeholder?: string; type?: string; half?: boolean
}) {
  return (
    <div className={half ? 'flex-1 min-w-0' : 'w-full'}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 flex-wrap">{children}</div>
}

function PrefilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-[#0ea5e9] px-2 py-0.5 text-[10px] font-semibold text-[#0ea5e9]">
      ✓ Pre-filled
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const [elig, setElig] = useState<EligData | null>(null)

  // ── Form state ───────────────────────────────────────────────────────────
  const [firstName,      setFirstName]      = useState('')
  const [lastName,       setLastName]       = useState('')
  const [aliases,        setAliases]        = useState('')
  const [street,         setStreet]         = useState('')
  const [apt,            setApt]            = useState('')
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
  const [military,       setMilitary]       = useState('')
  const [natGuard,       setNatGuard]       = useState('')
  const [otherFunding,   setOtherFunding]   = useState('')
  const [otherAgency,    setOtherAgency]    = useState('')
  const [reasonForCare,  setReasonForCare]  = useState('')

  // Household members
  const [members, setMembers] = useState<HouseholdMember[]>(
    Array.from({ length: 8 }, () => ({ name: '', dob: '', sex: '', relationship: '', needsCare: '' }))
  )

  // Activities
  const [employed,       setEmployed]       = useState('')
  const [employerName,   setEmployerName]   = useState('')
  const [hoursPerWeek,   setHoursPerWeek]   = useState('')
  const [lookingForWork, setLookingForWork] = useState('')
  const [inTraining,     setInTraining]     = useState('')
  const [trainingName,   setTrainingName]   = useState('')
  const [trainingHours,  setTrainingHours]  = useState('')
  const [inCollege,      setInCollege]      = useState('')
  const [schoolName,     setSchoolName]     = useState('')
  const [schoolHours,    setSchoolHours]    = useState('')

  // Income
  const [incomeAmount,   setIncomeAmount]   = useState('')
  const [incomePeriod,   setIncomePeriod]   = useState('month')

  // Signature
  const [printName,      setPrintName]      = useState('')
  const [dateSigned,     setDateSigned]     = useState('')

  // ── Load & pre-fill from eligibility ────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('ccap-eligibility-data')
    if (!raw) return
    const d: EligData = JSON.parse(raw)
    setElig(d)

    setFirstName(d.firstName || '')
    setLastName(d.lastName || '')
    setPhone(d.phone || '')
    setEmail(d.email || '')
    setStreet(d.address || '')
    setCounty(d.county || '')
    setDateOfBirth(d.dateOfBirth || '')
    setMaritalStatus(d.maritalStatus || '')
    setLanguage(d.language || '')
    setEmployed(d.employed || '')
    setEmployerName(d.employerName || '')
    setLookingForWork(d.jobSearchOrTraining === 'Yes' ? 'Yes' : '')
    setInTraining((['vocationalProgram','basicEducation','hsOrGed','substanceProgram'] as (keyof EligData)[]).some(k => d[k] === 'Yes') ? 'Yes' : '')
    setInCollege(d.college === 'Yes' ? 'Yes' : '')
    setHomeless(d.homeless || '')
    setPrintName(`${d.firstName || ''} ${d.lastName || ''}`.trim())

    if (d.monthlyIncome) setIncomeAmount(d.monthlyIncome)

    if (d.benefits?.length) {
      setBenefits(prev => {
        const next = { ...prev }
        d.benefits.forEach(b => { if (b in next) next[b] = true })
        return next
      })
    }

    // Pre-fill household row 1 (SELF)
    setMembers(prev => {
      const next = [...prev]
      next[0] = {
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        dob: d.dateOfBirth || '',
        sex: '',
        relationship: 'SELF',
        needsCare: 'N',
      }
      return next
    })

    // Derive reason for care
    const reasons: string[] = []
    if (d.employed === 'Yes')           reasons.push('Employment')
    if (d.jobSearchOrTraining === 'Yes') reasons.push('Job search / training')
    if (d.college === 'Yes')            reasons.push('College')
    if (d.basicEducation === 'Yes')     reasons.push('Basic education')
    if (d.hsOrGed === 'Yes')            reasons.push('HS / GED classes')
    if (d.disability === 'Yes')         reasons.push('Disability')
    if (d.domesticViolence === 'Yes')   reasons.push('Domestic violence')
    if (d.substanceProgram === 'Yes')   reasons.push('Substance treatment')
    if (d.dssActivities === 'Yes')      reasons.push('DSS-required activities')
    setReasonForCare(reasons.join('; '))
  }, [])

  function updateMember(idx: number, field: keyof HouseholdMember, val: string) {
    setMembers(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: val }; return next })
  }

  const hasPrefill = !!elig
  const prefilled = (val: string) => hasPrefill && filled(val)

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-4xl px-5 py-8">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">OCFS-6025 (Rev. 06/2024)</p>
              <h1 className="text-2xl font-bold text-gray-900">Application for Child Care Assistance</h1>
              <p className="text-sm text-gray-500 mt-1">New York State Office of Children and Family Services</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasPrefill && (
                <div className="flex items-center gap-1.5 rounded-lg bg-sky-50 border border-[#0ea5e9] px-3 py-1.5">
                  <span className="text-xs font-semibold text-[#0ea5e9]">✓ Pre-filled from eligibility screening</span>
                </div>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors print:hidden"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>

          <div className="space-y-5">

            {/* ── Section 1: About You ── */}
            <SectionCard title="Tell us about yourself.">
              <Row>
                <Field label="First Name" value={firstName} onChange={setFirstName} prefilled={prefilled(firstName)} half />
                <Field label="Last Name"  value={lastName}  onChange={setLastName}  prefilled={prefilled(lastName)}  half />
                <Field label="Aliases (optional)" value={aliases} onChange={setAliases} half />
              </Row>
              <Row>
                <Field label="Street Address" value={street} onChange={setStreet} prefilled={prefilled(street)} half />
                <Field label="Apt / Floor (optional)" value={apt} onChange={setApt} half />
              </Row>
              <Row>
                <Field label="City"    value={city}       onChange={setCity}       half placeholder="City" />
                <Field label="State"   value={stateField} onChange={setStateField} half placeholder="NY" />
                <Field label="County"  value={county}     onChange={setCounty}     prefilled={prefilled(county)} half />
                <Field label="Zip Code" value={zip}       onChange={setZip}        half placeholder="00000" />
              </Row>
              <Row>
                <Field label="Phone Number" value={phone} onChange={setPhone} prefilled={prefilled(phone)} type="tel" half />
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone Type</label>
                  <div className="flex gap-4 mt-2">
                    {['Cell', 'Home / Landline', 'Work'].map(t => (
                      <label key={t} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="phoneType" value={t}
                          checked={phoneType === t} onChange={() => setPhoneType(t)}
                          style={{ accentColor: '#0ea5e9' }} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </Row>
              <Row>
                <Field label="Email (optional)" value={email} onChange={setEmail} prefilled={prefilled(email)} type="email" half />
                <Field label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} prefilled={prefilled(dateOfBirth)} placeholder="MM-DD-YYYY" half />
              </Row>
              <Row>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Primary Language {prefilled(language) && <PrefilledBadge />}</label>
                  <div className="flex flex-wrap gap-4">
                    {['English', 'Spanish', 'Haitian Creole', 'Other'].map(l => (
                      <label key={l} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="language" value={l}
                          checked={language === l} onChange={() => setLanguage(l)}
                          style={{ accentColor: '#0ea5e9' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marital Status {prefilled(maritalStatus) && <PrefilledBadge />}</label>
                  <div className="flex flex-wrap gap-4">
                    {['Single', 'Married', 'Divorced', 'Separated', 'Widowed'].map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="marital" value={m}
                          checked={maritalStatus === m} onChange={() => setMaritalStatus(m)}
                          style={{ accentColor: '#0ea5e9' }} />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </Row>
            </SectionCard>

            {/* ── Section 2: Benefits ── */}
            <SectionCard
              title="Do you or any adult applying with you receive any of the following benefits?"
              subtitle={elig?.benefits?.length ? '✓ Pre-filled from your eligibility answers' : undefined}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(benefits).map(([label, checked]) => (
                  <CheckField
                    key={label}
                    label={label}
                    checked={checked}
                    onChange={v => setBenefits(prev => ({ ...prev, [label]: v }))}
                    prefilled={elig?.benefits?.includes(label)}
                  />
                ))}
              </div>
            </SectionCard>

            {/* ── Section 3: Household Circumstances ── */}
            <SectionCard title="Tell us about your household's circumstances.">
              <div className="space-y-3">
                {[
                  { label: 'Homeless (no fixed, regular and adequate place to stay at night)', val: homeless, set: setHomeless, pre: prefilled(homeless) },
                  { label: 'A parent is on active duty (serving full time) in the U.S. Military', val: military, set: setMilitary, pre: false },
                  { label: 'A parent is a member of the National Guard or Military Reserve Unit', val: natGuard, set: setNatGuard, pre: false },
                  { label: 'Receiving or applying for other child care funding', val: otherFunding, set: setOtherFunding, pre: false },
                ].map(({ label, val, set, pre }) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-2.5">
                    <span className={`text-sm ${pre ? 'font-medium text-[#0ea5e9]' : 'text-gray-700'}`}>{label}{pre && ' '}{pre && <PrefilledBadge />}</span>
                    <div className="flex gap-4 shrink-0">
                      {['Yes', 'No'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name={label} value={o}
                            checked={val === o} onChange={() => set(o)}
                            style={{ accentColor: '#0ea5e9' }} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {otherFunding === 'Yes' && (
                  <Field label="Other funding agency name" value={otherAgency} onChange={setOtherAgency} />
                )}
                <Field label="Reason(s) child care is needed" value={reasonForCare} onChange={setReasonForCare}
                  prefilled={prefilled(reasonForCare)} placeholder="e.g. Employment, College" />
              </div>
            </SectionCard>

            {/* ── Section 4: Everyone in Your Home ── */}
            <SectionCard
              title="Tell us about everyone in your home."
              subtitle="Row 1 pre-filled with your information. Complete remaining rows for all household members."
            >
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-2 py-2 font-semibold text-gray-500 w-8">#</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-500">Full Name</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-500 w-28">Date of Birth</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-500 w-16">Sex</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-500 w-28">Relationship to You</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-500 w-20">Needs Care?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const isPrefilled = i === 0 && !!elig
                      return (
                        <tr key={i} className={`border-b border-gray-50 ${isPrefilled ? 'bg-sky-50' : ''}`}>
                          <td className="px-2 py-1.5 text-gray-400 font-medium">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            <input value={m.name} onChange={e => updateMember(i, 'name', e.target.value)}
                              className={`w-full rounded border px-2 py-1 text-xs outline-none ${isPrefilled ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={m.dob} onChange={e => updateMember(i, 'dob', e.target.value)}
                              placeholder="MM-DD-YYYY"
                              className={`w-full rounded border px-2 py-1 text-xs outline-none ${isPrefilled && m.dob ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`} />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={m.sex} onChange={e => updateMember(i, 'sex', e.target.value)}
                              className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                              <option value="">—</option>
                              <option>M</option><option>F</option><option>X</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={m.relationship} onChange={e => updateMember(i, 'relationship', e.target.value)}
                              placeholder={i === 0 ? 'SELF' : 'e.g. Child'}
                              className={`w-full rounded border px-2 py-1 text-xs outline-none ${isPrefilled ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`} />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={m.needsCare} onChange={e => updateMember(i, 'needsCare', e.target.value)}
                              className="w-full rounded border border-gray-200 px-1 py-1 text-xs outline-none focus:border-[#0ea5e9]">
                              <option value="">—</option>
                              <option value="Y">Yes</option><option value="N">No</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ── Section 5: Your Activities ── */}
            <SectionCard title="Tell us about your job and other activities." subtitle="Pre-filled from your eligibility answers where available.">

              {/* Work */}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Employment {prefilled(employed) && <PrefilledBadge />}</p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="employed" value={o} checked={employed === o} onChange={() => setEmployed(o)} style={{ accentColor: '#0ea5e9' }} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
                {employed === 'Yes' && (
                  <Row>
                    <Field label="Employer Name" value={employerName} onChange={setEmployerName} prefilled={prefilled(employerName)} half />
                    <Field label="Total Hours Per Week" value={hoursPerWeek} onChange={setHoursPerWeek} placeholder="e.g. 40" half />
                  </Row>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">Looking for work {prefilled(lookingForWork) && <PrefilledBadge />}</p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="lookingForWork" value={o} checked={lookingForWork === o} onChange={() => setLookingForWork(o)} style={{ accentColor: '#0ea5e9' }} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training */}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Training program {prefilled(inTraining) && <PrefilledBadge />}</p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="inTraining" value={o} checked={inTraining === o} onChange={() => setInTraining(o)} style={{ accentColor: '#0ea5e9' }} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
                {inTraining === 'Yes' && (
                  <Row>
                    <Field label="Training Program / Facility Name" value={trainingName} onChange={setTrainingName} half />
                    <Field label="Total Hours Per Week" value={trainingHours} onChange={setTrainingHours} placeholder="e.g. 20" half />
                  </Row>
                )}
              </div>

              {/* College */}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">College / classes {prefilled(inCollege) && <PrefilledBadge />}</p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="inCollege" value={o} checked={inCollege === o} onChange={() => setInCollege(o)} style={{ accentColor: '#0ea5e9' }} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
                {inCollege === 'Yes' && (
                  <Row>
                    <Field label="School or College Name" value={schoolName} onChange={setSchoolName} half />
                    <Field label="Total Hours Per Week" value={schoolHours} onChange={setSchoolHours} placeholder="e.g. 15" half />
                  </Row>
                )}
              </div>
            </SectionCard>

            {/* ── Section 6: Household Income ── */}
            <SectionCard title="Tell us about your household income." subtitle="Pre-filled with total monthly income from your eligibility screening.">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Income Source</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-500 w-12">Yes</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-500 w-12">No</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 w-32">Gross Amount</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 w-28">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Income From Work (wages, salary, overtime, tips)', key: 'work', preAmt: incomeAmount, prePeriod: incomePeriod },
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
                    ].map(({ label, key, preAmt, prePeriod }) => {
                      const isPre = !!preAmt
                      return (
                        <tr key={key} className={`border-b border-gray-50 ${isPre ? 'bg-sky-50' : ''}`}>
                          <td className={`px-3 py-2 text-sm ${isPre ? 'font-medium text-[#0ea5e9]' : 'text-gray-700'}`}>
                            {label} {isPre && <PrefilledBadge />}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="radio" name={key} value="yes" defaultChecked={isPre} style={{ accentColor: '#0ea5e9' }} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="radio" name={key} value="no" defaultChecked={!isPre} style={{ accentColor: '#0ea5e9' }} />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              defaultValue={preAmt ? `$${Number(preAmt).toLocaleString()}` : ''}
                              placeholder="$0"
                              className={`w-full rounded border px-2 py-1 text-sm outline-none ${isPre ? 'border-[#0ea5e9] bg-sky-50' : 'border-gray-200 focus:border-[#0ea5e9]'}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select defaultValue={prePeriod || ''}
                              className="w-full rounded border border-gray-200 px-1 py-1 text-sm outline-none focus:border-[#0ea5e9]">
                              <option value="">—</option>
                              <option value="week">Weekly</option>
                              <option value="biweek">Bi-weekly</option>
                              <option value="month">Monthly</option>
                              <option value="year">Annual</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ── Section 7: Attestation & Signature ── */}
            <SectionCard title="Attestation and Signature">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed space-y-2">
                <p>By submitting this application, I agree that I have read and understand the notices above, I want to apply for child care assistance, and I have been honest on this application to the best of my knowledge.</p>
                <p className="font-semibold">I attest that the information I provided on this application is correct and complete to the best of my knowledge.</p>
              </div>
              <Row>
                <Field label="Print Name" value={printName} onChange={setPrintName} prefilled={prefilled(printName)} half />
                <Field label="Date Signed" value={dateSigned} onChange={setDateSigned} placeholder="MM-DD-YYYY" half />
              </Row>
              <div className="rounded-xl border-2 border-dashed border-gray-200 h-16 flex items-center justify-center">
                <span className="text-sm text-gray-400">Signature (sign when submitting in person)</span>
              </div>
            </SectionCard>

            {/* Submit instructions */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">How to submit this application</p>
              <p>Print this form and bring it to your local Department of Social Services office, or mail it to the address listed on the OCFS-6025 form. You can also apply online at <span className="text-[#0ea5e9]">mybenefits.ny.gov</span>.</p>
            </div>

            <div className="flex justify-center pb-4 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white transition-colors"
                style={{ backgroundColor: '#0ea5e9' }}
              >
                <Printer className="h-5 w-5" />
                Print Application
              </button>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
