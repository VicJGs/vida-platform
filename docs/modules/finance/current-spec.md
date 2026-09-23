# Current Spec — finance   (level: Module · tier: STANDARD)
> Coverage: schema (`020_finance`, 9 tables) + colocated `@vida/types` + validators + service tier **S1–S8 COMPLETE** (① backend done). ② fe-finance (P6) separate.
> Inherits: docs/core (business-rules constitution — ZK-1/2/3, LF-1/2/3). This doc must not contradict any level above it.
> Last refreshed: 2026-09-22-mod-finance-S8  ·  Source of truth = the code (Currency Rule §XXIX).

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
**Status: ① BACKEND COMPLETE — S1 ✅ · S2 ✅ · S3 ✅ · S4 ✅ · S5 ✅ · S6 ✅ · S7 ✅ · S8 ✅ (fiscal-legal guarded).** ② fe-finance (P6) separate.

**S8 (2026-09-22) — fiscal-legal INFORM/DERIVE/ADVISE guarded (FL-04…08), `fiscal-legal.ts` + new `fiscal-ports.ts`:**
7 ops on `FiscalLegalService` — `rulePack` (ADR-014 public-reference, grant-gated, deny-safe M1) · `deriveObligations`
(proposer + unverified-law gate; rule-evaluation owed M2) · `confirmObligation` (the ONLY persist path → `fiscal_obligations`
+ deny-safe fan-out surfacing `{deferred}`) · `model` (ADR-015 AI, deny-safe M1; `source:'ai'` + BOTH disclosures) ·
`prepareFilingSummary` (RETURNS the summary — never files) + `exportFiling` (optional deny-safe format-render) ·
`feedLongRunImpact` (ADR-011 contributions, deny-safe). Every external/cross-module reach = a deny-safe/fail-closed
port composing a built substrate; zero-signature-change swap at M2. Structural enforcement: NoAutoAction (derive/confirm
split) · AdviceIsInformational (baked disclaimer) · FilingHandsOff (no `file()`). `[FACT: services/finance/fiscal-legal.ts, fiscal-ports.ts]`

**S7 (2026-09-22) — fiscal-legal SITUATE (FL-01/02/03/09/10), new `fiscal-legal.ts` + fiscal validators:**
`createFiscalLegalService` (a Finance sub-context, the always-available no-external-dep spine) — residency +
legal-entity CRUD (returns Row types, DB-11; `[E]` M1 pass-through); `linkMoneyTouch` sets `jurisdiction_code` on a
money-touch Finance entity (5 types, liability excluded) via the finance update path; `assertExternalGrant`
fail-closed via the enforcer (no enforcer → `ExternalGrantMissing`); the 7-error FL-10 typed contract (S8 throws the
guarded ones). **§XXVIII deviation:** exposed `jurisdiction_code` on the 5 money-touch `@vida/types` interfaces
(FL-02, deferred S1→S7 per slice-map.md:57). `[FACT: services/finance/fiscal-legal.ts; types finance.ts]`

**S6 (2026-09-22) — cross-module providers + delegates (FIN-31/32/33/34/35/37), `journal.ts` + service methods:**
`createFinanceJournalContribution`/`registerFinanceJournal` — ONE Journals contribution (`summary(date)` = today's
txns + net-worth snapshot; `dueIn(range)` = upcoming G9 installments). `getNetWorth → {value, partial}` = the Purpose
measurement-source read seam (ADR-011 §3.6; feeder-only, no M* on finance). `getEntityTags` via injected
`AssociationResolver` (deny-safe → []). `FINANCE_ENTITY_TYPES` declared for the shared taggable/notes registry
(finance owns no note columns). FIN-31 = a reserved emit-point comment; the concrete emit is #48 (achievements PULL
`net_worth` via the seam). `[FACT: services/finance/{journal.ts,service.ts}]`

**S5 (2026-09-22) — external / ingestion / config seams (FIN-20/21/25/28/29/30/40), `config-seams.ts` + service methods:**
3 real derivations + 5 deny-safe ports over deferred stores, zero re-implementation. `forecastRecurring`
(by-index-from-anchor, month-end clamp, no drift) + `materializeDue` (forecast-only default → `[]`); `convertToBase`
/`getFxRate`/`setFxRate` (device-side `FxRatePort`; missing → `FxRateMissingError`, no silent 1:1); `resolveCategory`
(free-text passthrough; no bidx = M3); `aggregatesPersisted` (false = compute-only); `importStatement`/`confirmImport`
(over the built ingestion reconcile primitives, instance staging port, auto-matched → merge-no-dup); `assertExternalAccess`
(injected ingestion guard; no guard → `ZeroKnowledgeViolationError` fail-closed). Deferred stores + materialize
write path = M2 (ports swap, zero-signature). `[FACT: services/finance/{service.ts,config-seams.ts}]`

**S4 (2026-09-22) — `move_money` effect handler (FIN-26), new file `effects.ts`:**
`createFinanceEffectHandlers(db, deviceId, storeLock?)` + `registerFinanceEffects(registry, handlers)` — the
`move_money` Additive handler co-writes a `transactions` transfer row via `createInTx` (rail owns idempotency,
BR-S4-2); `MoveMoneyPayload` (Zod); the penalty branch hits a deny-safe `StoreLockPort` (`StoreLayerNotActive`,
tx-threaded for the FIN-24 atomic swap). Consent-gating deferred (#48). `[FACT: services/finance/effects.ts]`

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
FIN-18 store-tree net worth · FIN-24 lock-box · FIN-36/38/39 Commitments/budgeting/liability-payment
(design-pass) · net-worth-over-time chart (snapshot design-pass) · **FIN-31 concrete emit** (#48) · **S8 M2 reach**
(rule-pack content/mirror/verifier · AI mediator/on-device runtime LIF-145 · Tasks/Notif/Calendar fan-out · export
format-render · Purpose `contributions` writer — all behind zero-signature-change deny-safe ports) · **all S5 deferred STORES**
(FX/base-currency, managed-category, persisted-aggregates, import_staging, materialize write path — M2). Homed in `slice-map.md`.

## 5. Terminal states
Overview/dashboard · account balance · investment value · each chart — loading/empty/error/success. A derive
error → flagged partial (`partial` / `degraded[]`), never a wrong number. Empty dataset → all-zero, not an error.

## 6. Verification
S1–S8: @vida/core **1247/1247** (+7 S8), tsc 11/11, eslint 0, live-store Verification Gate PASS — S8 covers the deny
paths (rulePack fail-closed, deriveObligations refuse+no-persist, model ModelUnavailable/InsufficientRuleData,
exportFiling/feedLongRunImpact fail-loud) AND the positive paths (confirmObligation manual round-trip persists exactly
one row + surfaces the deferred fan-out; model with an injected AI stub → source:'ai' + both disclosures; prepareFilingSummary
returns a real assembled summary). Prior: S1–S7 (real
better-sqlite3 + `initVault()` + `migrate()`; S3 degrade drops a table; S4 fires the REAL effect rail; S5 import
round-trips the staging port; S6 registers into a live Journals registry; S7 fiscal-legal CRUD + money-touch +
fail-closed grant-gate). `@vida/types` extended (jurisdiction_code, S7 §XXVIII). `[FACT: finance-service.test.ts, 72 tests]`

## Completion checklist
- [x] §1 identity · [x] §2 contract (S1–S3 done, S4–S8 pending) · [x] §3 structure · [x] §4 deferred homed · [x] §5 states · [x] §6 verification
- [x] inherits docs/core; no contradiction with a level above
