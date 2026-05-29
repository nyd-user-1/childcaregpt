import { notFound } from 'next/navigation'
import { getDistrictDetail, districtCount, type Chamber } from '@/lib/district-data'
import { DistrictShell } from './Shell'

function parseChamber(raw: string): Chamber | null {
  return raw === 'senate' || raw === 'assembly' ? raw : null
}

export async function generateMetadata({ params }: { params: Promise<{ chamber: string; district: string }> }) {
  const { chamber: rawChamber, district: rawDistrict } = await params
  const chamber = parseChamber(rawChamber)
  const n = Number(rawDistrict)
  if (!chamber || !Number.isInteger(n)) return { title: 'District · ChildcareGPT' }
  const label = chamber === 'senate' ? 'Senate' : 'Assembly'
  return {
    title: `${label} District ${n} · ChildcareGPT`,
    description: `Your New York State ${label} representative for District ${n} — contact info and licensed child care in the district.`,
  }
}

export default async function DistrictPage({ params }: { params: Promise<{ chamber: string; district: string }> }) {
  const { chamber: rawChamber, district: rawDistrict } = await params
  const chamber = parseChamber(rawChamber)
  const n = Number(rawDistrict)
  if (!chamber || !Number.isInteger(n) || n < 1 || n > districtCount(chamber)) notFound()

  const detail = await getDistrictDetail(chamber, n)
  if (!detail) notFound()

  const total = districtCount(chamber)
  const prev = ((n - 2 + total) % total) + 1
  const next = (n % total) + 1

  return <DistrictShell detail={detail} prevDistrict={prev} nextDistrict={next} />
}
