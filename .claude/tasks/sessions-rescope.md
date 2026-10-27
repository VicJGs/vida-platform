# Task: sessions-rescope
# Status: in-progress — Step 6: X1 next (Re-scope Gate approved 2026-10-27)
# Linear: LIF-248
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Sessions debt: HUD + runtime live + 2 core reads (entity close → fe-sessions)

## Goal
Sessions debt: HUD + runtime live + 2 core reads (entity close → fe-sessions). Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
register `sessions` · fe-session-hud legs · fe-session-runtime mark-done/attach/proof port wiring · flow-session consumer + dead `bindFlowIntents` · backend: `findActiveSession` + applied-effects read. Ships its legs live (ELC-3…7); NO ENTITY CLOSE here (process.md §6 exception)

**Inbound homings found at the Documentation Gate (2026-10-27) — homed HERE by delivery docs, in scope:**
- spine close after `completeFocus` (N9) — routines slice-map.md:62 · routines current-BR:97-99 · routines service.ts:981
- failed-lane surfacing in `dueIn` (`ProviderUnavailable(module)`, G17) — fe-calendar PLAN-S7-entity-close.md:55 · sessions S7-duein-analytics.md:21-23
- "list sessions by attached entity + date" read — routines PLAN-S5c-q1-d3-correction.md:134-136

## Ledger home
docs/features/sessions-and-scheduling/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- (entity close lives in fe-sessions, which is blocked by this unit)

## Active Tasks (slice-map X1…X7 — `docs/features/sessions-and-scheduling/delivery/slice-map.md`)
- [x] Steps 0–5 — baseline · Doc Gate · interpretation · Interpretation Gate · reconciliation (DRY) · Re-scope Gate APPROVED
- [~] X1 — effect engine (PLAN g1 SHIP; awaiting Approval 1)
- [ ] X2 — focus lifecycle + routines
- [ ] X3 — reads
- [ ] X4 — composition root
- [ ] X5 — focus store + HUD live
- [ ] X6 — runtime page live
- [ ] X7 — live close (ELC-3…7) + close-time edges

## Knowledge Loaded (session 1)
- entity-delivery-flow.md §3, §3.5, §3.75, §5, §6 — Step 2
- golive-replan process.md (ELC-1…9, §2.5, §6), debt-plan.md, coverage-report.md — Step 0
- ~/dev-toolkit/standards/{process,engineering,components}.md — session open

## Failures This Session (session 1)
- F001 — sub-agent claims needed on-disk verification each round (critic/sweeper) — resolved (every cite spot-checked)
- F002 — zsh glob `--include=*.ts` unquoted → "no matches" — resolved (quote globs)

## Route History
- 2026-10-27 (setup) — worktree `.claude/worktrees/sessions-rescope` off origin/main `0055a64`, Node 24, deps installed.
  `data-plane-wiring` verified done (PR #148) → unblocked.
- 2026-10-27 (Step 0 — Baseline) — current-* vs code, per context:
  · sessions service (`services/sessions`, last code 23aba04): current-spec current; **current-business-rules LAGGED**
    (routines-S6 planned-block rules absent; "NOT YET" listed built SS-7/9/12 + attach/CRUD) → BR-36/37 added, NOT-YET corrected.
  · ② runtime + flow (`session-runtime`, `flow`): both docs said "no composition root + `values` throws" — **STALE**
    (composition-root.ts:100 constructs `sessions`; `values` live, worker.ts:122) → corrected; stub stays (hook unflipped).
  · ② HUD (`session-hud`, merged 6ac01bd): **ABSENT from sessions current-* ("deferred: HUD #16")** → HUD section + FE-BR-5..8.
  · effects (`foundation/effects`, 52c2f69): code unchanged since its doc → current.
  · web-client-runtime current-spec:66 still said `values` throws (its current-BR:55 already corrected) → fixed.
  · Code-comment lags left for the build (they change with the flip): `use-active-session.ts:4-5` + session-hud/
    session-runtime CLAUDE.md "no composition root" wording.
  · Pre-interpretation FACT for the ledger: "register `sessions`" (scope) is ALREADY DONE by data-plane-wiring.
- 2026-10-27 (Step 1 — Documentation Gate, round 1) — independent critic REVISE (B1–B7) → grounding pass (B1–B9) → spot-verified.
  Corrected now (doc errors): baseline nits (status header, PR #144, no single-active claim) · "#46" misread as
  XS-notifications in coverage-report:179 + census b:295 (it is decomposition.md:46 = XS-measurement-engine) · routines
  "sessions-rescope #62"→#63 ×5 · 3 inbound homings added to Scope. Carried to Step 2 as interpretation NEEDS (doc-derivable
  shapes): findActiveSession ordering/concurrency/title · applied-effects per-session keying + `detail` · HUD spine→timer id
  (HUD interpretation.md:30 = focus row id) · dueIn failed-lane shape · attached-entity read shape · attach/proof interim.
  Reconciliation-bound ❌ (doc intent vs built code): rail fires-before-commit vs "completion records even if an effect
  fails" (pomodoro BR:78-79) · focus `log_time` fires payload-less → tasks handler skips (PD-9) · focus def lacks PD-10 effects.
  Open for Victor: cancelled-focus → spine status · what the Sessions-owned `attach_pomodoro` handler writes.
- 2026-10-27 (Step 1 — round 1 follow-up, Victor: "check the documentation to leave nothing behind") — both "open" items
  are DOC-RESOLVED (no call):
  · **Cancel → spine `skipped`, no effects.** The `focus_sessions` row = the whole run (nextInterval advances inside it;
    `startFocus` on a terminal timer errors; pomodoro BR:62 "start a new one") ⇒ `cancelFocus` = run abandoned (BR:70-72).
    Session terminal set = completed|skipped|missed(attended only)|rescheduled (ADR-004 §3.2.3:65; sessions BR:84) ⇒ the
    one fit is `skipped` (elimination, labeled). Effects fire on completion only (pomodoro contract:20-21; identity:56-57).
    `completeFocus` ⇒ spine `transition(id,'complete')` → declared effects (BR-25 temporary split; IR-1 one firing path).
    Needs the focus def's `in_progress→skipped` transition.
  · **`attach_pomodoro` = bind the focus run to its subject entity** — TAS-17 (backend-intent/parts/tasks.md:27) "binds a
    pomodoro focus run … to the task"; XCU-29 "surfaces the timer link"; Sessions realm (contract:57); intra-realm handler
    path + deterministic id (ADR-004:85). The binding = the session attachment (idempotent `attach`). Conflict for the
    ledger: routines detaches after completeFocus (routines service.ts:981, the N9 workaround).
- 2026-10-27 (Step 1 — Documentation Gate, round 2) — independent critic REVISE (9) → all addressed; Doc Gate CLOSED
  (the Interpretation Gate re-checks these with fresh eyes).
  Fixed: remaining bare "#46" in sessions current-spec/current-BR + effects current-spec/current-BR → real homes (SES-13) ·
  HUD seam-contract:101,124 falsely put next-interval/timer controls on `/sessions/$id` → fe-sessions' Pomodoro runtime ·
  fe-calendar PLAN-S7:43 stale cite → service.ts:795-800.
  Doc-resolved (were flagged "Victor"):
  · **Focus-runtime store WRITER = fe-sessions** — its reshape title "#34 Sessions ⊕split — … Pomodoro (runtime/HUD
    split)" (fe-sessions.md:9) + start flow (HUD seam-contract:121). Store + HUD reader are HERE (coverage-report:163);
    countdown ECs EC-3/3c/3d are re-verified at fe-sessions' ENTITY CLOSE (debt-plan:25,51 — no ELC-9 here; the fe-sessions-style exception to process.md:116-117).
    Store location/shape: ADR-020:15 `apps/web/src/stores/focus-runtime-ui-store.ts` (Zustand v5, scope-store pattern).
  · **EC-2 attach/proof — no re-pin**: EC-2 is checked at fe-sessions' close, which owns the BORROWED capture flow
    (debt-plan:51, E21). Here: port wiring (`attach`→`sessions.attach`, proof→port) + X12 fix = render the affordance only
    when a target/handler exists (dead-affordance rulings decisions.md:65,1177) — hidden ≠ no-op (ELC-5).
  · **`award_xp` home = Gamification** (SES-13 "award_xp→Gamification write API"; cross-module-integration:298-299,338
    two-layer: session fires `award_xp`, applied as `grant_currency`). Handler absent today (economy/handlers.ts has
    grant/lock only) → gamification-rescope registers it; the focus def gains `award_xp` with that registration (declaring
    it earlier throws NoEffectHandler). `surface_journal` (projection, no handler) is declarable HERE.
  · Spine close needs handlers at the web root: `attach_pomodoro` (own) + `log_time` via `registerTasksTimer`
    (composition-root.ts:96 names this unit) → registered HERE (first-consumer-pull).
  Precisions carried into the interpretation: findActiveSession excludes focus spines whose run is terminal (legacy rows)
  · attach_pomodoro handler co-writes in the rail tx (no `sessions.attach` — nested tx) + self-target no-op · resume =
  `startFocus({sessionId})`, pause = focus-row id resolved in the binding · applied-effects read re-derives the engine's
  ids (extract the builder from lifecycle.ts) · dueIn additive `{items, unavailable}` variant reusing journals'
  `ProviderUnavailable` (barrel collision) · `listSessionsForEntity(type,id,range)` (routines BR-RT-S4e-3 consumer, borrowed)
  · log_time focus fix = engine payload + Tasks-side task-target guard (routine_step target) · rail fire-before-commit vs
  pomodoro BR:78-79 ❌ (in scope: foundation/effects).
- 2026-10-27 (Step 2 — Interpretation) — `delivery/interpretation.md` rewritten as the cross-plane RESCOPE interpretation
  (supersedes the ① build's, kept at 5c961c4): deps per plane + borrowed legs, NEEDS L1–L16 (L1 register = ✅ already
  done), OWNS/CONSUMES/DELEGATES, IR-S1…S15, inherited EC map (HUD EC-1…10 · Flow EC-1…11) → here vs fe-sessions close.
  Envision Gate 3.5 → SKIP (no new affordance; ECs inherited + carried). IR-S5 resolved from code: the rail writes the
  ledger BEFORE the handler (effects/service.ts:58-68) → applicability filtered before applyEffect (declared targets).
- 2026-10-27 (Step 3 — Interpretation Gate, round 1) — critic REVISE (9 blocking), all cites verified on disk → rev 2:
  IR-S4 rebuilt on the CONTRACT's typed errors (canTouch(type,effect,target) contract:30 completed with catalogue
  target typing ADR-004:61 → `PermissionDenied` continues; vanished target = loud no-op; `NoEffectHandler` fail-closed;
  handler throw → `EffectFailed`, completion commits; "flagged" = unapplied effects derived-on-read on the EC-4 rail;
  retry = `replayCompletionEffects`) · IR-S5 payload = real focus time from the runtime (spine `ended_at` is stamped
  after firing) + Tasks handler throws (A.3) · NEW IR-S16 event identity by effect class (additive/intra-realm per run —
  a 2nd focus run same task/day was being deduped) · NEW IR-S17 close ordering + soft-deleted spine · IR-S9 = a HUD
  state-derivation change (§XXVIII) · IR-S10 store authority: the HUD homing was an ORPHAN, re-homed here by the
  approved debt-plan rev 3 → countdown ECs verified LIVE via the real store API (G18 harness precedent), not `?sample`
  · NEW L17 routines stamp-retry via L9 · L18 test-harness handler registration · L19 ELC-7 live seed path (G18).
- 2026-10-27 (Step 3 — Interpretation Gate, round 2) — REVISE: 8/9 round-1 items fixed (store-authority supersession
  confirmed); 3 new blockers → rev 3: N1 per-run keying narrowed to `log_time`/`attach_pomodoro` (award_xp + keyed stay
  per occurrence — BR-S3-5 / ADR-004:100 / SS-6; §XXVIII at PLAN) · N2 `log_time` payload derived by the ENGINE from
  persisted rows (run `duration_seconds` + `total_pause_seconds`, spine `started_at`) → replay-safe; completeFocus order =
  preflight handlers → finalize run → spine transition; a completed run under an `in_progress` spine resumes the close ·
  N3 "unapplied" read excludes projection effects + vanished targets. Nits: harness-driven store labeled INTERP
  (G18 raised), reload leg asserts the elapsed degrade; L-rows reordered; self-target denial = no row, no error.
- 2026-10-27 (Step 3 — Interpretation Gate PASS) — round 3 SHIP (N1–N3 fixed; ended_at derivation holds incl. paused-at-
  completion; preflight consistent with BR-S3-8). Nits folded: preflight moved INSIDE `transition()` (all completion paths
  fail closed before the first effect) · BR-21 resume-close exception → §XXVIII at PLAN, legacy rows close late
  (INTENDED, PD-9; no backfill) · payload resolver labeled DERIVATION · "exact" → "to the second".
  PLAN-time §XXVIII register: IR-S2 (focus def transition) · IR-S9 (HUD derivation) · IR-S16 (BR-S3-5 narrowing) ·
  IR-S17 (BR-21 exception). Step 3.5 Envision → SKIP (critic-confirmed). Next: Step 4 reconciliation ledger.
- 2026-10-27 (Step 4 — Reconciliation) — ledger R-1…R-49 + impact scan (20 rows); passes 1→4 by an independent sweeper
  (pass 2: 8 new, pass 3: 3 new, pass 4: 2 new) — interpretation amended to rev 7 (IR-S18 one-door lifecycle, IR-S19
  shared ViewProviderRegistry, title fallback = humanizeSubType). Edges written: fe-sessions (EC-5 ⋯ · EC-2 proof/attach ·
  countdown re-verify · idle form) · fe-habits + fe-routines (ReadProvider). **Close-time actions:** notes-rescope page
  `ReadProvider` edge (its task file is in flight in another session — write at this unit's merge) + Linear relations.
- 2026-10-27 (Step 4 — Reconciliation DRY) — 10 passes (pass 2–9 each found items; pass 10 DRY @8befdb5). Interp rev
  8.4 (delta-gated: IR-S18 a′/d/e). Register: 9 §XXVIII · R-45 EC-4 re-pin (Victor) · 2 divergences → fe-sessions.
- 2026-10-27 (Step 5 — Re-scope Gate, slice-map drafted) — `delivery/slice-map.md` X1 engine → X2 focus lifecycle +
  routines → X3 reads ∥ X4 composition root → X5 HUD live ∥ X6 runtime live → X7 live close. Awaiting Victor: plan
  approval + R-45.
- 2026-10-27 (Step 5 — Re-scope Gate APPROVED) — Victor: "Approve all if they are grounded in the documentation" (they
  are — every slice item traces to a cited ledger row) + R-45 EC-4 re-pinned ("In the list, muted"), recorded in
  fe-codec-flow-session envision § Re-pins; §XXVIII register +#10 (FlowEffect.status?). Next: Step 6 X1 — §XXVI gate 1.
