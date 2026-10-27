<!-- Conventions — features/pomodoro · /documentation Phase 2 · sources: ADR-002 pomodoro_sessions L1433-1458 + user_preferences L3497-3500 · note.ts L58-64 · ADR-004 §3.2 · Sessions conventions/SS-11 · Tasks TK-5 · CLAUDE.md Conventions · docs/intake/pomodoro.md -->

# Conventions — Pomodoro (level: Feature / CAPABILITY within the Sessions & Scheduling realm)

> This capability is **INTENDED** (v2 = schema + config only, 0 logic). These conventions govern how it gets
> built and flag the FACT-base landmines so the build doesn't recreate a standalone-timer or Notes-owned model.

## How to build here

- **Build it as a thin runtime OVER Sessions, not a service beside it.** A timer is a `focus` Session's
  runtime — call Sessions `createSession`/the `focus` `SessionTypeDef`; do not stand up a parallel Pomodoro
  service that owns entities or writes to other modules. `[INTENT PD-1; FACT ADR-004]`
- **Attach to `session_id`, never to a task/note directly.** The task/habit/workout link lives on the
  _session_; the timer only knows its `session_id`. Never re-introduce the polymorphic `entity_type`. `[INTENT PD-1]`
- **The `/pomodoro` block is a lens.** It lists focus-enabled sessions and links a page's analytics to one —
  read/launch only. It must not create or own a timer entity. `[INTENT PD-2]`
- **Read config from Preferences; never hard-code 25/5/15/×4 or duplicate it.** `pomodoro_*` +
  `auto_start_* / show_notifications / play_sounds` are the single source. `[FACT: ADR-002 L3497-3500]`
- **Fire effects through the Session Integration Contract — never a direct write.** Time → Tasks `log_time`
  (→ `task_time_logs`, TK-5); XP → `award_xp` (S4 effect; ADR-012 generalizes → `grant_currency(XP)` E2 → `consequence_ledger` E3 — never `xp_history`); dashboard → `surface_journal`. Permission-check (`canTouch`)
  before every effect, idempotent via R1 (§6 + SS-6). Pomodoro adds **no** cross-module write of its own. `[FACT: Sessions contract; TK-5; INTENT ADR-012 E2/E3]`
- **Analytics are read-time.** Compute focus stats from the session log (SS-12); no synced Pomodoro aggregate
  table. `[FACT: Sessions SS-12]`
- **Persist boundaries, not ticks.** The per-second countdown is Zustand-only; only interval start/pause/
  complete + accumulated pause/interruption persist. `[FACT: Notes structure-data L23]`
- **Focus Mode composes the session type's tools — it doesn't own them.** Workout tools come from Health,
  reading from Books, task from Tasks; Focus Mode reads the `sub_type` declaration and renders. Its per-type ×
  per-platform detail is a dedicated design-pass — don't fabricate view behaviour here. `[INTENT G3, ⚠ design-pass]`

## Naming & layout

- The runtime concept is `pomodoro`; the Session sub-type it runs is `focus` (keep them distinct —
  `pomodoro` is NOT a `sub_type`, per SS-1). `[FACT: Sessions SS-1]`
- Interval `type ∈ {focus, short_break, long_break}`; `status ∈ {running, paused, completed, cancelled}` —
  TEXT + CHECK in SQL, canonical Zod validators in `@vida/core`, declared once in `@vida/types/note.ts`. `[FACT: note.ts L61-62]`
- Follows platform conventions: UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · booleans as 0/1 · durations in
  seconds (`duration_seconds`, `total_pause_seconds`) · full `_sync_*` metadata · all-plaintext (no `-- [E]` —
  timer state is structural). `[FACT: CLAUDE.md Conventions; ADR-002 L1151 zero-E]`

## Landmines / local "never do"

- **The v2 surface is a stub — never cite it as behaviour.** `pomodoro-service.ts`, `pomodoro-block.ts`,
  `pomodoro-widget.tsx` are **0 lines**. There is no timer engine yet; docs describe INTENDED. `[FACT: wc -l = 0]`
- **Don't treat Pomodoro as a Notes-owned entity (post-reframe).** SS-11 + Notes docs still say the timer is a
  Notes entity — that's the **pre-reframe** statement being reversed (2026-07-15). The entity is re-homed to
  the Sessions realm; reconcile SS-11 + Notes at build. `[FACT: Sessions SS-11 — flagged to reconcile]`
- **Don't build a standalone Pomodoro module.** Intake G0 = a capability inside the Sessions realm; it has its
  own docs for findability, not its own module boundary. `[INTENT G0]`
- **Don't write `actual_minutes` from Pomodoro.** Time is one ledger (`task_time_logs`, TK-5) written via the
  Session `log_time` effect. A second counter is the exact double-source bug the rule kills. `[FACT: TK-5]`
- **Don't skip pause accounting.** v2's status-only `paused` loses the paused _duration_; real focus =
  elapsed − paused (PD-5). Restore `total_pause_seconds`. `[FACT: v1 had it, v2 dropped it]`
- **Don't couple Focus Mode to one module.** It renders per `sub_type`; hard-wiring it to Tasks (or Health)
  breaks the "one runtime, N faces" model. `[INTENT G3]`

## Completion checklist

- [x] patterns in use (INTENDED, marked) · [x] naming & layout · [x] landmines (standalone-timer / Notes-owned
      / double-ledger traps) · [x] [FACT]/[INTENT] on each claim
      </content>
