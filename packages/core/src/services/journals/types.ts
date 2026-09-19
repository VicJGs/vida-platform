// ============================================================================
// services/journals — types (mod-journals #39 · LIF-127 · Slice 1)
//
// The canonical vocabulary of the journal integration layer: the contribution
// a module registers, the section result it produces, and the service's typed
// errors. Journals is the ENGINE behind the block — it names no module (JR-3).
//
// HOME = @vida/core (NOT @vida/types): `SectionData.state` reuses the @vida/core
// `TerminalState` canon, and @vida/types is the base layer that cannot import
// @vida/core. `JournalSummaryConfig` (a `Page` field) stays in @vida/types/note.ts.
// Spec: docs/specs/features/mod-journals/sessions/PLAN-2026-09-19-s1-registry.md
// ============================================================================

// Reuse the terminal-state canon by TYPE — never redefine (BR-S1-4). The four
// literals are ['loading','empty','error','success']; the journals docs' prose
// "populated" maps to the canon's `success` (business-rules.md:52,57).
import type { TerminalState } from '../../foundation/capability/types'

/** The three sections of the journal daily dashboard. Moved here from the UX-6
 *  design model (apps/web/src/home/section-model.ts); the backend engine owns
 *  the section vocabulary. `[FACT: journals/identity.md:8-9]` */
export type HomeSectionKey = 'summary' | 'agenda' | 'entry'

/** A single user-selectable data point a module advertises (JR-4). */
export interface DataPoint {
  readonly id: string
  readonly label: string
}

/** A calendar-date range (`YYYY-MM-DD`); the agenda uses a single-day range. */
export interface DateRange {
  readonly from: string
  readonly to: string
}

/**
 * One section's aggregated result — its already-resolved terminal state + the
 * data points shown. `module` (not in the UX-6 placeholder) is a grounded
 * [INTERP] addition for degrade attribution (`ContributionFailed(module)`, IR-d)
 * + deterministic per-module ordering (BR-S1-2). `items` is the app-shaped
 * payload, opaque at the seam.
 */
export interface SectionData {
  readonly sectionKey: HomeSectionKey
  readonly module: string
  readonly dataPoints: readonly DataPoint[]
  readonly state: TerminalState
  readonly items?: readonly unknown[]
}

/**
 * A module's registered journal contribution. `module` is a STRING field, not a
 * hard reference — the journal names no module (JR-3). `summary(date)` feeds the
 * recap; the optional `dueIn(range)` feeds the agenda (a shared primitive — a
 * summary-only module registers none, per identity.md:30 "reuses ITS dueIn" +
 * JR-5). Providers may read async. `[FACT: journals/contract.md:12-14]`
 */
export interface JournalContribution {
  readonly module: string
  readonly sectionKey: HomeSectionKey
  readonly dataPoints: readonly DataPoint[]
  summary(date: string): SectionData | Promise<SectionData>
  dueIn?(range: DateRange): SectionData | Promise<SectionData>
}

/** Enabled data-point ids per module (the user's per-module recap selection, JR-4).
 *  Storage is a SEAM (no Preferences field / generalized summary_config exists yet, N-3);
 *  `buildDashboard` takes it as a param, resolved via `resolveSelection`. */
export type JournalSelection = Record<string, readonly string[]>

/** The assembled daily dashboard: the backward summary + the forward agenda (S2). */
export interface DashboardData {
  readonly summary: readonly SectionData[]
  readonly agenda: readonly SectionData[]
}

/** A frozen point-in-time record of a day's summary (S3, JR-6/JR-7). */
export interface JournalSnapshot {
  readonly id: string
  readonly snapshotDate: string // YYYY-MM-DD
  readonly capturedAt: number // Unix ms
  readonly summary: readonly SectionData[]
}

/** A resolved journal for a date: the frozen snapshot (past) or a live re-aggregation
 *  (today / never-captured). Snapshots froze the summary only (BR-S3-2). */
export interface JournalView {
  readonly date: string
  readonly source: 'snapshot' | 'live'
  readonly summary: readonly SectionData[]
  readonly agenda?: readonly SectionData[] // live only
  readonly capturedAt?: number // snapshot only
  readonly liveComparative?: DashboardData // withLiveComparative + a snapshot exists (BR-S3-6)
}

/** A user-defined review window. Named-period → range resolution (week/month/year/custom)
 *  is design-pass; the skeleton takes an explicit inclusive `{from,to}` (S4, BR-S4-4). */
export interface ReviewPeriod {
  readonly from: string // YYYY-MM-DD (inclusive)
  readonly to: string // YYYY-MM-DD (inclusive)
  readonly kind?: string // free label ('week' | 'month' | …)
}

/** The composed review shell — the in-range day-snapshots (latest-per-date, ordered).
 *  The Wrapped trajectory + analytics.ts presentation are design-pass (S4, BR-S4-3). */
export interface ReviewData {
  readonly period: ReviewPeriod
  readonly snapshots: readonly JournalSnapshot[]
}

// --- Typed errors (fail-loud; stable `.name`) — contract.md:38-42, BR-S1-6 ----

/** A registered provider's `summary(date)` threw; that section degrades (IR-d). */
export class ContributionFailed extends Error {
  constructor(
    public readonly module: string,
    public readonly date: string,
  ) {
    super(`Journal contribution failed for module "${module}" on ${date}`)
    this.name = 'ContributionFailed'
  }
}

/** A past day was requested with no captured snapshot (S3 fallback path). */
export class SnapshotMissing extends Error {
  constructor(public readonly date: string) {
    super(`No journal snapshot captured for ${date}`)
    this.name = 'SnapshotMissing'
  }
}

/** A review period lacks enough data — explicit, never a misleading recap (JR-8/IR-g). */
export class InsufficientHistory extends Error {
  constructor(public readonly period: string) {
    super(`Insufficient history for review period "${period}"`)
    this.name = 'InsufficientHistory'
  }
}

/** An agenda `dueIn` lane failed; that lane degrades (shared with Sessions/Calendar). */
export class ProviderUnavailable extends Error {
  constructor(public readonly module: string) {
    super(`Journal provider unavailable: "${module}"`)
    this.name = 'ProviderUnavailable'
  }
}
