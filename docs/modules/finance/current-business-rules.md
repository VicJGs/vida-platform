# Current Business Rules — finance   (level: Module · tier: STANDARD)
> Coverage: schema (`020_finance`, full) + colocated `@vida/types` + validators + service tier S1–S5 of 8. Fiscal-legal (S7–S8) NOT yet built.
> Inherits: docs/core/business-rules.md (ZK-1/2/3, LF-1/2/3). Finance holds money data → ZK-1 governs `[E]` fields; the M1.0 `[E]` set is EMPTY (pass-through, M3 target). A child rule contradicting a parent is a CONFLICT — flagged, never overridden.
> Last refreshed: 2026-09-22-mod-finance-S5  ·  Source of truth = the code (Currency Rule §XXIX).

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

### Realized (S4 — move_money effect handler)
- **BR-S4-1 (FN-16 / ADR-012 E4).** Finance EXECUTES `move_money` as a **ledger movement** — a `transactions`
  transfer row co-written through the rail's tx via `createInTx` (a documented effect handler, never a direct
  cross-module write). `[FACT: services/finance/effects.ts move_money]`
- **BR-S4-2 (R1).** Idempotency is the RAIL's (`applied_effects` check-and-insert); the handler does not
  re-implement it. A replay of the same `(subjectNaturalKey, transition, targetRef)` → `applied:false`, no double
  transfer. The `transactions` row carries no `effect_event_id` column in M1 (deferred output-row enhancement). `[FACT: foundation/effects/service.ts; effects.ts]`
- **BR-S4-3 (FN-4).** `fromAccountId === toAccountId` → `InvalidTransferError` (fail-loud, nothing written). `[FACT: effects.ts]`
- **BR-S4-4 (E5).** A penalty LOCKS a reward-target box, never destroys money. The store layer is deferred → the
  lock routes to a deny-safe `StoreLockPort` that **fails loud** (`StoreLayerNotActive`, tx-threaded for the
  future atomic swap), rolling the whole effect back. `[FACT: effects.ts denySafeStoreLockPort]`
- **BR-S4-5 (C2).** `move_money ≠ grant_currency` — the `consequence_ledger` `kind='lock'` row on a penalty is
  Gamification's `lock_currency` handler (separate rail effect), not this handler's. `[FACT: economy/handlers.ts]`
  - **Consent (PC-3):** move_money touches the Finance sensitive class → the fire-time consent gate is required for
    an UNTRUSTED caller. Deferred with the gate's callers (#46/#85): M1 is auth-off (ADR-017), no grant envelope,
    only trusted in-process callers. `[FACT: ADR-010 PC-3; ADR-017; effects/CLAUDE.md]`

### Realized (S5 — external / ingestion / config seams; deny-safe over deferred stores)
- **BR-S5-1 (FN-5).** Recurring = **forecast-by-default** (`forecastRecurring` projects occurrences, creates NO
  row; computed by index from the anchor → month-end clamped, no day-drift). Materialize is opt-in via a deferred
  `RecurringModePort` (default forecast-only → `materializeDue` returns `[]`, never auto-writes). `[FACT: service.ts forecastRecurring/materializeDue]`
- **BR-S5-2 (FN-8/ZK-1).** `convertToBase`: same-currency identity; else a device-side `FxRatePort` rate;
  **missing rate → `FxRateMissingError`, never a silent 1:1**. Rates are never server-fetched. `[FACT: service.ts convertToBase]`
- **BR-S5-3 (FN-6).** Persisted-aggregates opt-in; `aggregatesPersisted()` default **false** → S3 stays compute-only. `[FACT: service.ts; config-seams.ts]`
- **BR-S5-4 (FN-9/X1/X8).** CSV/OFX import over the built ingestion reconcile primitives: `importStatement`
  (stage parsed rows → `autoMatch` vs existing) → `confirmImport` (commit confirmed as real txns). An
  `auto_matched` row **merges (never a silent duplicate)**; instance staging port round-trips by `batchId`;
  durable `import_staging` = M2. `[FACT: service.ts importStatement/confirmImport]`
- **BR-S5-5 (FN-9/X5/ADR-010).** External access gates via the **injected** ingestion guard (fail-closed on the
  ADR-010 grant fields, no new table); no guard wired (M1) → `ZeroKnowledgeViolationError`. Finance constructs no
  egress/ingestion guard — it inherits the compositional-exfiltration rule by delegating. `[FACT: service.ts assertExternalAccess]`
- **BR-S5-6 (FN-10).** `resolveCategory`: managed hit → `managed:true`; miss → free-text passthrough
  (`managed:false`), never a silent reject. No `category_bidx` (keyed blind index needs the dormant vault key → M3). `[FACT: service.ts resolveCategory]`
- **BR-S5-7 (FN-40).** Typed errors added: `FxRateMissingError`, `ZeroKnowledgeViolationError` — a refused/missing
  path fails loud, never a silent default. `[FACT: types.ts]`

### Pending / INTENDED (S6–S8 — not yet realized)
- **FN-13/14 (FIN-36/38/39)** Commitments/budgeting/liability-payment (undesigned) · **FN-15 (FIN-18/23/24)**
  store-tree net worth + lock-box · cross-module providers (FIN-31/32/33/34/35/37, S6) · **FL-01…10** fiscal-legal
  (S7–S8). Each homed in `slice-map.md`; **no rule may assume their internals.**
- **Materialize write path · durable stores** (FX/base-currency, managed-category, persisted-aggregates,
  import_staging) — all M2 via the S5 deny-safe ports (zero-signature-change swap).

## 3. Rule inventory — explicit · implicit · invented
- **EXPLICIT (schema/service-realized):** FN-2/3/4/10/11 (S1–S2), BR-S3-1…6 (S3) — all cited to `service.ts`/`schema/finance.ts`.
- **IMPLICIT (enforced in service):** enum validation at the boundary (invalid enum rejects); soft-delete hides
  from `getBalance`/lists (explicit `isNull(deleted_at)` on `findWhere` — the repository-findwhere seam); newest-first stable sort on ledger reads.
- **INVENTED / DRIFT-RISK:** none. The DTOs (`FinanceOverview`/`InvestmentValue`/chart shapes) are service-local
  by design (`@vida/types` untouched — DB-11 does not own derivation DTOs).
- **DB-11 reconcile (noted, not a bug):** `accounts.current_balance` (notNull, default 0, caller-settable at
  create) is a **legacy column** — `getBalance` derives the authoritative balance from `opening_balance + Σ ledger`
  and NEVER writes `current_balance`; `move_money` (S4) likewise only appends a transfer row. So `current_balance`
  can go stale; **no reader should trust it — use `getBalance`.** A future DB-11 pass drops or derives-caches it. `[FACT: service.ts getBalance; effects.ts move_money]`

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
