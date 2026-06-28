<!-- Business Rules — features/finance · /documentation Phase 2 · sources: ADR-002 §5.8 · finance.ts · CLAUDE.md §1 · intake -->

# Business Rules — Finance  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Finance is the module
> where the **zero-knowledge** invariant is under the most pressure (external data) — every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **FN-1 — Encrypted content.** All **monetary values** (`amount`, balances, prices, limits, payments) and
  identifying text (`name`, `institution`, `category`, `subcategory`, `description`, `lender`, `employer`,
  `ticker_symbol`, `location`, `tags`) are `[E]` (ZK-1). Plaintext config: the `*_type` enums, `currency`,
  `date`/`*_date`, flags, `color`/`icon`. `[FACT: ADR-002 §5.8 [E] marks; finance.ts @encrypted]`
- **FN-2 — Money is integer cents; rates are basis points.** No floats for money. `amount`/balances are INTEGER
  cents (`Money`); `interest_rate`/`depreciation_rate` are basis points (`BasisPoints`, 2.5% = 250). `[FACT:
  CLAUDE.md Conventions; finance.ts L6]`
- **FN-3 — Account balance is derived from the ledger.** `current_balance` = `opening_balance` + Σ(transactions
  on the account, signed). The transaction ledger is the single source of truth; the balance is never
  hand-edited when derived (G4). `[INTENT G4]` ⚠ `opening_balance` is an INTENDED column (not in ADR-002 today).
- **FN-4 — A transfer is one row, excluded from income/expense.** `transaction_type='transfer'` +
  `transfer_to_account_id` debits the source and credits the destination; transfers are **never** counted in
  income or expense aggregates (no double-count). `[INTENT G5; FACT: transactions transfer_to_account_id]`
- **FN-5 — Recurring transactions: forecast by default, auto-generate by opt-in.** Default = a forecast
  template (predicts cash flow, creates no row). The user may opt into **materialize**: on the due date a real
  transaction row is generated locally, **editable/skippable before it is confirmed** (G6). `[INTENT G6; FACT:
  is_recurring + recurring_frequency]`
- **FN-6 — Derived aggregates are computed, persisted only by opt-in (user owns the risk).** Net worth,
  investment `current_value`/gain-loss, and monthly income/expense are **computed client-side** (v2 dropped
  v1's stored math). The user may opt to **store** them; if so, he owns the security of where they're stored
  (G3). `[INTENT G3; FACT: finance.ts omits cost_basis/gain_loss]`
- **FN-7 — Net worth definition.** Net worth = Σ account balances + Σ asset `current_value` − Σ liability
  `current_balance`, all converted to the **base/display currency** (FN-8). `[INTENT G3,G8; FACT: v1 FinanceOverview]`
- **FN-8 — Multi-currency, private FX.** Holdings keep their own `currency`; totals convert to a user-set base
  currency using **device-side/manual FX rates** — rates are **never fetched by the server** (ZK-1). `[INTENT G7,G8]`
- **FN-9 — External ingestion is zero-knowledge-constrained (⚠ INTENDED, blocked on ADR).** CSV/OFX import and
  any bank/broker connection **parse/fetch on the device only**; the server never sees plaintext financial data.
  The aggregator path (e.g. Open Finance Brasil/Belvo) is a **documented dent** (a third party sees plaintext),
  not pure ZK, and requires an explicit decision. `[INTENT G2; FACT: ADR-001/002 ZK]` → **candidate ADR.**
- **FN-10 — Categories from a managed list; tags via the shared system.** `category` resolves to a managed
  category list (stable analytics grouping) + free-text `subcategory`; tagging uses the platform-wide shared
  tag vocabulary, not the inline `[E]` JSON. `[INTENT G10]`
- **FN-11 — Referential integrity.** Deleting an account **cascades** its transactions; a transfer's
  `transfer_to_account_id` and an investment's `account_id` are **SET NULL** on account deletion (the
  transaction/investment survives, unlinked). Soft delete (`deleted_at`) hides without destroying. `[FACT:
  ADR-002 L2035-2036, L2133]`
- **FN-12 — Local-first.** Every create/edit/import/transfer succeeds locally first; multi-device reconciles
  **LWW** on structured columns. `[FACT: LF-2; ADR-003]`
- **FN-13 — Budgeting & liability-payment tracking are INTENDED, undesigned.** Both are in scope but have **no
  data model yet** — documented as intent + open questions, not as behavior. No rule may assume their internals.
  `[INTENT G12]`

## Validation & edge cases
- Enum CHECKs (all `[FACT: ADR-002 §5.8]`): `account_type`(7), `transaction_type`{income,expense,transfer},
  `recurring_frequency`(6), `asset_type`(6), `liability_type`(7), `investment_type`(8), `income_type`(8),
  `work_type`(5).
- A `transfer` row **must** set `transfer_to_account_id`; a non-transfer must leave it null (FN-4). `[INTERP FN-4]`
- Editing/deleting a transaction **re-derives** the affected account balance (FN-3) — never a manual correction.
  `[INTENT G4]`
- Converting across currencies with no FX rate set → totals surface a "rate needed" state, not a silent 1:1
  (FN-8). `[INTERP FN-8]`
- An imported row that matches an existing manual transaction is offered for **merge**, not silently duplicated
  (FN-9 conciliation). `[INTENT G2]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Dashboard (net worth/overview) | skeleton | "no accounts yet" + CTA | derive/read error, retry | computed totals + charts |
| Transactions (timeframe page) | skeleton | "no transactions in 01–30/06" | typed read error, retry | paginated ledger for the range |
| Create/edit transaction | — | — | validation (bad enum / transfer w/o target) inline | persisted; balance re-derived |
| Transfer | — | — | missing destination / same-account → typed error | one row; both balances updated; excluded from totals |
| CSV/OFX import (⚠ INTENDED) | parsing locally | "no rows parsed" | parse/format error, per-row flags | staged → matched → user-confirmed → committed |
| Investment value/gain-loss | computing | "no price set" → prompt | compute error → show partial + flag | qty×price value + gain/loss |
| Multi-currency total | computing | — | "FX rate needed" prompt | converted base-currency total |
| Analytics charts | computing | "not enough data" | data error → degrade that chart only | rendered chart set |
| Liability-payment view (⚠ INTENDED) | loading schedule | "no schedule set" | error, retry | upcoming + made payments |

## Failure behavior (fail loud — constitution §5)
- A failed save/import/transfer reverts the optimistic state and surfaces a typed error — never silent money loss.
  `[INTENT G2; FACT §5]`
- A derive/compute error (balance, net worth, gain-loss) shows a **flagged partial**, never a wrong number
  presented as correct. `[INTENT G3,G4]`
- Any external fetch that would require the server to see plaintext is **refused**, not silently downgraded
  (FN-9, ZK). `[INTENT G2; FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**INTENDED**, not in ADR-002 §5.8 / `finance.ts` today (this is the platform's largest INTENDED surface):
- **FN-3** `accounts.opening_balance` (ledger-derived balance).
- **G9 restored fields:** liabilities `payment_frequency` + `next_payment_date` + `interest_type` + `payoff_date`;
  income `next_payment_date`.
- **FN-9 external ingestion:** CSV/OFX import staging + bank/broker connection → **candidate ADR** ("external
  financial data under zero-knowledge") + new tables.
- **FN-13 budgeting:** new model(s), needs own design pass (may become its own feature).
- **Liability-payment tracking:** linking transactions→liability or a `liability_payments` ledger (TBD).
- **G8 multi-currency:** base-currency + FX-rate storage (likely Preferences).
- **G10:** managed-category store + migration of inline `transactions.tags` → shared tags.
- **FN-6:** opt-in persisted-aggregates setting (Preferences).
Until amended, the live invariants are FN-1, FN-2, FN-4 (col exists), FN-11, FN-12; everything balance-derived,
multi-currency, ingestion, budgeting, and restored-field is INTENDED. All schema additions converge into an
**ADR-002 amendment** + dedicated ADRs in the build phase. `[FACT: ADR-002 §5.8; INTENT G1–G12]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
