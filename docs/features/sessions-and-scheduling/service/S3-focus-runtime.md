<!-- S3 forward spec — MOD-sessions ① · slice S3 (Pomodoro focus runtime). The §XXVI g1 gate object.
     Governs PD-1..PD-12 (pomodoro/business-rules.md). REFERENCES aspects + S1/S2 + interpretation. No-Guessing. -->

# S3 — Pomodoro focus runtime (forward spec · g1)

**Home:** extends `services/sessions/service.ts`. The timer is a **`focus` Session** (S1/S2), and the runtime
mutates its 1:1 `focus_sessions` row. Pomodoro is NOT a separate service — a thin runtime over the Sessions API
(`pomodoro/contract.md:8,14`). New deps: none required beyond S1/S2 (reads `user_preferences` via a repo).

## §0 The S2-flag resolution (M1.1 focus completion) — doc-given, not a decision

`intake/pomodoro.md:166,179` = "the hook exists; **stub the contract now, wire later**." So in M1.1 the timer's
`complete` finalizes the **focus_sessions run** (status + duration); it does **NOT** auto-route to
`completeSession`→`transition`→fire (that throws — `focus` declares `log_time`/`attach_pomodoro`, handlers
deferred #46). Session-completion-with-effects stays the single firing path (S2 `completeSession`), invoked when
#46 wires handlers. IR-1 preserved (no second firing path — the timer simply doesn't invoke the firing path in
M1.1). The shipped `focus` def is **NOT edited** (`registry.test.ts` pins its `{attach_pomodoro, log_time}`
envelope — BR-4 tests). `[FACT: intake/pomodoro.md:166,179; registry.test.ts:74,140,150; interpretation.md IR-1]`

## §1 Operations (signatures in `delivery/seam-contract.md`; return the `focus_sessions` row = `FocusTimer`)

- `startFocus({ sessionId?, templateId?, attach? }): FocusTimer` — **no `sessionId`:**
  `createSession('focus', status:'in_progress', started_at:now, extension:{kind:'focus', type:'focus',
status:'running'})` (reuses S1; S2's `sub_type` gate passes — `focus` is shipped) + optional `attach`
  (S1/S2). **With `sessionId` (resume, B1):** load the mapped `focus_sessions` row via
  `findWhere(session_id == sessionId)`; absent or the session isn't `sub_type:'focus'` → `SessionMissing`; a
  `paused` row → resume it (`resumeFocus` semantics); a `running` row → no-op return (idempotent); a
  `completed`/`cancelled` row → `InvalidFocusTransition` (start a new one). Returns the `focus_sessions` row.
- `pauseFocus(id): FocusTimer` — `running`→`paused`, stamp `paused_at=now`.
- `resumeFocus(id): FocusTimer` — `paused`→`running`, `total_pause_seconds += floor((now − paused_at)/1000)`,
  clear `paused_at`.
- `nextInterval(id): FocusTimer` — advance the cadence (focus→break→focus); on finishing a `focus` interval
  `completed_count += 1`; the next break is `long_break` when `completed_count % sessions_before_long === 0`,
  else `short_break`; a break→`focus`. Config from §2.
- `completeFocus(id): FocusTimer` — `→completed`, compute `duration_seconds` (§2 timing); if the current
  `type` is `focus`, `completed_count += 1` (the interval was worked — B2); completing on a break does not.
  Finalizes the RUN only (§0 — no auto effect-fire in M1.1).
- `cancelFocus(id, { interruptionReason? }): FocusTimer` — `→cancelled`, `was_interrupted=true`,
  `interruption_reason=reason ?? null` (PD-6).

## §2 Operation-flow & invariants

- **Config (PD-3) — RECONCILED in S6 (§XXVIII).** The runtime resolves cadence from `user_preferences.pomodoro_*`
  (read via a `Repository`; row may be absent) → PD-3 hard defaults (`work 25 · short_break 5 · long_break 15 ·
sessions_before_long 4`). PD-3 = "config is Preferences-owned; the runtime only obeys it." A mid-run config
  change applies to the **next** interval, never the running one. **NOTE:** this spec originally wrote a
  `templateId → prefs → defaults` precedence; S6 found that dead — `focus_sessions` has no `template_id`, so the
  backend can't bind a timer to a template, and PD-3 makes config Preferences-owned. Templates are ②-applied
  presets (fe-sessions); `startFocus.templateId` is a ②-seam the M1.1 backend does not consume. `resolveFocusConfig`
  takes no `templateId`. `[FACT: preferences.ts:64-67; scheduling.ts (no template_id); PD-3]`
- **Timer state machine (PD-4, fail-loud IR-5).** `running ⇄ paused → completed | cancelled`. Illegal moves →
  `InvalidFocusTransition(id, from, event)` (pause a non-running, resume a non-paused, complete/next a
  completed/cancelled), no write. Mirrors the InvalidTransition shape.
- **Real focus = elapsed − paused (PD-5).** `duration_seconds` at `completeFocus` = `floor((now −
session.started_at)/1000) − total_pause_seconds` (reads the spine's `started_at`; clamp ≥ 0). If still
  `paused` at complete, fold the open pause into `total_pause_seconds` first. **Semantics:** this is
  **run wall-time − pauses** (for a multi-interval run it includes break time); the pure per-interval focus-time
  cut is a derived analytic in **S7**, not a stored field.
- **Interruption capture (PD-6).** `cancelFocus` mid-focus sets `was_interrupted=true` + the reason; a normal
  `completeFocus` leaves `was_interrupted=false`.
- **All writes** go through the S1 `focusRepo` (`softDelete:false`, `encryptedFields:[]`); a `focus_sessions`
  update enqueues `sync_queue`. `session_id` immutable. Reads use `findById`/`findWhere`.
- **No stored analytics (PD-11/IR-6).** Completed-count/focus-time/streaks are derived-on-read (S7), never a
  stored aggregate.

## §3 Contract (delta)

Adds the 6 runtime methods to `SessionsService`. New typed error `InvalidFocusTransition`. `FocusTimer` =
`FocusSessionRow`. No new factory deps (config read via a `user_preferences` repo built inside the factory).

## §4 Acceptance criteria (Verification Gate — live unlocked vault)

1. `startFocus({})` (no sessionId) → creates a `focus` session (`in_progress`, `started_at`) + a
   `focus_sessions` row (`type:'focus'`, `status:'running'`, `completed_count:0`); returns it.
2. `pauseFocus`→`resumeFocus` accumulates `total_pause_seconds` (> 0 after a real gap); resume on a
   non-paused → `InvalidFocusTransition`, no write.
3. `nextInterval` from `focus` → `short_break`, `completed_count:1`; after `sessions_before_long` focus
   intervals → `long_break`; break → `focus`. Config from a written `user_preferences` row overrides the
   defaults (assert the long-break cadence changes with `pomodoro_sessions_before_long`).
4. `completeFocus` on a `focus` interval → `status:'completed'`, `completed_count` incremented (B2),
   `duration_seconds ≈ elapsed − total_pause_seconds` (≥ 0); the **session stays `in_progress`** (§0 — no
   auto-complete/fire in M1.1). Re-`completeFocus` → `InvalidFocusTransition`.
5. `cancelFocus(id,{interruptionReason:'x'})` → `status:'cancelled'`, `was_interrupted:true`, reason stored.
6. Config fallback: with **no** `user_preferences` row, the cadence uses the PD-3 defaults (25/5/15/4).
7. **Resume path (B1):** `startFocus({sessionId})` on a `paused` row resumes it (`running`); on a `running`
   row → no-op return; on a `completed` row → `InvalidFocusTransition`; on a non-focus / missing session →
   `SessionMissing`.
8. `tsc` clean; full `@vida/core` suite green.

## §5 Implementation prompt (order)

1. `types.ts` — `StartFocusInput`, `FocusTimer` (= `FocusSessionRow`), `InvalidFocusTransition(id, from, event)`,
   `SessionMissing(id)`; config type `{ workMin, shortBreakMin, longBreakMin, sessionsBeforeLong }`.
2. `service.ts` — a `userPrefsRepo` (read `user_preferences`) + a `resolveFocusConfig(templateId?)` closure
   (precedence §2). Add the 6 runtime methods over `focusRepo`, reading the spine for `started_at`.
3. Wire the new methods into the `SessionsService` interface; re-export `InvalidFocusTransition`.
4. `__tests__` — add AC1–AC6 (live vault; write a `user_preferences` row for AC3, omit it for AC6).

## §6 Out of scope (homed)

Effect-firing on completion (session lifecycle) → S2 `completeSession` + #46 handlers (§0) · `session_templates`
CRUD → S6 (S3 only READS a template if `templateId` given) · auto*start*\* / notifications / sounds behavior →
these are Preferences flags the UI (`fe-sessions`) acts on, not the core runtime (PD-7) · Focus-Mode immersive
UI + `/pomodoro` widget → `fe-sessions` / design-pass · analytics → S7.
