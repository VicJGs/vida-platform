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

### ▸ Wave 2 (in progress)
- [x] Projects (Wave 2 foundation) — 5 aspect docs + verified, gate PASS (06-29). Intake G1–G11 resolved. DEDICATED deliverables table + multi-type measurement system (financial/stats/3rd-party/logs/artifacts — needs design pass), vision+mission TipTap pages, project time from task focus, document VAULT (R2), dedicated Tasks→Projects API, +project_contacts(role)/account/event links, user-personalized views, deliverable notes, shared scoped tags. ⚠⚠ GOVERNING PRINCIPLE surfaced: ZK core + guarded opt-in extension layer (→ constitution).
- [ ] NEXT → Wave 2 cont.: Routines · Journals · Learning. (Journals finalizes the global Calendar + Check-in-review forward contracts.)

### ▸ Follow-up surfaced by Step 6 Verify
- [ ] ADR amendment: record the HKDF → BLAKE2b-256 Vault Key decision. Code (vault.ts) is authoritative and deliberate ("replaces HKDF"); ADR-001 §Key Model + CLAUDE.md still say HKDF. Run /adr-new (amend ADR-001) + fix CLAUDE.md — needs Victor's sign-off before editing the ADR.

### ▸ Candidate ADRs / decisions surfaced by feature documentation (build-phase, own sessions)
- [ ] **HIGH — CORE constitution amendment: the "extension-model" principle** (Projects, Victor 06-29) — ZK core is unchanged by integrations; external/AI integrations are OPT-IN, user-owns-the-risk, wrapped in a protection layer. Amend docs/core/business-rules.md; this principle FRAMES both ZK ADRs below. Needs Victor's go.
- [ ] **ADR: External DATA ingestion under zero-knowledge** (GENERALIZED — Finance G2/FN-9 + Projects G4 third-party metrics) — bank/investment APIs + CSV/OFX + social/marketing metrics (Instagram/YouTube/email) vs "server never sees plaintext". Options: device-direct (pure ZK) / aggregator (documented dent) / server-proxy (breaks ZK, rejected). Touches server + sync → its own session.
- [ ] **ADR: AI/LLM integration under zero-knowledge** (Projects G6) — documents-as-context + AI features. Victor's intent = AGENTIC, ON-DEVICE ("within") = the ZK-safe path; cloud model = opt-in plaintext dent. Own session.
- [ ] **Deliverable measurement system — design pass** (Projects G4) — the multi-type taxonomy (financial/task-statistic/third-party-metric/activity-log/artifact) needs its own mini-intake before specc'ing internals.
- [ ] **Budgeting feature design** (Finance G12) — no model in v2/v1; needs its own mini-intake (period, per-category limits, rollover, alerts, Purpose integration). May graduate to its own feature context (own manifest row).
- [ ] **ADR-002 amendment (consolidated)** — now spans Preferences (6 fields + visibility store) · Tasks (5 additions) · Habits (G8 4 fields + G7 + G9) · Finance (opening_balance, G9 restored fields, import-staging, budgeting, liability-payments, base-currency/FX, managed categories, shared-tags migration) · Relationships (network_groups + junction, closeness_tier, how_we_met, interaction energy/key_takeaways, reminder snooze/priority, event-anchored group reminders). Consider ONE amendment in build phase.
- [ ] **Notes & Pages tag-system refinement** — tag SCOPING (universal vs module-specific), surfaced by Relationships G10. Revisit when documenting Notes & Pages contract for tags / build phase.
- [ ] **Platform onboarding (G_meta)** — per-module + one global onboarding; personalization surface compounding across Preferences/Tasks/Habits/Finance/Relationships. Revisit after Wave 1.
- [ ] **Global Calendar page (NEW platform surface)** — standalone, read-only cross-module aggregator of events + tasks + reminders in multiple views. Surfaced by Relationships G1 (reminders viewed there, not in-module). Joins journal + onboarding as cross-cutting surfaces. Revisit after Wave 1.

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

## Failures This Session
*(none yet — On Failure protocol writes here)*

## Notes
- Task-system sync gap discovered: toolkit /task-new (markdown files) and Claude Code native task panel
  (TaskCreate) are not bridged. This session: panel is the live view, mirrored here + in TASKS.md.
  Going forward both are kept in sync. A toolkit fix to integrate them is parked above.
