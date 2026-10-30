## ⚠ P2 defer-adds — DO NOT LOSE (Victor directive, 2026-09-14)

Two genuinely-absent DDL shapes were ratified as **deferred** at the P2 audit-report gate (O3). They are NOT
gaps and NOT lost — they carry here explicitly so the owning module build authors them:

1. **`method_bindings.daily_cap` → split into `new_cards_per_day` + `reviews_per_day`** (both nullable INTEGER).
   - Source: corpus `XCU-17 [xcut-review]` (`parts/xcut-review.md:33`) + flashcards FC-3.
   - Schema today: single generic `daily_cap` (`packages/core/src/db/schema/foundation/knowledge-review.ts:38`).
   - **Home: MOD-knowledge build (M1.2)** — the review-engine service that consumes the caps. Author the split
     in that module's build-phase migration (forward-only, empty table). Confirm one-vs-two with MOD-knowledge.

2. **`nutrition_ingredients.name_bidx`** (blind index + its index) for barcode-scan equality lookup over `[E] name`.
   - Source: corpus `HEA-28` (`parts/health-nutrition.md:39`) — recurring equality probe vs the local food-DB copy.
   - Schema today: `nutrition_ingredients.name` is `[E]`, no bidx (`packages/core/src/db/schema/health-nutrition.ts:38`).
   - **Home: nutrition module build (M1.2)** — author `name_bidx` + index when the barcode-scan service lands
     (structurally identical to the authored `finance.ts:86 category_bidx` precedent).

Plus the **B′ expose sweep** (scope refinement): the ~112 inert-column exposes + `progress/mastery/current_value`
→ `number | null` batch defer to **DB-11 interface reconcile** + each module build (expose when the service needs it).

---

## fixKind distribution (non-DEFERRED items)

- expose: 112
- none: 184
- check-vocab: 20
- move-vocab: 1
- add-migrate: 1

## DEFERRED grouped by home (114 homes)

### review-engine design-pass (journals build session / M1.4+) (3)

- journals: Snapshot re-capture on backfill — whether a UNIQUE(snapshot_date) / update-vs-freeze const
- journals: Standalone review table vs deriving reviews purely from journal_snapshots (+ optional per-
- journals: Per-period rollup snapshots — whether periodic (week/month/year) rollups get their own per

### foundation/purpose.ts (DB-3 substrate) (2)

- purposes: PUR-12/XCU-12: first-class polymorphic `contributions` weighted edge (retires purpose_habi
- purposes: PUR-24: `plan_steps` doc layer (polymorphic owner_type{task,target}/order/is_completed/tit

### books build-phase design pass (BK-4 cross-format mapping) — M3+ / ADR-016 (1)

- books: BOO-12 / BOO-41 — cross-format position mapping/anchor persistence (mapped position rows,

### Preferences store (conflict-rule key) + derived service state (BK-8) — Part B / P3 (1)

- books: BOO-34/BOO-35 — conflict-resolution state (conflicted flag blocking unified progress; Posi

### ADR-015 AI layer (provenance/AI6) + R2/note_attachments (ADR-003) — build-phase / Part B (1)

- books: BOO-25 photo-attachment / provenance (source=ai) and X*/AI* ingest rows (ISBN provenance,

### Part 2/build — user_profile DDL edit owned by Gamification #21 (removal of check_in_streak\*) (1)

- check-ins: CHE-14 — computeCheckInStreak is DERIVED read-side from daily_check_ins; check-ins OWNS ch

### MOD-checkins ① (@vida/types validators + parity tests) (1)

- check-ins: CHE-18 — @vida/types check-in enum validators (check_in_type(6), field_type(6), schedule_t

### DB-3 foundation/economy.ts (ADR-012 E6 substrate) (1)

- finance: FIN-18/FIN-23/FIN-24 store layer table (E6/FN-15) — createStoreNode(node_kind{group,wrappe

### M2 ADR-014 ingestion-service (import_staging DDL — undecided ingestion ADR) (1)

- finance: FIN-28 CSV/OFX import — import_staging table (parsed rows + match metadata + per-row statu

### M2 ADR-014/ADR-015 (ingestion-service / ai-service) (1)

- finance: XCU-09/XCU-25 connection_config / ai_connections tables (mediator credential custody · per

### Budgeting design-pass (mini-intake + candidate ADR, Part D) (1)

- finance: FIN-38 Budgeting — INTENDED + UNDESIGNED, no data model (period, per-category limit, rollo

### Commitments/liability-payment design-pass (Part D) (1)

- finance: FIN-36/FIN-39 Commitments layer + liability-payment ACTUAL tracking — DERIVED (no commitme

### Preferences domain (Part B) / FX design-pass (1)

- finance: FIN-21/FIN-25 base-currency + FX-rate store · persisted-aggregates opt-in (⚠ INTENDED sett

### M3/DB-5 (field-level encryption wiring) (1)

- finance: FIN-43/FL-11 [E] field-level encryption wiring — EMPTY [E] set in M1.0 (pass-through), fie

### future identity design pass (ADR-012 §6(d)), post-M1 (1)

- gamification: GM-12/XCU-20: user_profile PII relocation once an account/identity entity is designed

### economy substrate schema (foundation/economy.ts) / ADR-002 §5.20 consolidation — M1.2 gamification build (1)

- gamification: GM-04/XCU-14 + GG4: `rules` table — headless automation primitive; shape explicitly build-

### Preferences schema (user_preferences) build — F1→Preferences edge (1)

- gamification: GG4: user_preferences.xp_difficulty_weighting toggle column (Preferences-owned)

### post-M1 / gamification design-pass (§5.20 consolidation) (1)

- gamification: GM-03/XCU-16: level-unlocks (rewards that DO something) — INTENDED-later; only base level

### post-M1 capability graduation (ADR-012 §6(c)) / Spaces (1)

- gamification: GM-13/GM-24: user-authored achievements / challenges / quests-as-a-Space — INTENDED-later

### Preferences build phase (ADR-002 amendment, consumed by habits HAB-13) (1)

- habits: HAB-13/HB-10 backfill window setting habit_backfill_window_days — a Preferences column, no

### M3 / DB-5 (field-level encryption substrate) (1)

- habits: HAB-26/HB-1 field-level [E] encryption wiring for name/description/unit/cue/reward/success

### ADR-011 measurement design-pass + ADR-002 amendment (health build phase, P2/P3) (1)

- health-core: HEA-03/HEA-15 goal↔metric-target dedup — setTarget vs health_goals(metric-target) canonica

### derived-metric formula catalogue authoring (health build phase, P2) (1)

- health-core: HEA-05 derived-metric FORMULA catalogue — exact BMR/BEE/LBM/body-fat/1RM formulas + formul

### safety-signal threshold design-pass (health build phase, P3) (1)

- health-core: HEA-31 safety-flag threshold model — overtraining/deficit/rapid-weight/biomarker soft-thre

### ADR-011 measurement design-pass + ADR-002 amendment (health build phase, P2) (1)

- health-core: HEA-15/HEA-49 CHECK defaults for measurement_kind/binding_mode + metric-target→(kind×bindi

### curated Role-library design-pass (post-core, extension-model wiring) (1)

- health-core: HEA-24/HEA-50 curated OS-owned Physical-Role library import (locale_variant model)

### ADR-014 per-service integration research (post-core, per-service) (1)

- health-core: HEA-44/HEA-45/HEA-46 external INPUT ingestion (X1/X2/X5/X8) / medical OUTPUT egress (X4) /

### P2 schema-shape (owner: health/core rerun + P2) — resolve-by P2 (1)

- health-nutrition: UNKNOWN — HN-8 life-context (normal/training/rest/travel/social/sick) as a field on meals/

### P2 attachments/sync substrate — resolve-by P2 (1)

- health-nutrition: UNKNOWN — photo_blob retention/lifecycle after macro inference (kept vs discarded, re-sync

### P2 ADR-015 / AI-layer schema — resolve-by P2 (1)

- health-nutrition: UNKNOWN — ai_conversations [E] (persisted AI chat) named in rerun G-AI6, absent from all n

### P3 nutrition decomposition — resolve-by P3 (1)

- health-nutrition: UNKNOWN — performance_benefits (JSON on dishes) + purpose (JSON on meals) semantic-intent

### ADR-015 / AI-layer build (Part 2/build phase per corpus:96) (1)

- health-nutrition: HEA-31 ai_connections config (AI2) consumed, not owned

### health-core Metric sink (health.ts) — service emission P3 (1)

- health-training: HTR-15 Performance→Core Metrics emission (1RM/volume/PR per-lift per-side) — no Training-l

### schema/\_registry.ts (entity_type registry) — build phase (1)

- health-training: HTR-24 entity_type polymorphic registration for exercise·exercise_plan·workout_session·wor

### P2 schema-reconcile / ADR-003 sync-unit decision (health build phase) (1)

- health-training: UNKNOWN: workout_sets sync-unit granularity (own blob vs parent workout_session blob)

### health build phase (ADR-016) — service rule set P3 (1)

- health-training: UNKNOWN: periodization advancement rule (HTR-16) — no formula/rule engine specified

### health build phase — likely health-core energy-loop owner (health-nutrition part) (1)

- health-training: UNKNOWN: burn-estimation MET formula/table ownership (HTR-18)

### foundation/sessions (migration 002) — not this file (1)

- health-training: XCU-06 base `sessions` supertype shape (sub_type·purpose·scheduling_mode·planned_block_id·

### foundation/effects consumer output rows — AR-9/M4 (1)

- health-training: XCU-28 effect_event_id UNIQUE column on effect OUTPUT rows (cross-device convergence)

### M1.2 / MOD-knowledge build phase (foundation/review; ADR-016 §3.5) (1)

- knowledge: KNO-15..KNO-22, FC-02/03/06/09/10, XCU-01..XCU-10/14/15/17/19/20: generic review engine (m

### ADR-008 capability registry (Part B / foundation) (1)

- knowledge: KNO-15/KNO-16 + XCU-01: study*methods = ADR-008 capability-registry partition (kind=study*

### M1.3+ / Education assessments design pass (cross-module) (1)

- knowledge: KNO-44 / K8: replace is_exam_topic boolean with a topic↔assessment LINK once Education ass

### M1.3+ / Education measurement design pass (1)

- knowledge: KNO-26/KNO-27 + XCU-08: paceVsSyllabus / assessmentResults signals depend on Education-own

### future cross-module rules ADR (undocumented surface) (1)

- knowledge: KNO-46: OS-level cross-module automations (penalties/rewards/self-testing) — flagged, NOT

### M1.2 / MOD-knowledge build decision (1)

- knowledge: KNO-01: parent_kind_id? — whether object_kinds itself nests vs stays flat (open modeling c

### DB-8 (FTS5 search build) (1)

- knowledge: KNO-37 / K11: searchKnowledge over fts_knowledge (FTS5 virtual table); knowledge objects/n

### extension-model / ingestion pass (ADR-014) (1)

- knowledge: KNO-43 / K9: auto-population of knowledge objects from syllabus/TOC/schedule (device-side,

### build-phase grading design-pass (M1.2) (1)

- learning: Grading-system COMPONENT MODEL — exact weighted-component shape + scale representation (fo

### build-phase measurement design-pass (M1.2) (1)

- learning: Measurement CHECK defaults + grade-vs-deliverable-vs-count mapping FORMULA + GPA rollup WE

### build-phase (Education service, M1.2) (1)

- learning: ICS event→subject MATCHING heuristic (by title/keyword?) — unmatched stays manual

### M2 — ADR-014/015 ingestion+AI service (xcut owned) (1)

- learning: LEA-52/AI extraction — syllabus/document extraction (X11 split ADR-014→015); source=ai pro

### P3 — Spaces/Languages decomposition (measurement-engine binding) (1)

- learning: Languages LG7 proficiency model (per-skill levels + CEFR self-assessment) homed to P2 (sch

### P3 — Spaces decomposition (Knowledge/Sessions/Gamification composition) (1)

- learning: Languages LAN-01..LAN-30 vocab/recordings/practice/weekly-plan tables — all ROUTED away fr

### ADR-003 device-registry schema / P2 §5.20 (device table) + M1.x platform-delivery build (1)

- notifications: XCU-13 push-token registration — push_token + push_platform{apns,fcm,web} columns on ADR-0

### Preferences §5.17 (notification_frequency field) + notifications batching design-pass (post-M1) (1)

- notifications: NOT-26 digest/batching — notification_frequency (realtime/daily/weekly) owed to Preference

### ADR-013 review / follow-on ADR (post-M1 design-pass) (1)

- notifications: Rich/actionable push + notification-history server backup (UNKNOWN-1) — no resolved shape,

### MOD-prefs [F] build unit (P2/P3 service) (1)

- preferences: PRE-19/UNKNOWN: active_modules↔module_visibility reconciliation — merge into one store vs

### M2 / ADR-014 ingestion guard (surface tables → ADR-002 §5.20) (1)

- preferences: PRE-28: Layer-3 user-managed integration surface tables (webhooks + external-API connector

### MOD-journals build unit (Journals summary engine owns the shape) (1)

- preferences: PRE-31: summary-selection GLOBAL DEFAULT storage column/shape in Preferences (Journals get

### Notes & Pages (pages entity_type registry) — PRO-34 companion (1)

- projects: mission column — Vision & Mission are pages (entity_type=project); 'mission added (⚠ INTEN

### projects build-phase design-pass (M1.2) / entity_links + M5/R7 seam (1)

- projects: deliverable measurement-source binding columns / M5 seam DDL (source_ref, linkDeliverableS

### Relationships (project_contacts) / Finance (project↔account) / Sessions-Calendar (project events) (1)

- projects: project_contacts(role) junction, project↔account link, project events (PRO-30/31/32, ⚠ INT

### Spaces/templates tier (already authored m1.0-closeout; migration 003 spaces) (1)

- projects: templates store (name [E] + serialized bundle [E], _sync_\* + deleted_at) — ADR-009 Spaces

### ADR-015 AI mediator layer (M3+) (1)

- projects: AI source=ai provenance on AI-generated rows (PRO-36 AI6)

### foundation/purpose.ts (DB-3 substrate); generic-review-substrate = post-M1.1 ADR (1)

- purposes: PUR-18: `purpose_reviews` table restored (still_aligned/alignment_notes[E]/overall_progres

### schema/\_registry.ts (Notes & Pages registry) (1)

- purposes: PUR-28: entity_type registry adds `value`/`dream` (purpose/target/purpose_metric_value alr

### M3 / DB-5 (encryption substrate) (1)

- purposes: PUR-32/XCU: [E] field-level encryption WIRING for all marked columns

### build-phase / P3 (measurability design-pass, UNKNOWN-2) (1)

- purposes: XCU-13: binding STORAGE (Binding{mode,source,target} descriptor persistence)

### per-module DB-4 (tasks/projects) (1)

- purposes: XCU-11: optional per-child nesting-weight column (DOWN-rollup weight, NULL⇒equal-weight)

### P3 MOD-relationships [F] unit spec (health formula/banding design-pass, rerun:147) (1)

- relationships: REL-22/REL-47 getContactHealth / getNetworkHealth — derived, never stored; NOT an ADR-011

### P3 service + P6 (Sigma render); may route to AR-8/Views design-pass (1)

- relationships: REL-46 getNetworkGraph — Sigma.js node/edge set (membership edges only); data-prep, no new

### M-cross-cutting ingestion service (ADR-014); import connector layer classification build-phase (1)

- relationships: REL-07/REL-08/REL-09 device-import / import_staging / connector classification — ADR-014 i

### Gamification (ADR-012); relationships produces streak edge later (1)

- relationships: REL-52 interaction-streak → Gamification events — owned by Gamification (C2 guard, no econ

### Notes & Pages (pages polymorphic); entity_type registry (1)

- relationships: REL-49 contact/network descriptions via pages (RL-1/G9) — NO description column; a pages r

### Routines design-pass (Spaces step-scoping); resolve-by P3/build (routines.md:112) (1)

- routines: ROU-27 / RT-10: step-scoping shared-repeatable-actions → INTENDED `routine_step_membership

### routines measurement design-pass (build phase); resolve-by P3 (routines.md:111) (1)

- routines: ROU-14 / measurement_kind + binding_mode exact CHECK DEFAULTS for a routine (natural rate

### Preferences/Spaces policy settings (ROU-24); routines.md:36 (1)

- routines: ROU-12/ROU-18/ROU-24: completion/miss/acceptance-window POLICY — configuration read from P

### Notes pages/entity_links seam (Notes-owned); routines.md:38 (1)

- routines: ROU-26 / RT-15: routine-group-level notes (INTENDED extension) via `pages`/`entity_links`

### P2 vocab-amendment (\_registry.ts / @vida/types entity_type enum) per SKI-42 ADR-002 amendment (1)

- skills: SKI-37 entity_type polymorphic registrations for skill_level·skill_activity·skill_action·s

### P2/P3 measurement design-pass (ADR-016); C-M1 already licenses the JSON-field posture (1)

- skills: UNKNOWN: Composer measurement_kind vocabulary as CHECK'd column vs registry-validated OPEN

### M1.2 MOD-knowledge (Knowledge-owned review engine: review_events / review_curves / method_bindings) (1)

- skills: xcut-review XCU-05 review_events / XCU-06 mastery derivation: skills' Assessment/Review ac

### tasks build phase (jointly with sessions / ADR-004) (1)

- tasks: TAS-18: task_time_logs ↔ ADR-004 session-extension reconciliation (does log_time write tas

### ADR-007 saved-view anatomy design-pass (Views/Spaces) (1)

- tasks: TAS-28/TAS-29: saved views = views primitive rows (no bespoke task_views table); 12→7 layo

### ADR-009 / Spaces preset design-pass (1)

- tasks: TAS-30: presets bound to kind = saved views config + Spaces-owned preset primitive (T4)

### M3 / DB-5 (field-level encryption) (1)

- tasks: TAS-37: [E] field-level encryption wiring for title/description

### ADR-011 measurement design-pass / ADR-002 amendment (P2/P3) (1)

- tasks: TAS-25 UNKNOWN: exact CHECK/DEFAULT for measurement_kind/binding_mode is a build-phase des

### MOD-purposes / metrics DB-4 (per-module columns) (1)

- tasks: xcut XCU-15/XCU-16: restored metric fields (is_higher_better, baseline_value) + nullable o

### xcut-spaces (space_enabled_blocks) · service P3 (1)

- foundation/capability: XCU-CAP-13 — enabled_blocks teeth-split (offered-palette vs placements) derivation; the pa

### #85 CAP-authoring (per-platform runtime design-pass) (1)

- foundation/capability: XCU-CAP-16..24 — A-family authoring-security runtime (trust-tier classify, grant enforce/r

### knowledge (review engine) · knowledge.md Part A (1)

- foundation/capability: XCU-CAP-25 — study_methods = kind=study_method registration; the concrete registration + r

### knowledge/study-methods (gather channel, build-phase) (1)

- foundation/capability: XCU-CAP-26 — gather cross-source read channel (user-initiated source pick), 'tracked for b

### capability/views build-phase (P3 / ADR-008 §6 review trigger) (1)

- foundation/capability: UNKNOWN — view-hosting placement seam: whether XCU-CAP-12 block_instances placement host s

### xcut-ingestion (ADR-014) / P3 boundary #71 (M2) (1)

- foundation/capability: XCU-CAP-21 — capability_grants external-data semantics (external_in_ok/external_out_ok per

### Preferences build / preferences.ts P2 audit (1)

- foundation/economy: GG4 switch = global user_preferences.xp_difficulty_weighting pref (+ per-rule override) —

### MOD-gamification service (P3); curve config format build-phase (1)

- foundation/economy: XCU-16/GM-03 level = pure fn of currency total over fixed non-linear curve + titles; no le

### gamification.ts + check-ins.ts + preferences.ts P2 audits; PII relocation post-M1 identity design (1)

- foundation/economy: XCU-20/GM-12 user*profile single-writer split (System keeps derived total+level; check_in*

### gamification.ts P2 audit (1)

- foundation/economy: GM-14 achievements catalogue (key·category·tier·title·xp_reward·condition JSON·is_secret)

### xcut-sessions / effect rail (P3 service) (1)

- foundation/effects: XCU-CAP-15: guarded-write firing (declared effects → real writes, idempotent via §3.2.5 ef

### M1.2 MOD-knowledge build (mastery/scheduling derivation mechanism, xcut-review UNKNOWN) (1)

- foundation/knowledge-review: XCU-04 — SM-2 scheduling review-state (easiness_factor/repetition_number/interval_days/nex

### M1.2 MOD-knowledge build (mastery derivation + rollup formula, xcut-review UNKNOWN) (1)

- foundation/knowledge-review: XCU-06/XCU-07/KNO-23/KNO-24 — mastery_level DERIVED at the leaf + rolled up the spine; nev

### M1.2 build-time enforcement (retirement invariant); \_legacy deleted at parity (1)

- foundation/knowledge-review: XCU-19 — retirement invariant: flashcard_decks/flashcard_reviews/SM-2 columns retired into

### Purpose build phase (P3 service) — measurability design-pass (1)

- foundation/purpose: PUR-24 edge: plan_steps MAY feed the owner's `checklist` measurement_kind (n-of-m) — gradu

### P3 (foundation/measurement engine consumption + purposes service CRUD) (1)

- foundation/purpose: XCU-12: laddering rollup weight = contributions.contribution_percentage consumed by the me

### MOD-sessions ① (focus_sessions extension — session-extensions.ts, M1.1) (1)

- foundation/scheduling: SES-28/SES-29 interruption/pause tracking on the focus runtime — no interruption_count/pau

### sessions.ts audit (base spine planned_block_id — separate P2 file) (1)

- foundation/scheduling: SES-17 / SS-8 planned_block_id link (session spine references stable planned_block; SES-22

### P2 schema-reconcile: tasks.ts / session-extensions.ts (work_session extension) (1)

- foundation/scheduling: SES-38 / UNKNOWN-2 task_time_logs ⟷ work_session reconciliation (replaced or wrapped) — ex

### MOD-sessions build (ADR-016 §build-phase DDL) / P3 decomposition (1)

- foundation/session-extensions: POM-26 / C2 UNKNOWN: whether pomodoro_sessions folds into focus_sessions (this extension)

### P2 Tasks-schema slice / MOD-sessions build decision (1)

- foundation/session-extensions: SES-38 UNKNOWN: task_time_logs ⟷ work_session reconciliation (replaced vs wrapped) — intro

### DB-4 owner-module groups (Books/Education/Health/Tasks/Skills) — per-feature build phase (1)

- foundation/sessions: SES-36 tail: remaining per-sub-type extension tables (class/reading/practice/daily/review/

### AR-9 / M4 (cross-device convergence pass) — per-target-module output rows (1)

- foundation/sessions: XCU-28/XCU-25/XCU-26: UNIQUE effect_event_id columns on each effect's OUTPUT row (cross-de

### Tasks DB-4 group / MOD-sessions build (work_sessions extension) — build-phase decision (1)

- foundation/sessions: SES-38: task_time_logs ⟷ work_session reconciliation (replaced vs wrapped) — an explicit b

### DB-8 / M1.4 (FTS5 engine) (1)

- foundation/spaces: New-domain FTS5 virtual tables owed per searchable domain (XCU-BSE-18)

### AR-8 increment #2 / Views design-pass (P3) (1)

- foundation/spaces: Neural-graph node/edge data-prep — no persisted graph table; derived from page_links ∪ ent

### AR-7 / ADR-008/009/010 (P3+ build passes) (1)

- foundation/spaces: Capability registry / block_instances / effect rail / templates / authoring-security (XCU-
