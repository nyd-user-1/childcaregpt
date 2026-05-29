import { AppLayout } from '@/components/AppLayout'
import DistrictChoropleth from '@/components/DistrictChoropleth'
import { getDistrictRows } from '@/lib/district-data'

export const metadata = { title: 'State Senate Map · ChildcareGPT' }

export default async function SenateMapPage() {
  const data = await getDistrictRows('senate')
  return (
    <AppLayout showNavArrows>
      <DistrictChoropleth
        chamber="senate"
        districtProp="district"
        data={data}
        thresholds={[300, 230, 190, 140, 90]}
        legend={['300+', '230–300', '190–230', '140–190', '90–140', '< 90']}
      />
    </AppLayout>
  )
}
