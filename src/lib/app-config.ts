/**
 * app-config.ts — the ONE file to edit when cloning this repo for a new app.
 *
 * Change APP_NAME, ACCENT_COLOR, the nav arrays, and the path maps here.
 * Swap the logo in src/components/AppLogo.tsx.
 */

import {
  MessageCircle, LayoutDashboard, Rocket, BarChart3, Map,
  Building2, School, Hash, Landmark, ClipboardList,
} from 'lucide-react'
import { CHART_CONFIGS } from '@/lib/chart-configs'

// ── Brand ──────────────────────────────────────────────────────────────────
export const APP_NAME        = 'ChildcareGPT'
export const ACCENT_COLOR    = '#38bdf8'
export const CHART_NAV_EVENT = 'childcaregpt:chart-nav'

// ── Top-level nav cycle (prev/next arrows in AppLayout header) ─────────────
export const NAV_CYCLE = [
  '/charts',
  ...CHART_CONFIGS.map(c => `/chart/${c.slug}`),
  '/maps',
  '/county',
  '/facility',
  '/zip-code',
  '/city',
  '/launchpad',
]

// ── Sidebar active-label lookup (exact path → label) ──────────────────────
export const PATH_NAV: Record<string, string> = {
  '/':          'Chat',
  '/charts':    'Charts',
  '/maps':      'Maps',
  '/county':    'County',
  '/facility':  'Facility',
  '/zip-code':  'Zip Code',
  '/city':      'City',
  '/launchpad': 'Launchpad',
  '/report':      'Report',
  '/eligibility': 'Eligibility',
  '/glossary':    'Glossary',
}

// ── Page title shown in AppLayout header (exact path → title) ─────────────
export const PATH_TITLE: Record<string, string> = {
  '/charts':      'Charts',
  '/maps':        'Maps',
  '/county':      'County',
  '/facility':    'Facilities',
  '/zip-code':    'ZIP Codes',
  '/city':        'Cities',
  '/launchpad':   'Launchpad',
  '/report':      'Report',
  '/eligibility': 'Eligibility',
  '/glossary':    'Glossary',
}

// ── Sidebar nav items ──────────────────────────────────────────────────────
export type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; href: string }

export const SIDEBAR_NAV_TOP: NavItem[] = [
  { label: 'Chat',      icon: MessageCircle,   href: '/'          },
  { label: 'Charts',    icon: LayoutDashboard, href: '/charts'    },
  { label: 'Maps',      icon: Map,             href: '/maps'      },
  { label: 'County',    icon: Building2,       href: '/county'    },
  { label: 'Facility',  icon: School,          href: '/facility'  },
  { label: 'Zip Code',  icon: Hash,            href: '/zip-code'  },
  { label: 'City',      icon: Landmark,        href: '/city'      },
  { label: 'Launchpad', icon: Rocket,          href: '/launchpad' },
]

export const SIDEBAR_NAV_BOTTOM: NavItem[] = [
  { label: 'Report',      icon: BarChart3,     href: '/report'      },
  { label: 'Eligibility', icon: ClipboardList, href: '/eligibility' },
]

export const SIDEBAR_DATA_ITEMS: string[] = [
  'Counties', 'Cities', 'Facilities', 'Zip Codes',
]

export const SIDEBAR_MAP_ITEMS: string[] = [
  'NY Counties', 'Cost Map',
]

export const SIDEBAR_FOOTER_LABEL = 'Glossary'
