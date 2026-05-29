import { AppLayout } from '@/components/AppLayout'

export const metadata = {
  title: 'Launchpad · ChildcareGPT',
  description: 'Browse real, regulated New York child care providers by county, city, ZIP code, and program type.',
}

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout showNavArrows>{children}</AppLayout>
}
