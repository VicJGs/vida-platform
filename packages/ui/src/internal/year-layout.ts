// fe-calendar #19 · S4 — the pure mini-month geometry + density guards behind YearView (PLAN-S4-year-renderer.md
// BR-3/10). TZ-safe: every date is built from numeric parts via setFullYear at local NOON (a bare new Date(y,…) maps
// years 0–99 to 1900+y; noon keeps a DST-at-midnight zone on the right day) and keyed from its calendar fields — never
// a 'YYYY-MM-DD' string parsed by Date (UTC midnight → the day before in UTC−3).

/** The narrowest a mini-month gets before the grid drops a column (2-up at 375, 4-up from ~600px content). */
export const MONTH_MIN = 128

export type YearSlot =
  | { kind: 'spacer' }
  /** `col` is the 1-based visual column (aria-colindex); `weekday` is Date#getDay (0 = Sunday). */
  | { kind: 'day'; key: string; day: number; col: number; weekday: number }

export interface MiniMonth {
  /** 0–11 (the Date#getMonth convention — what `onPickMonth` emits). */
  month: number
  /** Leading blank slots before day 1, from the week start. */
  offset: number
  days: number
  /** Rows of exactly 7 slots: leading spacers · days · trailing spacers (so a short last row never stretches). */
  rows: YearSlot[][]
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function localDate(y: number, m: number, d: number): Date {
  const dt = new Date(0)
  dt.setFullYear(y, m, d)
  dt.setHours(12, 0, 0, 0)
  return dt
}

function keyOf(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${pad2(m + 1)}-${pad2(d)}`
}

/** A usable 4-digit year, else `now`'s year + a warning (BR-10). Pure — the component injects `new Date()`. */
export function resolveYear(year: number, now: Date): { year: number; warning?: string } {
  if (Number.isInteger(year) && year >= 1000 && year <= 9999) return { year }
  return {
    year: now.getFullYear(),
    warning: `year ${String(year)} is not a 4-digit integer; showing ${now.getFullYear()}`,
  }
}

export function buildYear(year: number, weekStartsOn: 0 | 1): MiniMonth[] {
  return Array.from({ length: 12 }, (_, month) => {
    const offset = (localDate(year, month, 1).getDay() - weekStartsOn + 7) % 7
    const days = localDate(year, month + 1, 0).getDate()
    const slots: YearSlot[] = Array.from({ length: offset }, () => ({ kind: 'spacer' }) as const)
    for (let day = 1; day <= days; day++) {
      const i = offset + day - 1
      slots.push({
        kind: 'day',
        key: keyOf(year, month, day),
        day,
        col: (i % 7) + 1,
        weekday: localDate(year, month, day).getDay(),
      })
    }
    while (slots.length % 7 !== 0) slots.push({ kind: 'spacer' })
    const rows: YearSlot[][] = []
    for (let r = 0; r < slots.length; r += 7) rows.push(slots.slice(r, r + 7))
    return { month, offset, days, rows }
  })
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Index the provider's density by day key (BR-10). Level 0 = no dot (dropped silently). Skipped + warned: a malformed
 * key, an impossible date (2026-02-30 — round-tripped through the calendar), a date outside `year`, a level not 0|1|2.
 * A duplicate date keeps the MAX level + warns — a provider contradiction must never hide activity.
 */
export function indexDensity(
  year: number,
  density: readonly { date: string; level: number }[],
): { byDate: Map<string, 1 | 2>; warnings: string[] } {
  const byDate = new Map<string, 1 | 2>()
  const seen = new Set<string>()
  const warnings: string[] = []
  for (const { date, level } of density) {
    const m = DATE_KEY.exec(date)
    if (!m) {
      warnings.push(`density date "${date}" is not YYYY-MM-DD; skipped`)
      continue
    }
    const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
    const real = localDate(y, mo, d)
    if (real.getFullYear() !== y || real.getMonth() !== mo || real.getDate() !== d) {
      warnings.push(`density date "${date}" does not exist; skipped`)
      continue
    }
    if (y !== year) {
      warnings.push(`density date "${date}" is outside ${year}; skipped`)
      continue
    }
    if (level !== 0 && level !== 1 && level !== 2) {
      warnings.push(`density level ${String(level)} for "${date}" is not 0|1|2; skipped`)
      continue
    }
    if (seen.has(date)) warnings.push(`density date "${date}" appears more than once; keeping the highest level`)
    seen.add(date)
    if (level === 0) continue
    const prev = byDate.get(date)
    byDate.set(date, prev != null && prev > level ? prev : level)
  }
  return { byDate, warnings }
}
