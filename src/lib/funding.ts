// The help-paying-for-care surface, as data. ONE definition, read by the MCP
// tools (every facility search carries it; funding_programs returns it), the
// MCP App card (the funding strip + funding screen), and available to the
// site's own chat. Edit here, not in three places.
//
// Three forms exist on the site today:
//   /eligibility  — the CCAP screener: a few questions → "you may qualify".
//   /application  — the official NYS Application for Child Care Assistance
//                   (OCFS-6025), filled from what the parent enters; emailed as
//                   a PDF. Accepts a pre-fill draft (localStorage key
//                   'ccap-eligibility-data', see ChatStartApplicationCard).
//   /report       — the household childcare snapshot: typical costs at the
//                   parent's address, by age group, emailed as a PDF.
//
// The site never decides eligibility. Neither does anything that reads this.

export type FundingForm = {
  id: 'eligibility' | 'application' | 'report'
  title: string
  /** One line a parent understands. */
  blurb: string
  /** What clicking it does — sets expectations honestly. */
  what: string
  href: string
  /** Rough time to complete, as a parent would say it. */
  minutes: number
  cta: string
}

export const FUNDING_FORMS: FundingForm[] = [
  {
    id: 'eligibility',
    title: 'Check if you qualify',
    blurb: 'NY’s Child Care Program can cover most of the cost.',
    what: 'A few quick questions about your household, income and why you need care. Tells you whether you may qualify — the official screening decides.',
    href: '/eligibility',
    minutes: 3,
    cta: 'Check eligibility',
  },
  {
    id: 'application',
    title: 'Start the application',
    blurb: 'The official NYS Application for Child Care Assistance.',
    what: 'Enter your details once and we fill the state form; you get a PDF by email to sign and bring or mail to your county Department of Social Services (or apply at mybenefits.ny.gov).',
    href: '/application',
    minutes: 15,
    cta: 'Start application',
  },
  {
    id: 'report',
    title: 'Cost snapshot',
    blurb: 'What care typically costs near your address.',
    what: 'A short form → a personal report emailed as a PDF: median center and family-care prices for your county, infant through preschool.',
    href: '/report',
    minutes: 2,
    cta: 'Get my snapshot',
  },
]

/** The block attached to every facility search result set. */
export function fundingBlock() {
  return {
    headline: 'Paying for care',
    summary:
      'Most New York families with children under 13 who work, train or study may qualify for the Child Care Assistance Program (CCAP), which pays most of the cost of care at a licensed provider.',
    forms: FUNDING_FORMS.map(f => ({ ...f })),
  }
}
