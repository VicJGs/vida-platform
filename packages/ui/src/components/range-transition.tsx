import { useRef, type ReactElement, type ReactNode } from 'react'
import { View } from '@tamagui/core'
import { ensureCalendarMotionStyles } from '../internal/calendar-motion'

// fe-calendar S7 (EC-F2 range-transition, PLAN-S7 G15/R9) — wraps a calendar range region so a range SWITCH fades the new
// renderer in (opacity, motion token `moderate` 250ms ease-out; reduced motion = instant via the shared @media block). The
// first render never fades (the page already has its own entry); the same key never remounts (prev/next keeps the key —
// the consumer keys on the range alone, so a Year page-turn does not rebuild 365 cells).

export interface RangeTransitionProps {
  /** Changing this remounts the region with the fade. Pass the active range. */
  transitionKey: string
  children: ReactNode
}

export function RangeTransition({ transitionKey, children }: RangeTransitionProps): ReactElement {
  ensureCalendarMotionStyles()
  // A latch: once the key has EVER differed from the first one, every later switch fades — including the switch BACK to
  // the first range (comparing against the first key alone skipped that one — g2 review #7). Only the mount is still.
  const firstKey = useRef(transitionKey)
  const switched = useRef(false)
  if (transitionKey !== firstKey.current) switched.current = true
  return (
    <View key={transitionKey} className={switched.current ? 'vida-range-fade' : undefined}>
      {children}
    </View>
  )
}

export default RangeTransition
