# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Started | Last Session | Status |
|------|---------|---------|--------------|--------|
| documentation-blueprint | Project Foundation → documentation-blueprint | 2026-06-08 | 2026-07-17 | Wave 0+1 + Projects + Education + Books + Knowledge + **SESSIONS & SCHEDULING documented** (4th extraction from Learning **+ PROMOTED to foundation** — polymorphic Session supertype + aggregator scheduling engine + 4-dim Integration Contract, G1–G10 + S1–S5, gate PASS 07-12; surfaced Session Framework ADR) · + Flashcards → Knowledge service (ADR-005) + **JOURNALS documented** (integration layer — provider-registry engine + daily dashboard + snapshot Review engine; refines N&P G7; gate PASS 07-12) · **← WAVE 2 COMPLETE** · Learning = 1 sub-context (Education) · **REMAINING RE-SEQUENCED 07-13** — two reframes: (1) **Purposes & Goals → CAPSTONE** (OS meaning-spine); (2) **Languages DISSOLVED → Spaces** (new Personalization & Composability foundation: universal tags·saved views·capability Blocks·templates; Languages = worked-example; gaps deferred to #8 as it touches every module). Order: **Health → Skills → Duties(next) → Routines → expansions → Pomodoro → Bucket List → Spaces(foundation) → Purposes&Goals(capstone) → Gamification → Notifications** · **HEALTH DONE + gate PASS 07-13; CURRENT-INTENT ENHANCED + re-gate PASS 07-14** (re-harvested System-1.0/Management hubs → CI-1..CI-6: Physical Roles merge · Monitoring spine [Domains/Factors/Exams] · biomarker panel + derived metrics · functional nutrition axis · opt-in cooking-skill · CI-6 external integrations INTENT). **SKILLS DONE 07-14.** · **DUTIES defining intake → DISSOLVED 07-14** (Duty + Obligation = **task TYPES + presets**, NOT a module; Languages→Spaces precedent; intent landed in Tasks ADDENDUM + Spaces accumulator). · **ROUTINES DOCUMENTED + gate PASS 07-14** (unparked + reconciled against Sessions ADR-004/Health/Tasks-types → composition reframe: orchestration cockpit, compose-driven polymorphic steps, user-configurable completion/miss policies + acceptance window, policy-derived streak, provider via dueIn/summary; 5 aspect docs; intake WHOLE §E). Fill order: Duties off, Routines ✅. · **EXPANSIONS BATCH #4 DONE 07-15 (Wave R fully reconciled)** — all 3 resolved by composition/no-entity: Finance→Commitments = management sub-context (composes existing flows + dueIn/Notifications) · Projects→Investigations = deliverable(artifact)+Knowledge-Lab · Learning→Grades/GPA/Cycles/Subject = VERIFIED covered by Education. · **POMODORO DONE 07-15 + gate PASS** (exec #5) — REFRAME: a **capability, not a module** = focus-timer runtime of the `focus` Session sub-type, consolidated **entirely into the Sessions realm** (no leak to other entities); `/pomodoro` = session-lens; v1 richness reshaped into Sessions+Preferences; Focus Mode = polymorphic×platform×tool-bearing (INTENDED design-pass); ⚠ moves a boundary Notes→Sessions (`pomodoro_sessions`→`session_id`; ADR-004 amendment + ADR-002 re-home noted-at-build; reconciled across Sessions+Notes docs). · **BUCKET LIST DISSOLVED 07-15** (exec #6) — Victor's sincere reframe: NOT a module but "a separated View of things I want to do before I die, with progress, to envision them" = a **Space** (`#before-i-die` tag + vision-board Gallery + progress + Template); the items **are Dreams** → `bucket_list_items` collapses into `dreams` (**PG8 RESOLVED**); 3rd Spaces worked-example (after Languages/Duties); intent threaded → spaces.md + purposes-and-goals.md; stubs deleted. · **SPACES ✅ TRANSFORM + gate PASS + ACCEPTED 07-15** (exec #7, CORE/foundation) — produced the **5-ADR set** (ADR-006 tier+universal `entity_tags`+`spaces` · ADR-007 `views` · ADR-008 capability-Block registry · ADR-009 templates-fork · ADR-010 capability-authoring security), each drafted → /critique → revised → accepted one-by-one (every critique found a real defect: unify-reframe · provider-delegated predicates · capability≠Session · authored-vs-accumulated · compositional-consent/TOCTOU). Core docs: **business-rules PC-1…PC-4 + EX-1/EX-2 + INT-1a**; manifest re-sequenced (Languages struck; Spaces CORE-beneath-N&P; ⚠ N&P page_tags→entity_tags reconciliation flagged); SP7 front door `docs/core/spaces/README.md`. Holistic Verify PASS (G1 INT-1 drift fixed). Victor Accept: **folded general extension-model → EX-1/EX-2**; community-external expansion **deferred (needs his go)**. · **ADR CRITIQUE GATE (whole-set, all 10 ADRs) 07-16** — DETOUR before #8: Phase A (001–005) + Phase B (006–010) + holistic; **all 10 = REVISE** (cores sound, none ships clean, none rethink). 5 throughlines: ① ADR-002 stale-vs-004/005/006–010 (owns none of ~15 owed tables; header omits 003,006–010) · ② guarded-write/idempotency never grounds out (010 enforces→008 inherits→004 asserts→nobody specifies; shipped caps outside sandbox) · ③ O1 (study_methods vs capability registry) + O2 (enabled_blocks vs block_instances) · ④ base correctness (HKDF drift · wall-clock LWW vs "logical" · encryption-vs-query trio) · ⑤ ZK overclaims docs walk back (009/010). **F1–F15 fix menu + D1–D7 decisions** → report `docs/reviews/2026-07-15-adr-critique-gate.md`; NO ADR edited. **REVISING F1–F15** (Victor: "go to revise and solve each one"). · **SAFE 🟡 BATCH DONE 07-16 (commit 798c38b):** F5/D6 HKDF→BLAKE2b (signed off, verified vs vault.ts), F8 ADR-009 ZK-precision, F9 ADR-010 honest-bound + granted_envelope_hash, F4-hdr ADR-002 amenders 003–010 + owed-ledger. · **F1/D1 DONE 07-16 (commit 83e4842)** — deepest fix: guarded-write + idempotency grounded into **ADR-004 §3.2.5** (owner; loop 010→008→004 broken); constitution **INT-2** (PC-3 specializes); deterministic `effect_event_id` (local ledger + UNIQUE output col; cross-device merge → F10); full §XXVI gate incl. **independent adversarial critique** that caught a real multi-device double-count (B3) pre-implement. D1-a/b/c ratified. · **F2/D2 DONE 07-16 (commit 4091bd8)** — O1 registry boundary closed: **D2=A** one composability registry (ADR-008 = supertype); `study_methods` = `kind=study_method` **specialization** (is-a), not a parallel registry. Full §XXVI gate incl. independent adversarial critique (is-a survived; **B1** dropped `role` axis + **B2** `registerMethod` 2nd chokepoint the noun-grep missed were the real catches). ADR-008 **§3.3a anatomy crosswalk** (is-a shown) · ADR-005 amended-by · **PC-2a** sub-note · owed-ledger reconciled (ADR-002 untouched, D5). · **F3/D3 DONE 07-17 (commit 0a5f8be)** — O2 registry/placement boundary closed: **D3 = keep both, distinct** (`enabled_blocks` = the Space's authored offered-capability **palette** of definition refs, ADR-006 §3.4; `block_instances` = standalone **placements**, ADR-008; "drop as derivable" rejected — grounded by SP6 + SP5/ADR-009). Render-agnostic membership + **teeth-by-surface** (standalone enforced from palette; inline additive/union-safe). Full §XXVI gate incl. independent adversarial critique (core survived; **B1** SP4 [FACT]-was-inference → grounding honestly 2-legged · **B2** "additive not a restriction" left field toothless → teeth-by-surface · **B3** stored-not-projected — the real catches; B4/B7 held). Dangling ref closed **both directions** (ADR-006 §3.4 palette ¶ · ADR-008 §3.4 reciprocal + "/view" struck + §5 menu≠placements · ADR-009 §3.1 tie · README L10+L44 · owed-ledger). ADR-002 body + code untouched (D5). · **NEXT → F6/D4** (LWW clock: "logical" label vs `Date.now()` wall-clock + cross-device skew), then F7/D7 (encryption-vs-query trio), F4-body/D5 (ADR-002 consolidation). D6 signed off; F10 load-bearing (now also owns the `enabled_blocks` junction sync/storage); B3 gather-source-pick tracked-for-build. |

Detailed step plan + live-panel IDs: `.claude/tasks/documentation-blueprint.md`

**Structural fix (must finish first):**
- Step 1 (#6) — Build survey-repo.js (deterministic core)
- Step 2 (#7) — Prove it on 3 targets (scalability gate)
- Step 3 (#8) — Build /survey-repo orchestrator
- Step 4 (#9) — Refactor /layer-docs onto survey
- Step 5 (#10) — Refactor /documentation Phase 0 + scenario

**Session scope (unlocks after Step 5):**
- Step 6 (#11) — Phase 0: discover vida-platform → manifest + docs/core
- Step 7 (#12) — Pilot: document Notes & Pages
- Step 8 (#13) — Wire up indexes + /session-log

## 🔴 Blocked

| Task | Blocker | Since |
|------|---------|-------|
| Steps 2–8 | each blocked by the prior step (see step plan) | 2026-06-08 |

## 📋 Planned

| Task | Profile | Priority |
|------|---------|----------|
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| toolkit-setup | 2026-06-08 | 2 |

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
