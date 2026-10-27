<!-- Interpretation Layer — features/sessions-and-scheduling · RESCOPE (sessions-rescope, LIF-248 · #63) · BOTH planes.
     Entity Delivery Flow §3 + §6 (recovery). Supersedes the MOD-sessions ① build's interpretation (kept in git at
     5c961c4). Every claim FACT / DERIVATION / ELIMINATION / UNKNOWN, cited path:line. Input corpus gated by the
     Documentation Gate (rounds 1–2, 2026-10-27 — `.claude/tasks/sessions-rescope.md` Route History). -->

# Interpretation — Sessions & Scheduling · RESCOPE (sessions-rescope) · ① service + ② surface

## 0. Frame

- **Unit:** `sessions-rescope` (LIF-248, #63 `reconstructed-structure.md:151`) — **debt slices only**: it gates its legs
  live (ELC-3…7) but does **NOT** run ELC-9 / the ENTITY CLOSE; that stays with **fe-sessions** (LIF-198), which gains
  `← sessions-rescope`. `[FACT: golive-replan/debt-plan.md:25,51 — the fe-sessions-style exception to process.md:116-117]`
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
| `createSessionsService({db,deviceId,registry,rail,entityRegistry})` — 41 methods incl. `getSession → {session, extension}`, `resolveTargets`, `findOpenSessionForEntity`, `transitionSession`, `startFocus/pauseFocus/resumeFocus/nextInterval/completeFocus/cancelFocus`, `dueIn`, `registerDueProvider` | ✅ built | `services/sessions/service.ts:123-180` (interface); deps `:112-121`; types `services/sessions/types.ts:101-104` |
| Session lifecycle engine `transition()` — fires completion effects FIRST, commits status LAST (crash self-heals on replay, ADR-004 §3.2.5-B.4); `fireCompletionEffects` builds events per `def.effects × resolveTargets`, every event keyed `(target ‖ utcDate(started_at) ‖ type)` regardless of effect class (no-attachment fallback = the session itself); reads the spine WITHOUT a `deleted_at` filter (:100); canTouch is only STRUCTURAL (effect ∈ allowed_effects; target ∈ attachments, header :7-8) | ✅ built | `foundation/sessions/lifecycle.ts:1-131` |
| Session-type registry — shipped `focus` def: effects `[attach_pomodoro, log_time]`, transitions `scheduled→in_progress (start)`, `in_progress→completed (complete)` only | ✅ built (registry.test-pinned) | `foundation/sessions/registry.ts:26-41`; `S3-focus-runtime.md:16` |
| Effect rail `applyEffect(event)` — inserts the ledger row THEN calls the handler, one tx (a handler throw rolls back both, `effects/service.ts:44-70`); projection-class effects return before any handler lookup (`:35-36`); `EFFECT_CLASS` map keyed/additive/projection/intra_realm (`effects/types.ts:15-32`); handler co-writes in the rail tx; `applied_effects` ledger `(effect_event_id, effect_type, target_ref, applied_at)` device-local; projection effects write no row; `NoEffectHandler` when none registered | ✅ built | `foundation/effects/{service,types}.ts`; `db/schema/foundation/effects.ts:19-31`; effects current-BR:15,21-23 |
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
| Zustand store convention — `apps/<app>/src/stores/<feature>-ui-store.ts`, `create<T>()()`, scope-store precedent | ✅ convention | ADR-020:15 (the `<feature>-ui-store.ts` convention; the file name `focus-runtime-ui-store.ts` follows it); `apps/web/src/stores/scope-store.ts` |

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
| L4 | Focus `log_time` carries the run's REAL focus time; target-typed canTouch (`log_time(task\|project)`); Tasks handler validates + throws (no silent skip); additive effects keyed per run | ① (sessions engine) + ① (tasks) | ❌ | PD-9 · PD-5 (pomodoro BR:32-34,45-47) · contract.md:30,64 · ADR-004:61,83,93-94,99 — see IR-S5, IR-S16 |
| L5 | Effect-failure semantics: `PermissionDenied` + `EffectFailed` typed, completion continues; vanished target = loud no-op; `NoEffectHandler` stays fail-loud; unapplied effects derived-on-read + a replay method | ① (`foundation/sessions` + `foundation/effects`) | ❌ | contract.md:64 · pomodoro contract:59, BR:78-79 · sessions BR:79-80,84-85 · ADR-004:91-92, B.2/B.4 — see IR-S4 |
| L6 | `findActiveSession(): Promise<Session \| null>` | ① | ❌ | F-HUD-1 (`fe-session-hud/delivery/findings.md:10-13`) |
| L7 | Applied-effects read per session (EC-4 effect rail) | ① | ❌ | `fe-session-runtime/delivery/seam-contract.md:27-28`; census b:276 / c:144 (E12) |
| L8 | `dueIn` failed-lane surfacing (additive variant) | ① | ❌ | S7-duein-analytics.md:21-23 · contract.md:63 (`ProviderUnavailable(module)`) · BR:89-91 · G17 |
| L9 | `listSessionsForEntity(entityType, entityId, range)` | ① | ❌ | routines PLAN-S5c:134-136 |
| L10 | Focus def declares `surface_journal` in `effects` AND `permissions.allowed_effects` (PD-10, projection — returns before handler lookup); this widens the shipped envelope ceiling user types may use (`registry.ts:78-80`) — recorded; `award_xp` joins when Gamification registers its handler | ① | ❌ (surface_journal) · edge (award_xp → gamification-rescope) | pomodoro BR:48-50 · `effects/service.ts:35-36` · `registry.ts:31,39,78-80` · `economy/handlers.ts:67-70` |
| L11 | Focus-runtime client store (Zustand) + HUD reads it | ② | ❌ | ADR-020:15 · coverage-report:163 · HUD seam-contract:60-67 |
| L12 | `useActiveSession` live flip + port binding | ② | ❌ | HUD use-active-session.ts:12-22 (the sketch — corrected by IR-S6) · EC-5/EC-7 |
| L13 | `useFlowSession` live flip (getSession + resolveTargets + L7 read) | ② | ❌ | use-flow-session.ts:10-18 · ELC-4 |
| L14 | Runtime intents live: mark-done · attach port · proof port; X12 fix | ② | ❌ | `bindFlowIntents` (adapter.ts:113-122) · X12 (census b:349) · EC-2 · decisions.md:65,1177 |
| L15 | Drop routines' N9 detach workaround once the spine closes | ① (routines) | ❌ | routines service.ts:979-984 + current-BR:97-99 ("workaround for … a Sessions gap owned by sessions-rescope"); attach_pomodoro binding (IR-S3) |
| L17 | Routines stamp-retry + focus re-entry once the spine closes: retry finds a completed-unstamped run via L9, not the open spine | ① (routines) | ❌ | BR-RT-S3d-5 (routines current-BR:95-103) · `routines/service.ts:990-1003,1084-1085` · `sessions/service.ts:442` (`findOpenSessionForEntity` = `in_progress` only) |
| L18 | Every composition that completes a focus session registers its handlers — web root (L2) + the routines/tasks/sessions test harnesses | ⛳ + tests | ❌ | IR-S4 (NoEffectHandler fail-loud) · ADR-004:91-92 |
| L19 | ELC-7 live seed path — real sessions on real OPFS via a dev-server import of `db/composition-root` (a focus session attached to a task: started · paused · completed with L2's handlers; a generic `work` session) + the focus store driven through its real API | gate | ❌ | fe-calendar `PLAN-S7-entity-close.md:44` (G18 precedent: seed through the live services) · ELC-7 (process.md:41) |
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
- **Touches outside `services/sessions`:** `services/tasks/service.ts` (L4) · `services/routines/service.ts` (L15, L17) ·
  `services/journals/types.ts` (IR-S12 moves `ProviderUnavailable` to a shared home) · `apps/web/src/db/composition-root.ts`
  (L2: `registerTasksTimer` is async and persists a `work` type row on first boot → the root's build awaits it) —
  each with its context's §XXIX currency.

## 4. IMPLICIT RULES

- **IR-S1 · One firing path.** Focus completion = `completeFocus(timerId)` finalizing the run AND delegating the spine
  close to `transition(sessionId,'complete')` — never a second firing loop (IR-1, sessions current-BR:101).
- **IR-S2 · Cancel is not completion.** `cancelFocus` → spine `in_progress→skipped` (new focus-def transition, event
  `skip`); no effects; the interruption stays on the focus row (PD-6). Adding the transition leaves the pinned effects
  set unchanged; `registry.test.ts` is updated for the transition only (S3-focus-runtime.md:16 "def NOT edited" was an
  M1.1 pin, superseded here by L3's doc mandate — record as a §XXVIII note at the PLAN).
- **IR-S3 · `attach_pomodoro` = the realm's own binding effect.** TAS-17 (`backend-intent/parts/tasks.md:27`) "binds a
  pomodoro focus run … to the task" + XCU-29; the realm row (contract.md:57) is the focus runtime re-pointed at
  `session_id` — the binding of run → session is the `focus_sessions.session_id` FK, and run → subject is the session's
  attachment. Since targets come FROM attachments (`lifecycle.ts:67`), at fire time the binding already exists: the
  handler validates it in-tx (A.3, ADR-004:93-94 — the attachment row exists for `targetRef`; a missing one = typed
  rejection) and writes nothing else; its ledger row IS the record ("Attached to <task>" on the EC-4 rail). It never
  calls `sessions.attach` (own tx, `repository.ts:350-351`). Self-target fallback (no attachments) → canTouch rejects
  (`attach_pomodoro` needs a subject) → `PermissionDenied`, completion continues.
- **IR-S4 · Failure semantics are the contract's typed errors.** Per effect × target, in order:
  (1) **canTouch(type, effect, target)** (contract.md:30) — today only structural; completed here with the catalogue's
  target typing (`log_time(task|project)`, ADR-004:61; `attach_pomodoro` needs an attachment) → denied =
  **`PermissionDenied(type, effect, target)`: rejected, logged, completion continues** (contract.md:64);
  (2) **target vanished** (soft-deleted subject) → **no-op loudly, logged; not a failure, not retried** (sessions
  BR:79-80); (3) **no handler registered** → `NoEffectHandler`, fail-loud, nothing written (ADR-004:91-92 "fails
  closed") — a wiring defect, so the transition aborts before commit; (4) **handler throws** (A.3 validation or a write
  error) → that effect's tx rolls back (ledger + write) → **`EffectFailed(effect, target)`** (pomodoro contract:59),
  logged, the remaining effects still fire and the status still commits (pomodoro BR:78-79 "completion still records").
  `TransitionResult` gains `denied[]` + `failed[]` of those typed errors (additive).
  **"Flagged / retried"** without new storage (PD-11 derived-on-read): a session's UNAPPLIED effects =
  declared (`def.effects × canTouch-allowed targets`) minus ledger rows — derived by the L7 read and shown on the EC-4
  rail as the session's typed **error** terminal state (sessions BR:84-85 "error (failed effect, typed)"). Retry =
  `replayCompletionEffects(sessionId)` re-running the fire step for a COMPLETED session (B.2: the ledger dedupes what
  applied; a failed effect left no row, so it re-applies) — a service method; no UI retry affordance exists in any EC
  (none built here). Crash-replay (B.4) is unchanged: fire-first/commit-last stays.
  Currency: BR-10 (current-BR:44-45 "self-heals on replay") gains the handled-failure case.
- **IR-S5 · `log_time` from a focus run.** The payload is the run's REAL focus time (PD-5, pomodoro BR:32-34; BR-22):
  `{ started_at, ended_at: now, duration_seconds: focus_sessions.duration_seconds }` supplied by the focus runtime —
  `transition()` takes an optional per-event payload from its caller (`completeFocus`), because the spine's `ended_at`
  is only stamped at the commit, AFTER firing (`lifecycle.ts:112-131`). The Tasks handler logs `duration_seconds`
  (not `ended − started`, which counts pauses) and, per A.3, **throws** on an invalid payload or binding instead of
  returning (a bare return leaves a ledger row — `effects/service.ts:58-68`). Target typing is canTouch's job (IR-S4):
  a `routine_step` target never reaches the handler. A `project` target is catalogue-legal (`log_time(task|project)`)
  but no Projects time handler exists and the one-handler-per-type slot is Tasks' (`effects/registry.ts:14`): the
  Tasks handler rejects a non-task binding → `EffectFailed`, logged — the Projects time API is MOD-projects' (edge).
- **IR-S16 · Event identity follows the effect class.** ADR-004 B.1 (:99): the id derives from "the semantic event's
  stable identity". KEYED effects (habit occurrence, metric) are per occurrence → `(target ‖ utcDate ‖ type)` (as built).
  ADDITIVE effects (`log_time`, `award_xp`; ADR-004:83 — the id is "its only convergence key") are per RUN →
  `(session.id ‖ target ‖ type)`: a second focus run on the same task the same day logs its own time (TAS-17 "feeds the
  SAME ledger"; PD-12 one time-log per event). INTRA_REALM (`attach_pomodoro`) → per run, same as additive. The class
  map is `effects/types.ts:15-32`. Currency: sessions current-BR (BR-S3-6 keying) + effects current-BR.
- **IR-S17 · Close ordering + soft delete.** `transition()` treats a soft-deleted spine as missing (pomodoro BR:63-64
  "no-ops its pending effects loudly", never resurrects) → `completeFocus`/`cancelFocus` on a run whose spine is
  deleted finalize the run only and log the no-op. Order: the spine transition runs FIRST (fire + commit), then the run
  row is finalized — a `NoEffectHandler` abort leaves both untouched (no split); only a raw DB failure between the two
  writes can split, and IR-S7's terminal-run exclusion covers that reader-side. `restoreSession` restores `deleted_at`
  only — status is unchanged (`service.ts:395-400`); a restored completed/skipped spine stays terminal.
- **IR-S6 · HUD port ids.** The service's pause takes the `focus_sessions.id` (`service.ts:151`; HUD interpretation:30);
  the HUD emits the spine id (`session-hud.tsx:205`). The binding resolves it: pause = `getSession(id).extension.id →
  pauseFocus` (`service.ts:151`); resume = `startFocus({sessionId})` (resumes a paused run by spine id,
  `service.ts:457-466`). The `HudSessionsPort` signature is unchanged (findings.md:29-30).
- **IR-S7 · Active = live spine `in_progress`, minus dead focus runs.** `findActiveSession` returns the most recent
  (`started_at ?? created_at`) non-deleted `in_progress` session of any sub-type, EXCLUDING focus spines whose run is
  terminal (`focus_sessions.status ∈ completed|cancelled` — legacy rows from before L3). Concurrency is allowed (no
  single-active invariant on disk; only one open session per task, BR-TK-S4-2) — the HUD shows the most recent.
- **IR-S8 · HUD title + kind.** `title` = the instance-level attached subject's title (flow-session
  interpretation.md:189-191; the `?sample` forms use entity titles, use-active-session.ts:83,103) resolved via the
  owning registered service; fallback `humanizeSubType` (flow-source.ts:63-67). `kindLabel` = humanized `sub_type`.
- **IR-S9 · HUD timing without the store.** Countdown is NOT reconstructable from persistence (no interval start
  column; HUD seam-contract:64-67; findings.md:21-26 forbids adding persistence) → with no client clock the HUD serves
  `elapsed`. For a focus row, elapsed = PD-5 real focus time (`now − started_at − total_pause_seconds`), and a `paused`
  row is FROZEN at `paused_at` (EC-4 + EC-3b honest time). This is a HUD **state-derivation change**, not just a field:
  today paused derives only from `countdown.pausedAt` (`session-hud/types.ts:39`; `session-hud.tsx:122` elapsed →
  'running'). Required: `elapsed` gains `pausedAt?`; paused = `timing.pausedAt != null` for BOTH forms; eyebrow/ink/
  affordance follow it (`session-hud.tsx:43,155,200-205`); `canPause` = a focus run backs the session (unchanged
  meaning) and the control flips Pause⇄Resume by the derived state — so Pause is never offered on a paused row (which
  would throw `InvalidFocusTransition`, BR-21). It changes `HudTiming` + the pill's derivation → a §XXVIII deviation from
  the HUD seam's "zero-signature" claim, recorded at the PLAN.
- **IR-S10 · Focus store: built HERE, verified live HERE.** Authority: the HUD unit's own homing ("ships with the first
  live timer DRIVER … not with MOD-sessions", findings.md:16-20; seam-contract:62-65) named no unit — the census marked it
  **ORPHAN** (census b:243) and process.md:84-87 makes a stub homed to an unnamed/phantom home "not Done"; the approved
  debt-plan rev 3 (g3-order.md:3; debt-plan:25 "fe-session-hud 3 legs") + coverage-report:163 re-homed it HERE. The later
  approved re-homing supersedes the orphan homing (the golive-replan exists to re-home exactly these). The store holds the
  ephemeral interval truth (`endAt`, `phase`, `durationSeconds`, `pausedAt?`) keyed by spine id, with a write API the
  driver will call. ELC-7 forbids `?sample` as the live leg (process.md:41,172), so the countdown ECs (EC-3, 3c, 3d) are
  verified live HERE by driving the REAL store API from the gate harness over a REAL running focus session (L19) — the
  G18 precedent (a harness stands in for an absent writer, real services + real OPFS). fe-sessions' timer driver becomes
  the store's production writer and its ENTITY CLOSE re-verifies them (ELC-9).
- **IR-S11 · Applied-effects read re-derives the engine's ids.** Extract the event-id builder from `lifecycle.ts:68-81`
  into one shared function; the read computes the ids for `def.effects × resolveTargets(session)` (or the
  self-target fallback) and selects `applied_effects` by id, ordered `applied_at` ASC (EC-4 "chronological").
  `detail` = the resolved target title (+ applied time). Projection effects never appear (no row, by design,
  ADR-004:84); the device-local ledger is moot in M1 (no sync, ADR-017). With IR-S16 the additive/intra-realm ids are
  per run; keyed ones stay per occurrence (two sessions on one target/day share that row — both show it). Limit:
  ids re-derive from the CURRENT attachments — a target detached after completion drops off the rail (detach is legal;
  L15 removes routines' post-completion detach). Recorded, not mitigated.
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
2. IR-S9 — a §XXVIII deviation from the HUD seam's zero-signature claim (state derivation changes); recorded for the PLAN.
3. IR-S2 — the focus def gains a transition (`registry.test.ts` pin) — §XXVIII note at the PLAN (S3-focus-runtime.md:16).

## 6. Inherited EC set — leg → where verified (ELC-9 is fe-sessions')

| EC | Exercised by | Verified here (live leg, ELC-7) | Re-verified at fe-sessions close |
|---|---|---|---|
| HUD EC-1, EC-5, EC-6, EC-8, EC-9, EC-10 | L12 | ✅ live (real OPFS, L19 seed) | ✅ |
| HUD EC-2 (idle · running · paused) | L11/L12 | running + paused via elapsed (IR-S9); idle stays hidden (Envision answer 1) | ✅ incl. idle once the start flow ships |
| HUD EC-3, EC-3c, EC-3d (countdown forms) | L11 | ✅ live — real store API driven by the gate harness over a real running focus session (IR-S10, L19) | ✅ live (fe-sessions timer driver) |
| HUD EC-3b, EC-4 (honest elapsed / paused) | L12 + IR-S9 | ✅ live | ✅ |
| HUD EC-7 (honest data discipline) | L12 | ✅ (live read replaces the stub; `?sample` DEV-only) | ✅ |
| Flow EC-1, EC-3 (multi-stage) | — | single-stage only (O7, driving modules) | per driving module |
| Flow EC-2 (attach / mark-done / proof) | L14 | mark-done ✅ live; attach when a `deliverable_note` target exists; **proof + target-less attach = recorded DIVERGENCE pending the fe-sessions close** (§2.5 rule 3; IR-S14) | ✅ with the borrowed capture flow |
| Flow EC-4 (effect rail) | L7/L13 | ✅ live (completed session with effects) | ✅ |
| Flow EC-5…9, EC-11 | L13 | ✅ live | ✅ |
| Flow EC-10 (advance feel) | L14 | mark-done feel ✅ live | ✅ |

## 7. Sources
Aspect docs `docs/features/sessions-and-scheduling/*` + `docs/features/pomodoro/*` · ADR-004, ADR-012, ADR-017, ADR-020 ·
`docs/core/architecture/{cross-module-integration,state-conventions}.md` · `backend-intent/parts/{tasks,xcut-sessions,
sessions-and-scheduling}.md` · `docs/specs/foundation/{fe-session-hud,fe-session-runtime,fe-codec-flow-session,
fe-calendar}/delivery/*` · `golive-replan/{process,debt-plan,coverage-report}.md` + census · `.claude/docs/decisions.md` ·
built code cited inline.
