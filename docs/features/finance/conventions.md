<!-- Conventions — features/finance · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · v1 finances · intake -->

# Conventions — Finance (level: Feature)

## How to build here

- **Money is integer cents; rates are basis points — never floats.** Use `Money` (cents) and `BasisPoints`;
  format for display only at the edge (FN-2). `[FACT: CLAUDE.md Conventions; finance.ts L6]`
- **Balance is derived, never stored truth.** Compute `current_balance` = `opening_balance` + Σ ledger; recompute
  on every transaction create/edit/delete. Never hand-set a balance (FN-3). `[INTENT G4]`
- **Transfers are one row, excluded from income/expense.** Set `type='transfer'` + `transfer_to_account_id`;
  apply to both balances; **filter transfers out** of income/expense aggregates (FN-4). `[INTENT G5]`
- **Derived aggregates compute client-side; persist only on opt-in.** Net worth, investment value/gain-loss,
  monthly totals are computed (FN-6/FN-7). Storing them is a user choice and the user owns that storage's
  security. `[INTENT G3]`
- **Zero-knowledge is non-negotiable for external data (ADR-014).** Parse statements and fetch prices/FX **on
  the device** (**X1**: fetch→parse→encrypt→write vault; a server-plaintext fetch is **refused, not downgraded**);
  reconcile merge-imports through **`import_staging`** (commit-on-confirm, **X8**); gate external access on
  **`external_in_ok`/`external_out_ok`** (**X5** — no new grant table). Only the third-party **aggregator**
  plaintext path is a documented ZK dent needing its own ADR (FN-9). `[INTENT G2; FACT: ADR-014 X1/X5/X8; ZK-1]`
- **One base/display currency; FX is user-set.** Convert to the base currency for totals; surface a "rate needed"
  state rather than assuming 1:1 (FN-8). `[INTENT G8]`
- **Recurring defaults to forecast.** A recurring transaction predicts cash flow; only on opt-in does it
  materialize a real, editable row on its due date (FN-5). `[INTENT G6]`
- **Categories from a managed list; tags via the shared system.** Don't free-type categories that fragment
  analytics; use the managed list + free-text subcategory, and the shared tag vocabulary (FN-10). `[INTENT G10]`
- **Notes via `pages`.** Finance entity notes are linked `pages` rows (`entity_type` ∈ transaction/account/asset/
  investment/liability), never inline columns. `[FACT: ADR-002 §5.2; INTENT G12]`

## Naming & layout

- Enum values are canonical (string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core`, never TS
  `enum`): `account_type`(checking…other), `transaction_type`(income/expense/transfer), `asset_type`,
  `liability_type`, `investment_type`, `income_type`, `work_type`. `[FACT: finance.ts L13-61; ADR-002 §5.8]`
- ⚠ INTENDED enum: liability `interest_type` ∈ {fixed, variable} (restored from v1, G9). `[INTENT G9]`
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates `YYYY-MM-DD`, money
  in cents (INTEGER), soft delete, `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`

## Local landmines / "never do"

- **Never** store money as a float or in major units — cents only (FN-2). `[FACT: Conventions]`
- **Never** hand-edit an account balance — it derives from the ledger (FN-3). `[INTENT G4]`
- **Never** let a transfer count as income or expense (FN-4). `[INTENT G5]`
- **Never** fetch prices/FX/bank data in a way the **server** can read — device-side only; gate any aggregator on
  the ingestion ADR (FN-9, ZK-1). `[INTENT G2]`
- **Never** present a computed number that failed to compute as if correct — flag the partial (FN-3/FN-6). `[INTENT G3]`
- **Never** invent budgeting or liability-payment internals — they are INTENDED + undesigned (FN-13); document
  intent, don't build to a guess. `[INTENT G12]`
- **Never** reintroduce inline per-transaction tags — use the shared **`entity_tags`** primitive
  (`entity_type='transaction'`, SP1), not `page_tags` (FN-10). `[INTENT G10; ADR-006 SP1]`
- **Never** copy a balance into a `store` node — `store` **references** the owning entity (`ref_type`/`ref_id`);
  the value lives in `accounts`/`investments`/`assets`; net worth sums the referenced values (FN-15, E6
  anti-token). `[INTENT; ADR-012 E6]`
- **Never** destroy or subtract-to-zero currency for a penalty — **LOCK** it (`store.is_locked` +
  `consequence_ledger kind='lock'`, recoverable; E5). And **never** collapse `move_money` into `grant_currency` —
  they are two distinct E4 members; Gamification owns currencies/ledger/coordinator, Finance owns only
  `move_money`/`store` (FN-16). `[INTENT; ADR-012 E4/E5]`

## Completion checklist

- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
