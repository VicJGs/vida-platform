<!-- Identity — features/pomodoro · /documentation Phase 2 · sources: ADR-002 pomodoro_sessions L1433-1458 + user_preferences pomodoro_* L3497-3500 · note.ts L58-64,154-163 · ADR-004 §2/§3.1/§3.2 · Sessions SS-11/SS-3/identity L50-51 · Tasks TK-5 · v1 studyPlanner.ts SessionTemplate+PomodoroSession + FocusMode.tsx · CLAUDE.md §8 -->

# Identity — Pomodoro (level: Feature / CAPABILITY within the Sessions & Scheduling realm)

**What it is.** The OS's **focus-timer runtime** — the Pomodoro-technique engine (work / short-break /
long-break intervals) that drives any bout of focused work. In the reframed OS it is **not a standalone
module and not a Notes satellite**: it is the **runtime of the `focus` Session sub-type**, living **solely
inside the Sessions & Scheduling realm**. Every use of a timer goes _through a Session_, and Pomodoro's
entire cross-module reach (time-to-task, XP, journal, calendar) rides the **Session Integration Contract**
the Session already declares. `[INTENT: Victor reframe 2026-07-15; FACT: ADR-004 §3.2 attach_pomodoro effect; Sessions SS-11]`

**The desire behind it.** A timer is useless in isolation — its value is _what it plugs into_. The intent is
one focus runtime that the whole OS composes: a task uses a focus Session to get its deliverable done, a
workout uses one to pace exercises and breaks, a reading or study bout uses one to stay honest about time.
Because more and more entities route through Sessions, a single timer that attaches to a `session_id`
reaches **every** module a session can be about — a larger, cleaner surface than a per-entity timer ever
could. `[INTENT: Victor 2026-07-15]`

**The reframe that placed it here.** `[INTENT: Victor 2026-07-15 — RESOLVES intake G0/G2/G4]`

- **Consolidated into the Sessions realm (G2).** Victor: _"the OS is complex enough for it to be handled only
  within the Sessions realm, and not leak to any other entity… establish it in a solemnly realm of the
  Sessions part."_ This finishes what **ADR-004** started — it pre-declared `attach_pomodoro` and named
  `pomodoro_sessions` among the "9+ scattered session entities with no shared spine." Pomodoro stops being a
  scattered entity and becomes the `focus` sub-type's runtime.
- **Re-homed off Notes (⚠ reconciles Sessions SS-11 + Notes ownership).** The current docs say the timer is a
  **Notes** entity and Sessions owns "only templates" (SS-11; sessions/identity L50-51). The reframe **reverses
  the ownership half**: `pomodoro_sessions` moves into the Sessions realm and re-points at `session_id`
  (dropping the polymorphic `entity_type` CHECK). The Notes `/pomodoro` block **stays as a widget** — a lens
  that _showcases pomodoro-enabled sessions_ and links a page's analytics to a specific session — but is a
  **view, never the owner**. `[FACT: current ADR-002 pomodoro_sessions L1435 entity_type CHECK; Notes contract L19; to reconcile at build → ADR-004 amendment + ADR-002 re-home]`

**Focus Mode — the runtime's face.** `[INTENT: Victor 2026-07-15 — RESOLVES G3/G6, ⚠ INTENDED, design-pass]`
Pomodoro is not one screen. Its runtime renders as **Focus Mode**: a **low-distraction** immersive surface
that **changes shape per session TYPE** — surfacing exactly the OS tools that serve _that_ session's
deliverable (workout → exercise guidance, body stats/metrics, hydration + energy-recompose + rest cues,
end-of-session analytics; reading → the book; work → the task) — and has **distinct UI states for mobile /
desktop / web**. It is the rendered face of the session type's ADR-004 declared tool-set: one runtime, N
faces. Breaks are part of it — not dumb countdowns but **per-type guidance** (drink water, recompose, rest).

**What it is NOT.** `[INTENT — anti-scope-creep]`

- **NOT a module / not a sub-context.** A feature/capability inside the Sessions realm (intake G0 = thin
  capability-doc).
- **NOT a Session sub-type.** `pomodoro` is the **runtime**, not a `sub_type` — the sub-type is `focus`
  (Sessions SS-1: _"`pomodoro` is not a sub-type — it is the runtime"_). `[FACT: Sessions SS-1/SS-11]`
- **NOT a Notes-owned entity (after reframe).** Notes hosts the `/pomodoro` **widget** only; the entity lives
  in the Sessions realm. `[INTENT: reverses SS-11's ownership half]`
- **NOT the owner of interval config.** The `pomodoro_*` knobs live in **Preferences**; the runtime obeys
  them. `[FACT: ADR-002 user_preferences L3497-3500]`
- **NOT a second time ledger.** Time-to-task flows through the Session `log_time` effect into Tasks
  `task_time_logs` (TK-5, one ledger); Pomodoro never writes `actual_minutes` itself. `[FACT: Tasks TK-5]`
- **NOT its own analytics engine.** Focus stats are a _cut_ of session analytics off the base spine; Pomodoro
  feeds Journal + Tasks, it does not own an aggregate. `[FACT: Sessions SS-12]`

**Terminal states (capability-level).** Idle (no timer running → the widget shows startable focus-enabled
sessions, anti-lost) · Running (a focus interval counting) · Paused (interval held; paused time accumulated) ·
Break (short/long interval with per-type guidance) · Completed (interval/run finished → effects fired) ·
Cancelled/Interrupted (stopped early; interruption reason captured) · Error (a failed effect never corrupts
the linked session — fail loud). `[INTENT; FACT type/status enums note.ts L61-62]`

**Neighbors.** `[[../sessions-and-scheduling/identity]]` (owns
the `focus` sub-type + Integration Contract — Pomodoro is its runtime) · `[[../../core/decisions/ADR-004-session-framework]]`
(the 4-dimension contract Pomodoro's reach rides) · `[[../tasks/identity]]` (task→focus-Session→`log_time`,
TK-5) · `[[../notes-and-pages/identity]]` (`/pomodoro` widget = a session lens) · `[[../health/training/identity]]`
(workout Focus Mode tools) · Preferences (interval config) · Journals (`/summary` focus feed) · Gamification
(`award_xp` on completion — the ADR-004 §3.2.2 S4 effect, which ADR-012 generalizes → `grant_currency(XP)` (E2) → `consequence_ledger` (E3, Gamification-owned), Wave 4).
</content>
