<!-- Interpretation Layer — features/sessions-and-scheduling · RESCOPE (sessions-rescope, LIF-248 · #63) · BOTH planes.
     Entity Delivery Flow §3 + §6 (recovery). Supersedes the MOD-sessions ① build's interpretation (kept in git at
     5c961c4). Every claim FACT / DERIVATION / ELIMINATION / UNKNOWN, cited path:line. Input corpus gated by the
     Documentation Gate (rounds 1–2, 2026-10-27 — `.claude/tasks/sessions-rescope.md` Route History). -->

# Interpretation — Sessions & Scheduling · RESCOPE (sessions-rescope) · ① service + ② surface

## 0. Frame

- **Unit:** `sessions-rescope` (LIF-248, #63 `reconstructed-structure.md:151`) — **debt slices only**: it gates its legs
  live (ELC-3…7) but does **NOT** run ELC-9 / the ENTITY CLOSE; that stays with **fe-sessions** (LIF-198), which gains
  `← sessions-rescope`. `[FACT: golive-replan/debt-plan.md:25,51; process.md §6]`
- **Scope rows:** coverage-report B·session-hud·* (:162-168) · B·session-runtime·* (:169-180) · C·flow-session·* (:204-211)
  · X12 (:278) · E12 (:364) · E21 (:373) — plus three **inbound homings** found at the Documentation Gate:
  spine close after `completeFocus` (routines slice-map.md:62) · `dueIn` failed-lane surfacing (fe-calendar
  PLAN-S7-entity-close.md:55, G17) · "list sessions by attached entity + date" (routines PLAN-S5c-q1-d3-correction.md:134-136).
- **Envision:** this unit mints NO new affordance — every surface it touches shipped with pinned ECs (HUD
  `fe-session-hud/delivery/envision.md:25-37` EC-1…10; Flow/Session `fe-codec-flow-session/delivery/envision.md:49-59`
  EC-1…11). Step 3.5 trigger test ("an affordance whose UI answer isn't obvious from a shipped surface?") → **NO → SKIP**;
  the inherited ECs are carried (§6) — SKIP ≠ skip ECs (process.md §2.5).
- **Mode:** cross-plane recovery — the BUILT CODE is a source (EDF §6). M1 = local-only, no crypto, no sync
  (ADR-017; Victor 2026-10-25 "we are only creating the M1 without any layers of cryptography").

## 1. DEPENDENCIES

### 1a. ① + foundations (built)
| Dependency | State | Fact |
|---|---|---|
| `createSessionsService({db,deviceId,registry,rail,entityRegistry})` — 41 methods incl. `getSession → {session, extension}`, `resolveTargets`, `findOpenSessionForEntity`, `transitionSession`, `startFocus/pauseFocus/resumeFocus/nextInterval/completeFocus/cancelFocus`, `dueIn`, `registerDueProvider` | ✅ built | `services/sessions/service.ts:112-180`; types `services/sessions/types.ts:101-104` |
| Session lifecycle engine `transition()` — fires completion effects FIRST, commits status LAST; `fireCompletionEffects` builds events per `def.effects × resolveTargets` (no-attachment fallback = the session itself) | ✅ built | `foundation/sessions/lifecycle.ts:62-131` |
| Session-type registry — shipped `focus` def: effects `[attach_pomodoro, log_time]`, transitions `scheduled→in_progress (start)`, `in_progress→completed (complete)` only | ✅ built (registry.test-pinned) | `foundation/sessions/registry.ts:26-41`; `S3-focus-runtime.md:16` |
| Effect rail `applyEffect(event)` — handler co-writes in the rail tx; `applied_effects` ledger `(effect_event_id, effect_type, target_ref, applied_at)` device-local; projection effects write no row; `NoEffectHandler` when none registered | ✅ built | `foundation/effects/{service,types}.ts`; `db/schema/foundation/effects.ts:19-31`; effects current-BR:15,21-23 |
| `focus_sessions` extension — status `running·paused·completed·cancelled`, `paused_at`, `total_pause_seconds`, `was_interrupted`, `interruption_reason`, `completed_count`; NO per-interval start column | ✅ built | `db/schema/foundation/session-extensions.ts:35-51`; `service.ts:502-518` |
| Tasks `registerTasksTimer({sessionRegistry, effectRegistry, db, …})` — registers the `work` sub-type + the tasks `log_time` handler (skips payload-less events) | ✅ built | `services/tasks/service.ts:88-127` |
| Journals `ProviderUnavailable(module)` — "shared with Sessions/Calendar" | ✅ built | `services/journals/types.ts:140-146` |
| Web composition root — constructs `sessions` with an EMPTY effect registry; registers tasks/purposes/relationships due lanes | ✅ built | `apps/web/src/db/composition-root.ts:94-115` |

### 1b. ② surface plane (built)
| Surface | State | Fact |
|---|---|---|
| HUD — `HudRead` tri-state, `HudSource{sessionId, kindLabel, title, timing, canPause}`, `HudTiming` = `countdown{phase,endAt,durationSeconds,pausedAt?}` \| `elapsed{startedAt}`, `HudSessionsPort{pauseFocus,resumeFocus}`; `useActiveSession` STUB (`hidden` + DEV `?sample`), logging no-op port | ✅ built, data leg stub | `apps/web/src/session-hud/{types,use-active-session,session-hud,session-hud-surface}.tsx` |
| Runtime page `/sessions/$id` — router-free surface → `FlowSessionView` via `toFlowProps` + `bindFlowIntents`; `attachTarget: () => undefined`, `onProof: () => {}` | ✅ built, intents stubbed | `apps/web/src/session-runtime/session-runtime-surface.tsx:76-79` |
| Flow adapter — `toFlowSource`, `mapEffectLog(AppliedEffectRow[])`, `SessionsPort{transition, attach}`, `bindFlowIntents` (mark-done = `transition(id,'complete')`; attach drops when no target — X12) | ✅ built | `apps/web/src/flow/{adapter,flow-source}.ts`; adapter.ts:85-122 |
| `useFlowSession` STUB (empty + DEV `?sample`, no-op port) | ✅ built, data leg stub | `apps/web/src/flow/use-flow-session.ts:1-70` |
| Live-hook pattern — `useQuery` over `getServices()`, structured keys, invalidate + re-read, DEV `?sample` kept | ✅ convention | `apps/web/src/notes/use-notes-rows.ts:8-17`; BR-RT-2/4 (web-client-runtime current-BR:13,18) |
| Zustand store convention — `apps/<app>/src/stores/<feature>-ui-store.ts`, `create<T>()()`, scope-store precedent | ✅ convention | ADR-020:15; `apps/web/src/stores/scope-store.ts` |

### 1c. Borrowed / cross-unit
| Leg | Owner | Fact |
|---|---|---|
| Timer DRIVER (start / nextInterval / complete UI — the focus-runtime store's WRITER) + the session START flow | **fe-sessions** (LIF-198, "#34 … Pomodoro (runtime/HUD split)") | `.claude/tasks/fe-sessions.md:9`; HUD seam-contract:121 |
| Proof-capture flow + doc/photo/audio capture | **fe-sessions / fe-routines** (BORROWED, E21) | coverage-report:177,373; debt-plan:51 |
| `award_xp` handler (applied as `grant_currency(XP)`) | **Gamification** — gamification-rescope registers the economy | SES-13 (`backend-intent/parts/sessions-and-scheduling.md:26`); cross-module-integration:298-299,338; ADR-012:60 |
| Routines reflection consumer of the attached-entity read | **routines** (BR-RT-S4e-3) | `docs/modules/routines/current-business-rules.md:114-117` |
| `dueIn` consumers — Calendar lanes (G17), notifications anticipations | fe-calendar (shipped) · notifications-rescope (`← sessions-rescope`) | `apps/web/src/app/calendar/use-calendar.ts:104,108`; `services/notifications/service.ts:406`; debt-plan:26 |

## 2. NEEDS — per leg (✅ exists · ❌ must be built here · ⛳ composition, ELC-3)

| # | Leg | Plane | Status | Need / grounding |
|---|---|---|---|---|
| L1 | Register `sessions` in the web composition root | shared | ✅ **already done** (data-plane-wiring PR #148 / fe-calendar S7) | `composition-root.ts:100` — the ledger records it ✅ aligned |
| L2 | Focus effect handlers at the web root: `attach_pomodoro` (Sessions-realm, NEW) + `log_time` via `registerTasksTimer` | ① + ⛳ | ❌ + ⛳ | ADR-004:88 "each effect-receiving module exposes named handlers"; contract:57 (attach_pomodoro = this realm); composition-root.ts:96 names this unit |
| L3 | Spine close: `completeFocus` → spine `transition(id,'complete')` (fires effects); `cancelFocus` → spine `skipped`, no effects; focus def gains `in_progress→skipped` | ① | ❌ | BR-25 (sessions current-BR:99-101, the temporary split) · IR-1 one firing path · pomodoro contract:20-21 · ELIMINATION for `skipped` (ADR-004:65; sessions BR:84; pomodoro BR:62,70-72) |
| L4 | Focus `log_time` carries the run payload (`started_at`/`ended_at`); Tasks handler guards a non-task target | ① (sessions engine) + ① (tasks) | ❌ | PD-9 (pomodoro BR:45-47) · tasks handler skips payload-less events (`tasks/service.ts:91-98`) · ADR-004 §3.2.5-A.3 target scoping |
| L5 | Completion records when an effect FAILS at runtime (typed, logged, flagged for retry); `NoEffectHandler` (no handler wired) stays fail-loud | ① (`foundation/sessions` + `foundation/effects`) | ❌ | pomodoro BR:78-79 · sessions BR:79-80 vs `lifecycle.ts:111-131` fire-then-commit (BR-S3-8) · framework R2 / effects current-BR:15 (NoEffectHandler) |
| L6 | `findActiveSession(): Promise<Session \| null>` | ① | ❌ | F-HUD-1 (`fe-session-hud/delivery/findings.md:10-13`) |
| L7 | Applied-effects read per session (EC-4 effect rail) | ① | ❌ | `fe-session-runtime/delivery/seam-contract.md:27-28`; census b:276 / c:144 (E12) |
| L8 | `dueIn` failed-lane surfacing (additive variant) | ① | ❌ | S7-duein-analytics.md:21-23 · contract.md:63 (`ProviderUnavailable(module)`) · BR:89-91 · G17 |
| L9 | `listSessionsForEntity(entityType, entityId, range)` | ① | ❌ | routines PLAN-S5c:134-136 |
| L10 | Focus def declares `surface_journal` (PD-10, projection — no handler needed); `award_xp` joins when Gamification registers its handler | ① | ❌ (surface_journal) · edge (award_xp → gamification-rescope) | pomodoro BR:48-50 · ADR-004:84 (projection writes no row) · `economy/handlers.ts:67-70` (no award_xp) |
| L11 | Focus-runtime client store (Zustand) + HUD reads it | ② | ❌ | ADR-020:15 · coverage-report:163 · HUD seam-contract:60-67 |
| L12 | `useActiveSession` live flip + port binding | ② | ❌ | HUD use-active-session.ts:12-22 (the sketch — corrected by IR-S6) · EC-5/EC-7 |
| L13 | `useFlowSession` live flip (getSession + resolveTargets + L7 read) | ② | ❌ | use-flow-session.ts:10-18 · ELC-4 |
| L14 | Runtime intents live: mark-done · attach port · proof port; X12 fix | ② | ❌ | `bindFlowIntents` (adapter.ts:113-122) · X12 (census b:349) · EC-2 · decisions.md:65,1177 |
| L15 | Drop routines' N9 detach workaround once the spine closes | ① (routines) | ❌ | routines service.ts:979-984 + current-BR:97-99 ("workaround for … a Sessions gap owned by sessions-rescope"); attach_pomodoro binding (IR-S3) |
| L16 | Currency of stale code comments ("no composition root / values throws") | ② | ❌ | use-active-session.ts:4-5 · use-flow-session.ts:4-6 · session-runtime/CLAUDE.md:21 |

## 3. ORGANIZATION

- **OWNS (this unit):** the Sessions ① read/close surface (L3–L10 in `services/sessions` + `foundation/sessions`), the
  `attach_pomodoro` handler (Sessions realm), the effect-failure semantics in `foundation/{sessions,effects}`, the
  focus-runtime store (`apps/web/src/stores/focus-runtime-ui-store.ts`), and the live data legs + intent bindings of
  the HUD and the runtime page (`apps/web/src/{session-hud,session-runtime,flow}`).
- **CONSUMES:** the composition root (`getServices()`), Tasks' `registerTasksTimer`, journals' `ProviderUnavailable`,
  the shipped `@vida/ui` `FlowSessionView` + V5 timer discipline, the state-conventions terminal ladder.
- **DELEGATES:** timer driver + start flow + proof/attach capture → fe-sessions (and fe-routines for proof); `award_xp`
  handler → gamification-rescope; reflection use of L9 → routines; failed-lane rendering in the Calendar → its owner
  (the Calendar consumes the L8 variant when it adopts it — fe-calendar is shipped, so the adoption is recorded as an
  edge, not built here); notifications anticipations over `dueIn` → notifications-rescope.
- **Touches outside `services/sessions`:** `services/tasks/service.ts` (L4 guard) and `services/routines/service.ts`
  (L15) — each with its context's §XXIX currency.

## 4. IMPLICIT RULES

- **IR-S1 · One firing path.** Focus completion = `completeFocus(timerId)` finalizing the run AND delegating the spine
  close to `transition(sessionId,'complete')` — never a second firing loop (IR-1, sessions current-BR:101).
- **IR-S2 · Cancel is not completion.** `cancelFocus` → spine `in_progress→skipped` (new focus-def transition, event
  `skip`); no effects; the interruption stays on the focus row (PD-6). Adding the transition leaves the pinned effects
  set unchanged; `registry.test.ts` is updated for the transition only (S3-focus-runtime.md:16 "def NOT edited" was an
  M1.1 pin, superseded here by L3's doc mandate — record as a §XXVIII note at the PLAN).
- **IR-S3 · `attach_pomodoro` binds the run to its subject.** TAS-17 (`backend-intent/parts/tasks.md:27`) + XCU-29.
  The handler co-writes INSIDE the rail tx (`effects/types.ts:49-53`) — it must not call `sessions.attach` (that opens
  its own tx, `repository.ts:350-351`) — find-or-create the `session_attachments` row in-tx (idempotent; at fire time
  the attachment normally exists, since targets come from attachments, `lifecycle.ts:67`). Self-target fallback
  (`targetRef = session.id`, no attachments) → explicit no-op.
- **IR-S4 · Missing handler ≠ failed effect.** `NoEffectHandler` is a wiring defect → stays fail-loud, no write
  (framework R2). A handler that throws at runtime, or a target that vanished (sessions BR:79-80), → the completion
  still commits; the failure is typed + logged and returned as `failed: {effectType, targetRef, error}[]` on
  `TransitionResult` (DERIVATION: pomodoro BR:78-79 "completion still records; the effect is retried/flagged"). Retry
  = re-running `fireCompletionEffects` for that session: the ledger dedupes the applied ones (ADR-004 §3.2.5-B.2), a
  failed one has no ledger row (its tx rolled back) so it re-applies.
  Consequence: every composition that completes a focus session MUST register its handlers — the web root (L2) and
  every test harness (routines/tasks suites).
- **IR-S5 · `log_time` from a focus run.** The engine passes the spine's `started_at`/`ended_at` as the event payload
  (PD-9). Code FACT: the rail inserts the `applied_effects` row BEFORE calling the handler, in one tx
  (`effects/service.ts:58-68`) — so a handler that merely *returns* still leaves a ledger row ("Logged time" on the
  effect rail, and a later correct fire deduped away). Therefore target applicability is decided BEFORE `applyEffect`,
  never by an in-handler skip: the event carries the attachment's `entityType`, a handler declares the target types it
  receives (SES-13 `log_time → Tasks/Projects time API`), and the engine fires an effect only for targets its handler
  accepts (DERIVATION: ADR-004 §3.2.4 "effects are scoped to attachments" + SES-13 routing). A `routine_step` target
  therefore gets no `log_time` event; the Tasks handler's payload-less guard (`tasks/service.ts:91-98`) becomes dead
  once the engine sends the payload and is replaced by the declared-target check.
- **IR-S6 · HUD port ids.** The service's pause takes the `focus_sessions.id` (`service.ts:149`; HUD interpretation:30);
  the HUD emits the spine id (`session-hud.tsx:205`). The binding resolves it: pause = `getSession(id).extension.id →
  pauseFocus`; resume = `startFocus({sessionId})` (resumes a paused run by spine id, `service.ts:457-466`). The HUD
  signature is unchanged (findings.md:29-30).
- **IR-S7 · Active = live spine `in_progress`, minus dead focus runs.** `findActiveSession` returns the most recent
  (`started_at ?? created_at`) non-deleted `in_progress` session of any sub-type, EXCLUDING focus spines whose run is
  terminal (`focus_sessions.status ∈ completed|cancelled` — legacy rows from before L3). Concurrency is allowed (no
  single-active invariant on disk; only one open session per task, BR-TK-S4-2) — the HUD shows the most recent.
- **IR-S8 · HUD title + kind.** `title` = the instance-level attached subject's title (flow-session
  interpretation.md:189-191; the `?sample` forms use entity titles, use-active-session.ts:83,103) resolved via the
  owning registered service; fallback `humanizeSubType` (flow-source.ts:63-67). `kindLabel` = humanized `sub_type`.
- **IR-S9 · HUD timing without the store.** Countdown is NOT reconstructable from persistence (no interval start
  column; HUD seam-contract:64-67; findings.md:21-26 forbids adding persistence) → with no client clock the HUD
  serves `elapsed`. For a focus row, elapsed = PD-5 real focus time (`now − started_at − total_pause_seconds`), and a
  `paused` row is FROZEN at `paused_at` (EC-4 "paused" + EC-3b honest time) — this needs an optional `pausedAt?` on
  the `elapsed` timing (additive mirror-by-value field; record at PLAN, §XXVIII if the seam calls it a change).
- **IR-S10 · Focus store contract.** The store holds the ephemeral interval truth (`endAt`, `phase`, `durationSeconds`,
  `pausedAt?`) keyed by spine session id; this unit builds the store + the HUD reader; the WRITER is fe-sessions'
  timer driver. With no writer in M1, the countdown forms are reachable only via DEV `?sample` — the countdown ECs
  (EC-3, 3c, 3d) are re-verified live at fe-sessions' ENTITY CLOSE (§6).
- **IR-S11 · Applied-effects read re-derives the engine's ids.** Extract the event-id builder from `lifecycle.ts:68-81`
  into one shared function; the read computes the ids for `def.effects × resolveTargets(session)` (or the
  self-target fallback) and selects `applied_effects` by id, ordered `applied_at` ASC (EC-4 "chronological").
  `detail` = the resolved target title (+ applied time). Projection effects never appear (no row, by design,
  ADR-004:84); the device-local ledger is moot in M1 (no sync, ADR-017). Two sessions on one target/day share a row
  (SS-6) — both show it.
- **IR-S12 · `dueIn` stays `DueItem[]`.** The failed-lane variant is ADDITIVE (`dueInDetailed(range) → {items,
  unavailable: ProviderUnavailable[]}`; `dueIn` delegates and drops `unavailable`) — a return-type change would break
  contract.md:33 + its two callers; throwing breaks the per-lane rule (BR:89-91). `ProviderUnavailable` is the
  journals class, moved to a shared home (two same-named classes collide in the `@vida/core` barrel, index.ts:166,172).
- **IR-S13 · Mark-done by sub-type.** Generic session → `transition(id,'complete')` (adapter.ts:115). Focus session →
  `completeFocus(timerId)` (IR-S1) — a bare spine transition would leave the run `running`.
- **IR-S14 · No dead affordances (X12).** `bindFlowIntents` passes `onAttach`/`onRequireProof` ONLY when a target /
  handler exists; `FlowSessionView` hides an absent affordance (`flow-session-view.tsx:169-184`). The live
  `attachTarget` = the stage's `deliverable_note` page (fe-session-runtime PLAN-…-s2 BR-3); with none → hidden. Proof →
  hidden until fe-sessions' borrowed capture flow passes `onProof`. Hidden ≠ no-op (ELC-5).
- **IR-S15 · Honest states.** Runtime page: the full terminal ladder via `deriveTerminalState` (state-conventions);
  HUD: loading/failure → `hidden` (BR-HUD-S1-6b). Every write = `useMutation` → invalidate + re-read, no optimistic
  (BR-RT-4).

## 5. Resolved at the Documentation Gate (doc-grounded) · and what remains

Resolved (each in the task Route History with cites): cancel → `skipped` (ELIMINATION) · `attach_pomodoro` = binding
(FACT) · focus-store writer = fe-sessions (FACT) · EC-2 attach/proof → fe-sessions' close, hidden here (FACT +
binding precedent) · `award_xp` → Gamification (FACT) · handler registration here (FACT) · "#46" misread corrected.

**Remains for the Interpretation Gate (no UNKNOWN is guessed):**
1. ~~IR-S5 ordering~~ — RESOLVED from code (`effects/service.ts:58-68`: ledger first) → declared-target filtering.
2. IR-S9's `pausedAt?` on `elapsed` — additive; flagged so the PLAN gate decides if it is a §XXVIII deviation.

## 6. Inherited EC set — leg → where verified (ELC-9 is fe-sessions')

| EC | Exercised by | Verified here (live leg, ELC-7) | Re-verified at fe-sessions close |
|---|---|---|---|
| HUD EC-1, EC-5, EC-6, EC-8, EC-9, EC-10 | L12 | ✅ live (real OPFS) | ✅ |
| HUD EC-2 (idle · running · paused) | L11/L12 | running + paused via elapsed (IR-S9); idle stays hidden (Envision answer 1) | ✅ incl. idle once the start flow ships |
| HUD EC-3, EC-3c, EC-3d (countdown forms) | L11 | DEV `?sample` only (no writer, IR-S10) | ✅ live (fe-sessions timer driver) |
| HUD EC-3b, EC-4 (honest elapsed / paused) | L12 + IR-S9 | ✅ live | ✅ |
| HUD EC-7 (honest data discipline) | L12 | ✅ (live read replaces the stub; `?sample` DEV-only) | ✅ |
| Flow EC-1, EC-3 (multi-stage) | — | single-stage only (O7, driving modules) | per driving module |
| Flow EC-2 (attach / mark-done / proof) | L14 | mark-done ✅ live; attach when a target exists; proof hidden (IR-S14) | ✅ with the borrowed capture flow |
| Flow EC-4 (effect rail) | L7/L13 | ✅ live (completed session with effects) | ✅ |
| Flow EC-5…9, EC-11 | L13 | ✅ live | ✅ |
| Flow EC-10 (advance feel) | L14 | mark-done feel ✅ live | ✅ |

## 7. Sources
Aspect docs `docs/features/sessions-and-scheduling/*` + `docs/features/pomodoro/*` · ADR-004, ADR-012, ADR-017, ADR-020 ·
`docs/core/architecture/{cross-module-integration,state-conventions}.md` · `backend-intent/parts/{tasks,xcut-sessions,
sessions-and-scheduling}.md` · `docs/specs/foundation/{fe-session-hud,fe-session-runtime,fe-codec-flow-session,
fe-calendar}/delivery/*` · `golive-replan/{process,debt-plan,coverage-report}.md` + census · `.claude/docs/decisions.md` ·
built code cited inline.
