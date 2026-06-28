<!-- Structure & Data — features/finance · /documentation Phase 2 · sources: ADR-002 §5.8 · finance.ts · ADR-001/003 · intake -->

# Structure & Data — Finance  (level: Feature)

## Data model — 6 owned tables (current, authoritative) `[FACT: ADR-002 §5.8 L1997-2189; finance.ts]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `accounts` | money stores | name, institution, current_balance, credit_limit, interest_rate | `account_type` CHECK(7); currency default USD; idx active |
| `transactions` | the ledger | amount, category, subcategory, description, tags | `account_id` **CASCADE**; `transfer_to_account_id` **SET NULL**; `transaction_type` CHECK(3); `recurring_frequency` CHECK(6); idx account/date/category |
| `assets` | owned value | name, purchase_price, current_value, depreciation_rate, location | `asset_type` CHECK(6) |
| `liabilities` | debts | name, original_amount, current_balance, interest_rate, monthly_payment, lender | `liability_type` CHECK(7) |
| `investments` | holdings | name, ticker_symbol, quantity, purchase_price, current_price | `account_id` **SET NULL**; `investment_type` CHECK(8) |
| `income_streams` | income | name, amount, employer | `income_type` CHECK(8); `work_type` CHECK(5); `frequency` default monthly |

- All monetary columns are INTEGER **cents**; rates are **basis points**; `quantity` is REAL. `[FACT: ADR-002 §5.8]`
- Every table carries soft-delete + `_sync_*`; structured columns sync **LWW** (no CRDT — not editor docs). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / finance.ts today) — ADR-002 amendment + dedicated ADRs `[INTENT G2,G4,G8,G9,G10,G12]`
- `accounts.opening_balance` (FN-3 ledger-derived balance).
- **G9 restored:** `liabilities.payment_frequency` + `next_payment_date` + `interest_type`{fixed,variable} +
  `payoff_date`; `income_streams.next_payment_date`.
- **Import/ingestion (G2, FN-9):** a **staging** table for parsed CSV/OFX rows + match metadata; bank/broker
  connection config → **candidate ADR "external financial data under zero-knowledge."**
- **Budgeting (G12, FN-13):** new table(s) — period, per-category limit, rollover, alerts — **needs design pass**;
  may graduate to its own feature context.
- **Liability payments (G12):** transactions→liability link **or** a `liability_payments` ledger (TBD).
- **Multi-currency (G8):** base/display currency + FX-rate store (likely Preferences).
- **Categories/tags (G10):** managed-category store; migrate inline `transactions.tags` → shared `tags`/`page_tags`.
- **Persisted aggregates opt-in (G3, FN-6):** a Preferences setting (user owns storage security).

## State management map `[FACT: ADR-001 State; v1 financesApi/hooks]`
- **React Query** owns all finance reads/writes — entity lists, paginated/filtered transactions, optimistic
  create/edit, and the **derived** `getOverview`/`getBalance` (invalidated on any transaction mutation, per v1's
  `overview`/`accounts`/`transactions` invalidation graph). `[FACT: v1 API.md L555-563]`
- **Zustand** owns ephemeral UI: active dashboard (Financial ⇄ Accounts), selected timeframe, import-review
  draft, chart personalization, form state.
- Balances and aggregates are **derived** (FN-3/FN-6) — never a hand-maintained counter.

## Page / route map `[INTENT G1; FACT: CLAUDE.md §1; v1 9 pages]`
- **Top dashboard (switchable):** Financial Dashboard ⇄ Accounts Dashboard (net worth, balances, assets,
  liabilities).
- **Account standalone page** + nested account-scoped views: Transactions · Assets · Liabilities · Investments.
- **All-Transactions dashboard** + **timeframe page** (default current month, e.g. 01–30/06).
- **All-Assets** / **All-Investments** pages (value ↑/↓ emphasis) · **All-Liabilities** page (⚠ view TBD) +
  **liability-payment view**.
- ⚠ INTENDED screens: import/reconcile wizard, budgeting, bank/broker connection.

## Dependencies / graph
- **Wave 1 (independent domain).** Out-edges: Notes (notes pages), Preferences (currency/recurring/storage
  settings), shared tags. In-edges: Journal `/summary`, Purpose (financial targets), Gamification (events).
  `[FACT: docs/core/architecture/module-dependency-graph.md; intake]`
- No direct cross-module table reads — links via integration points (§6). External bank data (post-ADR) enters
  device-side, not as a module edge. `[FACT: core §6; INTENT G2]`

## Single source of truth (constitution §3)
- **Balance:** derived from `opening_balance` + the transaction ledger (FN-3) — never a second stored number.
- **Net worth / gain-loss / monthly totals:** derived (FN-6/FN-7) — persisted only by user opt-in.
- **FX:** one base/display currency; rates user-set, device-side (FN-8).
- Enums (`AccountType`, `TransactionType`, `AssetType`, `LiabilityType`, `InvestmentType`, `IncomeType`,
  `WorkType`) — string-literal unions + SQL CHECK + Zod, declared once. `[FACT: finance.ts L13-61]`
- Tags resolve to the **shared** vocabulary (FN-10), not the inline list. `[INTENT G10]`

## ADRs / structural decisions
- **ADR-002 §5.8** — the 6 tables (authoritative). **ADR-001** — RQ + Zustand. **ADR-003** — LWW.
- ⚠ **Surfaced decisions:** (1) **"External financial data under zero-knowledge"** (import + bank/broker) — its
  own ADR; (2) **Budgeting** model — design pass + ADR; (3) the schema additions above → **ADR-002 amendment**.
  `[INTENT G2,G8,G9,G10,G12]`

## Completion checklist
- [x] data model (6 tables) · [x] dep graph (independent domain, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
