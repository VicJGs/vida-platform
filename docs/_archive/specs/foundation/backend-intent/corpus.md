# Backend Intent Corpus — P1 (assembled)

> **Phase:** P1 of the backend-replan campaign (`docs/roadmap/backend-consolidation-plan.md`, ADR-021).
> **Deliverable:** the unified backend service intent corpus that P2 (schema reconcile) and P3
> (decomposition) consume. Assembled from the 33 per-module reader outputs in
> `docs/specs/foundation/backend-intent/parts/*.md`. Structure per `PLAN-p1-intake.md` §5.
> **Assembled:** 2026-09-13. **Status:** DRAFT — awaiting the corpus gate (§7.2).

## Header — totals & completeness assertions

```json
{ "readers": 34, "items": 1194, "deferredFlags": 608, "liveIntent": 1045, "crossCuttingConcepts": 368, "unknowns": 154 }
```

**Completeness assertions (PLAN §8):**

- [x] **Roster coverage** — every module in the roster + every dissolved context (§2 table) has Part A
      coverage; notes intent restored from `main` HEAD (see `parts/notes-and-pages.md`); **gamification
      recovered** (its reader had failed) and now covered (`parts/gamification.md`, 26 items). 34 reader
      files, one per module/cross-cutting-context.
- [x] **Part B** lists every cross-cutting service candidate with its contributing modules (refined at
      assembly per §4c — see Part B and the defect log below).
- [x] **Part C (§4a)** — every deferred-intent flag is homed to a corpus item; **0 orphan flags**
      (mechanically verified at assembly, see Part C verdict).
- [x] **Part C2 (§4b)** — every `BR-`/rule id + derivation verb maps to a Part A item (per-part local
      flag index; **0 unaccounted**).
- [x] **§4c dedup check passes** — after the assembly refinement (3 health cross-pillar merges + 1
      contributor-set fix), no ≥2-module concept is missing from Part B. See defect log.
- [x] **Part D** — every UNKNOWN has a named resolution owner + resolve-by phase; **0 UNKNOWN enters P3
      unhomed**. 154 UNKNOWNs, all homed to a Part A item or a resolve-by phase (reconciled: the prior header
      claimed 147, but the real rendered per-part sum was 143 — learning-education's 5 were never rendered
      as a Part D section, an off-by-four in the prior count; this fix adds learning-education (5) +
      gamification (6) → **34 sections, 154 UNKNOWNs**).
- [x] 0 un-cited claims; every Part A item is FACT/INTERP/UNKNOWN-labeled + service/UI-classified
      (enforced in each `parts/*.md`).
- [ ] Corpus gate (§7.2) — pending independent adversarial critic + Victor glance.

---

## Part A — Per-module service intent (table of contents)

Per PLAN §5, Part A is one table per module. To keep the corpus navigable and single-source, the full
Part A tables live in the per-reader files and are **referenced** here, not inlined. Each linked file
carries the canonical schema (`id · description · source(file:line) · FACT/INTERP/UNKNOWN · service|UI ·
cross-cutting? · candidate home`) plus its own Local flag index (§4a/§4b) and UNKNOWNs.

**Item count = Part A rows (before the Local flag index).** Reader header total = **1194** (1168 across
the original 33 readers + 26 for the recovered gamification reader); assembly measurement = 1201 across
the 34 files (the +7 delta is a handful of continuation/note rows counted by the mechanical sweep — the
reader-declared 1194 is authoritative for the corpus header).

### Module modules (22)

| #   | Module                                       | Part A file                                                          | items |
| --- | -------------------------------------------- | -------------------------------------------------------------------- | ----- |
| 1   | notes-and-pages                              | [parts/notes-and-pages.md](parts/notes-and-pages.md)                 | 54    |
| 2   | preferences                                  | [parts/preferences.md](parts/preferences.md)                         | 31    |
| 3   | sessions-and-scheduling                      | [parts/sessions-and-scheduling.md](parts/sessions-and-scheduling.md) | 38    |
| 4   | tasks                                        | [parts/tasks.md](parts/tasks.md)                                     | 38    |
| 5   | projects                                     | [parts/projects.md](parts/projects.md)                               | 47    |
| 6   | habits                                       | [parts/habits.md](parts/habits.md)                                   | 28    |
| 7   | routines                                     | [parts/routines.md](parts/routines.md)                               | 33    |
| 8   | purposes-and-goals                           | [parts/purposes-and-goals.md](parts/purposes-and-goals.md)           | 35    |
| 9   | finance (+fiscal-legal)                      | [parts/finance.md](parts/finance.md)                                 | 57    |
| 10  | skills                                       | [parts/skills.md](parts/skills.md)                                   | 42    |
| 11  | knowledge (+flashcards)                      | [parts/knowledge.md](parts/knowledge.md)                             | 58    |
| 12  | books                                        | [parts/books.md](parts/books.md)                                     | 48    |
| 13  | learning-education                           | [parts/learning-education.md](parts/learning-education.md)           | 81    |
| 14  | relationships                                | [parts/relationships.md](parts/relationships.md)                     | 59    |
| 15  | check-ins                                    | [parts/check-ins.md](parts/check-ins.md)                             | 31    |
| 16  | health-core                                  | [parts/health-core.md](parts/health-core.md)                         | 50    |
| 17  | health-nutrition                             | [parts/health-nutrition.md](parts/health-nutrition.md)               | 37    |
| 18  | health-training                              | [parts/health-training.md](parts/health-training.md)                 | 25    |
| 19  | journals                                     | [parts/journals.md](parts/journals.md)                               | 32    |
| 20  | notifications                                | [parts/notifications.md](parts/notifications.md)                     | 31    |
| 21  | pomodoro (→sessions)                         | [parts/pomodoro.md](parts/pomodoro.md)                               | 26    |
| 22  | gamification ("the System")                  | [parts/gamification.md](parts/gamification.md)                       | 26    |
| —   | languages (dissolved → Spaces; live doc set) | [parts/languages.md](parts/languages.md)                             | 30    |

### Cross-cutting contexts (12)

| #   | Context (ADR/substrate)                                                       | Part A file                                                                    | items |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----- |
| X1  | sessions / effect-rail (ADR-004)                                              | [parts/xcut-sessions.md](parts/xcut-sessions.md)                               | 29    |
| X2  | review engine (ADR-005)                                                       | [parts/xcut-review.md](parts/xcut-review.md)                                   | 20    |
| X3  | spaces / tags / entity-links (ADR-006)                                        | [parts/xcut-spaces.md](parts/xcut-spaces.md)                                   | 34    |
| X4  | views (ADR-007)                                                               | [parts/xcut-views.md](parts/xcut-views.md)                                     | 22    |
| X5  | capability registry (ADR-008/010)                                             | [parts/xcut-capability.md](parts/xcut-capability.md)                           | 26    |
| X6  | templates / presets (ADR-009)                                                 | [parts/xcut-templates.md](parts/xcut-templates.md)                             | 13    |
| X7  | measurement (ADR-011)                                                         | [parts/xcut-measurement.md](parts/xcut-measurement.md)                         | 20    |
| X8  | economy (ADR-012)                                                             | [parts/xcut-economy.md](parts/xcut-economy.md)                                 | 20    |
| X9  | notifications delivery (ADR-013)                                              | [parts/xcut-notifications.md](parts/xcut-notifications.md)                     | 18    |
| X10 | ingestion + AI (ADR-014/015)                                                  | [parts/xcut-ingestion-ai.md](parts/xcut-ingestion-ai.md)                       | 34    |
| X11 | backlinks / search-FTS5 / export / neural-graph                               | [parts/xcut-backlinks-search-export.md](parts/xcut-backlinks-search-export.md) | 27    |
| —   | (measurement/economy/spaces/views/capability substrate docs feed X3–X8 above) | —                                                                              | —     |

---

## Part B — Cross-cutting services register

The de-duplicated register of shared services (C4). Every concept shared by ≥2 modules or that is an
aggregation/engine concern is one row with N contributors. The register below is the reader-supplied
candidate list **refined at assembly** per §4c (see the defect log at the end of Part B for the merges
and contributor-set fixes applied).

Grouped by owning substrate/domain for navigability. `Contributors` names the modules whose Part A rows
feed the concept; `Sources` cites the strongest per-contributor line(s).

### B.1 Foundation substrates (ride, never re-implement)

| Concept                                            | Description                                                                                                                                                       | Contributors                                                                                                                                  | Key sources                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Sync engine (foundation, LWW)**                  | Structured columns reconcile LWW on write-local-first (no CRDT); completion/config/entity blobs merge by natural key. Every syncable module rides it.             | habits, routines, purposes, tasks, finance, preferences, check-ins, books, skills, relationships, learning-education, journals, notes (+ all) | habits BR:48-49 HB-12; routines RT-18; preferences PR-9; finance FN-12; tasks TAS-35; notes NP-4 (LWW leg) |
| **Field-level [E] encryption substrate (M3/DB-5)** | `[E]` fields encrypted client-side (ZK-1); M1.0 = repository pass-through over the empty active set, wiring HOMED to M3/DB-5. All `[E]`-carrying modules ride it. | habits, routines, purposes, finance, relationships, check-ins, skills, health-core, notifications, learning-education, notes (+ all)          | habits HB-1; routines RT-1; purposes PG-1; finance FN-1; relationships RL-1; notes NP-3                    |
| **CRDT (Yjs) sync split for editor content**       | `pages.content` is Yjs-CRDT-synced ProseMirror JSON (conflict-free offline merge); all other columns sync via LWW. Notes upholds; sync engine applies the split.  | notes-and-pages, sync engine                                                                                                                  | notes NP-4 (structure-data.md:21,37; NOT-37)                                                               |
| **R2 attachment / blob pipeline (ADR-003)**        | Large encrypted-blob storage over the inline threshold, typed AttachmentSyncError, ciphertext-only.                                                               | projects, books, learning-education, languages, health, notes                                                                                 | projects PRO-25; books BOO-09/25/44; learning-education LEA-43/45; languages LAN-15                        |

### B.2 Effect rail & sessions (ADR-004)

| Concept                                                                           | Description                                                                                                                                                                                                                                                                   | Contributors                                                                                                                           | Key sources                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Effect-firing rail (applyEffect · R1 exactly-once · R2 guarded write)**         | Session/producer events fire catalogue effects via the receiver's named write API, stamped with deterministic `effect_event_id` + UNIQUE + `applied_effects` dedup ledger. AR-7 substrate; firing DEFERRED.                                                                   | sessions(owner), tasks, habits, projects, purposes, gamification, check-ins, pomodoro, health, knowledge, notes, calendar, measurement | xcut-sessions effects service.ts:29-73; habits BR:31-41; tasks BR:13-14; pomodoro PD-12 |
| **Session-effect catalogue (EFFECT_TYPE)**                                        | Fixed S4 catalogue (8 base + ADR-012 amendments → 12): complete_habit_occurrence, log_time, emit_measurement_signal, contribute_purpose_metric, award_xp/grant_currency, surface_journal, surface_calendar, attach_pomodoro, move_money, surface_notification, lock_currency. | sessions(owner), all effect-emitting modules                                                                                           | xcut-sessions contract.md:23; tasks TAS-16/17/19; economy XCU-06                        |
| **session-registry / createSession (SessionTypeDef)**                             | The sub-type registry every session-owning module registers through; validates the 4-dim Integration Contract + capability envelope + sub_type uniqueness.                                                                                                                    | sessions(owner), tasks, books, education, health, learning, language, pomodoro, routines, skills, purposes(review), knowledge(review)  | xcut-sessions registry.ts:44-131; routines ROU-07; skills SKI-13/14; books BOO-23/24    |
| **session-supertype CRUD + base/extension dual-write & sync-consistency**         | Thin base `sessions` spine + 1:1 domain-owned extension tables; atomic dual-enqueue; extension-applies-only-if-base-present.                                                                                                                                                  | sessions(owner), books, education, health, tasks, learning, language, flashcards, sync                                                 | xcut-sessions ADR-004 §3.1; SES-36 structure-data.md:36-40                              |
| **session lifecycle state machine + hooks**                                       | scheduled/planned→in_progress→completed/skipped/missed/rescheduled with per-type transitions + hooks (review→SM-2, class→attendance, workout→volume). Engine DEFERRED (AR-7).                                                                                                 | sessions, review, education, health                                                                                                    | xcut-sessions ADR-004 §3.2.3                                                            |
| **Journal/Calendar projection read-provider**                                     | surface_journal/surface_calendar write no row; Journal + Global-Calendar + analytics read the base sessions spine at render.                                                                                                                                                  | journals, calendar, analytics/measurement                                                                                              | xcut-sessions ADR-004 §3.2.5 L84                                                        |
| **cross-device convergence (deterministic effect_event_id UNIQUE)**               | Keyed/additive effect output rows carry a UNIQUE deterministic `effect_event_id` so independent device applications collide+converge on sync (merge owned by ADR-003).                                                                                                        | effect rail, every effect target, sync                                                                                                 | xcut-sessions ADR-004 §3.2.5-B L108-114                                                 |
| **Pomodoro / focus runtime (over Sessions)**                                      | startFocus/pause/resume/complete/cancel/nextInterval + interruption tracking; the `focus` sub-type runtime, keyed by session_id.                                                                                                                                              | pomodoro, sessions                                                                                                                     | pomodoro contract.md:18-22 (= SES-29); m1.1-delivery-plan:243                           |
| **Focus Mode composition resolver (renderFocusMode)**                             | Resolves a session's sub_type → declared tool-set + break-guidance (workout→Health, reading→Books, work→Tasks, eating→Nutrition). Service half; UI deferred P6.                                                                                                               | pomodoro, sessions, health, books, tasks, nutrition                                                                                    | pomodoro contract.md:42-46                                                              |
| **session_templates / focus presets CRUD**                                        | Named focus/session presets = `focus`-sub-type Session presets owned by Sessions (reuse session_templates/registry), not a Pomodoro store.                                                                                                                                    | pomodoro, sessions                                                                                                                     | pomodoro BR:24-25 (= SES-28)                                                            |
| **task_time_logs reconciliation (log_time / work_session)**                       | Tasks `task_time_logs` reconciled into `work_session` (replace-or-wrap — build decision), driven by the log_time effect; the ONE time ledger.                                                                                                                                 | sessions, tasks, projects, pomodoro                                                                                                    | xcut-sessions SES-38; tasks; pomodoro PD-9                                              |
| **Session analytics derivations (streaks / completion-rate / planned-vs-actual)** | Derived-on-read from the session log: completion rate, avg focus, planned-vs-actual, per-module time, streaks. **§4c central-dedup note:** shares the streak/rate derivation family with Habits + Finance (see B.7 "streak/rate derivation family").                          | sessions, pomodoro, habits, finance                                                                                                    | xcut-sessions SES-31 BR:67-69; pomodoro PD-11                                           |
| **surface_journal effect + /pomodoro widget-lens**                                | Sessions surface into the daily Journal recap; the Notes /pomodoro block is a widget-lens onto focus sessions.                                                                                                                                                                | sessions, notes/journals, pomodoro                                                                                                     | xcut-sessions SES-37; notes NOT-36; pomodoro POM-17                                     |
| **Effect permission-bounding (SS-6 / canTouch)**                                  | Every effect scoped to its session's attachments; sensitive-module effects need opt-in consent; violation = logged PermissionDenied.                                                                                                                                          | pomodoro, sessions, capability                                                                                                         | pomodoro BR:54-57,80; xcut-capability XCU-CAP-15                                        |

### B.3 Review engine (ADR-005, Knowledge-owned)

| Concept                                                                                                                    | Description                                                                                                                                                                                                                                    | Contributors                                                                | Key sources                                                |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **review-engine (methods registry / bindings / curves / review-event log / dueIn provider / mastery derivation + rollup)** | The generic review engine; SM-2 is one preset. Consumed by flashcards + future study methods + Education measurement + Skills/Languages/Finance/Health via compound sets.                                                                      | knowledge(owner), flashcards, skills, languages, books, education, sessions | knowledge contract.md:64-65 KN-8/9; xcut-review XCU-01..10 |
| **register study-method capability (kind=study_method)**                                                                   | A pluggable study-method registers as `kind=study_method` in the ONE ADR-008 registry, not a parallel store.                                                                                                                                   | knowledge, flashcards, future methods, capability registry                  | xcut-review XCU-01; xcut-capability XCU-CAP-25             |
| **method+curve binding + realm-default resolution**                                                                        | Bind method+curve to a polymorphic target; resolve default curve/method from the kind's learning_realm.                                                                                                                                        | knowledge, flashcards                                                       | xcut-review XCU-02                                         |
| **compute next-review schedule (SM-2 under bound curve)**                                                                  | easiness/repetition/interval/next_review_date from a 0–5 quality signal under the bound curve; SM-2 swappable per binding.                                                                                                                     | knowledge, flashcards, future methods                                       | xcut-review XCU-04                                         |
| **log review_event + derive/roll-up mastery**                                                                              | Generic review_event log; derive leaf mastery from active methods; roll up kind→Topic→Unit→Subject spine.                                                                                                                                      | knowledge, flashcards, education                                            | xcut-review XCU-05/06/07                                   |
| **Knowledge mastery → Education measurement source (KN-10 3-signal)**                                                      | Subject mastery compounded from object mastery + assessment results + pace-vs-syllabus; Knowledge exposes via R7, Education owns Program rollup.                                                                                               | knowledge, education                                                        | xcut-review XCU-08; knowledge KN-10                        |
| **run review_session (Session sub-type) + gather/unbound/curve-change/emit-only invariants**                               | Drill/test runs as an ADR-004 review_session (SM-2 hook); gather content units cross-source; unbound-card-not-scheduled; curve-change future-only + immutable history; emit-only-signal fail-loud; retirement of per-method scheduling tables. | knowledge, flashcards, sessions, books, notes                               | xcut-review XCU-10/12/14/15/19/20                          |

### B.4 Spaces / tags / entity-links / views / capability / templates (ADR-006/007/008/009/010)

| Concept                                                                                           | Description                                                                                                                                                                                                                                                  | Contributors                                                                                                                                         | Key sources                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **TaggableTypeRegistry (open entity_type registry)**                                              | The ONE open registry of taggable/linkable `entity_type` values governing both entity_tags and entity_links; every module registers its types (no schema edit); BR-2 → UnknownEntityType.                                                                    | spaces(owner), notes, tasks, habits, routines, skills, health, finance, books, relationships, learning, knowledge, all                               | xcut-spaces XCU-SP-01/02; notes NP-6                                         |
| **Universal entity_tags service (tagEntity/untagEntity)**                                         | Single cross-module tagging primitive over `entity_tags` (nestable parent_tag_id); idempotent junction; no per-module tag table.                                                                                                                             | spaces(owner), notes, tasks, habits, routines, finance, skills, books, relationships, health, knowledge, all taggable                                | xcut-spaces XCU-SP-03/05/06; notes; finance FIN-35                           |
| **Entity-links service (createLink/removeLink) + resolve**                                        | Typed-reference primitive over `entity_links` (distinct from tags); idempotent junction; read by AR-8 backlink resolver + neural graph. Cross-domain bindings retire per-module `resource_type` CHECKs.                                                      | spaces(owner=write), notes(facade), knowledge, books, skills, languages, finance, health, relationships, learning, check-ins                         | xcut-spaces XCU-SP-07/08; notes NOT-22/23; knowledge KN-6                    |
| **Backlink resolver (read/resolve engine over entity_links)**                                     | getBacklinksTo/getLinksFrom/resolveLink + BL-1..6 invariants (read-only, soft-delete-aware, [E] pass-through). BUILT AR-8.                                                                                                                                   | backlinks(owner AR-8), notes, journals, relationships, every linked module                                                                           | xcut-backlinks XCU-BSE-01..12; notes NOT-24/25/43                            |
| **Neural-graph data-prep engine**                                                                 | Force-directed nodes+edges from page_links ∪ entity_links; SPLIT service (data-prep, AR-8) + UI (Sigma.js, P6). Relationships REL-46 membership-only graph must reconcile.                                                                                   | backlinks/AR-8, spaces, notes, journals, relationships, every linked module                                                                          | xcut-backlinks XCU-BSE-23/24; notes NOT-49; spaces XCU-SP-26                 |
| **ViewEngine.resolve — cross-module fan-out / merge / group / terminal-state / graceful-degrade** | The core aggregation engine for every saved cross-module surface; fans filter to registered ReadProviders, merges, groups (ungrouped bucket), derives terminal state, degrades on missing/error provider.                                                    | views(owner), spaces, every provider-registered module (tasks, relationships/events, reminders, journals, languages, dreams/bucket-list, all Spaces) | xcut-views engine.ts:37-78; xcut-spaces XCU-SP-16/17/19/20                   |
| **ViewProviderRegistry + ReadProvider interface (V4/R7 seam)**                                    | Registry keyed by entityType; each module registers its documented list/query API; ships EMPTY, wired per-module. INT-1 — engine reads modules only through this.                                                                                            | views(owner), spaces, every read-exposing module                                                                                                     | xcut-views provider-registry.ts:18; xcut-spaces XCU-SP-18; tasks TAS-05 (R7) |
| **ViewsService CRUD + VIEW_LAYOUT + default-view seeding**                                        | The one `views` primitive (filter×layout×grouping, Space-owned-or-global) collapsing task_views + Preferences custom views; OS ships default view set per type/Space.                                                                                        | views(owner), tasks, notes, journals, calendar, languages, all view-bearing                                                                          | xcut-views service.ts:44-73; tasks TAS-28/29; notes NOT-48                   |
| **Spaces CRUD + nesting guards + enabled_blocks palette**                                         | First-class `spaces` entity (root_tag_id + palette + default_view + parent); tag-cycle/space-cycle guards; offered-capability palette junction + teeth-split (standalone restrictive, inline additive).                                                      | spaces(owner), editor, ui, notes, capability, every module                                                                                           | xcut-spaces XCU-SP-04/09/11/12/29                                            |
| **Junction idempotency + soft-delete primitives (BR-14/15)**                                      | findWhere-before-insert/revive + resolve→soft-delete discipline underlying every tier junction (entity_tags, entity_links, space_enabled_blocks).                                                                                                            | spaces, all junction writers                                                                                                                         | xcut-spaces XCU-SP-21/22                                                     |
| **CapabilityRegistry (open capability/block registry)**                                           | The one open registry every pluggable unit registers into (editor blocks, @vida/ui widgets, study-methods, module accumulators); retires the closed BlockType union. AS-BUILT AR-7.                                                                          | capability(owner), editor, ui, knowledge/study-methods, health, skills, languages, every capability author                                           | xcut-capability XCU-CAP-01..05,11; registry.ts:49-132                        |
| **Capability register-time validation invariant family (BR-2..6)**                                | Five typed-error invariants at register(): render_targets⊆RENDER_TARGET, effects⊆EFFECT_TYPE, all-four terminal-states per target, privilege-ceiling subset, id-unique impersonation guard.                                                                  | capability, every registered capability, authoring-security                                                                                          | xcut-capability XCU-CAP-06..10                                               |
| **Capability guarded-write + effect-firing discipline (CB4/R1/R2/INT-2)**                         | A capability writes only through the target's documented write API / drives a Session that owns its effects; no self-invented channel; idempotent via effect_event_id.                                                                                       | capability, effect rail, sessions, every targeted module                                                                                             | xcut-capability XCU-CAP-15                                                   |
| **Capability-authoring security envelope (declare→grant→enforce sandbox, A1..A9)**                | Untrusted-capability runtime: two-tier trust, capability_grants envelope, re-grant-on-change, five-constraint permission envelope, no-ambient-authority sandbox, hard ZK invariants, revocation, resource limits. INVARIANTS locked, RUNTIME DEFERRED → #85. | capability-registry, sessions/effects envelope, ingestion (ADR-014), AI (ADR-015), finance/health consent, sync                                      | xcut-capability XCU-CAP-16..24; ADR-010                                      |
| **block_instances standalone-placement + enabled_blocks teeth-split**                             | Standalone-placed capability = a syncable block_instances row (structure built); placement service DEFERRED → MOD-notes #31 / UI-3 #29; offered-palette vs placements split.                                                                                 | spaces, editor, ui, notes                                                                                                                            | xcut-capability XCU-CAP-12/13                                                |
| **TemplateService — templates store CRUD + save-as-template capture**                             | CRUD over the `templates` store + capture transform serializing a live Space's authored structure/config/seed into a portable JSON bundle; delegates to Spaces/Views/Capability tiers.                                                                       | templates(owner), every Space-capable module (Languages, Health, Skills, Routines, Duties, Bucket List, Tasks)                                       | xcut-templates XCU-01/02/07/08/09                                            |
| **Templates capture invariant — authored-vs-accumulated (ZK-clean)**                              | Capture authored structure/config + starter seed ONLY, never accumulated runtime data (logs/completions/live ids); capability-config carries authored params not pointers.                                                                                   | all template-capable modules, capability tier                                                                                                        | xcut-templates XCU-03/04                                                     |
| **Fork-on-instantiate engine + terminal states**                                                  | Instantiate = deep-copy the bundle into fresh UUIDs, no template_id/back-reference; no propagation; declared in-progress/success/partial-failure with missing-capability graceful degradation.                                                               | every template instantiation, capability tier (presence check), owning module services                                                               | xcut-templates XCU-05/06/10/11                                               |
| **Preset primitive (lighter sibling of Template)**                                                | preset = {saved View + per-type UI/UX + default fields/deliverables + optional starter Template} bound to a module-owned TYPE DISCRIMINATOR; composes Templates+Views+owning module; does not own the discriminator.                                         | templates, tasks (owns task-type discriminator), spaces (home), routines, skills                                                                     | xcut-templates XCU-12/13; tasks TAS-30                                       |
| **Tag/link unify⇄separate association-resolution layer (DEFERRED, SPLIT)**                        | Unified query/traversal derivation over both entity_tags+entity_links (user-owned switch); the open registry on both sides is the prerequisite. Service = derivation; UI = surface (P6).                                                                     | spaces, notes, all tagged/linked modules                                                                                                             | xcut-spaces XCU-SP-27                                                        |

### B.5 Measurement (ADR-011)

| Concept                                                                                        | Description                                                                                                                                                                                                          | Contributors                                                                                                                            | Key sources                                                    |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **measurement contract (measurement_kind + progress() per pursuable)**                         | Each pursuable declares measurement_kind + implements progress() derived-on-read; normalized [0,1]. Purpose is the rollup APEX + primary consumer, NOT owner.                                                        | tasks, habits, routines, projects, dreams, health, finance, books, knowledge, education, languages(each implements); purposes(consumes) | xcut-measurement XCU-01/08; purposes PG-3; projects PRO-14..17 |
| **normalize(per-kind → [0,1]) + qualitative-unmeasured→null**                                  | Pure per-kind normalization (quantitative/milestone/rate/qualitative → [0,1]); qualitative-no-scale → null (can't drag a purpose down).                                                                              | xcut-measurement + every qualitative pursuable + purposes rollup                                                                        | xcut-measurement XCU-01/02                                     |
| **fractal weighted rollup / measurement rollup propagation**                                   | Σ(child×w)/Σw, equal-weight default, null-child exclusion, all-null→null; runs DOWN nesting (tasks/projects/deliverables) + UP ladder (contributor→target→purpose).                                                  | projects, purposes, habits, routines, finance, learning, health, books, every measured module; purposes=apex                            | xcut-measurement XCU-03; projects PRO-10/11/12; purposes PG-5  |
| **resolveProgress (derive-by-default override)**                                               | NULL stored ⇒ derive; never a stored counter. Governs every pursuable's nullable override slot.                                                                                                                      | xcut-measurement + every pursuable                                                                                                      | xcut-measurement XCU-04; projects PRO-11                       |
| **binding_mode primitive {manual, derived-pull, event-trigger}**                               | Declares HOW a measurable is fed (distinct from provenance source{manual,auto}); lands on all measurables.                                                                                                           | purposes(owner-vocab), all measurables                                                                                                  | purposes PG-6; xcut-measurement                                |
| **measurement-source READ seam (advertise/query) + real providers**                            | Registry read contract: finance/habits/health/projects advertise net_worth/streak/body_weight/progress; derived-pull measurables + purposes query; outage→last-known+flag. Providers deferred (first-consumer-pull). | finance/habits/health/projects(providers), purposes(reader), xcut-measurement(seam)                                                     | xcut-measurement XCU-06/07; purposes PG-15; health HEA-07/08   |
| **assertAcyclic DAG guard + Binding/EntityRef contract types**                                 | Rejects semantic binding cycles at author time (MeasurementCycle); Binding/EntityRef contract vocabulary reused by economy.                                                                                          | xcut-measurement + every measurable with bindings; economy reuses                                                                       | xcut-measurement XCU-05/13                                     |
| **measurement_kind taxonomy + M4 weighted rollup (Education-forged separate-storage variant)** | Education uses the same axes as Projects but SEPARATE storage (ED-10 guard); grading-system-weighted GPA/progress rollup.                                                                                            | learning-education, projects, purposes                                                                                                  | learning-education ED-10; xcut-measurement                     |
| **event-trigger binding rides the existing effect rail (no new push engine)**                  | event-trigger write = an ADR-004 §3.2.2 effect (emit_measurement_signal/contribute_purpose_metric/complete_habit_occurrence) on the §3.2.5 rail.                                                                     | measurement × effect-rail                                                                                                               | xcut-measurement XCU-09; purposes PG-7                         |
| **laddering weight = contributions.contribution_percentage**                                   | UP-ladder rollup weight IS the Purpose-domain contributions edge; measurement engine consumes it, MOD-purposes owns table+CRUD.                                                                                      | measurement, purposes(owner)                                                                                                            | xcut-measurement XCU-12; ADR-011 §3.3                          |
| **contributions primitive (Purpose-owned, polymorphic weighted edge)**                         | First-class {goal, contributor, contribution_percentage, notes}; retires purpose_habits/routines/projects. Write-contract jointly consumed by all contributors.                                                      | purposes(owner), habits, routines, projects, tasks, dreams, finance-targets, check-ins                                                  | purposes PG-10/12/13; projects PRO-33; habits HB-8             |
| **progress NOT stored-and-propagated; deltas via Journals snapshots**                          | Anti-pattern constraint (rejected Option C): no propagation/cache table; what-changed deltas come from Journals snapshots (JR-7/8).                                                                                  | measurement × journals                                                                                                                  | xcut-measurement XCU-17                                        |

### B.6 Economy (ADR-012)

> **§4c two-leg note (economy × gamification).** ADR-012's economy is ONE concept split across two Part A
> parts: `parts/xcut-economy.md` (**substrate leg** — the BUILT `currencies`/`consequence_ledger`/handlers/
> `dispatchConsequence`, homed as XCU-01..XCU-11) and `parts/gamification.md` (**module-surface leg** — the
> System's own CRUD/derivation/invariant surfaces that ride the substrate, GM-01..GM-26). xcut-economy
> already homed XCU-12..XCU-20 to "MOD-gamification"; the GM rows below (GM-08/GM-18/GM-04/GM-13/GM-03/GM-12)
> are those MODULE-SIDE authorities. Same concept, two legs — NOT a re-scatter. The B.6 rows carry both
> legs' contributors + sources.

| Concept                                                                                         | Description                                                                                                                                                                                                                                                                         | Contributors                                                                                                                                                                | Key sources                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Currency registry (create/list) + computeBalance (derived-balance)**                          | User-definable multi-currency (XP one currency); balances derived from the append-only consequence_ledger, stored counters are caches. Level derivation (GM-03, XCU-16) is the module-surface leg over the derived total.                                                           | gamification/System(owner — GM-01/GM-02/GM-03 module surface), ~9 grant feeders, journals summary, any balance reader                                                       | xcut-economy XCU-01/02/03/16 (substrate); gamification GM-01/GM-02/GM-03 (module surface)                                          |
| **consequence_ledger append-only write**                                                        | Append-only row (currency_id·amount(±)·kind·entity·effect_event_id·at); no deleted_at, corrections are compensating rows. Generalizes retired xp_history.                                                                                                                           | gamification(owner — GM-05/GM-21 semantic layer), all grant feeders                                                                                                         | xcut-economy XCU-04 (substrate); gamification GM-05/GM-21                                                                          |
| **grant_currency / lock_currency effect handlers (award_xp = XP case) + floor clamp**           | Additive-class effect handlers writing a ledger row in the rail tx, idempotent on UNIQUE(effect_event_id,kind,target_ref). Below-floor clamp+flag (GM-08, XCU-12) is the module-enforced invariant leg.                                                                             | gamification coordinator (GM-05/GM-07/GM-08 module surface), ADR-004 rail, habits, tasks, projects, check-ins, routines, health, purposes, relationships, all grant feeders | xcut-economy XCU-05/06/12 (substrate + deferred clamp); gamification GM-05/GM-07/GM-08; habits HB-9; tasks TAS-20; check-ins CK-11 |
| **dispatchConsequence coordinator + typed effect catalogue + rail registration + rules engine** | Fans one rule-fire to rail.applyEffect per typed effect; move_money (Finance) + surface_notification (Notifications) are catalogue additions. Module-surface leg: the rules engine (GM-04, XCU-14), consequence-cycle guard (GM-18, XCU-13), achievement reconcile (GM-13, XCU-15). | gamification rules (GM-04/GM-13/GM-18 module surface), finance move_money, notifications, pre-existing module effects                                                       | xcut-economy XCU-07/08/13/14/15/17/18 (substrate + deferred); gamification GM-04/GM-13/GM-18                                       |
| **Economy store substrate (E6) + move_money Additive effect**                                   | Finance OWNS the money-store tree (groups/wrappers/lockable reward boxes) and EXECUTES move_money via R2/R1; Gamification emits & owns currencies/ledger/coordinator, enforcing single-parent worth-tree (GM-09, XCU-19).                                                           | finance(owner/executor), gamification(emitter/owner — GM-06/GM-09 module surface), system                                                                                   | finance FIN-18/23/24/26; xcut-economy XCU-17/19; gamification GM-06/GM-09                                                          |

### B.7 Read-seam / aggregation family (R7 · INT-1)

| Concept                                                                              | Description                                                                                                                                                                                                                                                                                                                | Contributors                                                                                                                                                                                               | Key sources                                                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **R7 read-seam family pattern**                                                      | The one shared cross-module read-contract (INT-1): documented list/query/measure read API, provider fan-out, never direct table read; outage→last-known+flag. Frames the pattern; concrete engines stay with their owners (summary=journals, dueIn=sessions, ViewProviderRegistry=views, measure=measurement).             | journals, sessions, views, measurement, tasks, all read-exposing                                                                                                                                           | xcut-backlinks XCU-BSE-25/26/27; capability-framework.md:66 (R7)                                      |
| **registerJournalContribution / summary(date) provider registry**                    | The provider registry every summary-producing module registers into (summary(date) + dueIn reuse); Journals aggregates, reads-only-out (never writes a module's data).                                                                                                                                                     | journals(owner), habits, tasks, sessions, finance, relationships, routines, education, reminders, check-ins, purposes, gamification, notifications, books, skills, health, projects, notes(/summary block) | journals contract.md:12-14 JR-3; notes NOT-32..35; finance FIN-32; projects PRO-32/43                 |
| **/summary aggregation ENGINE vs summary_config storage**                            | Journals owns the daily-dashboard aggregation engine; Notes owns only summary_config storage (a pages column) + the /summary block interface; Preferences owns the GLOBAL default selection.                                                                                                                               | journals(engine), notes(storage), preferences(global default)                                                                                                                                              | notes NOT-32..35; journals JOU-01/02/13; preferences PRE-31                                           |
| **dueIn(range) → DueItem[] provider/aggregator**                                     | Sessions & Scheduling OWNS dueIn(range); the shared agenda primitive. Consumers: Journals (dueIn(today)) + future Global Calendar. Providers: Books, Flashcards/Knowledge, Education, Language, Relationships, Routines, Finance(commitments), Purpose(reviews), Skills, Health, Notifications.                            | sessions(owner), journals, notifications, calendar, + 10 provider modules                                                                                                                                  | sessions SES-19/20/21; notifications NOT-08/09; relationships REL-33; purposes PG-14; routines ROU-19 |
| **emit_measurement_signal / contribute_purpose_metric (measurement rollup feeders)** | Sessions is a signal SOURCE only; Knowledge/Education/Purpose read their own events and compute their own numbers.                                                                                                                                                                                                         | sessions(source), knowledge, education, purpose                                                                                                                                                            | sessions SES-30 BR:54-57                                                                              |
| **Availability seam (Routines presets in / Calendar renders out)**                   | study_availability is Planner-owned; Routines may preset recurring windows; the Global Calendar renders the placed result.                                                                                                                                                                                                 | sessions/planner(owner), routines, calendar                                                                                                                                                                | sessions SES-27                                                                                       |
| **Global Calendar entity reconciliation (forward dep)**                              | Scheduled workouts/meals/test protocols/exams + auto-goal slots render on the Calendar via dueIn(); slots preset in Routines; visibly stubbed.                                                                                                                                                                             | health, health-training, books, relationships, finance, sessions, routines                                                                                                                                 | health HEA-12/14/42; books BOO-28; finance FIN-37                                                     |
| **streak / rate derivation family (derived-on-read)**                                | Streaks/completion-rate/planned-vs-actual computed on-read, never a synced aggregate table. **§4c central-dedup:** shared derivation family across Sessions/Pomodoro (B.2) + Habits + Finance + Languages + Relationships(interaction) — one convention, module-local implementations advertised through the measure seam. | habits, finance, sessions, pomodoro, languages, relationships, skills, health                                                                                                                              | sessions SES-31; habits HAB-15; pomodoro PD-11; languages LAN-20/24                                   |
| **cross-module review aggregation (getReviewData over Purpose/Projects/Tasks)**      | Weekly/monthly/yearly reviews aggregate progress via integration points; degrade-to-partial+flag; satisfy Purpose target_reviews.                                                                                                                                                                                          | check-ins(aggregator), purpose, projects, tasks                                                                                                                                                            | check-ins CK-6 CHE-15/25/28; projects PRO-42                                                          |

### B.8 Ingestion + AI (ADR-014 / ADR-015 / ADR-010 grant)

| Concept                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                | Contributors                                                                                       | Key sources                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **ingestion-service**                                  | Device-mediated pipeline (fetch→parse→normalize→encrypt→write), 3-layer connector classification + honest-leak disclosure, public-reference whole-set fetch + local-query + provenance/signature verify, reconcile-on-import staging + auto-match, add-only feed dedup, grant lifecycle, native adapter registry, user-managed self-service surface, stable integration-identity + normalization contract. | finance, health, books, skills, learning(ICS), projects, spaces, fiscal-legal, relationships       | xcut-ingestion-ai ADR-014 §3.1-3.8; finance FIN-28; health HEA-44; books BOO-07/08 |
| **egress-guard-service**                               | Per-target consent + union-of-consents + audit + never-auto-transmit for vault-leaving data; compositional-exfiltration rule. Shared by Health medical push + AI cloud calls.                                                                                                                                                                                                                              | health(CI-6), all external-egress, AI cloud                                                        | xcut-ingestion-ai ADR-014 §3.3; health HEA-45                                      |
| **mediator-service**                                   | OS mediation: encrypted connection_config / BYO-key custody never handed to sandbox; injects credential + makes the call; hosts askModel(scoped_slice) re-hitting the egress gate each hop.                                                                                                                                                                                                                | ingestion, AI, preferences(Layer-3 surface), capability                                            | xcut-ingestion-ai ADR-014 §3.4; preferences PRE-28                                 |
| **ai-service**                                         | Two-mode execution (on_device/cloud per-use), scope-min/redaction, honest content-egress disclosure, agent-as-mediated-actor (tool-set=envelope, fails closed), prompt-injection bounding, source=ai provenance, ai_connections config, telemetry-off runtime, AI-egress audit.                                                                                                                            | projects, health, books, skills, learning, fiscal-legal, knowledge                                 | xcut-ingestion-ai ADR-015 §3.1-3.8; health HEA-46; skills SKI-27                   |
| **grant-enforcement (ADR-010, external+AI semantics)** | external_in_ok/external_out_ok/data-scope gating, revocable/fail-closed/re-consent-on-scope-change, revocation=stop-future+keep-ingested.                                                                                                                                                                                                                                                                  | finance-core, fiscal-legal, health, books, skills, learning, relationships, all external-ingesting | xcut-ingestion-ai ADR-014 §3.4; finance FIN-29/FL-09; ADR-010 §3.5                 |
| **import_staging reconcile-on-import (X8)**            | On-device parse→encrypt→vault, refuse-not-downgrade; reconcile (auto-match date/amount tolerance, commit-on-confirm). Finance=merge-import case; ICS=add-only feed; Contacts=device import.                                                                                                                                                                                                                | finance, learning(ICS), relationships, health, skills                                              | finance FIN-28; relationships REL-07/08/09; learning-education LEA-15/24/25        |

### B.9 Notifications delivery (ADR-013)

| Concept                                                                                  | Description                                                                                                                                                                                | Contributors                                                    | Key sources                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| **surface_notification effect dispatch (single write path)**                             | The ADR-012 Additive effect on the ADR-004 §3.2.5 rail; notifications.fire is the receiving handler; idempotent per effect_event_id.                                                       | notifications(owner), gamification, every event producer        | notifications NOT-01/27; xcut-notifications         |
| **Three-tier delivery dispatch (in-app / native local-scheduled / content-free wake)**   | Choose delivery tier by (nature × platform): in-app / native OS alert / content-free wake-signal.                                                                                          | notifications(dispatcher), sessions dueIn, platform layer, sync | xcut-notifications XCU-01; notifications NOT-10     |
| **Native local-scheduler registrar + reschedule + quiet-hours baking**                   | Pre-register future dueIn reminders with the OS scheduler (Expo/Tauri), cancel+re-register on change, pre-apply Preferences quiet-hours AT REGISTRATION.                                   | notifications, sessions dueIn, preferences §5.17, platform      | xcut-notifications XCU-03/04/05; preferences PRE-23 |
| **Server wake-relay (Hono) + content-minimal push payload + closed-device generic push** | On blob-push, send content-minimal OS push to CLOSED devices by ADR-003 routing; zero [E]/type/subject; killed-iOS gets a generic banner replaced on next open.                            | server, sync/ADR-003 rooms, notifications, platform push        | xcut-notifications XCU-06/07/08/09                  |
| **Preferences gate-before-deliver (channel matrix + quiet-hours config consumer)**       | Reads user_preferences §5.17 (channels in_app/push/email no-sms · quiet hours · per-module push · notification_frequency) at every dispatch; Preferences OWNS config, Notifications reads. | preferences(config owner), notifications(mechanism)             | notifications NF-4/5; preferences PRE-21/22/23      |
| **Web service-worker + Web Push · Email generic-nudge · SMS-dropped invariant**          | Web delivers via SW+Web Push; email = fixed content-free nudge (opt-in); SMS removed (un-encryptable).                                                                                     | platform-web, server, notifications, preferences                | xcut-notifications XCU-10/11/12                     |
| **Push-token registration seam (device-registry columns)**                               | push_token + push_platform{apns,fcm,web} as COLUMNS on ADR-003's device registry via the existing /api/devices/register — no parallel table/route.                                         | sync/ADR-003 device registry, server, platform                  | xcut-notifications XCU-13                           |
| **Delivery-audit + cross-device once-only idempotency + materialize-at-fire**            | Record channel(s) fired for multi-device dedup; a due reminder fires once even if two dispatchers wake; a durable notifications row is created only at fire time.                          | notifications, sync, sessions dueIn                             | xcut-notifications XCU-14/18; notifications NF-8    |
| **Failed-delivery in-app fallback + ZK metadata-bound honesty + no-third-party opt-out** | Push/email failure → in-app + flag (loud); content-zero ≠ observer-zero (timing/token exposed); user may opt out to in-app + native local only.                                            | notifications dispatcher, platform push, server, preferences    | xcut-notifications XCU-15/16/17                     |

### B.10 Notes & Pages platform seams

| Concept                                                                                         | Description                                                                                                                                                                                                                                                             | Contributors                                                                                                                              | Key sources                                                                |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Notes & Pages polymorphic `pages` seam (NP-1 no-inline-notes)**                               | All notes/annotations for any entity live in `pages` via polymorphic entity_type+entity_id; no inline notes column. The only note home.                                                                                                                                 | notes(owner), tasks, projects, habits, routines, relationships, purposes, books, knowledge, learning, health, check-ins, all note-bearing | notes NP-1/NP-8; tasks TAS-31; projects PRO-24/34; relationships REL-49/50 |
| **Polymorphic entity-note lifecycle (ensureEntityNote + getPagesForEntity + client-side seed)** | Idempotent auto-exist/never-blank create + pure client-side seed from the parent's local fields + polymorphic reverse-lookup. Owning modules wire the eager trigger.                                                                                                    | notes(op), tasks, task-groups, projects milestones/deliverables, every entity-owning module                                               | notes NP-8 NOT-07/11/12/13                                                 |
| **Live-block templates (ADR-009) + data-driven platform blocks**                                | A template = a reusable page layout with live auto-aggregating blocks; the 12 platform blocks (/tasks,/events,/classes,/habits,/timeline,/chart,/pomodoro,/entity-link,/backlink,/class-notes,/milestone) are @vida/editor extensions each consuming a per-module read. | notes, journals, editor, every source module                                                                                              | notes NOT-51/52; identity.md:11,20                                         |
| **FTS5 full-text search engine (DB-8)**                                                         | Content-less FTS5 tables rebuilt on vault unlock (device-local, ephemeral, ZK), ranked <200ms query, SearchProvider seam + terminal states. THE engine notes NOT-50 / knowledge KNO-37 / learning LEA-70 route to.                                                      | search/DB-8(owner), notes, knowledge, learning, tasks, contacts, courses, all searchable                                                  | xcut-backlinks XCU-BSE-13..18; notes NOT-50                                |
| **Export serializers (Markdown / PDF / DOCX)**                                                  | Round-trip-lossless TipTap-JSON↔MD, PDF (@react-pdf web/desktop, expo-print mobile), DOCX + export-dialog seam. DEFERRED UI-3/@vida/editor.                                                                                                                             | editor(owner), notes, journals, any exportable page                                                                                       | xcut-backlinks XCU-BSE-19..22                                              |
| **Quote-embed editor block + getEmbeddableQuotes**                                              | @vida/editor quote-embed block; per-book>global toggle precedence; embeds reference (never copy) the stored quote.                                                                                                                                                      | books(source), notes(host), editor                                                                                                        | books BOO-21/22                                                            |
| **Factory-service DI + async-validation pattern**                                               | createXService factory returning an object literal (no `this.`, closures for intra-calls, async validators = rejections); DI wires Spaces + Backlinks + registry. Applies to all @vida/core factory services.                                                           | notes, all @vida/core factory services                                                                                                    | notes NOT-42/43; MEMORY factory-service pattern                            |

### B.11 Domain-owned providers shared across ≥2 modules

| Concept                                                                                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Contributors                                                                      | Key sources                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Medical Profile module-wide provider (getConstraints(pillar))** _(§4c-MERGED)_                 | Health-owned Medical Profile exposed as a provider: contraindications/allergies/injuries/prescriptions advisory-filter (flag-with-reason) exercise catalog, foods, plans + inform intake targets. **Merged from 3 candidate rows** (health-core provider, nutrition advisory filter, training Medical-Profile provider).                                                                                                                                                                   | health-core(owner), health-nutrition, health-training                             | health-core HEA-30/26; nutrition BR:38-41; training HTR-03/07                                                  |
| **Core health-goals composition** _(§4c-MERGED)_                                                 | Nutrition Goal phases + Training performance goals ARE Core health_goals (body-composition); pillars reference by id, own no parallel goal store; Core deriveProgress reads pillar metrics via the M5 measure seam.                                                                                                                                                                                                                                                                        | health-core(owner), health-nutrition, health-training                             | health-core HEA-16; nutrition BR:15-16; training HTR-17                                                        |
| **Core Adaptation / Reflective engine (Experiments/Responses/Profiles)** _(§4c-CONTRIBUTOR-FIX)_ | One reflective/Adaptation engine (A/B experiments + response logs → derived Profile); a prescription may spawn an Experiment. **Candidate listed contributors=[skills] only — assembly added health-core + health-nutrition** (dev-logs compose the SAME engine shared with Health).                                                                                                                                                                                                       | skills, health-core, health-nutrition (+ health-training via Core)                | skills SKI-15; health-core HEA-33; nutrition BR:17-18,38-41                                                    |
| **Training/Nutrition energy loop (burn↔intake recompute)** _(§4c-MERGED)_                        | The cross-pillar energy bridge: Training emits calories-burned → Nutrition intake target recomputes dynamically; stored target is a cache. **Merged from 3 candidate rows** (health-core energy-loop, nutrition intake-target derivation, training daily-contribution/energy-loop).                                                                                                                                                                                                        | health-core, health-nutrition, health-training                                    | health-core HEA-36; nutrition BR:12-14; training HT-11                                                         |
| **Knowledge protocol / technique reference catalog**                                             | Testing/Recovery protocols (kind=protocol) + biomarker clinical panel + exercise-technique + Physical-Role technique subjects live in Knowledge; Health references by id.                                                                                                                                                                                                                                                                                                                  | knowledge(owner), health-core, health-training, health-nutrition(ingredient kind) | health-core HEA-06/25/35; training HT-10; nutrition BR:50-52                                                   |
| **Physical Roles / Skills #2 binding**                                                           | Physical Roles bind a Skill (progression/mastery); Roles are a heavy Skills resource; role-driven medically-aware program generation.                                                                                                                                                                                                                                                                                                                                                      | health-core, health-training, skills(forward stub)                                | health-core HEA-25; training HT-8/12/13; skills SKI-35                                                         |
| **Routines exercise step → Training workout**                                                    | The Routines `exercise` step drives a Health-scheduled workout session; Training exposes startWorkout Routines invokes.                                                                                                                                                                                                                                                                                                                                                                    | routines(caller), health-training, health-core                                    | routines; training HTR-22; health-core HEA-48                                                                  |
| **Duties/Obligations fabric (recurring-commitment)**                                             | Assigned workouts/meals/exams surface as Duties/Obligations; Health is the first concrete consumer; Tasks obligation-type cycle-gen composes Sessions dueIn/recurrence.                                                                                                                                                                                                                                                                                                                    | health-core, tasks, sessions, fiscal-legal(obligations)                           | health-core HEA-43; tasks TAS-24/30; finance FL-05                                                             |
| **Finance cost provider**                                                                        | Shopping items + meal costs + commitment installments emitted as Finance cost/budget events (INTEGER cents [E]).                                                                                                                                                                                                                                                                                                                                                                           | health-nutrition, finance, fiscal-legal                                           | nutrition HEA-14/15; finance FIN-37                                                                            |
| **Books↔Education partition (book_subjects)**                                                    | book_subjects junction + Books→Education read-across (books-per-subject, pace-status vs schedule/assessments); never a cached copy, no direct table reads.                                                                                                                                                                                                                                                                                                                                 | books, learning-education                                                         | books BOO-36/37/38; learning-education LEA-73                                                                  |
| **Preferences config provider (read surface)**                                                   | getMergedPreferences/getNavPreferences feed nav shells, all UI (theme/accent/font/locale/units), Pomodoro (pomodoro\_\* + auto_start/notifications/sounds), Tasks (show_completed/default_priority/show_archived), Gamification (feature_gamification), Dashboard (dashboard_layout/default_view), Finance (recurring-mode/base-currency-FX), Books (quote-embed/conflict-rule/reader defaults), Health (units), Relationships (reminder/closeness/import defaults). Broad read-only seam. | preferences(provider), ~10 consuming modules                                      | preferences PRE-01/11/12/20/21; pomodoro PD-3/7; finance FIN-20/21/25; books BOO-22/35                         |
| **Theme provider (all-UI consumer)**                                                             | Preferences syncs theme to a Zustand themeStore on load+change for instant repaint; every UI module subscribes.                                                                                                                                                                                                                                                                                                                                                                            | preferences(provider), all UI modules                                             | preferences PRE-11/12                                                                                          |
| **E9 user_profile single-writer profile-split register**                                         | Preferences is single-writer of persona/motivation*style/active_modules/onboarding*_; siblings System (per-currency total+level), Check-ins (check_in_streak_) write their own slices; PII + focus_areas[E] stay in user_profile. No field with two writers.                                                                                                                                                                                                                               | preferences(PRE-17/18), gamification(GM-12), check-ins(CK-11), System             | preferences PRE-17/18; **gamification GM-12** (System's kept derived total+level+PII⚠ slice); check-ins CHE-14 |
| **Event→task spawn / follow-ups-are-Tasks**                                                      | contact_event / interaction follow-ups + birthday triggers become Tasks linked by contact_id (Tasks-owned); relationships-produces vs tasks-owns boundary.                                                                                                                                                                                                                                                                                                                                 | relationships, tasks                                                              | relationships REL-29/51 RL-8/9                                                                                 |
| **R7 aggregation read seam / V4 provider fan-out (Tasks aggregated view)**                       | Tasks fans across Projects/Learning/Languages/Relationships to build the aggregated view via the R7 read seam (never direct table reads); same seam the aggregated `views` ride via V4.                                                                                                                                                                                                                                                                                                    | tasks(consumer), projects/learning/relationships(providers), views(rider)         | tasks TAS-05 TK-9; rerun G-R7:62                                                                               |
| **Spaces neural-graph Block (Life Skill Tree / networks)**                                       | renderTree()/network graph provides data to the Spaces neural-graph Block; traversal is module-service, WebGL render Spaces-owned.                                                                                                                                                                                                                                                                                                                                                         | skills, relationships, notes                                                      | skills SKI-21; relationships REL-46                                                                            |

**§4c defect log (concepts in ≥2 modules' Part A that the candidate register mis-homed — fixed at assembly):**

1. **Training/Nutrition energy loop** — candidate carried it as **3 separate single-contributor rows**
   (health-core, health-nutrition, health-training). All three describe the same cross-pillar
   burn↔intake-recompute derivation. **Fixed:** merged into one B.11 row, contributors =
   [health-core, health-nutrition, health-training].
2. **Medical Profile provider** — candidate carried it as 3 rows (health-core "module-wide provider",
   health-nutrition "advisory filter", health-training "Medical-Profile providers"). Same
   getConstraints(pillar) provider consumed by both pillars. **Fixed:** merged into one B.11 row.
3. **Core health-goals composition** — nutrition and training each reference Core health_goals as
   their goal store; candidate had it only under health-nutrition. **Fixed:** promoted to one B.11
   row, contributors = [health-core, health-nutrition, health-training].
4. **Reflective/Adaptation engine** — candidate row had `contributors:["skills"]` but SKI-15 states
   the dev-log engine is "the SAME reflective/Adaptation engine shared with Health," and
   health-core/health-nutrition both own Adaptation (Experiments/Responses/Profiles). **Fixed:**
   contributor set extended to [skills, health-core, health-nutrition (+health-training via Core)].

5. **Economy × gamification two-leg fold (post-recovery)** — the gamification reader had failed at first
   assembly and its rows were dropped; xcut-economy had already homed XCU-12..XCU-20 to "MOD-gamification".
   On recovery, gamification's GM-08/GM-18/GM-04/GM-13/GM-03/GM-12 are the MODULE-SIDE authorities for
   those xcut items — the **same concept split across two parts** (economy = substrate leg,
   gamification = module-surface leg), NOT a re-scatter defect. **Fixed:** the B.6 rows (+ the B.11 E9
   row) now carry both legs' contributors + sources; no duplicate rows created. See the B.6 two-leg note.

The first four were shared concepts appearing in ≥2 modules' Part A that the pre-assembly candidate list
under-homed (scattered as per-module rows or under-attributed); the fifth is the recovery fold. No other
≥2-module concept was found missing from Part B — every "shared/engine"-tagged Part A cross-cutting
column value maps to an existing register row (verified by scanning the cross-cutting column across all
34 files, gamification included).

---

## Part C — Deferred-flag index (§4a)

Per PLAN §4a, every deferral flag maps to a corpus item. The full flag→source:line→item mappings are
authored **per module** in each `parts/*.md` under `## Local flag index → §4a` (or the flat
`## Local flag index` list where a reader did not split). This corpus consolidates them **by
reference** (they are voluminous — 608 flag→item mappings across ~725 §4a/§4b bullets) and asserts the
mechanical verdict.

| Module                        | §4a/§4b flag index location               | flag/verb bullets   |
| ----------------------------- | ----------------------------------------- | ------------------- |
| every module (22) + languages | `parts/<slug>.md` → `## Local flag index` | see per-file counts |
| every cross-cutting (12)      | `parts/xcut-*.md` → `## Local flag index` | see per-file counts |

**Header total:** `deferredFlags: 608` (sum of §4a flag→item mappings across all readers; many bullets
carry a range or multi-id mapping, so bullet count < mapping count).

**Orphan verdict (§4a — the flagship guard): `0 orphan flags`.** Mechanically verified at assembly: for
every homing item id referenced after `→` in every part's flag index, the item exists in that part's
Part A. The only apparent misses under a naïve scan were:

- `FL-1`/`FL-2`/…/`FL-15` and `FC-1`/…/`FC-9` in finance/knowledge — these are **source rule-ids**
  (fiscal-legal & flashcard `business-rules.md` ids) on the LEFT of a `→` mapping to their homing items
  (`FL-01..FL-11`, `FC-01..FC-12`), not item ids. Homed correctly.
- Zero-padding (`FL-1` ↔ item `FL-01`) and range notation (`FL-01..FL-11`, `FL-06/FL-11`) — all resolve
  to existing Part A items once normalized.

No flag maps to a non-existent item → **the §4a sweep is complete.**

---

## Part C2 — Live-intent index (§4b)

Per PLAN §4b, every `BR-`/rule id + every derive/compute/rollup/aggregate/streak/provider/snapshot verb
maps to a Part A item. These are authored **per module** in each `parts/*.md` under `## Local flag
index → §4b` (or inline in the flat list). Consolidated by reference.

| Module                        | Live-intent (§4b) location                      | derivation-verb + BR-id bullets |
| ----------------------------- | ----------------------------------------------- | ------------------------------- |
| every module (22) + languages | `parts/<slug>.md` → `## Local flag index` (§4b) | see per-file counts             |
| every cross-cutting (12)      | `parts/xcut-*.md` → `## Local flag index` (§4b) | see per-file counts             |

**Header total:** `liveIntent: 1045` (sum of §4b rule-id + derivation-verb → item mappings across all
readers).

**Unaccounted verdict (§4b): `0 unaccounted`.** Every `BR-`/`PR-`/`FN-`/`FL-`/`CK-`/`PD-`/`PG-`/`RT-`/
`HB-`/`SK-`/`KN-`/`BK-`/`RL-`/`HC-`/`HN-`/`HT-`/`ED-`/`FC-`/rule id and every derivation verb enumerated
in a reader's §4b maps to a Part A item (readers assert this locally; assembly confirmed the homing ids
resolve, same normalization as Part C). The `derive|comput|rollup|streak|propagat|recompute|provider|
snapshot` verb family and each rule id is accounted for.

---

## Part D — Open UNKNOWNs (homed)

**154 UNKNOWNs across 34 module/context sections**, each with a named resolution owner + resolve-by
phase. **0 enter P3 unhomed** — each is either homed to a Part A item that carries the intent (so the
corpus is complete even with the shape open) or homed to a named build/design-pass. Grouped by module.
`Owner` = named resolution owner; `By` = resolve-by phase (P2 = schema reconcile, P3 = decomposition,
build = per-module build phase / design-pass / ADR-016, later = post-M1 candidate ADR).

> **Count reconciliation.** The prior header claimed 147, but the real rendered per-part sum was 143
> (learning-education's 5 UNKNOWNs were never rendered as a Part D section — an off-by-four). This patch
> adds the missing **learning-education (5)** + the recovered **gamification (6)** → **34 sections, 154
> UNKNOWNs** (143 + 5 + 6).
>
> ✅ **RATIFICATION GAP — RESOLVED 2026-09-14: GG4 — XP-per-action reward model + difficulty/priority
> weighting.** Was a genuinely UNRATIFIED design gap (gamification intake's RESOLUTION confirm-list
> `intake.md:197` confirmed GG2/3/5/8/9/10/11 but **skipped GG4**). Ratified via a Victor-approved
> pre-P2 design-pass (`PLAN-gg4-reward-model.md`, `/critique`+`/preflight` gate) → **ADR-012 §3.11**:
> shipped-default `rules` (static-seed, deterministic IDs) · `weight_by` descriptor field · global
> `xp_difficulty_weighting` preference + per-rule override · achievements-bridge (D3) · `grant_currency`
> untouched · currency integration-ready (M2/ADR-014 owns the plumbing). Homes: gamification build +
> Preferences build (see the GG4 row below).

> Full per-UNKNOWN text + source:line lives in each `parts/<slug>.md → ## UNKNOWNs`. This table homes
> them (owner + phase). Rows condensed by theme where a reader listed several sub-parts of one decision.

### preferences (3)

| UNKNOWN                                                                                 | Owner                                       | By            |
| --------------------------------------------------------------------------------------- | ------------------------------------------- | ------------- |
| Per-module visibility storage shape (JSON map vs dedicated store) — homed PRE-04/PRE-19 | MOD-prefs `[F]` build                       | build (P2/P3) |
| E9 active_modules ↔ module_visibility reconciliation — homed PRE-19                     | MOD-prefs build                             | build         |
| Summary-selection global-default column/API in Preferences — homed PRE-31 (INTERP)      | Journals engine spec (jointly MOD-journals) | build         |

### sessions-and-scheduling (5)

| UNKNOWN                                                                               | Owner                                          | By       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- | -------- |
| Wire session→effect firing NOW vs defer whole rail to AR-7 (SES-11/13/14/34)          | MOD-sessions `[F]` / AR-7                      | P3       |
| task_time_logs↔work_session reconcile (replace-or-wrap, SES-38)                       | P2 schema reconcile / MOD-sessions build       | P2/build |
| applied_effects dedup ledger + effect handlers package home (SES-14)                  | Part 2 / AR-7                                  | P3       |
| Focus/Pomodoro = distinct services/pomodoro vs folded into services/sessions (SES-29) | P3 decomposition                               | P3       |
| Session analytics home — shared analytics service vs module-local (SES-31, §4c)       | Part-B central dedup (this corpus B.7) → build | P3       |

### tasks (8)

| UNKNOWN                                                                               | Owner                             | By    |
| ------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| CHECK defaults measurement_kind/binding_mode on a task                                | MOD-tasks build design-pass       | build |
| M4 sub-task rollup weight formula + per-child weight column                           | MOD-tasks build + ADR-011         | build |
| task_time_logs↔ADR-004 session-extension reconcile (TAS-18)                           | MOD-tasks/sessions cross-contract | P3    |
| 12→7 layout reconciliation                                                            | dedicated ADR-007 pass            | P3    |
| Full V1 view anatomy (filter grammar / per-layout fields / registry)                  | ADR-007 pass                      | P3    |
| Concrete Tasks preset set + per-type defaults                                         | MOD-tasks build                   | build |
| Duty-type cycle-gen cross-service contract                                            | MOD-tasks/sessions                | P3    |
| No MOD-tasks §9 bucket (M1.2 module) — scope ledger = rerun §5 (recorded, not a hole) | central assembly                  | n/a   |

### projects (5)

| UNKNOWN                                                                | Owner                        | By       |
| ---------------------------------------------------------------------- | ---------------------------- | -------- |
| Deliverable measurement-source taxonomy DDL (PRO-13..17)               | MOD-projects build + ADR-011 | build    |
| contributions contract shape (Purpose-owned)                           | MOD-purposes                 | P3/build |
| Tasks→Projects API surface (Tasks-owned)                               | MOD-tasks                    | P3       |
| Inline-vs-R2 threshold for addDocument                                 | MOD-projects build           | build    |
| Milestone-delete deliverable disposition (reparent vs cascade, PRO-08) | MOD-projects design-pass     | build    |

### habits (6)

| UNKNOWN                                                                            | Owner                              | By       |
| ---------------------------------------------------------------------------------- | ---------------------------------- | -------- |
| CHECK defaults + rate-derivation formula + goal-vs-habit target model (HAB-20)     | MOD-habits measurement design-pass | build    |
| Restored v1 field shapes G8 (success_criteria/difficulty/location/completion_time) | ADR-002 amendment                  | P2/build |
| completion→purpose-metric mapping contract (Purpose-owned, HAB-17)                 | MOD-purposes                       | P3       |
| S4 effect-firing wiring NOW-vs-later (HAB-16)                                      | MOD-habits `[F]` / AR-7            | P3       |
| habit_backfill_window_days Preferences setting shape (HAB-13)                      | MOD-prefs                          | build    |
| No MOD-habits §9 bucket (M1.2) — scope ledger = rerun §2/§5 (recorded)             | central assembly                   | n/a      |

### routines (4)

| UNKNOWN                                                                      | Owner                            | By    |
| ---------------------------------------------------------------------------- | -------------------------------- | ----- |
| No §9 bucket (M1.2) — NOW-vs-later split at build (all intent homed to ROU-) | P3 / routines build (ADR-016)    | build |
| measurement_kind/binding_mode CHECK defaults (ROU-14)                        | routines measurement design-pass | build |
| Completion-policy + step_type + step-scoping internals (ROU-04/12/18/27)     | Routines design-pass             | build |
| Two-seam wiring — derived-pull measure read vs E2 grant emission (ROU-16/21) | routines + Gamification build    | build |

### purposes-and-goals (6)

| UNKNOWN                                                                                 | Owner                                        | By    |
| --------------------------------------------------------------------------------------- | -------------------------------------------- | ----- |
| Per-kind progress() derivation formula                                                  | Purpose build (ADR-011 + ADR-002 §5.20)      | P2/P3 |
| contributions write-contract shape (7 contributor modules)                              | Purpose build; Part B forces the shared item | P2/P3 |
| measurement-source READ seam interface                                                  | Purpose + provider modules jointly (ADR-011) | build |
| event-trigger binding → INT-2 effect-rail wiring NOW-vs-later                           | Purpose `[F]` jointly with sessions/AR-7     | build |
| Generic review substrate (Knowledge/Purpose/Check-ins) shared later?                    | post-M1.1 ADR candidate                      | later |
| No MOD-purposes §9 bucket + no rerun (Wave-3 intake) — scope ledger = intake resolution | central assembly                             | n/a   |

### finance (+fiscal-legal) (6)

| UNKNOWN                                                                            | Owner                                             | By          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| External aggregator plaintext path (Open Finance Brasil/Belvo) — ZK dent           | candidate ADR "external financial data under ZK"  | later       |
| Budgeting data model (period/limits/rollover/alerts/Purpose-target) — homed FIN-38 | Finance mini-intake + design-pass + candidate ADR | later/build |
| Liability-payment tracking (tx-link vs liability_payments ledger) — FIN-39         | Commitments/liability design-pass                 | build       |
| Commitments light marker + personal lending — FIN-36                               | Commitments/budgeting design-pass                 | build       |
| fiscal-legal legal_entities ↔ Projects forward-dep (FL-03)                         | Projects (add legal-entity model)                 | P3/build    |
| fiscal-legal rule-pack provenance (signing+versioning) owed (FL-04)                | fiscal-legal build (candidate ADR)                | build       |

### skills (3)

| UNKNOWN                                                                         | Owner                             | By    |
| ------------------------------------------------------------------------------- | --------------------------------- | ----- |
| measurement_kind CHECK'd column vs registry-validated OPEN vocab in JSON (SK-4) | skills build design-pass          | P2/P3 |
| Skill Graph traversal home — skills-local vs shared graph engine                | P3 decomposition/home             | P3    |
| "Physical Roles" new cross-domain target, no module doc (forward stub)          | scope-reconciliation (outside P1) | later |

### knowledge (+flashcards) (5)

| UNKNOWN                                                                             | Owner                             | By       |
| ----------------------------------------------------------------------------------- | --------------------------------- | -------- |
| paceVsSyllabus depends on Education syllabus-as-calendar (not designed) — KNO-26    | Education measurement design-pass | P3/build |
| assessmentResults + K8 topic↔assessment depend on Education assessments (KNO-27/44) | Education build                   | P3/build |
| OS-level cross-module automation/rules surface — no owning ADR (KNO-46)             | flagged not designed              | later    |
| parent_kind_id? kind registry nests vs flat (KNO-01)                                | MOD-knowledge build               | build    |
| Review-engine ownership — knowledge-service internals vs promoted cross-cutting     | P3 decomposition                  | P3       |

### books (4)

| UNKNOWN                                                                  | Owner                 | By    |
| ------------------------------------------------------------------------ | --------------------- | ----- |
| Whole-set-vs-per-item ISBN dataset fetch (X3) — ingest mechanics only    | books build (ADR-016) | build |
| measurement_kind/binding_mode defaults for reading-plan goal (BOO-27/14) | books build + ADR-011 | build |
| Cross-format mapping algorithm (transcription + TOC-anchor, BOO-12/41)   | books build           | build |
| Daily-Journal page-photo aggregation direction (push vs pull, BOO-25)    | P3 + Journals owner   | P3    |

### learning-education (5)

| UNKNOWN                                                                                                                                                    | Owner                                                                                   | By       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| `course_type` reconciliation vs Institution/Self-taught mode level (keep as subject-level modality?) — homed LEA-64                                        | Education build (ADR-016 design-pass)                                                   | build    |
| Grading-system COMPONENT MODEL (weighted-component shape + scale representation) — homed LEA-31/32/33                                                      | Education build grading design-pass                                                     | build    |
| Measurement `measurement_kind`/`binding_mode` CHECK defaults + grade-vs-deliverable-vs-count mapping FORMULA + GPA rollup WEIGHT model — homed LEA-46/49   | Education build measurement design-pass (shared axes w/ Projects, Education-forged)     | build    |
| ICS event→subject MATCHING heuristic (by title/keyword?); unmatched stays manual — homed LEA-26                                                            | Education build (Education service)                                                     | build    |
| Knowledge `paceVsSyllabus`/`assessmentResults` consumed by Education (LEA-74) depend on Education's ⚠ INTENDED syllabus-as-calendar + assessments entities | syllabus-as-calendar design-pass (cross-module contract firmed when both entities land) | P3/build |

### relationships (4)

| UNKNOWN                                                                     | Owner                                  | By    |
| --------------------------------------------------------------------------- | -------------------------------------- | ----- |
| Relationship-health formula weights + closeness-tier thresholds (REL-22/25) | MOD-relationships `[F]`                | build |
| closeness_tier represent-vs-derive (REL-25)                                 | ADR-002 amendment                      | build |
| Device-import connector X2 layer classification (REL-09)                    | ADR-014 §3.2                           | build |
| Event→task/reminder spawn mechanism boundary (REL-29)                       | MOD-relationships/Tasks cross-contract | P3    |

### check-ins (3)

| UNKNOWN                                                             | Owner                                            | By       |
| ------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| Unified cross-module MOOD view (G6) — needs named owner + milestone | Journals/analytics vs check-ins (candidate M1.4) | later    |
| CK-6 review→Purpose/Projects/Tasks aggregation contract shape       | post-Wave-3 Purpose docs                         | P3/build |
| CK-8 reminder-fire emit contract                                    | Notifications dispatcher (M1.2)                  | build    |

### health-core (9)

| UNKNOWN                                                                         | Owner                            | By    |
| ------------------------------------------------------------------------------- | -------------------------------- | ----- |
| Goal↔metric-target dedup contract (canonical target home)                       | measurement design-pass          | build |
| Derived-metric formula catalogue (BMR/BEE/LBM/body-fat/1RM) + formula column    | health build                     | build |
| Safety-flag threshold model (overtraining/deficit/biomarker/injury)             | health build                     | build |
| CHECK defaults goal measurement_kind/binding_mode + metric-target mapping       | health build                     | build |
| N-of-1 Experiment framework generalization (candidate GENERIC primitive)        | candidate ADR                    | later |
| Curated OS Physical-Role library import + locale-variant                        | content-curation design-pass     | build |
| Medical/wearable/Google-Health per-service input + medical output egress wiring | per-service research (post-core) | later |
| 8-system functional-nutrition taxonomy (CI-3) — homes in health-nutrition       | victor:research                  | later |
| No MOD-health §9 bucket (M1.3-Depth) — scope ledger recorded                    | central assembly                 | n/a   |

### health-nutrition (4)

| UNKNOWN                                                                   | Owner                     | By    |
| ------------------------------------------------------------------------- | ------------------------- | ----- |
| HN-8 life-context — input to deriveIntakeTarget vs nutrition-local filter | health build              | build |
| meals.photo_blob [E] retention/lifecycle post-inference                   | attachment/sync substrate | build |
| ai_conversations [E] persisted chat home (likely AI-layer)                | AI-layer (ADR-015)        | build |
| performance_benefits/purpose JSON fields — free-form vs future analytics  | nutrition build           | build |

### health-training (3)

| UNKNOWN                                                                               | Owner                                    | By    |
| ------------------------------------------------------------------------------------- | ---------------------------------------- | ----- |
| Set-log sync-unit granularity (own blob vs ride parent workout_session)               | P2 schema reconcile                      | P2    |
| Periodization advancement rule set (HTR-16) — formula vs manual vs AI                 | training build                           | build |
| Burn-estimation formula ownership (HTR-18) — Training vs shared energy-loop MET table | health-core/nutrition energy-loop (B.11) | build |

### journals (4)

| UNKNOWN                                                   | Owner                                          | By    |
| --------------------------------------------------------- | ---------------------------------------------- | ----- |
| Snapshot capture timing (rollover/on-demand/on-open)      | Journals design-pass (M1.1 ships capture-once) | build |
| Reviews standalone table vs derive from journal_snapshots | Journals build                                 | build |
| Backfill freeze-vs-update rule (JR-6)                     | Journals design-pass                           | build |
| Check-ins journal-section shape (J8)                      | Check-ins module revisit                       | build |

### notifications (3)

| UNKNOWN                                                                                        | Owner                       | By    |
| ---------------------------------------------------------------------------------------------- | --------------------------- | ----- |
| Rich/actionable push + notification-history server backup (⚠ INTENDED-later)                   | ADR-013 future              | later |
| Push vendor + token columns/rotation + retry/coalescing + reschedule debounce + email provider | build-phase (ADR-002 §5.20) | build |
| Delivery-audit exact schema (3 booleans vs delivered_channels set, NOT-22)                     | MOD-notifications build     | build |

### pomodoro (4)

| UNKNOWN                                                                    | Owner                                | By    |
| -------------------------------------------------------------------------- | ------------------------------------ | ----- |
| Distinct services/pomodoro vs folds into services/sessions (POM-01..05/16) | P3 decomposition (mirrors SES-29)    | P3    |
| pomodoro_sessions folds into focus_sessions vs lean interval row (POM-26)  | build (ADR-016 amendment)            | build |
| MOD-sessions wire effect firing now vs AR-7 (POM-10..15)                   | MOD-sessions `[F]` / AR-7 (= SES-14) | P3    |
| Dedicated Focus analytics view vs feeds-others (G5)                        | P6 UI / views design-pass            | P6    |

### gamification (6)

| UNKNOWN                                                                                                                                                                                                                                                                                                                                                                                                                   | Owner                                                                                           | By                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| ✅ **GG4 — XP-per-action reward model + difficulty/priority weighting** — **RESOLVED 2026-09-14** (Victor-approved design-pass `PLAN-gg4-reward-model.md` → **ADR-012 §3.11**): shipped-default `rules` (static-seed) + `weight_by` descriptor + global `xp_difficulty_weighting` pref w/ per-rule override + achievements-bridge (D3); `grant_currency` untouched; currency integration-ready (M2/ADR-014 owns plumbing) | **RESOLVED → homes: gamification build (seed/grammar/bridge) + Preferences build (toggle col)** | ADR-012 §3.11 (done); code at P3-decomposed build |
| Level-unlocks (rewards that DO something) — ⚠ INTENDED-later; GM-03/XCU-16 cover only base level derivation                                                                                                                                                                                                                                                                                                               | MOD-gamification build                                                                          | later / gamification design-pass                  |
| User-authored achievements / challenges / quests-as-a-Space — GM-13/GM-14 = app-curated only; GM-24 defers quests to a Space                                                                                                                                                                                                                                                                                              | #85 / xcut-capability (sandbox authoring model)                                                 | later (capability graduation, ADR-012 §6(c))      |
| `user_profile` PII relocation (`display_name`/`avatar_url`/`birth_date` stay ⚠ until account/identity entity) — homed GM-12                                                                                                                                                                                                                                                                                               | future identity design (ADR-012 §6(d))                                                          | later                                             |
| Build-phase table shapes (`rules` table · currency level-curve config format · achievement reconcile-pass runtime · `store` node overlay) — homed GM-03/GM-04/GM-09/GM-13/GM-26                                                                                                                                                                                                                                           | §5.20 consolidation / gamification build                                                        | P2 / M1.2 build                                   |
| Feature-flag gate (`preferences.feature_gamification`) placement at the service seam (GM-1) — service short-circuit vs caller/router                                                                                                                                                                                                                                                                                      | MOD-gamification build jointly with Preferences                                                 | build                                             |

### notes-and-pages (6)

| UNKNOWN                                                                  | Owner                            | By    |
| ------------------------------------------------------------------------ | -------------------------------- | ----- |
| focus_sessions sub_type discriminator VALUE for pomodoro (NOT-36)        | Sessions build                   | build |
| word_count derivation home (Notes service vs FTS5/editor, NOT-45)        | Notes build                      | build |
| G6 entity-link UX + merged/grouped backlink presentation (tentative → ②) | Notes ② build / backlinks engine | P3    |
| ADR-007 saved-view SELECTION primitive reshape (NOT-48)                  | Views/Spaces design-pass         | P3    |
| Hard-delete cascade + tags/links cleanup mechanics (NP-9, no FK)         | Part 2 (app/service-driven)      | P3    |

### languages (5)

| UNKNOWN                                                                                   | Owner                       | By    |
| ----------------------------------------------------------------------------------------- | --------------------------- | ----- |
| LG5 immersion content — generic entity_links vs language fields (LAN-12)                  | languages/spaces build      | build |
| LG5 weekly-plan reflections — fold into generic review vs inline (LAN-11)                 | Purposes review + languages | build |
| LG7 proficiency model + 4-vs-6 skill-taxonomy (LAN-17/18)                                 | languages build             | build |
| LG8 video-playlist — language-specific vs generic media-queue (LAN-21)                    | languages build             | build |
| Whole-context homing (Space Block vs Sessions/Knowledge vs Template) — 0-byte aspect docs | P3 decomposition            | P3    |

### xcut-sessions (3)

| UNKNOWN                                                                                 | Owner                     | By  |
| --------------------------------------------------------------------------------------- | ------------------------- | --- |
| Scheduling/placement algorithm (urgency/recalc-on-miss, G5) — P1-scope vs study-planner | P3 / study-planner module | P3  |
| CI build-time single-write-path guard — tooling vs @vida/core artifact                  | P3 decomposition          | P3  |
| session_attachments overlap entity_links — distinct service vs delegate                 | P3 decomposition          | P3  |

### xcut-review (4)

| UNKNOWN                                                                       | Owner                             | By       |
| ----------------------------------------------------------------------------- | --------------------------------- | -------- |
| Mastery derivation + rollup formula (XCU-06/07)                               | MOD-knowledge (M1.2)              | P3/M1.2  |
| KN-10 3-signal compounding depends on Education syllabus-as-calendar (XCU-08) | Education measurement design-pass | P3/build |
| Future study-method services (assessments/self-test/Feynman) INTENDED-not-now | post-M1 (ADR-005 §6 trigger)      | later    |
| Kind-registry nesting parent_kind_id vs flat (XCU-02)                         | MOD-knowledge build               | M1.2     |

### xcut-spaces (3)

| UNKNOWN                                                              | Owner                               | By    |
| -------------------------------------------------------------------- | ----------------------------------- | ----- |
| Predicate/filter DSL grammar (views.filter, XCU-SP-16/18)            | views build / ADR-007 internals     | P3    |
| Per-layout view visual/interaction + latent provider-output contract | views build / P6 UI intake          | P3/P6 |
| ADR-002 amendment for tier tables + open entity_links enum           | P2 schema-reconcile (not a P1 hole) | P2    |

### xcut-views (5)

| UNKNOWN                                                                                         | Owner                                 | By    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- | ----- |
| cloneView method vs consumer create-from-source (SP3 clone)                                     | ADR-007 build                         | P3    |
| Default-view seeding owner (ViewsService vs Spaces template-seed vs bootstrap)                  | P3 decomposition                      | P3    |
| Per-type predicate matching + exclude-mode (no home in built engine)                            | ADR-007 predicate-DSL build           | build |
| Layout field-declaration mechanism (calendar→date/gallery→cover/board→group)                    | ADR-020 service/UI split              | P3/P6 |
| "derived progress" for Bucket-List/Dreams — belongs to Dreams module, verify not double-counted | Dreams/Bucket-List module (§4c dedup) | P3    |

### xcut-capability (3)

| UNKNOWN                                                                                     | Owner                                         | By    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------- | ----- |
| view-hosting placement seam (view can host a placed capability?)                            | P3 build seam (ADR-008 §6)                    | P3    |
| Sandbox runtime tech + authoring language/DSL + escape residual                             | #85 CAP-authoring                             | later |
| capability_grants external-data (ADR-014) + AI-actor (ADR-015) semantics — forward pointers | xcut-ingestion / xcut-ai + P3-boundary #71/M2 | P3/M2 |

### xcut-templates (2)

| UNKNOWN                                                                                  | Owner                                                | By  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | --- |
| TemplateService owns fork write-path vs delegates per-entity to owning services (XCU-05) | P3 facade-vs-delegation seam                         | P3  |
| A1 trust-boundary / imported-capability untrusted-import home (routes to ADR-010)        | central P1 assembly / P3 — see resolution note below | P3  |

### xcut-measurement (4)

| UNKNOWN                                                                                 | Owner                                                | By    |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| derive() hash for derived-pull identity vs reuse effect-rail hash (cross-ref XCU-14)    | build-phase                                          | build |
| DAG traversal runtime (cached adjacency vs on-write DFS) + perf                         | build (depends on binding storage)                   | build |
| measurement-source registry runtime + per-source vs central last-known store            | finance/habits/health/projects (first-consumer-pull) | build |
| cached measurement snapshot (XCU-20) — enters corpus only if render-chattiness measured | ADR-011 review trigger                               | later |

### xcut-economy (5)

| UNKNOWN                                                                                         | Owner                                  | By      |
| ----------------------------------------------------------------------------------------------- | -------------------------------------- | ------- |
| Level-unlocks (rewards that do something) ⚠ INTENDED-later                                      | MOD-gamification build                 | later   |
| User-authored achievements/challenges/quests-as-a-Space ⚠ INTENDED-later                        | #85/xcut-capability                    | later   |
| Cached balance-snapshot fallback if derive-on-read too slow                                     | ADR-012 review (only if trigger fires) | later   |
| PII relocation out of user_profile (needs account/identity entity)                              | future identity design                 | later   |
| Build-phase shape (ledger columns/indexes, rules table, curve config, reconcile runtime, §5.20) | §5.20 consolidation / per-module build | P2/M1.x |

### xcut-notifications (5)

| UNKNOWN                                                                                    | Owner                              | By    |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ----- |
| Rich/actionable push (opt-in readable mode outside ZK, EX-1/2) ⚠ INTENDED-later            | ADR-013 future                     | later |
| Notification-history server backup ⚠ INTENDED-later                                        | ADR-013 future                     | later |
| Digest/batching (N5, notification_frequency→Preferences §5.17)                             | batching design-pass               | later |
| Push vendor + runtime policy (§5.20: Expo/OneSignal/APNs, retry, debounce, columns, email) | build-phase                        | build |
| Silent-vs-visible closed-device wake reliability (retry/coalescing, per-platform)          | build-phase (§6(a) review trigger) | build |

### xcut-ingestion-ai (5)

| UNKNOWN                                                                               | Owner                             | By    |
| ------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| Native-connector qualification process (trust bar/review/deprecation) — owed decision | Victor's call (process owed)      | later |
| Third-party-shared connectors (behind PC-4 community gate)                            | Victor explicit go                | later |
| Public-mirror/CDN topology + anonymizing-fetch (PIR/OHTTP) live-price residual        | deferred hardening                | later |
| Local model choice / cloud-provider order / prompt+redaction UX                       | build-phase runtime picks         | build |
| Agentic tool-registry contents (which tools grantable)                                | deferred (authority model locked) | later |

### xcut-backlinks-search-export (4)

| UNKNOWN                                                                                          | Owner                              | By  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------- | --- |
| Merged-backlinks compose home + shape (page_links ∪ entity_links, G6-tentative)                  | Notes build / backlinks engine     | P3  |
| Neural-graph data-prep home (AR-8 vs Views) + node/edge schema; REL-46 membership-edge reconcile | AR-8 graph increment / Views build | P3  |
| Export serializer split home (services/export vs @vida/editor vs UI-2 dialog); per-app PDF path  | UI-3 @vida/editor build            | P3  |
| FTS5 ranking algorithm (BM25/recency/per-type boost) + query DSL                                 | DB-8 FTS5 build session            | P3  |

**Cross-corpus resolution note (xcut-templates A1 orphan-risk):** the xcut-templates UNKNOWN flags that
A1 (imported-capability untrusted-import trust boundary) routes to ADR-010 and asks whether an ADR-010
Part A owner exists. **Resolved at assembly: it does** — `parts/xcut-capability.md` XCU-CAP-16..24
(the "Capability-authoring security envelope, A1..A9") owns the two-tier trust classification and the
untrusted-import surface. A1 is therefore **not orphaned**; it homes to xcut-capability + Part B B.4
"Capability-authoring security envelope."

---

## Appendix — Assembly method

- Assembled from 34 `parts/*.md` reader outputs (gamification recovered after its reader initially
  failed); per-module Part A tables referenced (not inlined) to keep the corpus single-source and
  navigable.
- Part B refined from the reader-supplied candidate register per §4c: 3 health cross-pillar merges +
  1 contributor-set fix + 1 economy×gamification two-leg fold on recovery (see Part B defect log). No
  ≥2-module concept found missing from Part B.
- Parts C/C2 consolidated by reference; the mechanical orphan/unaccounted verdicts (`0 orphan flags`,
  `0 unaccounted`) verified at assembly with padding-/rule-id-normalized id matching.
- Part D homes all 154 UNKNOWNs across 34 sections (owner + phase) — reconciled from a stale 147 header
  (real rendered sum was 143; learning-education's 5 were unrendered) + learning-education (5) +
  gamification (6). GG4 flagged as a **ratification gap** (needs Victor), not a shape-open build detail.
  The one cross-corpus orphan-risk (templates A1) resolved to xcut-capability; the dangling GM-12 Part B
  reference now resolves to `parts/gamification.md` GM-12.

> Note (2026-10-26): line cites into `docs/features/notes-and-pages/*` and `docs/intake/notes-and-pages.md` refer to their text at `eaf64f8^` (resolve with `git show eaf64f8^:<path>`); the aspect docs were restored + realigned by notes-rescope.
