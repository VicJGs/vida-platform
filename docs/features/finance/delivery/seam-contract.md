<!-- Seam Contract — features/finance · Entity Delivery Flow v1 Step 2 · mod-finance #47 / LIF-122 -->
<!-- The service API that ② fe-finance (P6) consumes. Full per-method signatures + sources live in parts/finance.md; this fixes the SURFACE shape, return types, typed-error taxonomy, and the seam boundaries. -->

# Seam Contract — Finance ① → ② (`@vida/core` public surface)

Two factories, exported from `@vida/core` (barrel → `packages/core/src/index.ts`, per `services/checkins/index.ts:1-22` precedent).

## `createFinanceService(deps): FinanceService`

`deps = { db: DrizzleDb; deviceId: string }` `[FACT: services/checkins/types.ts:39-46]`

### Return-shape convention

- Entity reads/writes return `@vida/types` interfaces (`Account`, `Transaction`, `Asset`, `Liability`, `Investment`, `IncomeStream`) `[FACT: packages/types/src/finance.ts:88-193]`, backfilled for notNull-defaults `[[repository-create-returns-input-row-not-db-defaults]]`.
- Derived reads return **computed value objects**, never rows: `Balance`, `FinanceOverview` (`{totalBalance,totalAssets,totalLiabilities,netWorth,monthlyIncome,monthlyExpenses}`), `InvestmentValue` (`{value,gainLoss}`), `ChartDataset[]`. A compute error returns a **flagged partial**, never a wrong number as correct (FN-40). `[FACT: parts/finance.md:27,29,32,50]`

### Surface (grouped; signatures in `parts/finance.md`)

- **Accounts** — `createAccount · updateAccount · softDeleteAccount · listAccounts · getBalance` (FIN-01,02,03,04,05)
- **Transactions** — `createTransaction · updateTransaction · softDeleteTransaction · listTransactions · getTransactionsInRange · createTransfer` (FIN-06…11); every mutation re-derives balance.
- **Assets / Liabilities / Investments / Income** — CRUD + sorted lists (FIN-13,14,15,16); G9 schedule fields exposed (FIN-27).
- **Derived** — `getOverview · getInvestmentValue · getChartDatasets` (FIN-17,19,22). `getOverview.netWorth` = FN-7 simple sum (store-tree net worth FIN-18 = deferred).
- **Recurring / FX / config** — `previewRecurring` (forecast), `getFxRate`/`setFxRate` + `convert` (→ `FxRateMissingError`), persisted-aggregates opt-in read (FIN-20,21,25).
- **Providers registered (not called by ②)** — `move_money` effect handler (FIN-26), Journal `/summary` provider (FIN-32), `dueIn` provider (FIN-37), Gamification emit (FIN-31).
- **Delegating seams** — notes via `pages` (FIN-34), tags via `entity_tags` (FIN-35), Purpose read seam (FIN-33) — ② uses the owning module's contract, not these.

### Typed errors (FIN-40)

`InvalidTransferError` · `FxRateMissingError` · `ZeroKnowledgeViolationError` (import needing server plaintext) · balance-re-derive partial-flag. Each extends `Error` with a stable `.name` `[FACT: services/checkins/types.ts:111-146]`.

## `createFiscalLegalService(deps): FiscalLegalService`

`deps = { db; deviceId; + deny-safe ports: ingestionPort (#44), aiPort (#45), grantPort (#31/#43) }`

### Return-shape convention

- SITUATE reads/writes return **Drizzle `Row` types** (`FiscalResidencyRow`, `LegalEntityRow`, `FiscalObligationRow`) — no `@vida/types` interface exists yet (DB-11 reconcile). `[FACT: schema/finance.ts:253-258; [[drizzle-row-not-assignable-to-vida-types-interface]]]`
- ADVISE returns `Advisement` carrying `source='ai'` + the "not professional advice" disclaimer — **uncstrippable** by the caller (FL-13). `[FACT: fiscal-legal/contract.md:41]`

### Surface

- **Situate (always-available, local)** — `setResidency · linkMoneyTouch · registerLegalEntity` (FL-01,02,03). No external dep.
- **Guarded (deny-safe ports)** — `rulePack(jurisdiction)` (#44), `model(scenario)` (#45), gated on `external_in_ok`/`external_out_ok` (fail-closed) (FL-04,06,09).
- **Derive** — `deriveObligations(range)` → `Obligation[]`; user-confirm → Tasks/Notifications/Calendar fan-out; never on unverified law, no auto-action (FL-05).
- **Hand-off** — `prepareFilingSummary(jurisdiction)` → export; never files (FL-07).
- **Feed** — long-run impact → Purpose `contributions` (FL-08).

### Typed errors (FL-10)

`RulePackUnverified` · `ExternalGrantMissing` · `InsufficientRuleData` · `AdviceIsInformational` · `NoAutoAction` · `FilingHandsOff` · `ModelUnavailable`. `[FACT: fiscal-legal/contract.md:37-44]`

## Seam boundaries (what ② must NOT assume)

- **No store-tree net worth** until FIN-18/23/24 land; ② net-worth widget reads `getOverview.netWorth` (simple sum).
- **No Commitments list / budgeting / liability-payment tracking** — FIN-36/38/39 deferred; ② has no `listCommitments`/budget API in M1.
- **Guarded fiscal-legal fails closed** — `rulePack`/`model` return typed "grant missing / unavailable"; ② renders the manual SITUATE/TRACK spine regardless (FL-11 manual fallback).
- **All `[E]` is pass-through in M1.0** — ② must not assume field encryption is active (M3/DB-5).

## Completion checklist

- [x] both factory surfaces + deps · [x] return-shape convention (interfaces vs Row types vs value objects) · [x] typed-error taxonomy · [x] provider-vs-delegate seams · [x] the ②-facing seam boundaries (deferred set) stated
