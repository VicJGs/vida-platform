# Task: xs-effect-rail
# Status: in_progress
# Linear: LIF-170
# Profile: Add Backend Component
# Scenario: Entity Re-scope
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Effect rail — cross-module effect dispatch (sessions XCU-09/10/22, spaces SP-30).

## Dependencies
- (none) — build-deps all merged: effects rail (AR-7), session contracts (AR-5), #31 capability enforcer.
  Note: decomposition:43 omits the XS-capability build-edge (📄 D2); non-blocking.

## Build Steps
Entity Re-scope flow (Ratify): delivery docs done (interpretation ✓ · reconciliation ✓ · slice-map ✓, Approved).
Each slice = §XXVI double-gate (spec→/critique→A1→/preflight→/critique→A2→impl) + live-store Verification Gate.
- [x] S1 — Attachment resolver (`foundation/sessions/attachments.ts`, XCU-10) — SHIP. Verification Gate PASS
      (827 tests, tsc 0, eslint clean). gate-1 caught a phantom `deleted_at` (session_attachments has no soft-delete).
- [x] S2 — Fire-time validation gate (`foundation/effects/gate.ts`, XCU-22) — SHIP. Verification Gate PASS
      (834 tests, tsc 0, eslint clean). §XXVIII: mechanism CORRECTED at gate-1 — producer-agnostic session
      `sensitive_optins` gate, NOT #31's capability_grants enforcer (no session defId; ADR-004 §3.2.5-C per-tier).
      ⛔ C4 retracted (economy=shipped, structurally enforced). slice-map + reconciliation synced. (SENSITIVE_MODULE_CLASSES
      already barrel-exported via `export *` — no dup export.)
- [x] S3 — Lifecycle engine + fire step (`foundation/sessions/lifecycle.ts`, XCU-09) — SHIP. Verification Gate
      PASS (839 tests, tsc 0, eslint clean). §XXVIII: gate is HANDLER-side not engine (ADR-004 §3.2.5-A3/BR-17;
      engine can't supply moduleClass per IR-5) → engine fires structural-scope only; S2 = handler seam. gate-1
      caught 2 determinism blockers (ended_at→started_at UTC date; cartesian over-fire bounded). Live-store caught
      the M1.0 encryptedFields:[] seam (getVaultKey throws vault-locked). started_at stamped at in_progress.
- [x] Step 7 — /critique changed files → SHIP (1 nit fixed: redundant cast removed).
- [x] Step 8 — Currency (§XXIX): refreshed `docs/core/effects/current-*` (gate BR-8) + `docs/features/
      sessions-and-scheduling/current-*` (BR-8..12 engine/resolver) + both substrate CLAUDE.md. Commit WITH code.
- [ ] COMMIT (Victor's call) — branch `xs-effect-rail` → PR → merge (per-issue git workflow).

## Route History
- 2026-09-17 — routed Add-Backend-Component → Entity Re-scope (recovery variant, Ratify). Baseline current;
  Documentation Gate PASS; Interpretation Gate PASS (IR-1 all-or-none over-reach self-corrected vs ADR-004 §3.2.5);
  Reconciliation dry-pass (0 ❌); Re-scope Gate APPROVED (3 slices).
