@AGENTS.md

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

### Icons
`IconBabyBottle` — ChildcareGPT brand icon
