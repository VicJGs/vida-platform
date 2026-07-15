<!-- Contract — features/finance · /documentation Phase 2 · sources: ADR-002 §5.8 · finance.ts · v1 API.md · intake -->

# Contract — Finance  (level: Feature)

> **Status:** types exist (`@vida/types/finance.ts`, 6 entities); `@vida/core` `models/finance.ts` +
> `services/finance-service.ts` exist but are **empty placeholders (0 lines)**; there is **no schema** for
> import, budgeting, liability-payments, or multi-currency. Signatures below
> are the **designed interface**; ⚠ INTENDED items depend on the ADR-002 amendment + dedicated ADRs. `[FACT:
> finance.ts present; no core service; ADR-002 §5.8]`

## Exposed surface (via `@vida/core`)
- **Account CRUD & balance** (`Account` `[FACT: finance.ts L67-84]`):
  - `createAccount({opening_balance, ...})` · `updateAccount` · `softDeleteAccount` (cascades transactions, FN-11)
  - `getBalance(accountId)` → derived `opening_balance + Σ ledger` (FN-3) · `listAccounts()`
- **Transactions** (`Transaction` `[FACT: finance.ts L86-106]`):
  - `createTransaction` · `updateTransaction` · `softDeleteTransaction` → each **re-derives** the account balance
  - `listTransactions(filter)` · `getTransactionsInRange(start,end)` (default = current month) · paginated reads
    (v1 `usePaginatedTransactions` precedent)
  - `createTransfer(from, to, amount)` → one `type='transfer'` row, both balances updated, excluded from totals (FN-4)
- **Assets / Liabilities / Investments / Income** (`Asset`/`Liability`/`Investment`/`IncomeStream`): standard
  CRUD + sorted lists (by value/balance/amount, per v1). `[FACT: finance.ts L108-172; v1 API.md]`
- **Derived analytics** (computed, FN-6/FN-7):
  - `getOverview()` → `{totalBalance, totalAssets, totalLiabilities, netWorth, monthlyIncome, monthlyExpenses}`
    (v1 `FinanceOverview`) · `getInvestmentValue(id)` → qty×current_price + gain/loss · chart datasets (G11)
- **⚠ INTENDED:**
  - `importStatement(file)` (CSV/OFX) → client-side parse → stage → `matchTransactions()` → user-confirm →
    commit (FN-9, G2) — **blocked on ZK-ingestion ADR**
  - bank/broker connection (device-side or private aggregator) — **blocked on ZK-ingestion ADR**
  - `getFxRate`/`setFxRate` + base-currency conversion (FN-8, G8) — device-side/manual
  - budgeting API (G12) — **needs design pass**; liability-payment schedule/tracking (G12)
  - **Commitments management sub-context (FN-14, 2026-07-15)** — a **derived** surface, no new entity:
    `listCommitments()` → committed/recurring/long-term flows gathered from recurring transactions + liability
    schedules + income_streams + periodic investments + installment assets, each with `direction`
    (payable/receivable) and, where applicable, **derived progress-to-total** (Σ installments / total). Registers a
    **`dueIn()`** provider (upcoming installments → Global Calendar + Journal agenda) and due reminders via
    **Notifications**. Reuses FN-5 recurring mode (forecast/auto-gen). **Needs the Commitments/liability-payment
    design-pass.** `[INTENT: Victor 2026-07-15]`

## What it consumes (outside dependencies)
- **Notes & Pages** — notes on transaction/account/asset/investment/liability via `pages` (`entity_type`), read
  through the Notes contract, never its tables. `[FACT: ADR-002 §5.2; INTENT G12]`
- **Shared tag system** — transaction tagging via `tags`/`page_tags` (FN-10). `[INTENT G10]`
- **Preferences** — base/display currency, recurring-mode (forecast vs auto-gen), persisted-aggregates opt-in,
  import/connection personalization. `[INTENT G3,G6,G8; FACT: Preferences contract]`

## Fed by (parent-module links — read via integration points, §6)
- **Independent domain (Wave 1)** — no upstream owner; Finance entities are created/owned standalone. (External
  bank/broker data, when an ADR allows it, enters as device-side imports — not a module dependency.) `[FACT:
  docs/core/architecture/module-dependency-graph.md]`

## Consumed by
- **Notes journal `/summary`** → today's transactions + net-worth snapshot. `[FACT: Notes /summary]`
- **Purpose & Goals** → financial targets (e.g. savings) read net worth / balances; ⚠ INTENDED metric
  contribution. `[INTENT; FACT: CLAUDE.md Purpose]`
- **Gamification** → transaction-create / milestone events feed achievements (v1 fired an achievement check on
  create). `[FACT: v1 API.md L173]`

## Contract error cases
- `createTransfer` with no destination or source==destination → typed `InvalidTransferError` (FN-4). `[INTENT G5]`
- `getOverview`/conversion with a missing FX rate → typed `FxRateMissingError` (prompt, no silent 1:1, FN-8). `[INTENT G8]`
- `importStatement` requiring server-side plaintext → refused with typed `ZeroKnowledgeViolationError` (FN-9). `[INTENT G2]`
- Mutating a transaction → balance re-derive failure surfaces a flagged partial, not a wrong balance (FN-3). `[INTENT G4]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
