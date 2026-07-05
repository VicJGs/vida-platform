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
