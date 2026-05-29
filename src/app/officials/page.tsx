import { getDistrictRows } from '@/lib/district-data'
import OfficialsTable, { type OfficialRow } from './OfficialsTable'

export const metadata = {
  title: 'Elected Officials · ChildcareGPT',
  description: 'New York State Senate and Assembly members by district, with the count of licensed child care providers each represents.',
}

export default async function OfficialsPage({ searchParams }: { searchParams: Promise<{ chamber?: string }> }) {
  const [{ chamber }, senate, assembly] = await Promise.all([
    searchParams,
    getDistrictRows('senate'),
    getDistrictRows('assembly'),
  ])

  const rows: OfficialRow[] = [
    ...senate.map(r => ({ ...r, chamber: 'senate' as const })),
    ...assembly.map(r => ({ ...r, chamber: 'assembly' as const })),
  ]

  const initialChamber = chamber === 'senate' || chamber === 'assembly' ? chamber : 'all'

  return <OfficialsTable officials={rows} initialChamber={initialChamber} />
}
