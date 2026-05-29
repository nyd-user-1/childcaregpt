import { Suspense } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { SearchShell } from './SearchShell'

export const metadata = {
  title: 'Search · ChildcareGPT',
  description: 'Search New York child care — counties, cities, ZIP codes, licensed providers, and data charts.',
}

export default function SearchPage() {
  return (
    <AppLayout>
      <Suspense>
        <SearchShell />
      </Suspense>
    </AppLayout>
  )
}
