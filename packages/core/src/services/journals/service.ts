// ============================================================================
// services/journals — the service (mod-journals #39 · Slices 3–4)
//
// The composition root: wraps the S2 engine (buildDashboard) and adds the
// snapshot store — captureSnapshot (freeze a day's summary into journal_snapshots)
// + getJournal (past → the frozen snapshot; today / never-captured → live) +
// buildReview (compose in-range snapshots into a shell, S4).
// Factory-object, hoisted closures, no `this.` (destructure consumption shape).
// The persistence path — encryptedFields:[] (M1.0, IR-b), initVault required (IR-a).
// ============================================================================

import { and, eq, gte, lte } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { journalSnapshots } from '../../db/schema/journals'
import { buildDashboard as buildDashboardImpl } from './dashboard'
import type { JournalRegistry } from './registry'
import {
  InsufficientHistory,
  type DashboardData,
  type JournalSelection,
  type JournalSnapshot,
  type JournalView,
  type ReviewData,
  type ReviewPeriod,
  type SectionData,
} from './types'

export interface JournalsServiceDeps {
  db: DrizzleDb
  deviceId: string
  registry: JournalRegistry
}

export interface JournalsService {
  buildDashboard(date: string, selection?: JournalSelection): Promise<DashboardData>
  captureSnapshot(date: string): Promise<JournalSnapshot>
  getJournal(date: string, opts?: { withLiveComparative?: boolean }): Promise<JournalView>
  buildReview(period: ReviewPeriod): Promise<ReviewData>
  // getSelection/setSelection — SEAM (N-3: no storage yet).
}

export function createJournalsService(deps: JournalsServiceDeps): JournalsService {
  const { db, deviceId, registry } = deps
  // journal_snapshots has no deleted_at → no softDelete; encryptedFields:[] (M1.0 pass-through, IR-b).
  const repo = createRepository(db, journalSnapshots, { deviceId, encryptedFields: [] })

  async function buildDashboard(date: string, selection?: JournalSelection): Promise<DashboardData> {
    return buildDashboardImpl(registry, date, selection)
  }

  /** Freeze a day's FULL (unfiltered) summary — never the agenda (BR-S3-1/2). Single-row write (BR-S3-3). */
  async function captureSnapshot(date: string): Promise<JournalSnapshot> {
    const { summary } = await buildDashboard(date)
    const captured_at = Date.now()
    const created = await repo.create({
      snapshot_date: date,
      sections_data: JSON.stringify(summary),
      captured_at,
    })
    // Build the view from values we control — NOT create()'s phantom created_at/updated_at (BR-S3-9).
    return { id: created.id, snapshotDate: date, capturedAt: captured_at, summary }
  }

  /** Past → the latest snapshot for the date; today / never-captured → live (BR-S3-4). */
  async function getJournal(date: string, opts?: { withLiveComparative?: boolean }): Promise<JournalView> {
    const rows = await repo.findWhere(eq(journalSnapshots.snapshot_date, date))
    const latest = latestByCapturedAt(rows)
    const frozen = latest ? parseSummary(latest.sections_data) : null

    if (latest && frozen) {
      const view: JournalView = {
        date,
        source: 'snapshot',
        summary: frozen,
        capturedAt: latest.captured_at,
      }
      if (opts?.withLiveComparative) {
        return { ...view, liveComparative: await buildDashboard(date) }
      }
      return view
    }

    // No snapshot (today / never-captured) OR a malformed blob (BR-S3-5) → live re-aggregation.
    const live = await buildDashboard(date)
    return { date, source: 'live', summary: live.summary, agenda: live.agenda }
  }

  /** Compose the day-snapshots in a range into a review shell — the improvement-lens
   *  skeleton (BR-S4-1..6). Named-period math, Wrapped trajectory + analytics presentation
   *  and scheduling/delivery are design-pass. */
  async function buildReview(period: ReviewPeriod): Promise<ReviewData> {
    const rows = await repo.findWhere(
      // `!`: and() is typed SQL|undefined but is defined here (both operands present) — sessions/service.ts precedent.
      and(gte(journalSnapshots.snapshot_date, period.from), lte(journalSnapshots.snapshot_date, period.to))!,
    )
    // latest captured_at per date (IR-f), parse (skip malformed, BR-S4-6), order by date.
    const byDate = new Map<string, (typeof rows)[number]>()
    for (const r of rows) {
      const prev = byDate.get(r.snapshot_date)
      if (!prev || r.captured_at > prev.captured_at) byDate.set(r.snapshot_date, r)
    }
    const snapshots: JournalSnapshot[] = []
    for (const [date, row] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const summary = parseSummary(row.sections_data)
      if (summary) snapshots.push({ id: row.id, snapshotDate: date, capturedAt: row.captured_at, summary })
    }
    if (snapshots.length === 0) throw new InsufficientHistory(period.kind ?? `${period.from}..${period.to}`)
    return { period, snapshots }
  }

  return { buildDashboard, captureSnapshot, getJournal, buildReview }
}

// --- internals ---------------------------------------------------------------

type SnapshotRow = { captured_at: number; sections_data: string }

/** The latest snapshot for a date (no UNIQUE(snapshot_date) → latest captured_at wins, IR-f). */
function latestByCapturedAt<T extends SnapshotRow>(rows: readonly T[]): T | null {
  let best: T | null = null
  for (const r of rows) if (!best || r.captured_at > best.captured_at) best = r
  return best
}

/** Parse a frozen summary blob; malformed → null (degrade to live, never crash — BR-S3-5). */
function parseSummary(raw: string): readonly SectionData[] | null {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SectionData[]) : null
  } catch {
    return null
  }
}
