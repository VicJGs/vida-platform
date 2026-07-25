---
Date: 2026-06-07
Session goal: Set up dev-toolkit on existing vida-platform monorepo
Profile: Generic Coding Session
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, Hono/Cloudflare Workers
Status: initialized
Next session should: continue with feature/enhancement work now that toolkit is wired up
---

---
Date: 2026-06-08
Session goal: Complete toolkit setup; verify workspace typecheck
Profile: Generic Coding Session
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, Hono/Cloudflare Workers
Status: completed
Next session should: push main and verify CI (frozen-lockfile + typecheck 10/10)
---

---
Date: 2026-06-08
Session goal: Establish project foundation for Vida Platform (define → scope → skeleton → decisions → timeline)
Profile: Project Foundation Setup
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, Hono/Cloudflare Workers
Status: in_progress
Next session should: continue from the foundation milestone defined this session
---

---
Date: 2026-06-09
Task: documentation-blueprint
Goal: Build the discovery-driven documentation framework + fix the toolkit's unbounded-scan crash risk; then document vida-platform.
Completed:
  - TOOLKIT FOUNDATION (all in ~/dev-toolkit unless noted), built + dogfooded:
    - scripts/survey-repo.js — bounded, crash-proof repo surveyor (paginated/G1, pre-resolved slices/G2, cycle-safe, deterministic). ADR-006. 15 unit tests + 3-target scalability proof (vida/life-os/synthetic-12k @ 1.9s/52MB).
    - scripts/lib/repo-signals.js — facts-only per-layer signals (fileNaming/exportKinds/imports/importedDeps/colocatedTests), JS/TS-only, grounded in declared deps. 9 unit tests. (sub-agents dropped; signals de-guessed.)
    - Document-first workflow: ~/.claude/commands/documentation-component.md (NEW), templates/forward-spec.template.md, No-Guessing Principle (framework ref doc), per-step build gate (memory), docs/specs/ registry + structure (unit=folder, prompt=file).
    - Refactors: ~/.claude/commands/layer-docs.md + documentation.md Phase 0 → consume the survey (no tree-walk; layer-docs "prefer largest" bug deleted).
  - Forward specs for every build live in ~/dev-toolkit/docs/specs/ (survey-repo, repo-signals, the 2 refactors, the reroute).
In progress:
  - Toolkit foundation COMPLETE. The actual session goal (document vida-platform) NOT yet started — Steps 6–8.
Decisions:
  - ADR-006 (bounded repo-survey primitive). Document-first + No-Guessing is now the DEFAULT for all code work (per-step two-approval build gate). Sub-agents rejected for the survey (budget already bounds to one context). Signals = facts only (interpretation stays with the consumer). Locked: D1–D4 (spec structure), D-a–D-e (module path, tests dir, layer-docs survey call, `commands` bucket, one-prompt `_index` layout).
Next session:
  - Step 6 (#11): run `/documentation` (no scope) in vida-platform → Phase 0 surveys it (survey-repo.js --structural-only) → manifest + docs/core/ (incl. business-rules.md = the system constitution from the ADRs).
  - Step 7 (#12): pilot Notes & Pages via `/documentation-component` (the integration hub — ADR-002 §5.2; 6 tables already in @vida/types).
  - Context to resume without re-explaining: the whole toolchain is built and dogfooded — just RUN it on vida-platform. Survey cache: vida-platform/.claude/cache/repo-survey/. Specs: ~/dev-toolkit/docs/specs/. Authoritative docs: ADRs + docs/architecture/* (docs/architecture.md is LEGACY).
---

---
Date: 2026-06-13
Task: documentation-blueprint
Goal: Kick off Step 6 (Phase 0). Discovered it was already done in the working tree (06-10) but never committed/logged — pivoted to verify + seal.
Completed:
  - Onboarded repo to tracker: .claude/tracker.json = {personal, "vida-platform"} (reused existing Linear initiative, ADR-007). Pushed tasks to Linear.
  - VERIFIED the unsealed 06-10 Phase 0 against fresh survey + ADRs (Phase 3-style gate). Manifest structure sound (8 workspaces confirmed). 16/18 constitution invariants trace clean.
  - DRIFT FOUND + FIXED: ZK-3 falsely claimed ADR-001 agreed with code on key derivation. Truth: vault.ts uses BLAKE2b-256 (authoritative, deliberate per L82); ADR-001 §Key Model L74/L76 + CLAUDE.md both say HKDF. Corrected the drift note + citation; added change-log entry.
  - Filled the 2 missing CORE aspects: docs/core/conventions.md (from CLAUDE.md + ADR-002) and docs/core/server-api.md (Contract stub — flagged: routes/{auth,sync,billing}.ts are 0-line stubs, surface harvested from ADR-001/003, NOT code).
  - Updated manifest status tracker. Sealed everything: commit 1db3dcd (108 files). Added .claude/cache/ + .tracker-map.json to .gitignore.
In progress:
  - Step 6 DONE. Step 7 (pilot Notes & Pages) is next — intake already started (docs/intake/notes-and-pages.md, committed).
Decisions:
  - Did NOT re-run Phase 0 (would clobber reviewed cited work). Did NOT edit ADR-001/CLAUDE.md for the HKDF→BLAKE2b drift — that needs Victor's sign-off (filed as follow-up).
  - Committed docs to main (consistent with prior docs commits 437fe1b/c9e372d), per the approved seal step.
Next session:
  - Step 7 (#12): document Notes & Pages (Wave 0 hub, in-degree 14) via /documentation features/notes-and-pages — Phases 1→2→3. Intake doc exists; reconcile the 5 legacy module-spec files in docs/features/notes-and-pages/ into the aspect structure.
  - Pending follow-up: ADR amendment for HKDF→BLAKE2b vault key (amend ADR-001 + fix CLAUDE.md) — needs sign-off.

---
Date: 2026-06-18
Task: documentation-blueprint
Goal: Step 7 — pilot the documentation framework by documenting Notes & Pages (Wave 0 hub) end to end (Phases 1→4).
Completed:
  - PHASE 1 (Intake): existing intake was harvested (v2+v1+deltas) but gaps open. Found the "5 legacy spec files" were EMPTY scaffolds → D5b incorporation was a no-op. Resolved gaps G1–G8 with Victor; SCOPE REFRAMED MVP→full v1 (nothing deferred). Marked intake WHOLE. (docs/intake/notes-and-pages.md)
  - PHASE 2 (Transform): wrote 5 canonical aspect docs in docs/features/notes-and-pages/ (identity · business-rules · contract · structure-data · conventions), every claim tagged [FACT]/[INTENT]/[INTERP]/⚠INTENDED. Deleted the 5 empty pre-framework scaffolds (module-spec, service-contract, state-management-map, component-catalog, page-map).
  - STRUCTURAL DECISION (sets precedent for all 17 features): feature docs aligned to the canonical 5 aspect filenames (Option 1, Victor-approved). structure-data absorbs state-management-map + page-map; component catalog → Components level. Manifest Levels×Aspects row + status tracker + top status updated.
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. vs intake (8/8 gaps), vs sources (6 tables / 33 entity types / Yjs / FTS5 / journal-unique / routes all match ADR-002/003 + note.ts), vs constitution (ZK-1/LF-2/§6 compliant). No silent drift.
  - PHASE 4 (Accept): Notes & Pages ✅ across all 5 aspects in the manifest.
  - STEP 8 (indexes + /session-log loop): wired the index layer — created docs/features/README.md (17-module status table + fill order, Notes & Pages linked to its 5 aspect docs), docs/core/README.md (core aspect index), and filled the 4 empty level READMEs (infrastructure/editor/ui/platform) with pointer stubs (no faked content). Updated REPO.md "Docs & decisions" to point at the manifest + indexes. Confirmed the /session-log loop: each entry's "Next session" names the next fill-order context → next session resumes from the artifact.
Decisions:
  - Feature level uses the canonical 5 aspects (consistency with core + framework) — precedent for the remaining 16 modules.
  - G4 entity-note seed pinned as CLIENT-SIDE deterministic from entity fields (zero-knowledge); never server-side.
  - G6 entity-link UX recorded TENTATIVE (revisit at implementation, per Victor).
Open / flagged:
  - G5: JournalSummaryConfig (note.ts) has 5 toggles; full personalizable section set is ⚠ INTENDED, not shipped → build-phase type expansion + candidate /adr-new. Needs Victor's go to write the ADR.
  - Carry-forward: HKDF→BLAKE2b ADR amendment (still pending sign-off).
  - Not committed yet (awaiting Victor's go).
Also this session — PREFERENCES (Wave 0), full Phase 1→4:
  - Intake harvested v2 (ADR-002 §5.17, 3 all-plaintext tables) + v1 (life-os src/features/settings — substantial: debounced autosave, merge-defaults, searchable tabbed UI, profile/account/AI/social baggage). Resolved G1–G8 with Victor.
  - Decisions: G1 Preferences owns the Settings SCREEN but DELEGATES account/security→Auth and import/export→Data/Sync (owns only its 3 tables). G2 social fields dropped, G3 AI fields dropped (ZK). G4 keep-all config (superset → 6 new fields flagged INTENDED). G5 per-module visibility system AND feature_gamification kept (distinct concerns). G6 Cmd+K palette. G7 tabbed+searchable (flexible grouping). G8 keep merge-defaults + debounced optimistic autosave + theme→store.
  - Wrote 5 canonical aspect docs (docs/features/preferences/). Verify + foundation gate PASS. Manifest + features index → Preferences ✅. **Wave 0 COMPLETE** (Notes & Pages + Preferences).
  - KEY ZK NOTE captured: "plaintext config" = no L2 field encryption only; L1 (SQLCipher at rest) + L3 (sync blob) still encrypt → server never sees it, ZK holds.
Also this session — TASKS (Wave 1), full Phase 1→4:
  - Intake harvested v2 (ADR-002 §5.3 tasks + task_time_logs; @vida/types/task.ts; CLAUDE.md §3) + v1 (life-os tasks). Resolved G1–G9.
  - Decisions: G1 ALL 12 base layouts + a saveable view-builder (view = saved config). G2 at-most-one parent, standalone first-class. G3 single-level subtasks + rollup, no force-complete, cascade-delete. G4 actual_minutes = auto-sum of time_logs; timer + pomodoro both write logs (one ledger); per-task opt-out. G5 add completed_at. G6 add scheduled_date. G7 migrate to shared tags (deprecate inline tasks.tags). G8 Option A — task recurrence for OBLIGATIONS marked by a `kind='obligation'` classifier (deadline recurrence; behavior recurrence stays Habits/Routines). G9 focus opens pomodoro bound to task → writes time_log.
  - Wrote 5 canonical aspect docs (docs/features/tasks/). Verify + foundation gate PASS. Manifest + features index → Tasks ✅.
  - LARGEST INTENDED surface so far → one ADR-002 amendment: completed_at, scheduled_date, recurrence+kind, task_views (saved views), shared-tags migration.
Next session:
  - Wave 0 + Tasks done. Next fill-order: **Habits · Finance · Relationships · Check-ins** (rest of Wave 1), each via `/documentation features/<module>`, same Phase 1→4 loop.
  - Build-phase ADR-002 amendments queued: Preferences (6 fields + visibility store + @vida/types file) AND Tasks (5 additions above).
  - Carry-forward: HKDF→BLAKE2b ADR amendment (amend ADR-001 + fix CLAUDE.md) — needs Victor's sign-off.

---
Date: 2026-06-27
Task: documentation-blueprint
Goal: Continue /documentation fill order — document Habits (Wave 1) end to end (Phase 1→4).
Completed:
  - PHASE 1 (Intake): habits intake was harvested 06-18 (v2 ADR-002 §5.5 + habit.ts + v1 life-os) with gap map G1–G9 open. Resolved all 9 with Victor → marked WHOLE (docs/intake/habits.md Resolution + Change Log).
  - PHASE 2 (Transform): wrote the 5 canonical aspect docs (docs/features/habits/: identity · business-rules · contract · structure-data · conventions), every claim FACT/INTENT/INTERP-tagged. Deleted the 5 empty pre-framework scaffolds (component-catalog, module-spec, page-map, service-contract, state-management-map).
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. Verified FACT citations against ADR-002 L1632-1701 (schema exact), habit.ts (@encrypted fields, enums), and confirmed core/src/models/habit.ts is EMPTY (0 lines) → "no core service yet" is accurate. Intent preserved (9/9 gaps → HB-1..HB-12). Zero drift.
  - PHASE 4 (Accept): Habits ✅ in features/README.md + manifest status tracker (docs/README.md) + top Status line.
Decisions:
  - G2 STREAK = consecutive *scheduled* occurrences; a miss resets to 0 (NO grace); counters recompute from the habit_completions ledger (cache). Feeds Gamification (HB-9, INTENDED).
  - G3 break-habit completion = "abstained today" (success-logged); relapse = no completion → reset.
  - G4 done when count>=target_count; partial logs for analytics but does NOT advance streak. count=reps, value=measured qty.
  - G6 quick-check default; mood/ease/satisfaction only via explicit detailed-log.
  - G7 CONTRIBUTORY purpose link (not navigational): a completion contributes to the linked purpose's metric via purpose_habits (Purpose owns the metric write). INTENDED — creates a real dependency Purpose docs inherit.
  - G8 RESTORE dropped v1 fields (INTENDED): habits.success_criteria + habits.difficulty; habit_completions.location + completion_time → candidate ADR-002 amendment.
  - G9 backfill allowed + recomputes streaks; WINDOW is a user-configurable Preferences setting (habit_backfill_window_days, INTENDED), not hardcoded.
  - G1 4 view surfaces: Dashboard (check any) · Today to-do (Calendar/List/Checkbox modes) · per-habit standalone · All-Habits Overview. (Dashboard vs Overview consolidation left to contract phase.)
Next session:
  - Wave 1 cont.: **Finance** next via /documentation features/finance (Phase 1→4). Then Relationships · Check-ins to close Wave 1.
  - Build-phase ADR-002 amendments now queued for THREE features: Preferences (6 fields + visibility store + @vida/types file), Tasks (5 additions), Habits (G8 4 fields + G7 contribution contract + G9 Preferences backfill setting).
  - Carry-forward: HKDF→BLAKE2b ADR amendment (amend ADR-001 + fix CLAUDE.md) — still needs Victor's sign-off.
  - Not committed yet (awaiting Victor's go — consistent with prior docs-commit cadence).

---
Date: 2026-06-27
Task: documentation-blueprint
Goal: Continue /documentation fill order — document Finance (Wave 1) end to end (Phase 1→4).
Completed:
  - PHASE 1 (Intake): harvested v2 (ADR-002 §5.8, 6 tables + finance.ts + CLAUDE.md §1) + v1 (life-os finances — 9-page feature, API.md, FinanceOverview, offline). Raised gap map G1–G12. Resolved ALL with Victor → docs/intake/finance.md WHOLE.
  - PHASE 2 (Transform): wrote 5 canonical aspect docs (docs/features/finance/), every claim FACT/INTENT/INTERP-tagged. Deleted 5 empty pre-framework scaffolds.
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. Schema verified exact vs ADR-002 §5.8 L1997-2189 + finance.ts; cascade rules confirmed (L2035/2036/2133); transaction = entity_links target (L3811). Caught near-miss: core/src/models/finance.ts + services/finance-service.ts EXIST but are empty (0 lines) → corrected contract.md wording. Intent preserved (12/12 gaps → FN-1..FN-13). Zero drift remaining.
  - PHASE 4 (Accept): Finance ✅ in features/README.md + manifest (docs/README.md) + top Status line.
Decisions:
  - G4 account balance = LEDGER-DERIVED (opening_balance + Σ transactions); never hand-set. → needs accounts.opening_balance (INTENDED).
  - G5 transfer = ONE row (type=transfer + transfer_to_account_id), EXCLUDED from income/expense totals.
  - G6 recurring = forecast template by DEFAULT; opt-in auto-generate (editable before confirm).
  - G7/G8 multi-currency YES; FX + prices fetched DEVICE-SIDE/manual (private), NEVER server. Future "fetch-on-your-behalf" service must be anonymizing/oblivious (NOT blockchain — corrected Victor's framing); advanced/deferred.
  - G3 derived aggregates computed client-side; storing them is user opt-in + user owns storage security.
  - G9 RESTORE: liabilities payment_frequency/next_payment_date/interest_type/payoff_date + income next_payment_date. Skip the rest (is_taxable, ownership_percentage, dividends→model as income tx, descriptions→notes).
  - G10 tags→shared system; categories→managed list + free-text subcategory.
  - G12 notes on all 5 finance entities. BUDGETING now IN SCOPE (was deferred) but undesigned → INTENDED, needs own design pass, may become its own feature. LIABILITY-PAYMENT view in scope (INTENDED).
  - ⚠⚠ CONSTITUTIONAL: bank/investment-API ingestion vs zero-knowledge → CANDIDATE ADR "External financial data under zero-knowledge". Documented ⚠ INTENDED + TENTATIVE only; verified-real surface = manual entry + client-side CSV/OFX.
Next session:
  - Wave 1 cont.: **Relationships** next via /documentation features/relationships (Phase 1→4). Then Check-ins to close Wave 1.
  - Candidate ADRs queued (own sessions): (1) External financial data under zero-knowledge [server+sync impact], (2) Budgeting feature design. Plus the growing ADR-002 amendment now spans Preferences + Tasks + Habits + Finance.
  - Parked platform concern (G_meta): per-module + global ONBOARDING (personalization surface compounding across modules).
  - Carry-forward: HKDF→BLAKE2b ADR amendment (ADR-001 + CLAUDE.md) — still needs Victor's sign-off.
  - Not committed yet (awaiting Victor's go).

---
Date: 2026-06-28
Task: documentation-blueprint
Goal: Continue /documentation fill order — document Relationships/CRM (Wave 1) end to end (Phase 1→4).
Completed:
  - PHASE 1 (Intake): harvested v2 (ADR-002 §5.9, 6 tables + relationship.ts + CLAUDE.md §6) + v1 (life-os relationships — full CRM: circles, health score, device import, neural graph, API.md). Raised G1–G12. Resolved ALL with Victor → docs/intake/relationships.md WHOLE.
  - PHASE 2 (Transform): 5 canonical aspect docs (docs/features/relationships/), every claim FACT/INTENT/INTERP-tagged. Deleted 5 empty scaffolds.
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. Schema exact vs ADR-002 §5.9 L2193-2364 + relationship.ts; CASCADE/SET NULL confirmed; contact=entity_links target (L3811); core/src/models/relationship.ts EMPTY (0 lines). Intent preserved (12/12 → RL-1..RL-12). Zero drift.
  - PHASE 4 (Accept): Relationships ✅ in features/README.md + manifest + top Status line.
Decisions:
  - G2 NETWORKS get schema: network_groups + network_group_contacts (many-to-many) → ADR-002 amendment.
  - G3 neural graph = membership edges only (contact↔network); NO contact↔contact edge table. Sigma.js.
  - G4 relationship health = DERIVED (frequency-vs-cadence + sentiment + energy) WEIGHTED BY CLOSENESS (onion theory); new closeness_tier (INTENDED). Network health = aggregate of members.
  - G1 reminders/events are VIEWED on a GLOBAL CALENDAR (parked platform surface), not in-module; Relationships' Reminders page only CREATES.
  - TASKS vs EVENTS clarified for Victor: event occurs (never completes) → spawns tasks/reminders; not a subtask. Calendar = read-only cross-module aggregator.
  - G5 stats derive from interactions ledger. G6 three reminder mechanisms coexist. G7 device import device-side/mobile-first. 
  - G8 restore how_we_met + interaction energy_given/energy_received/key_takeaways + reminder snooze/priority.
  - G9 networks AND contacts get standalone pages + notes via pages. G10 tags → shared system WITH SCOPING (universal vs module — Notes & Pages refinement). G11 group reminders optional + birthday-anchored for important people (never auto-send). G12 Tasks/Journal/Gamification confirmed.
Next session:
  - Wave 1 FINALE: **Check-ins** via /documentation features/check-ins (Phase 1→4) → closes Wave 1.
  - Parked NEW platform surface: GLOBAL CALENDAR page (read-only cross-module aggregator of events+tasks+reminders) — joins journal + onboarding G_meta as cross-cutting surfaces.
  - ADR-002 amendment now spans Preferences + Tasks + Habits + Finance + Relationships (5 features). Plus Notes & Pages tag-scoping refinement.
  - Carry-forward ADRs: external-financial-data-under-ZK, budgeting design, HKDF→BLAKE2b (still needs sign-off).
  - Not committed yet (awaiting Victor's go).

---
Date: 2026-06-28
Task: documentation-blueprint
Goal: Document Check-ins (Wave 1 finale) end to end (Phase 1→4) → CLOSE Wave 1.
Completed:
  - PHASE 1 (Intake): harvested v2 (ADR-002 §5.13 3 tables + L970 P/E rationale + CLAUDE.md §9). v1 had NO check-ins (the "today" page ≈ future Journal). Raised G1–G10; resolved ALL with Victor → docs/intake/check-ins.md WHOLE.
  - PHASE 2 (Transform): 5 canonical aspect docs (docs/features/check-ins/), every claim FACT/INTENT/INTERP-tagged. Deleted 5 empty scaffolds.
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. Schema exact vs §5.13; CASCADE/SET NULL/UNIQUE confirmed; daily_check_in IS a valid entity_links type (L1350); ZERO code confirmed (no @vida/types or @vida/core check-in file). Intent preserved (10/10 → CK-1..CK-12). Zero drift.
  - PHASE 4 (Accept): Check-ins ✅ → **Wave 0 + Wave 1 COMPLETE** (7 feature contexts). Manifest + features index + top Status updated.
Decisions:
  - ⚠ SCHEMA BUG caught: daily_check_ins.check_in_date is UNIQUE alone → forbids morning+evening same day. FIX = UNIQUE(check_in_date, check_in_type) (CK-2).
  - G3 check_in_type EXPANDS +afternoon/monthly_review/yearly_review (6 total); default template PER TYPE + full builder.
  - G5 hardcoded columns = built-in default template; custom_data = extra questions only (no dup).
  - G7 (significant) review check-ins (weekly/monthly/yearly) are a CROSS-MODULE REVIEW SURFACE — aggregate Purpose/Projects/Tasks progress; Purpose target_reviews happen inside. FORWARD DEPENDENCY (Wave1→Wave2/3) flagged INTENDED, contract finalized when those modules documented.
  - G8 per-template editable schedule → Preferences + Notifications. G10 check-ins link to Journal day page via entity_links (daily_check_in already valid, L1350) + reviews backlink reviewed entities; NO tags. G9 Gamification streaks INTENDED.
Next session:
  - **Wave 2 begins**: Projects · Routines · Journals · Learning (each /documentation features/<module>, Phase 1→4).
  - NOTE on fill order: Check-ins review contract (G7) + global Calendar surface both want Purpose/Projects/Journal documented — Wave 2 will let us finalize those forward contracts.
  - ADR-002 amendment now spans 6 features (Preferences/Tasks/Habits/Finance/Relationships/Check-ins incl. the UNIQUE fix + 3 new check_in_types). Candidate ADRs still queued: external-financial-data-under-ZK, budgeting, HKDF→BLAKE2b (sign-off). Parked platform surfaces: global Calendar, onboarding. Notes & Pages tag-scoping refinement.
  - Habits/Finance/Relationships committed this session (98bb631). Check-ins docs NOT yet committed.

---
Date: 2026-06-29
Task: documentation-blueprint
Goal: Wave 2 begins — document Projects (Wave-2 foundation) end to end (Phase 1→4).
Completed:
  - PHASE 1 (Intake): harvested v2 (ADR-002 §5.4 3 tables + project.ts + CLAUDE.md §2) + v1 (life-os projects: Kanban, time logging, actions, purpose links, docs). Raised G1–G11; resolved ALL → docs/intake/projects.md WHOLE.
  - PHASE 2 (Transform): 5 canonical aspect docs (docs/features/projects/), every claim FACT/INTENT/INTERP-tagged. Deleted 5 empty scaffolds.
  - PHASE 3 (Verify) + gate (victor:quality-gate-foundation): PASS. Schema exact vs §5.4 L1532-1625 + project.ts; nested milestones + CASCADE confirmed; project/milestone valid note targets (L1343); core/src/models/project.ts EMPTY (0 lines). Intent preserved (11/11 → PJ-1..PJ-12). Zero drift.
  - PHASE 4 (Accept): Projects ✅ → Wave 2 started. Manifest + features index + top Status updated.
Decisions (big module — most expansions yet):
  - G2 DEDICATED deliverables table (Project > Milestone > Deliverable > Task, 4 real levels).
  - G4 deliverable = MULTI-TYPE measurement system (financial / task-statistics / third-party-metrics / activity-logs / artifacts) — dynamic progress; NEEDS OWN DESIGN PASS.
  - G3 vision + mission = TipTap pages (not columns). G5 project time derived from task focus only (one ledger; no project timer). G6 documents = secure VAULT (large files via R2). G7 dedicated Tasks→Projects API for project-tasks.
  - G8 cross-module: + project_contacts(ROLE) (Relationships team/stakeholders), project↔Finance accounts, project events (→ global Calendar), plus existing habits/purposes/bucket-list + Check-in reviews + Gamification XP.
  - G9 user-personalized views (Kanban/timeline/board; archived = filter). G10 deliverable notes. G11 shared scoped tags.
  - ⚠⚠ GOVERNING PRINCIPLE (Victor): adding integrations does NOT change the ZK goal — external/AI integrations are OPT-IN, USER-OWNS-THE-RISK components wrapped in a protection layer (ZK core + guarded extension layer). → candidate addition to CORE constitution; frames 2 ADRs.
  - Two ADRs framed: "external data ingestion under ZK" (GENERALIZED from Finance: now banks + social/marketing metrics) + "AI/LLM integration under ZK" (Victor wants AGENTIC, ON-DEVICE = ZK-safe path). Documents = vault is the security-first framing.
Next session:
  - Wave 2 cont.: Routines · Journals · Learning. (Journals will let us finalize the global Calendar + Check-in-review forward contracts.)
  - NEW high-priority follow-up: amend CORE constitution (docs/core/business-rules.md) with the extension-model principle — affects every external-integration ADR. Needs Victor's go.
  - ADR-002 amendment now spans 7 feature contexts (+ Projects: deliverables table, mission, project_contacts(role), project-account/event links, shared-tags). Candidate ADRs: external-ingestion (generalized), AI-agentic-within, budgeting, HKDF→BLAKE2b. Parked: global Calendar, onboarding, Notes&Pages tag-scoping, deliverable-measurement design pass.
  - Projects docs NOT yet committed.

---
Date: 2026-07-01
Task: documentation-blueprint
Goal: Structural session — scope reconciliation + re-sequencing (no new feature docs).
Completed:
  - ROUTINES intake (from 06-30): REFRAME captured — Routines = cross-module ORCHESTRATION layer; named ordered sequences; polymorphic INTERACTIVE steps with per-step completion MODES that drive underlying entities (G2/G3/G5/action-model resolved). Remaining gaps G1/G4/G6-G10 to confirm on return. NOT transformed.
  - ⚠⚠ SCOPE RECONCILIATION (Victor flagged dropped modules): audited v1 ../life-os/COMPLETE_SYSTEM_ARCHITECTURE.md (91 tables/7 domains) vs v2 (~60/12). Found 4 silently-dropped intended items → Victor ruled KEEP on all: Health domain (exercise+nutrition), Finance Commitments, Duties, Projects Investigations. + Learning verify-list (Grades/Cycles). Enterprise/AI/multi-user drops confirmed CORRECT (ZK/single-user). Durable record: docs/intake/_scope-reconciliation-v1.md. Manifest + features index reconciled → new Wave R.
  - ROUTINES RE-SEQUENCED to late (Wave 4, before peripherals): it orchestrates other modules, so document those first. Fill order updated in manifest + index + task.
  - LEARNING DECOMPOSED: ~17 tables → 5 sub-contexts (Courses&Classes · Books · Knowledge · Study Sessions&Planner · Flashcards), each own Phase 1→4 (avoids blowing token budget on one giant context). Language stays separate (Wave 3).
  - SKILLS SEPARATED from Learning (Victor): v2 skills/skill_resources are a downgraded 2-table version of a larger envisioned module → own feature context (Wave R). Removed from Learning:Knowledge.
Decisions:
  - Revised fill order: Wave 2 = Projects ✅ · Learning (5 sub) · Journals; Wave 3 = Languages · Purposes · Bucket List; Wave R = Health · Duties · Skills (+ Finance→Commitments, Projects→Investigations); Wave 4 = Routines · Gamification · Notifications · Pomodoro.
  - Learning before Journals (Journals aggregates study). Routines + Journals are aggregators → late.
Next session:
  - Start **Learning: Courses & Classes** (first Learning sub-context) via /documentation, Phase 1→4. Harvest ADR-002 §5.10 (courses) + §5.18 (ICS) + learning.ts + v1 life-os learning + CLAUDE.md §7.
  - Backlog now (build/ADR): extension-model principle → constitution; external-ingestion ADR (generalized); AI-agentic-within ADR; budgeting design; deliverable-measurement design; Duties defining-intake; Health full intake; Skills full intake; ADR-002 amendment (7+ contexts); HKDF→BLAKE2b.
  - This structural state committed this session (c8d7e14).
  - PROCESS CLARIFICATION (Victor Q, 07-01): the 5 Learning sub-contexts are each documented as their OWN CONTEXT via the `/documentation <context>` Phase 1→4 loop (own 5 canonical aspect docs), NOT via `/documentation-component`. Rationale: this is reverse-mode intent/design documentation (context altitude); `/documentation-component` is a BUILD-phase forward-spec tool (docs/specs/, wrong altitude here). Folder: nested `docs/features/learning/<sub-context>/{5 aspects}` + a `learning/README.md` umbrella. Applies to any future decomposed module (Learning now; potentially Health/Skills).

---
Date: 2026-07-03
Task: documentation-blueprint
Goal: Document Learning: Education (first of 5 Learning sub-contexts) end to end — including Victor's major hierarchy reframe.
Completed:
  - PHASE 1 (Intake): harvested v2 (§5.10 courses + §5.18 ICS + learning.ts + CLAUDE.md §7) + v1 (CollegeGrade/CollegeClassData/TopicImportSource). Original G1–G12 SUPERSEDED by Victor's SCOPE REFRAME → 8-level hierarchy (Institution/Self-taught → Program → Curriculum → Degree → Term → Subject → Module → Topic) + A1–A4 (optional depth, rollup, forkable curricula, subject-vs-session). Reshaped gaps H1–H12 + full H9 views resolved → intake WHOLE. Renamed docs/intake/learning-education.md.
  - PHASE 2 (Transform): 5 aspect docs in docs/features/learning/education/ + learning/README.md umbrella (5-sub-context index). Old empty learning/ scaffolds deleted.
  - PHASE 3 (Verify) + gate: PASS. FACT base exact (courses L2372-2403; ICS L3581-3630; entity_links L1344); core models/learning.ts + utils/ics-parser.ts confirmed EMPTY (0 lines). 16 invariants ED-1..ED-16; intent preserved. ⚠ highest INTENT-to-FACT ratio yet (deliberate reframe) — all flagged.
  - PHASE 4 (Accept): Education ✅ in features index + manifest + umbrella.
Decisions (the big ones):
  - RENAME: "Courses & Classes" → **Learning: Education**.
  - H2: SEPARATE institutions + self_taught tables; degree = field; terms HIERARCHICAL (year⊃semester⊃term); subjects = courses reinterpreted, ALWAYS routed.
  - H5: class = a SESSION of a subject; everything attaches to the Subject. Assessment types incl. PRESENTATION + WORK (catch-all).
  - H3: grading_systems BUILDER — weighted components per professor, any scale, modality (online/in-person).
  - H4: homework = education-task in Tasks Universe (Tasks→Education API, Project-Tasks pattern).
  - H7: subject_schedules entity — 3 methods (ICS now · document extraction DEFERRED to AI/extension · manual).
  - H12: progress = Projects measurement PATTERN, FORGED SEPARATELY for Education (no data mixing).
  - H9 views: Programs Dashboard (acing/lacking) · 11-tab Hub (incl. Assessments + Homework) · dedicated pages per Institution/Program/Curriculum(builder+template gallery)/Degree/Term/Subject + per assessment TYPE · My-Week/assessments-view/GPA-report = INTENDED-IMMATURE (need other modules; perfect later). Defaults ALWAYS shipped (anti-lost principle). Sparse data renders gracefully.
Next session:
  - Wave 2 cont.: **Learning: Books** (sub-context 2/5) → Knowledge → Study Sessions & Planner → Flashcards → then Journals.
  - Education docs NOT yet committed (this session's batch pending Victor's go).
  - Backlog additions: hierarchy ADR-002 amendment (largest yet — 14 entities); grading-system component model design pass; measurement design pass now serves Projects + Education.

---
Date: 2026-07-05 (session started 07-03)
Task: documentation-blueprint
Goal: Document Books (was "Learning: Books" 2/5) end to end — became a module extraction + full reframe.
Completed:
  - PHASE 1 (Intake): harvested v2 (ADR-002 §Books L2409-2469, learning.ts, schema.ts L641-674 — Drizzle EXISTS, 0 lines of logic) + v1 (rich Book type; metadata.linked_courses junction hack; TOC/syllabus conflation). Original G1–G12 SUPERSEDED by Victor's SCOPE REFRAME → BOOKS = OWN MODULE (reading Universe: all reading, learning+enjoyment) with a PARTITION serving Learning (Tasks↔Education pattern). B-series B1–B16 all resolved; /critique (gate 1) caught B16(b) silently-dropped + B10 unconfirmed INTERP → reopened → resolved (photos STORED as visual reading journal → daily Journal; sessions = Books-own entity). B12 views approved under second /critique (SHIP). Intake renamed → docs/intake/books.md, marked WHOLE.
  - PHASE 2 (Transform): 5 aspect docs in docs/features/books/ (BK-1..BK-18 invariants; terminal states; contract w/ Books→Education API; structure-data w/ INTENDED entity family; conventions w/ v1-hack landmines). 4 index updates: manifest (own-module row + wave), features index, learning umbrella (4 sub-contexts + pointer), education/contract.md (peer-partition line).
  - PHASE 3 (Verify) + gate: PASS — no template residue, no stale 5-sub-context refs, constitution cites match (ZK-1/LF-2), FACT line-cites all read this session, 3 FACT-column supersessions flagged loudly (format, current_page/progress, genre/tags).
  - PHASE 4 (Accept): ✅ in manifest tracker + status line + features index; task file + TASKS.md updated.
Decisions (the big ones):
  - EXTRACTION: Books = standalone module; Learning drops to 4 sub-contexts. Wave 2 slot kept.
  - Work/asset model: book = WORK + 0..n per-format copies (physical/pdf/epub/audiobook/braille/other), native position each; unified progress DERIVED under the conflict rule (ask by default, preset rule automates).
  - Cross-format mapping AUTOMATIC (transcription + TOC anchors; "not synced yet" fail-loud state; never manual calibration) — design pass filed.
  - Annotations work-anchored; highlights light; quotes first-class + platform-wide quote-embed block (per-book>global toggles).
  - Books-own reading sessions (mode-adaptive) + page-photo capture → encrypted visual reading journal in daily Journal.
  - Adaptive Quota Planner: manual|auto goals, sequenced|parallel multi-book, recalc on miss; Calendar entity (slots preset in Routines) = forward dep, stubbed. Study Planner consumes, never owns.
  - Books governing principle (integrations opt-in, consent, manual fallback) → folds into extension-model constitution amendment.
Process:
  - Victor correction memorized: intake captures INTENT, never "ships now vs later" (memory: intake-captures-intent-not-ship-scope).
  - Double-critique gate proved itself: caught a silently-resolved gap (B16b) and an unconfirmed INTERP (B10).
Next session:
  - Wave 2 cont.: **Learning: Knowledge** (2/4) → Study Sessions & Planner (3/4) → Flashcards (4/4) → Journals.
  - Books batch COMMITTED this session (docs + intake + indexes + task files, single docs(features) commit).
  - ⚠ Cross-module flag recorded (Victor): ALL documented modules' view structures = intent-level, may carry gaps — review + fill + /critique gate each module's views at build time. Durable: docs/README.md §Notes + task backlog.
  - Backlog additions: ADR-002 Books amendment (consolidated), cross-format mapping design pass, Books governing principle, quote-embed block spec.

---
Date: 2026-07-10
Task: documentation-blueprint
Goal: (1) Capture a new Finance-adjacent idea as intake; (2) document Learning: Knowledge — which became a module extraction.
Completed:
  - FISCAL & LEGAL intake stub captured (docs/intake/fiscal-legal.md) — Victor's economic-legal advisory idea. My assessment: 4 capabilities (situate/inform/track-obligations = ZK-safe spine; advise+do-taxes = guarded extension). Reframe urged: situate/plan + hand off filing, NOT tax-engine-for-any-country (regulated/liability). Largest concrete instance of the 2 already-filed ZK ADRs (external-data-ingestion + AI/LLM); validates extension-model principle. Cross-module (Finance↔Projects↔Purpose) → own emerging context. ⏸ DEFERRED to POST-ALL-WAVES (Victor) — do NOT schedule Phase 1 before then. Wired into task backlog + both ZK ADR lines.
  - KNOWLEDGE (was "Learning: Knowledge" 2/4) → EXTRACTED as own module (3rd from Learning, after Skills+Books). Learning drops 4→3 sub-contexts.
  - PHASE 1 (Intake): resumed the started intake (was uncommitted). Resolved K1–K12 + KN-A/B/C. Renamed learning-knowledge.md → knowledge.md, marked WHOLE. Key resolutions: K1 user-extensible KINDS + learning-realm (concept=understand/definition=memorize seeds) + object hierarchy below Topic; K3 knowledge-note = pages entity_type (retire knowledge_notes table); K4 entity_links graph (retire resource_type CHECK); K5 pluggable methods/curves every level, mastery derived; K10 mastery = Education measurement source (object mastery + assessments + pace-vs-syllabus; syllabus-as-calendar = Education-owned forward dep).
  - PHASE 2 (Transform): 5 aspect docs in docs/features/knowledge/ (KN-1..KN-12 invariants; terminal states; contract w/ Knowledge→Education mastery-source API; structure-data w/ INTENDED entity family; conventions w/ FACT-base landmines).
  - PHASE 3 (Verify) + gate: /critique = REVISE→FIXED→PASS. Real spot-checks: all FACT cites verified vs ADR-002 (study_topics L2557, topic_reviews L2608, knowledge_notes L2715 + resource_type CHECK, entity_links targets, FTS5 excludes knowledge, models/learning.ts=0 lines). 2 No-Guessing defects caught + fixed: (a) invented "§Knowledge-notes" section label → real line cites; (b) kind-hierarchy vs object-hierarchy conflation → object nesting = stated (parent_object_id), kind-registry nesting = [INTERP].
  - PHASE 4 (Accept): ✅ in features/README (own-module row), learning umbrella (3 sub-contexts + Knowledge pointer), docs/README manifest (status line + fill-order + status matrix), education/contract.md (Knowledge measurement-source peer note). Task file + TASKS.md + Route History updated.
Decisions (the big ones):
  - EXTRACTION: Knowledge = standalone module; Learning → 3 sub-contexts. Wave 2 slot kept.
  - Ontology: ONE flexible knowledge_objects entity + user-extensible object_kinds registry (learning_realm per kind) + object nesting under Topic. Realm drives default study method. Kind-registry self-nesting left [INTERP].
  - ⭐ LATE CORRECTION (Victor, end of session): the mastery/environment hierarchy TO reach a topic is **Subject › Unit › Topic** (fixed academic spine; Subject = container-org leaf); the user's kinds attach BELOW Topic. Corrects the earlier "Topic is the top object" framing. Mastery DERIVES at the leaf and rolls UP `kind → Topic → Unit → Subject → (Program via Education)`. Captured durably in knowledge/structure-data.md (env-hierarchy block) + business-rules KN-3/KN-9/KN-10 + intake D-section BEFORE context cleanup.
  - knowledge_notes table + resource_type CHECK + fixed SM-2 columns + hand-set mastery_level + single linked_book_id → ALL superseded (→ pages, entity_links, pluggable methods/curves, derived mastery, many-book links). Consolidated ADR-002 amendment.
  - Container org (Module⊃Area⊃Subject) via shared scoped tags, multi-membership; Areas serve multiple OS modules. Compound-set builder + shipped default. Knowledge Lab (generate new knowledge). No community — reproducible setups only.
Next session:
  - Wave 2 cont.: **Learning: Study Sessions & Planner** → Flashcards → **Journals**.
  - Knowledge docs NOT yet committed (batch pending Victor's go): docs/features/knowledge/* + docs/intake/knowledge.md (renamed) + docs/intake/fiscal-legal.md + index updates (features/README, learning/README, docs/README, education/contract) + task files.
  - Backlog additions: ADR-002 Knowledge amendment (consolidated); OS-level cross-module automation/rules surface (forward dep — penalties/rewards/self-testing/real-time analysis); syllabus-as-calendar entity (Education); Education measurement design pass now also consumes Knowledge mastery (3-signal).
  - ⏸ Fiscal & Legal context deferred to post-all-waves (Victor).

---
Date: 2026-07-12
Task: documentation-blueprint
Goal: Document "Learning: Study Sessions & Planner" (Wave 2 cont.) — which became the largest reframe yet: a module extraction + PROMOTION to a foundation.
Completed:
  - COMMITTED the prior Knowledge batch first (commit bdc22e3, gitleaks clean) — docs/features/knowledge/* + renamed intake + fiscal-legal stub + 4 index updates + task files.
  - PHASE 1 (Intake): harvested v2 (6 schema-only tables, 0 logic — study_sessions L2524-2551 + §5.11 planner L2743-2882; planner types live in knowledge.ts L222-250 post-Knowledge-extraction; pomodoro_sessions = Notes L1432/L1435) + v1 (studyPlanner.ts 409L: real-but-flawed engine, plan+actual MERGED in one row L1677-1711, richer templates + interruption tracking) + documented-foundation boundaries (Books BK-10/BK-12, Education "sessions target subjects" L42, Knowledge KN-10). Wrote + renamed intake → docs/intake/sessions-and-scheduling.md, marked WHOLE.
  - PHASE 2 (Transform): 5 aspect docs in docs/features/sessions-and-scheduling/ (SS-1..SS-12 invariants; terminal states per capability; 4-dimension Integration Contract as the exposed surface; INTENDED table-per-type entity family; v1/v2 landmines).
  - PHASE 3 (Verify) + foundation gate: PASS. Mechanical clean (no residue, no stale study-sessions-planner/Focus&Scheduling refs, FACT cites resolve: entity_type incl study_session L1435, task_time_logs L1510, course_id L2800, knowledge.ts L222/L240, 0-logic confirmed). vs-intake: all 16 resolutions reflected; vs-sources: no contradiction (supersessions flagged loud); vs-constitution: reinforces coupling budget + extension-model.
  - PHASE 4 (Accept): index updates — features/README (new Foundation wave row + status row ✅), learning/README (3→2 sub-contexts + extraction pointer), docs/README (status line + fill order + Foundation row), education/contract (class_session peer note). Intake whole.
Decisions (the big ones):
  - EXTRACTION + PROMOTION (G1): "Study Sessions & Planner" → **Sessions & Scheduling**, a Level-Foundation cross-cutting module (sibling to Routines). Learning drops to 2 sub-contexts (Education, Flashcards). 4th extraction from Learning (after Skills/Books/Knowledge).
  - Aggregator not duplicator (G2/G2-shape): scheduled_study_sessions → `planned_blocks` that POINT at module-owned due-work read live via the `dueIn()` provider primitive (promoted platform-wide, shared with the Global Calendar + Journals agenda). Zero mirroring/staleness; honors BK-12. ⭐ This resolved the parked Global Calendar's core logic (Planner writes blocks / Calendar renders them).
  - Polymorphic Session supertype + sub-types (G3/S2/S3): one spine + per-type extension; ALL session-shaped OS entities absorbed as sub-types (class/study/focus/reading/practice/daily/review/workout/work); two axes (sub_type × purpose); scheduling_mode (attended|planned|ad-hoc). BK-10 reading_session PRESERVED as a sub-type.
  - 4-dimension Integration Contract (S5): Attachment · Effects · Lifecycle · Permissions — the module's core; the guardrail that makes user-extensibility (S1=B, rich) safe. Shipped types ship FULLY CONFIGURED; editing them = possible-but-not-recommended.
  - Storage (S4): table-per-type (base `sessions` spine + per-module extension tables) — forced by S5's need for a stable session_id. → surfaced the **Session Framework ADR**.
  - Confirms: G4 block↔session link · G6 restore rich templates + interruption tracking (runtime in Notes) · G8 derived analytics · G10 signal-source only.
  - Deferred: G5 placement-algorithm design-pass; G9 views (dedicated post-completion pass).
Next session:
  - DONE this session (Victor go): (a) wrote **ADR-004 Session Framework** (table-per-type + 4-dim contract + base/extension sync rule; Accepted; amends ADR-002; core README + ADR-002 cross-refs updated); (b) COMMITTED the batch (docs/features/sessions-and-scheduling/* + ADR-004 + renamed intake + index updates + task files).
  - Then Wave 2 cont.: **Learning: Flashcards** → **Journals**.
  - Backlog additions: Session Framework ADR; ADR-002 amendment (Sessions&Scheduling slice — base spine + extension tables + planned_blocks + attachment/effects/permission tables; reconcile task_time_logs⟷work_session; supersede §5.11 flat planner + Learning-only study_sessions); G5 placement design-pass; G9 views pass; cross-module note (Books/Education/Knowledge/Language/Health gain a *_session sub-type at next touch).

---
Date: 2026-07-12 (cont.)
Task: documentation-blueprint
Goal: Document "Learning: Flashcards" (last of the Learning decomposition) — which became a reframe into a Knowledge study-method service + a new framework ADR.
Completed:
  - PHASE 1 (Intake): harvested v2 (3 schema-only tables, 0 logic — flashcard_decks L2628, flashcards+SM-2 L2656, flashcard_reviews L2693; types in knowledge.ts L106-160) + v1 (entities.ts L1250-1297: richer — image/audio/tags + source_note_id generation) + documented-foundation boundaries (Knowledge KN-4/KN-8 "spaced-rep drill method" in a pluggable study_methods registry; Sessions ADR-004 review_session + dueIn). Wrote docs/intake/flashcards.md, marked WHOLE.
  - PHASE 2 (Transform): 5 aspect docs at docs/features/knowledge/flashcards/ (FC-1..FC-10; content+drill only; 3 retirements; universal properties) + ADR-005.
  - PHASE 3 (Verify) + gate: PASS. Mechanical clean (residue, cross-ref paths, FACT cites: flashcard tables L2628/L2656/L2693, v1 media L1258-1260, source_note_id L1272, types L106/L121). vs-intake: F1-F8 + F-SVC reflected; vs-sources: consistent (Knowledge KN-8 already retires SM-2 cols); vs-constitution: coupling budget respected (near-zero standalone surface).
  - PHASE 4 (Accept): ADR-005 wired into core/README + ADR-002 amended-by; indexes updated — features/README (Flashcards ✅ under Knowledge; Learning → 1 sub-context), learning/README (Education only + Flashcards pointer), knowledge/contract (HOSTS → Flashcards + ADR-005 seam note), docs/README (status + fill order). Intake whole.
Decisions (the big ones):
  - REFRAME (F1): Flashcards is NOT a module and NOT under Learning — a retention + gathering SERVICE inside Knowledge; the reference impl of the Study-Method Service framework. Learning drops to ONE sub-context (Education).
  - GENERIC REVIEW (F2/F3/F4): SRS is not welded to the schema. SM-2 = one bound preset in Knowledge's pluggable curve engine; scheduling/review/mastery all generic. → RETIRE the SM-2 columns + flashcard_reviews.
  - DECK DISSOLVES (F5): a "deck" is a user-defined Knowledge object below a Topic, not a fixed entity. → RETIRE flashcard_decks. Card stays a lean Flashcards-owned content entity (front/back/media/card_type + tags + note links).
  - FOUNDATION-FIRST PRINCIPLE (Victor): rigid per-feature structures collapse into generic constructs — "keep the seam, retire the instance." 3 v2 tables → 1.
  - ADR-005 STUDY-METHOD SERVICE FRAMEWORK: roles (retention/gathering/assessment/elaboration, extensible) + 6-part anatomy (content unit · run surface=Session sub-type · study_methods registration · gather · emitted signals · universal properties) + Knowledge/Education/OS integration. Flashcards = reference impl; future services (assessments/self-test/Feynman) INTENDED, not now. EXTENSIBLE by design.
  - Gather is first-class (generate cards from definition objects/book quotes/notes). Emits review_events → Knowledge derives mastery (KN-10). Drill = review_session (ADR-004).
Next session:
  - COMMIT the Flashcards + ADR-005 batch (this session).
  - Wave 2 cont.: **Journals** — the LAST Wave-2 context (aggregates study/sessions/mastery/all modules; the integration layer). Then Wave 2 COMPLETE.
  - Backlog: ADR-005; ADR-002 amendment (Flashcards slice — retire 3 tables, lean card entity) consolidates with the standing amendment; future study-method services (assessments etc.) INTENDED; Flashcards views fold into the build-time per-module VIEWS pass.

---
Date: 2026-07-12 (cont.)
Task: documentation-blueprint
Goal: Document Journals — the integration layer + last Wave-2 context. CLOSES Wave 2.
Completed:
  - PHASE 1 (Intake): harvested current (a journal = pages type='journal', OWNED by Notes & Pages — NP-2, /summary block, JournalSummaryConfig 5 toggles, G5 INTENDED menu, G7 live; ADR-002 L1266-1310, note.ts L75-104) + THIS context = the aggregation ENGINE (journal-service.ts 0-line) + v1 "Today" page. Wrote docs/intake/journals.md, marked WHOLE. Completeness sweep run (forward-deps/design-pass/flags only, no new blocking decision).
  - PHASE 2 (Transform): 5 aspect docs at docs/features/journals/ (JR-1..JR-10).
  - PHASE 3 (Verify) + gate: PASS. Mechanical clean (residue, paths, cites: idx_pages_journal_unique L1310, JournalSummaryConfig note.ts L75/L104, journal-service 0-line, NP-2 in N&P docs). vs-intake J1-J8 reflected; vs-sources no contradiction (N&P referenced not duplicated; G7 refinement flagged loud as cross-module note); vs-constitution the registry IS the coupling-budget solution (no god-context, no cycle).
  - PHASE 4 (Accept): indexes — features/README (Journals ✅), docs/README (Wave 2 COMPLETE + fill order), N&P identity (G7 refined-by-JR-6 cross-module note). Task file + TASKS.md + Route History. ← WAVE 2 COMPLETE.
Decisions (the big ones):
  - J1 (A): Journals is a DISTINCT context = the aggregation engine — forced by the dep graph (Notes & Pages is a Wave-0 foundation; if it aggregated all modules it would depend on the things that depend on it = a cycle). The engine sits ABOVE the modules.
  - J2 (A + granular): provider REGISTRY — each module registers a journal contribution (summary(date); agenda reuses dueIn(range)); journal names no module. User selects, per module + granularly, which data points show (config = global default in Preferences + per-journal summary_config override). 4th consumer of the provider seam (after Scheduler, Global Calendar, study-methods).
  - J4 (snapshot Review engine, overrode live-only): past = point-in-time SNAPSHOT of that day; today = live; + optional live comparative. User-defined time-frames (day/week/month/year + custom: bi-week/bimester/semester). Scheduled Spotify-Wrapped-style reviews (user plans when to receive). Improvement lens: progress vs goals/dreams/purposes, project development, workload. Two subsystems: daily dashboard + temporal Review engine. Refines N&P G7 (JR-6).
  - No new ADR (reuses provider seam). Surfaced: ADR-002 amendment (journal_snapshots + generalize summary_config) + Review-engine design-pass.
  - Confirms: J3 (summary+agenda), J6 (free-form entry layered), J7 (shared dueIn w/ Global Calendar). Deferred: J5 views, J8 Check-ins integration (to that module's revisit).
  - Forward-deps stubbed: Purpose & Goals (Wave 3), Gamification + Notifications (Wave 4).
Next session:
  - COMMIT the Journals batch (this session).
  - ⭐ WAVE 2 COMPLETE. Next: **Wave 3** — Languages · Purposes & Goals · Bucket List. (Then Wave R: Health · Duties · Skills; Wave 4: Routines · Gamification · Notifications.)
  - Note: Purposes & Goals (Wave 3) is a forward-dep of the Journals review lens — documenting it unblocks that wiring.

---
Date: 2026-07-13
Task: documentation-blueprint
Goal: SESSION-CLOSE WRAP — this work block closed Wave 2 (three contexts + two ADRs). Detail is in the per-context entries above (Sessions & Scheduling, Flashcards, Journals); this is the block summary.
Completed:
  - 3 contexts documented + gate PASS + committed + pushed: Sessions & Scheduling (cc32456), Flashcards (a88113c), Journals (d780c60). Prior Knowledge batch committed at session start (bdc22e3). All on origin/main.
  - 2 ADRs authored + Accepted: ADR-004 (Session Framework — table-per-type sessions + 4-dim Integration Contract) · ADR-005 (Study-Method Service framework — pluggable services on Knowledge's generic review engine). Both amend ADR-002; core README + ADR-002 cross-refs wired.
  - ⭐ WAVE 2 COMPLETE (Projects · Education · Books · Knowledge · Sessions & Scheduling · Flashcards · Journals). docs/README flipped to "Wave 0 + Wave 1 + Wave 2 COMPLETE".
  - Learning collapsed 5 → 1 sub-context (Education); the rest extracted/promoted/demoted across the session.
Cross-cutting outcome:
  - One PROVIDER/REGISTRY seam recurred across 4 independent contexts and unified them: dueIn (Scheduler) → Global Calendar → study-methods (Knowledge) → journal contributions. The Global Calendar's core logic was resolved as a by-product (Planner writes blocks / Calendar renders; both read dueIn).
  - FOUNDATION-FIRST principle established (Victor): rigid per-feature structures collapse into generic constructs ("keep the seam, retire the instance"). Evidence: 6+ v2 tables retired (scattered sessions → 1 supertype; flashcard decks/reviews/SM-2 → generic Knowledge engine).
Decisions: see per-context entries (G/S/F/J series) + ADR-004, ADR-005. No failures this block.
Next session:
  - Wave 3 — recommend starting **Purposes & Goals** (forward-dep of the Journals review lens; documenting it unblocks that wiring), then Languages · Bucket List.
  - Then Wave R (Health · Duties · Skills) + Wave 4 (Routines · Gamification · Notifications).
  - Standing backlog: consolidated ADR-002 amendment (now spans Sessions/Flashcards/Journals slices too); design-passes (Sessions G5 placement algo · Journals Review engine); build-time per-module VIEWS pass; J8 Check-ins↔journal integration at Check-ins revisit.

---
Date: 2026-07-13
Task: documentation-blueprint
Goal: Resume Wave 3 / remaining-module documentation. Became a major re-sequencing + two structural
      reframes + the full Health intake and the start of its Transform.
Completed:
  - RE-SEQUENCE #1 — Purposes & Goals → CAPSTONE (#9). PG1 captured (Victor): Purposes is the OS
    meaning-spine (directional/meaning integration plane; twin of Journals' operational plane); ladders
    up every module → document last. Intake docs/intake/purposes-and-goals.md PARKED with full gap map
    (PG1 resolved; PG2-PG10 framed, answered at capstone vs real docs).
  - RE-SEQUENCE #2 — Languages module DISSOLVED into a new CORE foundation, **Spaces** (Personalization &
    Composability): universal tags · saved views · capability Blocks · templates. Discovered by probing
    "could a user assemble Languages from tags/views without a module?" → yes. Languages = worked-example.
    docs/intake/spaces.md written (gap map SP1-SP9, name locked, 4 primitives + Templates confirmed),
    PARKED to exec #8 (before Purposes; touches every module → requirements-accumulator grounds it).
    docs/intake/languages.md marked DISSOLVED (folds into Spaces SP7).
  - Full remaining EXECUTION ORDER reshaped + written to manifest (docs/README.md), features/README.md,
    TASKS.md, task Route History: Health(1) → Skills(2) → Duties(3) → Routines(4) → expansions(5) →
    Pomodoro(6) → Bucket List(7) → SPACES(8) → Purposes CAPSTONE(9) → Gamification(10) → Notifications(11).
    Deferred: Fiscal & Legal (post-all-waves).
  - HEALTH intake (exec #1) → WHOLE. docs/intake/health.md: v1 plan seed (never built) + ⭐ Victor's Vision
    (goal-driven Training+Nutrition engine, 3 authoring modes, closed energy loop, photo capture) + ⭐⭐
    harvested Victor's Notion "System" page — ALL 18 databases via MCP (9 Physical Training + 9 Nutrition),
    the authoritative design. Reshaped as an OS EXTENSION (integration architecture §A owns / §B composes /
    §C provider seams / §D deps / §E layered picture). Core RESOLVED (Forks 1-4): unified Health Metrics ·
    unified Health Goals · Adaptation/Experiments engine · Disciplines. Closing gaps HL2-HL13 resolved.
  - HEALTH Transform tranche 1 — umbrella + Core (6 docs): docs/features/health/README.md +
    core/{identity,business-rules,contract,structure-data,conventions}.md. Layout = umbrella + sub-contexts
    (Victor's choice). HC-1..HC-13 rules; new entities flagged as ADR-002 additions; all ZK + extension-model.
In progress:
  - HEALTH Transform tranche 2 (NOT STARTED): the two pillar sub-contexts — Training (5 aspects) +
    Nutrition (5 aspects) at docs/features/health/{training,nutrition}/. Each composes the Core + Sessions.
  - Then Verify gate (victor:quality-gate-foundation) → mark Health ✅ in manifest + features/README.
Decisions (the big ones):
  - Purposes → capstone; Languages → dissolved into Spaces (new foundation); both re-sequenced.
  - Spaces = new CORE foundation tier; Notes & Pages becomes a consumer (closes the N&P tag-scoping backlog).
  - Health = goal-driven Training+Nutrition engine, umbrella + Core + 2 pillars; composes Sessions/Knowledge/
    Purposes/Finance/Spaces, not an island.
  - Health Core unifications: ONE Metric spine (body/perf/test/biomarker), ONE Goal system (specializes
    Purposes primitive), Experiments = N-of-1 self-experimentation (candidate GENERIC OS primitive → ADR),
    Disciplines bind Knowledge+Skills. Energy loop: burn = formula/wearable/manual (user choice), intake
    recomputes dynamically. All AI/import/photo/wearable/prescription = opt-in extension-model.
  - Candidate ADRs surfaced: N-of-1 Experiment framework; (standing) the two ZK ADRs (AI/LLM + external-data)
    — Health is their largest instance yet.
  - MCP: Notion connector authenticated this session; used to harvest the 18-DB design (notion-fetch/query).
Next session:
  - Resume HEALTH Transform tranche 2: write Training (5 aspects) then Nutrition (5 aspects) under
    docs/features/health/, composing the Core (core/*.md) + Sessions (ADR-004) + Knowledge.
  - Then Verify gate → Accept (manifest + features/README status ✅), /adr-new for the Experiment framework.
  - Health intake is WHOLE + authoritative (docs/intake/health.md); Core aspect docs done — build pillars on them.
  - After Health: exec #2 Skills, then Duties, Routines, etc. Spaces (#8) accumulates each module's needs.

---
Date: 2026-07-13 (cont.)
Task: documentation-blueprint
Goal: Finish Health Transform (pillars) + Verify + Accept.
Completed:
  - Health Transform tranche 2: Training (5 aspects) + Nutrition (5 aspects) at docs/features/health/
    {training,nutrition}/. Total Health docs = 16 (umbrella + Core 5 + Training 5 + Nutrition 5).
  - Verify: mechanical clean (no residue, all checklists) + vs-intake (Forks 1-4 + 18-DB mapping reflected)
    + vs-sources (composes ADR-004/Knowledge/Purposes-PG6/Spaces; ZK+extension-model honored; forward-deps
    are STUBS not asserted). Gate victor:quality-gate-foundation → PASS.
  - Accept: health/README status all ✅; features/README Health ✅ (linked); manifest exec #1 Health ✅;
    task file Health [x] done; 3 surfaced ADRs backlogged (N-of-1 Experiment framework; Health = largest
    instance of the 2 ZK ADRs; ADR-002 Health additions — full table list).
  - ⭐ HEALTH COMPLETE (exec #1). Recovered domain w/ zero v2 schema → most thoroughly-specified module.
Decisions: as prior entry (Forks 1-4 + HC-1..HC-13). No failures.
Next session:
  - Victor flagged he wants to REDIRECT parts of the Health module (reviewing the as-documented design) —
    handle those redirections FIRST (may revise docs/features/health/* + docs/intake/health.md).
  - Then exec #2 Skills (recovered module; v2 2-table version is a downgrade — harvest real intent, likely
    a Notion "System" harvest again if Victor has one).
  - Roadmap: 2 Skills → 3 Duties → 4 Routines → 5 expansions → 6 Pomodoro → 7 Bucket List → 8 SPACES
    → 9 Purposes (capstone) → 10 Gamification → 11 Notifications. Deferred: Fiscal & Legal.

---
Date: 2026-07-14
Task: documentation-blueprint
Goal: Skills (exec #2) + a mid-course correction to the documentation APPROACH.
Completed:
  - ⭐ APPROACH CORRECTION (Victor): Notion designs are CONTEXT, not core — years-old snapshots. Authoritative
    layer = Victor's CURRENT intent, CO-CREATED (assistant proposes from his patterns + out-of-box, anchored to
    the OS core; he refines). Documented in docs/intake/_APPROACH.md + framing rule in _notion-sources.md.
  - Registered Victor's Notion sources (docs/intake/_notion-sources.md): System 2.0 (whole-OS) · System 1.0
    (Health, harvested) · English Course · To-do/Tasks · 2× "Glorify God" life-visions. New modules surfaced:
    Obligations · Physical Roles · Complementations (peek+decide in the reconciliation wave).
  - SKILLS documented + gate PASS (exec #2): harvested the Notion "Abilities" 5-DB design (System 2.0) as
    CONTEXT; co-created the current-intent (authoritative) → a game-like, dependency-graphed, user-composable
    growth engine (Skill Composer · Skill Graph global+personal · dispatch · three-way fill+locale · derived
    mastery · decay · evidence · insight-compounding · shared reflective engine w/ Health · Purposes laddering ·
    Gamification · Becoming view · path-rec+synergy). docs/intake/skills.md WHOLE; docs/features/skills/ (5 aspects).
    Module keeps name "Skills". 5 surfaced ADRs/design-passes backlogged.
  - ⚠ COHERENCE + REALISM VALIDATION (Victor-caught gap; now a mandatory approach step): audited Skills
    incrementations vs the constitution + realism + architecture. Findings: MOST pass (local/ZK/SU-safe, compose
    existing engines). ISSUES: (1) HIGH — `community submission` CONFLICTS with SU-1 (no-sharing) + ZK-1 → cut or
    ADR-gated carve-out (Victor's decision, backlogged). (2) external Skill-DB import must be anonymous/bulk (ZK
    metadata) + content-curation/ops burden. (3) unmeasurable skills → mastery must be qualitative/self-rated,
    never faked (SK-4 refined). (4) on-device vs cloud LLM realism. Fixed SK-3/SK-4; backlogged the constitutional ADR.
Decisions:
  - Notion = context; current-intent = authoritative; every module gets a co-created current-intent layer +
    a coherence+realism validation before Transform. Health owes a retro current-intent pass (documented Notion-centered).
  - Skills: full recommendation accepted + 2 assistant build-ons (path-recommendation, synergy-detection) approved.
Next session:
  - HEALTH current-intent pass (retro-fix): Victor has NEW intakes for Health + wants improvement + a realistic
    approach. Co-create CI-1..CI-4 (assistant proposes) → run the coherence+realism validation → enhance
    docs/features/health/* → re-gate. Deepen-harvest System 1.0 for the evolved layer.
  - Then carry the corrected approach forward: exec #3 Duties → Routines → … → Spaces(#8) → Purposes(#9) →
    Gamification → Notifications; + the reconciliation wave for Wave 0-2 modules; peek Obligations/Physical
    Roles/Complementations to decide.
  - Standing: resolve the community/SU-1 constitutional ADR before Skills' Skill-DB/Graph design-passes.

--- (resolution appended 2026-07-14)
RESOLVED the community/SU-1 constitutional flag (Victor): the community is EXTERNAL to the OS (marketing/growth),
NOT a feature/pipeline. The OS's only bridge = existing import/export of generic, non-personal templates; sharing
is 100% user-initiated, outside the vault → preserves SU-1 + ZK-1. Skills SK-3 updated to RESOLVED; no ADR carve-out
needed. Surfaced a CORE constitution-note candidate: "social/community/marketplace lives OUTSIDE the OS; the sole
bridge is user-initiated import/export of generic artifacts" (applies to Skills/Spaces templates, external Skill-DB).
Skills module now fully coherent + gate PASS. Remaining Skills realism flags (content-curation burden · on-device vs
cloud LLM) are non-blockers, deferred to the Skill-DB/Graph design-passes.

---
Date: 2026-07-14
Task: documentation-blueprint
Goal: HEALTH current-intent pass (retro-fix) — re-harvest Victor's Notion + co-create the authoritative
      current-intent + coherence/realism validation + enhance docs/features/health/* + re-gate.
Completed:
  - ⭐ HEALTH RE-HARVEST (23 Notion pages via 6 parallel MCP agents): the URLs resolved to a DIFFERENT layer
    than the System-2.0 18-DB design already captured — the older **System 1.0** DBs + the 3 "…Management"
    hub pages. Surfaced a 6-point delta ("what we missed"): (A) clinical biomarker + derived-metabolic spine
    (Health Development: anthropometrics + ~26-marker blood panel + BMR/BEE/LBM/body-fat formulas; per-lift
    bilateral 1RM/MR), (B) general Health-Monitoring model (Domains→Factors→Results + Exams/Assigned-Exams —
    a 3rd spine), (C) functional/body-system nutrition (8-system "area of action" + whole-food type taxonomy),
    (D) cooking-as-skill, (E) "Physical Roles" capability units (objectives/can-do/mastery ladder), (F) deep
    Duties/Obligations/Purposes wiring + reward/penalty. Recorded in docs/intake/health.md (⭐⭐⭐ section).
  - CO-CREATED current-intent CI-1..CI-6 (AUTHORITATIVE, Victor refined): CI-1 Monitoring spine (Domains→
    Factors folded into Metrics grouping + user-scheduled Exams w/ reminders, results→metrics); CI-2 biomarker
    panel (editable starter) + on-device derived metrics + bilateral/per-lift; CI-3 functional nutrition axis
    + whole-food taxonomy (editable, R2 research-flagged) + OPT-IN cooking-as-skill; CI-4 Physical Roles
    (merges Disciplines+capacities → one trainable-capability goal type; heavy Skills resource; professional-
    grade, medically-aware, manual→LLM→curated-import w/ locale variants); CI-5 Duties/Obligations wiring
    confirmed (Health = Duties #3's first consumer); CI-6 bidirectional external integrations (Google Health/
    wearables INPUT · medical-services OUTPUT/egress) — INTENT-only stub.
  - COHERENCE+REALISM VALIDATION (Step 2): all 6 CIs compose existing seams, stay local/ZK (derived formulas =
    deterministic on-device, no AI). Flags: R1 biomarker interpretation advisory-only (most-sensitive ZK);
    R2 8-system taxonomy validity → research; R3 Role professional-import = curation/AI burden → manual core +
    ext; R4 external OUTPUT = ZK egress (new, sharpest consent); C1 reconciliation = Physical Roles subsumes
    Disciplines+capacities.
  - TRANSFORM (12 files): docs/features/health/core/* (5 — Monitoring spine, biomarker+derived, Physical Roles
    merge, Exams, external-integration intent, HC-19..HC-23), training/* (3 — Physical Roles, per-lift/
    bilateral, Role-generated medically-aware plans, HT-8/HT-13), nutrition/* (3 — functional axis + whole-food
    + opt-in cooking-skill + recipe-as-page, HN-12/13/14), README (merge + Monitoring + forward-deps).
  - VERIFY (Step 3, victor:quality-gate-foundation): re-gate PASS. vs-intent (all CIs landed), vs-ADRs
    (ZK-1/extension-model/ADR-004/No-Guessing consistent — Exams fixed to scheduled-due-item not Session),
    completeness (no {{}} residue, terminal states + FACT/INTENT labels present). README status → re-gate PASS 07-14.
Decisions:
  - Physical Roles is the canonical trainable-capability concept (C1 merge): `disciplines` table → `physical_roles`;
    goal type `discipline`+`capacity` → `physical-role`. Roles are the primary resource Skills (#2) consumes.
  - Exams = user-configured scheduled due-items (compose Scheduler + Notifications, surfaced via dueIn), NOT a
    Session sub-type (no runtime) — like meals. Results flow back as metric values (source=exam).
  - Cooking-as-skill is OPT-IN (default = documented dish + optional recipe page).
  - External integrations are INTENT-only; OUTPUT-to-medical = data egress = strictest guard, deferred to
    per-service research post-core.
Next session:
  - Continue reconciliation → exec #3 DUTIES (Wave R, defining intake). Deps: Tasks ✅. Distinct from Task/
    Obligation/Routine (v1 MasterDuty); a provider to Routines/Purposes; Health just confirmed it as Duties'
    first concrete consumer (assigned workouts/meals/exams surface as Duties/Obligations). Needs a DEFINING
    mini-intake before placement. Victor has Notion "Master Duties"/"Duties" DBs (seen in Health re-harvest,
    collections 1b57ba8d…80e2 / …80fe) — harvest as context.
  - Standing Health backlog (build-phase): R2 research (validate 8-system nutrition taxonomy); curated Physical-
    Role library design-pass (consolidate w/ Skills external-DB, locale-variant model); CI-6 egress-guard folds
    into the external-data ADR; ADR-002 Health additions grew (domains/factors/exams/assigned_exams/physical_roles
    + metric side/formula/catalog_ref + source exam/import + nutrition functional_area/whole_food_type/
    recipe_page_id/cooking_skill_id + exercise_plans.role_id).

---
Date: 2026-07-14
Task: documentation-blueprint
Goal: Exec #3 — DUTIES defining mini-intake (Wave R). Establish what a Duty IS (vs Task/Obligation/
      Routine) and its placement (own module vs sub-feature) before capturing aspect rules.
Completed:
  - DUTIES DEFINING INTAKE → **DISSOLVED** (not a module). Harvested 3 sources: v2 (zero Duties surface —
    dropped in the 91→60 consolidation; only survivor = tasks.kind='obligation' stub, Tasks G8), v1
    (MasterDuty/MasterObligation, Master-Instance SR-006 + cycle-gen OR-008, name-only), and Notion
    System 1.0/2.0 (~15 pages via 2 parallel MCP agents) — a full Master→Instance→Tasks automation engine
    for BOTH Duties and Obligations + the crisp 4-axis Duty↔Obligation distinction.
  - Co-created current-intent (collaborative, _APPROACH.md): D1 Duty = recurring RESPONSIBILITY (generates
    work, isn't the work) · D2 Obligation stays a Task type · D3 compose existing seams (Scheduler dueIn /
    Tasks Universe / Session sub-types / entity_links — NO bespoke Master→Instance engine) · extensibility
    = user-extensible task-type/preset system, Duty+Obligation = the 2 shipped presets · D9 → NOT a module.
  - Wrote/updated 8 files: docs/intake/duties.md (full harvest + RESOLUTION = preserved source) ·
    docs/intake/tasks.md (ADDENDUM — G8 kind→user-extensible task TYPE; +change-log) · docs/intake/spaces.md
    (requirements accumulator — the "preset" primitive, 2nd worked-example after Languages) ·
    docs/intake/_scope-reconciliation-v1.md (Duty row→DISSOLVED + decision 3 + change-log) · docs/README.md
    (manifest fill-order re-numbered, Duties off, Routines now #3) · docs/features/README.md (Duties row →
    🚫 dissolved) · TASKS.md · .claude/tasks/documentation-blueprint.md (Wave R item, exec list, Route History).
  - Verify gate PASS: drift-swept clean (no docs/features/duties/ dir; no stray "pending module / defining
    intake / #3 Duties / ⬜" refs). Two stray refs caught by the gate (features/README row + a stale "NEXT:
    exec #3 Duties" pointer) → fixed.
Decisions:
  - Duty & Obligation are TASK TYPES surfaced as PRESETS (thin tabs over the Tasks entity; distinct
    patterns/contexts/deliverables + own UI/UX; user-extensible). Same "keep the seam, retire the instance"
    move as Languages→Spaces and Flashcards→Knowledge-service.
  - Obligation semantics live in exactly ONE place (a Tasks type) — removes the earlier module-vs-Task-kind
    fork (constitution rule 3, single source of truth).
  - No new ADR: composes existing seams. The kind→extensible-type + per-type-preset widening folds into the
    standing ADR-002 amendment (build-phase carry-forward, noted in Tasks ADDENDUM).
  - SU-1: Notion "Accountability Partner" → a Contact reference only (no external notifications).
Next session:
  - Exec #3 ROUTINES (Wave 4, unpark intake). Intake mostly-whole at docs/intake/routines.md (G2/G3/G5 +
    action-model resolved; G1/G4/G6-G10 to confirm on return). Routines = cross-module ORCHESTRATION layer;
    named sequences of polymorphic INTERACTIVE steps w/ per-step completion modes driving underlying
    entities. Step-types now reference the Tasks duty/obligation TYPES (this session's output) + Health/
    Skills (documented). Deps satisfied → clean to proceed.

---
Date: 2026-07-14
Task: documentation-blueprint
Goal: Exec #3 ROUTINES — unpark the parked intake, reconcile against foundations documented since 06-30,
      resolve open gaps, Transform (5 aspect docs), Verify (gate).
Completed:
  - ROUTINES DOCUMENTED + gate PASS. Resumed the 06-30 parked intake; wrote §D RECONCILIATION: the foundations
    it forward-referenced are now documented, so the "own design pass" (step-type/mode taxonomy) resolves by
    COMPOSITION — a step's interactive completion drives the underlying entity's **Session sub-type (ADR-004)**
    or native completion; **Exercises = Health** (G_new superseded — workout Session); obligation/task steps =
    Tasks **types** (this session's Duties output).
  - Co-created §E RESOLUTION (Victor, after asking me to explain the questions first): Q1 compose + user-
    extensible session types + actionable-step = recurrent Task (alarm-like, reschedule-to-open-slot) + step-
    scoping (all/one/subset of routines); Q2 broad scheduling (day/week/month/year) + ALWAYS-record-partial
    (gratitude framing) + **user-configurable completion policy** (all-or-nothing/required-node/threshold);
    Q3 lifecycle (active/paused/off) + **user-configurable miss policy + acceptance window**; Q4 streak
    DISSOLVED into user-config (Gamification reads a POLICY-DERIVED streak, not the Habits rule). Intake WHOLE.
  - Transform: 5 canonical aspect docs at docs/features/routines/ (identity · business-rules RT-1..RT-18 ·
    contract RoutineService + consumed contracts · structure-data as-is-vs-INTENDED · conventions). Removed 5
    empty legacy-named scaffold stubs first.
  - Verify (victor:quality-gate-foundation): PASS on all 3 dimensions (vs intake — all §E reflected; vs sources
    — consistent w/ ADR-002 §5.6 floor [INTENDED flagged], ADR-004, dep-graph no-cycle; vs constitution —
    ZK/SU/INT/LF/single-source §3/coupling §6/terminal-states/fail-loud). No {{}} residue, all claims labeled,
    checklists ticked.
  - Accept: manifest (docs/README.md exec row #3 → ✅) + docs/features/README.md (Routines row ✅ + fill-order
    string updated, Duties dissolution noted) + TASKS.md + task file (exec list, Route History, ADR-002
    amendment consolidated + Routines design-pass backlog). Fill order renumbered: Routines now #3; next #4.
Decisions:
  - Routines = cross-module ORCHESTRATION cockpit that COMPOSES foundations (Sessions/Scheduler/Tasks-types/
    Habits/Health), never duplicates them. Single source of truth = the driven entity (no parallel completion).
  - Deep personalization is the identity: completion policy, miss policy, acceptance window, extensible session
    types, step-scoping are all user-configured (ship defaults). Major Spaces consumer (added to accumulator).
  - Streaks are policy-derived — Gamification (#9) must NOT assume the Habits rule (captured to prevent a wrong
    assumption when Gamification is documented).
  - No new ADR (composes ADR-004). Build-phase: ADR-002 amendment (routines/routine_step/membership/policy cols
    + widen action_type→polymorphic step_type) + a Routines design-pass (step_type taxonomy · membership · policy engine).
Next session:
  - Exec #4 EXPANSIONS BATCH (opportunistic, amend already-documented modules): Finance→Commitments (recurring
    commitments, auto-txn + due reminders — ties to budgeting) · Projects→Investigations (research entity) ·
    Learning→verify Grades/GPA + Cycles + Subject-as-entity. All are deltas on ✅ modules, not new contexts.

---
Date: 2026-07-15
Task: documentation-blueprint
Goal: Exec #4 EXPANSIONS BATCH — opportunistic deltas on already-documented ✅ modules: Finance→Commitments ·
      Projects→Investigations · Learning→verify Grades/GPA/Cycles/Subject-as-entity.
Completed:
  - ⭐ ALL 3 RESOLVED BY COMPOSITION / ZERO NEW TABLES (Victor probed each: "why an entity? how does it differ?").
  - Finance→Commitments → a management SUB-CONTEXT/LAYER in Finance (NOT a new entity). After 3 reframes Victor
    landed it: manages committed/recurring/long-term flows (subscriptions · lending/receivables tracked to a
    TOTAL via varying installments · liability payoff · income · periodic investments+revenue · installment
    assets) by COMPOSING the existing 6 Finance entities; bidirectional (payable/receivable) + derived
    progress-to-total (mirrors FN-3); surfaces on the schedule via dueIn + Notifications; reuses FN-5 recurring
    mode. Threaded into Finance identity (scope + "not an entity"), business-rules FN-14, structure-data
    (layer not table), contract (listCommitments + dueIn provider) + intake/finance.md EXPANSION.
  - Projects→Investigations → RESOLVED BY COMPOSITION, no entity. Victor asked why it should exist vs a
    milestone/existing entities; honest analysis: research = EXPLORE (divergent, output=findings) vs
    milestone/deliverable/task = EXECUTE (convergent). But already covered → a research/investigation = a
    deliverable (measurement_type='artifact') whose workspace is a Knowledge Lab investigation, linked via
    entity_links. Threaded into Projects identity (NOT-note) + structure-data + intake EXPANSION.
  - Learning verify → VERIFIED, all covered by Education (07-03 reframe), no gap: Subject-as-entity = a hierarchy
    level; Grades/GPA (CR-002/OR-003) = ED-7 grading-system builder + derived GPA rollup; academic Cycles =
    Education `terms`; v1 OR-008 cycle-session-gen = Sessions&Scheduling. Recorded in scope-recon.
  - WAVE R FULLY RECONCILED (Health·Skills·Duties·Routines·Finance-Commitments·Projects-Investigations·Learning).
  - Accept: manifest exec #4 → ✅; features/README 3 expansion rows → ✅; scope-reconciliation #2/#4/#5 → resolved;
    TASKS.md + task file (exec list, Route History). Fixed a duplicate Pomodoro line in the task file.
Decisions:
  - Commitments = a management layer, not an entity (Victor: "the OS is already complex enough and able to handle
    that"). Lending/receivable representation + any "is-a-commitment" marker = build-time design-pass question.
  - Investigations = deliverable(artifact) + Knowledge Lab; only re-open if project-specific research structure
    (hypotheses w/ pass-fail · decision-gate · research-as-whole-project) is ever needed.
  - Pattern of the session: mature core → new "features" are compositions, not schema. Nothing new added to ADR-002
    beyond the standing amendment; no new ADRs.
Next session:
  - Exec #5 POMODORO (Wave 4). deps Tasks/Notes/Learning ✅. v2 has `pomodoro_sessions` (Notes module, §5.2);
    Sessions&Scheduling identity notes pomodoro as a `focus` session sub-type w/ a timer. Likely a composition
    reframe again: Pomodoro = a focus-timer capability bound to tasks/classes/study-sessions, composing the
    Session `focus` sub-type + task_time_logs (Tasks G4/G9) rather than a standalone module. Harvest: ADR-002
    §5.2 pomodoro_sessions + Tasks G9 (focus mode) + sessions/identity focus sub-type + CLAUDE.md §8 Pomodoro block.

---
Date: 2026-07-15
Task: documentation-blueprint
Goal: Exec #5 POMODORO (Wave 4) — document via the framework; expected a composition reframe.
Completed:
  - ⭐ REFRAME (Victor): Pomodoro is a **capability, not a module** — the **focus-timer runtime of the `focus`
    Session sub-type**, consolidated **entirely into the Sessions realm** ("handled only within the Sessions
    realm, not leak to any other entity"). Finishes ADR-004's absorption of the 9 scattered session entities
    (it pre-declared `attach_pomodoro` + named `pomodoro_sessions`).
  - Intake WHOLE (docs/intake/pomodoro.md, G0–G7): G0=(B) thin capability-doc as an OS entity; G1 v1 richness
    (pause/interruption/auto-start/notify/sounds/templates) all IN but RESHAPED into the focus-session runtime +
    Preferences + Sessions `focus` presets (not restored as v1 flat fields); G2 Sessions-realm-only (timer keyed
    by `session_id`, task integration via the session's `log_time` effect); G4 dissolved (session_id retires the
    polymorphic entity_type); G3 Focus Mode = polymorphic × platform-adaptive (mobile/desktop/web) × tool-bearing
    × low-distraction (⚠ INTENDED → design-pass); G5 analytics = derived cut of session analytics; G6 breaks carry
    per-type guidance; G7 XP via `award_xp` effect. Widget refinement: `/pomodoro` block = a lens showcasing
    pomodoro-enabled sessions + linking a page's analytics to a `session_id`.
  - 5 aspect docs written at docs/features/pomodoro/ (identity·business-rules PD-1…PD-12·contract·structure-data·
    conventions), replacing 5 legacy-named empty stubs. All claims FACT/INTENT-labeled; terminal states + fail-loud
    enumerated; no template residue.
  - BOUNDARY RECONCILED (the reframe reverses gate-PASSED docs): Sessions (SS-11 reversal + identity/contract/
    structure-data/conventions) + Notes (identity/contract/structure-data/business-rules) annotated — each keeps
    its current-v2 FACT while flagging the forward-reframe; no unflagged contradiction.
  - Verify (victor:quality-gate-foundation): PASS on all 3 dimensions (vs intake — G0–G7 reflected; vs sources —
    consistent w/ ADR-002/ADR-004/Tasks TK-5/Sessions SS-*, no dep-cycle [Pomodoro is a client of Sessions, rides
    its effects, adds no edge], code 0-lines flagged; vs constitution — ZK/LF/single-source/coupling/terminal/
    fail-loud). Fixed a broken cross-ref ([[../health/identity]] → [[../health/training/identity]]).
  - Accept: manifest docs/README.md exec #5 → ✅ + docs/features/README.md (Pomodoro row ✅ + fill-order #5 ✅) +
    TASKS.md + task file (exec list, Route History, consolidated ADR-002 amendment + new ADR-004-amendment/Focus-
    Mode design-pass candidate).
Decisions:
  - Pomodoro = a thin runtime OVER Sessions, never a service beside it. No cross-module write of its own — time/
    XP/journal/calendar all ride the `focus` sub-type's declared Integration-Contract effects (ADR-004 §3.2).
  - `pomodoro` is NOT a session sub-type — it is the runtime; the sub-type is `focus` (SS-1).
  - ADR handling = NOTE now / amend at BUILD (Victor): documented the target state; flagged ADR-004 amendment
    (pomodoro=focus runtime, reverse SS-11) + ADR-002 re-home (pomodoro_sessions→session_id) for the consolidated
    build-phase pass. No ADR file produced this session.
  - Pattern holds (5th time): mature core → the "new feature" is a composition/consolidation, not new schema.
Next session:
  - Exec #6 BUCKET LIST (Wave 3). deps Projects ✅ + Purposes-intent. Draws the Dream↔Bucket boundary (PG8 —
    captured in the parked Purposes & Goals intake). v2 has `bucket_list_items` (links to purposes + projects,
    steps/cost/location). Harvest: ADR-002 bucket_list_items + intake/purposes-and-goals.md PG8 + v1 legacy.

---
Date: 2026-07-15
Task: documentation-blueprint
Goal: Exec #6 BUCKET LIST (Wave 3) — document via the framework; resolve the PG8 Dream↔Bucket boundary.
Completed:
  - ⭐ DISSOLVED into Spaces (Victor's sincere reframe). Asked what the feature really is → "a separated View of
    things I want to do before I die, with progress, to envision them." That is a **Space**, not a module
    (Languages/Duties precedent) — a `#before-i-die` tag + a vision-board Gallery saved View + derived progress +
    an optional Template. 3rd Spaces worked-example.
  - This ALSO resolved PG8 (the Dream↔Bucket↔Purpose boundary the Purposes intake deferred to here): the items
    ARE **Dreams**. One aspiration entity = `Dream` (owned by Purposes & Goals #8). The redundant
    `bucket_list_items` table **collapses into `dreams`** (which absorbs its execution/progress/imagery fields).
    → build-phase ADR-002: retire `bucket_list_items`, widen `dreams`.
  - Intake docs/intake/bucket-list.md written (full harvest: v2 schema + v1 rich UI + the dreams overlap table +
    BL1–BL8 gap map) then RESOLVED. Intent threaded into two homes: docs/intake/spaces.md (accumulator — the
    bucket-list worked-example; surfaces the vision-board Gallery View + derived-progress needs) +
    docs/intake/purposes-and-goals.md (PG8 marked ✅ RESOLVED; Dreams absorbs; bucket_list_items collapses).
  - Accept: deleted the 5 empty legacy stubs + removed docs/features/bucket-list/; manifests updated
    (docs/README.md exec row + wave list; docs/features/README.md status row 🚫dissolved + fill-order + wave
    list); TASKS.md + task file (exec list, Route History, #7 next-pointer).
Decisions:
  - Bucket List is a Space, not a module or a distinct entity — the OS pushes this personalization to the Spaces
    layer (tags · saved views · templates). No new table; the items are Dreams.
  - PG8 resolved by collapse, not by drawing a 3-way line: Purpose = meaning-spine; Dream = the aspiration entity
    (absorbs bucket execution fields); "Bucket List" = a curated Space/view over Dreams. Vision board = the
    Gallery View; achievement tracking = derived progress + Gamification (Wave 4).
  - Pattern holds (6th time): mature core → the "feature" is a composition/Space, not new schema.
Next session:
  - Exec #7 SPACES — CORE/foundation (Personalization & Composability). This is the big one: resume
    docs/intake/spaces.md (SP1–SP9 captured, name locked, 4 primitives + Templates confirmed) NOW that #1–5 are
    documented + the 3 worked-examples (Languages, Duties, Bucket List) are captured in the accumulator. Resolve
    SP1–SP9 against the documented modules → Transform produces the ADR set (universal tags · saved views · Block
    registry · templates · presets) + core docs, NOT feature aspect docs (it's CORE/foundation). Purposes capstone
    (#8) depends on Spaces' universal tags. NOTE: Spaces Transform = ADRs + core/ docs, different output shape than
    a feature context.

---
Date: 2026-07-15
Task: documentation-blueprint
Goal: Exec #7 SPACES (CORE/foundation) — resume the parked intake; drive SP1–SP9 to whole against the now-
      documented modules; checkpoint before the big Transform.
Completed:
  - Resumed docs/intake/spaces.md (parked 07-13). The deferral strategy paid off: the requirements accumulator —
    filled as each module was documented — grounded SP1–SP9 in real needs (workout logger, photo-analyze, A-B-A
    pronunciation, Skill Tree, vision-board Gallery, preset tabs) instead of speculation. 3 worked-examples now
    captured (Languages, Duties, Bucket List).
  - ✅ INTAKE WHOLE — all SP1–SP9 resolved (Victor):
    · SP1 new foundation tier (N&P → consumer of universal tags/views).
    · SP2 `entity_tags` open-registry + nestable, distinct from `entity_links` — but the USER chooses whether
      tags & links act as one surface or separate (personalization, not a hard architecture call).
    · SP3 `views` first-class: Space-owned OR global/cloneable; ship default views + user creates/edits new ones.
    · ⭐ SP4 the big call — open capability registry with declared render-targets (non-dogmatic A-shape), AND
      **user-authored capability Blocks** are IN the vision now: users create their own capabilities "at their own
      risk," wrapped in a safety-net/security layer. Implementation of the safe-authoring surface = later design-
      pass; the intent + seam locked now. Guard reuses ADR-004 SS-6 permission envelope + the extension-model
      principle (sandbox, attachment-scoped, no double-count, opt-in for sensitive modules, media encrypts).
    · SP5 templates = fork-on-instantiate (deep copy, no back-link; portable seed bundles; ZK-clean).
    · SP6 `spaces` lightweight entity · SP7 Languages→worked-example · SP8 ZK-never-broken · SP9 substrate beneath
      the documented seams (Purposes laddering, Global Calendar, dictionary).
  - Surfaced a NEW candidate ADR: the capability-authoring security model (sandbox + permission envelope).
  - Checkpointed BEFORE Transform (Victor's call) — Transform is the biggest single deliverable (ADR set + core
    docs) and deserves fresh focus. Updated task file (exec #7 [~] intake-whole; candidate-ADR list) + TASKS.md.
Decisions:
  - The Spaces theme, consistent with the whole effort: maximal user power (author your own tags-interaction,
    views, capabilities) + shipped defaults + a safety net. Personalization is the identity; ZK is never broken.
  - SP4's user-authored Blocks are the deepest expression of composability AND the sharpest security surface —
    resolved by reusing existing guards (extension-model + SS-6 envelope), not a new philosophy.
  - Transform for a CORE/foundation context outputs ADRs + core docs, NOT feature aspect docs (different shape).
Next session:
  - Exec #7 SPACES **TRANSFORM**. Produce the ADR set in dependency order: ① universal tags (entity_tags) →
    ② saved views (views) → ③ capability-Block registry → ④ templates (fork) → ⑤ capability-authoring security
    model; then core/business-rules.md personalization-within-ZK invariant + the `spaces` entity + manifest
    re-sequence (Languages off modules, Spaces as CORE). Run each through the foundation gate. Intake is WHOLE
    (docs/intake/spaces.md — RESOLUTIONS block + STATUS carry everything). Then #8 Purposes & Goals (CAPSTONE)
    consumes Spaces' universal tags.

---
Date: 2026-07-15
Task: documentation-blueprint
Goal: Exec #7 SPACES (CORE/foundation) — TRANSFORM the WHOLE intake into the ADR set + core docs; gate; Accept.
      The parked-checkpoint from the prior session (intake WHOLE, Transform is the big deliverable).
Completed:
  - TRANSFORM produced the **5-ADR Spaces set**, each drafted → /critique → revised → accepted one-by-one
    (dependency order), every critique finding real:
    · ADR-006 (tier + universal `entity_tags` + `spaces` entity) — R1 reframed tag/link as distinct-in-storage /
      unified-in-OS-by-user-choice (Victor's note); R2 tied entity_links enum-opening to the unify prereq; R3 DATA-4;
      R4 tier-beneath-N&P precision.
    · ADR-007 (saved `views`, Space-owned-or-global) — V1 provider-delegated predicate/grouping across heterogeneous
      types (the substantive fix); V2 DATA-4; V3 EN-2; V4 default-view relationship.
    · ADR-008 (capability-Block registry, declared render-targets) — E1 removed the over-claim that capabilities
      "reuse ADR-004 Effects"; reframed: outcome-producing capabilities DRIVE a Session; guarded-write discipline is
      what generalizes.
    · ADR-009 (templates, fork-on-instantiate) — T1 replaced the §3.1/§3.4 contradiction with the **authored-vs-
      accumulated** capture line (keeps Victor's method, drops runtime data; ZK-clean by construction).
    · ADR-010 (capability-authoring security) — S1 compositional read+egress exfiltration (union of consents);
      S3 revocation; S4 re-grant-on-envelope-change (TOCTOU); S2 named sandbox-escape residual risk.
  - Core docs (Transform's 3 non-ADR outputs): **business-rules.md PC-1…PC-4** (personalization-within-ZK invariant)
    + **INT-1a** (association primitives owned by Spaces tier, consumed by N&P); **manifest re-sequence** in
    docs/README.md (Languages struck; Spaces = CORE-beneath-N&P; status tracker + execution row ✅) + **N&P
    reconciliation flag** (page_tags→entity_tags, build-phase); **SP7** resolved → new front door
    `docs/core/spaces/README.md` (foundation overview + worked-example index: Languages·Duties·Bucket List).
  - STEP 3 VERIFY (holistic foundation gate) = **PASS**. Intent SP1–SP9 all preserved; cross-ADR seams consistent;
    vs ADR-001–005 clean. One real finding fixed (G1 = INT-1↔ADR-006 ownership drift → INT-1a). Two build-time
    seams flagged non-blocking (O1 ADR-005 service-surface vs ADR-008 capability; O2 enabled_blocks vs block_instances).
  - STEP 4 ACCEPT (Victor): ADR-006…010 flipped Proposed→**Accepted** (2026-07-15). **Folded the general
    extension-model principle → EX-1/EX-2** in the constitution (Victor's go). **Community-external expansion
    DEFERRED** (needs Victor's go to broaden beyond the Spaces instance — noted on PC-4).
Decisions:
  - The unify tag/link resolution is a REAL OS behavior (query/API over both tables), switchable by the user, not a
    display flag — policy/mechanism separation, reversible (ADR-006 §3.3).
  - Capability ≠ Session: three-way split — capabilities render, Sessions own timed outcomes+Effects, the
    guarded-write discipline is the shared law (ADR-008 E1).
  - Template privacy line = authored (shareable, his method) vs accumulated (never leaves) — capture-time, by
    construction (ADR-009 T1).
  - Security model = declare→grant→enforce inside a no-ambient-authority sandbox; revocable + re-grant-on-change +
    compositional-consent; safety net bounds blast radius, not correctness (ADR-010).
  - Spaces is a CORE tier BENEATH N&P; documented late (#7) for practical reasons — recorded as a retroactive
    reconciliation, not a clean re-order (honors the fill-order rule by flagging, not pretending).
Next session:
  - **Exec #8 PURPOSES & GOALS — CAPSTONE.** Resume `docs/intake/purposes-and-goals.md` (PG1 captured; PG2–PG10
    to resolve against now-documented modules **+ Spaces' universal tags** — the laddering key it was waiting on).
  - Context to reload: docs/intake/purposes-and-goals.md · docs/core/spaces/README.md (universal tags/views it
    consumes) · docs/core/business-rules.md (PC/EX/INT-1a) · docs/README.md (manifest, remaining = Purposes →
    Gamification → Notifications) · .claude/tasks/documentation-blueprint.md.
  - Carry-forward (build-phase, unchanged): consolidated ADR-002 amendment now +Spaces tables (entity_tags·views·
    spaces·block_instances·capability_grants + open entity_links enum); N&P page_tags→entity_tags reconciliation;
    the two standing ZK-integration ADRs (external-data ingestion; AI/LLM) now framed by EX-1/EX-2; HKDF→BLAKE2b
    ADR-001 amendment (sign-off pending).
---

---
Date: 2026-07-16
Task: documentation-blueprint
Goal: DETOUR (before exec #8 Purposes capstone) — run a whole-set CRITIQUE GATE on all 10 ADRs to
      confirm they are well-founded in the architecture and to surface loose ends, since Purposes
      builds on the Spaces set (006–010). Report + verdict only; decide fixes offline.
Completed:
  - Ran the gate in two phases: Phase A = ADR-001…005 (base), Phase B = ADR-006…010 (Spaces set),
    then a human-owned holistic cross-ADR synthesis. One focused reader-critic per ADR (10 total),
    each returning line-cited findings + a SHIP/REVISE/RETHINK verdict.
  - Result: **all 10 ADRs = REVISE** (every core decision sound; none ships clean; none needs rethink).
  - Verified the 3 sharpest claims against source myself: wall-clock LWW mislabeled "logical"
    (ADR-002:L124 vs L131/L1205 + ADR-003:L653-655 Date.now()); FTS5 external-content over ciphertext
    (ADR-002:L3642-3647 over pages.content -- [E]); HKDF drift (ADR-001:L74/L76).
  - Persisted the full report → **docs/reviews/2026-07-15-adr-critique-gate.md** (per-ADR verdicts,
    5 throughlines, owed-tables ledger, F1–F15 fix menu, D1–D7 decisions + recommendations).
  - NO ADR was edited (report-only, per Victor's call).
In progress:
  - Fix execution (F1–F15) NOT started. Victor chose "menu only" then decided to proceed to revising
    and solving each point THIS coming session (context to be cleared first).
Decisions:
  - The 5 throughlines (the whole-set findings a per-ADR loop can't catch):
    ① ADR-002 stale vs 004/005/006–010 (owns none of ~15 owed tables; amended-by header omits 003,006–010).
    ② Guarded-write/idempotency never grounds out: ADR-010 enforces → 008 inherits → 004 §3.2.4 asserts →
       nobody specifies the write-API contract or the dedup mechanism; shipped capabilities run OUTSIDE the
       ADR-010 sandbox (honor-system writes). THE deepest gap.
    ③ O1 (ADR-005 study_methods registry vs ADR-008 capability registry — same shape, boundary unstated) +
       O2 (ADR-006 spaces.enabled_blocks vs ADR-008 block_instances — dangling both ways).
    ④ Base correctness: HKDF drift; wall-clock LWW vs "logical" (silent skew data-loss); ADR-002
       encryption-vs-query trio (encrypted-INTEGER money can't aggregate; indexes over ciphertext; FTS5 over ciphertext).
    ⑤ ZK overclaims the docs walk back: ADR-009 "ZK-clean by construction" (own text admits "one real risk");
       ADR-010 "cannot leak the vault" (true for server only; local vault S2-bounded).
  - Fix menu (see report for full table): F1 guarded-write+idempotency (D1) · F2 O1 boundary (D2) · F3 O2 (D3) ·
    F4 ADR-002 consolidation/header/ledger (D5) · F5 HKDF→BLAKE2b (D6 sign-off) · F6 LWW clock (D4) ·
    F7 encryption-vs-query trio (D7 mini design-pass) · F8 ADR-009 ZK-precision · F9 ADR-010 honest-bound ·
    F10–F15 track-for-build.
  - Recommendations recorded per D1–D7 in the report. F5/F8/F9 are safe-anytime (independent of D1–D7).
Next session:
  - START REVISING — solve F1–F15 point by point. Victor's stated intent: "go to revise and solve each one."
  - Load first: docs/reviews/2026-07-15-adr-critique-gate.md (the authoritative fix menu + owed-tables ledger).
  - Suggested order (mine, confirm with Victor): warm up with the safe 🟡 batch (F5 HKDF sign-off, F8 ADR-009
    wording, F9 ADR-010 wording, F4 header+ledger) → then the 🔴 architectural decisions one at a time under
    the per-step build gate: D1/F1 (deepest — guarded-write+idempotency) → D2/F2 (O1) → D3/F3 (O2) →
    D4/F6 (LWW clock) → D7/F7 (encryption-vs-query) → D5/F4 (ADR-002 consolidation, its own large session).
  - Each ADR edit runs its own per-step build gate + /adr-new amend flow — nothing rewritten silently.
  - Open sign-off gate: D6 (HKDF) needs Victor's explicit go before editing ADR-001 §Key Model + CLAUDE.md.
---

---
Date: 2026-07-16
Task: documentation-blueprint
Goal: REVISE + solve the F1–F15 fix menu from the whole-set ADR critique gate ("go to revise and
      solve each one"). Start with the safe 🟡 batch, then the deepest 🔴 architectural fix.
Completed:
  - **Safe 🟡 batch — DONE + committed 798c38b** (doc-only, each edit grounded in source):
    · F5/D6 — HKDF → BLAKE2b-256(keyed) in ADR-001 §6 + header, CLAUDE.md, ADR-003 diagram; verified
      against packages/core/src/encryption/vault.ts:78-95 (tested). Closed the 2026-06-13 business-rules
      HKDF flag. **Victor signed off D6** after a full explanation (why keyed-BLAKE2b ≡ HKDF for two
      uniform keys; + domain-separation forward-flag).
    · F8 — ADR-009 "ZK-clean by construction" → "by design, enforced at capture" (all 4 instances);
      + capability-config invariant + untrusted-imported-code forward-ref → ADR-010.
    · F9 — ADR-010 honest two-bound wording; named granted_envelope_hash; attachment→sensitive re-consent.
    · F4-header/D5 — ADR-002 "Amended by" now lists 003–010 + consolidation-status note → owed-tables
      ledger; body consolidation deferred (D5).
  - **F1/D1 — DONE + committed 83e4842** (the deepest gap, throughline ②). Full §XXVI double-gated loop:
    PLAN → /critique → Approval 1 (D1-a/b/c ratified) → /preflight → **independent adversarial critique
    subagent** (verdict REVISE) → closed B1–B4 + N1–N4 → Approval 2 → 7-step implement → Verify.
    Grounded guarded-write + idempotency into **ADR-004 §3.2.5** (owner); ADR-008/010 inherit by
    reference (loop broken). Added constitution **INT-2** (PC-3 specializes it). Feature hinge SS-6
    grounded. Spec: docs/specs/adr-revisions/f1-guarded-write-idempotency/PLAN.md.
In progress:
  - none — both work blocks committed cleanly. F2–F7 + F4-body not started.
Decisions:
  - **D6 (F5)** ratified — code (BLAKE2b) is authoritative; docs aligned. No code change.
  - **D1-a** — applied_effects dedup ledger is LOCAL-ONLY (cross-device rides synced output rows'
    UNIQUE effect_event_id, not a synced ledger).
  - **D1-b** — new **INT-2** write-discipline invariant (not stretching INT-1, which is reads only);
    PC-3 reframed as INT-2's untrusted-code specialization.
  - **D1-c** — CI direct-write guard for shipped code, tracked-for-build.
  - **Key design call (F1):** effect_event_id is DETERMINISTIC (derived from the semantic event) — this
    closes same-device double-count (local ledger) AND enables cross-device convergence (UNIQUE output
    column), with the honest bound that the cross-device MERGE is F10's job. The adversarial gate caught
    a real multi-device double-count (B3) that the random-UUID design would have shipped.
  - **F10 is now load-bearing** — F1 explicitly hands it the cross-device effect-merge (named dependency,
    not a hidden assumption).
Next session:
  - **START F2/D2 (O1 boundary).** Reconcile ADR-005's Knowledge-owned `study_methods` registry vs
    ADR-008's capability registry (same shape, boundary unstated → two competing composability registries).
    Recommendation on record (report D2): a study-method service IS a capability (one registry;
    study_methods becomes a typed view over the capability registry) — avoids the two-registry split
    ADR-008 itself rejects in its Option C.
  - Run the same full §XXVI gate (it earned its keep this session — the adversarial critic pass is worth
    repeating for each 🔴 fix).
  - Load first: docs/reviews/2026-07-15-adr-critique-gate.md (F2/D2 + owed-tables ledger) · ADR-005 §L46
    (study_methods registry) · ADR-008 §L48/L58/L92-94/L117-119 (capability registry + rejected Option C).
  - Remaining after F2: F3/D3 (O2 enabled_blocks↔block_instances) → F6/D4 (LWW clock) → F7/D7
    (encryption-vs-query) → F4-body/D5 (ADR-002 full consolidation, its own large session).
  - D6 already signed off; no open sign-off gates for F2.
---
---
Date: 2026-07-16
Task: documentation-blueprint
Goal: F2/D2 — reconcile the O1 seam (ADR-005 `study_methods` registry vs ADR-008
      capability registry: two registries of the same shape, boundary unstated),
      third 🔴 architectural fix in the ADR revise pass. Then a clean checkpoint.
Completed:
  - **F2/D2 — DONE + committed (4091bd8)** via the full §XXVI double-gated loop.
    Decision **D2=A** (Victor, at PLAN): one composability registry — ADR-008 is
    the **supertype**; `study_methods` is a `kind=study_method` **specialization**
    (is-a), mirroring ADR-004's Session supertype/sub-type. Knowledge owns the
    review engine; the foundation owns the registry.
  - Edits: **ADR-008** (§3.1 unification · §3.3 is-a · **§3.3a anatomy crosswalk**
    + N2 layering check · §4 Option-C generalized to cover 005 · Builds-on subsumes
    005) · **ADR-005** (§3.1(3) registration→foundation / binding→engine split ·
    Amended-by header · §1/§3.2/§3.1(1) clauses · §6 kind-test · BR-5 content-unit-
    is-data) · **business-rules** (PC-2a reconciliation sub-note, INT-1a-shaped +
    Change Log) · **report** (owed-ledger From-005/008 reconciled; F2 ticked) ·
    **feature docs** (`knowledge/contract.md:28`+`:60`, `structure-data.md:38`
    regrounded; flashcard leaves inherit).
  - Verify grep PASS (verbs + noun): no unqualified parallel-registry framing at any
    tier; `registerMethod`/`listMethods` regrounded as pass-throughs; review engine
    still Knowledge-owned. Spec: `docs/specs/adr-revisions/f2-o1-registry-boundary/PLAN.md`.
In progress:
  - none — F2 committed clean. F3–F7 + F4-body not started.
Decisions:
  - **D2 = (A)** one registry, `study_method` = kind-specialization (is-a) — the
    only option that collapses the two registries; reuses ADR-004's supertype/sub-
    type, not a new mechanism. (B) two-registries-compose rejected — documents the
    seam instead of closing it, violates ADR-008 Option-C's spirit.
  - **D2-a = PC-2a sub-note** (not a standalone PC-5) — reconciliation of two ADRs =
    the INT-1a situation; a full invariant for a boundary-clarification is sprawl.
  - **`review_events` is an own-domain write, NOT a §3.2.5 effect** (adversarial B4);
    its *downstream* effects (`emit_measurement_signal`, `award_xp`…) ride §3.2.5/F1.
  - **`study_methods` is a kind-partition, not a base table** — reconciled in the
    report's owed-ledger; ADR-002 untouched (D5).
  - Gate value this round was the **adversarial critique**: self-critique rubber-
    stamped the crosswalk (the centerpiece); the fresh refuter caught B1 (dropped
    `role` axis) + B2 (a second registration chokepoint `registerMethod` that the
    noun-only Verify grep would have passed). Kept the pass for every 🔴 fix.
Next session:
  - **START F3/D3 (O2 boundary).** Reconcile ADR-006 §3.4 `spaces.enabled_blocks`
    (on the `spaces` row, "→ ADR-008") vs ADR-008's `block_instances` — a dangling
    forward-reference in both directions (008 never mentions `enabled_blocks`).
  - Recommendation on record (report D3): `enabled_blocks` = allow-list (which
    capability *types* a Space offers); `block_instances` = actual placements —
    distinct, stated in ADR-008; OR drop `enabled_blocks` as derivable. Decide at PLAN.
  - Run the same full §XXVI gate (adversarial critic pass worth repeating).
  - Load first: `docs/reviews/2026-07-15-adr-critique-gate.md` (F3/D3 + owed-ledger) ·
    ADR-006 §3.4 (`enabled_blocks`) · ADR-008 §3.2/§3.4/data-model (`block_instances`).
  - Note the F2↔F3 seam already flagged in ADR-008 §3.3/§3.4 (instance/placement
    model is F3's turf). No open sign-off gate for F3.
---

---
Date: 2026-07-17
Task: documentation-blueprint (ADR revise pass — F1–F15)
Goal: F3/D3 — close O2, the dangling forward-reference between ADR-006's
  `spaces.enabled_blocks` and ADR-008's `block_instances`.
Completed:
  - **F3/D3 shipped (commit 0a5f8be)** — full §XXVI gate: PLAN → /critique
    [REVISE R1/R2/R3] → Approval 1 [D3/D3-a/D3-b/D3-c] → /preflight PASSED →
    independent adversarial critique [REVISE B1–B6; B4/B7 held; core survived]
    → Approval 2 [B2 refinement signed off] → implement → Verify PASS.
  - **Decision D3 = keep both, distinct** (rejected "drop as derivable"):
    `enabled_blocks` = the Space's authored offered-capability **palette**
    (a set of capability *definition* refs, ADR-006 §3.4); `block_instances`
    = the standalone **placements** (ADR-008). Render-target-agnostic
    membership (form = §3.2 per-instance choice); **teeth-by-surface**
    (standalone drawn from the palette [enforced]; inline additive/union-safe).
  - Dangling ref closed **both directions**: ADR-006 §3.4 new palette paragraph
    + binding notation; ADR-008 §3.4/data-model reciprocal + "/view" string
    struck + §5 "menu ≠ placements"; ADR-009 §3.1 terminology tie; owed-ledger
    (junction under 006, block_instances=placements under 008) + F3 entry;
    spaces/README.md L10+L44. ADR-002 body + packages/ diff = 0 (D5, zero code).
  - Spec: docs/specs/adr-revisions/f3-o2-enabled-blocks-block-instances/PLAN.md
In progress:
  - none — F3 committed clean. F6/F7/F4-body not started.
Decisions:
  - **D3 = (A) keep-both-distinct.** Grounded (2 legs): SP6 (enabled Blocks
    are a Space constituent) + SP5/ADR-009 (a forked template Space carries the
    set with zero placements → not a projection of placements). "Drop as
    derivable" is dead on the evidence.
  - **D3-c teeth-by-surface (B2, the adversarial save).** "Additive, not a
    restriction" alone left the field cosmetic (global editor base always in the
    union). Split: standalone = enforced add-menu (single-surface, no conflict);
    inline = additive union (multi-Space pages need it). Gives the field a
    testable meaning without reversing Victor's D3-c.
  - **D3-a storage → F10.** enabled_blocks = a Space↔definition junction,
    row-based lean (ADR-006 §3.3 sync-robustness precedent); exact sync/storage
    strategy is F10's, DDL build-phase (D5). Owed-ledger records it.
  - **D3-b no new PC.** The enforced placement rule is subsystem-local
    (Spaces), not platform-inherited like PC-2a — argued, not asserted (B6).
  - Gate value again = the **independent adversarial critique**: self-critique's
    R1–R3 were structural; the fresh refuter caught B1 (an SP4 [FACT] that was
    really an inference — the recurring defect class), B2 (toothless field), and
    B3 (refutable "not derivable" phrasing). Same lesson as F2.
Next session:
  - **START F6/D4 (LWW clock).** Resolve ADR-002's "Logical timestamp for LWW"
    comment (L124) contradicting `Date.now()` wall-clock (L131/L1205 +
    ADR-003:L653-655); constitution promises logical (CLAUDE.md:L186). No
    Lamport/hybrid clock exists → cross-device skew silently loses writes
    (corrupts data, not just docs). Recommendation on record (D4): adopt a
    hybrid logical clock (or server-timestamp reconciliation) + keep the
    "logical" wording honest.
  - Run the same full §XXVI gate (adversarial critic pass worth repeating).
  - Load first: docs/reviews/2026-07-15-adr-critique-gate.md (F6/D4 + throughline
    ④) · ADR-002 §sync-metadata (L124/L131/L1205) · ADR-003 §L653-655 ·
    CLAUDE.md:L186. Note F6 is 🟡 correctness (not capstone-blocking like F1–F3
    were) but load-bearing for real multi-device data integrity.
  - Then F7/D7 (encryption-vs-query trio) → F4-body/D5 (ADR-002 consolidation).
---

---
Date: 2026-07-17
Task: documentation-blueprint (ADR revise pass — F1–F15)
Goal: F7/D7 — the encryption-vs-query trio: field-level (L2) encryption
  makes money un-aggregatable, category-index dead, and FTS5 broken, yet
  ADR-002 aggregates/indexes/searches those columns.
Completed:
  - **F7/D7 shipped** — full §XXVI gate: PLAN → /critique [REVISE R1/R2/R3]
    → Approval 1 [A1/FTS-2/blind-index] → /preflight PASSED → independent
    adversarial critique [REVISE B1–B3 + N1–N3; core survived] → Approval 2
    → implement → Verify PASS (caught 1 drift miss). NOT yet committed.
  - **Decision D7 = keep-encrypted, pay-compute-cost** (consistent across all
    three legs — they're one privacy axis: queryability vs L2 defense-in-depth):
    (1) **money stays E**, aggregated **decrypt-in-memory** (A1); (2) **category**
    keeps E + an **equality-only blind index** (domain-separated keyed-BLAKE2b
    PRF in a P side column); (3) **FTS** = standalone content-less FTS5 fed
    decrypted plaintext, **FTS-2** ephemeral/rebuilt-on-unlock. Rejected A2
    (money→P) + FTS-1 (persisted) + external-content FTS.
  - 3 docs edited: ADR-002 (§P/E E-row sharpened = binding rule; domain-wide
    Finance sensitivity note; dropped 2 dead ciphertext indexes; §5.19 FTS
    rewrite) · security-model.md (mirror E-row, Verify-caught drift) · report.
  - Doc-only: `packages/` diff = 0. Build items (blind-index column + keyed-
    BLAKE2b · analytics decrypt-in-memory · FTS-2 rebuild · contact-notes-from-
    `pages`) → owed-ledger, F4-body/D5 + F10 cross-ref.
  - Spec: docs/specs/adr-revisions/f7-d7-encryption-vs-query/PLAN.md
In progress:
  - none — F7 done through Verify. NOT committed yet (Victor's call).
Decisions:
  - **B1 (adversarial, important): the money defect is domain-wide** — the
    report named 3 fields but ~16 E numeric fields across accounts/transactions/
    assets/liabilities/investments/income_streams/dreams feed net-worth/portfolio/
    income charts. A1 keeps them all E; the fix generalizes via the L168 rule +
    a Finance sensitivity note (non-sensitive aggregates P; sensitive money
    E+decrypt-in-memory).
  - **B2 (the citation catch): my "HMAC_vaultsubkey" was wrong twice** — codebase
    PRF is keyed BLAKE2b (`crypto_generichash`, ADR-001:76) NOT HMAC (training-
    data default), and ADR-001:77's domain-separation forward-flag applies (blind
    index = the first 2nd-key feature). Fixed → domain-separated labelled subkey.
    Consistent with F5 (HKDF→BLAKE2b).
  - **B3: FTS-2 "never writes to disk" was an overclaim** → "no persistent
    plaintext tokens + torn down on lock"; OS swap + SQLite temp-spill named
    (`PRAGMA temp_store=MEMORY`); kept honestly comparable to A1.
  - Gate value again = the adversarial critique: self-critique caught the FTS
    persist-vs-rebuild contradiction (R1); the fresh refuter caught the domain-
    wide scope (B1) + the wrong crypto primitive/key-hygiene (B2). Standing
    lesson holds across F1/F2/F3/F6/F7.
Next session:
  - **START F4-body/D5 (the LAST architectural fix).** ADR-002 full
    consolidation: fold in the ~15 owed tables (from every module's amendment
    notes) + the build items owed by F1 (`applied_effects`/`effect_event_id`),
    F6 (HLC representation + `_sync_field_ts`), F7 (`category_bidx` blind index).
    D5 = decide write-now vs keep-tracked; the F4-header (amenders + owed-ledger)
    is already done (798c38b). This closes the F1–F15 revise pass.
  - Then 🟢 F10–F15 are tracked-for-build (not doc-gated).
  - Load first: report F4 (L85) + D5 (L106) + the owed-ledger + each module's
    "ADR-002 amendment" TASKS.md notes.
--- — resolve the "logical timestamp" label vs `Date.now()` wall-clock
  contradiction (ADR-002/003 + constitution) and the silent cross-device data
  loss it causes.
Completed:
  - **F6/D4 shipped** — full §XXVI gate: PLAN → /critique [REVISE R1/R2/R3] →
    Approval 1 [D4/D4-a…D4-d] → /preflight PASSED → independent adversarial
    critique [REVISE B1–B4 + N1–N4; core HLC survived] → Approval 2 [B3
    delete-scope signed off] → implement → **Verify PASS** (caught 2 drift
    misses). NOT yet committed — awaiting Victor's go.
  - **Decision D4 = adopt a Hybrid Logical Clock (HLC)** for every LWW stamp
    (`_sync_lww_ts` + all `_sync_field_ts` values): orders by causality (skew
    self-corrects on merge), 100% client-side (local-first + ZK + dumb relay
    intact), makes the constitution's "logical" promise TRUE (SU-2 sharpened,
    no new PC). Rejected (B) server-timestamp (breaks dumb-relay) + (C) honest
    wall-clock (ships silent loss).
  - **D4-b global device-id tiebreak** (lexicographic TEXT) replaces §6.1's
    per-device "keep local" — closed a permanent-divergence path.
  - **BR-9 (adversarial B3): deletes ride the same clock** — §6.3 delete-vs-edit
    now orders by the HLC field-timestamp (`_sync_field_ts['deleted_at']`), not
    raw wall-clock `deleted_at` (same skew hole, was left open).
  - 6 docs edited: ADR-003 §6.1 (HLC subsection = clock's home; full 4-case
    receive rule; `mergeFieldLWW` snippet; §6.3; §10.1; §4.1; §17) · ADR-002 §3
    (L134/L141/L143) + §Sync-Flow · business-rules SU-2 · CLAUDE.md L186 ·
    data-flow.md (as-built, annotated interim→HLC) · report F6 entry.
  - Doc-only (D4-d): `packages/` diff = 0. HLC module + `ts()`→`hlc.now()` +
    field-lww merge + **storage representation** (string/BigInt/two-column —
    NOT a free INTEGER pack, couples to wire header + `blob_index`) + `types/
    sync.ts:23` label fix = build-phase, tracked in report, cross-ref F10.
  - Spec: docs/specs/adr-revisions/f6-d4-lww-clock/PLAN.md
In progress:
  - none — F6 done through Verify. NOT committed yet (Victor's call).
Decisions:
  - **R1 (self-critique, real error caught): the packing math was wrong** —
    `physical_ms × 2ᵏ` overflows JS's 2⁵³ safe-int *today* (physical_ms ≈ 2⁴⁰·⁷),
    not year 6000. So "packs into the existing INTEGER for free" is dead; the HLC
    representation is a genuine build-phase choice coupled to the wire + server
    surface. This *strengthened* the D5 deferral.
  - **B1/B2 (adversarial): representation is not client-only** — the LWW stamp is
    on the plaintext wire header (`types/sync.ts:45,49`) + server `blob_index`
    (§9.4); a string/two-column encoding changes both → "adds no visibility" made
    contingent; honest F10-surface coupling stated.
  - **B4 (adversarial): `types/sync.ts:23` carries the same "Logical" comment** —
    NOT edited (would invert the lie while code still stamps Date.now());
    inventoried as interim, fixed at the build swap. Zero code held.
  - Gate value again = the **independent adversarial critique**: self-critique
    caught the R1 math error; the fresh refuter caught B1 (server/wire coupling),
    B3 (the delete-path skew hole — a real residual in the failure class F6
    exists to close), and B4. Same standing lesson as F1/F2/F3: self-critique
    catches structural/precision gaps; the fresh refuter is where the
    load-bearing catches come from.
Next session:
  - **START F7/D7 (encryption-vs-query trio).** ADR-002: encrypted-INTEGER money
    fields can't be SQL-aggregated for charts; indexes over randomized-nonce
    ciphertext can't function; FTS5 external-content indexes ciphertext +
    references phantom columns. D7 = a small design-pass (decrypt-in-memory
    aggregation; blind-index or plaintext-derived FTS column). Own mini-intake.
  - Run the same full §XXVI gate (adversarial pass worth repeating).
  - Load first: report throughline ④ (L63) + F7 (L88) + D7 (L108) · ADR-002
    §encryption + the cited fields (current_balance L2011, amount L2040,
    dreams.estimated_cost L1920, FTS5 L3646). Then F4-body/D5 (ADR-002 consolidation).
---

---
Date: 2026-07-17
Session goal: F4-body/D5 — ADR-002 consolidation (the LAST architectural fix); close the F1–F15 revise pass
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: DONE (through Verify) — NOT yet committed (Victor's call)
Completed:
  - **F4-body/D5 shipped** — full §XXVI gate: PLAN → /critique [REVISE R1/R2/R3]
    → Approval 1 [D5-a=TRACK · D5-b=new ADR-002 §5.20] → /preflight PASSED →
    independent adversarial critique [REFUTED 2/4 claims; B1/B2/B3 + N1 closed;
    No-Redesign + Grounding survived] → Approval 2 [B1 named-not-enumerated scope
    signed off] → implement → **Verify PASS** (caught 1 drift).
  - **Decision D5-a = TRACK** (defer the §5 DDL rewrite to the build-phase schema
    session; the §5.20 ledger is the tracked artifact) · **D5-b = new ADR-002
    §5.20** (durable home). Both ratified by Victor.
  - **Deliverable: ADR-002 §5.20 (Pending Consolidation)** — the durable
    owed-tables ledger, two streams:
      · Stream (i) = the ADR-003 §17 + ADR-004…010 `Amends:` + F1/F6/F7 slice,
        FULLY enumerated as RETIRE / ADD / AMEND rows with ✓/⏳/↔ readiness
        markers (✓ fully-specified drop-in: entity_tags·spaces·views·templates·
        capability_grants; ⏳ build-deferred: sessions spine+extensions·registry·
        block_instances·space_enabled_blocks·HLC/effect/blind-index cols).
      · Stream (ii) = **named, not enumerated** — the full 19-module documented
        target schema (docs/features/*/structure-data.md) as the build-session
        input checklist + confirmed cross-module moves (bucket_list→dreams,
        pomodoro re-home Notes→Sessions, skill_resources→entity_links).
  - `_sync_field_ts` formally ratified (was "implicit schema edit"); entity_links
    CHECK moved RETIRE→AMEND; fts_knowledge noted as owed new-domain FTS.
  - Repointed ADR-002 ⚠ note (L17) → §5.20; forward-notes on §7 count + §8 map;
    repointed ADR-006 L122 + ADR-004 L123 (owed-ledger pointers) → §5.20.
  - **F1–F15 REVISE PASS COMPLETE** — report carries a top RESOLUTION banner +
    the pass-complete marker + the 🟢 F10–F15 build-phase standing list. No 🔴
    architectural fix remains. No ADR edit owed by F10–F15.
  - Doc-only: `packages/` diff = 0. Changed: ADR-002 · ADR-004 · ADR-006 ·
    report · spec. Spec: docs/specs/adr-revisions/f4-body-d5-adr002-consolidation/PLAN.md
Decisions:
  - **Adversarial B1 (the load-bearing catch): the owed set is TWO streams, and
    the review-doc ledger only ever held one.** My ledger — even after /critique —
    was scoped to the 10-ADR revise pass; a grep proved 19 module structure-data
    docs each owe `[INTENT]`-marked ADR-002 amendments (the per-module target
    schema). Left unfixed that reproduces the exact invisible-divergence F4 exists
    to kill. Fixed by naming the tier completely (19-doc list) without enumerating
    it (enumerating IS the deferred build session, per TRACK).
  - **B3: the TRACK justification overstated "the ADRs defer their shapes."**
    templates/capability_grants/entity_tags/views/spaces are fully-specified. So
    "can't write DDL now" is only true because a *material subset* defers → you
    can't write a *complete* §5 without stubbing. Added a per-row readiness marker.
    The TRACK *decision* was unaffected.
  - Gate value again = the **independent adversarial critique**: self-critique
    (/critique) caught R1's sliver-fix; the fresh refuter caught B1 (the real
    scope of stream ii), B2 (fts_knowledge), B3 (justification honesty). Same
    standing lesson as F1–F7 — the load-bearing catches come from the fresh refuter.
Next session:
  - **exec #8 — Purposes & Goals capstone** (the OS meaning-spine), now unblocked:
    its schema references resolve to ADR-002 §5.20. Run the documentation-blueprint
    workflow (intake → transform → verify → accept) per its CAPSTONE framing.
  - Housekeeping: the F1–F15 work is uncommitted (F4-body + any prior). Offer to
    commit the revise-pass close as one `docs(adr)` commit if Victor wants.
  - 🟢 F10–F15 remain build-phase (F10 load-bearing: sync/storage + HLC representation).
---

---
Date: 2026-07-17
Session goal: exec #8 — document the Purposes & Goals CAPSTONE (the OS meaning-spine)
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: DONE — capstone documented + gate PASS + ADR-011 Accepted. NOT yet committed (Victor's call).
Completed (full 4-step documentation-blueprint pass):
  - **Step 1 Intake — WHOLE.** Resumed the parked intake (PG1 + PG8 pre-resolved);
    made whole against now-documented foundations. Victor's reframe drove PG2 from
    "how does progress compute" → a UNIVERSAL, OS-wide measurability model. Resolved
    PG2–PG10 + relaxed SR-003. Wrote docs/intake/purposes-and-goals.md RESOLUTION.
  - **Step 2 Transform — 5 canonical aspect docs** written to
    docs/features/purposes-and-goals/ (identity · business-rules · structure-data ·
    contract · conventions); deleted the off-standard empty stub set
    (module-spec/page-map/…).
  - **Step 3 Verify — PASS.** /critique (REVISE) caught 4 issues incl. the load-bearing
    INT-1a "third association primitive" contradiction (contributions is Purpose-domain,
    NOT a universal primitive) + stale FACT line-cites (dreams L452→L1931 etc., ADR-002
    now 4011 lines) + hidden cross-module measurability scope + source/binding_mode
    collision w/ Health → all fixed. Independent verify caught value/dream entity_type
    spec-outruns-code → fixed.
  - **Step 4 Accept.** Manifest ✅ in docs/features/README.md + docs/README.md. Drafted
    **ADR-011 (Universal Measurability & Progress Propagation)**; independent adversarial
    refute → REVISE (weights-substrate unspecified [#1], nullable-column amendment,
    "pursuable" predicate, DAG owner, habit_based→rate orthogonality) → all fixed →
    **Accepted**. Wired into ADR-002 (header amender · §5.20 Stream (i) RETIRE/ADD/AMEND).
Decisions (Victor, this session):
  - **Universal measurability contract:** every pursuable entity exposes normalized
    progress ∈[0,1] via measurement_kind {quantitative·milestone·rate·qualitative}
    (solid/abstract); derive-by-default + override; FRACTAL rollup (same weighted math
    down nesting + up laddering). Nothing is unmeasurable.
  - **Binding primitive** binding_mode {manual·derived-pull·event-trigger} — auto-metric
    ≡ auto-completion; rides the existing INT-2 effect rail (ADR-004 §3.2.5), no new
    engine; derived-pull = a new measurement-source READ seam; acyclic (DAG).
  - **PG5:** plan_steps RETURN as a DOC layer (not tracked; graduate to sub-tasks).
  - **PG7:** contributions = FULL first-class weighted edge ("not a half-baked version"),
    Purpose-domain (not a Spaces primitive).
  - **PG4:** Values = FIRST-CLASS layer above purposes.
  - **SR-003 RELAXED:** targets.purpose_id nullable; every ladder joint optional.
  - Gate value again = the INDEPENDENT adversarial critique: it caught the INT-1a
    contradiction (self-review glided past "third primitive") and the ADR's unspecified
    weight-substrate (#1). Same standing lesson as F1–F7.
Next session:
  - **exec #9 — Gamification** (Wave 4; observes all incl. Purposes goal-completion XP).
    Then #10 Notifications. Run the documentation-blueprint workflow per fill order.
  - Housekeeping: this capstone + ADR-011 + the prior F1–F15 pass are uncommitted.
    Offer to commit the capstone as one `docs(purposes)` commit (or bundle w/ the
    pending ADR work) if Victor wants.
  - 🟢 ADR-011 build-phase owed: measurement_kind/binding_mode on 7+ modules · nullable
    progress columns · contributions/values/purpose_reviews/plan_steps · nesting-weight
    (all tracked in ADR-002 §5.20).
---

---
Date: 2026-07-19
Session goal: exec #9 — document the Gamification context ("the System")
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: Steps 1-3 DONE + gate PASS + manifest ✅ + COMMITTED. **ADR-012 NOT yet drafted**
  — deferred to a fresh context (Victor: commit + session-log + /clear, then draft the ADR).
Completed (documentation-blueprint Steps 1-3 + Accept-partial):
  - **Step 1 Intake — WHOLE.** Big reframe over a long intake dialogue: Gamification is NOT
    a badge layer — it is **"the System"**, a behavioral **incentive & consequence engine**
    (manhwa "level up real life"); the motivation/consequence PARTNER to the Purposes meaning
    plane. Wrote docs/intake/gamification.md (Current 4-table floor + v1 harvest from
    ../life-os + RESOLUTION). GG1–GG11 resolved.
  - **Step 2 Transform — 5 canonical aspect docs** in docs/features/gamification/; deleted the
    off-standard stub set.
  - **Step 3 Verify — PASS.** /critique (REVISE) caught the load-bearing **`apply_consequence`
    taxonomy violation** (one umbrella effect can't hold additive+keyed+projection idempotency
    classes — ADR-004 §3.2.5) + rules-aren't-ADR-008-Blocks + Storage-vs-Spaces framing +
    user_profile-PII-destination-undefined + award_xp-shouldn't-be-retired → all fixed.
    Independent verify caught 2 residual `apply_consequence` slips → fixed.
  - **Accept-partial:** manifest ✅ in docs/features/README.md + docs/README.md.
THE SYSTEM MODEL (for drafting ADR-012 next):
  - **Rule → consequence:** a rule = an **ADR-011 binding** (event-trigger · derived-pull,
    acyclic DAG) firing **TYPED effects, each in its ADR-004 §3.2.5 write-class**:
    `grant_currency` (additive; **award_xp = its XP case**, so 9 feeders unbroken) ·
    `lock_currency`/`move_money` (keyed) · `surface_notification` (projection). The engine
    coordinates; the rail keeps idempotency classes distinct. NO new engine.
  - **Multi-currency economy (the inclusivity core, Victor):** many currencies at once, each
    `backing_kind` = `real-money` (→ Storage/Finance) · **`self-granted allowance`** (vacation
    days · cheat meals · gaming hours — NO wealth required; the great equalizer, Premack) ·
    `measured-time` (sessions/time-logs). 4 DERIVED quantities per currency (to-distribute ·
    earned · locked · current); generalized `xp_history` ledger. Penalties LOCK (recoverable),
    never destroy.
  - **Storage = a Finance-owned nestable composition LAYER** (NOT a rewrite): a `store` node =
    group (folder) | wrapper (→ existing account/investment/asset); `parent_id` single-parent
    **domain structural hierarchy** (like Projects/Tasks parent-FK, orthogonal to Spaces tag-
    grouping); `is_locked` · dream/purpose link · currency overlay; existing Finance entities
    UNTOUCHED; canonical worth-tree (no double-count); net worth = tree − liabilities. Rewards
    fund Dreams (estimated_cost) → Purposes laddering.
  - **Rules = HEADLESS automation** (ADR-011 binding + typed effect + ADR-010 permission
    envelope) — NOT an ADR-008 render-Block. **Achievements** = predicates over measured state
    (ADR-011 seam) + event stream (not v1 bespoke checkers); app-curated v1, user-authored later.
  - **user_profile split:** System owns per-currency total + level (DERIVED); check-in streak →
    Check-ins; persona/modules → Preferences; **PII STAYS ⚠** (no account entity exists yet).
Decisions (Victor, this session):
  - The System reframe (real-stakes self-improvement; for kids/turnaround users).
  - Multi-currency incl. self-granted life-allowances so it works WITHOUT money.
  - Storage = a composition layer over existing value-holders (NOT rename accounts / NOT a
    supertype — the OS's Commitments-layer/Spaces pattern; the god-table + supertype both
    considered and rejected).
  - Gate value again = the independent critic (caught the §3.2.5 taxonomy violation self-review
    glided past).
Next session (FRESH CONTEXT):
  - **Draft ADR-012 "Points Economy & Consequence Engine"** (capstone-scale, sibling to
    ADR-011) — its own gated pass: draft → /critique (independent refute) → revise → Accept →
    wire into ADR-002 §5.20 (Stream i) + header amender + consolidation note →012. Model = the
    SYSTEM MODEL above. Effects join ADR-004 §3.2.2 at build.
  - Then **exec #10 — Notifications** (dead-last leaf; observes all incl. Gamification) CLOSES
    the entire documentation-blueprint task.
  - Committed this session: 5 gamification aspect docs + intake + manifest + logs. ADR-012 is
    uncommitted because not yet drafted.
  - 🟢 ADR-012 build-phase owed (→ §5.20): `currencies` · consequence_ledger (generalize
    xp_history) · `store` (Finance) · rules · the 4 typed effects · user_profile split.
---
Date: 2026-07-19
Session goal: Draft + gate + accept + wire **ADR-012 "Points Economy & Consequence Engine"**
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: **ADR-012 ACCEPTED + WIRED.** Full gated pass complete (draft → independent-refute
  critique → revise → Accept → wire). Doc-only; `packages/` diff = 0. NOT yet committed.
Completed:
  - **DRAFT** — `docs/core/decisions/ADR-012-points-economy-consequence-engine.md`, sibling to
    ADR-011 in format. Core decision: the whole "System" is a composition of existing rails —
    `binding (ADR-011) → typed effects (ADR-004 §3.2.5) → sandbox (ADR-010)` — **no new engine**.
    §3.1 rule=binding+typed-effects · §3.2 multi-currency (real-money/self-granted/measured-time,
    XP=one currency) · §3.3 derived balances + pool-ceiling · §3.4 lock-not-destroy · §3.5 Storage
    = Finance-owned nestable LAYER · §3.6 money via Finance · §3.7 achievements=predicates ·
    §3.8 level=derived · §3.9 rules=headless(ADR-010, not ADR-008) · §3.10 user_profile split (PII
    stays ⚠) · §3.11 boundaries (peripheral observer, in-degree 1).
  - **CRITIQUE — independent adversarial refute** (subagent, fresh context; the gate's value
    again). Verdict REVISE. Caught 3 LOAD-BEARING defects, all verified against files:
    (1) `surface_notification` mislabeled **Projection** — but `notifications` is a durable synced
    table (ADR-002 §5.16, is_read/read_at) → it's a **write** = Additive; (2) `[FACT: finance.ts
    transfer L86-106]` **fabricated** — `finance-service.ts` is 0 bytes, no `recordTransfer`;
    transfer is only a type field (types/finance.ts L22,L88-89); (3) `lock_currency`/`move_money`
    labeled **keyed** but have **no domain natural key** (two same-amount rewards are distinct) →
    Additive. + 7 material/minor (ADR-004 missing from Amends line [adding effect-types mutates a
    fixed enum]; `to-distribute` pool source undefined; consequence-cycle not shown covered by
    ADR-011 §3.7 DAG guard; "shipped award_xp" overstates 0-logic; v1 cites → ../life-os/;
    dep-graph [FACT]→[INTERP]).
  - **REVISE** — fixed all 10. KEY OUTCOME: **all four gamification effects are §3.2.5 Additive**
    (not spread across 3 classes). This *strengthened* the anti-umbrella argument: 4 Additive
    effects still need 4 distinct `effect_event_id`s → an umbrella with one id can't converge them;
    and a full consequence set spans classes via OTHER-module effects (complete_habit_occurrence
    [keyed] · surface_journal [projection]). Extended ADR-011 §3.7 DAG guard to consequence edges
    (owed back to ADR-011). Resolved `to-distribute` = config ceiling − distributed (self-granted
    has no backing entity, can't be ledger-derived).
  - **ACCEPT** (Victor) → **WIRE:** status Accepted; ADR-002 header amender (ADR-012 entry) +
    §5.20 Stream (i) rows (RETIRE `xp_history` · ADD `consequence_ledger`/`currencies`/`store`/
    `rules` · AMEND user_profile split/achievements-predicate/level-derived/**ADR-004 §3.2.2 +=4
    Additive effects**/**ADR-011 §3.7 extension**); global consolidation note → ADR-004…012.
  - **NO-DRIFT reconciliation** (I created the drift by refining GM-2's class labels): corrected
    keyed/projection → Additive across all 4 gamification aspect docs + fixed the `recordTransfer`
    cites; flipped "capstone ADR (to raise at Accept)" → "ADR-012 (Accepted)"; updated docs/README
    manifest (#8 ADR-011 + #9 ADR-012 → Accepted) + brought docs/core/README ADR index current
    (was missing 006–011).
Decisions (Victor):
  - Accepted ADR-012 as revised (all-Additive effect model · self-granted pool ceiling · Storage-
    as-layer — the three load-bearing calls presented before sign-off).
Next session:
  - **exec #10 — Notifications** (dead-last leaf; observes all incl. Gamification) — CLOSES the
    entire documentation-blueprint task. Notifications table already exists (ADR-002 §5.16); the
    `surface_notification` Additive effect (ADR-012) is its new in-edge from the System.
  - 🟢 Build-phase owed to ADR-004's own `Amended:` block: the 4 Additive effect-types. Owed to
    ADR-011 §3.7: the consequence-edge cycle extension. (Both flagged in ADR-012 + §5.20.)
  - Not yet committed: ADR-012 + ADR-002 wiring + gamification-doc reconciliation + manifests.
---
Date: 2026-07-19
Session goal: **exec #10 — Notifications** (the dead-last leaf) — CLOSES documentation-blueprint
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: **NOTIFICATIONS DOCUMENTED + Verify PASS + gate PASS + manifest ✅.** All 10 execs done —
  the documentation-blueprint module tier is COMPLETE. Doc-only; `packages/` diff = 0. Committed
  ADR-012 pass as `3765916` earlier this session; THIS Notifications work not yet committed.
Completed:
  - **Intake WHOLE** (`docs/intake/notifications.md`): current floor (1-table, 6-type, 0-logic —
    `reminder-engine.ts` is 0 bytes) + v1 harvest (../life-os: channels[]/metadata/NotificationPreferences)
    + **22-producer in-edge sweep** (subagent) + N1–N7 open questions.
  - **Deep architectural dialogue** (Victor asked for current architecture · problems · ZK limits ·
    recommendations before deciding). Key finding: **ZK collapses the channel matrix** — in-app =
    full fidelity (local rows) · push = wake-only · email = generic nudge · SMS = impossible.
  - **RESOLUTION (Victor accepted my recommendations):**
    - **N1 = derived-until-fire** — upcoming time reminders are a derived `dueIn()` agenda (no rows);
      a row materializes only at fire time. Event ones (`surface_notification`) are always rows.
    - **N2 = confirmed** — delivery config (channels/quiet-hours/toggles) = Preferences §5.17.
    - **N3 = content-free wake signal** → **surfaces ADR-013** (server relays "sync now" only; device
      composes locally after decrypt; no [E] content NOR entity refs on the wire). Own gated pass.
    - **N4 = lean + delivery-audit + optional metadata[E]** · **N5 = digest ⚠ INTENDED** · **N6 = 6
      types sufficient** · **N7 = expire→archive→purge lifecycle**.
  - **5 canonical aspect docs** written (`docs/features/notifications/`): identity · business-rules
    (NF-1…NF-15) · structure-data · contract · conventions. Deleted **5 empty off-standard stubs**
    (component-catalog/module-spec/page-map/service-contract/state-management-map) → canonical 5,
    matching the gamification precedent.
  - **Verify PASS** (No-Guessing spot-checks): `dueIn` = real Sessions provider primitive · §5.16
    E-marks · `reminder-engine.ts`=0 bytes · Relationships reminders/snooze — all confirmed.
  - **Wired:** features/README (#10 → documented) + docs/README manifest (#10) + ADR-002 §5.20 AMEND
    row (notifications delivery-audit + metadata[E]; dispatcher owes a service not a table).
Decisions (Victor):
  - Followed my recommendations wholesale (N1 derived-until-fire · N3 content-free wake-signal + a
    small ADR-013 · N5 digest intended-immature).
Surfaced: **ADR-013 (Zero-Knowledge Notification Delivery)** — content-free wake-signal push + per-
  channel ZK fidelity + on-device compose; cross-cutting (server relay + ADR-001 Phase-6.7 + ADR-003
  transport). Pending draft (its own gated pass, like ADR-011/012).
Next:
  - **The documentation-blueprint TASK is ready to CLOSE** (all 10 modules documented). `/task-complete`.
  - **ADR-013** is the one surfaced-but-undrafted follow-up (draft → independent-refute → revise →
    accept → wire, the ADR-011/012 rhythm). Victor's call: draft now as the capstone close, or after
    /task-complete as a fresh follow-up.
  - 🟢 Build-phase owed → §5.20: notifications delivery-audit cols + metadata[E]; the on-device
    dispatcher (`reminder-engine.ts`).
  - Not yet committed: the entire Notifications pass (intake + 5 docs + stub deletions + wiring + logs).
---
Date: 2026-07-19
Session goal: Draft + gate + accept + wire **ADR-013 "Zero-Knowledge Notification Delivery"** +
  full close-out audit of the whole documentation-blueprint cycle
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: **ADR-013 ACCEPTED + WIRED. Close-out audit PASS — the whole cycle is patched up.**
  documentation-blueprint is COMPLETE (10 modules + ADR-011/012/013). Doc-only; packages/ diff = 0.
  Notifications pass committed `45a2e00` earlier; THIS (ADR-013 + audit) not yet committed.
Completed:
  - **DRAFT ADR-013** — the ZK delivery model surfaced by Notifications N3. Three-tier: in-app
    (fully local) · **native local-scheduled** OS alerts (server-free, for time reminders) ·
    **content-free wake-signal** (events + web). Server composes/reads nothing.
  - **CRITIQUE — independent adversarial refute** (subagent). Verdict REVISE; 3 load-bearing +
    material, all verified vs files:
    (1) **ZK OVERCLAIM** — I'd written "wake-signal adds no new metadata surface (same as the relay)."
      FALSE: APNs/FCM = Apple/Google, a NEW *third-party* observer vs the first-party Cloudflare relay.
      Rewrote §3.5 as "content-zero, NOT observer-zero" naming the exposure honestly.
    (2) **MECHANISM OVERCLAIM** — "local scheduling all platforms/offline/closed" false for WEB (no
      background scheduling → wake-tier) + iOS silent-wake is throttled (the exact unreliability
      Option D was rejected for). Fixed: native-only local-schedule; closed devices get a generic
      VISIBLE push upgraded to real content on wake (not a silent wake).
    (3) **MISSING AUTHORITY** — ADR-003 is sync's single-source-of-truth + already owns a device
      registry + /api/devices/register; my `device_push_tokens` table duplicated it. Fixed: added
      ADR-003 to Amends; push tokens = COLUMNS on its registry; reused the existing route.
    + quiet-hours must be BAKED into the local schedule (fires with app closed, dispatcher can't
      gate live); wake-trigger reads nothing (blob-arrival + per-user routing); cite precision.
    (Critic errors I did NOT "fix": my intake doc DOES exist at docs/intake/notifications.md; NF-3
    DOES state derived-until-fire — both verified, cites kept.)
  - **REVISE** — all findings fixed; ADR internally re-verified.
  - **ACCEPT** (Victor) → **WIRE:** status Accepted; amender notes added to **ADR-001** (Phase-6.7
    push resolution) + **ADR-003** (wake-relay + registry push-token cols) + **ADR-002** header +
    §5.20 (device-registry push_token/push_platform AMEND row); 3 manifests + notifications/purposes
    structure-data pointers flipped to Accepted.
  - **FULL CLOSE-OUT AUDIT (Victor asked "check we didn't leave anything behind"):**
    · all **13 ADRs = Accepted** (none Proposed/pending) · all **20 documented contexts = exactly
    canonical-5** · **packages/ diff = 0** across the entire session · ADR-013 amender notes present
    in ADR-001/002/003.
    FIXED 3 drift items the audit caught: (a) **journals** carried the same 5 empty off-standard
    stubs notifications had → deleted (canonical-5 precedent; journals was the only other module
    with them) · (b) **features/README** Purposes row still said "ADR-011 — pending draft" → Accepted
    · (c) **purposes-and-goals/structure-data** still said "CAPSTONE ADR (to raise at Accept)" for
    ADR-011 → Accepted. Remaining "pending"/"to raise" grep hits are frozen historical artifacts
    (gate PLAN records, intake docs) or false positives ("to raise recall") — correctly left.
Decisions (Victor):
  - Accepted ADR-013 (three-tier delivery; timing-to-APNs/FCM accepted as the industry-standard
    floor, content stays client-only; privacy-max users run in-app + native-local only).
Next:
  - **documentation-blueprint is DONE** — ready for `/task-complete` (all 10 execs + ADR-011/012/013,
    all gated + accepted + wired; audit clean).
  - 🟢 Build-phase owed → §5.20 (for the schema build session): ADR-012 (currencies · consequence_
    ledger · store · rules · 4 Additive effects · user_profile split) · ADR-013 (device-registry
    push_token/push_platform cols · notifications delivery-audit · wake-relay server + local dispatcher).
    Owed to sibling ADR Amended-blocks at consolidation: ADR-004 §3.2.2 (+4 effects) · ADR-011 §3.7
    (consequence edges) — both flagged.
  - Not yet committed: ADR-013 + all wiring + the 3 audit fixes + logs.
---
Date: 2026-07-19
Session goal: The deferred work Victor flagged pre-/task-complete — **the 2 standing EX-2 ZK
  ADRs (014, 015) then Fiscal & Legal Phase-1** (the post-all-waves context)
Profile: Project Foundation → documentation-blueprint
Scenario: documentation-blueprint
Stack: Turborepo + pnpm, TypeScript 5.7, React 19, SQLite/SQLCipher + libsodium
Status: **ADR-014 + ADR-015 ACCEPTED + WIRED; EX-2 loop CLOSED; FISCAL & LEGAL Phase-1 DONE.**
  Doc-only; packages/ diff = 0 all session. Not yet committed.
Completed:
  - **Victor caught (pre-/task-complete): the deferred Fiscal & Legal** + its 2 dependency ZK ADRs
    (external-data-ingestion + AI/LLM), which EX-2 named but were never written. Chose: draft the 2
    ADRs first (they unblock Finance/Health/Projects too), then Fiscal & Legal.
  - **ADR-014 (External Data Ingestion under ZK) — ACCEPTED + WIRED.** Draft → independent-refute
    critique [REVISE] → revised. Then Victor gave a **richer integration model** (verdicts across 3
    turns): full-ZK impossible w/ 3rd parties → be honest; trust anchor = "a source the user already
    trusts + has data on"; **3 layers by who-owns**: **native** (curated first-party — Apple/Google
    Health) · **public-reference** (bundled/bulk, hides which item; the "gather without disclosing"
    idea = fetch the whole set, not the subset) · **user-managed** (Preferences self-service +
    cookbooks, Notion-style, user-owns-risk); LLM split to ADR-015; egress user-driven within our
    rails; our server unconditionally blind. **Restructured → SECOND critique [REVISE]** caught the
    recurring honesty-overclaim ("query-leak-free by construction" — my own cite said "mitigable";
    named the CDN observer; portfolio-leak via per-holding price fetch) + must-amend-ADR-010 + PJ-11
    mis-cite + normalization-contract for the upgrade path. All fixed. Wired: ADR-002 header + §5.20 +
    ADR-010 amender note + core index.
  - **ADR-015 (AI/LLM under ZK) — ACCEPTED + WIRED.** Draft → independent-refute [REVISE] caught: the
    **5th on-device honesty-overclaim** ("leaks nothing" → model-download leak + telemetry); the
    genuinely-important **prompt-injection** gap (agentic tool-loop + ingested untrusted content +
    sensitive-read + cloud-egress = injection→exfil chain) — added §3.4b bounding it; the BYO-key vs
    sandboxed-agent custody contradiction — resolved via §3.4a mediator-injected `askModel` (agent
    never holds the key); Amends ADR-014/ADR-010. Two modes: on-device/agentic (ZK-safe-for-content) ·
    cloud BYO-key (disclosed content dent); dedicated AI page; native later. Wired.
  - **EX-2 loop CLOSED** — constitution EX-2 "those two standing ADRs remain to be written" → both
    Accepted 2026-07-19 (ADR-014/015). All 15 ADRs now Accepted.
  - **FISCAL & LEGAL Phase-1** — the deferred context, now unblocked. Decisions (Victor): **FL1
    placement = Finance sub-feature** (chose tighter coupling over own-context); **FL2 scope =
    situate/organize/surface/model, filing HANDS OFF** (not TurboTax-for-world); **FL4 liability =
    first-class** (per-output "not professional advice", source=ai, no auto-actions). 5 aspect docs at
    `features/finance/fiscal-legal/` (FL-1…FL-14); INFORM=ADR-014 public layer, ADVISE=ADR-015. Verify
    PASS (corrected an overstated cite: Projects has project_contacts, not a legal-entity model →
    relabeled FACT→INTENT). Wired: §5.20 + both manifests + Finance identity pointer + intake RESOLUTION.
Decisions (Victor): the 3-layer integration model + honest-not-full-ZK premise; Finance sub-feature
  placement; filing-hands-off; first-class liability. All ADR Accepts one-by-one.
Next:
  - **documentation-blueprint is NOW TRULY COMPLETE** — all modules + all 15 ADRs + the deferred
    Fiscal & Legal. Ready for `/task-complete`.
  - 🟢 Build-phase owed → §5.20: ADR-014 (import_staging · connection_config · integration-identity +
    normalization contract · rule-pack provenance/signing) · ADR-015 (ai_connections · ai_conversations ·
    askModel mediator · on-device runtime · agentic tool-loop) · Fiscal&Legal (fiscal_residencies ·
    legal_entities↔Projects · jurisdiction tag on Finance · fiscal_obligations).
  - Pattern noted (saved to memory): 5 ADRs, 5 ZK-honesty overclaims caught by the independent critic;
    plus the prompt-injection catch. The gate is load-bearing on this project.
  - Not yet committed: ADR-014/015 + Fiscal & Legal + all wiring + logs.
---

---
Date: 2026-07-20
Task: build-roadmap
Goal: Set the platform's buildable deliverables as a phased, clustered map (dependency map + roadmap
      across modules/engines/integrations/architecture/applications), then mirror into Linear (scope B).
Completed:
  - Created task build-roadmap (.claude/tasks/build-roadmap.md); registered In Progress (TASKS.md, _index.md, panel #1).
    New scenario for project-foundation profile (build-roadmap) — to formalize via /new-scenario at close.
  - Captured Victor's INTENT (3 phases, confirmed): Phase 1 local dogfood (localhost web, single-user,
    built to complete) → Phase 2 venues (self-host · mobile · desktop) + web-first release (self-host OR
    ZK-cloud, ZK-cloud = perk) → Phase 3 personality (integrations + 2nd-level blocks, post-community).
  - Docs-patch pass: 4 parallel agents over 15 ADRs + 21 contexts + module-dependency-graph. Confirmed
    Phase 1 needs NO server/sync (web is local-first; keep _sync_* scaffolding, never flush). Integration
    register: 22 integrations → 6 DEFINED / 16 UNDEFINED provider (by design, ADR-014/015 punt to build).
  - Added the 5-layer STRUCTURAL FOUNDATION (Victor's key addition): Database · Architecture · Design
    System · UI · UX as first-class Phase-1.0 clusters. DB LEADS.
  - Wrote docs/roadmap.md — full decomposition (~43 clusters / 3 phases; DB granular per ADR-002 §5.20).
  - Investigated tracker: one task file = one Linear issue; # Cluster:→Project, ## Goal→issue desc,
    ## Dependencies→blocks relations. GAP: no milestones, no project descriptions in linear_client.py.
Decisions (Victor):
  - Deliverables organize module→application; engines/architecture are first-class deliverables.
  - Phases cut at visible "states reached" (progress must be legible + enjoyable).
  - Intent-first, docs-second (docs patch intent, don't originate it).
  - Database Layer leads Phase 1.0; cluster = Linear Project, issues = deliverable-level.
  - Push scope = Phase 1.0 only (staged; avoid stale 43-cluster dump).
  - Linear-structure gap → PATH 1: ENHANCE THE TRACKER (milestones + project descriptions) before push.
In progress:
  - Phase 1.0 Linear push — NOT started. Blocked on tracker enhancement.
Next session:
  - FIRST: commit/clean the dev-toolkit (uncommitted changes flagged at session start) — don't build on dirty.
  - THEN enhance tracker: linear_client.py add project description (projectUpdate) + ensure_milestone
    (projectMilestoneCreate) + issue→milestone assignment; tracker_sync.py parse # Milestone: + per-cluster
    project-description source; dry-run + tests; keep best-effort/backward-compatible.
  - THEN generate ~30 Phase-1.0 task files from docs/roadmap.md (clusters ①-⑤, issues DB-1..11/AR/DS/UI/UX,
    milestones, blocked-by links, ## Goal = concise+descriptive).
  - THEN /track-sync — relay each --approve-cluster to Victor (gated, outward-facing).
  - Full detail pinned in .claude/tasks/build-roadmap.md → "## Resume — NEXT".
---

---
Date: 2026-07-20
Task: build-roadmap
Goal: Enhance the tracker (path 1) so Phase-1.0 can be projectized into Linear with milestones +
      descriptive projects — the precondition before generating task files and pushing.
Completed:
  - Ran the full §XXVI Per-Step Build Gate on a TOOLKIT enhancement (code lives in ~/dev-toolkit):
    spec → critique(independent) → APPROVAL 1 → preflight → critique → APPROVAL 2 → implement.
  - Spec: ~/dev-toolkit/docs/specs/features/task-tracker-sync/milestones-and-descriptions.md (Phase 5, IMPLEMENTED).
  - Toolkit commits: 5cd9562 (3.9 `from __future__` shim clean-up — HEAD's tracker_sync.py crashed on
    import; completed the skipped file from 78e6502) + 1217af4 (feat: milestones + project descriptions).
  - linear_client.py: new ensure_milestone (idempotent); ensure_project +description (read-back
    change-detection, non-blocking projectUpdate); ensure_issue +milestone_id (bind re-asserted on
    known-id AND natural-key AND create paths).
  - tracker_sync.py: `# Milestone:` anchor (free-form) + `.claude/tasks/_clusters.md` sidecar (strict
    `### Milestones` + per-cluster description) parsers; do_sync milestone/description pass over mapped
    projects (skips pending clusters); map `milestones` store; `_clusters.md` excluded from task glob.
  - Verified: offline unit tests + 9/9 LIVE smoke on a throwaway initiative (create · idempotent re-sync
    0-dupes · unbind+rebind · full API cleanup). Back-compat proven on the real repo (--status unchanged).
In progress:
  - Step 5 of build-roadmap: tracker enhancement DONE; task-file generation + gated push NOT started.
Decisions:
  - Milestones = TWO composed sources (free-form anchor + strict `_clusters.md`), never invented; a
    free-form name with no strict match is created but WARNed on creation (visible typo). [Victor]
  - Project descriptions = `_clusters.md` sidecar (decision A). One declarative sidecar holds both.
  - Field names live-introspected before coding (Linear API may have moved) — all confirmed.
Next session:
  - FIRST ACTION: plan the Phase-1.0 task-file generation (doc-generation unit → §XXVI LITE path).
  - Generate ~30 task files from docs/roadmap.md (clusters ①-⑤; DB-1..11 / AR / DS / UI / UX; each with
    `# Cluster:` + `# Milestone:` + concise `## Goal` + blocked-by links) AND author `.claude/tasks/_clusters.md`
    (5 cluster descriptions + strict `### Milestones` per cluster).
  - THEN gated `/track-sync` — relay each `--approve-cluster` to Victor (outward-facing).
  - Full detail: .claude/tasks/build-roadmap.md → "## Resume — NEXT".
---

---
Date: 2026-07-20
Task: build-roadmap
Goal: Step 5b + Step 6 — generate the Phase-1.0 task files (clusters ①-⑤) + `_clusters.md`, then
      gated `/track-sync` push to Linear (cluster-first).
Completed:
  - Read the tracker contract from source before writing: `# Task:` is triple-duty (filename =
    Linear issue title = blocked-by id); tracker scans `.claude/tasks/*.md` NON-recursively; issue
    body = `## Goal` + auto `toolkit:<slug>` marker; `_clusters.md` = per-`## cluster` description
    (pre-`###`) + strict `### Milestones` list.
  - Wrote 35 issue task files flat in `.claude/tasks/`: DB-1..11 (11), AR-1..9 (9), DS-1..5 (5),
    UI-1..4 (4), UX-1..6 (6). Each: `# Cluster:` + `# Milestone:` + `# Phase:` + `# Source:` +
    `## Goal` (the Linear body) + `## Dependencies` (blocked-by lines). Kebab-slug titles.
  - Authored `.claude/tasks/_clusters.md` — 5 cluster descriptions (≤255) + 11 strict milestones.
  - Verified pre-push via `tracker_sync.py --status`: 5 projects + 35 issues + 11 milestones all
    resolve, every `◇milestone` matched, every blocked-by resolved, zero warnings.
  - PUSHED to Linear (cluster-first): ① Database Layer alone → Victor verified → approved + pushed
    ②③④⑤. Result: 35 issues LIF-61…95 · 5 projects · 14 milestones · ~34 blocks-relations, all
    BACKLOG. Cross-cluster edges landed (db-6→ar-2, db-8→ar-8, db-2→ar-9, ds-5→ui-1, ar-4→ui-3,
    ux-3→ui-4, ar-3→ux-5). DB issues re-synced idempotent (`=`, 0 dupes).
In progress:
  - Steps 7 (quality gate: victor:quality-gate-foundation + /critique) and 8 (formalize the
    build-roadmap scenario via /new-scenario) NOT started — deferred to next session by choice.
Decisions:
  - File placement: 35 issue-files flat in `.claude/tasks/` (tracker is non-recursive — a subdir
    would be invisible), NOT indexed in TASKS.md/_index (backlog, not active sessions). [Victor]
  - Titles: kebab-slug (= filename = blocked-by id), matching existing convention. [Victor]
  - Description fix: Linear caps `project.description` at 255 chars; the 5 blurbs were 349–455 →
    `projectCreate` INVALID_INPUT. Chose to TIGHTEN all to ≤255 now (unblock) over the heavier
    toolkit fix (write long body into Linear's `content` field). [Victor] — toolkit fix FILED as a
    deferred §XXVI follow-up in build-roadmap.md "## Toolkit follow-up".
Failures this session:
  - F: `projectCreate` INVALID_INPUT (Argument Validation Error) on all 5 clusters — root cause
    `project.description` > 255-char Linear cap. Resolved: tightened `_clusters.md` descriptions to
    ≤255, re-pushed clean. Create failed atomically (no partial state) → safe retry.
  - Note: bare `--sync` was denied once by the auto-mode classifier (read as a full push vs the
    cluster-first boundary); Victor re-authorized. Mechanism clarified: approval-state gates scope,
    not command-scope (no `--cluster` flag exists).
Next session:
  - FIRST ACTION: run Step 7 — `victor:quality-gate-foundation` + `/critique` on docs/roadmap.md +
    the Linear structure. Verdict SHIP/REVISE/RETHINK. Check: phase placement, dep-graph
    completeness (missing/over-constraining edges), DB-leads vs UX-track critical path, roadmap↔issue
    coverage both directions.
  - THEN Step 8: `/new-scenario project-foundation build-roadmap` to formalize the scenario + close.
  - Context to resume: everything is already in Linear (LIF-61…95). Task-file source of truth =
    `.claude/tasks/{db,ar,ds,ui,ux}-*.md` + `_clusters.md`. Full detail: build-roadmap.md "## Resume".
---
Date: 2026-07-20
Task: build-roadmap
Goal: Step 7 (foundation quality gate on docs/roadmap.md + the Linear structure) + Step 8 (formalize the
  build-roadmap scenario via /new-scenario + /session-log) — closing out the roadmap task.
Completed:
  - STEP 7 GATE → verdict REVISE → fixed → SHIP. Foundation checklist PASS + independent adversarial
    critic (fresh subagent). Found+fixed 1 BLOCKER + 2 MAJOR + 2 MINOR:
      · [BLOCKER] AR-2⟵DB-6 dependency INVERTED — the DatabaseAdapter (adapter.ts owns open→migrate→
        query→close) is BELOW the repository, but the graph blocked the adapter on the repo. Fixed:
        DB-6/DB-7 ⟵ AR-2, AR-2 ⟵ DB-1. Verified vs adapter.ts before accepting the critic's call.
      · [MAJOR] Missing crypto edge — DB-5 (encryptRow/XChaCha20) had no path to AR-3. Fixed: DB-5 ⟵ AR-3.
      · [MAJOR] "19 structure-data docs" → actually 24 on disk. Fixed docs/roadmap.md DB-4; ADR-002 §5.20
        fix owed via DB-11.
      · [MINOR ×2] flagged "non-structural no-flush" as HLC-encoding F10-coupled; reworded single-track
        DB→AR critical path in the roadmap.
    Zero fabricated ADR cites (critic spot-checked §5.20/§17/F1/F6-D4/F7-D7 — all resolve).
  - Task-file edits: ar-2/db-6/db-7/db-5 `## Dependencies` corrected. roadmap.md: 3 edits (count + 2 flags).
  - Linear re-synced: Victor deleted the stale `db-6 blocks ar-2` relation via UI; add-only `--sync`
    created the 4 new edges (ar-2⟵db-1, db-6⟵ar-2, db-7⟵ar-2, db-5⟵ar-3) — verified live on 2nd pass.
    Graph now acyclic; `tracker_sync --status` clean, zero warnings.
  - STEP 8 scenario formalized: `/new-scenario project-foundation build-roadmap` →
    `~/dev-toolkit/claude-profiles/project-foundation/scenarios/build-roadmap.md` (CRYSTALLIZE mode) +
    router ## Scenarios table + Dispatch routing updated. Grammar contracts pass (Step 0..8 contiguous,
    Skill/Trigger/Feeds-into present, execute-plan-doc MOLD wired, 7 sections). Non-code shape (LITE gate,
    no Currency step) mirroring documentation-blueprint.
Decisions:
  - Scenario encodes the gate BEFORE the outward push (Step 5), not after — this session ran the gate
    AFTER the Linear push and paid for it (a BLOCKER inversion forced a re-sync). The late-gate mistake is
    recorded in the scenario's Session Origin + Anti-Patterns as the lesson.
  - AR-2 gains `blocked by db-1` (adapter imports the schema module) — keeps "Database Layer leads" true
    while un-stacking the AR substrate from behind the full DB repository.
Failures this session:
  - F: naive add-only `--sync` would have created a Linear CYCLE (stale `db-6 blocks ar-2` + new
    `ar-2 blocks db-6`). Caught before pushing by inspecting linear_client (no issueRelationDelete).
    Resolved: manual UI deletion of the stale relation, then add-only sync. Toolkit gap FILED
    (tracker relation sync is add-only → needs issueRelationDelete + diff-reconcile) in build-roadmap.md
    "## Toolkit follow-up".
Next session:
  - FIRST ACTION: `/task-complete build-roadmap` — all 8 path steps are done (roadmap SHIP'd, Linear
    corrected, scenario formalized). Then run `/toolkit-check` before committing `~/dev-toolkit` (the new
    scenario + router edits are uncommitted there).
  - THEN the build phase begins: the "Build phase — schema consolidation" planned task (ADR-002 §5.20
    owed-tables → real Drizzle schema in packages/core) — which IS Phase-1.0 cluster ① Database Layer,
    starting at DB-1. Everything is in Linear (LIF-61…95); dependency graph is now correct.
---

---
Date: 2026-07-20
Session goal: Begin build phase — DB-1 schema-primitives (Drizzle substrate + column conventions)
Profile: Project Foundation → Generic Coding Session (switched at PROFILE CONFIRM)
Scenario: Default (generic-coding-session/scenarios/default.md)
Stack: Turborepo + pnpm, TS 5.7 strict, React 19, Drizzle ORM, SQLite/SQLCipher
Status: in progress
Note: Profile switched project-foundation → generic-coding-session for the build phase.
      CLAUDE.md carries no `# Profile:` line — this session-log entry IS the persistence (per begin.md PROFILE CONFIRM).

---
Date: 2026-07-22
Task: db-1-schema-primitives + storage-master-plan (both COMPLETED this block)
Goal: Ship DB-1 (storage primitives), then author the campaign's governing artifacts (ADR-016 + master plan).
Completed:
  - DB-1 / LIF-61 — packages/core/src/db/schema/{_shared,_registry,index}.ts (12 exports; enumText; NO enumCheck).
    Verified tsc green core/web/server; additive (monolith untouched). Both build gates + full review battery
    (code-review/quality-gate/critique/preflight) + 4 consistency passes. Commit b234e85. Linear LIF-61 → Done.
  - Reconciliation established: v1 schema ~60% stale vs v2 target (docs/infrastructure/database-schema-reconciliation.md).
  - ARCHITECTURE FINDING: DDL is hand-written SQL migrations (ADR-002 §5) + Zod (DB-9); Drizzle is query-only;
    NO drizzle-kit. A Drizzle check()/enumCheck helper emits nothing → removed from DB-1.
  - ADR-016 (docs/core/decisions/ADR-016-storage-layer-rebuild-from-zero.md) — from-zero rebuild decision, fork A
    (hand-written SQL). Registered in docs/core/README.md. /critique → SHIP.
  - storage-build-plan.md (docs/infrastructure/) — master table ledger ~130-150 tables, FK-ordered P0→P-final,
    ✓/⏳/↔, DB-2…DB-11→phase map, per-table spec template, row-state lifecycle. /critique REVISE → 8 fixes applied.
    Commit 58dc813. Both gates cleared (Approval 1 fork-A + Approval 2).
In progress:
  - (none) — both tasks archived. TASKS.md In Progress empty.
Decisions:
  - DDL-generation fork RESOLVED = (A) hand-written SQL migrations, no drizzle-kit (ADR-016 §3.2). B's revisit
    trigger preserved ("before DB-3 authors at volume"). [ADR-016]
  - Storage rebuilt FROM ZERO (no data → zero migration cost). Per-table gating (each table = own build gate).
  - Memory saved: read-architecture-before-implementing (docs decide the implementation; don't impose a default).
Next session:
  - FIRST ACTION: start DB-2 / LIF-62 — P0.5 sync columns: add `_sync_field_ts` to syncColumns in
    packages/core/src/db/schema/_shared.ts + decide the HLC representation of _sync_lww_ts/_sync_field_ts (F6/D4).
    A primitive amendment (before domain tables). Follow the Per-Step Build Gate (per-table gating model).
  - Context: campaign governed by ADR-016 + docs/infrastructure/storage-build-plan.md (the ledger — read it first).
    Profile: Generic Coding Session / Default. Branches feat/db-1-schema-primitives + feat/storage-master-plan are
    stacked and UNPUSHED (b234e85·b2ff2de·58dc813·b4547c2) — decide push/PR.
---

---
Date: 2026-07-23
Task: db-2-sync-metadata-columns (opened, then PARKED) → strategic resequencing (ADR-017)
Goal: Start DB-2 (sync-metadata columns). Pivoted mid-session to rethink the whole first-deliverable
      strategy; closed by documenting the decision, killing DB-2, and cleaning context for a fresh
      planning session.
Completed:
  - /task-new db-2-sync-metadata-columns (LIF-64): task file + spec stub (docs/specs/foundation/db-2-...)
    + indexes + Linear push (IN_PROGRESS) + panel. Merged the pre-existing 2026-07-20 stub's ADR-003 §17 /
    ADR-004 F1 / HLC F6-D4-d scope. Found the ground-truth anchor: ADR-002 §5.20 ledger (data-model.md:3790-3794).
  - §XXVI.1a document-context BASELINE: confirmed docs/infrastructure/database-layer/current-{spec,business-rules}.md
    are CURRENT vs DB-1's shipped code (syncColumns=6; _sync_field_ts owed to DB-2; DDL=hand-written SQL). No drift.
  - DB-2 PLAN research (ADR-003 §6.1/§17 read in full): the HLC-representation fork (F6/D4-d) analyzed — string /
    BigInt / two-column. Recommended zero-padded lexicographic STRING (only encoding uniform across row col +
    _sync_field_ts JSON map + wire header + blob_index; matches ADR-003's lexicographic compare; dodges the
    float64 2^53 trap). Surfaced for sign-off — NOT resolved (superseded by the pivot).
  - STRATEGIC PIVOT (the real work): analyzed delivery options against the established stack. Read ADR-001 (web/
    desktop targets), DatabaseAdapter seam (packages/core/src/db/adapter.ts), the working web-adapter.ts (~473 LOC),
    repository encrypt/decrypt seam, and confirmed sync/{resolver,crdt,queue}.ts = 0-line stubs.
    KEY FINDING: the codebase is already authored for "encryption-off now, bolt-on later" —
    DEFAULT_SQLCIPHER_CONFIG.passphrase='' (adapter.ts:133), pass-through encryptRow/decryptRow, empty sync stubs.
    Options A (web SPA, @vida/web) and D (Tauri desktop, @vida/desktop) are BOTH documented app targets, not
    deviations. ~90% of remaining work (the empty @vida/ui + @vida/editor + feature screens) is shared React → the
    A/D choice only touches the storage adapter + distribution.
  - AUTHORED ADR-017 (docs/core/decisions/ADR-017-features-first-resequencing-defer-encryption-sync.md) + registered
    in docs/core/README.md. Records: Phase 1.0 inverted to FEATURES-FIRST; encryption (SQLCipher+libsodium) / sync
    (HLC/Yjs/blob) / SRP auth DEFERRED to a post-validation hardening pass (seams exist → bolt-ons); deliver A (web
    SPA, tester vehicle) → graduate to D (Tauri, durable+encryption-ready daily-driver) off one codebase. Amends the
    SEQUENCING of ADR-016/001 + roadmap; changes NO architecture; ZK thesis deferred, not dropped.
  - KILLED DB-2 honestly: status → PARKED (not "done"); archived to .claude/tasks/archive/; spec stub bannered
    SUPERSEDED; TASKS.md In Progress cleared + "Storage rebuild" campaign marked ⏸ PARKED by ADR-017; _index.md
    moved to Parked/Superseded; docs/specs/_index.md marked PARKED. Native panel task deleted.
In progress:
  - (none) — context intentionally cleaned for a fresh planning session.
Decisions:
  - ADR-017: features-first resequencing (see above). Encryption/sync/auth = deferred hardening pass, not dropped.
    Delivery path A(web SPA)→D(Tauri). [docs/core/decisions/ADR-017-*.md]
  - DB-2 parked: the HLC/sync-metadata work is only needed when sync flushes → defers WITH the sync engine. The
    string-encoding recommendation is preserved in the session-log + the parked spec stub for when it resurfaces.
  - Rejected Option B (Supabase/Vercel cloud MVP): would make encryption a REWRITE not a bolt-on, validates
    features but not the ZK thesis, exposes plaintext life-data during testing. (ADR-017 §3.)
Failures this session:
  - F: direct Linear API state-flip (LIF-64 → Backlog via linear_client --set-state) was PERMISSION-GATED
    (external write not explicitly authorized). Local files + tracker map cache set to BACKLOG; the actual
    Linear cloud issue LIF-64 still shows In Progress → OWED: Victor flips it (or authorizes the write).
Next session:
  - FIRST ACTION: plan the FIRST DELIVERABLE, resequenced per ADR-017 — how the usable product gets built
    features-first on the local-first stack (encryption/sync/auth deferred), delivered A(web SPA)→D(Tauri), given
    the CURRENT repo state. Open by authoring that execution plan (victor:planning / /documentation-component),
    then convert to a task. No task exists yet by design.
  - READ FIRST: docs/core/decisions/ADR-017-*.md (the authorization) + docs/roadmap.md Phase 1.0 (deliverables
    unchanged, order replaced). Current build reality: @vida/types (2639 LOC) + @vida/core (4834 LOC, incl.
    encryption code) real; web-adapter.ts real; @vida/ui + @vida/editor + feature screens EMPTY (the real lift);
    apps/desktop = Tauri shell only (DB adapter unwritten). Encryption-off is already the default.
  - OWED: flip Linear LIF-64 → Backlog.
---

## 2026-07-23 — PROFILE SWITCH
- Switched active profile: Generic Coding Session → **Project Foundation Setup**, scenario **Build Roadmap**.
- Rationale: ADR-017 kept the Phase-1.0 deliverables unchanged but inverted the ORDER to features-first
  (encryption/sync/auth deferred). Re-sequencing + re-projectizing an already-specified deliverable set is
  exactly the Build Roadmap scenario's remit — not defining from zero, not documenting contexts.
- CLAUDE.md has no `# Profile:` line → not injected; this entry is the persistence. No active task file yet.
---

---
Date: 2026-07-23
Task: build-roadmap-resequence → reframed as the FOUNDATION-REALIGNMENT MASTER CAMPAIGN (roadmap resequence = Part 3)
Goal: Open the features-first roadmap resequence (ADR-017) — which surfaced a deeper truth: the whole
  vida-platform code + architecture is stale life_os-migration residue that predates the documentation
  foundation. Pivoted to authoring a gated master plan to realign docs → structure → roadmap.

Completed:
  - Profile switch: Generic Coding Session → Project Foundation Setup / Build Roadmap (session-log persisted).
  - Created task `build-roadmap-resequence` (Linear LIF-96, new cluster General_Vida) + forward-spec stub.
  - Step 2 docs pass (2 agents): (a) module table-complexity census — Tasks is only 2 tables (project FK is
    nullable SET NULL), Habits smallest true loop, Notes forced-first hub; (b) code-reality audit — found ADR-017
    overclaims a "pass-through crypto seam" that doesn't exist (repository.ts:231 requires an unlocked vault).
  - REFRAME (Victor): code is stale, architecture never derived from the finished docs, early module docs need
    re-run. Held framing (decision C = let the baseline decide the shape).
  - Ran a 4-agent read-only CURRENT-STATE BASELINE → persisted `docs/specs/foundation/current-state-baseline/baseline.md`.
    Findings (all cited): ~99.3% of code (2026-03-27 dump) predates the doc foundation; only 3 files/59 LOC (DB-1)
    are current; 65% of files are 0-LOC stubs; architecture (code + docs/core/architecture/*) INCOHERENT with ADRs
    004–017 (5 substrate frameworks have zero home); early module docs stale (re-run warranted, named drivers);
    ~74% of the roadmap's Structural Foundation unbuilt; legacy layer identified (docs/architecture.md + 3 empty docs
    + CLAUDE.md drift).
  - Authored the MASTER PLAN `docs/specs/foundation/realignment-master-plan/_index.md` (3 gated parts:
    docs → structure → roadmap; umbrella framing). Ran independent adversarial /critique → REVISE (B1 real ADR-016
    violation: §5.20 reconciliation belongs to DB-11, not Part 1; B2 doc-count precision; B3 define "aligned";
    B4 capability-framework must be a gated deliverable with mechanical predicates; N1–N4). Fixed ALL.
  - Victor APPROVED at gate 1.
  - Memory: added `dont-sketch-run-the-gate-for-foundational-scope`; corrected `authoritative-docs` (docs/core/
    architecture/* is ALSO stale — precedence is ADRs > arch docs > legacy).

In progress:
  - Foundation-realignment campaign: gate 1 approved; NOTHING executed yet. Part 0 is the next unit.

Decisions:
  - Foundation-realignment master plan APPROVED (gate 1). 3 sequential parts, foundation-first. Parts 2–3 are
    forward-declarations (own gate-1 later). [docs/specs/foundation/realignment-master-plan/_index.md]
  - build-roadmap-resequence is Part 3 of this campaign, not a standalone task.
  - Scenario-name assumption: `documentation-realignment` (unconfirmed). "RP to deliver" = [UNKNOWN] (deferred to Part 3.0).
  - Withdrew the Step-2 "reuse the existing adapter/repository" recommendation — that code is stale residue.

Next session:
  - FIRST ACTION: execute Part 0 of the approved master plan.
    (1) `/new-scenario project-foundation documentation-realignment` — formalize the gating+phasing methodology.
    (2) Build the GATED `docs/specs/foundation/capability-framework.md` — enumerate every ADR-004–015 capability
        with a mechanical presence/absence predicate + applies-to list (LITE gate: critique + approval).
    Then Part 1: quarantine legacy (docs/architecture.md + 3 empty docs; fix CLAUDE.md drift) → staleness sweep of
    all 24 contexts against the predicates → re-run stale docs, Notes & Pages FIRST.
  - READ FIRST: docs/specs/foundation/realignment-master-plan/_index.md (APPROVED) + its baseline.
  - CONFIRM with Victor: scenario name (documentation-realignment?) + what "RP" abbreviates.
---

---
Date: 2026-07-23
Task: build-roadmap-resequence (foundation-realignment master campaign)
Goal: Execute Part 0 (setup) of the approved foundation-realignment master plan, then open Part 1.

Completed:
  - PART 0 (both deliverables, LITE gate passed):
    - Scaffolded scenario `documentation-realignment` in the dev-toolkit (~/dev-toolkit,
      committed 9440a47) — measure→sweep→selective-re-run methodology, non-code (execute-plan-doc),
      schema-valid (steps 0-7, Skills 7/7/7). Router table + dispatch route updated.
    - Authored `docs/specs/foundation/capability-framework.md` — 85 capabilities from ADRs 004-015
      (3 parallel cited-extraction agents), 7 shared rails, two-token predicate model (presence
      token + stale anti-signal), applies-to membership rules, §5 definition-of-aligned.
    - Independent adversarial critique → REVISE: B1 (R2 guarded-write rail had two READ-seam
      citations cross-wired), B2 (ADR-010 missing A8 revocation + A9 resource-limits), B3
      (CHECK-token honesty). All fixed. RATIFIED by Victor.
  - PART 1.0 (legacy quarantine + foundation lock, LITE gate passed):
    - Quarantined 4 legacy docs → docs/_legacy/ (+README): architecture.md (contradicts ADRs on
      5 axes) + 3 empty root stubs (sync-protocol/encryption/editor-blocks). Reversible git renames.
    - CLAUDE.md foundation lock: Reference section repointed to ADR-001-017 + framework; Data-Domains
      retired tokens fixed (page_tags→entity_tags, flashcard_*→review engine, xp_history→
      consequence_ledger, purpose_* junctions→contributions, pomodoro_sessions→sessions).
      ADR-path drift did NOT reproduce (already correct) — not "fixed" (No-Guessing).
    - definition-of-aligned ratified → framework §5 (single source of truth).
  - Committed: vida-platform cb21f73 (Part 0 + 1.0); dev-toolkit 9440a47 (scenario).

In progress:
  - PART 1.1 staleness sweep — NOT STARTED. Run framework §5 + §3 predicates across all 24 contexts
    + 8 docs/core/architecture/* docs; per-context verdict (aligned / stale+named-drivers / gap).
    Persisted analysis. This triage gates WHICH contexts advance to Part 1.2 re-runs.

Decisions:
  - Scenario name = `documentation-realignment` (confirmed by Victor; the master-plan [ASSUMPTION] resolved).
  - Framework structure: 7 shared rails factored out (R1 idempotency … R7 read-seam); two-token predicate
    (presence + stale anti-signal) makes the sweep grep-mechanical; applies-to as membership RULES not
    hand-lists (coverage stays decidable as contexts appear).
  - Part 1.0 scope held tight: only the 4 baseline-named legacy files quarantined; the ~24 OTHER empty
    doc stubs (editor/infrastructure/platform/ui/languages) deferred to Part 2 (structure) — flagged in
    docs/_legacy/README, not silently swept.
  - CLAUDE.md foundation lock = drift-fix only; full ADR-004-017 summary rewrite deferred (bigger refresh).
  - "RP" abbreviation still [UNKNOWN] — deferred to Part 3.0 (non-blocking).

Next session:
  - FIRST ACTION: execute Part 1.1 (staleness sweep). Fan out read-only agents over the 24 context
    `structure-data.md` docs (+ siblings where a driver touches them) + the 8 arch docs, scoring each
    against `docs/specs/foundation/capability-framework.md` §5 + §3. Persist the verdict table.
  - READ FIRST: capability-framework.md (§3 predicates + §5 checklist + §4 applies-to rules) +
    realignment-master-plan Part 1.1 row. Ordering hint for 1.2: Notes & Pages first (in-degree-14 hub).
---

---
Date: 2026-07-23 (cont.)
Task: build-roadmap-resequence (foundation-realignment campaign)
Goal: Execute Part 1.1 (staleness sweep) of the campaign.

Completed:
  - PART 1.1 COMPLETE (analysis, persisted → docs/specs/foundation/staleness-sweep.md):
    - 5 read-only scoring agents (clustered by domain) scored all 24 context structure-data.md docs
      + 8 docs/core/architecture/* docs against the ratified capability-framework predicates. Cited findings.
    - Result: CONTEXTS 10 stale / 7 gap / 7 aligned; ARCH 4 stale / 4 partial (0/8 reference ADR-004+).
    - Surfaced the AS-IS EXEMPTION (F1): 3 agents independently flagged that the raw "anti-signal → stale"
      rule wrongly fires on retired tokens that appear ONLY in a flagged As-is FACT floor which [INTENT]
      explicitly retires. Refined to a location-qualified rule (stale only if the token is forward/[INTENT]
      or uncorrected). Victor CONFIRMED → codified into capability-framework.md §1.3. Moved purposes-and-goals,
      gamification, knowledge from stale → aligned.
    - Persisted the Part 1.2 dependency-first re-run ordering (Tier 0 notes-and-pages → feeders → gap-fills
      → arch docs in 1.3) + findings F2 (measurability/ingest gap families), F3 (entity_tags under-named), F4.
  - Committed: (this checkpoint) — Part 1.1 sweep + framework §1.3 amendment.

In progress:
  - PART 1.2 doc re-runs — NOT STARTED. 17 stale+gap contexts, each re-run through documentation-blueprint
    under its own LITE gate (plan→critique→approval per context). Dependency-ordered; notes-and-pages FIRST.

Decisions:
  - As-is exemption ratified (framework §1.3): a retired token in a properly-flagged As-is floor that [INTENT]
    retires does NOT trigger stale (R6's whole purpose). Naming a retired token as the forward mechanism is still stale.

Next session:
  - FIRST ACTION: start Part 1.2 with notes-and-pages (Tier 0 hub, in-degree-14). Re-run it through the
    documentation-blueprint methodology under a LITE gate: fix SP1 (page_tags→entity_tags), SP2 (open
    registry vs closed entity_type CHECK(33)), SP4, add SP3 (parent_tag_id), and complete the pomodoro
    re-home to the sessions supertype. Then Tier 1 (sessions-and-scheduling, projects, health/core, habits,
    finance, tasks, relationships, pomodoro, knowledge/flashcards).
  - READ FIRST: docs/specs/foundation/staleness-sweep.md (verdict table + Part 1.2 ordering) +
    capability-framework.md (§3 predicates for the target context) + the target's current structure-data.md.
---

---
Date: 2026-07-23 (cont.)
Task: build-roadmap-resequence (foundation-realignment campaign)
Goal: Start Part 1.2 (doc re-runs) — re-run the Tier-0 hub context `notes-and-pages` through the realignment methodology under its LITE gate.

Completed:
  - PART 1.2 STARTED — `notes-and-pages` (Tier 0 hub, in-degree-14) re-run COMPLETE.
  - Grounded: read staleness-sweep row 1 + capability-framework §2–§5 (SP1–SP7, S1–S7, R6, As-is exemption)
    + all 5 aspect docs. No-Guessing baseline = the persisted sweep + framework (inputs already on disk).
  - Persisted the per-context LITE-gate PLAN: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/notes-and-pages.md
  - Independent adversarial critique (fresh subagent) → REVISE, 3 blocking, all fixed:
      B1 bare `focus` → real ADR-004 token `focus_sessions` extension + `sub_type` (value [UNKNOWN — build-phase]);
      B2 assert the DECIDED ADR-006 §3.1 consumer-ownership reframe (was over-deferred); defer only physical code home;
      B3 reconcile the sweep's named 007 driver — flag the view lines [INTENT — DEFERRED] rather than silently skip.
  - Victor approved the revised PLAN (LITE = one gate). Implemented all 5 aspect docs:
      imposed R6 two-tier As-is (FACT floor) / [INTENT] split; retired SP1 (page_tags→entity_tags, N&P=consumer),
      SP2 (entity_links CHECK(33)→open registry), SP3 (parent_tag_id), SP4 (tags vs links distinct), S1 (pomodoro→focus_sessions/session_id).
  - Acceptance verified mechanically (grep): retired tokens As-is-only; forward tokens present; pages.type CHECK(6) preserved.
  - Advanced trackers (master-plan _index 1.2, task file Session History, TASKS.md). Committed cbc8560 (gitleaks clean).

In progress:
  - PART 1.2 continues — 16 stale/gap contexts remain. notes-and-pages (Tier 0) is the only one done.

Decisions:
  - Ownership reframe is ASSERTED not deferred: ADR-006 §3.1 already decides N&P is a CONSUMER of the tag
    primitive (no longer owns a tag junction). Only the physical package/directory home is [DEFERRED — Part 2].
  - 007/V1 (saved-views-as-`views`-rows) deferred to a dedicated views/Spaces pass (Victor) — but flagged in-doc
    to reconcile with the sweep's named 007 driver; not silently skipped.
  - S1 forward token standardized to ADR-004's real `focus_sessions`; `sub_type` discriminator value left [UNKNOWN — build-phase].

Next session:
  - FIRST ACTION: Tier 1 re-run — `sessions-and-scheduling` (sweep verdict = GAP; the effect-producing foundation
    many modules ride: S4 effect catalogue, S5 lifecycle enum, R1 idempotency rail effect_event_id/applied_effects).
  - Repeat the established unit loop: ground (sweep row 6 + framework §3 S1–S7 + target structure-data) → persisted
    PLAN → independent adversarial critique → fix → approve → implement (R6 two-tier; cite conceptual owner, defer code home).
  - READ FIRST: docs/specs/foundation/staleness-sweep.md (row 6 + Part 1.2 tiers) + capability-framework.md (§2 R1, §3 ADR-004)
    + docs/features/sessions-and-scheduling/structure-data.md. Then rest of Tier 1: projects, health/core, habits, finance → tasks, relationships, pomodoro, knowledge/flashcards.
---

---
Date: 2026-07-23 (cont.)
Task: build-roadmap-resequence (foundation-realignment campaign)
Goal: Part 1.2 Tier-1 — re-run `sessions-and-scheduling` (sweep verdict = gap; the effect-producing foundation many modules ride) through the realignment methodology under its LITE gate.

Completed:
  - PART 1.2 — `sessions-and-scheduling` (Tier 1, verdict=gap, drivers 004/002) re-run COMPLETE.
  - Grounded: sweep row 6 + framework §2 (R1/R2 rails) + §3 ADR-004 (S1–S7) + ALL 5 aspect docs.
    KEY REFINEMENT: the sweep scored only structure-data.md (its stated scope, L8). Reading all aspects showed
    S4 (effect catalogue) already present in contract.md L23 and S5 (lifecycle enum) in business-rules.md L83 —
    only R1 (`applied_effects`/`UNIQUE effect_event_id`) was the genuine gap. So the real fills were narrower
    than the row-6 verdict implied. (Written into the Next-session pattern: read ALL aspects to refine the sweep.)
  - Persisted the per-context LITE-gate PLAN: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/sessions-and-scheduling.md
  - Independent adversarial critique (fresh subagent) → SHIP / 0 blocking. Critic verified against source:
    ADR-004 §3.2.2/§3.2.3/§3.2.5 exist with every cited token (no fabrication); present/absent diagnosis correct
    at every line; `applied_effects`/`UNIQUE` genuinely absent from all 5 aspects; C1 `xp_history` is a forward
    [INTENT] target (As-is exemption does NOT cover it) → C1 correctly IN-SCOPE; no boundary/DDL violation.
  - Folded 3 non-blocking cite-precision notes: N1 (E4 pin → ADR-012 §3.1, not §3.3), N2 (empty/error stay the
    doc's runtime tail, NOT framework-S5 CHECK members), N3 (`grant_currency` = E2 feeder / E4 Additive class).
  - Victor approved (LITE = one gate). Implemented 4 of 5 aspects (identity untouched — no gap reached it):
    ADDITIONS-not-retirements — named the S4 8-effect catalogue on `session_effects`; the S5 7-state `status`
    CHECK on the `sessions` spine; the R1 rail (`effect_event_id` + `UNIQUE` + `applied_effects` ledger) on the
    effect foundation. C1: retired forward `xp_history` → `consequence_ledger` (ADR-012 E3/E4). C2: fixed
    capability-ID label drift (S1/S3/S4/S5) across structure-data, business-rules, contract, conventions.
  - Acceptance verified mechanically (grep): R1 tokens present on spine + handlers; catalogue + enum named;
    no forward `xp_history`; zero residual capability-ID mis-tags; `applied_effects` code home deferred (boundary held).
  - Advanced trackers: PLAN → IMPLEMENTED; master-plan _index (Part 1.2 row + 2 change-log entries);
    task Session History; TASKS.md. This session's work not yet committed at log time (checkpoint commit pending).

In progress:
  - PART 1.2 continues — 15 stale/gap contexts remain. Tier 0 (notes-and-pages) + first Tier-1 (sessions-and-scheduling) done.

Decisions:
  - The sweep's single-aspect verdict is a FLOOR, not ground truth: a gap can be filled in a sibling aspect the
    sweep didn't score. Re-run grounding must read ALL aspects before planning the fill. (Refines the unit loop.)
  - C1 (forward `xp_history` in contract.md L49) fixed even though ADR-012 is not this context's sweep driver:
    a retired token in the FORWARD/[INTENT] model is a live anti-signal regardless of driver (framework §1.3 rule);
    flagged + fixed in-scope (bounded to the one effects-target row), never silently skipped. The notes-and-pages B3 pattern.
  - `empty`/`error` are the doc's own runtime terminal states, NOT members of the ADR-004 §3.2.3 S5 enum —
    kept out of the persisted `sessions.status` CHECK to avoid future sweep enum-drift flags.

Next session:
  - FIRST ACTION: Tier 1 continues — re-run `projects` (sweep verdict = STALE; live wrong-model:
    `progress 0-100 NOT NULL` M3 anti-signal, bespoke deliverable `measurement_type` displacing M1
    `measurement_kind`, `purpose_projects` as a live in-edge; X*/AI* absent). Closer in shape to notes-and-pages
    (wrong-model stale) than to sessions-and-scheduling (gap).
  - Repeat the unit loop WITH the refinement: ground (sweep row 3 + framework §3 M1–M7 + target ALL 5 aspects) →
    persisted PLAN → independent adversarial critique → fix → approve → implement (R6 two-tier; cite conceptual
    owner, defer code home; flag forward regressions, don't skip).
  - READ FIRST: docs/specs/foundation/staleness-sweep.md (row 3) + capability-framework.md (§3 ADR-011 M1–M7)
    + docs/features/projects/*.md (all aspects). Then rest of Tier 1: health/core, habits, finance → tasks,
    relationships, pomodoro, knowledge/flashcards.
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment campaign, Part 1.2)
Goal: Re-run the `projects` context docs (Tier 1) to realign them with the matured foundation
  (ADRs 011/014/015) — sweep verdict STALE, wrong-model measurability.
Completed:
  - Ran the full documentation-realignment unit loop for `projects` (ground → PLAN → independent
    adversarial critique → fix → LITE-gate approval → implement → grep-verify → trackers).
  - Grounded in sweep row 3 + framework §2 (R1/R3/R7) + §3 ADR-011 (M1–M7) / ADR-014 (X*) / ADR-015 (AI*)
    + all 5 aspect docs. Refinement: the wrong-model token `measurement_type` threads through ALL 5 aspects
    → the MIXED case (wrong-model reframes + gap-adds), not a single-spine fix.
  - Persisted PLAN: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/projects.md
  - Independent adversarial critic (fresh subagent) → SHIP / 0 blocking with a full citation-verification
    ledger (every ADR-011/014/015 cite verified against source; M1 decomposition confirmed correct altitude,
    not the deferred design pass; `deliverables` confirmed absent → `measurement_type` correctly [INTENT];
    C1 `project_habits`-survival confirmed vs framework M7 + CLAUDE.md L267 + neighbor Purpose; AI4 "names
    Projects agentic AI" verbatim; no invented token). 2 cite notes folded (N1, N2).
  - Implemented across all 5 aspect docs (docs/features/projects/{identity,structure-data,business-rules,
    contract,conventions}.md): decomposed `measurement_type` → `measurement_kind` (M1) × `binding_mode` (M2)
    × M5/R7 source-seam; `progress 0-100 NOT NULL` → nullable override `NULL ⇒ derive` + `progress()` (M3,
    R6 two-tier — As-is FACT kept); per-child + `contributions` weighted rollup (M4); retired `purpose_projects`
    → `contributions` while KEEPING `project_habits` (M7/C1); named ADR-014 X1/X5 + ADR-015 AI1/AI4/AI6 consumer
    contracts; C3 investigation `measurement_type='artifact'` → `measurement_kind='milestone'`; C2 `entity_tags`.
  - Acceptance grep-verified (all §4 criteria pass; zero forward `measurement_type`/`purpose_projects`).
  - Advanced trackers: PLAN → IMPLEMENTED; master-plan _index (Part 1.2 row + change-log); task Session
    History; TASKS.md.
In progress:
  - PART 1.2 continues — Tier 1: `health/core` (next), then `habits`, `finance`; then the forward-facing
    retired-token group (`tasks`, `relationships`, `pomodoro`, `knowledge/flashcards`) → Tier 2 → Tier 3 arch.
Decisions:
  - The `measurement_type` bespoke enum conflates TWO orthogonal framework axes: measure SHAPE (M1
    `measurement_kind`) and BINDING (M2 `binding_mode`, further split into internal M5-seam pull vs ADR-014
    external source). The faithful realignment DECOMPOSES it — it does not rename or coexist. This was the
    load-bearing call; the critic scrutinized it hardest and confirmed it's the right altitude (naming the
    axes) vs the deferred design pass (authoring the source-binding DDL).
  - C1 guard: only the `purpose_*` trio (`purpose_habits`/`purpose_routines`/`purpose_projects`) is in M7's
    retirement list — `project_habits` STAYS (CLAUDE.md keeps it as a live cross-domain junction). An M7 pass
    must not over-retire.
  - `projects` is the MIXED shape (unlike notes-and-pages pure-wrong-model and sessions-and-scheduling
    pure-gap-add): it carries both live wrong-model tokens to reframe AND absent X*/AI* contracts to name.
    `health/core` is its closest sibling (same live wrong-model measurability).
Next session:
  - FIRST ACTION: Tier 1 continues — re-run `health/core` (sweep row 19, verdict STALE, drivers 011/006/014/015:
    bespoke goal-`type` enum + stored `progress`/`mastery` instead of `measurement_kind`/`binding_mode`/
    nullable-derive — M1/M2/M3; plus M5/SP1/X*/AI* gaps; S1 workout→sessions passes). Closest sibling to `projects`.
  - Repeat the unit loop: ground (sweep row 19 + framework §3 ADR-011 M1–M7 + ADR-014/015 + target ALL aspects)
    → persisted PLAN → independent adversarial critique → fix → approve → implement (R6 two-tier; cite conceptual
    owner, defer code home; flag forward regressions, don't skip).
  - READ FIRST: docs/specs/foundation/staleness-sweep.md (row 19) + capability-framework.md (§3 ADR-011 M1–M7)
    + docs/features/health/core/*.md (all aspects — confirm the dir path first). Then rest of Tier 1.
---

---
Date: 2026-07-24
Session goal: Part 1.2 Tier-1 — re-run `health/core` (foundation-realignment campaign)
Profile: Project Foundation Setup
Scenario: Documentation Realignment (Part 1.2 per-context re-run; LITE gate)
Stack: Turborepo + pnpm, TypeScript 5.7, React 19 (docs-only session)
Status: completed
What was done:
  - Ran the full unit loop for `health/core` (sweep row 19, verdict STALE, drivers 011/006/014/015).
  - Grounded in: staleness-sweep row 19 + capability-framework §2 (R1/R3/R4/R7) + §3 (ADR-011 M1–M7,
    ADR-006 SP1–SP7, ADR-014 X1–X11, ADR-015 AI1–AI6) + §4 applies-to + §5, all 5 aspect docs + health/README.
  - Grounding REFINED the sweep (it scored only structure-data): the goal-`type` wrong-model + derived-but-
    unslotted `progress`/`mastery` thread through ALL 5 aspects → the MIXED case, closest sibling to `projects`.
  - Persisted PLAN: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/health-core.md
  - Independent adversarial critic (fresh subagent) → SHIP / 0 blocking with a CODE-VERIFIED citation ledger:
    grepped packages/+apps/ → NO `health_*` schema exists → the "no As-is FACT floor" R6 claim is TRUE
    (`project.ts` DOES exist, explaining why projects had a live floor and health does not); every ADR §-pin
    verified exact (M1 §3.1, M2 §3.5 incl. the "kept-distinct-from-source" blessing, M3 §3.2/§3.4, M4 §3.3,
    M5 §3.6 names `body_weight←Health`, X4 §3.3 names "Health CI-6 medical push", AI5 §3.4b); zero fabricated
    tokens; decomposition at framework-axis altitude; C1/C2/C3 guards correct; boundary held. 3 notes folded
    (N1 added light G-M4 role-mastery weighted rollup — removes the asymmetry with the projects sibling;
    N2 `type` literal-vs-prose; N3 AI5 [INTERP] membership).
  - Implemented across all 5 aspect docs (docs/features/health/core/{identity,structure-data,business-rules,
    contract,conventions}.md): decomposed bespoke `health_goals.type` → `measurement_kind` (M1) × `binding_mode`
    (M2) × the existing `metric_id`/`role_id` M5-seam subject; `progress`/`mastery` → nullable override
    `NULL ⇒ derive` + `progress()`/`deriveMastery()` (M3); role `mastery` = per-child weighted rollup, up-ladder
    → `contributions` Purposes-owned (M4); named the M5 measure read-seam (R7), `entity_tags`+open taggable-type
    registry (SP1/SP2), X1/X2/X4-egress/X5/X8 (ADR-014), AI1/AI3/AI5/AI6 + `source=ai` (ADR-015). Extended the
    R6 named-ADR set → 002+011/006/014/015.
  - Acceptance grep-verified (all §4 criteria pass; forward bespoke goal-`type` enum retired; measurement_kind/
    binding_mode/NULL⇒derive/entity_tags/X4/source=ai all present; C1/C2 guards intact).
  - Advanced trackers: PLAN → IMPLEMENTED; master-plan _index (Part 1.2 row + Change Log); task Session History; TASKS.md.
In progress:
  - PART 1.2 continues — Tier 1: `habits` (next), then `finance`; then the Tier-1 forward-facing group
    (`tasks`, `relationships`, `pomodoro`, `knowledge/flashcards`) → Tier 2 gap-fills → Tier 3 arch (Part 1.3).
Decisions:
  - The one axis where `health/core` is LIGHTER than `projects`: Health is a recovered domain with NO v2 schema,
    so every token is already [INTENT] → there is NO As-is FACT floor to two-tier (projects had live
    `progress NOT NULL` + `purpose_projects` in project.ts). The critic code-verified this by grep. Every M-axis
    edit is a clean in-place [INTENT] correction, not a two-tier As-is/[INTENT] split.
  - Same load-bearing decomposition as projects: a bespoke conflated enum (`health_goals.type`) decomposes into
    the framework's orthogonal axes (measurement_kind × binding_mode × subject-FK), it does NOT rename or coexist.
    Here the subject axis reuses the ALREADY-PRESENT `metric_id`/`role_id` FKs — no information lost.
  - Guards prevented over-retirement: `physical_roles.type` (modality) and `health_metrics.kind` (metric
    taxonomy) are NOT measurement axes — kept (C1/C2). Economy/E2 is out of scope — Health feeds XP via Sessions'
    S4 `award_xp` effect (already reframed), it does not own `grant_currency` (C3; 012 is not a row-19 driver).
Next session:
  - FIRST ACTION: Tier 1 continues — re-run `habits` (sweep row 12, verdict STALE, drivers 011/012/006/004:
    names `purpose_habits` + `page_tags` in go-forward; missing the whole M1/M2 + E2 layer). Note `habits` IS
    an economy feeder (E2 `grant_currency`) AND has a `purpose_habits` junction to retire (M7) — unlike
    health/core, 012 IS a driver here, so the economy layer is in-scope.
  - Repeat the unit loop: ground (sweep row 12 + framework §3 ADR-011 M1/M2/M7 + ADR-012 E1/E2 + ADR-006 SP1
    + ADR-004 S1 + target ALL aspects) → persisted PLAN → independent adversarial critique → fix → approve →
    implement (R6 two-tier — habits likely HAS a live v2 schema, so As-is floor applies; flag forward regressions).
  - READ FIRST: docs/specs/foundation/staleness-sweep.md (row 12) + capability-framework.md (§3 ADR-011 M1/M2/M7
    + ADR-012 E1/E2) + docs/features/habits/*.md (confirm the dir path first). Then `finance` (row 17).
---

---
Date: 2026-07-24
Session goal: Part 1.2 Tier-1 — re-run `habits` (foundation-realignment campaign)
Profile: Project Foundation Setup
Scenario: Documentation Realignment (Part 1.2 per-context re-run; LITE gate)
Stack: Turborepo + pnpm, TypeScript 5.7, React 19 (docs-only session)
Status: completed
What was done:
  - Ran the full unit loop for `habits` (sweep row 12, verdict STALE, drivers 011/012/006/004).
  - Grounded in: sweep row 12 + framework §2 (R1/R2/R3/R4/R7) + §3 (ADR-011 M1/M2/M4/M5/M7, ADR-012 E2/E3,
    ADR-006 SP1, ADR-004 S4) + §4 applies-to + §5, all 5 aspect docs, AND the live schema
    (schema.ts / 001_initial.ts / habit.ts) — the As-is FACT floor.
  - The INVERSE of health/core on R6: habits HAS a live v2 schema → the As-is floor is real. Grep-confirmed
    purpose_habits:413, page_tags:121, xp_history:1213, project_habits:437 all live. Mixed case with a real
    two-tier As-is→[INTENT] split (the projects R6 pattern).
  - Persisted PLAN: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/habits.md
  - Independent adversarial critic (fresh subagent, code-aware) → REVISE (1 blocking) → fixed → clean.
    Critic grep-verified all 6 As-is-floor schema lines (zero fabricated floor), every framework cite, all
    four guards. B1 (blocking): `grant_currency` had been mis-listed inside the ADR-004 §3.2.2 S4 catalogue
    where the member is `award_xp` (grant_currency = ADR-012 E2 generalization) — the exact two-layer
    distinction the sessions-and-scheduling PLAN established. Fixed at all 6 occurrences. 3 notes folded
    (N1 `unit` in R3 list, N2 G-M7 = anti-signal retirement not M7-ownership, N3 N*/E1/E4/E5 deferred-not-missed).
  - Implemented all 5 aspect docs (docs/features/habits/*): three live-FACT retirements — purpose_habits →
    contributions (M7), page_tags/inline habits.tags → entity_tags (SP1, resolved the "not yet decided"
    direction), xp_history → consequence_ledger (E3); gap-adds — M1/M2 habit-pursuable (new invariant HB-13),
    E2 grant_currency + the award_xp S4 slot, the completion's S4/R1/R2 effect rails, M4 weighted contribution,
    M5 streak(habit) seam. Extended the R6 named-ADR set → +011/012/006/004.
  - Acceptance grep-verified: every purpose_habits/xp_history mention carries retire/As-is context (zero
    forward stale tokens); measurement_kind/binding_mode/entity_tags/consequence_ledger/grant_currency/
    award_xp/contribute_purpose_metric/streak(habit) all present; C1/C2/C3 guards intact.
  - Advanced trackers: PLAN → IMPLEMENTED; master-plan _index (row + Change Log); task Session History; TASKS.md.
In progress:
  - PART 1.2 continues — Tier 1: `finance` (last live wrong-model/economy unit), then the Tier-1
    forward-facing group (`tasks`, `relationships`, `pomodoro`, `knowledge/flashcards`) → Tier 2 → Tier 3 arch.
Decisions:
  - Habits is the R6 INVERSE of health/core: a live v2 schema means the As-is FACT floor is real, so all three
    retirements (purpose_habits, page_tags/inline-tags, xp_history) are genuine two-tier As-is→[INTENT] splits
    (verified by grepping schema.ts for each token + line).
  - The blocking critique catch (B1) is a reusable lesson: the ADR-004 §3.2.2 S4 catalogue's economy member is
    `award_xp`; ADR-012 GENERALIZES it to `grant_currency`. They are two layers — never collapse `grant_currency`
    into the S4 catalogue. (Same discipline the sessions-and-scheduling unit established.)
  - Economy IS in scope for habits (012 is a row-12 driver) — the exact opposite of health/core, where economy
    was out of scope (health feeds XP via Sessions' S4, doesn't own the feeder).
  - Guards prevented over-retirement/over-reach: project_habits KEPT (only purpose_* trio retires, C1); inline
    habits.tags is the As-is floor not pretended-migrated (C2); the streak cache is already M3-aligned
    (derived-from-ledger, no stored progress col) so NO forced nullable-override (C3).
Next session:
  - FIRST ACTION: Tier 1 — re-run `finance` (sweep row 17, verdict STALE, drivers 012/014/006: `page_tags` in
    the migration target [forward]; never names the `store`/`move_money` economy substrate it OWNS — E6/E4;
    ADR-014 ingestion layers/grant tokens absent). NOTE: finance OWNS economy substrate (E6 `store`, E4
    `move_money`) — heavier than a mere feeder; check the ADR-012 §3.5 `store` + §3.1 Additive-effects contract.
    Also has bank-statement CSV/OFX import → ADR-014 X8 reconcile-on-import (`import_staging`) is in-scope.
  - Repeat the unit loop: ground (sweep row 17 + framework §3 ADR-012 E4/E6 + ADR-014 X1/X5/X8 + ADR-006 SP1
    + target ALL aspects + the live finance schema for the As-is floor) → PLAN → critique → fix → approve →
    implement (R6 two-tier — finance likely HAS a live schema; flag forward regressions).
  - READ FIRST: staleness-sweep.md (row 17) + capability-framework.md (§3 ADR-012 E4/E6 + ADR-014 X8) +
    docs/features/finance/*.md (confirm dir path) + grep schema.ts for finance tables (store/accounts/transactions).
---

---
Date: 2026-07-24
Session goal: SESSION CLOSE / context-reset boundary — Part 1.2 Tier-1 (health/core + habits)
Profile: Project Foundation Setup
Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Status: closed — clean handoff to next session (finance)
Session summary (this context window):
  - TWO Tier-1 units completed end-to-end (ground → PLAN → adversarial critique → approve → implement 5
    aspects → grep-verified acceptance → trackers → commit):
      1. health/core — commit 2a33124. Stale wrong-model (011/006/014/015). Decomposed health_goals.type →
         measurement_kind × binding_mode × metric_id/role_id M5-seam; M3 nullable progress/mastery; M4 role
         rollup; M5/SP1/SP2/X*(incl X4 egress)/AI* gap-adds. NO As-is floor (recovered domain, no v2 schema).
         Critic SHIP / 0 blocking → 3 notes folded.
      2. habits — commit 7e18143. Stale wrong-model (011/012/006/004). Three live-FACT retirements
         (purpose_habits→contributions M7, page_tags/inline-tags→entity_tags SP1, xp_history→consequence_ledger
         E3) under R6 two-tier + gap-adds (M1/M2 HB-13, E2 grant_currency/S4 award_xp, S4/R1/R2 rails, M4, M5).
         REAL As-is floor (live schema). Critic REVISE(1 blocking: grant_currency mis-placed in S4 catalogue
         vs award_xp)→fixed→approved.
  - Campaign state: Part 1.2 Tier-1 = 5 of the stale/heavy units DONE (notes-and-pages, sessions-and-scheduling,
    projects, health/core, habits). Remaining Tier-1: finance (last live wrong-model/economy unit), then the
    forward-facing group (tasks, relationships, pomodoro, knowledge/flashcards). Then Tier 2 gap-fills, Tier 3 arch.
  - Reusable lessons banked this session: (a) R6 has two shapes — recovered-domain (no As-is floor, edit
    [INTENT] in place, e.g. health/core) vs live-schema (real As-is floor, two-tier retire, e.g. habits/projects);
    grep the schema to tell which. (b) S4 catalogue member is `award_xp`; ADR-012 GENERALIZES it to
    `grant_currency` — two layers, never collapse (the habits B1 catch). (c) The independent code-aware critic
    reliably catches token/§-pin layer-conflations self-review misses.
Next session:
  - FIRST ACTION: start the `finance` re-run (Tier 1). Surface the unit path (§XXVII), then ground in:
    staleness-sweep.md row 17 (verdict STALE, drivers 012/014/006 — `page_tags` forward; never names the
    `store`/`move_money` economy substrate it OWNS, E6/E4; ADR-014 ingestion layers/grant tokens absent) +
    capability-framework.md §3 (ADR-012 E4 `move_money`/E6 `store` — finance is an OWNER not a feeder; ADR-014
    X1/X5/X8 for CSV/OFX bank-statement import via `import_staging`; ADR-006 SP1) + all 5 finance aspect docs +
    grep schema.ts for the finance tables (accounts/transactions/store) → establish the As-is FACT floor.
  - Finance is the heaviest economy case: it OWNS substrate (E6 `store` tree, E4 `move_money`), unlike habits
    (feeder) — check ADR-012 §3.5 store + §3.1 Additive-effects; and it has merge-import → ADR-014 X8 reconcile.
  - READ FIRST: staleness-sweep.md (row 17) + capability-framework.md (§3 ADR-012 E4/E6 + ADR-014 X8) +
    docs/features/finance/*.md (confirm dir) + grep schema.ts finance tables. Then repeat the unit loop.
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment master campaign)
Profile: Project Foundation Setup · Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Goal: Part 1.2 Tier-1 — `finance` re-run (the last stale/heavy Tier-1 unit; sweep row 17, stale, drivers 012/014/006)
Completed:
  - `finance` re-run COMPLETE end-to-end (ground → PLAN → adversarial critique → fix → approve → implement 5
    aspects → grep-verified acceptance → commit). Commit 6c3fda3.
  - PLAN persisted: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/finance.md
  - Edited all 5 aspect docs in docs/features/finance/: identity, structure-data, business-rules, contract,
    conventions.
  - Grounding refined the sweep (which scored only structure-data): mixed live-schema R6 case (real As-is
    floor — 6 tables schema.ts:447-528, page_tags:121, inline transactions.tags:475). Finance is the platform's
    HEAVIEST economy case — it OWNS substrate (E6 store, E4 move_money), not a feeder.
  - Changes: SP1 page_tags/inline-tags -> entity_tags (retire, R6 two-tier); E6 store tree (groups/wrappers +
    lockable reward-target boxes, net worth = Sum tree - Sum liabilities, never copies balances); E4/E5
    move_money Finance-executes-effect + LOCK-never-destroy; X1/X5/X8 ingestion reframe (ADR-014-governed, not a
    blocking candidate ADR; only aggregator plaintext dent is residual).
  - LITE gate: independent adversarial critique (fresh code-aware subagent) -> REVISE (1 blocking) -> fixed.
    B1: the X5 "new grant table" correction was mis-located to structure-data L23-24 (which has no grant "new
    tables"); the real contradiction is at biz-rules L107, and structure-data L25's "new table(s)" is Budgeting
    (G12, out of scope) — a literal edit would have wrongly struck it. Relocated + added do-not-touch guard.
  - Acceptance grep-verified: entity_tags named, page_tags zero-forward, store/move_money/import_staging/
    external_*_ok named, 0 M* leak (C6), Budgeting L25 intact (B1), no AI* (C5). Six guards held.
Decisions:
  - Ingestion reframe (surfaced to Victor, endorsed): CSV/OFX on-device import is ADR-014-governed (X1), NOT
    "blocked on a candidate ADR" — moves the platform's largest INTENDED surface from "blocked" to "mechanism
    decided, aggregator dent open". Only the third-party-aggregator plaintext path remains a genuine open ADR.
  - No M* for finance (011 not a row-17 driver): Finance is a FEEDER to Purpose targets, not a pursuable —
    guarded (C6), no measurement_kind/binding_mode added.
Next session:
  - FIRST ACTION: start the Tier-1 forward-facing group. Suggested first unit: `tasks` (the aggregation hub the
    group centers on). Surface the unit path (§XXVII), then ground in staleness-sweep.md (tasks row) +
    capability-framework.md (§3 predicates for its drivers) + all 5 tasks aspect docs + grep the live schema
    (tasks/task_time_logs) for the As-is floor. Then repeat the unit loop.
  - Campaign state: Part 1.2 Tier-1 stale/heavy = 6 of 6 DONE (notes-and-pages, sessions-and-scheduling,
    projects, health/core, habits, finance). Remaining Tier-1 = forward-facing group (tasks, relationships,
    pomodoro, knowledge/flashcards). Then Tier 2 gap-fills -> Tier 3 arch docs (Part 1.3).
  - Reusable lesson banked: the fresh independent critic catches plausible-but-wrong CITE LOCATIONS (B1) that
    self-review misses because self-review anchors on intent, the critic on the source line. Same discipline as
    the habits B1 (token/layer conflation).
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment master campaign)
Profile: Project Foundation Setup · Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Goal: Part 1.2 Tier-1 forward-facing group — start with `tasks` (the aggregation hub the group centers on; sweep row 2, stale, widest driver set in the campaign)
Completed:
  - `tasks` re-run COMPLETE end-to-end (ground → PLAN → adversarial critique → approve → implement 5
    aspects → grep-verified acceptance → commit). Commit 660c9ea.
  - PLAN persisted: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/tasks.md
  - Edited all 5 aspect docs in docs/features/tasks/: identity, structure-data, business-rules, contract,
    conventions.
  - Grounding: live-schema R6 case (real As-is floor — tasks:161, task_time_logs:189, inline tasks.tags:176,
    page_tags:121), BUT task_views is schema-0 (an [INTENT] build target, not a live table — grep-confirmed
    absent from packages/+apps/). Widest driver set (6 ADRs: 011/012/006/007/009/004) yet LIGHTEST on
    live-FACT retirement (only SP1 touches the floor).
  - Changes: SP1 page_tags/inline-tags -> entity_tags (R6 two-tier); V1 task_views -> views primitive
    (CITE-LEVEL per Victor's C8 approval — full anatomy deferred to the dedicated 007 pass); M1/M2/M3/M4
    task-as-pursuable + new invariant TK-11 (measurement_kind natural=milestone, binding_mode, sub-task
    rollup=M4, progress derives no stored col); E2 grant_currency(XP) feeder; S1/S4 timer/pomodoro=sessions
    sub-type on log_time/attach_pomodoro + R1/R2; T4 preset bound to `kind`; R7 aggregation seam.
  - LITE gate: independent adversarial critique (fresh code-aware subagent) -> SHIP / 0 blocking — the
    FIRST Tier-1 unit to clear clean (notes-and-pages->finance each had >=1 blocking B1).
Decisions:
  - C8 (the one judgment call, Victor-approved): the deferred "007/V1 saved-views reframe" — tasks retires
    task_views -> views + names the primitive at cite level (kills V1's literal anti-signal; required for
    tasks to reach "aligned"), while the full V1 anatomy (filter grammar, cross-type resolution, per-layout
    fields, 12->7 layout mapping) stays owed to the dedicated cross-context 007 pass. Neither under- nor
    over-reaching (critic endorsed).
  - The E2/S4 layering trap (the exact B1 that bit BOTH habits and finance) pre-empted: award_xp = the
    ADR-004 S4-catalogue member; grant_currency = the SEPARATE ADR-012 E2 generalization. Critic
    grep-verified all 4 occurrences held — this is why tasks was the first clean unit.
  - No M5 (C1 — tasks not in the M5 applies-to set; task progress derives + contributes UP via
    contributions, but is not a queryable-measure source), no M7 (C2 — contributor, not Purpose apex),
    no X*/AI*/CB* (C7 — grep clean).
Next session:
  - FIRST ACTION: start `relationships` (Tier-1 forward-facing group, sweep row 22, stale — drivers
    006/014/013). Surface the §XXVII unit path, then ground in staleness-sweep.md (row 22) +
    capability-framework.md (§3 SP1/SP3 tags, X* ingestion, N* notifications for the drivers) + all 5
    relationships aspect docs + grep the live schema (contacts/interactions/contact_events/
    contact_reminders/reminder_groups) for the As-is floor. Then repeat the unit loop.
  - Expected shape: inline contacts.tags JSON As-is floor -> entity_tags (SP1) + parent_tag_id (SP3);
    N* notification gaps (contact reminders -> ADR-013 three-tier); X* ingestion gaps (ADR-014). Live-schema
    R6 case (relationships has a live v2 schema).
  - Campaign state: Part 1.2 Tier-1 = 7 done (notes-and-pages, sessions-and-scheduling, projects,
    health/core, habits, finance, tasks). Remaining Tier-1 forward-facing = relationships, pomodoro,
    knowledge/flashcards. Then Tier 2 gap-fills -> Tier 3 arch docs (Part 1.3).
  - Reusable lesson banked: pre-empting a KNOWN prior-unit B1 (the E2/S4 layering conflation) in the PLAN
    itself — naming the two layers explicitly at every occurrence — is what produced the campaign's first
    critique-clean unit. Carry the same discipline (award_xp=S4 member, grant_currency=E2 generalization)
    into every economy-feeder re-run.
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment master campaign)
Profile: Project Foundation Setup · Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Goal: Part 1.2 Tier-1 forward-facing group — `relationships` (sweep row 22, stale; the first notification-primary unit)
Completed:
  - `relationships` re-run COMPLETE end-to-end (ground → PLAN → adversarial critique → approve → implement 5
    aspects → grep-verified acceptance → commit). Commit 596aed9; tracking 6b4a850.
  - PLAN persisted: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/relationships.md
  - Edited all 5 aspect docs in docs/features/relationships/.
  - Grounding: live-schema R6 case (6 tables contacts:535…reminder_group_contacts:609; inline contacts.tags:548
    + social_links:549 = real As-is floor; network_groups = schema-0 [INTENT]; NO page_tags — inline-tags only).
  - Changes: SP1/SP3 inline contacts.tags -> entity_tags(entity_type='contact') + parent_tag_id nesting (R6
    two-tier; universal-vs-module scope stays a Notes-&-Pages concern); N1/N2 the three reminder mechanisms ->
    ADR-013 three-tier delivery, content-free wake payload (N2 = platform's most PII-critical use); X1/X8 device
    contact import -> device-mediated + import_staging merge-reconcile.
  - LITE gate: independent adversarial critique (fresh code-aware subagent) -> SHIP / 0 blocking — SECOND
    consecutive clean unit.
Decisions:
  - X* membership-by-rule (disclosed in-PLAN, Victor-approved): Relationships is absent from ADR-014's X1
    example-list AND the §4 "Ingests external data" row, but framework §4 sanctions coverage "by the rules, not
    a hand-list… as new contexts appear"; device contact import (RL-11 "refused, not downgraded") IS X1
    verbatim. Named X1/X8 on that basis; flagged the nuance rather than hiding it — critic adjudicated it
    defensible.
  - M* exclusion (C1, the primary guard, Victor-approved): contacts are ADR-011 framework-EXCLUDED reference
    data (M1 "Excluded: contacts"); relationship health is a DERIVED analytic, NOT a pursuable — no
    measurement_kind/binding_mode/M5. The biggest over-reach temptation, guarded across all 5 aspects.
  - 012 NOT a driver (C2): the interaction-streak->Gamification edge stays the existing [INTENT] mention; no
    grant_currency/E2 manufactured. C4: social_links (typed JSON) kept, not a tag concern.
Next session:
  - FIRST ACTION: start `pomodoro` (Tier-1 forward-facing group, sweep row 5, verdict reframe-in-progress —
    drivers 004/012). Surface the §XXVII unit path, then ground in staleness-sweep.md (row 5) +
    capability-framework.md (§3 ADR-004 S1/S4 + ADR-012 E2/E3) + all pomodoro aspect docs + grep the live
    schema (pomodoro_sessions? focus_sessions? entity_type CHECK) for the As-is floor. Then the unit loop.
  - Expected shape: As-is IS flat pomodoro_sessions + polymorphic entity_type CHECK; [INTENT] correctly
    re-homes to session_id/focus_sessions (ADR-004 S1) but is UNFINISHED (reframe-in-progress) — finish it +
    name grant_currency/R1 tokens (012/004). Tightly coupled to the notes-and-pages + sessions-and-scheduling
    re-runs already done (pomodoro is now a sessions sub-type per ADR-004 / CLAUDE.md).
  - Campaign state: Part 1.2 Tier-1 = 8 done (notes-and-pages, sessions-and-scheduling, projects, health/core,
    habits, finance, tasks, relationships). Remaining Tier-1 forward-facing = pomodoro, knowledge/flashcards.
    Then Tier 2 gap-fills -> Tier 3 arch docs (Part 1.3).
  - Reusable lesson banked (now 2 consecutive clean units): pre-empting the LIKELY blocking finding inside the
    PLAN itself — naming both E2/S4 layers explicitly (tasks), disclosing the X* applies-to-by-rule nuance
    (relationships) — makes the fresh critic VERIFY rather than CATCH. Carry this: when a driver's applies-to
    membership is arguable, state the rule-vs-list basis in the PLAN; when a known prior-unit B1 pattern could
    recur, name the distinction up front.
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment master campaign)
Profile: Project Foundation Setup · Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Goal: Part 1.2 Tier-1 forward-facing group — `pomodoro` (sweep row 5, stale reframe-in-progress)
Completed:
  - `pomodoro` re-run COMPLETE end-to-end (ground → PLAN → adversarial critique → approve → implement 5
    aspects → grep-verified acceptance → commit). Commit 4c027cc; tracking 730107a.
  - PLAN persisted: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/pomodoro.md
  - Edited all 5 aspect docs in docs/features/pomodoro/.
  - Grounding: THE LIGHTEST UNIT — the full ADR-004 reframe was done at the 2026-07-15 intake (docs already
    name focus/session_id/log_time/attach_pomodoro/surface_journal + supersede As-is entity_type CHECK ->
    session_id; R6 two-tier already correct). Live schema: pomodoro_sessions:143 (all-plaintext) +
    user_preferences.pomodoro_*:1262-1265; no focus_sessions/consequence_ledger table yet (schema-0).
  - Changes (3 token families only): E3 retire the forward xp_history at contract.md:31 (the award_xp effect's
    MISLABELED target — the real find the sweep's structure-data-only scoring missed) -> consequence_ledger;
    E2 gap-add grant_currency(XP) alongside award_xp; R1 light completion (applied_effects/UNIQUE — PD-12
    already named effect_event_id/§3.2.5).
  - LITE gate: independent adversarial critique (fresh code-aware subagent) -> SHIP / 0 blocking — THIRD
    consecutive clean unit ("the cleanest unit in the campaign").
Decisions:
  - The "R1 absent" sweep verdict was a structure-data-scoring artifact: business-rules PD-12 already named
    effect_event_id + §3.2.5; only the ledger half (applied_effects/UNIQUE) was genuinely missing. Ground-
    truth-refinement pattern again — read ALL aspects, not just the one the sweep scored.
  - The real stale token was a FORWARD xp_history buried in the contract effect-table (award_xp's target
    integration point), invisible to a structure-data-only sweep. Retiring it -> consequence_ledger (E3).
  - E2/S4 layering held (C4): award_xp = ADR-004 S4-catalogue member; grant_currency = the SEPARATE ADR-012
    E2 generalization. The trap that bit habits/finance pre-empted for the 3rd time.
  - Guards: C1 the entity_type->session_id reframe already done (verified, not re-opened); C2 focus_sessions
    structure build-deferred; C3 no M* (runtime, not pursuable); C5 capability-not-module (SS-1); C6 no
    006/N*/X*/AI* (drivers 004/012 only — pomodoro caught only by the §4 ≈all/any-module wildcards, owns no
    taggable/notifying substrate).
Next session:
  - FIRST ACTION: start `knowledge/flashcards` — the LAST Tier-1 forward-facing unit (sweep row 9, stale,
    drivers 006/005/002). Surface the §XXVII unit path, then ground in staleness-sweep.md (row 9) +
    capability-framework.md (§3 ADR-006 SP1 + ADR-005 SM1-SM4) + all flashcards aspect docs + grep the live
    schema (flashcard_decks/flashcards/review_events/method_bindings/review_curves) for the As-is floor.
  - Expected shape: FORWARD page_tags (line 27) as the go-forward tag -> entity_tags (SP1); the SM1-SM4
    generic-review-engine intent already conforms (review_events/method_bindings, study_methods as registry
    partition, derived mastery), with SM-2/flashcard_decks/flashcard_reviews tokens As-is-only. First ADR-005
    (study-method) unit — verify the generic review engine reframe is complete + finish any page_tags/SP1 gap.
  - Campaign state: Part 1.2 Tier-1 = 9 done (notes-and-pages, sessions-and-scheduling, projects, health/core,
    habits, finance, tasks, relationships, pomodoro). LAST forward-facing = knowledge/flashcards. Finishing it
    completes the ENTIRE Tier-1 group -> Tier 2 gap-fills -> Tier 3 arch docs (Part 1.3).
  - Milestone: THREE consecutive critique-clean units this session (tasks, relationships, pomodoro) across
    three distinct shapes (widest-driver-set / notification-primary+membership-nuance / finish-the-reframe).
    The reusable discipline holds: pre-empt the likely blocking finding IN the PLAN; disclose arguable
    applies-to/membership calls rather than hide them; read ALL 5 aspects to refine the single-aspect sweep.
---

---
Date: 2026-07-24
Task: build-roadmap-resequence (foundation-realignment master campaign)
Profile: Project Foundation Setup · Scenario: Documentation Realignment (Part 1.2 per-context re-runs; LITE gate)
Goal: Part 1.2 Tier-1 forward-facing group — `knowledge/flashcards` (LAST forward-facing unit; sweep row 9, stale)
Completed:
  - `knowledge/flashcards` re-run COMPLETE end-to-end (ground → PLAN → adversarial critique → approve →
    implement 5 aspects → grep-verified acceptance → commit). Commit f07f348; tracking 8ff1b45.
  - PLAN persisted: docs/specs/foundation/realignment-master-plan/part-1.2-reruns/knowledge-flashcards.md
  - Edited all 5 aspect docs in docs/features/knowledge/flashcards/.
  - Grounding: THE NARROWEST unit. The ADR-005 generic-review-engine reframe (review_events/method_bindings/
    review_curves, mastery-derived, decks/SM-2-cols/flashcard_reviews retired) + ADR-002 retirements already
    conform (verified, not re-done). Live schema: flashcard_decks:761/flashcards:775/flashcard_reviews:796,
    NO inline `tags` column. Stale surface = ONE forward token: page_tags (structure-data L27).
  - Changes: SP1 retire the forward page_tags -> entity_tags (forward [INTENT] ref, no As-is floor — reframed
    in place like tasks/task_views); F3 name entity_tags at ~6 generic "universal tag system" mentions (SM4
    "taggable via entity_tags"); card registers entity_type='flashcard' (SP2).
  - LITE gate: independent adversarial critique (fresh code-aware subagent) -> SHIP / 0 blocking — FOURTH
    consecutive clean unit. Both load-bearing claims verified with content (single page_tags; no inline tags
    column); the under-scope risk (a missed 005/002 forward token) explicitly REFUTED.

*** MILESTONE: PART 1.2 TIER-1 COMPLETE (10 units) ***
  Done: notes-and-pages (Tier-0 hub) · sessions-and-scheduling · projects · health/core · habits · finance ·
  tasks · relationships · pomodoro · knowledge/flashcards. The last 4 (this session) were 4 CONSECUTIVE
  critique-clean units across 4 distinct shapes (widest-driver-set / notification-primary+membership-nuance /
  finish-the-reframe / narrowest-one-token).

Decisions:
  - flashcards 006/SP1 only: page_tags is a forward [INTENT] token (no inline tags column -> no R6 two-tier),
    corrected in place. 005 (SM1-SM4) + 002 already conform -> verify-only (C1/C2). No M* (mastery is
    Knowledge-derived, C3). No E2/012 (XP rides the review_session effect, not a flashcards feeder — the
    OPPOSITE of pomodoro where 012 WAS a driver, C4). entity_links already correct, tags != links (SP4, C5).

Next session (post-context-clear — READ THIS FIRST):
  - Campaign lives in: docs/specs/foundation/realignment-master-plan/_index.md (master plan) +
    staleness-sweep.md (the per-context verdict table + tier ordering) + capability-framework.md (the
    mechanical predicate instrument) + part-1.2-reruns/*.md (the 10 completed unit PLANs — read a sibling as
    the format template).
  - FIRST ACTION: start Part 1.2 TIER 2 — the GAP-FILL group. Units (sweep §"Part 1.2 tier 5", all `gap`
    verdicts): learning/education, books, skills, check-ins, finance/fiscal-legal, health/nutrition, routines.
    Gap = no forward anti-signal, but silent on >=1 applicable X*/AI*/M*/E2 contract — ADDITIONS, lower-risk
    than the wrong-model stales (sweep finding F2). Suggested first unit: `routines` (closest sibling to the
    habits/tasks work — same M1/M2 + E2 gap family), OR learning/education (the heaviest gap-fill: X*/AI*/M*).
  - Per-unit loop (unchanged): surface §XXVII path → ground (sweep row + framework §3 predicates for the
    unit's drivers + all 5 aspect docs + grep the live schema for the As-is floor) → read ALL 5 aspects to
    refine the sweep's single-aspect verdict → persist LITE-gate PLAN in part-1.2-reruns/ → independent
    adversarial critique (fresh code-aware subagent, prompted to refute) → fix → Victor approval → implement 5
    aspects → grep-verify acceptance → commit → update task file + TASKS.md + session-log.
  - After Tier 2: Tier 3 = Part 1.3 architecture-doc rewrites (4 stale + 4 partial arch docs, sweep §"Verdict
    table — 8 architecture docs").
  - REUSABLE DISCIPLINE (proven across 4 consecutive clean units this session — carry it):
    (1) pre-empt the LIKELY blocking finding INSIDE the PLAN (e.g. name award_xp=S4-member vs
        grant_currency=ADR-012-E2-generalization as two layers at EVERY occurrence — the trap that bit
        habits/finance, avoided in tasks/pomodoro);
    (2) DISCLOSE arguable applies-to/membership calls in the PLAN rather than hide them (relationships X*
        membership-by-rule; tasks C8 views-scope) — the critic then VERIFIES rather than CATCHES;
    (3) read ALL 5 aspects to refine the sweep's structure-data-only verdict (caught the hidden xp_history in
        pomodoro's contract; confirmed the "already conforms" reads in flashcards).
---
