// Plain-language glossary for ChildcareGPT. Every term leads with what it means
// for a parent ("plain"), then an optional official detail ("body"), and a
// "whereSeen" note pointing to where it shows up in the app or on a form.
// Voice rule: talk like a helpful person, not a regulation.

export const GLOSSARY_UPDATED = 'May 2026'

export type GlossaryCategory =
  | 'Programs & Provider Types'
  | 'Cost & Payment'
  | 'Subsidies & Help'
  | 'Eligibility'
  | 'Quality & Safety'
  | 'Data & Sources'

export type GlossaryTerm = {
  id: string                 // stable anchor slug
  name: string
  abbr?: string              // e.g. "GFDC"
  category: GlossaryCategory
  plain: string              // plain-English, parent-first — always present
  body?: string              // optional official / deeper detail
  whereSeen?: string         // where this shows up (form, listing, the app)
  link?: { label: string; url: string }
}

export const GLOSSARY_CATEGORIES: { name: GlossaryCategory; blurb: string }[] = [
  { name: 'Programs & Provider Types', blurb: 'The five kinds of regulated child care in New York — and how they differ.' },
  { name: 'Cost & Payment',            blurb: 'What you pay, how it’s measured, and the words on the bill.' },
  { name: 'Subsidies & Help',          blurb: 'Public programs that can lower or cover the cost of care.' },
  { name: 'Eligibility',               blurb: 'What decides whether you qualify for help.' },
  { name: 'Quality & Safety',          blurb: 'How New York licenses, inspects, and rates providers.' },
  { name: 'Data & Sources',            blurb: 'Where ChildcareGPT’s numbers come from.' },
]

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── Programs & Provider Types ──────────────────────────────────────────────
  {
    id: 'day-care-center',
    name: 'Day Care Center',
    abbr: 'DCC',
    category: 'Programs & Provider Types',
    plain: 'A child care program run out of a dedicated facility — not someone’s home — usually serving a larger number of children in age-grouped classrooms.',
    body: 'Day Care Centers care for 7 or more children and are licensed by the NYS Office of Children and Family Services (OCFS). They typically have multiple staff and separate rooms for infants, toddlers, and preschoolers.',
    whereSeen: 'Listed as the program type DCC on facility pages and in the Facilities table.',
  },
  {
    id: 'family-day-care',
    name: 'Family Day Care',
    abbr: 'FDC',
    category: 'Programs & Provider Types',
    plain: 'Child care provided in the provider’s own home for a small group of children — a more home-like setting than a center.',
    body: 'A registered Family Day Care home may care for 3 to 6 children, with limited additions for school-age kids. Run by one caregiver, sometimes with an assistant.',
    whereSeen: 'Program type FDC on facility listings.',
  },
  {
    id: 'group-family-day-care',
    name: 'Group Family Day Care',
    abbr: 'GFDC',
    category: 'Programs & Provider Types',
    plain: 'Like Family Day Care but larger — a home-based program with more children and a required assistant.',
    body: 'A licensed Group Family Day Care home may care for 7 to 12 children (plus a few school-age) and must have an assistant present. Still a home setting, but bigger than FDC.',
    whereSeen: 'Program type GFDC on facility listings.',
  },
  {
    id: 'school-age-child-care',
    name: 'School-Age Child Care',
    abbr: 'SACC',
    category: 'Programs & Provider Types',
    plain: 'Before-school, after-school, and holiday care for children who are already in school (roughly ages 5–12).',
    body: 'School-Age Child Care programs are licensed by OCFS and often operate out of schools, community centers, or Y’s. They cover the hours around the school day.',
    whereSeen: 'Program type SACC on facility listings.',
  },
  {
    id: 'small-day-care-center',
    name: 'Small Day Care Center',
    abbr: 'SDCC',
    category: 'Programs & Provider Types',
    plain: 'A small center-based program — bigger than a home day care but smaller than a full Day Care Center.',
    body: 'Small Day Care Centers serve 7 to 15 children outside a home setting. They bridge the gap between family-based and full center care.',
    whereSeen: 'Program type SDCC on facility listings.',
  },
  {
    id: 'capacity',
    name: 'Total Capacity',
    category: 'Programs & Provider Types',
    plain: 'The maximum number of children a provider is allowed to care for at one time. A higher capacity doesn’t always mean an open spot — call to check.',
    body: 'Set by the provider’s license or registration. ChildcareGPT also breaks this down by age group: infant, toddler, preschool, and school-age capacity.',
    whereSeen: 'Shown on every facility page and used in cost and availability comparisons.',
  },

  // ── Cost & Payment ─────────────────────────────────────────────────────────
  {
    id: 'market-rate',
    name: 'Market Rate',
    category: 'Cost & Payment',
    plain: 'What child care typically costs in your area — the going price, based on what local providers actually charge.',
    body: 'New York surveys provider prices by region and age group to set market rates. They matter because subsidies are often capped at the market rate, not your provider’s exact bill.',
    whereSeen: 'Underlies the cost figures on county pages and the cost charts.',
  },
  {
    id: 'median-cost',
    name: 'Median Cost',
    category: 'Cost & Payment',
    plain: 'The middle price in your county — half of providers charge more, half charge less. A better “typical” number than an average, which a few very expensive providers can skew.',
    body: 'ChildcareGPT reports median center and family-care costs by age group (infant, toddler, preschool) from the U.S. Department of Labor’s childcare price data.',
    whereSeen: 'The default metric on county cost pages and the cost choropleth map.',
  },
  {
    id: 'copay',
    name: 'Family Share / Co-Pay',
    category: 'Cost & Payment',
    plain: 'If you get a child care subsidy, this is the part you still pay yourself. The subsidy covers the rest.',
    body: 'Also called the “family share.” It’s calculated as a percentage of your family’s income above the poverty level, so lower-income families pay less.',
    whereSeen: 'Relevant once you’ve checked eligibility for assistance.',
  },
  {
    id: 'infant-toddler-preschool',
    name: 'Care by Age Group',
    category: 'Cost & Payment',
    plain: 'Cost changes a lot with your child’s age. Infant care is the most expensive because it needs the most staff per child; preschool and school-age care cost less.',
    body: 'Ratios of staff to children are highest for infants, which drives price. ChildcareGPT splits both capacity and cost into infant, toddler, preschool, and school-age.',
    whereSeen: 'Age toggles on cost pages and charts.',
  },

  // ── Subsidies & Help ───────────────────────────────────────────────────────
  {
    id: 'ccap',
    name: 'Child Care Assistance Program',
    abbr: 'CCAP',
    category: 'Subsidies & Help',
    plain: 'New York’s main program that helps eligible families pay for child care. If you qualify, it covers most of the cost and you pay a small family share.',
    body: 'CCAP (sometimes called the child care subsidy) is funded federally and run through your county Department of Social Services. Eligibility is based on income, household size, and a qualifying “reason for care” like work or school.',
    whereSeen: 'The Eligibility screener checks whether you likely qualify for CCAP.',
    link: { label: 'NY child care assistance', url: 'https://www.ny.gov/services/get-help-paying-child-care' },
  },
  {
    id: 'subsidy',
    name: 'Subsidy',
    category: 'Subsidies & Help',
    plain: 'Money from a public program that pays part or most of your child care bill. You apply, and if you qualify, it’s paid toward an approved provider.',
    body: 'In New York the main child care subsidy is CCAP. Subsidies are usually capped at the local market rate, so a provider who charges above that may leave a small gap.',
    whereSeen: 'Throughout the Eligibility and Report flows.',
  },
  {
    id: 'voucher',
    name: 'Voucher',
    category: 'Subsidies & Help',
    plain: 'A common way a subsidy is delivered: instead of cash, you get an approval that pays your chosen provider directly. You usually pick the provider.',
    body: 'Vouchers give families flexibility to choose any provider that accepts them and meets program requirements, including some legally license-exempt care.',
    whereSeen: 'Relevant after an eligibility determination.',
  },

  // ── Eligibility ───────────────────────────────────────────────────────────
  {
    id: 'reason-for-care',
    name: 'Reason for Care',
    category: 'Eligibility',
    plain: 'To get help paying for child care, you usually need an approved reason you need it — like working, looking for work, going to school, or training.',
    body: 'Qualifying activities include employment, an approved education or training program, and certain other circumstances. Each child needing care is tied to a parent’s reason for care.',
    whereSeen: 'The Eligibility screener and the Application’s Job / Activities section.',
  },
  {
    id: 'income-limit',
    name: 'Income Limit',
    category: 'Eligibility',
    plain: 'The most your household can earn and still qualify for help. It rises with family size — a bigger family can earn more and still qualify.',
    body: 'Limits are set as a percentage of the State Median Income (SMI). Counties may set their own thresholds within state rules, so the cutoff can vary by where you live.',
    whereSeen: 'Used by the Eligibility screener to estimate whether you qualify.',
  },
  {
    id: 'household-size',
    name: 'Household Size',
    category: 'Eligibility',
    plain: 'How many people live in and share income in your home — including you, your children, and others you support. It directly affects the income limit you’re measured against.',
    body: 'Generally counts the parents/caretakers and the children in the family unit. A larger household raises the income limit for assistance.',
    whereSeen: 'Collected on the Application’s Household tab.',
  },
  {
    id: 'state-median-income',
    name: 'State Median Income',
    abbr: 'SMI',
    category: 'Eligibility',
    plain: 'The midpoint income for families of your size in New York. Many child care programs set their cutoffs as a percentage of it (for example, 85% of SMI).',
    body: 'Updated periodically by the state. Because it’s tied to family size, the dollar threshold is different for a family of two than a family of five.',
    whereSeen: 'Behind the income thresholds in the Eligibility screener.',
  },

  // ── Quality & Safety ──────────────────────────────────────────────────────
  {
    id: 'license-vs-registration',
    name: 'License vs. Registration',
    category: 'Quality & Safety',
    plain: 'Both mean a provider is approved and overseen by the state — the label just depends on the program type. Larger programs are “licensed”; smaller home-based ones are “registered.” Either way, the state inspects them.',
    body: 'Day Care Centers, Small Day Care Centers, and Group Family Day Care homes are licensed; Family Day Care and School-Age programs are typically registered. Both carry health and safety requirements.',
    whereSeen: 'Reflected in a provider’s status on facility pages.',
  },
  {
    id: 'facility-status',
    name: 'Facility Status',
    category: 'Quality & Safety',
    plain: 'Whether a provider is currently open and approved to operate. If a listing shows anything other than active, the provider may be closed or have a hold on their approval.',
    body: 'OCFS tracks each provider’s standing — for example, licensed/registered and in good standing, or closed. ChildcareGPT shows the status as reported in the state dataset.',
    whereSeen: 'A field on every facility page and a filter in the Facilities table.',
  },
  {
    id: 'ratios',
    name: 'Staff-to-Child Ratio',
    category: 'Quality & Safety',
    plain: 'How many children one caregiver may supervise at once. Younger children require more adults, which is why infant care is harder to find and costs more.',
    body: 'New York sets maximum ratios and group sizes by age. Lower ratios generally mean more individual attention for your child.',
    whereSeen: 'The reason infant capacity is limited at most providers.',
  },
  {
    id: 'ocfs',
    name: 'Office of Children & Family Services',
    abbr: 'OCFS',
    category: 'Quality & Safety',
    plain: 'The New York State agency that licenses, registers, and inspects child care providers. When you look up whether a provider is approved, OCFS is the source.',
    body: 'OCFS maintains the regulated-provider dataset that powers ChildcareGPT’s facility listings, including program type, capacity, and status.',
    whereSeen: 'The source behind every facility record.',
    link: { label: 'OCFS child care', url: 'https://ocfs.ny.gov/programs/childcare/' },
  },
  {
    id: 'dss',
    name: 'Department of Social Services',
    abbr: 'DSS',
    category: 'Quality & Safety',
    plain: 'Your local (county) social services office — where you actually apply for and manage child care assistance. Each county runs its own.',
    body: 'DSS districts administer CCAP locally, accept applications, and make eligibility determinations within state rules.',
    whereSeen: 'Where an Application is ultimately submitted.',
  },

  // ── Data & Sources ────────────────────────────────────────────────────────
  {
    id: 'ocfs-dataset',
    name: 'OCFS Regulated Provider Data',
    category: 'Data & Sources',
    plain: 'The official list of every state-approved child care provider in New York — about 16,800 of them — including where they are, what type they are, and how many children they can serve.',
    body: 'Sourced from New York’s open data portal (datasets fymg-3wv3 and cb42-qumz). Provider hours and exact openings aren’t in the data, so always confirm availability directly.',
    whereSeen: 'Powers the Facilities, Maps, and Console pages.',
  },
  {
    id: 'dol-cost-data',
    name: 'National Database of Childcare Prices',
    category: 'Data & Sources',
    plain: 'A U.S. Department of Labor dataset of what child care costs county by county. It’s where ChildcareGPT’s cost figures come from.',
    body: 'Covers New York counties from 2008–2022 with median and 75th-percentile prices for center and family-based care by age group, plus context like local income and labor-force participation.',
    whereSeen: 'Behind every cost number and the cost choropleth map.',
  },
  {
    id: 'fips-code',
    name: 'County FIPS Code',
    category: 'Data & Sources',
    plain: 'A standard 5-digit number that uniquely identifies each U.S. county. New York counties all start with 36 (for example, 36061 is New York County / Manhattan).',
    body: 'Used to join cost data to the right county and to color the map. You don’t need it to use ChildcareGPT — it works behind the scenes.',
    whereSeen: 'The key linking cost data to counties.',
  },
]
