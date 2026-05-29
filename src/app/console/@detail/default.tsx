'use client'

import dynamic from 'next/dynamic'

// Client-only: pulls Google Maps + the provider dataset.
const ChildcareDotMap = dynamic(() => import('@/components/ChildcareDotMap'), { ssr: false })

export default function ConsoleDetailDefault() {
  return (
    <div className="h-full w-full overflow-hidden" style={{ background: 'var(--paper-2)' }}>
      <ChildcareDotMap />
    </div>
  )
}
