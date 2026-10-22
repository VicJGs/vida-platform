// fe-calendar #19 · S3 — the pure time-column geometry behind WeekView (PLAN-S3-week-day-renderer.md BR-3/6/7/8).
// No Date, no TZ: hours are plain local-clock numbers (9.5 = 09:30) the provider already resolved. Kept out of the
// component so the lane maths is unit-tested on its own.

export const HOUR_PX = 48
/** Smallest drawn block — one caption line. Overlap is judged on DRAWN extents, so a short block can't cover a neighbour. */
export const MIN_BLOCK_PX = 24
/** Below this a block can't hold time-over-title; it falls to the one-row "09:30 Title" anatomy. */
export const COMPACT_PX = 44
export const DEFAULT_HOURS: readonly [number, number] = [8, 20]

const MIN_SPAN_H = MIN_BLOCK_PX / HOUR_PX
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Clock label for a fractional hour. `start` clamps to 23:59, `end` may read 24:00 / 12:00 am; `gutter` is whole-hour
 * (12h drops ":00" → "8 am"). Rounds to the minute first so 9.9999 → "10:00", never "09:60".
 */
export function formatHour(h: number, fmt: '12h' | '24h', kind: 'start' | 'end' | 'gutter'): string {
  const max = kind === 'end' ? 1440 : 1439
  const m = Math.min(max, Math.max(0, Math.round(h * 60)))
  const hh = Math.floor(m / 60)
  const mm = m % 60
  if (fmt === '24h') return kind === 'gutter' ? `${pad(hh)}:00` : `${pad(hh)}:${pad(mm)}`
  const h12 = hh % 12 || 12
  const suffix = hh % 24 < 12 ? 'am' : 'pm'
  return kind === 'gutter' ? `${h12} ${suffix}` : `${h12}:${pad(mm)} ${suffix}`
}

export interface Span {
  start: number
  end: number
}

/**
 * BR-7 — a block's renderable span. `null` = not renderable (start non-finite or outside [0, 24)); `endFixed` = the end
 * was contradictory (≤ start / non-finite) and fell back to +1h, so the caller can dev-warn.
 */
export function normalizeSpan(startHour: number, endHour?: number): (Span & { endFixed: boolean }) | null {
  if (!Number.isFinite(startHour) || startHour < 0 || startHour >= 24) return null
  const bad = endHour !== undefined && (!Number.isFinite(endHour) || endHour <= startHour)
  const end = endHour === undefined || bad ? startHour + 1 : endHour
  return { start: startHour, end: Math.min(end, 24), endFixed: bad }
}

function validHours(hours: readonly [number, number] | undefined): hours is readonly [number, number] {
  if (!hours) return false
  const [s, e] = hours
  return Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e <= 24 && s < e
}

/**
 * BR-6 — the visible window: `hours` is a MINIMUM, extended to floor(earliest start)…ceil(latest drawn end), clamped to
 * [0, 24]. Pass only RENDERABLE spans (validate first) so the result is always finite.
 */
export function windowFor(
  spans: readonly Span[],
  hours?: readonly [number, number],
): { window: [number, number]; hoursInvalid: boolean } {
  const hoursInvalid = hours !== undefined && !validHours(hours)
  const base = validHours(hours) ? hours : DEFAULT_HOURS
  let lo = base[0]
  let hi = base[1]
  for (const s of spans) {
    lo = Math.min(lo, Math.floor(s.start))
    hi = Math.max(hi, Math.ceil(Math.max(s.end, s.start + MIN_SPAN_H)))
  }
  return { window: [Math.max(0, lo), Math.min(24, hi)], hoursInvalid }
}

export interface PlacedSpan<T extends Span> {
  item: T
  top: number
  height: number
  lane: number
  lanes: number
  compact: boolean
}

/**
 * BR-7/8 — place one day column's spans. Late blocks are clamped up BEFORE clustering (drawnStart ≤ h1 − min), every
 * extent is the DRAWN one, clusters are transitive drawn-overlap, and each block takes the lowest lane whose last drawn
 * end ≤ its drawn start (every lane checked). The sort is for geometry only — the output keeps INPUT order.
 */
export function layoutDay<T extends Span>(spans: readonly T[], window: readonly [number, number]): PlacedSpan<T>[] {
  const [h0, h1] = window
  const drawn = spans.map((s) => {
    const start = Math.min(s.start, h1 - MIN_SPAN_H)
    return { start, end: Math.max(s.end, start + MIN_SPAN_H) }
  })
  const order = spans.map((_, i) => i).sort((a, b) => drawn[a].start - drawn[b].start || drawn[b].end - drawn[a].end || a - b)

  const lane = new Array<number>(spans.length).fill(0)
  const lanes = new Array<number>(spans.length).fill(1)
  let cluster: number[] = []
  let laneEnds: number[] = []
  let clusterEnd = -Infinity
  const flush = () => {
    for (const i of cluster) lanes[i] = laneEnds.length
    cluster = []
    laneEnds = []
  }
  for (const i of order) {
    const d = drawn[i]
    if (d.start >= clusterEnd) flush()
    let l = laneEnds.findIndex((end) => end <= d.start)
    if (l === -1) {
      l = laneEnds.length
      laneEnds.push(d.end)
    } else laneEnds[l] = d.end
    lane[i] = l
    cluster.push(i)
    clusterEnd = Math.max(clusterEnd, d.end)
  }
  flush()

  return spans.map((item, i) => {
    const height = (drawn[i].end - drawn[i].start) * HOUR_PX
    return {
      item,
      top: (drawn[i].start - h0) * HOUR_PX,
      height,
      lane: lane[i],
      lanes: lanes[i],
      compact: height < COMPACT_PX || lanes[i] >= 3,
    }
  })
}
