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
- [ ] **Duties** (NEW context) — distinct from Task/Obligation/Routine (v1 MasterDuty). Needs a DEFINING mini-intake before placement.
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

### ▸ Wave 2 (in progress)
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
- [ ] NEXT → Wave 2 cont.: **Journals** (the last Wave-2 context; aggregates study/sessions/mastery).
      ⚠ First: commit the Flashcards + ADR-005 batch.

### ▸ Follow-up surfaced by Step 6 Verify
- [ ] ADR amendment: record the HKDF → BLAKE2b-256 Vault Key decision. Code (vault.ts) is authoritative and deliberate ("replaces HKDF"); ADR-001 §Key Model + CLAUDE.md still say HKDF. Run /adr-new (amend ADR-001) + fix CLAUDE.md — needs Victor's sign-off before editing the ADR.

### ▸ Candidate ADRs / decisions surfaced by feature documentation (build-phase, own sessions)
- [ ] **HIGH — CORE constitution amendment: the "extension-model" principle** (Projects, Victor 06-29) — ZK core is unchanged by integrations; external/AI integrations are OPT-IN, user-owns-the-risk, wrapped in a protection layer. Amend docs/core/business-rules.md; this principle FRAMES both ZK ADRs below. Needs Victor's go.
- [ ] **ADR: External DATA ingestion under zero-knowledge** (GENERALIZED — Finance G2/FN-9 + Projects G4 third-party metrics + **Fiscal&Legal 07-07 legal-rule-packs, the softest/public-data instance**) — bank/investment APIs + CSV/OFX + social/marketing metrics (Instagram/YouTube/email) + per-jurisdiction legal rules vs "server never sees plaintext". Options: device-direct (pure ZK) / aggregator (documented dent) / server-proxy (breaks ZK, rejected). Touches server + sync → its own session.
- [ ] **ADR: AI/LLM integration under zero-knowledge** (Projects G6 + **Fiscal&Legal 07-07 tax/legal advisement over private numbers**) — documents-as-context + AI features. Victor's intent = AGENTIC, ON-DEVICE ("within") = the ZK-safe path; cloud model = opt-in plaintext dent. Own session.
- [ ] **Deliverable measurement system — design pass** (Projects G4) — the multi-type taxonomy (financial/task-statistic/third-party-metric/activity-log/artifact) needs its own mini-intake before specc'ing internals.
- [ ] **Budgeting feature design** (Finance G12) — no model in v2/v1; needs its own mini-intake (period, per-category limits, rollover, alerts, Purpose integration). May graduate to its own feature context (own manifest row).
- [ ] **ADR-002 amendment (consolidated)** — now spans Preferences (6 fields + visibility store) · Tasks (5 additions) · Habits (G8 4 fields + G7 + G9) · Finance (opening_balance, G9 restored fields, import-staging, budgeting, liability-payments, base-currency/FX, managed categories, shared-tags migration) · Relationships (network_groups + junction, closeness_tier, how_we_met, interaction energy/key_takeaways, reminder snooze/priority, event-anchored group reminders) · **Books (07-05: book_assets, annotations ×3, reading_sessions+photos, reading_plans+junction, book_subjects, mapping data; supersede format/current_page/progress/genre/tags columns; entity_links annotation types)** · **Knowledge (07-10: knowledge_objects+object_kinds+learning_realm, knowledge_containers, study_methods/review_curves/method_bindings, review_events, compound_sets, references, knowledge_lab_entries, fts_knowledge; RETIRE knowledge_notes table + resource_type CHECK + fixed SM-2 cols + hand-set mastery_level + single linked_book_id; knowledge-note as pages entity_type)**. Consider ONE amendment in build phase.
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

## Failures This Session
*(none yet — On Failure protocol writes here)*

## Notes
- Task-system sync gap discovered: toolkit /task-new (markdown files) and Claude Code native task panel
  (TaskCreate) are not bridged. This session: panel is the live view, mirrored here + in TASKS.md.
  Going forward both are kept in sync. A toolkit fix to integrate them is parked above.
