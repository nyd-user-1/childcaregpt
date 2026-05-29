@AGENTS.md

---
## ⚠ TEMPLATE NOTICE — Read this first

**If you are NOT working on ChildcareGPT, this repo was cloned as a starting template.**

Do the following before writing any code:

### Step 1 — Configure the brand (5 minutes)
- **`src/lib/app-config.ts`** — set `APP_NAME`, `ACCENT_COLOR`, `CHART_NAV_EVENT`, `NAV_CYCLE`, `PATH_NAV`, `PATH_TITLE`, and all sidebar nav arrays
- **`src/components/AppLogo.tsx`** — swap `BottleBaby` for the new app's icon

### Step 2 — Connect a new database
- Create a new Neon project at neon.tech
- Add `DATABASE_URL` to `.env.local` and Vercel (Production + Preview + Development)
- Drop the childcare schema and create tables for the new domain
- Update `src/lib/db.ts` if needed (usually no change — it just reads `DATABASE_URL`)

### Step 3 — Write a new CLAUDE.md immediately
Replace this entire file with a project-specific CLAUDE.md covering:
- The new app's purpose and production URL
- Stack (Next.js 16, Neon Postgres, Tailwind, Google Maps — keep these unless you have a reason not to)
- New DB schema and table names
- New API routes
- New page structure and nav
- Any domain-specific rules

Delete everything from the `TEMPLATE NOTICE` line down through the end of the ChildcareGPT-specific content. The ChildcareGPT sections below are reference only — they describe the shape of what you're replacing, not what you're building.

### TODO — Remaining work to reach true clone-and-swap
The shell is template-ready. The content layer is not. To complete the template:
- Index pages (`/county`, `/facility`, `/zip-code`, `/city`) need generic `DataPage` stubs with placeholder queries
- `chart-configs.ts` needs to be the single file a clone rewrites (currently SQL is spread across 15 chart case statements in `chart/[slug]/page.tsx`)
- Map components (`NYCountyMap`, `NYCountyChoropleth`) are NY/childcare-specific
- API routes (`/api/facilities`, `/api/county-costs`) are domain-specific
- `/launchpad`, `/report`, `/eligibility` question content is childcare-specific

### What NOT to touch (reuse as-is)
- `src/components/AppLayout.tsx` — reads from app-config, no edits needed
- `src/components/Sidebar.tsx` — reads from app-config, no edits needed
- `src/components/AppPanel.tsx`, `PanelChart.tsx`, `PanelMap.tsx`, `PanelChat.tsx` — generic, reuse as-is
- `src/components/MiniCharts.tsx`, `CardCarousel.tsx`, `PlusMenu.tsx` — generic, reuse as-is
- `src/app/globals.css` — CSS vars and base styles, keep unless rebranding colors
- `src/lib/utils.ts` — `cn()` helper, keep as-is

---

# Database & API Infrastructure

## Neon Postgres (`wispy-hat-96132084` / `neon-bisque-arrow`)
Connection via `DATABASE_URL` env var (set in `.env.local` and Vercel Production/Preview/Development).
Client: `@neondatabase/serverless` — import `sql` from `@/lib/db`.

### Tables

#### `facilities` — 16,800 rows, keyed on `facility_id`
NY State OCFS regulated childcare providers (from `data.ny.gov` dataset `fymg-3wv3` + dates from `cb42-qumz`).
Key columns: `facility_id`, `program_type` (DCC/FDC/GFDC/SACC/SDCC), `county`, `facility_status`, `facility_name`, `city`, `zip_code`, `phone_number`, `provider_name`, `total_capacity`, `infant_capacity`, `toddler_capacity`, `preschool_capacity`, `school_age_capacity`, `profile_url`, `latitude`, `longitude`, `facility_opened_date`, `license_issue_date`, `license_expiration_date`.
Indexes: `county`, `program_type`, `facility_status`, `zip_code`, `region_code`.

#### `county_costs` — 930 rows, keyed on `(county_fips_code, studyyear)`
DOL National Database of Childcare Prices, NY counties only, 2008–2022.
Key columns: `county_fips_code` (e.g. `'36001'`), `county_name` (e.g. `'Albany County'`), `studyyear`, median/75th-pct center + family care costs by age group (`mcinfant`, `mctoddler`, `mcpreschool`, `mfccinfant`, etc.), women's labor force participation (`flfpr_20to64_under6`), income (`mhi`, `mfi`), poverty (`pr_f`, `pr_p`).

#### `county_demographics` — 62 rows, keyed on `county_fips`
U.S. Census ACS 5-year (2022), one row per NY county. Census variable → column:
`population` (B01003_001E) · `children_under6` (B23008_002E) · `under6_both_working` (B23008_004E) · `under6_single_father_working` (B23008_010E) · `under6_single_mother_working` (B23008_013E) · `under6_one_parent` (B23008_008E, single-parent total) · `births_past_year` (B13002_002E) · `under5_below_poverty` (B17020_003E) · `under5_above_poverty` (B17020_011E). Generated col `working_families_under6` = both-working + single-mother-working. Plus `county_name`, `studyyear`. Census negatives/suppressed → null.

#### `zip_demographics` — ~1,169 rows, keyed on `zip` (5-digit)
Same Census columns at ZCTA geography, filtered to ZIPs that have OCFS providers. No cost/income (county-only, DOL).

Query helpers: `src/lib/queries/county-demographics.ts` (`getCountyDemographics(bareCountyName)` — maps boroughs, e.g. Brooklyn→Kings County) and `src/lib/queries/zip-demographics.ts` (`getZipDemand(zip5)`). Both compute an **under-5** poverty rate (label it under-5, not under-6 — Census publishes under-5) from the below/above counts. Surfaced in the "Snapshot" table on county + ZIP detail pages.

### API Routes

| Route | Description |
|---|---|
| `GET /api/facilities` | Query facilities. Params: `county`, `program_type`, `status`, `limit` (max 200), `offset` |
| `GET /api/county-costs` | County cost data. Params: `year` (default 2022) |

### Ingest Scripts (`scripts/`)
- `ingest-facilities.mjs` — fetches both `fymg-3wv3` + `cb42-qumz`, merges dates, batch-upserts all 16,800 facilities. Run: `DATABASE_URL=... node scripts/ingest-facilities.mjs`
- `ingest-county-costs.mjs` — reads `dol-child-care-data.csv` (keep locally, not committed), inserts NY rows only. Run: `DATABASE_URL=... node scripts/ingest-county-costs.mjs`
- `ingest-county-demographics.mjs` — Census ACS5 2022 for all NY counties (`for=county:*&in=state:36`) → `county_demographics`. Run: `node --env-file=.env.local scripts/ingest-county-demographics.mjs` (needs `CENSUS_API_KEY` in `.env.local`, also set in Vercel).
- `ingest-zip-demographics.mjs` — Census ACS5 2022, all ZCTAs filtered to facility ZIPs → `zip_demographics`. Same run command. NB: single-ZCTA queries 302-redirect, so it fetches `for=...:*` then filters.
- `backfill-dates.mjs` — one-time script, already run, can be discarded.

---

## Map Components

### `NYCountyChoropleth` (`src/components/NYCountyChoropleth.tsx`)
Google Maps choropleth of all 62 NY counties colored by a selectable DOL cost metric.
- **Props:** `data: CountyCostRow[]` (from `/api/county-costs`), `metric?: ChoroplethMetric` (default `'mcinfant'`), `year?: number`, `onMetricChange?`, `className?`
- **Metrics:** `mcinfant` · `mctoddler` · `mcpreschool` · `mfccinfant` · `mfcctoddler` · `mfccpreschool` · `mhi` · `pr_f`
- Click on a county navigates to `/county/[slug]`
- Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already in Vercel + `.env.local`)

### GeoJSON assets (in `For Review/` — not yet promoted to `src/`)
All map components fetch GeoJSON from `https://raw.githubusercontent.com/nyd-user-1/nyd-geojson/main/`:
- `us-counties.geojson` — all US counties, FIPS-keyed (STATEFP + COUNTYFP)
- `us-states.geojson` — all 50 states + DC
- `ny-assembly-districts.geojson` — 150 districts, props: `District` (int), `Name`, `Party`
- `ny-senate-districts.geojson` — 63 districts, props: `DISTRICT` (int), `NAME`, `Party`

---

# ChildcareGPT Wireframe Rules

## The Golden Rule
This is a pixel-perfect port of SolarGPT. When in doubt, read the SolarGPT source at `/Users/brendanstanton/projects/*solargpt-demo`. Don't guess. Don't invent. Don't freelance.

## When Building a New Page or Slot
- If a reference component already exists in this codebase (e.g. `DetailPageCounty`), **copy it verbatim**. Do not rewrite it.
- Parallel route slots that mirror a full page **must use the exact same components** — do not rebuild them from scratch at a different size.
- If a container is smaller and components don't fit cleanly, **ask** rather than silently resizing text, cards, or spacing.

## Never Add What Isn't There
- Do not add UI elements (buttons, labels, icons, decorations) that don't exist in the reference design.
- Do not add X/close buttons, flanking chevrons, custom labels, or any new interaction patterns without explicit instruction.

## CSS Variables
- Before using any CSS variable as an opaque background, verify what it resolves to.
- `--inp-bg` is `rgba(0,0,0,0.04)` — nearly transparent. Use `--row-hover` (`#f5f5f5`) for solid hover backgrounds in tables.

---

## Theming (light + dark)

The app is colored through `--paper-*` CSS variables (`globals.css`). **Dark mode is a single `html.dark { … }` block** overriding those same tokens (warm onyx: panel `#1a1712`, cream text `#f0e9d8`, accent `#3f8479` — a balanced teal that holds contrast both as text on dark *and* as a white-text fill like the eligibility CTA). Adding `.dark` to `<html>` flips every paper surface, so **never hardcode hex for paper surfaces — use the tokens** or they won't flip.

- Toggle (sun/moon) lives in the `AppLayout` header. Defaults to **light** (paper voice is light-first); choice persists in `localStorage('theme')`. An inline script in `layout.tsx` applies `.dark` before paint to avoid a flash.
- Transition: View Transitions API — a `clip-path` circle expands from the click point. CSS in `globals.css` (`::view-transition-old/new(root)`) disables the default cross-fade.
- Known gap: `ChildcareDotMap`'s `MAP_STYLE` is hardcoded light, so the dot map glows light in dark mode (follow-up).

## Mobile (responsive rules)

**Every responsive change must be mobile-only and leave desktop byte-identical.** Put the mobile value as the base Tailwind class and re-assert desktop with `sm:`/`md:` (e.g. `pt-5 sm:pt-14`), or use `max-sm:` for mobile-only overrides. Verify desktop with a ~1180px screenshot.

- **Header** (`AppLayout`): sidebar toggle sits on the right on mobile (`order-last sm:order-first`), padding tightened — frees the top-left.
- **Panels are a drawer on mobile:** `#chat-panel-root` is `max-sm:fixed inset-0 z-50 justify-end pointer-events-none` so a panel overlays the page instead of pushing it; `AppPanel` wrapper has `max-sm:pointer-events-auto`. Desktop keeps the side-by-side push. Test a panel via `/console/[slug]?panel=providers` (opens deterministically).
- Detail/index/hub mastheads raise on mobile and hide non-essential above-the-fold copy with `max-sm:hidden`.
- **Still TODO (blocked by the other terminal's active map/launchpad edits):** `/console` mobile (map on top full-width, hide table, county dropdown) and `/launchpad`.

---

## Naming Conventions

### Pages
| Name | Route |
|------|-------|
| `DetailPageCounty` | `/county/[slug]` |
| `DetailPageFacility` | `/facility/[slug]` |
| `DetailPageZipCode` | `/zip/[slug]` |
| `DetailPageCity` | `/city/[slug]` |
| `IndexPageCounty` | `/county` |
| `IndexPageFacility` | `/facility` |
| `IndexPageZipCode` | `/zip-code` |
| `IndexPageCity` | `/city` |
| `LaunchpadPage` | `/launchpad` |

### Tables
| Name | Description |
|------|-------------|
| `DataTable` | Sticky first column, horizontal scroll, many columns — used on all index pages |
| `DataTableMini` | Simple compact table, zebra striping, no horizontal scroll — used on LaunchpadPage |

### InfoTable (accordion profile cards on detail pages)
`InfoTableCounty` · `InfoTableFacility` · `InfoTableCity` · `InfoTableZipCode` · `InfoTableState`

### Cards
| Name | Description |
|------|-------------|
| `CardLandscape` | Larger gradient cards — provider cards on LaunchpadPage |
| `CardLandscapeMini` | Smaller gradient cards — home page carousel AND detail page ZIP code cards (same component) |
| `CardChart` | Chart cards on `/charts` |
| `CardMap` | Map cards on `/maps` |

### ButtonGroup (detail page header)
`ButtonPrevious` · `ButtonNext` (circular, always active) · `ButtonChart` · `ButtonMap` · `ButtonChat`

### AppPanel
`AppPanel` — blank shell (header bar, scrollable body, footer slot)
- Sub-buttons: `ButtonPanelHalf` · `ButtonPanelThird`
- Implementations: `PanelChart` · `PanelMap` · `PanelChat`

### Navigation
`TabGroup` — underline-style tab navigation bar

### Step Forms (`/report`, `/eligibility`)
| Name | Description |
|------|-------------|
| `BigButton` | Large selectable answer tile — 2-col grid, toggles selected (solid accent) / unselected (bordered). Used for every question option (Yes/No, 2-option, 4-option). Same component regardless of grid size. |
| `BiggerButton` | Full-width primary action button — "CONTINUE →", "GET MY CHILDCARE REPORT →", etc. Solid accent fill, semibold uppercase, disabled state goes gray. |
| `ProgressBar` | Bottom-of-form step progress bar + percentage label. |

### Tables
| Name | Description |
|------|-------------|
| `ColumnHeader` | Sortable table column label with hover tooltip and optional "Learn more" link. Used in all index page DataTables. |

### Slot Views (parallel route @detail)
`DetailSlotCounty` — compact county detail rendered in the `@detail` slot on LaunchpadPage. No map placeholder, no section H2s. Uses same components as `DetailPageCounty`: H1, ButtonGroup, InfoTableCounty, CardLandscapeMini carousel.

### ChatInput (home page prompt box)
| Name | Description |
|------|-------------|
| `ChatInput` | Outer container — the whole rounded box (textarea + toolbar) |
| `ChatTextArea` | The `<textarea>` element inside ChatInput |
| `ChatToolBar` | Bottom row of ChatInput — icon buttons + ButtonSendChat |
| `ButtonSendChat` | Dark rounded-xl send button (also written `ButtonSend`) |

### Icons
| Name | Description |
|------|-------------|
| `IconBabyBottle` | ChildcareGPT brand icon |
| `IconMapPin` | Location/map pin icon in ChatToolBar |
| `IconMic` | Microphone icon in ChatToolBar |
| `IconPlus` | Plus/attach icon in ChatToolBar |
