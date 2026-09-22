# Current Spec — finance   (level: Module · tier: STANDARD)
> Coverage: schema (`020_finance`, 9 tables) + colocated `@vida/types` + validators + service tier S1–S3 of 8. Fiscal-legal service (S7–S8) NOT yet built.
> Inherits: docs/core (business-rules constitution — ZK-1/2/3, LF-1/2/3). This doc must not contradict any level above it.
> Last refreshed: 2026-09-22-mod-finance-S3  ·  Source of truth = the code (Currency Rule §XXIX).

## 1. Identity & responsibility
**What it is.** The finance module — accounts, transactions, assets, liabilities, investments, income streams —
over the DB-4 `020_finance` schema. This build delivers the ① **backend service tier**
(`@vida/core/services/finance`, `createFinanceService`); the ② frontend (9 view surfaces) is P6 `fe-finance`. `[FACT: services/finance/service.ts; slice-map.md]`

**The one job it owns.** Persist + validate the 6 finance entities, derive balances/net-worth/analytics live
(never stored), and move money via transfers — all client-side, local-first. `[FACT: identity.md]`

**What it is NOT.**
- Not the schema (authored at DB-4 #9, migration `020_finance`, v20). `[FACT: schema/finance.ts]`
- Not the store-economy layer — the ADR-012 `store` tree (net worth over wrapped entities, FIN-18) is DEFERRED; ① uses the FN-7 simple sum. `[FACT: slice-map.md:26]`
- Not the Purpose-metrics owner — it EXPOSES a net-worth/balance read seam (feeder, FIN-33/S6); no `measurement_kind`/`binding_mode` on finance entities (ADR-011 C6). `[FACT: parts/finance.md:43]`
- Not the tag owner — consumes `entity_tags` (Spaces SP1); notes via the `pages` seam (both S6). `[FACT: parts/finance.md]`

## 2. Contract — what it exposes / needs
**Status: ① BACKEND — S1 ✅ · S2 ✅ · S3 ✅ · S4–S8 ☐ (5 slices remain).** ② fe-finance separate.

**S3 (2026-09-22) — derived analytics (FIN-17/19/22), append-only to `createFinanceService`:**
- `getOverview(opts?: {month?}) → FinanceOverview` — `{totalBalance, totalAssets, totalLiabilities, netWorth,
  monthlyIncome, monthlyExpenses, month, unvaluedAssets, unvaluedLiabilities, partial}`. netWorth = FN-7 simple
  sum; monthly totals exclude transfers (FN-12); null values counted into `unvalued*` + `partial` (FN-40).
- `getInvestmentValue(id) → InvestmentValue` — qty × current_price + gain/loss vs purchase; `priceSet` empty
  state; `currentValue` authoritative; not-found throws.
- `getSpendingByCategory(range)` · `getIncomeVsExpense(range)` · `getAssetLiabilityBreakdown()` — pure chart
  derivations (transfers excluded; stable-sorted).
- `getChartDatasets(range) → ChartDatasets` — aggregator; a failing chart degrades ALONE (`degraded[]`). `[FACT: service.ts §S3; types.ts]`

**S2 (2026-09-21):** `createTransaction`/`updateTransaction`/`softDeleteTransaction`, `getBalance` (FN-3 derived),
`createTransfer` (FN-4 one row), `listTransactions(filter)` + `getTransactionsInRange`. `[FACT: service.ts]`
**S1 (2026-09-21):** 5-entity CRUD + validators + faithful create-echo + `@vida/types` FIN-01/27 field extensions. `[FACT: service.ts, validators/finance.ts]`

**Needs (deferred seams):** Preferences base-currency/recurring-mode (S5) · ADR-014 ingestion #44 + enforcer
#31/egress #43 (S5) · EffectRegistry `move_money` (S4) · Journals registry + `entity_tags` + `pages` (S6). `[FACT: slice-map.md]`

## 3. Structure & shape
- `createFinanceService(deps)` — factory-object, hoisted closures, **no `this.`** (the ② destructure shape;
  checkins precedent) `[[factory-service-no-this-for-intra-calls]]`; `encryptedFields: []` M1.0 pass-through
  (FIN-43 → M3/DB-5); `softDelete: true` on all 5 tables. `[FACT: service.ts:createFinanceService]`
- Row → `@vida/types` interface via a single `_sync_status` string→union cast (the drizzle-row seam). `[FACT: service.ts toAccount…]`
- S3 DTOs are **service-local** in `types.ts` (`@vida/types` untouched). Date helpers are inline (no `date-fns`
  in core); `monthWindow` uses UTC calendar arithmetic (day 0 of next month). `[FACT: service.ts currentMonth/monthWindow]`

## 4. Deferred / open (homed, not built)
FIN-18 store-tree net worth · FIN-21 FX · FIN-24 lock-box · FIN-26 `move_money` · FIN-36/38/39 Commitments/
budgeting/liability-payment (design-pass) · FL-01…10 fiscal-legal (S7–S8) · net-worth-over-time chart (snapshot
design-pass) — all in `slice-map.md` + `PLAN-S3-derived-analytics.md §3.4`.

## 5. Terminal states
Overview/dashboard · account balance · investment value · each chart — loading/empty/error/success. A derive
error → flagged partial (`partial` / `degraded[]`), never a wrong number. Empty dataset → all-zero, not an error.

## 6. Verification
S1–S3: @vida/core **1207/1207** (+16 S3), tsc 11/11, eslint 0, live-store Verification Gate PASS (real
better-sqlite3 + `initVault()` + `migrate()`; the degrade test drops a real table). `[FACT: finance-service.test.ts, 41 tests]`

## Completion checklist
- [x] §1 identity · [x] §2 contract (S1–S3 done, S4–S8 pending) · [x] §3 structure · [x] §4 deferred homed · [x] §5 states · [x] §6 verification
- [x] inherits docs/core; no contradiction with a level above
