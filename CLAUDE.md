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

## Neon Postgres — org **2525 LLC**, project `round-block-26042209` (childcaregpt)
Migrated 2026-08-15 from the legacy Vercel-managed project `wispy-hat-96132084` (full `pg_restore` of `public`; row counts verified identical, then re-ingested). The legacy project can be deleted once the new Vercel org is confirmed live on the new URL.
Connection via `DATABASE_URL` env var (set in `.env.local` and Vercel Production/Preview/Development).
Client: `@neondatabase/serverless` — import `sql` from `@/lib/db`.

**Vercel:** team **`nys-gpt`** (vercel.com/nys-gpt), project `childcaregpt` (`prj_hhebv0eKXlZZ4UxVj52UdmCcT2fg`) — moved 2026-08-15 from the legacy `nyd-user-1's projects` team. Deploy with `vercel --prod`. Production domain **childcare.nysgpt.com** (Cloudflare CNAME → vercel-dns) — verified onto the nys-gpt project 2026-08-15 (Cloudflare TXT `_vercel` = `vc-domain-verify=childcare.nysgpt.com,…`, then `vercel api …/domains/childcare.nysgpt.com/verify -X POST`). The legacy Vercel project + legacy Neon `wispy-hat-96132084` no longer serve anything and can be deleted. The raw `*.vercel.app` URLs sit behind Vercel Deployment Protection (`vercel curl` bypasses it). Blob store `childcaregpt-geojson` (`store_YQgDMCffW53IYqFq`, private, iad1) holds the district GeoJSON for `/api/geojson/[key]`; re-upload with `node --env-file=.env.local scripts/geojson-build/upload-blob.mjs` (full-res files must be copied from `For Review/` to repo root first).

### Tables

#### `facilities` — 17,285 rows, keyed on `facility_id`
NY State OCFS regulated childcare providers (from `data.ny.gov` dataset `fymg-3wv3` + dates from `cb42-qumz`). The ingest is upsert-only and **never deletes**; two timestamps carry lifecycle:
- `ingested_at` — first time we saw the facility (never overwritten). Rows whose `ingested_at` equals the latest run are **new** (485 as of 2026-08-15). **TODO: show a "New" badge on `DetailPageFacility` for these** (and probably in `/facility` index rows / provider cards).
- `last_seen_at` — most recent run that returned it. Rows with `last_seen_at IS NULL` or older than the latest run are **retired by OCFS** (555 as of 2026-08-15) — currently kept, not surfaced or filtered anywhere; decide whether to hide/label them.
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
| `POST /api/interest` | Record a parent's interest in a facility + email them (see `facility_interest`). Header `x-childcare-source: mcp\|chat` = attribution. |
| `POST /api/chat` | The in-app assistant (Bedrock, SSE) — see "Chat engine". |
| `GET/POST /api/mcp` | The MCP server — see "MCP server". `/.well-known/mcp.json` is its discovery card. |

### `facility_interest` — a parent's interest in one provider (the one public write)
`id`, `facility_id` → `facilities`, `first_name`, `last_name`, `email`, `phone`, `children`, `start_when`, `message`, `source` (`web`|`mcp`|`chat`), `created_at`. Written only by `createInterest()` in `src/lib/interest.ts` (validates, inserts, emails the PARENT a confirmation with the provider's phone + OCFS profile + funding links — providers publish a phone with the state, not an email). Exposed as `POST /api/interest`; the MCP `express_interest` tool posts to that route over HTTP (leuk's booking pattern — one write path). **Resend is in sandbox mode** (`onboarding@resend.dev` → only `brendan@nysgpt.com` receives); verify `nysgpt.com` at resend.com/domains and set `RESEND_FROM_EMAIL` to send to real parents — this also gates `/api/send-application` and `/api/send-eligibility`.

---

## Chat engine — Claude on Amazon Bedrock

`/api/chat` (`src/app/api/chat/route.ts`) runs the AI SDK (`streamText` + tools) against **Bedrock**, ported from leuk's `app/api/ai/directory/route.ts` on 2026-08-15. Provider + credentials in `src/lib/ai/bedrock.ts` (`CHILDCARE_BEDROCK_REGION`, `CHILDCARE_BEDROCK_MODEL_ID`, and `CHILDCARE_BEDROCK_API_KEY` *or* `CHILDCARE_AWS_ACCESS_KEY_ID`/`SECRET`; same AWS account/key as leuk's `LEUK_BEDROCK_*`). `chatModel()` falls back to the first-party Anthropic key (`CLAUDE_CHILDCARE_API_KEY`, currently **out of credit**) through the same code path when Bedrock isn't configured — remove once Bedrock is live everywhere. The **wire format is unchanged**: `data: {"text"}` deltas · one `data: {"meta"}` (facilities → map/cards, eligDraft → application card) · `data: [DONE]`; the client (`src/hooks/useChat.ts`) is untouched. Tools are the single list in `src/lib/chat-tools.ts` (Anthropic tool JSON schema wrapped with `jsonSchema()`); `find_facilities` also takes `city` / `zip` now.

---

## MCP server — `/api/mcp` (+ `/.well-known/mcp.json`)

Streamable HTTP, authless, tools-only, stateless — a port of leuk's `app/api/mcp/route.ts` (which descends from 44b's). Connect: `claude mcp add --transport http childcaregpt https://childcare.nysgpt.com/api/mcp`, or claude.ai → Settings → Connectors → custom connector. Smoke test: `node scripts/mcp-smoke.mjs [url] [--interest you@example.com]`.

| Layer | File | Rule |
|---|---|---|
| Transport + instructions + tool registration | `src/app/api/mcp/route.ts` | Transport only. No data access here. |
| Reads | `src/lib/mcp/tools.ts` | Thin over `executeToolCall` in `src/lib/chat-tools.ts` — MCP and chat can never disagree. Adds site-relative `href` (route absolutizes to `url`) and staples `funding` onto every search. |
| The one write | `src/lib/mcp/interest.ts` | Posts to `/api/interest` over HTTP with `x-childcare-source: mcp` (attribution, not authorization). No read path. |
| Funding surface | `src/lib/funding.ts` | The three forms as data (`/eligibility`, `/application`, `/report`). Edit here only. |
| The card (MCP App) | `mcp-app/care/care.html` + `care.ts` → `src/lib/mcp/app/care-html.generated.ts` | Built by `scripts/build-mcp-app.mjs` (runs in `npm run build`; commit the output). URI `ui://childcaregpt/care.<hash>.html`, mime `text/html;profile=mcp-app`. Screens: **results** (map · rows with **I'm interested** · funding strip) → **interest form** → **receipt** · **facility** · **district** (results with a legislator header + district totals) · **costs** (county vs. NY median bars by age, center vs family) · **funding**. Paper-voice tokens inlined. The map is an **OpenStreetMap/CARTO tile mosaic** drawn in the card (Web-Mercator maths, our own pins, attribution printed; `resourceDomains: *.basemaps.cartocdn.com`) — no Google, no key. |
| Geocoding | `src/lib/geocode.ts` | `find_facilities.near` → **Nominatim** (OSM), New York-bounded, identifying User-Agent, in-memory cache. Feeds the existing distance-ranking path in `chat-tools.ts` (`ctx.location`). Self-host Nominatim/Photon if volume ever matters. |

Tools: `find_facilities`\* (county/city/zip/**near**/program_type/q) · `find_facilities_by_district`\* (+ `district.legislator`, district-wide totals) · `get_facility`\* · `get_county_costs`\* (+ `state_median`, `funding`) · `funding_programs`\* · `list_program_types` · `filters` · `express_interest`\* (\* renders the card). Instructions tell the model: never invent a provider, capacity ≠ availability, surface help-paying-for-care with every search, the card is the interest form, never decide eligibility. NYC boroughs get no `county_url` — the site's `/county/kings` etc. 404 today (facilities store borough names; pre-existing).

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

- **Full bleed.** `html`/`body` paint `var(--paper)` on mobile (no desk color peeks through the iOS safe area); the AppLayout main panel's `border` + drop shadow are `sm:` only.
- **No header bar on mobile.** The AppLayout header is `hidden sm:flex`. The sidebar toggle is a **draggable FAB** (bottom-right, snaps to nearest edge — ported from SportsGPT) that lives in AppLayout.
- **Sidebar = left drawer.** On mobile the sidebar root is `max-sm:fixed inset-y-0 left-0 z-50 max-sm:w-[300px]` with a translateX slide + a tap-to-close backdrop; auto-closes on navigation (matchMedia-gated). Desktop keeps the width-push.
- **Panels = right sheet.** `#chat-panel-root` is `max-sm:fixed inset-0 z-50 justify-end pointer-events-none` so a panel overlays the page instead of pushing it; `AppPanel` wrapper has `max-sm:pointer-events-auto`. Test deterministically via `/console/[slug]?panel=providers`.
- **Theme toggle** sits in the header on desktop and moves into the **Sidebar footer** on mobile (consumes `dark` + `onToggleTheme` props from AppLayout — single source of truth, no desync).
- **Table → chip rail pattern.** When a desktop page pairs a selection table with a map (`/console`, `/launchpad`), on mobile the table is `max-sm:hidden` and replaced by a horizontal-scroll **chip rail** above a full-width map hero. Each chip carries the row's key metric (FPS / seats) and a severity dot, so the ranking semantics survive in a thumb-scrollable strip.
- **Tabs / cards in narrow widths.** Tab rows get `max-sm:overflow-x-auto max-sm:no-scrollbar` + `shrink-0 whitespace-nowrap` on each tab (e.g. console detail's program-type bar, launchpad's program-type tabs). Provider-card grids drop to `grid-cols-2` + `max-sm:aspect-square` with secondary lines/CTAs `max-sm:hidden`.
- **Map legend (`ChildcareDotMap`)** defaults open on desktop, **closed on mobile** via a lazy `useState` initializer that checks `matchMedia('(max-width: 639px)')`.
- Index/hub mastheads raise on mobile and hide non-essential above-the-fold copy with `max-sm:hidden`. H1 clamp floors are tuned (≤ ~1.9rem) so two-line designs don't break into three.

## Command Palette (`⌘K`)

`src/components/CommandPalette.tsx`, mounted in the root layout so it works on every page.

- `⌘K` / `Ctrl+K` toggles; `Esc` or backdrop-click closes; arrow keys + `Enter` select.
- Empty state: persisted **recents** (localStorage `cc-cmdk-recent`, max 5) + a **Go to** quick-nav (Counties, Cities, ZIP Codes, Providers, Console, Launchpad, Data).
- Typing ≥ 2 chars debounced-fetches `/api/search` and groups results — Counties · Cities · ZIP Codes · Providers · Charts — plus a `Search for "…"` fallback to `/search?q=…`. Reuses the existing search infra; no new API or table.
- Active row's icon + primary label flip to `var(--paper-accent)` — matches the project's link/hover convention.

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
