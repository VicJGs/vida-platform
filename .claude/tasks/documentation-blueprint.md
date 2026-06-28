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
- [ ] NEXT → Wave 1 FINALE: Check-ins (closes Wave 1)

### ▸ Follow-up surfaced by Step 6 Verify
- [ ] ADR amendment: record the HKDF → BLAKE2b-256 Vault Key decision. Code (vault.ts) is authoritative and deliberate ("replaces HKDF"); ADR-001 §Key Model + CLAUDE.md still say HKDF. Run /adr-new (amend ADR-001) + fix CLAUDE.md — needs Victor's sign-off before editing the ADR.

### ▸ Candidate ADRs / decisions surfaced by feature documentation (build-phase, own sessions)
- [ ] **ADR: External financial data under zero-knowledge** (Finance G2/FN-9) — bank/investment-API ingestion + CSV/OFX import vs "server never sees plaintext". Options: device-direct (pure ZK) / aggregator e.g. Open Finance Brasil+Belvo (documented ZK dent) / server-proxy (breaks ZK, rejected). Touches server + sync layers → its own session.
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
