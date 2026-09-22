# Task: mod-finance
# Status: in_progress
# Linear: LIF-122
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)
# Branch: mod-finance (off main, 2026-09-21)

## Goal
Finance — accounts/transactions/assets/…

## Build Steps (Entity Delivery Flow — 8 backend slices, see delivery/slice-map.md)
- ✅ **Decomposition Gate (Approval 1)** — independent critic REVISE→SHIP (2 roster fixes). Artifacts: `docs/features/finance/delivery/{interpretation,slice-map,seam-contract}.md`. 48 legs → 8 slices.
- ✅ **S1 — service scaffold + entity CRUD** (13 legs) — `bc67f01`. createFinanceService (5-entity CRUD), validators, faithful echo, +@vida/types FIN-01/27 fields. Gate PASS (13 live-store tests); code-review folded (dropped redundant not-found pre-read). @vida/core 1181/1181.
- ✅ **S2 — transaction ledger + derived balance + transfers** (FIN-05/06/07/08/09/10/11/12) — createTransaction/transfer, getBalance (FN-3 derived), FN-4 transfer semantics, listTransactions/getTransactionsInRange. Gate PASS (11 tests); code-review folded 2 (FN-4 on account_id change + stable sort). @vida/core 1191/1191.
- ✅ **S3 — derived analytics** (FIN-17/19/22): getOverview (net worth = FN-7 simple sum, unvalued* + partial), getInvestmentValue (priceSet empty-state), getSpendingByCategory/getIncomeVsExpense/getAssetLiabilityBreakdown/getChartDatasets (per-chart degrade). Full double-gate + code-review (4 folds). Spec `delivery/PLAN-S3-derived-analytics.md`. @vida/core 1207/1207 (+16). §XXIX: `docs/modules/finance/current-*` BORN (S1–S3). ← DONE
- ✅ **S4 — move_money handler** (FIN-26): `services/finance/effects.ts` (`createFinanceEffectHandlers` + `registerFinanceEffects`); Additive handler co-writes a transfer via `createInTx` (rail owns idempotency); deny-safe `StoreLockPort` (tx-threaded). Full double-gate + code-review (3 folds). Spec `delivery/PLAN-S4-move-money-handler.md`. @vida/core 1216/1216 (+9). §XXIX: `finance/current-*` refreshed. ← DONE
- ✅ **S5 — external/ingestion/config seams** (FIN-20/21/25/28/29/30/40): 3 real derivations (recurring forecast · FX convert · category resolve) + 4 deny-safe ports (`config-seams.ts`) + import over the built ingestion reconcile primitives + injected-guard external gate. Zero re-implementation. Full double-gate + code-review (3 real bugs folded: forecast guard-starvation, auto-match merge-no-dup, month-end clamp). Spec `delivery/PLAN-S5-external-ingestion-config-seams.md`. @vida/core 1224/1224 (+8). §XXIX: `finance/current-*` refreshed. ← DONE
- ✅ **S6 — cross-module providers** (FIN-31/32/33/34/35/37): one Journal contribution (summary+dueIn) · `getNetWorth` measurement seam (ADR-011 §3.6) · `getEntityTags` via AssociationResolver · `FINANCE_ENTITY_TYPES` boundary · FIN-31 reserved emit-point (concrete emit #48, achievements pull). Zero re-implementation. Full double-gate + code-review (2 folds). Spec `delivery/PLAN-S6-cross-module-providers.md`. @vida/core 1233/1233 (+9). §XXIX: `finance/current-*` refreshed. ← DONE
- ☐ **S7 — fiscal-legal SITUATE** (FL-01/02/03/09/10): `createFiscalLegalService`; residency/legal-entity/money-touch CRUD (residencies/legal_entities + jurisdiction link); grant-gate (X5/X9 fail-closed); typed errors; encrypt-seam. Always-available, no external dep. ← NEXT · ☐ S8 fiscal-legal INFORM/DERIVE/ADVISE (guarded)
- Env: Node 24 via nvm. Per-slice: build → tsc → live-store Verification Gate → code-review → commit. Final: pre-ship /critique → currency (`/document-context finance`) → PR.

## Dependencies
- blocked by `mod-journals`
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-ai`
- blocked by `xs-backlinks-search-export`
- blocked by `xs-effect-rail`
- blocked by `xs-egress-guard`
- blocked by `xs-ingestion`
- blocked by `xs-measurement-engine`
- blocked by `xs-notifications-delivery`
- blocked by `xs-spaces-tags-links`
