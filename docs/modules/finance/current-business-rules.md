# Current Business Rules — finance   (level: Module · tier: STANDARD)
> Coverage: schema (`020_finance`, full) + colocated `@vida/types` + validators + service tier S1–S7 of 8; fiscal-legal S8 (guarded) NOT built. 
> Inherits: docs/core/business-rules.md (ZK-1/2/3, LF-1/2/3). Finance holds money data → ZK-1 governs `[E]` fields; the M1.0 `[E]` set is EMPTY (pass-through, M3 target). A child rule contradicting a parent is a CONFLICT — flagged, never overridden.
> Last refreshed: 2026-09-22-mod-finance-S7  ·  Source of truth = the code (Currency Rule §XXIX).

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

### Realized (S6 — cross-module providers + delegates)
- **BR-S6-1 (FIN-31).** A transaction create is the achievement-FEED point (Gamification owns achievements). M1
  emits **nothing concrete** — achievements PULL finance's `net_worth` via the ADR-011 §3.6 seam (`getNetWorth`);
  the emit + `effects` dep are wired at #48. `grant_currency` would be the wrong effect (a currency award, and would
  misfire per-transaction once economy's handler registers). `[FACT: service.ts createTransactionImpl comment; ADR-012 §3.7]`
- **BR-S6-2 (FIN-32/37).** Finance registers ONE `JournalContribution` (`createFinanceJournalContribution`):
  `summary(date)` = today's transactions + net-worth snapshot; `dueIn(range)` = upcoming G9 installments
  (liabilities/income `next_payment_date`, NOT the deferred Commitments derive). Empty → `state:'empty'`, never a
  throw (the dashboard owns degrade). `[FACT: services/finance/journal.ts]`
- **BR-S6-3 (FIN-33 / ADR-011 §3.6 / C6).** `getNetWorth → {value, partial}` is the Purpose measurement-source
  read seam (value + flag, never stale-as-fresh); `getBalance` is the other measure. Finance is a FEEDER — **NO
  `measurement_kind`/`binding_mode` on finance entities**. `[FACT: service.ts getNetWorth]`
- **BR-S6-4 (FIN-34 / G12).** Notes on a finance entity are `pages` rows owned by Notes & Pages — finance owns NO
  note columns and only DECLARES `FINANCE_ENTITY_TYPES` for the shared registry; the consumer uses the Notes
  contract directly. `[FACT: types.ts FINANCE_ENTITY_TYPES; finance schema has no note columns]`
- **BR-S6-5 (FIN-35 / SP1).** `getEntityTags` reads a finance entity's tags via the injected `AssociationResolver`
  (Spaces-owned `entity_tags`). Deny-safe → `[]` only when no resolver; a wired resolver fails loud on an
  unregistered type (its contract, not swallowed). `Transaction.tags` stays `[]` (DB-11); this is the real read. `[FACT: service.ts getEntityTags]`

### Realized (S7 — fiscal-legal SITUATE; the always-available, no-external-dep spine)
- **BR-S7-1 (FL-4/FL-1).** `createFiscalLegalService` is a Finance **sub-context** — residency + legal-entity CRUD +
  money-touch, all on-device over `[E]` data, **needs no external integration**. Returns Row types (no `@vida/types`
  fiscal interface, DB-11). `[FACT: services/finance/fiscal-legal.ts]`
- **BR-S7-2 (FL-9).** `linkMoneyTouch(entityType, id, jurisdiction)` sets `jurisdiction_code` on a Finance entity
  (account/transaction/asset/investment/income_stream — **liability excluded**) via the finance update path;
  Finance **untouched in structure**. `jurisdiction_code` now exposed on the 5 `@vida/types` money-touch interfaces
  (FL-02, deferred S1→S7). `[FACT: fiscal-legal.ts linkMoneyTouch; types finance.ts]`
- **BR-S7-3 (FL-8).** `registerLegalEntity` links a Project via `project_id` (no-FK forward-dep); fiscal-legal owns
  only its own situation. `[FACT: fiscal-legal.ts]`
- **BR-S7-4 (FL-11/X5/X9).** `assertExternalGrant` gates external reach on the ADR-010 fields via the enforcer,
  **fail-closed** (no enforcer/grant → `ExternalGrantMissing`); SITUATE works without it. No new grant table. `[FACT: fiscal-legal.ts assertExternalGrant]`
- **BR-S7-5 (FL-10).** The 7-error typed contract (`RulePackUnverified`, `ExternalGrantMissing`, `InsufficientRuleData`,
  `AdviceIsInformational`, `NoAutoAction`, `FilingHandsOff`, `ModelUnavailable`) — each a named error; S8 throws the
  INFORM/DERIVE/ADVISE ones. `[FACT: fiscal-legal.ts]`

### Realized (S8 — fiscal-legal INFORM / DERIVE / ADVISE, guarded)
- **BR-S8-1 (FL-04/X5).** `rulePack(jurisdiction)` grant-gates `external_in` (fail-closed) then reads the ADR-014
  public-reference layer via the BUILT `createPublicReferenceEngine`; M1 deny-safe fetch → `RulePackUnverified`, no
  grant → `ExternalGrantMissing`. `RulePack = {jurisdiction_code, version, verified}` (version required by
  `source_rulepack_version` notNull; **content owed → M2**, format unspecified). `[FACT: services/finance/fiscal-legal.ts rulePack; parts/finance.md:123]`
- **BR-S8-2 (FL-05/FL-5).** `deriveObligations(range, pack)` is the proposer + unverified-law gate: refuses an
  unverified pack (`RulePackUnverified`), **never persists / fans out**. The per-jurisdiction rule-evaluation is an
  **owed M2 seam** (no pack content format yet) → a verified handle yields `[]` at M1. `[FACT: fiscal-legal.ts deriveObligations]`
- **BR-S8-3 (FL-3/FL-6/FL-11 · NoAutoAction structural).** `confirmObligation(candidate)` is the ONLY persist path
  (hand-authored FL-11 or derived): writes one `fiscal_obligations` row (`status:'pending'`, `linked_task_id:null` at
  M1) then a deny-safe fan-out that **surfaces `{deferred:['tasks','notifications','calendar']}`** (never swallowed,
  never rolls back the valid local row — FIN-31 reserved-emit, not S4-atomic). NoAutoAction/AdviceIsInformational/
  FilingHandsOff are enforced **structurally** (method split · baked disclaimer · no `file()` affordance), NOT thrown. `[FACT: fiscal-legal.ts confirmObligation; fiscal-ports.ts]`
- **BR-S8-4 (FL-06/FL-13 · ADR-015).** `model(scenario, pack)` runs the what-if via the BUILT `AiService.askModel`
  (deny-safe M1 → `ModelUnavailable`); requires a verified pack (else `InsufficientRuleData`); output carries
  `source:'ai'` (`stampAiProvenance`) + **BOTH** disclosures — the FL-3 `NOT_PROFESSIONAL_ADVICE` legal label AND
  `buildAiDisclosure(mode)` (the egress bound), all non-optional readonly. Boundary-validated (`WhatIfScenarioBaseSchema`). `[FACT: fiscal-legal.ts model; fiscal-ports.ts NOT_PROFESSIONAL_ADVICE]`
- **BR-S8-5 (FL-2/FL-07).** `prepareFilingSummary(jurisdiction)` assembles + **RETURNS** the organized summary
  (residencies/legal-entities/money-touch/obligations, soft-delete-filtered) — the deliverable; the OS **never files**.
  Format-render is a SEPARATE optional `exportFiling` (deny-safe M1 → `FilingExportNotActive`; the summary is unaffected). `[FACT: fiscal-legal.ts prepareFilingSummary; contract.md:22]`
- **BR-S8-6 (FL-08/FL-10 · ADR-011).** `feedLongRunImpact(impact)` feeds a modeled outcome into Purpose via a deny-safe
  `ContributionsPort` whose input **mirrors the `contributions` schema** (never a bespoke path); M1 fail-loud
  (`ContributionsSinkNotActive`). `[FACT: fiscal-legal.ts feedLongRunImpact; schema/foundation/purpose.ts:33-49]`
- **BR-S8-7 (FL-12/ZK-1).** Derivation + summary assembly run on-device; a `cloud` what-if is the only sharing path,
  its egress triple **caller-supplied** (the tier has no vault access to over-send from). `[FACT: fiscal-legal.ts model cloud branch; ai/types.ts:76-89]`
- **Deferred (M2, all homed):** rule-pack content/mirror/verifier (owed) · AI mediator/on-device runtime (LIF-145) ·
  Tasks/Notifications/Calendar fan-out write-paths · export format-render · Purpose `contributions` writer · `[E]`
  encryption of obligation/scenario text (M1 `encryptedFields:[]` pass-through). Each behind a zero-signature-change port.

### Pending / INTENDED (later — not yet realized)
- **FN-13/14 (FIN-36/38/39)** Commitments/budgeting/liability-payment (undesigned) · **FN-15 (FIN-18/23/24)**
  store-tree net worth + lock-box · **FIN-31 concrete emit** (#48) · **materialize write path · durable stores**
  (FX/base-currency, managed-category, persisted-aggregates, import_staging) — all M2 via the S5/S6 deny-safe ports/seams.

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
