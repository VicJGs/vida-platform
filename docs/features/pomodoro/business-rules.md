<!-- Business Rules — features/pomodoro · /documentation Phase 2 · sources: ADR-002 pomodoro_sessions L1433-1458 + user_preferences pomodoro_* L3497-3500 + L1151 (zero-E) · note.ts L61-62,154-163 · ADR-004 §3.2/§3.3/§3.4 · Sessions SS-3/SS-6/SS-11/SS-12 · Tasks TK-5 · v1 studyPlanner.ts pause/interruption fields · docs/intake/pomodoro.md -->

# Business Rules — Pomodoro  (level: Feature / CAPABILITY within the Sessions & Scheduling realm)

> These invariants inherit the CORE constitution (ZK-1 zero-knowledge, LF-2 local-first) and **do not
> re-declare** the Session framework — they layer the timer-runtime rules on top of it.
> **[ADR-004](../../core/decisions/ADR-004-session-framework.md)** (Session Framework) is the structural
> decision; Pomodoro is the runtime of its `focus` sub-type. The reframe below (PD-1) is a **pending
> ADR-004 amendment + ADR-002 re-home**, flagged for the consolidated build-phase pass. `[FACT: ADR-004]`

## Invariants (what is ALWAYS / NEVER true)

**Placement & ownership**
- **PD-1 — A pomodoro is always the runtime of a `focus` Session; it never leaks to another entity.** The
  timer attaches to a **`session_id`**, never a polymorphic task/note/class. Starting a timer *is* starting
  (or resuming) a `focus` Session. This **supersedes** the v2 `pomodoro_sessions.entity_type` CHECK
  (`task·task_group·class_note·note·study_session`) and the SS-11 statement that Pomodoro is a Notes entity.
  `[INTENT: Victor 2026-07-15; FACT superseded: ADR-002 pomodoro_sessions.entity_type L1435; Sessions SS-11 — reconcile at build]`
- **PD-2 — The `/pomodoro` widget is a view, never an owner.** In a Note/Page it *showcases the
  pomodoro-enabled (focus) sessions* and lets the page use one + link its analytics to that session. It reads
  and launches; it does not own a timer entity. `[INTENT: Victor 2026-07-15; FACT current Notes API startSession — contract L19, to reconcile]`
- **PD-3 — Interval config is Preferences-owned; the runtime only obeys it.** `pomodoro_work_minutes` (25) ·
  `pomodoro_break_minutes` (5) · `pomodoro_long_break_minutes` (15) · `pomodoro_sessions_before_long` (4) live
  in `user_preferences`. Named **focus templates** (per-type presets) are **`focus` Session presets** owned by
  Sessions, not a separate Pomodoro store. `[FACT: ADR-002 L3497-3500; INTENT G1g → Sessions presets]`

**Runtime behaviour**
- **PD-4 — Interval types & statuses are fixed enums.** `type ∈ {focus, short_break, long_break}`,
  `status ∈ {running, paused, completed, cancelled}` — canonical in `@vida/types/note.ts`, mirrored by SQL
  CHECK. A run counts completed focus intervals (`completed_count`); a long break follows every
  `pomodoro_sessions_before_long` focus intervals. `[FACT: note.ts L61-62; ADR-002 pomodoro_sessions L1444-1447; PD-3 cadence]`
- **PD-5 — Pause excludes paused time from focus.** A paused interval accumulates paused duration; "real
  focus" = elapsed − paused. (Restores v1 `total_pause_seconds`, dropped by v2's status-only `paused`.)
  `[INTENT G1a; FACT v1 studyPlanner.ts PomodoroSession.total_pause_seconds]`
- **PD-6 — A cut-short run captures its interruption.** Cancelling mid-focus records `was_interrupted` + an
  optional reason, feeding focus analytics. `[INTENT G1b; FACT v1 was_interrupted/interruption_reason]`
- **PD-7 — Auto-start & alerts are user-configured (Preferences).** `auto_start_breaks`,
  `auto_start_next_interval`, `show_notifications`, `play_sounds` govern interval-boundary behaviour; all
  default to a sane out-of-box value and are user-overridable. `[INTENT G1c-f; FACT v1 PomodoroSettings]`
- **PD-8 — Breaks carry per-type guidance.** A break is not a dumb countdown: Focus Mode surfaces per-session-
  type cues (hydrate · recompose energy · rest · suggested activity). Enforced-vs-skippable per type is a
  build-phase Focus-Mode design detail. `[INTENT G3/G6, ⚠ INTENDED]`

**Effects & analytics (ride the Session Integration Contract — never direct writes)**
- **PD-9 — Time-to-task flows through the Session `log_time` effect.** On completion the `focus` Session fires
  `log_time(task|project)` → Tasks `task_time_logs`; `actual_minutes` stays the one auto-summed ledger with
  its per-task opt-out. Pomodoro NEVER writes `actual_minutes` directly. `[FACT: Tasks TK-5; Sessions contract effects]`
- **PD-10 — XP rides `award_xp`; the dashboard feed rides `surface_journal`.** Completed focus sessions fire
  the `focus` sub-type's declared `award_xp` (Gamification, Wave 4 — stub now) and `surface_journal` (daily
  `/summary` focus feed) effects. No bespoke Pomodoro→Gamification or Pomodoro→Journal wiring. `[FACT: ADR-004 §3.2 effect catalog; INTENT G5/G7]`
- **PD-11 — Focus analytics are a derived cut, never stored.** Completed-count · focus time · planned-vs-actual
  · focus streaks are computed on-read from the session log (Sessions SS-12); no synced Pomodoro aggregate
  table. `[FACT: Sessions SS-12; INTENT G5]`
- **PD-12 — Effects are permission-bounded (inherit SS-6).** A pomodoro's effects are scoped to its session's
  attachments; no double-count (one XP / one time-log per event); sensitive-module effects need opt-in
  consent. `[FACT: Sessions SS-6 / ADR-004 §3.2 dim-4]`

## Validation & edge cases
- `ended_at < started_at`, or `duration_seconds` negative / exceeding the interval → typed validation error,
  never silently stored. `[INTENT; parallels Sessions edge-case rule]`
- Resuming a `completed`/`cancelled` interval → rejected (illegal transition); start a new one. `[INTENT]`
- The focus Session behind a timer is deleted mid-run → the runtime stops and no-ops its pending effects
  loudly (never resurrects the session, never writes a dangling time log — SS-6 scoping). `[INTENT]`
- Config changed mid-run (e.g. work minutes) → applies to the **next** interval, never retro-edits the
  running one. `[INTENT]`

## Terminal states (before any build — constitution §2)
- **A timer interval:** idle → running → (paused ⇄ running) → completed | cancelled/interrupted; plus **error**
  (failed effect, typed). `[FACT status enum note.ts L62]`
- **A run (sequence of intervals):** empty (nothing started) · in-progress · completed (target reached) ·
  abandoned (interrupted). `[INTENT]`
- **The `/pomodoro` widget:** loading (resolving focus-enabled sessions) · empty (none yet → anti-lost prompt
  to start one) · populated · error (couldn't load sessions → the widget degrades, the page still renders). `[INTENT PD-2]`
- **Focus analytics view:** loading · empty (no completed focus sessions) · populated. `[INTENT PD-11]`

## Failure behaviour (fail loud — constitution §5)
- A failed effect (log_time/award_xp/surface_journal) NEVER silently corrupts the linked session or task —
  it is typed, logged, and the completion still records; the effect is retried/flagged, not swallowed. `[INTENT; inherits Sessions fail-loud]`
- A permission violation (PD-12/SS-6) is a hard, logged rejection, not a best-effort partial effect.
- The runtime NEVER invents a second time ledger to "recover" a failed `log_time` (that reintroduces the
  double-source bug TK-5 exists to kill).

## Completion checklist
- [x] invariants with [FACT]/[INTENT] · [x] all terminal states enumerated · [x] failure is loud ·
  [x] inherits core constitution + Session Integration Contract (ADR-004) · [x] supersessions (SS-11 reversal,
  entity_type CHECK) flagged loud for build-phase reconcile
</content>
