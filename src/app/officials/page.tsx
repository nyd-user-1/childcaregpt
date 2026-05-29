import { getDistrictRows } from '@/lib/district-data'
import OfficialsTable, { type OfficialRow } from './OfficialsTable'

export const metadata = {
  title: 'Elected Officials · ChildcareGPT',
  description: 'New York State Senate and Assembly members by district, with the count of licensed child care providers each represents.',
}

export default async function OfficialsPage() {
  const [senate, assembly] = await Promise.all([
    getDistrictRows('senate'),
    getDistrictRows('assembly'),
  ])

  const rows: OfficialRow[] = [
    ...senate.map(r => ({ ...r, chamber: 'senate' as const })),
    ...assembly.map(r => ({ ...r, chamber: 'assembly' as const })),
  ]

  return <OfficialsTable officials={rows} />
}
