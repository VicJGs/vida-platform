// fe-calendar #19 — helpers shared by the calendar range renderers (agenda · week · year · living). Extracted at the rule
// of three (PLAN-S3 §5.2 → PLAN-S5 BR-CAL-S5-15); no behaviour change.
import type { CSSProperties } from 'react'

/** A 'YYYY-MM-DD' day key. */
export const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** sr-only — visually hidden but announced (the neural-graph NG-5 recipe). Its containing block must be inside any
 *  overflow:auto scroller (`position:relative` on the scroller) or it widens the page (the S3 gate lesson). */
export const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

/** Parse a 'YYYY-MM-DD' key by its PARTS into a LOCAL date — never new Date(str) (UTC midnight → the day before in UTC−3). */
export function parseLocalDate(key: string): Date | null {
  const m = DATE_KEY.exec(key)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
