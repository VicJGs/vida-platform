import { useId, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { format } from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { ensureCalendarMotionStyles, pulseClass } from '../internal/calendar-motion'
import { parseLocalDate, SR_ONLY } from '../internal/calendar-shared'
import { formatHours } from '../internal/living-format'
import { Card } from './card'
import type { CalChip } from './week-view'

// fe-calendar #19 · S5 — living-view, the Global Calendar's signature "Living" lens (EC-6..EC-10).
// Spec: docs/specs/foundation/fe-calendar/delivery/PLAN-S5-living-renderer.md (→ ui-2 v13-living-view.md).
// PRESENTATIONAL + read-only (EC-12): every value arrives pre-derived + pre-ordered by S7 `useCalendar` — this arranges.
// - ④ purpose budget (honest-null: null hours = "unmeasured", never 0) · ② habit threads (one sentence per row for AT)
//   · the 7 day Cards whose look follows TEMPORAL ASYMMETRY via Card alive-hooks: past `faded` · today `warm` · future.
// - Each lane degrades on its own: an absent lane is "unavailable", never a blank view (interpretation NEEDS-5).
// - The one intent is ③ open time (`onSlotOpenTime`) — render-when-handler; M1 passes none (deny-safe).
// - The greybox's red flag text fails AA as text → the unit's emphasised-tag token `$colorBrandEmphasis` (S2 MUST tag);
//   only the ⤻ glyph stays `$colorSignalDanger`, as a graphic.

/** `off` = a scheduled-off (rest) day of a non-daily habit — never a miss (BR-CAL-S6-7, fe-calendar S7). */
export type ThreadState = 'kept' | 'missed' | 'today' | 'future' | 'off'

export interface PurposeBudget {
  id: string
  name: string
  /** Purpose colour — USER DATA (hex), never a theme token. Absent ⇒ the neutral muted ink (no colour source in M1,
   *  D-S6-DEV-2) — never a fabricated hex. */
  color?: string
  /** Hours this week; null ⇒ unmeasured (honest-null, ADR-011 §3.6) — never shown as 0. */
  hours: number | null
  /** 0..1 of the bar; null ⇒ no fill. */
  fraction: number | null
  /** Source outage: `hours` is the last-known value (ADR-011 §3.6 "last-known + a flag"). */
  stale?: boolean
}

export interface HabitThread {
  id: string
  name: string
  /** The habit's purpose colour (USER DATA hex). Absent ⇒ the neutral muted ink (D-S6-DEV-2). */
  color?: string
  /** One state per day, aligned with `days`. */
  days: readonly ThreadState[]
  streak?: ReactNode
}

export interface LivingItem extends CalChip {
  /** A clock label the provider formatted ("09:00"); absent = untimed. */
  time?: string
  /** The reduced ⑤ drift signal (D5) — "slipping", no history count. */
  slipping?: boolean
}

export type TodayEntry = { kind: 'item'; item: LivingItem } | { kind: 'open'; label: string; hint: string }

export interface LivingDay {
  /** 'YYYY-MM-DD'. */
  date: string
  kind: 'past' | 'today' | 'future'
  record?: ReactNode
  done?: readonly LivingItem[]
  focus?: ReactNode
  /** Today's entries in PROVIDER order (items interleaved with the open block). */
  entries?: readonly TodayEntry[]
  intent?: ReactNode
  plan?: readonly LivingItem[]
}

export interface LivingViewProps {
  /** The 7 days of the week, in display order (the week start is applied upstream). */
  days: readonly LivingDay[]
  /** "This week" | "Oct 12 – Oct 18, 2026" — suffixes the budget header. */
  weekLabel?: string
  /** Absent ⇒ the lane reads "unavailable right now"; [] ⇒ "No purposes yet." */
  budget?: readonly PurposeBudget[]
  /** Absent ⇒ the lane reads "unavailable right now"; [] ⇒ "No habits tracked yet." */
  threads?: readonly HabitThread[]
  /** INTENT (EC-9): slot today's open time. Absent → the block is a read-only reveal (M1). */
  onSlotOpenTime?: (date: string) => void
  /** fe-calendar S7 (EC-F2): bump to pulse the today mark ONCE (the surface's Today button). 0 / absent = no pulse (never on
   *  mount); each new value remounts the mark, restarting the one-shot animation. Reduced motion = none (CSS @media). */
  pulseKey?: number
  /** loading | empty | error | success. Default 'success' (success with nothing self-heals to empty). */
  state?: ViewState
  empty?: ReactNode
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

// Day Cards share the row (the WeekView DayCol precedent — RNW flexShrink defaults to 0, so minWidth alone would let one
// long record widen its Card). 7 × 140 + 6 × 8 = 1028 fits the 1136 canvas; the region scrolls below that.
const DAY_STYLE: CSSProperties = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 140 }
const THREAD_STATES: readonly ThreadState[] = ['kept', 'missed', 'today', 'future', 'off']
const STATE_WORD: Record<ThreadState, string> = {
  kept: 'kept',
  missed: 'missed',
  today: 'today',
  future: 'upcoming',
  off: 'rest day',
}

function warn(msg: string): void {
  console.warn(`[vida/ui] LivingView: ${msg}`)
}

// ── styled hosts (unnamed → base theme; DIRECT semantic tokens, no sub-theme) ─────────────────────────────
const LivingRoot = styled(View, { flexDirection: 'column', gap: '$24', position: 'relative' })
// Paired line-height (ui CLAUDE.md Rules) — the agenda/week Eyebrows differ on this, so this one is local (G9).
const Eyebrow = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  lineHeight: '$caption',
  fontWeight: '600',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
})
const Body = styled(Text, { fontSize: '$small', lineHeight: '$small', color: '$colorTextPrimary' })
const Muted = styled(Text, { fontSize: '$small', lineHeight: '$small', color: '$colorTextMuted' })
// The book voice (EC-F1): record + intention lines are serif italic.
const Voice = styled(Text, {
  fontFamily: '$display',
  fontStyle: 'italic',
  fontSize: '$small',
  lineHeight: '$small',
  color: '$colorTextMuted',
})
const Dot = styled(View, { width: 6, height: 6, borderRadius: '$full', flexShrink: 0 })
/** The neutral ink for an item/purpose/habit with no colour source (D-S6-DEV-2) — the shipped `CalChip.color?` precedent. */
const NO_COLOUR = '$colorTextMuted'
const Row = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8' })
const Track = styled(View, {
  width: 52,
  height: 5,
  borderRadius: '$full',
  backgroundColor: '$colorSurfaceSecondary',
  overflow: 'hidden',
})
const Fill = styled(View, { height: '100%', borderRadius: '$full', backgroundColor: '$colorBrandPrimary' })
// The day-columns scroller (the WeekView region precedent). Inset sized to `shadow.resting` (0 6px 16px -4px) so the
// Cards' shadows render inside the clip; the negative margin keeps the Cards' edges aligned with the lane Cards above.
const ScrollRegion = styled(View, {
  position: 'relative',
  overflowX: 'auto',
  overflowY: 'hidden',
  paddingTop: '$8',
  paddingBottom: '$20',
  paddingHorizontal: '$12',
  marginHorizontal: -12,
  borderRadius: '$sm',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})
const DayRow = styled(View, { flexDirection: 'row', gap: '$8', alignItems: 'flex-start' })
const ThreadNodes = styled(View, { flexDirection: 'row', flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 7 * 24 })
const NodeCell = styled(View, {
  position: 'relative',
  flex: 1,
  minWidth: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
})
// the concept's `.node::before`: from the previous cell's centre to this one's, drawn BEFORE (under) the node
const Connector = styled(View, {
  position: 'absolute',
  left: '-50%',
  right: '50%',
  top: '50%',
  height: 2,
  marginTop: -1,
  opacity: 0.33,
})
const Node = styled(View, {
  width: 11,
  height: 11,
  borderRadius: '$full',
  borderWidth: 1.5,
  borderStyle: 'solid',
  backgroundColor: '$colorSurfacePrimary',
  variants: {
    state: {
      kept: {},
      missed: { borderStyle: 'dotted' },
      today: {},
      future: { opacity: 0.4 },
      // a rest day: a small solid dot, no ring — a different SHAPE from the hollow dotted `missed` (R7), so it never reads
      // as a miss; the connector still runs through it
      off: { width: 5, height: 5, borderWidth: 0, backgroundColor: '$colorTextMuted' },
    },
  } as const,
})
const OpenBox = styled(View, {
  alignItems: 'flex-start',
  gap: 2,
  paddingVertical: '$8',
  paddingHorizontal: '$8',
  borderWidth: 1,
  borderStyle: 'dashed',
  borderColor: '$colorBrandEmphasis',
  borderRadius: '$sm',
  backgroundColor: '$colorSurfacePrimary',
})
// The open-time intent — the MonthButton UA reset (year-view) on the dashed box.
const OpenButton = styled(OpenBox, {
  render: 'button',
  alignSelf: 'stretch',
  minHeight: 44,
  justifyContent: 'center',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})
const SkeletonBar = styled(View, { height: '$12', borderRadius: '$md', backgroundColor: '$colorSurfaceSecondary' })

function hasContent(d: LivingDay): boolean {
  return Boolean(
    d.record != null || d.focus != null || d.intent != null || d.done?.length || d.entries?.length || d.plan?.length,
  )
}

function Chip({
  item,
  struck = false,
  tone = 'primary',
}: {
  item: LivingItem
  struck?: boolean
  tone?: 'primary' | 'muted'
}) {
  const Label = tone === 'muted' || struck ? Muted : Body
  return (
    <View role="listitem" gap={2}>
      <Row alignItems="flex-start">
        {item.time != null ? (
          <Muted aria-hidden style={{ fontVariantNumeric: 'tabular-nums' }}>
            {item.time}
          </Muted>
        ) : null}
        <Dot aria-hidden marginTop={7} backgroundColor={item.color ?? '$colorTextMuted'} />
        {/* sr suffixes live INSIDE the inline Text: a whitespace node between flex items gets no box, so a sibling
            space there is dropped by the browser ("Title(done)") — the S4 accname trap (year-view name span). */}
        <Label
          className="vida-living-chip"
          flexShrink={1}
          minWidth={0}
          textDecorationLine={struck ? 'line-through' : 'none'}
        >
          {item.time != null ? <span style={SR_ONLY}>{item.time} </span> : null}
          {item.title}
          {struck ? (
            <>
              {' '}
              <span style={SR_ONLY}>(done)</span>
            </>
          ) : null}
          {item.slipping ? <span style={SR_ONLY}>, slipping</span> : null}
        </Label>
      </Row>
      {item.slipping ? (
        <Row className="vida-living-slip" aria-hidden gap="$4">
          <Text fontSize="$caption" lineHeight="$caption" color="$colorSignalDanger">
            ⤻
          </Text>
          <Eyebrow color="$colorBrandEmphasis">Slipping</Eyebrow>
        </Row>
      ) : null}
    </View>
  )
}

export function LivingView({
  days,
  weekLabel,
  budget,
  threads,
  onSlotOpenTime,
  pulseKey,
  state = 'success',
  empty,
  error,
  ref,
  ...rest
}: LivingViewProps): ReactElement {
  ensureCalendarMotionStyles()
  const r = rest as Record<string, unknown>
  const baseId = useId()
  const dev = process.env.NODE_ENV !== 'production'

  const anyDayContent = days.some(hasContent)
  // An ABSENT lane is unknown (unavailable) — only a lane passed as [] counts as "nothing" (G6).
  const laneData = (budget?.length ?? 0) + (threads?.length ?? 0)
  const nothing = !anyDayContent && laneData === 0 && budget != null && threads != null
  const effectiveEmpty = state === 'empty' || (state === 'success' && nothing)

  if (dev) {
    if (days.length !== 7) warn(`expected 7 days, got ${days.length}.`)
    if (days.filter((d) => d.kind === 'today').length > 1) warn('more than one day has kind "today".')
    for (const t of threads ?? [])
      if (t.days.length !== days.length) warn(`thread "${t.id}" has ${t.days.length} states for ${days.length} days.`)
    for (const b of budget ?? []) {
      if (b.hours != null && formatHours(b.hours) == null)
        warn(`budget "${b.id}" hours ${String(b.hours)} is not a finite, non-negative number — shown as unmeasured.`)
      if (b.hours != null && formatHours(b.hours) != null && b.fraction == null)
        warn(`budget "${b.id}" has hours but its fraction is null — the bar is empty.`)
      if (b.fraction != null && (!Number.isFinite(b.fraction) || b.fraction < 0 || b.fraction > 1))
        warn(`budget "${b.id}" fraction ${String(b.fraction)} is outside [0, 1] — clamped (non-finite → no fill).`)
    }
    if (state === 'success' && nothing) warn('state="success" with nothing to render — pass state="empty".')
    if (state === 'loading' && (anyDayContent || laneData > 0))
      warn('state="loading" with content present — a stale render.')
    if (state === 'empty' && anyDayContent)
      warn('state="empty" with day content present — the day content is not rendered.')
    if (state !== 'error' && !(effectiveEmpty && empty != null))
      warnMissingName('LivingView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)
  }

  if (state === 'error') {
    return (
      <LivingRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </LivingRoot>
    )
  }
  if (effectiveEmpty && empty != null) {
    return (
      <LivingRoot ref={ref} {...rest} role="status">
        {empty}
      </LivingRoot>
    )
  }

  const loading = state === 'loading'
  const show = !loading && !effectiveEmpty // nothing is drawn under loading or the designed empty layout
  const budgetId = `${baseId}-budget`
  const threadsId = `${baseId}-threads`
  const weekday = (date: string) => {
    const d = parseLocalDate(date)
    return d ? format(d, 'EEE') : date
  }

  // ── ④ purpose budget ─────────────────────────────────────────────────────────────────────────────────
  const budgetBody = loading ? (
    <SkeletonBar aria-hidden width="60%" />
  ) : budget == null ? (
    <Muted>Purpose budget is unavailable right now.</Muted>
  ) : budget.length === 0 ? (
    <Muted>No purposes yet.</Muted>
  ) : (
    <View role="list" flexDirection="row" flexWrap="wrap" columnGap="$24" rowGap="$8">
      {budget.map((b) => {
        const fmt = b.hours == null ? null : formatHours(b.hours)
        const zero = b.hours === 0
        const stale = fmt != null && b.stale === true
        const f =
          fmt != null && b.fraction != null && Number.isFinite(b.fraction) ? Math.min(1, Math.max(0, b.fraction)) : null
        const spoken = `${b.name}, ${fmt == null ? 'unmeasured' : fmt.sr}${zero ? ', none yet' : ''}${stale ? ', as of last read' : ''}`
        return (
          <View key={b.id} role="listitem">
            <Row aria-hidden>
              <Dot className="vida-living-dot" backgroundColor={b.color ?? NO_COLOUR} />
              <Body className="vida-living-budget-name" color={zero ? '$colorBrandEmphasis' : '$colorTextPrimary'}>
                {b.name}
              </Body>
              <Track>{f != null ? <Fill className="vida-living-fill" style={{ width: `${f * 100}%` }} /> : null}</Track>
              {fmt == null ? (
                <Muted>unmeasured</Muted>
              ) : (
                <Text
                  fontSize="$small"
                  lineHeight="$small"
                  color={zero ? '$colorBrandEmphasis' : '$colorTextMuted'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {zero ? '0h · none yet' : fmt.text}
                  {stale ? ' · as of last read' : ''}
                </Text>
              )}
            </Row>
            <span style={SR_ONLY}>{spoken}</span>
          </View>
        )
      })}
    </View>
  )

  // ── ② habit threads ──────────────────────────────────────────────────────────────────────────────────
  const threadsBody = loading ? (
    <SkeletonBar aria-hidden width="80%" />
  ) : threads == null ? (
    <Muted>Habit threads are unavailable right now.</Muted>
  ) : threads.length === 0 ? (
    <Muted>No habits tracked yet.</Muted>
  ) : (
    <View role="list" gap="$4">
      {threads.map((t) => {
        const n = Math.min(t.days.length, days.length)
        const groups = THREAD_STATES.map((s) => {
          const names = t.days.slice(0, n).flatMap((st, i) => (st === s ? [weekday(days[i].date)] : []))
          return names.length ? `${STATE_WORD[s]} ${names.join(', ')}` : null
        }).filter(Boolean)
        const ink = t.color ?? NO_COLOUR
        return (
          <View key={t.id} role="listitem">
            <View aria-hidden flexDirection="row" flexWrap="wrap" alignItems="center" columnGap="$12">
              <Row minWidth={120}>
                <Dot className="vida-living-dot" backgroundColor={ink} />
                <Body>{t.name}</Body>
              </Row>
              <ThreadNodes>
                {t.days.slice(0, n).map((st, i) => (
                  <NodeCell key={i}>
                    {i > 0 ? <Connector className="vida-thread-connector" backgroundColor={ink} /> : null}
                    {st === 'off' ? (
                      <Node className="vida-thread-off" state="off" />
                    ) : (
                      <Node
                        className={`vida-thread-${st}`}
                        state={st}
                        borderColor={ink}
                        {...(st === 'kept' ? { backgroundColor: ink } : null)}
                      />
                    )}
                  </NodeCell>
                ))}
              </ThreadNodes>
              {t.streak != null ? (
                // the NODES take the free width (greybox: spread across the row); the streak hugs the right edge and, when the
                // row wraps at 375, drops below still right-aligned (marginLeft auto)
                <Muted className="vida-thread-streak" minWidth={120} marginLeft="auto" textAlign="right">
                  {t.streak}
                </Muted>
              ) : null}
            </View>
            <span style={SR_ONLY}>
              {groups.length ? `${t.name}: ${groups.join('; ')}` : t.name}
              {t.streak != null ? (
                <>
                  {' — '}
                  {t.streak}
                </>
              ) : null}
            </span>
          </View>
        )
      })}
    </View>
  )

  // ── the 7 temporal day Cards ─────────────────────────────────────────────────────────────────────────
  const dayCards = days.map((d, i) => {
    const local = parseLocalDate(d.date)
    const isToday = d.kind === 'today'
    const nameId = `${baseId}-d${i}`
    const srName = `${local ? format(local, 'EEE d') : d.date}${isToday ? ', today' : ''}`
    const status = d.kind === 'past' ? 'faded' : isToday ? 'warm' : 'neutral'
    const header = (
      <>
        <View aria-hidden gap={2}>
          <Eyebrow color={isToday ? '$colorBrandEmphasis' : '$colorTextMuted'}>
            {local ? format(local, 'EEE') : d.date}
            {isToday ? ' · Today' : ''}
          </Eyebrow>
          <Text
            key={isToday ? (pulseKey ?? 0) : undefined}
            className={isToday ? pulseClass(pulseKey, 'vida-living-daynum vida-living-today') : 'vida-living-daynum'}
            fontFamily="$display"
            fontSize="$subheading"
            lineHeight="$subheading"
            color={isToday ? '$colorBrandEmphasis' : d.kind === 'past' ? '$colorTextMuted' : '$colorTextPrimary'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {local ? local.getDate() : ''}
          </Text>
        </View>
        <span id={nameId} style={SR_ONLY}>
          {srName}
        </span>
      </>
    )
    let body: ReactNode = null
    if (loading) body = <SkeletonBar aria-hidden />
    else if (show && d.kind === 'past')
      body = (
        <>
          {d.record != null ? <Voice>{d.record}</Voice> : null}
          {d.done?.length ? (
            <View role="list" gap="$4">
              {d.done.map((it) => (
                <Chip key={it.id} item={it} struck />
              ))}
            </View>
          ) : null}
          {d.focus != null ? <Eyebrow>{d.focus}</Eyebrow> : null}
        </>
      )
    else if (show && isToday)
      body = d.entries?.length ? (
        <View role="list" gap="$8">
          {d.entries.map((e, k) =>
            e.kind === 'item' ? (
              <Chip key={e.item.id} item={e.item} />
            ) : (
              <View key={`open-${k}`} role="listitem">
                {onSlotOpenTime ? (
                  <OpenButton type="button" aria-label={`${e.label}, ${e.hint}`} onPress={() => onSlotOpenTime(d.date)}>
                    <Eyebrow color="$colorBrandEmphasis">◇ {e.label}</Eyebrow>
                    <Muted textAlign="left">{e.hint}</Muted>
                  </OpenButton>
                ) : (
                  <OpenBox>
                    <Eyebrow color="$colorBrandEmphasis">◇ {e.label}</Eyebrow>
                    <Muted>{e.hint}</Muted>
                  </OpenBox>
                )}
              </View>
            ),
          )}
        </View>
      ) : null
    else if (show)
      body = (
        <>
          {d.intent != null ? <Voice>{d.intent}</Voice> : null}
          {d.plan?.length ? (
            <View role="list" gap="$4">
              {d.plan.map((it) => (
                <Chip key={it.id} item={it} tone="muted" />
              ))}
            </View>
          ) : null}
        </>
      )
    return (
      <Card
        key={`${d.date}-${i}`}
        status={status}
        header={header}
        headerDivider
        aria-labelledby={nameId}
        aria-hidden={loading || undefined}
        style={DAY_STYLE}
      >
        <View gap="$12">{body}</View>
      </Card>
    )
  })

  return (
    <LivingRoot ref={ref} {...rest} role="group" aria-busy={loading || undefined}>
      <Card
        header={<Eyebrow id={budgetId}>{weekLabel ? `Purpose budget · ${weekLabel}` : 'Purpose budget'}</Eyebrow>}
        headerDivider
        aria-labelledby={budgetId}
      >
        {budgetBody}
      </Card>
      <Card header={<Eyebrow id={threadsId}>Habit threads</Eyebrow>} headerDivider aria-labelledby={threadsId}>
        {threadsBody}
      </Card>
      {/* Always a tab stop — even the loading skeleton overflows below 1028px, and a scrollable region must be keyboard
          reachable (axe scrollable-region-focusable, WCAG 2.1.1 — Visual-Gate-caught when it was dropped for loading). */}
      <ScrollRegion tabIndex={0} role="region" aria-label="Week columns">
        <DayRow>{dayCards}</DayRow>
      </ScrollRegion>
      {effectiveEmpty ? (
        <span role="status" style={SR_ONLY}>
          Nothing this week.
        </span>
      ) : null}
    </LivingRoot>
  )
}
