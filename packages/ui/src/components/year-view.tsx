import { useId, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { format } from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { buildYear, indexDensity, localDate, MONTH_MIN, resolveYear } from '../internal/year-layout'

// fe-calendar #19 · S4 — year-view, the Year range renderer: 12 mini-months of activity-density dots (EC-5).
// Spec: docs/specs/foundation/fe-calendar/delivery/PLAN-S4-year-renderer.md (→ ui-2 v12-year-view.md).
// PRESENTATIONAL + read-only (EC-12): density arrives pre-derived (S7 useCalendar owns has/busy); this only places dots.
// The one intent is NAVIGATION — a month heading drills into Month (`onPickMonth`, render-when-handler).
// - Shape is the approved greybox: no day numbers, no weekday row, leading blanks only, `$8` cell gap, 4-up → 2-up.
// - A11y: each mini-month is a role="table" (the V4 2D-grid precedent) named by its month; day cells carry the full
//   weekday + date + density + today in their label, with aria-colindex so a header-less grid still reports columns.
// - TZ-safe: dates are built from numeric parts in internal/year-layout; `today` matched by string equality.

export interface YearDensity {
  /** 'YYYY-MM-DD' within `year` (else skipped + dev-warn). */
  date: string
  /** 0 none · 1 has · 2 busy — the provider's derivation. */
  level: 0 | 1 | 2
}

export interface YearViewProps {
  /** Full 4-digit year, e.g. 2026. */
  year: number
  density: readonly YearDensity[]
  /** 'YYYY-MM-DD'. Rings that day and accents its month heading (only when it falls in `year`). */
  today?: string
  /** user_preferences.week_starts_on: 0 = Sunday, 1 = Monday. Default 1. */
  weekStartsOn?: 0 | 1
  /** INTENT (navigate): a month heading was pressed — month index 0–11. Absent → plain headings, no tab stops. */
  onPickMonth?: (month: number) => void
  /** loading | empty | error | success. Default 'success' (success with no activity self-heals to empty). */
  state?: ViewState
  /** Slot for the empty state (else the designed year grid). */
  empty?: ReactNode
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

// sr-only — visually hidden but announced (the neural-graph NG-5 recipe).
const SR_ONLY: CSSProperties = {
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

// The flex-wrap month grid (gallery-view GV-2): 22% caps a row at 4 (5 × 22% > 100%), the floor drops to 2-up at 375.
// flexShrink:1 is explicit — RNW defaults it to 0.
const MONTH_STYLE: CSSProperties = { flexGrow: 1, flexShrink: 1, flexBasis: '22%', minWidth: MONTH_MIN }
const CELL_STYLE: CSSProperties = { aspectRatio: 1 }

function warn(msg: string): void {
  console.warn(`[vida/ui] YearView: ${msg}`)
}

// ── styled hosts (unnamed → base theme; DIRECT semantic tokens, no sub-theme) ─────────────────────────────
// position:relative so the sr-only status span's containing block is the root (the S3 page-overflow lesson).
const YearRoot = styled(View, { flexDirection: 'row', flexWrap: 'wrap', gap: '$24', position: 'relative' })
const MonthBox = styled(View, { flexDirection: 'column', gap: '$8' })
// The drill-in control — a real <button> with the UA chrome reset (the AgendaView CheckBox precedent): left-set,
// ≥44px tall, hover = paper tint (§VIII), the house 2px focus ring.
const MonthButton = styled(View, {
  render: 'button',
  alignSelf: 'stretch',
  minHeight: 44,
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingHorizontal: '$4',
  borderWidth: 0,
  borderRadius: '$sm',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})
// The no-handler heading keeps the button's box so the grid doesn't shift between the two modes.
const MonthPlain = styled(View, { minHeight: 44, justifyContent: 'center', paddingHorizontal: '$4' })
const MonthName = styled(Text, {
  fontFamily: '$display',
  fontSize: '$subheading',
  lineHeight: '$subheading',
  fontWeight: '500',
  textAlign: 'left',
  color: '$colorTextPrimary',
  variants: {
    current: { true: { color: '$colorBrandEmphasis' } },
  } as const,
})
const Table = styled(View, { flexDirection: 'column', gap: '$8' })
const Row = styled(View, { flexDirection: 'row', gap: '$8' })
const Cell = styled(View, {
  position: 'relative',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$sm',
  backgroundColor: '$colorSurfaceSecondary',
  variants: {
    spacer: { true: { backgroundColor: 'transparent' } },
  } as const,
})
// has = 4px @ .75, busy = 6px solid — size AND tone (never opacity alone); .75 clears 3:1 in every preset × mode
// (D-S4-DEV-1 — the mockup's .55 failed 4 of 6).
const Dot = styled(View, {
  borderRadius: '$full',
  backgroundColor: '$colorBrandEmphasis',
  variants: {
    level: {
      has: { width: 4, height: 4, opacity: 0.75 },
      busy: { width: 6, height: 6 },
    },
  } as const,
})
// Today = an inset 2px ring overlay (a shape, not colour alone — 1.4.1); absolute so the cell box never changes.
const TodayRing = styled(View, {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderWidth: 2,
  borderColor: '$colorBrandEmphasis',
  borderRadius: '$sm',
  pointerEvents: 'none',
})

export function YearView({
  year: yearProp,
  density,
  today,
  weekStartsOn = 1,
  onPickMonth,
  state = 'success',
  empty,
  error,
  ref,
  ...rest
}: YearViewProps): ReactElement {
  const r = rest as Record<string, unknown>
  const baseId = useId()
  const dev = process.env.NODE_ENV !== 'production'

  const { year, warning: yearWarning } = resolveYear(yearProp, new Date())
  const { byDate, warnings } = indexDensity(year, density)
  const renderable = byDate.size
  const effectiveEmpty = state === 'empty' || (state === 'success' && renderable === 0)

  if (dev) {
    if (yearWarning) warn(yearWarning)
    for (const w of warnings) warn(w)
    if (state === 'success' && renderable === 0) warn('state="success" with no activity — pass state="empty".')
    if (state === 'loading' && renderable > 0) warn('state="loading" with `density` present — a stale render.')
    if (state === 'empty' && renderable > 0) warn('state="empty" with activity present — it is not rendered.')
    if (state !== 'error' && !(effectiveEmpty && empty != null))
      warnMissingName('YearView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)
  }

  if (state === 'error') {
    return (
      <YearRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </YearRoot>
    )
  }
  if (effectiveEmpty && empty != null) {
    return (
      <YearRoot ref={ref} {...rest} role="status">
        {empty}
      </YearRoot>
    )
  }

  const loading = state === 'loading'
  // nothing is drawn in loading (the grid IS the skeleton) or empty (the designed year grid)
  const showDots = !loading && !effectiveEmpty
  const months = buildYear(year, weekStartsOn)
  // Accent a month ONLY when a real day key in it equals `today` — so the heading accent can never appear without the
  // ring (BR-6: never the sole signal); a malformed `today` ("2026-10") accents nothing.
  const currentMonth = today == null ? -1 : months.findIndex((mm) => mm.rows.some((row) => row.some((s) => s.kind === 'day' && s.key === today)))

  return (
    <YearRoot ref={ref} {...rest} role="group" aria-busy={loading || undefined}>
      {months.map((m) => {
        const nameId = `${baseId}-m${m.month}`
        const isCurrent = m.month === currentMonth
        const name = (
          <MonthName id={nameId} className="vida-year-month" current={isCurrent}>
            {format(localDate(year, m.month, 1), 'MMMM')}
            {/* the space is a sibling text node: accname drops a LEADING space inside the sr span ("January2026") */}
            {' '}
            <span style={SR_ONLY}>{year}</span>
          </MonthName>
        )
        return (
          <MonthBox key={m.month} style={MONTH_STYLE}>
            {onPickMonth ? (
              <MonthButton className="vida-year-pick" type="button" onPress={() => onPickMonth(m.month)}>
                {name}
                <span style={SR_ONLY}>, open month</span>
              </MonthButton>
            ) : (
              <MonthPlain>{name}</MonthPlain>
            )}
            <Table role="table" aria-labelledby={nameId} aria-colcount={7}>
              {m.rows.map((row, ri) => (
                <Row key={ri} role="row">
                  {row.map((slot, ci) => {
                    if (slot.kind === 'spacer') return <Cell key={ci} spacer aria-hidden style={CELL_STYLE} />
                    const level = showDots ? byDate.get(slot.key) : undefined
                    const isToday = slot.key === today
                    const label =
                      format(localDate(year, m.month, slot.day), 'EEEE, d MMMM') +
                      (level === 2 ? ', busy' : level === 1 ? ', has activity' : '') +
                      (isToday ? ', today' : '')
                    return (
                      <Cell key={ci} role="cell" aria-colindex={slot.col} aria-label={label} style={CELL_STYLE}>
                        {level != null ? <Dot aria-hidden className="vida-year-dot" level={level === 2 ? 'busy' : 'has'} /> : null}
                        {isToday ? <TodayRing aria-hidden className="vida-year-today" /> : null}
                      </Cell>
                    )
                  })}
                </Row>
              ))}
            </Table>
          </MonthBox>
        )
      })}
      {effectiveEmpty ? (
        <span role="status" style={SR_ONLY}>
          No activity this year.
        </span>
      ) : null}
    </YearRoot>
  )
}
