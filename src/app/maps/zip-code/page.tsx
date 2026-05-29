import { AppLayout } from '@/components/AppLayout'
import { ZipMapClient } from './ZipMapClient'

export const metadata = { title: 'ZIP Code Map · ChildcareGPT' }

export default function ZipMapPage() {
  return (
    <AppLayout showNavArrows>
      <ZipMapClient />
    </AppLayout>
  )
}
