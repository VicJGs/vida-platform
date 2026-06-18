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

### ▸ Follow-up surfaced by Step 6 Verify
- [ ] ADR amendment: record the HKDF → BLAKE2b-256 Vault Key decision. Code (vault.ts) is authoritative and deliberate ("replaces HKDF"); ADR-001 §Key Model + CLAUDE.md still say HKDF. Run /adr-new (amend ADR-001) + fix CLAUDE.md — needs Victor's sign-off before editing the ADR.

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
