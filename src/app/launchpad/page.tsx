'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

/* ── All 62 NY counties ───────────────────────────────────────────── */

const NY_COUNTIES = [
  { county: 'Albany',       providers: 142, seats: 4260,  filled: 3820,  open: 440,  diff: -38 },
  { county: 'Allegany',     providers:  22, seats:  660,  filled:  590,  open:  70,  diff:  +3 },
  { county: 'Bronx',        providers: 318, seats: 9540,  filled: 9100,  open: 440,  diff: +22 },
  { county: 'Broome',       providers:  67, seats: 2010,  filled: 1780,  open: 230,  diff: -12 },
  { county: 'Cattaraugus',  providers:  31, seats:  930,  filled:  840,  open:  90,  diff:  +4 },
  { county: 'Cayuga',       providers:  38, seats: 1140,  filled: 1020,  open: 120,  diff:  +5 },
  { county: 'Chautauqua',   providers:  58, seats: 1740,  filled: 1560,  open: 180,  diff:  +7 },
  { county: 'Chemung',      providers:  44, seats: 1320,  filled: 1180,  open: 140,  diff:  +6 },
  { county: 'Chenango',     providers:  19, seats:  570,  filled:  510,  open:  60,  diff:  -2 },
  { county: 'Clinton',      providers:  33, seats:  990,  filled:  880,  open: 110,  diff:  +4 },
  { county: 'Columbia',     providers:  27, seats:  810,  filled:  720,  open:  90,  diff:  +3 },
  { county: 'Cortland',     providers:  21, seats:  630,  filled:  560,  open:  70,  diff:  +2 },
  { county: 'Delaware',     providers:  14, seats:  420,  filled:  375,  open:  45,  diff:  -1 },
  { county: 'Dutchess',     providers:  89, seats: 2670,  filled: 2340,  open: 330,  diff:  +8 },
  { county: 'Erie',         providers: 245, seats: 7350,  filled: 6890,  open: 460,  diff: +15 },
  { county: 'Essex',        providers:  18, seats:  540,  filled:  480,  open:  60,  diff:  -4 },
  { county: 'Franklin',     providers:  16, seats:  480,  filled:  425,  open:  55,  diff:  +2 },
  { county: 'Fulton',       providers:  24, seats:  720,  filled:  640,  open:  80,  diff:  +3 },
  { county: 'Genesee',      providers:  29, seats:  870,  filled:  780,  open:  90,  diff:  +4 },
  { county: 'Greene',       providers:  17, seats:  510,  filled:  455,  open:  55,  diff:  +2 },
  { county: 'Hamilton',     providers:   4, seats:  120,  filled:   95,  open:  25,  diff:  +2 },
  { county: 'Herkimer',     providers:  20, seats:  600,  filled:  535,  open:  65,  diff:  +2 },
  { county: 'Jefferson',    providers:  46, seats: 1380,  filled: 1230,  open: 150,  diff:  +5 },
  { county: 'Kings',        providers: 425, seats: 12750, filled: 11900, open: 850,  diff: +18 },
  { county: 'Lewis',        providers:   9, seats:  270,  filled:  240,  open:  30,  diff:  +1 },
  { county: 'Livingston',   providers:  23, seats:  690,  filled:  615,  open:  75,  diff:  +3 },
  { county: 'Madison',      providers:  26, seats:  780,  filled:  695,  open:  85,  diff:  +3 },
  { county: 'Monroe',       providers: 198, seats: 5940,  filled: 5420,  open: 520,  diff:  +5 },
  { county: 'Montgomery',   providers:  22, seats:  660,  filled:  590,  open:  70,  diff:  +3 },
  { county: 'Nassau',       providers: 312, seats: 9360,  filled: 8750,  open: 610,  diff: +30 },
  { county: 'New York',     providers: 287, seats: 8610,  filled: 8200,  open: 410,  diff: -20 },
  { county: 'Niagara',      providers:  72, seats: 2160,  filled: 1940,  open: 220,  diff:  +6 },
  { county: 'Oneida',       providers:  84, seats: 2520,  filled: 2280,  open: 240,  diff: +11 },
  { county: 'Onondaga',     providers: 167, seats: 5010,  filled: 4650,  open: 360,  diff: +14 },
  { county: 'Ontario',      providers:  41, seats: 1230,  filled: 1100,  open: 130,  diff:  +5 },
  { county: 'Orange',       providers: 134, seats: 4020,  filled: 3700,  open: 320,  diff:  +9 },
  { county: 'Orleans',      providers:  16, seats:  480,  filled:  430,  open:  50,  diff:  +2 },
  { county: 'Oswego',       providers:  43, seats: 1290,  filled: 1150,  open: 140,  diff:  +5 },
  { county: 'Otsego',       providers:  18, seats:  540,  filled:  480,  open:  60,  diff:  +2 },
  { county: 'Putnam',       providers:  28, seats:  840,  filled:  760,  open:  80,  diff:  +3 },
  { county: 'Queens',       providers: 389, seats: 11670, filled: 10900, open: 770,  diff: +24 },
  { county: 'Rensselaer',   providers:  56, seats: 1680,  filled: 1520,  open: 160,  diff:  +7 },
  { county: 'Richmond',     providers:  98, seats: 2940,  filled: 2720,  open: 220,  diff: +12 },
  { county: 'Rockland',     providers: 143, seats: 4290,  filled: 3980,  open: 310,  diff: +16 },
  { county: 'St. Lawrence', providers:  37, seats: 1110,  filled:  990,  open: 120,  diff:  +4 },
  { county: 'Saratoga',     providers:  79, seats: 2370,  filled: 2110,  open: 260,  diff:  +9 },
  { county: 'Schenectady',  providers:  68, seats: 2040,  filled: 1830,  open: 210,  diff:  +8 },
  { county: 'Schoharie',    providers:  11, seats:  330,  filled:  295,  open:  35,  diff:  +1 },
  { county: 'Schuyler',     providers:   7, seats:  210,  filled:  188,  open:  22,  diff:  +1 },
  { county: 'Seneca',       providers:  12, seats:  360,  filled:  320,  open:  40,  diff:  +2 },
  { county: 'Steuben',      providers:  33, seats:  990,  filled:  885,  open: 105,  diff:  +4 },
  { county: 'Suffolk',      providers: 278, seats: 8340,  filled: 7800,  open: 540,  diff: +19 },
  { county: 'Sullivan',     providers:  26, seats:  780,  filled:  695,  open:  85,  diff:  +3 },
  { county: 'Tioga',        providers:  15, seats:  450,  filled:  400,  open:  50,  diff:  +2 },
  { county: 'Tompkins',     providers:  34, seats: 1020,  filled:  910,  open: 110,  diff:  +4 },
  { county: 'Ulster',       providers:  52, seats: 1560,  filled: 1395,  open: 165,  diff:  +6 },
  { county: 'Warren',       providers:  29, seats:  870,  filled:  775,  open:  95,  diff:  +3 },
  { county: 'Washington',   providers:  21, seats:  630,  filled:  560,  open:  70,  diff:  +2 },
  { county: 'Wayne',        providers:  31, seats:  930,  filled:  830,  open: 100,  diff:  +4 },
  { county: 'Westchester',  providers: 224, seats: 6720,  filled: 6250,  open: 470,  diff: +17 },
  { county: 'Wyoming',      providers:  13, seats:  390,  filled:  348,  open:  42,  diff:  +2 },
  { county: 'Yates',        providers:   8, seats:  240,  filled:  214,  open:  26,  diff:  +1 },
]

/* ── Provider cards per tab ───────────────────────────────────────── */

type Provider = { name: string; county: string }

const PROVIDERS: Record<string, Provider[]> = {
  'Family Day Care': [
    { name: "Sunshine Family Care",        county: 'Albany'      },
    { name: "Little Stars FDC",            county: 'Bronx'       },
    { name: "Maple Street Family Care",    county: 'Brooklyn'    },
    { name: "Rainbow Kids FDC",            county: 'Queens'      },
    { name: "Cozy Corner Care",            county: 'Nassau'      },
    { name: "Happy Home FDC",              county: 'Suffolk'     },
    { name: "Tender Hearts Family Care",   county: 'Westchester' },
    { name: "Blossom Family Day Care",     county: 'Erie'        },
    { name: "Little Sprouts FDC",          county: 'Monroe'      },
    { name: "Nest & Nurture Care",         county: 'Onondaga'    },
    { name: "Stepping Stones FDC",         county: 'Orange'      },
    { name: "Bright Days Family Care",     county: 'Dutchess'    },
    { name: "Cozy Kids FDC",               county: 'Rockland'    },
    { name: "Gentle Giants Care",          county: 'Saratoga'    },
    { name: "Morning Glory FDC",           county: 'Schenectady' },
    { name: "Sunrise Family Care",         county: 'Rensselaer'  },
    { name: "Tiny Treasures FDC",          county: 'Richmond'    },
    { name: "Meadow Kids Family Care",     county: 'Niagara'     },
    { name: "Clover Leaf FDC",             county: 'Oneida'      },
    { name: "Firefly Family Care",         county: 'Tompkins'    },
  ],
  'Group Family Day Care': [
    { name: "Happy Hearts Group Care",     county: 'Albany'      },
    { name: "Village Kids GFDC",           county: 'Bronx'       },
    { name: "Riverside Group Care",        county: 'Brooklyn'    },
    { name: "Hilltop Group FDC",           county: 'Queens'      },
    { name: "Pinecrest Group Care",        county: 'Nassau'      },
    { name: "Sunflower Group GFDC",        county: 'Suffolk'     },
    { name: "Orchard Group Care",          county: 'Westchester' },
    { name: "Blue Sky Group GFDC",         county: 'Erie'        },
    { name: "Horizon Group Care",          county: 'Monroe'      },
    { name: "Cedar Grove Group GFDC",      county: 'Onondaga'    },
    { name: "Parkside Group Care",         county: 'Orange'      },
    { name: "Harbor Light GFDC",           county: 'Dutchess'    },
    { name: "Waterfront Group Care",       county: 'Rockland'    },
    { name: "Birchwood Group GFDC",        county: 'Saratoga'    },
    { name: "Lakeview Group Care",         county: 'Schenectady' },
    { name: "Summit Group GFDC",           county: 'Rensselaer'  },
    { name: "Creekside Group Care",        county: 'Richmond'    },
    { name: "Willowbrook Group GFDC",      county: 'Niagara'     },
    { name: "Foxwood Group Care",          county: 'Oneida'      },
    { name: "Elmwood Group GFDC",          county: 'Tompkins'    },
  ],
  'School Age Child Care': [
    { name: "After School Academy",        county: 'Albany'      },
    { name: "Kids Zone SACC",              county: 'Bronx'       },
    { name: "Explorers After School",      county: 'Brooklyn'    },
    { name: "Discovery Kids SACC",         county: 'Queens'      },
    { name: "Champions After School",      county: 'Nassau'      },
    { name: "Scholars Club SACC",          county: 'Suffolk'     },
    { name: "Trailblazers After School",   county: 'Westchester' },
    { name: "Achievers SACC",              county: 'Erie'        },
    { name: "Pathfinders After School",    county: 'Monroe'      },
    { name: "Innovators SACC",             county: 'Onondaga'    },
    { name: "Leaders Club After School",   county: 'Orange'      },
    { name: "Creators SACC",               county: 'Dutchess'    },
    { name: "Voyagers After School",       county: 'Rockland'    },
    { name: "Builders SACC",               county: 'Saratoga'    },
    { name: "Dreamers After School",       county: 'Schenectady' },
    { name: "Pioneers SACC",               county: 'Rensselaer'  },
    { name: "Thinkers After School",       county: 'Richmond'    },
    { name: "Adventurers SACC",            county: 'Niagara'     },
    { name: "Sparks After School",         county: 'Oneida'      },
    { name: "Bridges SACC",               county: 'Tompkins'    },
  ],
  'Small Day Care Center': [
    { name: "Tiny Tots Center",            county: 'Albany'      },
    { name: "Bright Beginnings SDCC",      county: 'Bronx'       },
    { name: "Little Learners Center",      county: 'Brooklyn'    },
    { name: "Wonder Years SDCC",           county: 'Queens'      },
    { name: "Seedling Child Center",       county: 'Nassau'      },
    { name: "Sprout Small Care",           county: 'Suffolk'     },
    { name: "Bumblebee Day Center",        county: 'Westchester' },
    { name: "Pebble Path SDCC",            county: 'Erie'        },
    { name: "Button Nose Center",          county: 'Monroe'      },
    { name: "Acorn Day Care Center",       county: 'Onondaga'    },
    { name: "Ladybug SDCC",               county: 'Orange'      },
    { name: "Dewdrop Child Center",        county: 'Dutchess'    },
    { name: "Puddle Jump SDCC",            county: 'Rockland'    },
    { name: "Firefly Day Center",          county: 'Saratoga'    },
    { name: "Clover SDCC",                county: 'Schenectady' },
    { name: "Daisy Chain Center",          county: 'Rensselaer'  },
    { name: "Moonbeam SDCC",              county: 'Richmond'    },
    { name: "Starfish Day Center",         county: 'Niagara'     },
    { name: "Peppercorn SDCC",            county: 'Oneida'      },
    { name: "Buttercup Child Center",      county: 'Tompkins'    },
  ],
}

const CARD_GRADIENTS = [
  ['#fca5a5', '#dc2626'],
  ['#22d3ee', '#0e7490'],
  ['#4ade80', '#15803d'],
  ['#fde047', '#b45309'],
  ['#34d399', '#065f46'],
  ['#60a5fa', '#1d4ed8'],
  ['#2dd4bf', '#0f766e'],
  ['#c084fc', '#7e22ce'],
  ['#fb923c', '#c2410c'],
  ['#f472b6', '#be185d'],
]

const PROVIDER_TABS = [
  'Family Day Care',
  'Group Family Day Care',
  'School Age Child Care',
  'Small Day Care Center',
]

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState(0)
  const currentProviders = PROVIDERS[PROVIDER_TABS[activeTab]]

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-4 flex flex-col gap-5">

          {/* ── Top: table (52%) + map (flex-1), h-[380px] ── */}
          <div className="h-[380px] flex flex-col shrink-0">
            <div className="flex-1 min-h-0 flex gap-4">

              <div className="w-[52%] min-w-0 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--surface)]">
                      <tr className="border-b border-[var(--border)]">
                        {['County','Providers','Seats','Seats Filled','Seats Open','Difference (+/-)'].map(h => (
                          <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NY_COUNTIES.map((row, i) => (
                        <tr key={row.county} className={cn('border-b border-[var(--border2)]', i % 2 !== 0 && 'bg-[var(--inp-bg)]')}>
                          <td className="px-4 py-3 font-medium text-[var(--txt)]">{row.county}</td>
                          <td className="px-4 py-3 text-[var(--txt2)]">{row.providers}</td>
                          <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.seats)}</td>
                          <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.filled)}</td>
                          <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.open)}</td>
                          <td className={cn('px-4 py-3 font-semibold', row.diff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {row.diff >= 0 ? `+${row.diff}` : row.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex-1 min-w-0 rounded-xl border border-[var(--border)] overflow-hidden flex flex-col items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#e8f4fb 0%,#d0eaf7 100%)' }}>
                <Map className="h-12 w-12 text-[var(--muted)]" />
                <p className="text-sm font-medium text-[var(--txt2)]">New York State</p>
                <p className="text-xs text-[var(--muted)]">County Map</p>
              </div>

            </div>
          </div>

          {/* ── Bottom: sticky tabs + provider cards ── */}
          <div>
            <div className="sticky top-0 z-10 bg-[var(--surface)] -mx-4 px-4 flex items-center gap-1 border-b border-[var(--border)] mb-4">
              {PROVIDER_TABS.map((t, i) => (
                <button key={t} onClick={() => setActiveTab(i)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                    activeTab === i
                      ? 'border-blue-500 text-[var(--txt)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--txt)]'
                  )}>
                  {t}
                </button>
              ))}
            </div>

            {/* Provider cards — landscape grid, changes per tab */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
              {currentProviders.map((p, i) => {
                const [light, dark] = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                return (
                  <div key={`${p.name}-${i}`}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${light}, ${dark})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-2 py-1">
                      <span className="text-xs font-bold text-white">{PROVIDER_TABS[activeTab].split(' ').map(w => w[0]).join('')}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                      <p className="text-sm font-bold text-white leading-snug">{p.name}</p>
                      <p className="text-[10px] text-white/70">{p.county}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
