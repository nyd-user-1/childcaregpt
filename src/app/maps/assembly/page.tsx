import { AppLayout } from '@/components/AppLayout'
import DistrictChoropleth from '@/components/DistrictChoropleth'
import { getDistrictRows } from '@/lib/district-data'

export const metadata = { title: 'State Assembly Map · ChildcareGPT' }

export default async function AssemblyMapPage() {
  const data = await getDistrictRows('assembly')
  return (
    <AppLayout showNavArrows>
      <DistrictChoropleth
        chamber="assembly"
        districtProp="district"
        data={data}
        thresholds={[200, 120, 90, 65, 40]}
        legend={['200+', '120–200', '90–120', '65–90', '40–65', '< 40']}
      />
    </AppLayout>
  )
}
