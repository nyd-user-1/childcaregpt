import { AppLayout } from '@/components/AppLayout'
import { GlossaryClient } from './GlossaryClient'

export const metadata = {
  title: 'Glossary · ChildcareGPT',
  description: 'Plain-language definitions of New York child care terms — program types, costs, subsidies, eligibility, and quality.',
}

export default function GlossaryPage() {
  return (
    <AppLayout>
      <GlossaryClient />
    </AppLayout>
  )
}
