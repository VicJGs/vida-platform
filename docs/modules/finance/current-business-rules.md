# Current Business Rules — finance   (level: Module · tier: STANDARD)
> Coverage: schema (`020_finance`, full) + colocated `@vida/types` + validators + service tier S1–S3 of 8. Fiscal-legal (S7–S8) NOT yet built.
> Inherits: docs/core/business-rules.md (ZK-1/2/3, LF-1/2/3). Finance holds money data → ZK-1 governs `[E]` fields; the M1.0 `[E]` set is EMPTY (pass-through, M3 target). A child rule contradicting a parent is a CONFLICT — flagged, never overridden.
> Last refreshed: 2026-09-22-mod-finance-S3  ·  Source of truth = the code (Currency Rule §XXIX).

## 1. Invariants — what is ALWAYS / NEVER true

### Realized (S1–S2 — CRUD + ledger)
- **FN-2 — Money is integer cents.** Every monetary column is `money` (INTEGER cents); rates are basis points.
  Validators enforce cents/bp at the boundary. `[FACT: schema/finance.ts money(); validators/finance.ts]`
- **FN-3 — Balance is DERIVED, never stored-authoritative.** `getBalance(accountId)` = `opening_balance +
  Σ signed ledger` (income +, expense −, outgoing transfer −, incoming transfer +), recomputed live on every
  read; **no balance-column write on transaction mutation**. `[FACT: service.ts getBalance]`
- **FN-4 — A transfer is ONE row, distinct destination.** `transaction_type='transfer'` requires a distinct
  `transfer_to_account_id`; a non-transfer must leave it null; source ≠ destination (fail-loud
  `InvalidTransferError`). Re-validated on any update touching type/transfer_to/account_id. `[FACT: service.ts assertTransferShape, updateTransaction]`
- **FN-10 — Inline tags retired → `entity_tags`.** `createTransaction` returns `tags: []`; the real tag read is
  the Spaces `entity_tags` seam (S6/FIN-35). The stale `Transaction.tags` interface field is not trustworthy
  (DB-11). `[FACT: service.ts toTransaction]`
- **FN-11 — Referential integrity is APP-LAYER.** No FK (ADR-016 §3.4); account-delete cascade / transfer-target
  SET-NULL is a service contract, not a DB constraint. Soft delete (`deleted_at`) hides without destroying. `[FACT: schema no-FK; slice-map.md S1]`
- **FN-12 — Local-first.** Every create/edit/transfer succeeds locally first; LWW on structured columns. `[FACT: LF-2; ADR-003]`

### Realized (S3 — derived analytics)
- **BR-S3-1 (FN-7) — Net worth = SIMPLE sum.** `netWorth = Σ account balances (derived) + Σ asset current_value
  − Σ liability current_balance`. **NOT** the deferred store tree (FIN-18); **investments are not a net-worth
  term** by FN-7's definition (they enter via wrappers when the store tree lands — avoids double-count). `[FACT: service.ts getOverview; business-rules.md:31-32]`
- **BR-S3-2 (FN-6) — Aggregates are COMPUTED, never stored.** overview / investment value / charts recompute on
  read; no persistence (opt-in persisted-aggregates is FIN-25/S5). ADR-012 §3.3 house rule. `[FACT: service.ts §S3]`
- **BR-S3-3 (FN-12) — Transfers EXCLUDED from every income/expense aggregate.** monthly totals,
  spending-by-category, income-vs-expense all skip `transfer` rows (no double-count); transfers still net
  correctly in `totalBalance` via `getBalance`. `[FACT: service.ts getOverview, spendingByCategory, incomeVsExpense]`
- **BR-S3-4 (FN-40) — Incomplete input is FLAGGED, never a wrong number.** A null asset/liability value is
  UNKNOWN → contributes 0 but is COUNTED (`unvaluedAssets`/`unvaluedLiabilities`) and folds into `partial:true`;
  a per-account balance throw also sets `partial`. Charts degrade per-chart (`degraded[]`), never the whole set. `[FACT: service.ts getOverview, getChartDatasets]`
- **BR-S3-5 (FN-19) — Missing value surfaced, one policy.** `getInvestmentValue`: a missing `current_price` is
  the "no price set" empty state (`priceSet:false`, null value), not an error. `currentValue != null` is the
  AUTHORITATIVE "value known" signal (null when price OR quantity is unset); `priceSet` reports only the price
  dimension. Consistent with the overview's unvalued surfacing. `[FACT: service.ts getInvestmentValue]`
- **BR-S3-6 (FN-8) — S3 sums RAW cents, no FX.** No currency conversion; multi-currency base-currency
  conversion + `FxRateMissingError` is S5/FIN-21 (needs the deferred Preferences base-currency port). `[FACT: slice-map.md:18,38]`

### Pending / INTENDED (S4–S8 — not yet realized)
- **FN-5 (FIN-20)** recurring forecast/materialize · **FN-8 (FIN-21)** private FX · **FN-9 (FIN-28/29)** ADR-014
  ingestion + external grant-gate · **FN-13/14 (FIN-36/38/39)** Commitments/budgeting/liability-payment
  (undesigned) · **FN-15 (FIN-18/23/24)** store-tree net worth + lock-box · **FN-16 (FIN-26)** `move_money`
  effect handler · **FL-01…10** fiscal-legal. Each homed in `slice-map.md`; **no rule may assume their internals.**

## 3. Rule inventory — explicit · implicit · invented
- **EXPLICIT (schema/service-realized):** FN-2/3/4/10/11 (S1–S2), BR-S3-1…6 (S3) — all cited to `service.ts`/`schema/finance.ts`.
- **IMPLICIT (enforced in service):** enum validation at the boundary (invalid enum rejects); soft-delete hides
  from `getBalance`/lists (explicit `isNull(deleted_at)` on `findWhere` — the repository-findwhere seam); newest-first stable sort on ledger reads.
- **INVENTED / DRIFT-RISK:** none. The DTOs (`FinanceOverview`/`InvestmentValue`/chart shapes) are service-local
  by design (`@vida/types` untouched — DB-11 does not own derivation DTOs).

## 4. Validation & edge cases
- Enum CHECKs (SQL, from the tuples): `account_type`(7), `transaction_type`{income,expense,transfer},
  `recurring_frequency`(6), `asset_type`(6), `liability_type`(7), `investment_type`(8), `income_type`(8). `[FACT: business-rules.md:91-92]`
- `getOverview` month defaults to the current calendar month; caller may pin `{month}` (tests pin for determinism).
- `getInvestmentValue`: fractional-share `quantity` (real) × cents → `Math.round`; `gainLossPct` null unless
  `costBasis > 0` (guards divide-by-zero AND sign-meaningless negative basis); not-found throws.
- Empty dataset → all-zero overview, `unvalued*:0`, `partial:false`, charts → `[]`. Not an error.
- Equal-total chart rows sort with a stable secondary key (category/type) — findWhere/findAll issue no ORDER BY.

## 5. Terminal states
Dashboard/overview · account balance · all-transactions · investment value · charts — each loading/empty/error/
success per `docs/features/finance/business-rules.md:105`. A derive error → flagged partial (BR-S3-4), never a
wrong number as correct.

## 6. Failure behavior (fail loud — constitution §5)
- A failed save/transfer reverts + surfaces a typed error (`InvalidTransferError`) — never silent money loss. `[FACT: service.ts]`
- A compute error (balance/net worth/gain-loss) shows a flagged partial (`partial`/`degraded[]`), never a wrong number. `[FACT: service.ts getOverview, getChartDatasets]`
- Validating methods reject asynchronously (factory-service convention). `[FACT: memory factory-service-no-this-for-intra-calls]`

## Completion checklist
- [x] §1 invariants with [FACT] (S1–S2 + S3 realized; S4–S8 INTENDED flagged, no internals assumed)
- [x] §3 inventory (explicit/implicit/INVENTED) · [x] §4 validation/edge · [x] §5 states · [x] §6 fail-loud
- [x] inherits docs/core; no child rule contradicts a parent
