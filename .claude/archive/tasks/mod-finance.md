# Task: mod-finance
# Status: done
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
- ✅ **S7 — fiscal-legal SITUATE** (FL-01/02/03/09/10): `createFiscalLegalService` (new `fiscal-legal.ts`) — residency/legal-entity CRUD + `linkMoneyTouch` (jurisdiction_code on 5 money-touch entities via finance update) + `assertExternalGrant` fail-closed + 7-error FL-10 contract. §XXVIII: exposed jurisdiction_code on 5 @vida/types interfaces (FL-02, S1→S7). Full double-gate + code-review [] (no bugs). Spec `delivery/PLAN-S7-fiscal-legal-situate.md`. @vida/core 1240/1240 (+7). §XXIX: `finance/current-*` refreshed. ← DONE
- ✅ **S8 — fiscal-legal INFORM/DERIVE/ADVISE (guarded)** (FL-04/05/06/07/08): extended `fiscal-legal.ts` (7 ops) + new `fiscal-ports.ts` (deny-safe ports + DTOs + `NOT_PROFESSIONAL_ADVICE`) + 2 validators. `rulePack` (public-reference, grant-gated, deny-safe) · `deriveObligations` (proposer + unverified-law gate; rule-evaluation **owed M2** — pack format not yet specified, parts/finance.md:123) · `confirmObligation` (the ONLY persist path → `fiscal_obligations` + deny-safe fan-out surfacing `{deferred}`; FL-11 manual path is the real positive test) · `model` (ADR-015 AI, deny-safe; source=ai + BOTH disclosures) · `prepareFilingSummary` (RETURNS the summary — never files) + `exportFiling` (optional deny-safe) · `feedLongRunImpact` (ADR-011 contributions, deny-safe). Full double-gate (**gate-1 REVISE→re-grounded**: finding-1 inverted as over-reach [pack format owed]; **preflight** BLOCKED→6 resolved; **gate-2** REVISE→`model(scenario,pack)` + 3 nits) + Verification Gate PASS + code-review (2 folded) + pre-ship /critique **SHIP**. §XXVIII: `WhatIfScenarioBaseSchema` co-located (validators = @vida/types leaf); `FanoutTargetsNotActive` dropped (deny-safe returns, never throws). @vida/core **1247/1247** (+7), tsc 0, eslint 0. §XXIX: `finance/current-*` promoted (BR-S8-1…7). Spec `delivery/PLAN-S8-fiscal-legal-guarded.md`. ← DONE (LAST slice)
- **① BACKEND COMPLETE (S1–S8).** Next: commit S8 → PR the whole ① → merge. ② `fe-finance` (P6) separate. Env: Node 24 via nvm.

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
