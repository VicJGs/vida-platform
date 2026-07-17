# Session Plan
# 2026-06-08 | documentation-blueprint
# Profile: Project Foundation Setup → Scenario: documentation-blueprint
# Goal: Build the discovery-driven documentation framework (Levels × Aspects), fix the
#       structural scan-crash problem in the toolkit, then document vida-platform.

## Active Tasks
Mirrors the live Ctrl+T panel. Order = priority. IDs in (parens) are the live-panel task IDs.

### ▸ Structural fix — COMPLETE (toolkit foundation)
- [x] Step 1 (#6) — survey-repo.js (G1/G2, deterministic, ADR-006, 15 tests)
- [x] Step 2 (#7) — scalability proof (vida / life-os / synthetic-12k @ 1.9s/52MB)
- [x] Step 3 (#8) — RE-SCOPED: sub-agents dropped → lib/repo-signals.js (facts-only signals, 9 tests)
- [x] Step 4 (#9) — /layer-docs → survey (no tree-walk; "prefer largest" deleted)
- [x] Step 5 (#10) — /documentation Phase 0 + scenario → survey
- [x] REROUTE (#14) — document-first workflow + /documentation-component + dogfood

### ▸ Session scope — the real work (NOW UNLOCKED)
- [x] Step 6 (#11) — Phase 0: manifest + docs/core. Done 06-10 (unsealed); VERIFIED + sealed 06-13 (commit 1db3dcd). ZK-3 drift fixed; conventions.md + server-api.md scaffolded.
- [x] Step 7 (#12) — Pilot: document Notes & Pages via the framework. DONE 06-18: intake resolved (G1–G8), 5 canonical aspect docs written + verified, gate PASS, manifest ✅. Feature aspect filenames aligned to canonical 5 (precedent for all 17). Open: G5 type-delta + G6 tentative.
- [x] Step 8 (#13) — Wire up indexes + /session-log. DONE 06-18: docs/features/README.md (17-module status index) + docs/core/README.md + 4 level-README stubs + REPO.md wired; /session-log loop confirmed. ← documentation-blueprint foundation COMPLETE.

### ▸ Feature documentation (applying the framework — fill order)
- [x] Notes & Pages (Wave 0) — 5 aspect docs + verified, gate PASS (06-18, commit 454f3ec)
- [x] Preferences (Wave 0) — 5 aspect docs + verified, gate PASS (06-18). ✅ **Wave 0 COMPLETE.** Flagged: 6 user_preferences fields + per-module visibility store + entire @vida/types preferences file are INTENDED (candidate ADR-002 amendment).
- [x] Tasks (Wave 1) — 5 aspect docs + verified, gate PASS (06-18). Largest INTENDED surface yet: completed_at, scheduled_date, recurrence+kind/obligation, task_views, shared-tags migration → one ADR-002 amendment.
- [x] Habits (Wave 1) — 5 aspect docs + verified, gate PASS (06-27). Intake G1–G9 resolved. INTENDED → candidate ADR-002 amendment: G8 restore 4 v1 fields (success_criteria, difficulty, completion location/time), G7 purpose-metric contribution contract, G9 user backfill window (Preferences). Streak = consecutive scheduled occurrences, no grace; feeds Gamification.
- [x] Finance (Wave 1) — 5 aspect docs + verified, gate PASS (06-27). Intake G1–G12 resolved. LARGEST INTENDED surface: balance=ledger-derived (opening_balance), G9 restored liability/income fields, multi-currency+private FX, recurring forecast/auto-gen, managed categories + shared tags, all-5-entity notes. ⚠ TWO candidate ADRs: "external financial data under ZK" (bank/import) + Budgeting design. Budgeting + liability-payment view IN SCOPE but undesigned.
- [x] Relationships (Wave 1) — 5 aspect docs + verified, gate PASS (06-28). Intake G1–G12 resolved. INTENDED: network_groups + junction (G2), membership-only graph (G3), closeness-weighted health/closeness_tier (G4), G8 restored fields (how_we_met, energy_given/received, key_takeaways, reminder snooze+priority), birthday-anchored group reminders (G11), tag scoping (G10). Parked NEW platform surface: GLOBAL CALENDAR (read-only cross-module event/task/reminder aggregator).
- [x] Check-ins (Wave 1 FINALE) — 5 aspect docs + verified, gate PASS (06-28). Intake G1–G10 resolved. Caught SCHEMA BUG (check_in_date UNIQUE alone → fix to composite, G2). INTENDED: +afternoon/monthly_review/yearly_review types (G3), review check-ins = cross-module review surface reading Purpose/Projects/Tasks (G7, forward dep), per-template schedule→Prefs+Notifications (G8), pages+Journal-day link (G10), gamification streaks (G9). **← Wave 0 + Wave 1 COMPLETE (7 features).**

### ▸ Wave R — Recovered scope (v1 architecture audit, 2026-06-30 — all KEEP)
Surfaced when Victor flagged dropped modules. Audited ../life-os/COMPLETE_SYSTEM_ARCHITECTURE.md (91 tables/7 domains) vs v2. Record: docs/intake/_scope-reconciliation-v1.md.
- [ ] **Health** (NEW context) — exercise + nutrition (ExercisePlan/TrainingExercise/WorkoutSession/NutritionPlan/Recipe/MealLog). No v2 schema → full intake + ADR-002 additions. Routines `exercise` step-type forward-refs it.
- [x] ~~**Duties** (NEW context)~~ — **DISSOLVED 07-14** (defining intake complete): Duty + Obligation = **task TYPES + presets**, not a module (Languages→Spaces precedent). Intent → Tasks ADDENDUM (type generalization) + Spaces accumulator (preset primitive). See `docs/intake/duties.md` RESOLUTION.
- [ ] **Finance → Commitments** (EXPAND documented Finance) — recurring commitments, auto-txn generation + due reminders (ties to budgeting design pass).
- [ ] **Projects → Investigations** (EXPAND documented Projects) — research/investigation entity.
- [ ] **Learning → verify** Grades/GPA (CR-002/OR-003), Cycles (OR-008), Subject-as-entity when documenting Learning.
- [ ] **Skills** (SEPARATE module, extracted from Learning 07-01) — v2 skills/skill_resources are a downgraded 2-table version; envisioned larger/robust. Own intake captures the fuller vision. Removed from Learning:Knowledge sub-context.

### ▸ Learning decomposition (07-01) — now **1 sub-context (Education)**: Books 07-03 + Knowledge 07-10 + Sessions&Scheduling 07-12 EXTRACTED as own modules (Sessions PROMOTED to foundation); Flashcards 07-12 → KNOWLEDGE study-method service; Skills split out; Language=Wave 3
- [x] Learning: Education (formerly Courses & Classes) — done 07-03
- [x] ~~Learning: Books~~ → **BOOKS, own module** (extracted 07-03, documented 07-05 — see Wave 2 below)
- [x] ~~Learning: Knowledge~~ → **KNOWLEDGE, own module** (extracted 07-10, documented 07-10 — see Wave 2 below)
- [x] ~~Learning: Study Sessions & Planner~~ → **SESSIONS & SCHEDULING, own FOUNDATION module** (extracted + PROMOTED 07-12, documented 07-12 — see Wave 2 below)
- [x] ~~Learning: Flashcards~~ → **KNOWLEDGE study-method SERVICE sub-context** (reframed 07-12, documented 07-12 — see Wave 2 below)

### ▸ Wave 2 (✅ COMPLETE 2026-07-12)
- [x] Projects (Wave 2 foundation) — 5 aspect docs + verified, gate PASS (06-29). Intake G1–G11 resolved. DEDICATED deliverables table + multi-type measurement system (financial/stats/3rd-party/logs/artifacts — needs design pass), vision+mission TipTap pages, project time from task focus, document VAULT (R2), dedicated Tasks→Projects API, +project_contacts(role)/account/event links, user-personalized views, deliverable notes, shared scoped tags. ⚠⚠ GOVERNING PRINCIPLE surfaced: ZK core + guarded opt-in extension layer (→ constitution).
- [~] Routines — intake IN PROGRESS + **RE-SEQUENCED to late (before Wave 4 peripherals), 2026-07-01**. Reframe captured: Routines = cross-module ORCHESTRATION layer; named sequences; polymorphic INTERACTIVE steps w/ per-step completion modes driving underlying entities. Deferred because its step-types reference Learning/Health/Duties/etc. — document those first. Intake: docs/intake/routines.md (G2/G3/G5/action-model resolved; G1/G4/G6-G10 to confirm on return).
- [x] Learning: Education (Wave 2, sub-context 1/5) — 5 aspect docs + umbrella + verified, gate PASS (07-03). ⚠⚠ SCOPE REFRAME: 8-level hierarchy (Institution/Self-taught → Program → Curriculum → Degree → Term → Subject → Module → Topic), renamed from "Courses & Classes". Grading-system BUILDER, subject_schedules (3 methods), class=session-of-subject, homework=education-task (Tasks Universe), Education-forged measurement, 11-tab Hub + dedicated-page families + per-assessment-type pages. Largest INTENDED surface (14 entities → ADR-002 amendment) + 2 design passes (grading components; measurement shared w/ Projects, separate forges).
- [x] **Books (Wave 2, OWN MODULE — extracted from Learning 07-03)** — 5 aspect docs + verified, gate PASS
      (07-05). ⚠⚠ SCOPE REFRAME: reading Universe (all reading, learning + enjoyment) w/ partition serving
      Education (Tasks-pattern). Work/asset model (multi-format: physical/pdf/epub/audiobook/braille),
      automatic cross-format mapping (transcription+TOC anchors, "not synced" fail-loud), annotations
      (highlights light · bookmarks · quotes first-class + platform-wide quote-embed), Books-own reading
      sessions + page-photo capture (→ visual reading journal in daily Journal), adaptive Quota Planner
      (sequenced|parallel, recalc on miss; Calendar/Routines-slots forward dep), Books governing principle.
      Intake B1–B16 double-critique gated (B16b + B10-confirm caught by gate). 2nd-largest INTENDED surface
      → ADR-002 amendment + cross-format mapping design pass.
- [x] **Knowledge (Wave 2, OWN MODULE — extracted from Learning 2026-07-10)** — 5 aspect docs + verified,
      gate PASS (07-10). ⚠⚠ MODULE REFRAME: knowledge Universe (lifelong catalog; **most-personalizable
      module**). KN-A boundary (Education plans acquisition / Knowledge holds+transforms+creates → 2 linked
      entities, never shared table). User-extensible **kinds + learning-realm** (concept=understand,
      definition=memorize seeds; realm drives default study method) + **object hierarchy below Topic**
      (`parent_object_id` stated; kind-registry nesting = INTERP). **Container org** Module⊃Area⊃Subject via
      shared scoped tags (multi-membership; Area serves multiple OS modules). **Pluggable methods/curves at
      every level** (SM-2 = one preset), mastery **derived**. **Knowledge notes → `pages` type** (retire
      knowledge_notes table). **entity_links graph** (retire resource_type CHECK). First-class References,
      fts_knowledge, **Knowledge Lab**, no-community/reproducible-setups, compound-set **builder + default**.
      **KN-10:** mastery = Education measurement source (object mastery + assessments + pace-vs-syllabus;
      syllabus-as-calendar = Education-owned forward dep). ⭐ **Env hierarchy (Victor, late-session): Subject ›
      Unit › Topic** is the fixed spine to reach a Topic (kinds attach BELOW Topic); mastery derives at leaf +
      rolls up `kind→Topic→Unit→Subject→Program`. Gate caught 2 No-Guessing defects (invented §label +
      kind/object hierarchy conflation) → fixed. 3rd extraction from Learning (after Skills, Books).
- [x] **Sessions & Scheduling (Wave 2, OWN FOUNDATION MODULE — extracted + PROMOTED from Learning 2026-07-12)**
      — 5 aspect docs + verified, gate PASS (07-12). ⚠⚠ LARGEST REFRAME: "Study Sessions & Planner" → a
      Level-Foundation cross-cutting module (sibling to Routines). Two pillars: **Sessions framework**
      (polymorphic Session supertype + sub-type registry — class/study/focus/reading/practice/daily/review/
      workout/work absorb ALL scattered OS session entities; BK-10 reading_session preserved as a sub-type;
      2 axes sub_type×purpose; scheduling_mode attended|planned|ad-hoc) + **Scheduling engine** (availability
      + `planned_blocks` that POINT at module-owned due-work via the `dueIn()` provider primitive — aggregator
      not duplicator, zero staleness, honors BK-12). ⭐ Resolved the parked **Global Calendar** logic (Planner
      writes blocks / Calendar renders). **4-dimension Integration Contract** (Attachment·Effects·Lifecycle·
      Permissions) = the module core + the guardrail for rich user-extensibility (S1=B). Shipped types ship
      FULLY CONFIGURED (edit = discouraged). Storage = table-per-type (base `sessions` spine + per-module
      extension tables) → surfaced the **Session Framework ADR**. Confirms: block↔session link (G4), restore
      rich templates+interruption (G6, runtime in Notes), derived analytics (G8), signal-source-only (G10).
      Deferred: G5 placement design-pass, G9 views pass. 4th extraction from Learning (after Skills/Books/Knowledge).
- [x] **Flashcards (Wave 2 — KNOWLEDGE study-method SERVICE sub-context, reframed from Learning 2026-07-12)** —
      5 aspect docs at `docs/features/knowledge/flashcards/` + verified, gate PASS (07-12). ⚠⚠ REFRAME: not a
      module, not under Learning — a **retention + gathering SERVICE inside Knowledge**, the **reference impl of
      the Study-Method Service framework** (→ **ADR-005**). "Keep the seam, retire the instance": 3 v2 tables
      collapse to ONE lean card content entity — `flashcard_decks` (→ user Knowledge object) + `flashcard_reviews`
      (→ generic `review_events`) + SM-2 columns (→ generic `method_binding`/curve; SM-2 = default preset) all
      RETIRED. Card = reviewable content (front/back/media/card_type + universal tags + note links). Gathering
      first-class (generate from definition objects/book quotes/notes). Emits `review_events`; Knowledge derives
      mastery (KN-10). Drill = `review_session` (ADR-004). Framework EXTENSIBLE (roles + integrations open;
      future services intended). Learning → Education only. FOUNDATION-FIRST principle captured.
- [x] **Journals (Wave 2 FINALE — the integration layer, 2026-07-12)** — 5 aspect docs at
      `docs/features/journals/` + verified, gate PASS. Boundary: Notes & Pages owns the journal PAGE; Journals
      owns the **aggregation ENGINE** (`journal-service`, 0-line/INTENDED) — distinct context forced by the dep
      graph (N&P is a Wave-0 foundation; aggregating all modules from it = a cycle). Two subsystems: **daily
      dashboard** (live today) + **temporal Review engine** (snapshots → user-defined periods → scheduled
      Spotify-Wrapped-style recaps showing improvement vs goals/dreams/purposes/projects/workload). J2:
      **provider registry** (each module registers `summary(date)`; agenda reuses `dueIn`) + **per-module
      granular user selection**. J4: **snapshot-past + live-today + comparative** (refines N&P G7). No new ADR
      (reuses the provider seam); surfaced ADR-002 amendment (`journal_snapshots`) + Review-engine design-pass.
      Forward-deps stubbed: Purpose (Wave 3), Gamification/Notifications (Wave 4). J8 Check-ins integration
      deferred to that module's revisit. **← WAVE 2 COMPLETE (all contexts documented + gate PASS).**
- [x] ~~NEXT → **Wave 3**: Languages · Purposes & Goals · Bucket List~~ → **REMAINING RE-SEQUENCED 2026-07-13**
      (see below). Journals + Flashcards batches already committed (d780c60 / a88113c).

### ▸ REMAINING — EXECUTION ORDER (re-sequenced 2026-07-13, dependency-correct)
Trigger: Purposes & Goals intake (PG1) revealed it is the **OS meaning-spine** — ladders up progress/contribution
from EVERY domain module (incl. recovered Health/Skills + Routines). Documenting it now = speccing its rollup
against undocumented modules (No-Guessing violation). → moved to **CAPSTONE**, twin of Journals (operational
plane closed Wave 2; Purposes = meaning plane closes the feature effort). Tail = the 3 read-everything contexts:
Purposes → Gamification → Notifications. Manifest: `docs/README.md` §"Remaining — EXECUTION ORDER".
**UPDATE 2026-07-13:** Languages intake revealed it **dissolves into a configuration of generic seams** → surfaced
**Spaces** (Personalization & Composability foundation). Languages = worked-example (not a module). Spaces' gaps
deferred to #8 (touches every module; accumulates their needs). Order below revised.
- [x] **1. Health** (Wave R, new domain) — ✅ **DOCUMENTED + gate PASS 07-13 · CURRENT-INTENT ENHANCED + re-gate PASS 07-14.**
      Intake WHOLE (`docs/intake/health.md`: v1 seed + Vision + 18-DB Notion + OS-extension reshape + Forks 1-4).
      ⭐ **07-14 retro-fix:** re-harvested **System-1.0 + Management hubs** (23 pages, 6 MCP agents) → 6-pt delta →
      **co-created CI-1..CI-6 (authoritative)** + coherence/realism validation (R1-R4 + C1) → enhanced all aspect docs
      (12 files) → **re-gate PASS.** Key: **Disciplines+capacities MERGED → Physical Roles** (`physical_roles`; heavy
      Skills resource; professional/medically-aware; manual→LLM→curated-import). Added: **Monitoring spine** (Health
      Domains→Factors + scheduled Exams→metrics) · **biomarker panel + on-device derived metrics** (BMR/BEE/LBM/1RM) ·
      bilateral/per-lift · **functional nutrition axis** (8-system + whole-food, R2 research-flagged) · **opt-in
      cooking-skill** · **CI-6 bidirectional external integrations** (wearables/Google-Health INPUT · medical OUTPUT/
      egress — INTENT stub). ~~NEXT: exec #3 Duties~~ → **Duties DISSOLVED 07-14 (task types+presets); NEXT: Routines.**
- [x] **2. Skills** (Wave R, reframe) — ✅ **DOCUMENTED + gate PASS 07-14.** Reframed via Notion "Abilities" design
      (System 2.0, 5 DBs, as CONTEXT) + **co-created current-intent** (authoritative): a game-like, dependency-graphed,
      user-composable growth engine. `docs/intake/skills.md` WHOLE; `docs/features/skills/` (5 aspects). Module keeps
      name "Skills". Health (07-14) confirmed **Physical Roles are a heavy Skills resource** (tighten at Skills build).
- [x] ~~**3. Duties**~~ — **DISSOLVED 07-14** (defining intake ruled it a **task-type + preset**, not a module;
      Languages→Spaces precedent). Intent → `intake/tasks.md` ADDENDUM (G8 `kind`→user-extensible task **type**;
      Duty+Obligation = 2 shipped types w/ own patterns/contexts/deliverables) + `intake/spaces.md` accumulator
      (the **preset** primitive = thin tab = saved View + per-type UI/UX + default deliverables + Template). D1
      (recurring-responsibility) + D3 (compose seams) locked; D2 (Obligation stays a Task type) + extensibility ✅.
- [x] **3. Routines** — ✅ **DOCUMENTED + gate PASS 07-14.** Unparked + RECONCILED (§D) against foundations
      documented since 06-30 → composition reframe: the step "modes" = documented **Session sub-types (ADR-004)** +
      native completion (no bespoke engine); **Exercises = Health** (G_new superseded); obligation/task steps = Tasks
      **types**. §E resolution (Victor): orchestration cockpit; **user-configurable completion policy** (all-or-nothing/
      required-node/threshold) + **miss policy + acceptance window** + lifecycle (active/paused/off); **policy-derived
      streak** (Gamification reads it, not the Habits rule); actionable step = recurrent Task (alarm-like, reschedule-
      to-open-slot); step-scoping; always-record-partial (gratitude). 5 aspect docs `docs/features/routines/`; intake
      WHOLE. ⚠ INTENDED reframe → ADR-002 amendment + Routines design-pass (step_type taxonomy · membership · policy engine).
- [x] **4. Expansions batch** — ✅ **DONE 07-15 (Wave R fully reconciled).** All 3 resolved by composition / no new
      entity: **Finance→Commitments** = a management SUB-CONTEXT/LAYER in Finance (composes recurring txns/liabilities/
      income/investments/assets; bidirectional + derived progress-to-total; `dueIn`/Notifications; FN-14) ·
      **Projects→Investigations** = deliverable(`artifact`) + Knowledge Lab investigation (`entity_links`), explore-vs-
      execute boundary · **Learning** Grades/GPA/Cycles/Subject-as-entity = VERIFIED covered by Education (ED-7 grading
      builder + derived GPA; `terms`; cycle-session-gen = Sessions&Scheduling). Threaded into aspect docs + intakes + scope-recon.
- [x] **5. Pomodoro** (Wave 4) — ✅ **DOCUMENTED + gate PASS 07-15.** REFRAME (Victor): a **capability, not a
      module** = the **focus-timer runtime of the `focus` Session sub-type**, consolidated **entirely into the
      Sessions realm** (Victor: "handled only within the Sessions realm, not leak to any other entity"); the
      `/pomodoro` block = a **session-lens** (showcases pomodoro-enabled sessions, links a page's analytics to a
      `session_id`). Intake WHOLE (G0–G7): v1 richness (pause/interruption/auto-start/notify/sounds/templates)
      reshaped into the `focus`-session runtime + Preferences + Sessions presets; **Focus Mode** = polymorphic ×
      platform-adaptive (mobile/desktop/web) × tool-bearing × low-distraction (⚠ INTENDED → design-pass); breaks
      carry per-type guidance; analytics = derived cut of session analytics; XP via `award_xp` effect. 5 aspect
      docs `docs/features/pomodoro/` (replaced 5 legacy-named empty stubs). ⚠ **Moves a boundary** — reconciled
      across **Sessions** (SS-11 reversal + identity/contract/structure-data/conventions) + **Notes** (identity/
      contract/structure-data/business-rules): `pomodoro_sessions` re-homes Notes→Sessions + re-points `session_id`
      → build-phase ADR-004 amendment + ADR-002 re-home (noted, not run — Victor's call). now → #6 Bucket List.
- [x] ~~**6. Bucket List**~~ — **DISSOLVED into Spaces 07-15** (Victor's sincere reframe). NOT a module: "a
      separated View of things I want to do before I die, with progress, to envision them" = a **Space** (`#before-i-die`
      tag + vision-board Gallery View + derived progress + Template). The items **are Dreams** → `bucket_list_items`
      **collapses into `dreams`** (owned by Purposes & Goals; **PG8 RESOLVED**). **3rd Spaces worked-example** (after
      Languages, Duties). Intake `docs/intake/bucket-list.md` (RESOLUTION); intent threaded → `intake/spaces.md`
      accumulator + `intake/purposes-and-goals.md` PG8. Empty stubs deleted; off the module list. → build-phase
      ADR-002: retire `bucket_list_items`, widen `dreams`. now → #7 Spaces.
- [x] **7. Spaces — CORE/foundation** (Personalization & Composability) — ✅ **TRANSFORM + gate PASS + ACCEPTED
      2026-07-15.** Produced the **5-ADR set** (each drafted → /critique → revised → accepted one-by-one, every
      critique found real defects): **[ADR-006](../../docs/core/decisions/ADR-006-spaces-foundation-universal-tags.md)**
      (foundation tier + universal `entity_tags` open-registry+nestable + `spaces` entity; tag/link **distinct-in-
      storage / unified-in-OS-by-user-choice**) · **ADR-007** (`views` primitive, Space-owned-or-global, provider-
      delegated cross-type predicates) · **ADR-008** (capability-Block registry, declared render-targets; capability
      DRIVES a Session for outcomes, guarded-write discipline generalizes — NOT ADR-004 Effects) · **ADR-009**
      (templates fork-on-instantiate; **authored-vs-accumulated** capture line = ZK-clean by construction) · **ADR-010**
      (capability-authoring security: declare→grant→enforce + no-ambient sandbox + revocable + re-grant-on-change +
      compositional-consent). Core docs: **business-rules PC-1…PC-4 + EX-1/EX-2 + INT-1a**; manifest re-sequence
      (Languages struck; Spaces CORE-beneath-N&P; ⚠ N&P `page_tags`→`entity_tags` reconciliation flagged); SP7 front
      door `docs/core/spaces/README.md`. Verify PASS (G1 INT-1 drift fixed; O1/O2 build-seams flagged). Victor Accept:
      folded general extension-model → EX; community-external expansion **deferred (needs his go)**. **now → #8 Purposes & Goals (capstone).**
- [ ] **8. Purposes & Goals — CAPSTONE** (Wave 3) — after 1–7 (esp. Spaces universal tags); resume `docs/intake/purposes-and-goals.md` (PG1 captured; PG2–PG10 vs real docs).
- [ ] **9. Gamification** (Wave 4) — observes all incl. Purposes (goal-completion XP).
- [ ] **10. Notifications** (Wave 4) — dead-last leaf — observes all incl. Gamification.
- [ ] **Deferred (Victor 07-07): Fiscal & Legal** — post-all-waves; enhanced after #11.

### ▸ Purposes & Goals — intake PARKED (resume as capstone #9)
- [~] Intake started 2026-07-13, `docs/intake/purposes-and-goals.md`. **PG1 RESOLVED** (Victor): Purposes & Goals
      is the **organizing meaning-spine of the OS** — (B)-maximal, optional-but-omnipresent; the *directional/
      meaning* integration plane (twin of Journals' *operational* plane); carries the **envision→plan→act→FAIL→
      document→reshape→advance** lifecycle. Full gap map PG2–PG10 written + framed (derived progress · values+
      failure-lifecycle spine · auto-sourced metrics · entity_links laddering · generic reviews · Dreams↔Bucket
      boundary · ADR-004 review-sessions · provider registration). **Left OPEN by design** — resume at #9 so
      PG2–PG10 resolve against documented Health/Skills/Routines/etc. instead of guesses.

### ▸ Follow-up surfaced by Step 6 Verify
- [ ] ADR amendment: record the HKDF → BLAKE2b-256 Vault Key decision. Code (vault.ts) is authoritative and deliberate ("replaces HKDF"); ADR-001 §Key Model + CLAUDE.md still say HKDF. Run /adr-new (amend ADR-001) + fix CLAUDE.md — needs Victor's sign-off before editing the ADR.

### ▸ Candidate ADRs / decisions surfaced by feature documentation (build-phase, own sessions)
- [ ] **NEW (Health 07-13) — ADR: N-of-1 Experiment framework** — Health's Experiments (hypothesis → A/B on the
      user's own body → measured via metrics + responses → winner + learning → Profile) is a **candidate GENERIC OS
      primitive** (reusable by Habits/Sleep/Productivity). Built Health-first; seam designed to generalize. Needs
      Victor's scope call (Health-owned vs generic). Run /adr-new.
- [ ] **NEW (Health 07-13) — Health is the LARGEST instance of the two ZK ADRs** (AI/LLM + external-data) — LLM
      plan/meal generation · food-photo analysis · exercise-library / doctor-prescription import · wearable sync.
      Reinforces those standing ADRs; design Health's augmentation layer against them.
- [ ] **NEW (Health 07-14) — autonomy-with-clarity → constitution note.** Health's Safety & Medical facet (HC-14:
      user can do whatever he wants; OS records/advises/safety-nets, never gatekeeps/prescribes/blocks; flags
      advisory+dismissible) is the **body-instance of the extension-model constitution principle** — fold into that
      standing amendment (above). Medical data = most-sensitive ZK class.
- [ ] **NEW (Skills 07-14) — Skills design-passes/ADRs:** ① **external Skill-DB + locale-variant model** (curated
      capability library w/ language/location/geography/culture variants; opt-in extension-model import + community
      submission). ② **Skill Composer** (user definition/measurement/integration builder; Quick + Advanced; UI/UX
      state-of-art). ③ **global-vs-personal Skill Graph + community** (~50+ canonical skills · real dependencies ·
      shared foundational nodes · path-recommendation + synergy-detection). ④ **shared reflective/Adaptation/N-of-1
      engine** — Health + Skills both compose it → REINFORCES the candidate **generic Experiment/reflective-practice
      primitive** ADR (Health-surfaced). ⑤ **ADR-002 Skills changes:** RETIRE `skill_resources`→`entity_links` + ADD
      skill_levels/activities/actions/dev_logs/dependencies/definitions.
- [x] ✅ **RESOLVED (Victor 07-14) — community is EXTERNAL, via import/export only.** The `community` is NOT an OS
      feature/pipeline/code — it's an **external ecosystem** (marketing/growth). The OS's sole bridge = its existing
      **import/export** of **generic, non-personal templates**; sharing is **100% user-initiated, outside the vault**.
      Preserves SU-1 + ZK-1 (no in-OS sharing; OS never transmits data). External Skill-DB = public reference pulled
      via anonymous import. → **Skill docs updated (SK-3).** No ADR carve-out needed.
- [ ] **NEW candidate — CORE constitution note (principle):** **social/community/marketplace lives OUTSIDE the OS;
      the sole bridge is user-initiated import/export of generic, non-personal artifacts** (applies to Skills
      templates · Spaces templates · external Skill-DB · any shareable artifact). Keeps the core a pure single-user
      local-first ZK vault. Candidate addition to `docs/core/business-rules.md`. Still-open realism flags (NOT
      blockers): content-curation/ops burden of the ~50+ canonical skill graph + locale variants; on-device vs cloud
      LLM quality tradeoff — resolve at the Skill-DB/Graph design-passes.
- [ ] **NEW (Health 07-13 · GREW 07-14) — ADR-002 Health additions** (recovered domain, no v2 schema) — new tables:
      Core (`health_metrics`/`_values` [+`side`/`formula`/`catalog_ref`; source enum +exam/import]·`health_domains`·
      `health_factors`·`health_exams`·`assigned_exams`·`health_goals`·**`physical_roles`** [was `disciplines`]·
      `health_experiments`·`health_responses`·`medical_profile_entries`·`safety_flags`) + Training (`exercises`·
      `exercise_plans` [+`role_id`/`authoring_source`]·`workout_templates`·`workout_sessions` [ADR-004 extension]·
      `workout_sets` [+`side`]) + Nutrition (`nutrition_ingredients`/`nutrition_dishes` [+`functional_area`/
      `whole_food_type`/`recipe_page_id`/`cooking_skill_id`]·`nutritional_plans`·`daily_meal_plans`·`meals`·
      `shopping_items`) + `entity_type` enum extensions. Consolidate into the standing ADR-002 amendment.
- [ ] **NEW (Health 07-14) — curated Physical-Role library (design-pass)** — the OS-owned, importable Role library
      (calisthenics/swimmer/muay-thai/… "how to train each role") carries **geography · language · culture · location**
      variation. **CONSOLIDATE with the Skills external-DB design-pass** (①, same locale-variant model) — Physical Roles
      are a heavy Skills resource; likely one shared curated-library + locale-variant framework. Manual Role core is
      documented; LLM + curated-import = extension-model augmentations (rides the AI + external-data ADRs).
- [ ] **NEW (Health 07-14) — CI-6 bidirectional external integrations → external-data ADR must add EGRESS.** INPUT
      (Google Health · wearables · open health sources → metric values) rides the existing external-data ingestion ADR;
      **OUTPUT → medical systems & services is data EGRESS** (data leaves the ZK vault — a NEW, larger dimension than any
      prior module) → the external-data ADR needs an explicit **egress-guard** (strictest opt-in/consent). INTENT-only
      now; wire per-service post-core.
- [ ] **NEW (Health 07-14) — research: validate the 8-system functional-nutrition taxonomy (R2)** — the "area of action"
      (Digestive/Immune/Antioxidant/Cellular/Hormonal/Muscular/Neurological/Systemic) ships as an **editable starter**;
      run `victor:research` to confirm/reshape before Nutrition build. Non-blocking.
- [ ] **HIGH — CORE constitution amendment: the "extension-model" principle** (Projects, Victor 06-29) — ZK core is unchanged by integrations; external/AI integrations are OPT-IN, user-owns-the-risk, wrapped in a protection layer. Amend docs/core/business-rules.md; this principle FRAMES both ZK ADRs below. Needs Victor's go.
- [ ] **ADR: External DATA ingestion under zero-knowledge** (GENERALIZED — Finance G2/FN-9 + Projects G4 third-party metrics + **Fiscal&Legal 07-07 legal-rule-packs, the softest/public-data instance**) — bank/investment APIs + CSV/OFX + social/marketing metrics (Instagram/YouTube/email) + per-jurisdiction legal rules vs "server never sees plaintext". Options: device-direct (pure ZK) / aggregator (documented dent) / server-proxy (breaks ZK, rejected). Touches server + sync → its own session.
- [ ] **ADR: AI/LLM integration under zero-knowledge** (Projects G6 + **Fiscal&Legal 07-07 tax/legal advisement over private numbers**) — documents-as-context + AI features. Victor's intent = AGENTIC, ON-DEVICE ("within") = the ZK-safe path; cloud model = opt-in plaintext dent. Own session.
- [ ] **Deliverable measurement system — design pass** (Projects G4) — the multi-type taxonomy (financial/task-statistic/third-party-metric/activity-log/artifact) needs its own mini-intake before specc'ing internals.
- [ ] **Budgeting feature design** (Finance G12) — no model in v2/v1; needs its own mini-intake (period, per-category limits, rollover, alerts, Purpose integration). May graduate to its own feature context (own manifest row).
- [ ] **ADR-002 amendment (consolidated)** — now spans Preferences (6 fields + visibility store) · Tasks (5 additions) · Habits (G8 4 fields + G7 + G9) · Finance (opening_balance, G9 restored fields, import-staging, budgeting, liability-payments, base-currency/FX, managed categories, shared-tags migration) · Relationships (network_groups + junction, closeness_tier, how_we_met, interaction energy/key_takeaways, reminder snooze/priority, event-anchored group reminders) · **Books (07-05: book_assets, annotations ×3, reading_sessions+photos, reading_plans+junction, book_subjects, mapping data; supersede format/current_page/progress/genre/tags columns; entity_links annotation types)** · **Knowledge (07-10: knowledge_objects+object_kinds+learning_realm, knowledge_containers, study_methods/review_curves/method_bindings, review_events, compound_sets, references, knowledge_lab_entries, fts_knowledge; RETIRE knowledge_notes table + resource_type CHECK + fixed SM-2 cols + hand-set mastery_level + single linked_book_id; knowledge-note as pages entity_type)** · **Routines (07-14: `routines` + `routine_step` [named ordered sequence + ordering] · polymorphic `step_type`+`entity_ref` superseding `action_type`{habit,task,focus}+`linked_habit_id`/`linked_task_id` · `routine_step_membership` [step-scoping] · lifecycle{active,paused,off} · user-configurable completion/miss policy + acceptance_window columns [settings home = Preferences/Spaces])** · **Tasks (07-14: widen `kind`→user-extensible task `type` [standard\|obligation\|duty\|…] + per-type preset/UI config)** · **Pomodoro (07-15: re-home `pomodoro_sessions` Notes→Sessions realm + re-point `entity_type`/`entity_id`/`page_id` → single `session_id` FK; add `paused_at`/`total_pause_seconds`/`was_interrupted`/`interruption_reason`; Preferences +`auto_start_breaks`/`auto_start_next_interval`/`show_notifications`/`play_sounds`; templates = `focus` Session presets, not a Pomodoro table)**. Consider ONE amendment in build phase.
- [ ] **NEW (Spaces 07-15) — the Spaces ADR set (Transform of exec #7, next session)** — intake WHOLE; Transform
      produces ~5 ADRs: ① universal tags (`entity_tags`, open-registry, nestable, distinct-from-links w/ user-choice
      interaction) · ② saved views (`views`, Space-owned-or-global, default+user-authored) · ③ capability-Block
      registry (open, declared render-targets) · ④ templates (fork-on-instantiate) · ⑤ ⭐ **capability-authoring
      security model** (sandbox + permission envelope, reuses ADR-004 SS-6 + extension-model — user-authored Blocks
      at-risk but ZK-safe) + `core/business-rules.md` personalization-within-ZK invariant + `spaces` entity + manifest
      re-sequence (Languages off, Spaces CORE). `docs/intake/spaces.md` (WHOLE).
- [ ] **NEW (Pomodoro 07-15) — ADR-004 amendment + Focus Mode design-pass** (build-phase) — ① **ADR-004
      amendment:** pomodoro = the `focus` sub-type **runtime** (re-home `pomodoro_sessions` Notes→Sessions realm,
      re-point at `session_id`, add pause/interruption fields, fold into the `focus` runtime; **reverses SS-11's
      Notes-ownership half**). Composes ADR-004; no new standalone ADR. Reconcile Sessions + Notes CURRENT- docs
      when built. ② **Focus Mode design-pass:** the polymorphic, platform-adaptive (mobile/desktop/web),
      tool-bearing, low-distraction runtime — per-session-type tool-sets (workout→Health, reading→Books, work→
      Tasks) × per-platform states × per-type break-guidance (hydrate/recompose/rest). Big INTENDED surface (code
      = 0 lines). Rides the Sessions Integration Contract; no new cross-module edges.
- [ ] **NEW (Routines 07-14) — Routines design-pass** (build-phase) — the `step_type` taxonomy internals (how each type resolves + drives its entity/Session sub-type), the task↔routine membership model (step-scoping), and the **policy engine** (completion policy · miss policy · acceptance window) as a user-configurable surface (rides Preferences + Spaces). Composes ADR-004; no new standalone ADR.
- [ ] **Cross-format position mapping — design pass** (Books B4) — transcription + TOC-anchor matching between asset formats (page↔timestamp↔location); states synced/pending/failed; runs under the Books governing principle. Own mini-intake before speccing internals.
- [ ] **Books governing principle** (Books B3) — Books-scoped instance of the extension-model principle (TTS, transcription, ISBN lookup, photo OCR: opt-in, consent step, user owns risk, OS safety net, manual fallback always). Fold into the extension-model constitution amendment (Projects-surfaced, above).
- [ ] **Quote-embed editor block** (Books B13) — new Notes/Pages platform block ("use quotes from Books"), per-book>global toggles via Preferences. Spec on the Notes & Pages / @vida/editor side at build.
- [ ] **Per-module VIEWS review pass at build time (Victor, 07-05)** — every documented module's view/page structure was captured at INTENT level and may carry gaps (Books B13–B16 pattern: gaps surface when entity correlations are drawn). Before building a module's UI: review its view structure, fill gaps, run /critique on the refined views. Flag lives in docs/README.md §Notes.
- [ ] **Notes & Pages tag-system refinement** — tag SCOPING (universal vs module-specific), surfaced by Relationships G10. Revisit when documenting Notes & Pages contract for tags / build phase.
- [ ] **Platform onboarding (G_meta)** — per-module + one global onboarding; personalization surface compounding across Preferences/Tasks/Habits/Finance/Relationships. Revisit after Wave 1.
- [ ] **Global Calendar page (NEW platform surface)** — standalone, read-only cross-module aggregator of events + tasks + reminders in multiple views. Surfaced by Relationships G1 (reminders viewed there, not in-module). Joins journal + onboarding as cross-cutting surfaces. Revisit after Wave 1.
- [ ] **Fiscal & Legal context (NEW emerging context — Victor 07-07)** — cross-module (Finance ↔ Projects legal-entities ↔ Purpose long-run). Situate user + entities per jurisdiction, per-jurisdiction public rule-packs, obligation tracking (→ Tasks/Notifications/Calendar), long-run what-if planning; opt-in AI advisement + living-ruleset refresh in the guarded extension layer. **Largest concrete instance of the two ZK ADRs below** (external-data-ingestion + AI/LLM) + validates the extension-model principle. Scope reframe urged: situate/organize/plan, NOT file-taxes-for-any-country (regulated/liability). Captured-intent stub: `docs/intake/fiscal-legal.md`. ⏸ **DEFERRED to POST-ALL-WAVES (Victor 07-07)** — Victor returns to enhance it after every wave is done; do NOT schedule its Phase-1 before then. Placement (own vs Finance sub-feature) = Victor's call then.

### ✅ Done this session
- [x] (#1) Create /documentation command  →  ~/.claude/commands/documentation.md
- [x] (#2) Run /new-scenario → documentation-blueprint scenario + router row + framework reference doc

## Parked (NOT this session — filed in ~/dev-toolkit/.claude/tasks/)
- audit-toolkit-scan-and-legacy-cascade (major) + migrate-{init,begin,clone-setup,map-repo,read-project} + assess-scaffold-project
- NEW: integrate /task-new ↔ native task panel (the sync gap found this session — see Notes)

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| Foundation default → documentation-blueprint | scenario switch | project is a documented v2 rebuild, not greenfield | ✓ scenario built |
| documentation-blueprint → toolkit-fix detour | structural | /documentation + layer-docs crash on large repos (unbounded scan) | ✓ Steps 1–5 + reroute DONE |
| toolkit-fix → document-first reroute | process | building before documenting caused rework; dogfood the framework on ourselves | ✓ workflow built + dogfooded on Step 3 |
| Step 3 sub-agents → script-only signals | over-engineering | budget already bounds to one context; signals must be facts not guesses | ✓ re-scoped, de-guessed |
| Routines intake → v1 scope audit | scope risk (Victor) | v1 COMPLETE_SYSTEM_ARCHITECTURE planned modules v2 silently dropped | ✓ Wave R created (Health/Duties/Skills + Commitments/Investigations), all KEEP |
| Routines → re-sequenced to Wave 4 | dependency | it orchestrates modules not yet documented (Learning/Health/Duties) | ✓ fill order updated; intake parked mostly-whole |
| Learning single context → 5 sub-contexts | token discipline | ~17 tables would blow the one-context budget | ✓ decomposition recorded; Skills separated as own module |
| Courses & Classes → Learning: Education reframe | intent mismatch (Victor) | flat course list ≠ envisioned 8-level academic hierarchy | ✓ reframed, intake WHOLE, documented + gate PASS |
| Learning: Books → BOOKS module extraction | intent mismatch (Victor) | v1 Books "worst version ever"; envisioned = reading Universe w/ Education partition, not a Learning sub-extension | ✓ extracted, intake WHOLE (B1–B16, double-critique), documented + gate PASS |
| Learning: Knowledge → KNOWLEDGE module extraction | intent mismatch (Victor) | v1 minimal/nerfed (Education-only, hard-coded Ultralearning); envisioned = knowledge Universe, most-personalizable module w/ Education partition | ✓ extracted 07-10, intake WHOLE (K1–K12 + KN-A/B/C), documented + gate PASS (2 No-Guessing defects caught+fixed) |
| Learning: Study Sessions & Planner → SESSIONS & SCHEDULING extraction **+ PROMOTION to foundation** | intent + altitude mismatch (Victor) | OS had 9+ scattered session entities with no shared spine; a per-course planner couldn't see the rest of life; sessions must be an OS primitive with rich cross-module integration | ✓ extracted + PROMOTED 07-12, intake WHOLE (G1–G10 + S1–S5), documented + gate PASS; surfaced Session Framework ADR |
| Learning: Flashcards → KNOWLEDGE study-method SERVICE (demotion into Knowledge) | altitude mismatch (Victor) | v1/v2 welded SRS + decks + reviews into flashcard-specific tables; intent = a pluggable study-method service on Knowledge's generic engine, first of a family (assessments/self-test/…) | ✓ reframed 07-12, intake WHOLE (F1–F8 + F-SVC), documented + gate PASS; surfaced ADR-005 Study-Method Service framework; 3 v2 tables retired |
| Journals: page (Notes & Pages) vs ENGINE (Journals) | boundary + dep-graph | N&P (Wave-0 foundation) already owns the journal page; aggregating all modules from it = a cycle; the engine must sit above the modules | ✓ distinct context 07-12; J4 grew into a snapshot-based Review & Analytics subsystem; intake WHOLE (J1–J8); documented + gate PASS; **Wave 2 COMPLETE** |
| Purposes & Goals (Wave 3) → **CAPSTONE** + full remaining re-sequence | altitude + dependency (Victor) | PG1 intake revealed Purposes is the OS **meaning-spine** — ladders up every module (incl. undocumented Health/Skills/Routines); speccing its rollup now = No-Guessing violation. Twin of Journals (operational plane) → closes the feature effort (meaning plane) | ✓ 07-13: Purposes → capstone; remaining re-sequenced dependency-correct; intake PARKED w/ PG1 captured; manifest+features/README+TASKS updated |
| **Languages module → DISSOLVED into Spaces** (new CORE foundation) | altitude / foundation-first taken to its limit (Victor) | Languages intake + Victor's probing ("could the user assemble it from tags/views without a module?") showed a whole module = a **configuration of generic seams**; the residue (pronunciation A-B-A) = a specialized capability, not a module. Surfaced 4 missing primitives: **universal tags · saved views · capability Blocks · templates** = **Spaces** (Personalization & Composability foundation) | ✓ 07-13: Languages off module list → worked-example; **Spaces** intake + gap map SP1-SP9 captured, name locked, primitives+Templates confirmed; gaps DEFERRED to exec #8 (touches every module → accumulator grounds them) — before Purposes capstone (needs universal tags); **Health now active (#1)** |
| **Expansions batch (#4): all 3 → composition / no new entity** | altitude (Victor probing) | Victor challenged each proposed addition ("why an entity? how does it differ from what exists?") | ✓ 07-15: Finance→Commitments = management sub-context (composes existing flows, Victor: "a layer not an entity"); Projects→Investigations = deliverable(artifact)+Knowledge-Lab (Victor: "resolve by composition, no entity"); Learning verify = already covered by Education. Wave R fully reconciled; zero new tables added |
| **Routines: parked intake → COMPOSITION reframe on resume** | reconciliation (dep-graph moved) | parked 06-30 before Sessions&Scheduling (ADR-004), Health, and the Tasks duty/obligation types were documented; on resume those foundations already provide the step "modes" the intake said needed a bespoke design pass | ✓ 07-14: §D reconciliation (compose Session sub-types + native completion; G_new Exercises=Health superseded) + §E resolution (user-configurable completion/miss policies + acceptance window + lifecycle; policy-derived streak; actionable=recurrent-Task; step-scoping); intake WHOLE; 5 aspect docs; gate PASS |
| **Duties module → DISSOLVED into Tasks + Spaces** (task types + presets) | altitude (Victor) | the defining intake, after harvesting v1 MasterDuty + rich Notion (Master→instance→tasks engine for Duties AND Obligations), showed the whole thing is a **configuration of generic seams** the OS already has (Tasks entity + Scheduler + Spaces presets) — not a module. Duty & Obligation = different **task TYPES** with distinct patterns/contexts/deliverables, each a **preset tab** (own UI/UX). Same move as Languages→Spaces | ✓ 07-14: defining intake complete; DISSOLVED; D1(recurring-responsibility)+D3(compose-seams) locked, D2(Obligation stays a Task type)+extensibility(Duty+Obligation=2 shipped presets, user-extensible); intent landed in Tasks ADDENDUM + Spaces accumulator; manifest/fill-order/scope-recon updated; off the module list |
| **Bucket List → DISSOLVED into Spaces** (+ `bucket_list_items` collapses into `dreams`) | altitude (Victor, sincere reframe) | asked what the feature really is → "a separated View of things I want to do before I die, with progress, to envision them" = a Space, not a module; and the items ARE Dreams (the `dreams`/`bucket_list_items` overlap PG8 flagged) | ✓ 07-15: dissolved (3rd Spaces worked-example after Languages/Duties); PG8 resolved (one Dream entity, `bucket_list_items` retires into `dreams` at build); intent threaded → spaces.md accumulator + purposes-and-goals.md PG8; stubs deleted; off module list; next = #7 Spaces |
| **Pomodoro → capability in the Sessions realm** (not a module; boundary moved Notes→Sessions) | altitude + consolidation (Victor) | every piece of a "Pomodoro module" was already owned elsewhere (Notes table+block, Sessions `focus` sub-type + `attach_pomodoro`, Preferences config, Tasks ledger); Victor: the OS is complex enough to handle it "only within the Sessions realm, not leak to any other entity" | ✓ 07-15: documented as a thin capability-doc (G0=B, own `pomodoro/` context); G2 Sessions-realm-only (timer = `focus`-session runtime keyed by `session_id`); v1 richness reshaped (not restored as-is); Focus Mode = polymorphic×platform×tool-bearing INTENDED; boundary reconciled across Sessions(SS-11 reversal)+Notes; ADR noted-at-build (ADR-004 amendment + ADR-002 re-home); gate PASS |
| **Spaces Transform → per-ADR draft→critique→revise loop** (5 ADRs, each critiqued as created) | Victor: "the nature of this critique … good to critique the other ADRs to see if they are well founded" | a foundation ADR set is load-bearing for the next ADR; a single end-of-set critique would miss cross-ADR drift and let per-ADR defects compound | ✓ 07-15: every ADR (006–010) drafted → /critique (director+engineer) → revised → accepted before the next; each found a REAL defect (R1 unify-reframe · V1 provider-delegated predicates · E1 capability≠Session · T1 authored-vs-accumulated · S1/S4 compositional-consent+TOCTOU); holistic Verify then caught G1 (INT-1 ownership drift) no per-ADR pass could see. Gate PASS; Accepted |
| **Health current-intent pass (retro-fix)** + Disciplines/capacities → Physical Roles merge | intent enrichment (Victor) | the prior Health docs were transformed from the polished System-2.0 summary; Victor's older System-1.0 DBs + Management hubs carried design DNA the summary abstracted away (clinical biomarkers, Domains/Factors/Exams monitoring, functional nutrition, Physical Roles, Duties wiring) | ✓ 07-14: re-harvested 23 Notion pages (6 MCP agents) → 6-pt delta → co-created CI-1..CI-6 (authoritative) + coherence/realism validation (R1-R4 + C1) → 12 aspect docs enhanced → **re-gate PASS**; **Physical Roles** now the canonical trainable-capability concept (heavy Skills resource) |
| **Before exec #8 → whole-set ADR CRITIQUE GATE** (all 10 ADRs) | verification (Victor) | Purposes capstone builds on the Spaces set (006–010); the 07-15 Transform critiqued each ADR *as drafted* but never read the frozen set together — cross-ADR delegation chains, competing registries, and ADR-002 drift are whole-set-only findings | ✓ 07-16: Phase A (001–005) + Phase B (006–010) + holistic synthesis, 1 reader-critic/ADR; **all 10 = REVISE**; 5 throughlines (① ADR-002 stale-vs-newer · ② guarded-write/idempotency never grounds out · ③ O1/O2 seams · ④ base correctness: HKDF/wall-clock-LWW/encryption-vs-query · ⑤ ZK overclaims); F1–F15 fix menu + D1–D7 decisions; report → **docs/reviews/2026-07-15-adr-critique-gate.md**; NO ADR edited. **Next: revise + solve F1–F15.** |
| **ADR revise pass — safe 🟡 batch (F5/F8/F9/F4-hdr)** | fix execution | first pass off the F1–F15 menu; low-risk doc-alignment before the architectural fixes | ✓ 07-16: F5/D6 HKDF→BLAKE2b (Victor signed off after explanation; verified vs vault.ts) · F8 ADR-009 ZK-precision · F9 ADR-010 honest-bound + granted_envelope_hash · F4-hdr ADR-002 amenders 003–010 + owed-ledger note. Verify caught 3 residual "by construction" + a stale HKDF diagram → reconciled. Committed **798c38b** |
| **ADR revise pass — F1/D1 (deepest, throughline ②)** | fix execution (full §XXVI gate) | guarded-write + idempotency delegated in a loop (010→008→004→010), never specified | ✓ 07-16: PLAN → /critique → Approval 1 (D1-a/b/c) → /preflight → **independent adversarial critique subagent = REVISE** (B1 projection-effects · B2 additive-no-key · B3 multi-device double-count · B4 feature cites · N1/N4) → all closed → Approval 2 → 7-step implement → Verify PASS. Grounded into **ADR-004 §3.2.5** (owner); INT-2 added; SS-6 grounded; deterministic `effect_event_id`. Committed **83e4842** |
| **ADR revise pass — F2/D2 (O1 registry boundary, throughline ③)** | fix execution (full §XXVI gate) | ADR-005 `study_methods` + ADR-008 capability registry = two registries of the same shape, boundary unstated | ✓ 07-16: **D2=A** (one registry; `study_method` = kind-specialization is-a) chosen at PLAN → /critique = REVISE (R1 anatomy-crosswalk · R2 owed-ledger-location · R3 BR-6-scope) → Approval 1 (D2 + D2-a=PC-2a) → /preflight → **independent adversarial critique = REVISE** (is-a survived; **B1** dropped `role` axis · **B2** `registerMethod`/`listMethods` 2nd chokepoint the noun-grep missed · B3–B6) → all closed → final /critique+/preflight → Approval 2 → 6-step implement → Verify PASS. ADR-008 **§3.3a crosswalk** (is-a shown); ADR-005 amended-by; **PC-2a** sub-note; owed-ledger reconciled (ADR-002 untouched, D5). Committed **4091bd8** |
| **ADR revise pass — F3/D3 (O2 registry/placement boundary, throughline ③)** | fix execution (full §XXVI gate) | ADR-006 `spaces.enabled_blocks` (→ ADR-008) never defined in ADR-008; `block_instances` never named in 006 — dangling forward-ref both directions | ✓ 07-17: **D3 = keep-both-distinct** (`enabled_blocks` = authored offered-capability **palette** of definition refs; `block_instances` = standalone **placements**; "drop as derivable" rejected — grounded by SP6 + SP5/ADR-009) chosen at PLAN → /critique = REVISE (R1 inline/standalone scope · R2 hard-⊆-vs-lifecycle · R3 kind-vs-definition) → Approval 1 (D3/D3-a/D3-b/D3-c) → /preflight PASSED → **independent adversarial critique = REVISE** (core survived; **B1** SP4 [FACT] was an inference → grounding honestly 2-legged · **B2** "additive not a restriction" left field toothless → **teeth-by-surface** · **B3** "not derivable"→"stored not projected" · B5 README-L10 · B4-nit strike "/view" · B6 no-PC-re-argued; **B4/B7 held**) → all closed → Approval 2 (B2 signed off) → 5-edit implement → Verify PASS. Ref closed both directions (ADR-006 §3.4 palette ¶ · ADR-008 §3.4 reciprocal + §5 · ADR-009 §3.1 tie · README L10+L44 · owed-ledger). ADR-002 body + code untouched (D5). Committed **0a5f8be** |
| **ADR revise pass — F6/D4 (LWW clock, throughline ④)** | fix execution (full §XXVI gate) | ADR-002 labels `_sync_lww_ts` "Logical" but code sets `Date.now()`; cross-device skew silently loses writes | ✓ 07-17: **D4 = adopt a Hybrid Logical Clock** (causal order, device-id tiebreak, client-side) → /critique REVISE (R1 packing-math overflows JS 2⁵³ *now* → representation → build-phase) → Approval 1 → /preflight → **adversarial critique = REVISE** (HLC survived; **B1** representation couples to wire header + `blob_index` · **B3** deletes rode raw wall-clock → BR-9 ride the HLC · **B4** label inventoried-not-edited) → Approval 2 → implement → Verify PASS (2 drift). `packages/` diff=0. Committed **586ead6** |
| **ADR revise pass — F7/D7 (encryption-vs-query trio, throughline ④)** | fix execution (full §XXVI gate) | E-`INTEGER` money can't be SQL-aggregated; indexes over ciphertext can't function; FTS5 external-content over ciphertext + phantom cols | ✓ 07-17: **D7 = keep-encrypted, pay-compute** (money E+decrypt-in-memory · category E+blind index · content-less FTS-2) → /critique REVISE (R1 FTS fork) → Approval 1 → /preflight → **adversarial critique = REVISE** (trio confirmed vs vault.ts; **B1** defect domain-wide ~16 E fields · **B2** citation catch: PRF is keyed-BLAKE2b not HMAC + ADR-001:77 domain-sep · **B3** FTS-2 "never to disk" overclaim) → Approval 2 → implement → Verify PASS (security-model.md mirror). `packages/` diff=0. Committed **843a590** |
| **ADR revise pass — F4-body/D5 (ADR-002 consolidation) — LAST fix; REVISE PASS CLOSED** | fix execution (full §XXVI gate) | ADR-002 body stale vs every newer ADR; owed-tables ledger under-scoped + in a review doc; D5 write-vs-track unratified | ✓ 07-17: **D5-a=TRACK · D5-b=new ADR-002 §5.20** → /critique REVISE (R1 module stream missing · R2 CHECK mis-filed · R3) → Approval 1 → /preflight PASSED → **adversarial critique = REFUTED 2/4** (No-Redesign+Grounding survived; **B1** [load-bearing] grep proved **19 module structure-data docs owe ADR-002 amendments** — bucket (ii) was a sliver → reframed to complete **named-not-enumerated** tier · **B2** owed `fts_knowledge` · **B3** TRACK-justification overstated "all defer" → ✓/⏳/↔ readiness marker · **N1** ADR-003 has no Amends line, `_sync_field_ts` is §17) → Approval 2 → implement → Verify PASS (caught ADR-006 L122 stale pointer → §5.20). Wrote **ADR-002 §5.20** owed-tables ledger; repointed ⚠ note + ADR-004/006; forward-notes §7/§8. `packages/` diff=0. **← F1–F15 REVISE PASS COMPLETE.** Spec: `docs/specs/adr-revisions/f4-body-d5-adr002-consolidation/PLAN.md` |

## Failures This Session
*(none — no runtime/step failures. As in F2, F3's adversarial critique caught pre-implementation defects the self-critique missed: **B1** (an SP4 "[FACT]" that was really an inference — the recurring citation-honesty defect class), **B2** (the palette was left toothless — "additive, not a restriction" with no enforced consequence), **B3** (a refutable "not derivable" phrasing). Gate working as designed, not a failure. Standing lesson across F1/F2/F3: self-critique catches structural gaps (R-items); the fresh refuter is where the load-bearing catches (B-items) come from — keep the adversarial pass on every 🔴/architectural fix.)*

## Notes
- Task-system sync gap discovered: toolkit /task-new (markdown files) and Claude Code native task panel
  (TaskCreate) are not bridged. This session: panel is the live view, mirrored here + in TASKS.md.
  Going forward both are kept in sync. A toolkit fix to integrate them is parked above.
