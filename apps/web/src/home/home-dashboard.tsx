// ============================================================================
// HomeDashboard — fe-home S1 (the standalone-widget grid). Entity Delivery Flow ②.
//
// The Home Dashboard entity: a PERSONALIZED grid of STANDALONE integration-block
// widgets with stats + summaries across the whole OS (ADR-008 `standalone` render
// target). COMPOSES the shipped @vida/ui `DashboardView` (#5) — it is NOT a widget
// renderer: each widget's SUCCESS body enters via the `renderWidget` seam; the real
// standalone capability bodies ship downstream (dashboard-view.md:8). Live data
// (buildDashboard / per-module providers) is deferred to the first live consumer
// (the collection/dashboard ProviderRead precedent); M1 = a default widget set.
//
// Contract (S1):
//   HomeDashboard({ widgets, renderWidget, title?, density?, aria-* })
//   • widgets      — the personalized set + each widget's app-derived ViewState (BR-2, state-as-prop)
//   • renderWidget — the standalone widget SUCCESS body seam (shell owns loading/empty/error)
//   • EC-4 — a grid of standalone widgets across OS domains (finance·tasks·projects·purposes·dreams·habits·schedule)
//   • EC-5 — per-widget degrade: one widget error/loading/empty while siblings stay live (DashboardView owns this)
//   • EC-7/EC-8 — DashboardView's RN-safe flex grid reflows to 375; DIRECT semantic tokens, AA both modes
// Seams (seam-contract.md): useHomeWidgets (READ, B) · renderHomeWidget (EXPOSE, C). M1 placeholders; swap zero-signature.
// ============================================================================
import type { ReactNode } from 'react'
import { Text } from '@tamagui/core'
import { DashboardView, type CellSize, type DashboardBlock } from '@vida/ui'

/** The OS domains the Home dashboard surfaces as standalone widgets. User-selectable (personalization); M1 = all. */
export const HOME_WIDGET_ID = [
  'summary',
  'finance',
  'tasks',
  'habits',
  'projects',
  'purposes',
  'dreams',
  'schedule',
] as const
export type HomeWidgetId = (typeof HOME_WIDGET_ID)[number]

/** The @vida/ui per-block terminal-state canon, reused by TYPE (the dashboard-adapter precedent — never redefined). */
type ViewState = DashboardBlock['state']

/** A placed Home dashboard widget: a standalone capability + its app-derived state (BR-2). */
export interface HomeWidget {
  id: HomeWidgetId
  /** The cell title (a human label). */
  title: string
  /** The span (EC-1/EC-6 of DashboardView). */
  size: CellSize
  /** This widget's OWN terminal state (EC-5) — the app derives + passes it. */
  state: ViewState
  /** A one-line description of what the live widget will show (the M1 placeholder body + a11y aid). */
  hint: string
  /** Optional gateway slot (a "open →" link to the module surface). */
  link?: ReactNode
}

export interface HomeDashboardProps {
  /** The personalized widget set + each widget's derived state (from the useHomeWidgets seam). */
  widgets: readonly HomeWidget[]
  /** The standalone widget SUCCESS body seam. Called only for `state==='success'` (DashboardView owns the rest). */
  renderWidget: (widget: HomeWidget) => ReactNode
  /** The dashboard heading (names the region). Default 'Your day across the OS'. */
  title?: string
  /** Grid density (compact for the Journal-first glance rail). Default 'default'. */
  density?: 'compact' | 'default' | 'spacious'
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * The M1 DEFAULT widget set (the useHomeWidgets seam, B). The personalized set + live per-widget state arrive from the
 * journal-contribution registry / buildDashboard at the first live consumer (deferred, ProviderRead). M1 renders every
 * widget in `success` so the standalone placeholder body shows what each will surface.
 */
export const DEFAULT_HOME_WIDGETS: readonly HomeWidget[] = [
  {
    id: 'summary',
    title: 'Today across the OS',
    size: 'lg',
    state: 'success',
    hint: 'Habits · tasks · focus · check-ins — today’s recap',
  },
  { id: 'finance', title: 'Finances', size: 'md', state: 'success', hint: 'Net worth · cash flow · accounts' },
  { id: 'tasks', title: 'Tasks', size: 'sm', state: 'success', hint: 'Progress · due today · overdue' },
  { id: 'habits', title: 'Habits', size: 'sm', state: 'success', hint: 'Streaks · today’s completions' },
  { id: 'projects', title: 'Projects', size: 'md', state: 'success', hint: 'Active projects · progress · budget' },
  { id: 'purposes', title: 'Purposes', size: 'sm', state: 'success', hint: 'Life purposes · progress to targets' },
  { id: 'dreams', title: 'Dreams', size: 'sm', state: 'success', hint: 'Bucket list · saving progress · steps' },
  { id: 'schedule', title: 'Schedule', size: 'md', state: 'success', hint: 'Today’s timed events' },
]

/** The useHomeWidgets READ seam (B). M1 returns the default set; the live personalized set is deferred (ProviderRead). */
export function useHomeWidgets(): readonly HomeWidget[] {
  return DEFAULT_HOME_WIDGETS
}

/**
 * The renderHomeWidget EXPOSE seam (C) — the standalone widget SUCCESS body. M1 = a calm teaching placeholder (the
 * IntegrationBlockPlaceholder precedent): the real standalone capability renderer ships downstream, swapped here
 * zero-signature. Honest — describes what the widget will show, never fakes data.
 */
export function renderHomeWidget(widget: HomeWidget): ReactNode {
  return (
    <Text fontSize="$small" color="$colorTextMuted">
      {widget.hint}
    </Text>
  )
}

/** The Home Dashboard composition — maps the Home widget set onto DashboardView, threading each widget's state + body. */
export function HomeDashboard({
  widgets,
  renderWidget,
  title = 'Your day across the OS',
  density = 'default',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: HomeDashboardProps) {
  const byId = new Map<string, HomeWidget>(widgets.map((w) => [w.id, w]))
  const blocks: DashboardBlock[] = widgets.map((w) => ({
    id: w.id,
    title: w.title,
    size: w.size,
    state: w.state,
    action: w.link,
  }))
  return (
    <DashboardView
      title={title}
      blocks={blocks}
      // DashboardView calls renderBlock only for `success`; resolve the id back to the Home widget for its body.
      renderBlock={(b) => {
        const w = byId.get(b.id)
        return w ? renderWidget(w) : null
      }}
      density={density}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
    />
  )
}

export default HomeDashboard
