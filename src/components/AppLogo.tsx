/**
 * AppLogo.tsx — swap this component when cloning for a new app.
 * Replace BottleBaby with your own icon and update the style defaults.
 */

import { BottleBaby } from '@/components/BottleBaby'
import { ACCENT_COLOR } from '@/lib/app-config'

export function AppLogo({ className }: { className?: string }) {
  return (
    <BottleBaby
      className={className}
      style={{ stroke: ACCENT_COLOR, fill: `${ACCENT_COLOR}26` }}
    />
  )
}
