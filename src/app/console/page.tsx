import { getCountySupplyNeed } from '@/lib/queries/console'
import { ConsoleList } from './ConsoleList'

export default async function ConsolePage() {
  const rows = await getCountySupplyNeed()
  return <ConsoleList rows={rows} />
}
