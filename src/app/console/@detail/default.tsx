import { Map } from 'lucide-react'

export default function ConsoleDetailDefault() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: 'var(--paper)', color: 'var(--paper-faint)' }}>
      <Map className="h-12 w-12 opacity-40" />
      <p className="text-sm font-medium">Select a county to view providers on the map</p>
    </div>
  )
}
