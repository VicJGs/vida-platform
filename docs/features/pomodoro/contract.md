<!-- Contract — features/pomodoro · /documentation Phase 2 · sources: ADR-002 pomodoro_sessions L1433-1458 · note.ts L58-64,154-163 · ADR-004 §3.2 (effects) · Sessions contract (registry, 4-dim contract, effect catalog, createSession) · Tasks TK-5 · Notes contract L19 · pomodoro-service.ts/pomodoro-block.ts/pomodoro-widget.tsx (0 lines) · docs/intake/pomodoro.md -->

# Contract — Pomodoro  (level: Feature / CAPABILITY within the Sessions & Scheduling realm)

> ⚠ Interfaces below are **INTENDED** — the v2 surface is schema-only: `pomodoro-service.ts`,
> `pomodoro-block.ts`, `pomodoro-widget.tsx` are all **0 lines** (`wc -l = 0`). Signatures are the documented
> target the build executes against, not enforced reality. Pomodoro exposes **no free-standing service** — it
> is a thin runtime **over** the Sessions API; the surface below is what a caller uses to *run a focus timer*.
> `[FACT: wc -l = 0 on all three files]`

## Exposed surface

### 1. The focus runtime (thin, over Sessions)
Pomodoro does not register its own entity type — a timer is a `focus` **Session** (Sessions
`SessionRegistry`, sub-type `focus`). The runtime surface:
- **`startFocus({ session_id? , focus_type_preset?, attach? }): Timer`** — begins a focus interval. If no
  `session_id`, it first creates a `focus` Session (Sessions `createSession`) carrying the caller's
  attachment (task/habit/workout via the Session, PD-1), then runs the timer against that `session_id`. `[INTENT PD-1]`
- **`pause(timer) / resume(timer)`** — hold/continue; accumulates paused duration (PD-5). `[INTENT G1a]`
- **`complete(timer) / cancel(timer, { interruption_reason? })`** — end the interval; `cancel` mid-focus
  captures the interruption (PD-6). Completion triggers the Session's declared effects (§2). `[INTENT G1b/PD-9]`
- **`nextInterval(timer)`** — advance focus → break → focus per the cadence; honors `auto_start_*` (PD-7). `[INTENT G1c-d]`

### 2. Effects on completion — fired by the Session, NOT by Pomodoro
Pomodoro triggers **no writes of its own**. Completing a focus interval fires the `focus` sub-type's declared
Integration-Contract effects (Sessions `contract.md`; ADR-004 §3.2):

| Effect | Target | Integration point | Rule |
|---|---|---|---|
| `log_time(task\|project)` | Tasks / Projects | Tasks time API → `task_time_logs` | one ledger, per-task opt-out (PD-9 / TK-5) |
| `award_xp` | Gamification (Wave 4) | `xp_history` write | stub now; Gamification sets the value (PD-10) |
| `surface_journal` | Journals | daily `/summary` focus feed | PD-10 |
| `surface_calendar` | Global Calendar | block render (if the session was planned) | inherits Sessions |

All go through each module's documented write API — **never a direct table write** (§6 + SS-6).

### 3. The `/pomodoro` widget (Notes/Pages) — a session lens
- **`listFocusEnabledSessions(scope): FocusSession[]`** — the widget showcases pomodoro-enabled (focus)
  sessions for the page's scope; the user picks one to run + the page's analytics link to that `session_id`
  (PD-2). Read/launch only — no owned entity. `[INTENT: Victor 2026-07-15; ⚠ reconciles Notes startSession API — contract L19]`

### 4. Focus Mode (the runtime's rendered face) — ⚠ INTENDED, design-pass
- **`renderFocusMode(session_id, platform): FocusView`** — resolves the session's `sub_type` → its declared
  tool-set → a **type-specific, platform-adaptive (mobile/desktop/web), low-distraction** surface (PD-8/G3).
  The per-type tool composition (workout→Health metrics, reading→Books, work→task) + per-platform states +
  break-guidance are a dedicated **Focus Mode design-pass**; not specced here beyond the contract shape. `[INTENT G3, ⚠ design-pass]`

## What it consumes (external dependencies — via documented integration points, never direct tables)
- **Sessions & Scheduling** — `createSession` (focus), the `focus` `SessionTypeDef` (attachment/effects/
  lifecycle/permissions), the base `sessions` spine (`session_id`, analytics). Pomodoro is a *client* of this. `[FACT: Sessions contract §1-2]`
- **Preferences** — `pomodoro_*` interval config + `auto_start_* / show_notifications / play_sounds` (PD-3/PD-7). `[FACT: ADR-002 L3497-3500]`
- **Tasks** (via the Session `log_time` effect) · **Journals** (`surface_journal`) · **Gamification**
  (`award_xp`, Wave 4) · **Health/Books/etc.** (Focus Mode tools, per session type).

## Contract error cases (typed)
- `NoFocusSession` — `startFocus` given no `session_id` and Session creation failed → explicit, never a silent
  no-op timer. `[INTENT]`
- `InvalidTransition(timer, event)` — resume/complete on an already-ended interval (PD-4 edge case). `[INTENT]`
- `EffectFailed(effect, target)` — a completion effect failed; typed + logged, completion still records (PD /
  fail-loud). `[INTENT]`
- `PermissionDenied(effect, target)` — SS-6 guardrail on the session's effects. `[FACT: Sessions SS-6]`
- `SessionMissing(session_id)` — the focus session was deleted mid-run; runtime stops, effects no-op loudly. `[INTENT]`

## Completion checklist
- [x] exposed surface (runtime · effects-via-Session · widget lens · Focus Mode) + consumed deps ·
  [x] typed errors · [x] all integration via documented points, no direct table access (§6) ·
  [x] [FACT]/[INTENT] on each claim · [x] flags the 0-logic reality + the reconciliations
</content>
