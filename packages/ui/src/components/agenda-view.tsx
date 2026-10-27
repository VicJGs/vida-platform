import { useId, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { format } from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { ensureCalendarMotionStyles, pulseClass } from '../internal/calendar-motion'
import { parseLocalDate, SR_ONLY } from '../internal/calendar-shared'

// fe-calendar #19 · S2 — agenda-view, the Agenda range renderer (the "another way" that solves the month grid's
// info-crush). Spec: docs/specs/foundation/fe-calendar/delivery/PLAN-S2-agenda-renderer.md (→ ui-2 v10-agenda-view.md).
// PRESENTATIONAL + read-only (EC-12): items arrive PRE-dayparted + PRE-ordered (the useCalendar seam derives them);
// this only ARRANGES. The one interaction — completion — is an INTENT (`onToggleItem`), never a write.
// - Temporal asymmetry: ONLY the `today` day is grouped under Morning/Afternoon/Evening; other days are one flat list
//   (the approved mockup + greybox — calendar-ranges-and-agenda.html:137-157).
// - Reuses the spine PIECES (ViewState · Message · warnMissingName) but NOT resolveDataViewState: the outer region is
//   a role="group" of per-day lists, not one list (the calendar-view / board-view divergence precedent).
// - TZ-safe: a 'YYYY-MM-DD' date is parsed by PARTS into a LOCAL Date — never new Date(str), which is UTC midnight and
//   lands on the previous day in UTC−3. `today` is matched by STRING equality (no Date math at all).

/** Canonical cross-module daypart. LOCAL mirror of @vida/types `Daypart` (@vida/ui is Tamagui-only — the ViewState
 *  precedent); structurally identical, so the app's value is assignable with no import. */
export type Daypart = 'morning' | 'afternoon' | 'evening'

export interface AgendaItem {
  id: string
  title: ReactNode
  /** Purpose colour — USER DATA (hex), never a theme token. Absent → muted dot. */
  color?: string
  /** 'HH:mm' display label. Absent = all-day (tasks carry no clock time; habits/routines are dayparted). */
  time?: string
  daypart: Daypart
  weight?: 'must' | 'can'
  /** undefined = not completable (no completion control ever renders). */
  done?: boolean
}

export interface AgendaDay {
  /** 'YYYY-MM-DD' (TZ-safe calendar date). */
  date: string
  items: readonly AgendaItem[]
}

export interface AgendaViewProps {
  /** Days in display order; a day with no items is skipped quietly. */
  days: readonly AgendaDay[]
  /** 'YYYY-MM-DD'. Marks the day + gates its daypart grouping. */
  today?: string
  /** fe-calendar S7 (EC-F2): bump to pulse the today mark ONCE (the surface's Today button). 0 / absent = no pulse (never on
   *  mount); each new value remounts the mark, restarting the one-shot animation. Reduced motion = none (CSS @media). */
  pulseKey?: number
  /** loading | empty | error | success. Default 'success' (a success with zero items self-heals to empty). */
  state?: ViewState
  /** INTENT — the owning module performs the write (EC-12). When absent, no completion control renders. */
  onToggleItem?: (id: string) => void
  /** Slot for the empty state (else a default Message). */
  empty?: ReactNode
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

const DAYPART_ORDER: readonly Daypart[] = ['morning', 'afternoon', 'evening']
const DAYPART_LABEL: Record<Daypart, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }

// ── styled hosts (unnamed → base theme; DIRECT semantic tokens, no sub-theme) ─────────────────────────────
const AgendaRoot = styled(View, { flexDirection: 'column' })
// flexWrap + the ItemsCol minWidth floor = the narrow-width reflow (rail stacks ABOVE the items at 375 — D-S2-DEV-2).
const DayRow = styled(View, {
  flexDirection: 'row',
  flexWrap: 'wrap',
  columnGap: '$24',
  rowGap: '$12',
  paddingVertical: '$20',
  variants: {
    separated: { true: { borderTopWidth: 1, borderTopColor: '$colorBorderDefault' } },
  } as const,
})
const DayRail = styled(View, { width: 96, flexShrink: 0, gap: '$4' })
// flexShrink:1 is explicit — RNW defaults it to 0 (the gallery-view lesson).
const ItemsCol = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 240, maxWidth: 720, gap: '$20' })
const Eyebrow = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  fontWeight: '600',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
})
const ItemRow = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$12', minHeight: 44 })
const TimeCell = styled(View, { width: 64, flexShrink: 0 })
const Dot = styled(View, { width: 8, height: 8, borderRadius: '$full', flexShrink: 0 })
const SkeletonBar = styled(View, { height: '$12', borderRadius: '$md', backgroundColor: '$colorSurfaceSecondary' })

// The completion control — a real <button role="checkbox">: native Enter/Space activation + tab stop. The drawn box
// is 20px; the absolute HitArea child extends the clickable/hoverable region to ≥44×44 (§X) — a descendant, so its
// clicks + :hover land on the button. Focus ring + hover are Tamagui pseudo-styles on the host (D-S2-DEV-1).
// The resting border is $colorTextMuted, NOT the $colorBorderDefault hairline: a control boundary needs 3:1 (WCAG
// 1.4.11) and the hairline measured 1.2–1.7:1 on the surface (Visual-Gate-caught).
const CheckBox = styled(View, {
  render: 'button',
  position: 'relative',
  width: 20,
  height: 20,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderWidth: 1.5,
  borderRadius: '$sm',
  borderColor: '$colorTextMuted',
  backgroundColor: 'transparent',
  color: '$colorTextInverse',
  cursor: 'pointer',
  hoverStyle: { borderColor: '$colorTextPrimary' },
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  variants: {
    checked: {
      true: {
        backgroundColor: '$colorBrandPrimary',
        borderColor: '$colorBrandPrimary',
        hoverStyle: { borderColor: '$colorBrandEmphasis' },
      },
    },
  } as const,
})
// A <span> (phrasing content — a <div> is invalid inside <button>). Insets resolve from the PADDING box, which the
// 1.5px border shrinks to 17px, so −14 yields 45×45.
const HitArea = styled(View, { render: 'span', position: 'absolute', top: -14, right: -14, bottom: -14, left: -14 })
// The no-handler, completable glyph — same box, inert.
const StaticBox = styled(View, {
  width: 20,
  height: 20,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
  borderRadius: '$sm',
  borderColor: '$colorTextMuted',
  color: '$colorTextInverse',
  variants: {
    checked: { true: { backgroundColor: '$colorTextMuted', borderColor: '$colorTextMuted' } },
  } as const,
})

function CheckMark(): ReactElement {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AgendaView({
  days,
  today,
  pulseKey,
  state = 'success',
  onToggleItem,
  empty,
  error,
  ref,
  ...rest
}: AgendaViewProps): ReactElement {
  ensureCalendarMotionStyles()
  const r = rest as Record<string, unknown>
  const baseId = useId()
  const visibleDays = days.filter((d) => d.items.length > 0)
  const effectiveEmpty = state === 'empty' || (state === 'success' && visibleDays.length === 0)

  if (process.env.NODE_ENV !== 'production') {
    if (state === 'success' && visibleDays.length === 0)
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] AgendaView: state="success" with no items — pass state="empty" (the app derives it).')
    if (state === 'loading' && visibleDays.length > 0)
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] AgendaView: state="loading" with `days` present — a stale render (loading should have no items).',
      )
    if (state === 'loading' || (state === 'success' && !effectiveEmpty))
      warnMissingName('AgendaView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)
  }

  if (state === 'error') {
    return (
      <AgendaRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </AgendaRoot>
    )
  }
  if (state === 'loading') {
    return (
      <AgendaRoot ref={ref} {...rest} role="group" aria-busy={true}>
        {[0, 1].map((d) => (
          <DayRow key={d} separated={d > 0} aria-hidden>
            <DayRail>
              <SkeletonBar width={48} height={24} />
            </DayRail>
            <ItemsCol>
              {[0, 1, 2].map((i) => (
                <SkeletonBar key={i} />
              ))}
            </ItemsCol>
          </DayRow>
        ))}
      </AgendaRoot>
    )
  }
  if (effectiveEmpty) {
    return (
      <AgendaRoot ref={ref} {...rest} role="status">
        {empty ?? <Message>Nothing scheduled.</Message>}
      </AgendaRoot>
    )
  }

  const renderItem = (item: AgendaItem, titleId: string): ReactElement => {
    const completable = item.done !== undefined
    const done = item.done === true
    return (
      <ItemRow key={item.id} role="listitem">
        <TimeCell>
          {item.time != null ? (
            <Text
              fontFamily="$body"
              fontSize="$small"
              color="$colorTextMuted"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {item.time}
            </Text>
          ) : (
            <Eyebrow>All day</Eyebrow>
          )}
        </TimeCell>
        <Dot aria-hidden backgroundColor={done || item.color == null ? '$colorTextMuted' : item.color} />
        <Text
          id={titleId}
          flexGrow={1}
          flexShrink={1}
          minWidth={0}
          fontFamily="$body"
          fontSize="$body"
          color={done ? '$colorTextMuted' : '$colorTextPrimary'}
          textDecorationLine={done ? 'line-through' : 'none'}
        >
          {item.title}
          {done && onToggleItem == null ? <span style={SR_ONLY}> (done)</span> : null}
        </Text>
        {item.weight != null ? (
          <Eyebrow color={item.weight === 'must' ? '$colorBrandEmphasis' : '$colorTextMuted'}>
            {item.weight === 'must' ? 'Must' : 'Can'}
          </Eyebrow>
        ) : null}
        {completable && onToggleItem != null ? (
          <CheckBox
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-labelledby={titleId}
            checked={done}
            onPress={() => onToggleItem(item.id)}
          >
            <HitArea />
            {done ? <CheckMark /> : null}
          </CheckBox>
        ) : completable ? (
          <StaticBox aria-hidden checked={done}>
            {done ? <CheckMark /> : null}
          </StaticBox>
        ) : null}
      </ItemRow>
    )
  }

  return (
    <AgendaRoot ref={ref} {...rest} role="group">
      {visibleDays.map((day, dIdx) => {
        const isToday = today != null && day.date === today
        const dayId = `${baseId}-d-${dIdx}`
        const local = parseLocalDate(day.date)
        const itemId = (iIdx: number) => `${baseId}-i-${dIdx}-${iIdx}`
        return (
          <DayRow key={`${day.date}-${dIdx}`} separated={dIdx > 0}>
            <DayRail id={dayId}>
              <Text
                key={isToday ? (pulseKey ?? 0) : undefined}
                className={isToday ? pulseClass(pulseKey, 'vida-agenda-today') : undefined}
                fontFamily="$display"
                fontSize="$heading"
                fontWeight="500"
                color={isToday ? '$colorBrandEmphasis' : '$colorTextPrimary'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {local ? format(local, 'd') : day.date}
              </Text>
              {local ? <Eyebrow>{format(local, 'EEEE')}</Eyebrow> : null}
              {isToday ? <Eyebrow color="$colorBrandEmphasis">Today</Eyebrow> : null}
            </DayRail>
            <ItemsCol>
              {isToday ? (
                DAYPART_ORDER.map((part) => {
                  const partItems = day.items
                    .map((item, iIdx) => [item, iIdx] as const)
                    .filter(([item]) => item.daypart === part)
                  if (partItems.length === 0) return null
                  const partId = `${dayId}-${part}`
                  return (
                    <View key={part} gap="$4">
                      <Eyebrow id={partId}>{DAYPART_LABEL[part]}</Eyebrow>
                      <View role="list" aria-labelledby={`${dayId} ${partId}`}>
                        {partItems.map(([item, iIdx]) => renderItem(item, itemId(iIdx)))}
                      </View>
                    </View>
                  )
                })
              ) : (
                <View role="list" aria-labelledby={dayId}>
                  {day.items.map((item, iIdx) => renderItem(item, itemId(iIdx)))}
                </View>
              )}
            </ItemsCol>
          </DayRow>
        )
      })}
    </AgendaRoot>
  )
}
