// ============================================================================
// foundation/notifications — scheduling derivations (S2)
//
// XCU-05 (quiet-hours baking at registration) · XCU-04 (reschedule cancel+re-register) ·
// XCU-14 (idempotency dedup key) · XCU-18 (materialize-at-fire). Pure + deterministic —
// no ports, no I/O. The local-scheduled tier's math BEFORE it touches an OS scheduler.
// ============================================================================

import type {
  DedupSource,
  DueOccurrence,
  QuietHours,
  QuietHoursResult,
  RegisteredReminder,
  ReschedulePlan,
} from './types'

// Is a local minute-of-day inside [start, end)? Handles a window that spans midnight
// (end < start) — e.g. 22:00→07:00. `[FACT: ADR-013 §3.2 L51 quiet-hours window]`
function isInQuietWindow(minute: number, startMinute: number, endMinute: number): boolean {
  if (startMinute === endMinute) return false // zero-width window = never quiet
  if (startMinute < endMinute) return minute >= startMinute && minute < endMinute
  // spans midnight: inside if after start OR before end
  return minute >= startMinute || minute < endMinute
}

// XCU-05 — bake quiet-hours into the schedule AT REGISTRATION (a pre-scheduled OS alert
// fires with the dispatcher not running, so quiet-hours can't be gated live — ADR-013
// §3.2 L51). A reminder landing inside quiet hours is shifted to the window's end or
// suppressed, per the user's `policy`. Disabled / outside the window → schedule as-is.
// `[FACT: ADR-013 §3.2 L51; NF-4 business-rules:24-26]`
export function bakeQuietHours(occ: DueOccurrence, quietHours: QuietHours): QuietHoursResult {
  if (!quietHours.enabled) return { action: 'schedule', at: occ.at }
  if (!isInQuietWindow(occ.minuteOfDay, quietHours.startMinute, quietHours.endMinute)) {
    return { action: 'schedule', at: occ.at }
  }
  if (quietHours.policy === 'suppress') return { action: 'suppress' }
  // shift: move the fire forward to the end of the quiet window (minutes from now to end).
  const minutesToEnd = (quietHours.endMinute - occ.minuteOfDay + 1440) % 1440
  return { action: 'shift', at: occ.at + minutesToEnd * 60_000 }
}

// XCU-04 — the reschedule delta on any schedule/pref change: cancel the OS handles whose
// occurrence is no longer desired, register the newly-desired ones. Diffed by dedup `key`
// so an unchanged occurrence is neither cancelled nor re-registered (stable across a
// reschedule). `[FACT: ADR-013 §3.2 L49 "device reschedules (cancel + re-register)"]`
export function reschedulePlan(prev: RegisteredReminder[], next: RegisteredReminder[]): ReschedulePlan {
  const prevKeys = new Set(prev.map((r) => r.key))
  const nextKeys = new Set(next.map((r) => r.key))
  return {
    cancel: prev.filter((r) => !nextKeys.has(r.key)).map((r) => r.id),
    register: next.filter((r) => !prevKeys.has(r.key)),
  }
}

// XCU-14 — the idempotency key, keeping a due reminder / event to ONE row across devices
// (NF-8). The event branch passes the ADR-012 `effectEventId` THROUGH (the effect rail
// owns it — do not re-hash, N3); the due branch keys by the `dueIn` occurrence id. Both
// namespaced so the two sources never collide. `[FACT: NF-8 business-rules:39-42; ADR-012 §3.1]`
export function dedupKey(source: DedupSource): string {
  return source.kind === 'event' ? `event:${source.effectEventId}` : `due:${source.occurrenceId}`
}

// XCU-18 — a durable `notifications` row materializes ONLY at fire time (never pre-written
// future-dated, NF-3). `true` when the occurrence's due time has arrived (≤ now) — the
// signal to the caller to create the row. `[FACT: ADR-013 §3.2 L51; NF-3 business-rules:20-23]`
export function shouldMaterialize(occurrenceAt: number, now: number): boolean {
  return occurrenceAt <= now
}
