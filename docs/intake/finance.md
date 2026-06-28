# Intake: Finance
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/finance (Wave 1 — independent domain; feeds Journal /summary + Purpose metrics + Gamification)
Sources: v2 (ADR-002 §5.8 + @vida/types/finance.ts + CLAUDE.md §1) · v1 (life-os src/features/finances + types/finances.ts + API.md) · user intent
Session: 2026-06-27 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 6 tables** `[FACT: ADR-002 §5.8 L1997-2189; finance.ts]`:
- `accounts`: `name`[E], `account_type`{checking,savings,credit_card,investment,cash,digital_wallet,other}, `institution`[E], `currency` (default USD), `current_balance`[E] cents, `credit_limit`[E], `interest_rate`[E] basis-points, `is_active`, `color`, `icon`, soft-delete. `[FACT: L2000-2027]`
- `transactions`: `account_id` (CASCADE), `transfer_to_account_id` (SET NULL), `transaction_type`{income,expense,transfer}, `amount`[E] cents, `currency`, `category`[E], `subcategory`[E], `description`[E], `date` YYYY-MM-DD, `is_recurring`, `recurring_frequency`{daily,weekly,biweekly,monthly,quarterly,yearly}, `tags`[E] JSON. Indexed on account/date/category. `[FACT: L2033-2066]`
- `assets`: `name`[E], `asset_type`{real_estate,vehicle,electronics,jewelry,collectible,other}, `purchase_date`, `purchase_price`[E], `current_value`[E], `depreciation_rate`[E] bp/yr, `location`[E]. `[FACT: L2071-2094]`
- `liabilities`: `name`[E], `liability_type`{mortgage,student_loan,auto_loan,credit_card,personal_loan,medical,other}, `original_amount`[E], `current_balance`[E], `interest_rate`[E] bp, `monthly_payment`[E], `due_date`, `lender`[E]. `[FACT: L2100-2125]`
- `investments`: `account_id` (SET NULL), `name`[E], `investment_type`{stock,bond,mutual_fund,etf,crypto,real_estate,commodity,other}, `ticker_symbol`[E], `quantity`[E] REAL, `purchase_price`[E] cents/unit, `current_price`[E] cents/unit. `[FACT: L2131-2155]`
- `income_streams`: `name`[E], `income_type`{salary,freelance,investment,rental,business,side_hustle,passive,other}, `work_type`{full_time,part_time,contract,freelance,passive}, `amount`[E] cents, `frequency` (default monthly), `is_active`, `employer`[E] PII, `start_date`, `end_date`. `[FACT: L2161-2188]`

**Intent (CLAUDE.md §1)** `[FACT: CLAUDE.md §1]`: **transaction import from bank statements (CSV/OFX) for conciliation with manually-added transactions**; assets tracker (with depreciation); liabilities tracker (interest rates + **payment schedules**); investments tracker (purchase/current price); income streams (with frequency); accounts/money-storage entities; **analytics charts (Chart.js)** for financial visualization.

**Cross-cutting:** monetary values are INTEGER cents `[FACT: CLAUDE.md Conventions]`; `interest_rate`/`depreciation_rate` are basis points (`BasisPoints`) `[FACT: finance.ts L6]`; `transaction` is a valid `entity_links` note target `[FACT: ADR-002 L3811]`.

## B. WHAT v1 DID — life-os finances (legacy, for intent + lessons)
`[FACT: life-os src/types/finances.ts + features/finances/API.md]`
- **Full feature**: 9 pages (Dashboard, Finances, Accounts, AccountDetail, Transactions, Assets, Liabilities, Investments, IncomeStreams) + 6 entity forms + sidebar. `[FACT: features/finances/pages]`
- **`useFinanceOverview`** → derived `FinanceOverview` {totalBalance, totalAssets, totalLiabilities, **netWorth**, monthlyIncome, monthlyExpenses}. `[FACT: API.md L357-368]`
- **Paginated transactions** (`usePaginatedTransactions`, page/pageSize) + filters (account, type, dateRange). `[FACT: API.md L135-148]`
- **Offline-first** hooks (`useFinancesOffline`): read cache, queued create/update/delete; "**server wins for timestamp fields**" conflict rule. `[FACT: API.md L611-623]`
- **Create-transaction triggers an achievement check** (gamification hook). `[FACT: API.md L173]`
- v1 stored **denormalized** investment fields: `cost_basis`, `current_value`, `gain_loss_amount`, `gain_loss_percentage`, `dividends_received`. `[FACT: types/finances.ts L116-119]`
- v1 had **richer liability payment schedule**: `interest_type`{fixed,variable}, `payment_frequency`, `next_payment_date`, `origination_date`, `payoff_date`. `[FACT: types/finances.ts L91-97]`
- v1 income: `payment_day_of_month`, `next_payment_date`, `is_taxable`. `[FACT: API.md L515-520]`
- v1 account: `secondary_currency`/`secondary_balance` (multi-currency), `apy`, `is_primary`, `account_number_masked`. `[FACT: types/finances.ts L46-54]`
- v1 asset: `ownership_percentage`, `description`. `[FACT: types/finances.ts L73]`
- v1 transaction: had `title` (required) separate from `description`; `recurrence_rule` as JSON object. `[FACT: types/finances.ts L28,33]`

### Key v1→v2 deltas (what changed, why it matters)
1. v2 **encrypts all monetary values** (`amount`, balances, prices `[E]`) — v1 stored them plaintext. ZK upgrade. `[FACT: ADR-002 §5.8 [E] marks]`
2. v2 **money is INTEGER cents + basis points** for rates — v1 used floats. Precision upgrade. `[FACT: CLAUDE.md Conventions; finance.ts]`
3. v2 **drops v1's denormalized investment math** (`cost_basis`/`current_value`/`gain_loss_*`/`dividends`) → must be **derived** from `quantity`×price. `[FACT: finance.ts L142-156 omits them]`
4. v2 **drops v1's liability payment schedule** (keeps only `monthly_payment` + `due_date`) — yet CLAUDE.md §1 still says "payment schedules". Tension. `[FACT: liabilities.ts vs CLAUDE.md §1]`
5. v2 **drops** account multi-currency (`secondary_*`, `apy`, `is_primary`), income (`payment_day_of_month`, `is_taxable`), asset (`ownership_percentage`). `[FACT: finance.ts omits them]`
6. v2 transaction: adds `subcategory` + explicit `transfer_to_account_id` FK; drops `title`; `recurring_frequency` is an **enum** (v1 was a JSON rule). `[FACT: transactions L2036-2048]`
7. **CSV/OFX import + conciliation** (CLAUDE.md §1) has **no schema in either version** — entirely INTENDED, biggest unbuilt surface. `[FACT: no import tables in ADR-002]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: full v1 (assumed). View set: **Finance dashboard** (net worth + totals + analytics charts) · per-entity list pages (Accounts · Transactions · Assets · Liabilities · Investments · Income) · **Account detail page** · per-entity standalone pages? Confirm the set + which get standalone pages.
G2 — **CSV/OFX import + conciliation** (the headline, no schema yet): how should it work? Proposed flow — import file → parse client-side → **staging** of parsed rows → **auto-match** against existing manual transactions (by date+amount±tolerance) → user reviews/merges/confirms → committed. Needs: a staging table? dedup/match rules? Does parsing happen 100% client-side (ZK)? This is a **candidate ADR** + new tables.
G3 — **Derived aggregates**: confirm `netWorth` = Σ account balances + Σ asset current_value − Σ liability current_balance, and investment `current_value`/`gain_loss` are **computed client-side** (not stored, per delta #3). Monthly income/expense derived from transactions. Confirm all derived, none persisted.
G4 — **Account balance source of truth** (classic modeling call): is `accounts.current_balance` **manually maintained** (authoritative, as v1 stored it), or **derived** from the transaction ledger (Σ of transactions)? Or a hybrid (opening balance + ledger)? This decides the whole transaction↔balance contract.
G5 — **Transfer semantics**: a transfer (`transaction_type='transfer'` + `transfer_to_account_id`) — is it **ONE row** affecting both accounts, or **two linked rows** (debit + credit)? How is it shown so it isn't double-counted in income/expense totals?
G6 — **Recurring transactions**: `is_recurring` + `recurring_frequency` — do these **auto-generate** future transaction rows (like Tasks obligations), or are they just a flag/template for forecasting? If auto-generate, when (on due date / on app open)?
G7 — **Investment & FX pricing (ZK tension)**: `current_price` and any currency conversion — **manual entry** (preserves zero-knowledge), or **auto-fetch from a market/FX API** (which would reveal holdings/activity to a server)? Recommend manual; confirm. If multi-currency net worth is wanted, where do FX rates come from?
G8 — **Multi-currency**: v2 keeps `currency` per account/transaction but dropped v1's per-account secondary currency. Is multi-currency in scope (you hold accounts in BRL + USD)? If yes, net worth needs a **base/display currency** + a rate source (ties to G7).
G9 — **Dropped v1 fields — want any back?** Especially: **liability payment schedule** (`payment_frequency`, `next_payment_date`, `interest_type` fixed/variable, `payoff_date`) — CLAUDE.md §1 explicitly says "payment schedules" but the schema lacks them (delta #4). Also income `next_payment_date`/`is_taxable`, asset `ownership_percentage`, investment `dividends_received`. Which return? (Candidate ADR-002 amendment.)
G10 — **Categories & tags**: `category`/`subcategory` are free-text `[E]` — keep free-text, or a **managed category list** (for stable analytics grouping)? And `transactions.tags` is inline `[E]` JSON — migrate to the **shared tag system** (Tasks precedent), or keep inline?
G11 — **Analytics charts**: which charts in v1 scope (Chart.js)? Proposed: spending-by-category (pie), net-worth-over-time (line), income-vs-expense (bar), cash-flow, asset/liability breakdown. Confirm the set.
G12 — **Notes via pages**: confirm finance entities link notes via `pages`/`entity_links` (`transaction` is already a valid target). Which entities get notes — transactions only, or accounts/assets/investments too?

## Resolution
`[INTENT: Victor, 2026-06-27]` — **IN PROGRESS** (G1–G3 captured; G4–G12 pending). Marked WHOLE only when all gaps answered.

- **G1 — Views.** `[INTENT]`
  - **Top dashboard is switchable:** *Financial Dashboard* ⇄ *Accounts Dashboard* (accounts, liabilities, assets, net worth, balance, etc.).
  - **Account standalone pages** with **nested, account-scoped views** (read-only within that account's reach): Account's Transactions · Account's Assets · Account's Liabilities · Account's Investments.
  - **All-Transactions Dashboard** + **All-Transactions page** for consulting over a timeframe (default = current month's reach, e.g. 01/06–30/06).
  - **All-Assets page** — view pattern emphasizing detail (value increase / decrease).
  - **All-Investments page** — view pattern emphasizing value increase / decrease.
  - **All-Liabilities page** — ⚠ view design TBD ("need a better way to view this").
  - ⚠ **NEW intent (TENTATIVE):** Assets/Investments/Liabilities pages should connect to **banks & investment-company accounts** to garner + present info that helps the user analyze money flow and make decisions. **See the ZK-tension flag below — this is a candidate ADR, not a settled capability.**

- **G2 — Import / external connection.** `[INTENT — TENTATIVE]` Treated as a **per-module personalization**: the user may (a) import CSV/OFX, (b) connect to **partner banks**, or (c) bring a **bank API**. Victor notes the bank-API path "needs further thought — may only work for company-size accounts" (⚠ likely resolved by consumer **Open Finance Brasil**, but that is the aggregator model = the ZK dent). **BLOCKED on the ZK decision (ADR) before it can be specced as real.**

- **G3 — Derived aggregates: user-choice persistence.** `[INTENT]` Default = **do NOT store** derived values (compute client-side). The user **may opt to store** them; if he does, **he owns the security** of the path/folder/vault where they're stored. So: derived-by-default, optionally-persisted-at-user's-risk. ⚠ INTENDED — needs a setting (Preferences).

- **G_meta — Onboarding (parked, cross-module).** `[INTENT]` Personalization surface is growing across modules → Victor expects **per-module onboarding + one global onboarding**. Not a Finance-only concern; park as a **platform-level** item (candidate: an Onboarding feature / Preferences extension), revisit after Wave 1.

### ⚠⚠ CONSTITUTIONAL TENSION (victor:triage — sources contradict) — must resolve via ADR
Intent "connect to banks/investment companies to garner information" vs CORE invariant "**server never sees plaintext**" (`[[authoritative-docs]]`, ADR-001/002 zero-knowledge). ZK survives ONLY if the connection is **device→bank direct** (client-side); an **aggregator** (Plaid/Belvo/Open Finance Brasil) means a **third party sees plaintext** (a deliberate, documented dent — not pure ZK); a **server-proxied** fetch **breaks ZK outright**. → **Candidate ADR: "External financial data ingestion under zero-knowledge."** Until decided, bank-connection features are documented as ⚠ INTENDED + TENTATIVE only; the verified-real surface is manual entry + (client-side) CSV/OFX import.

- **G4 — Account balance = derived (ledger/hybrid).** `[INTENT]` `current_balance` is computed from
  `opening_balance` + Σ transactions — the ledger is the single source of truth, balances can't drift.
- **G5 — Transfer = one row, excluded from income/expense totals.** `[INTENT]` `type='transfer'` +
  `transfer_to_account_id`; debits source, credits dest; never counted in income/expense aggregates.
- **G6 — Recurring transactions: user choice, DEFAULT = forecast/template.** `[INTENT]` We recommend
  forecast-only (a template that predicts cash flow, no auto-row); the user may opt into auto-generate
  (materialize the next row on due date, editable/skippable before confirm). ⚠ setting (Preferences).
- **G7 — Pricing/FX: client-side, user's responsibility; future opt-in anonymized service.** `[INTENT]`
  Not a ZK problem because the fetch can be done **on the user's end** (device-side) — the user maintains his
  own security (the whole point of the system). The user **chooses** the method. A **future paid service**
  (full-maturity stage only) would let Vida fetch *selected* data **anonymously, no leaks** — Victor likened
  it to "as a blockchain may work." ⚠ NOTE: the correct primitive is an **anonymizing/oblivious fetch**
  (proxy / mixnet / trusted-enclave / PIR), not a blockchain per se — flagged as a research item for that
  stage. Default now = manual/device-side; the anonymized service is ⚠ INTENDED + DEFERRED (advanced).
- **G8 — Multi-currency: YES.** `[INTENT]` Base/display currency + per-currency holdings; FX rates handled
  via the same G7 model (device-side/manual now, anonymized service later). Net worth converts to base currency.
- **G9 — Dropped v1 fields: RESTORE the minimal forecast set (Victor accepted the recommendation).** `[INTENT]`
  Restore on `liabilities`: `payment_frequency`, `next_payment_date`, `interest_type`{fixed,variable},
  `payoff_date`; on `income_streams`: `next_payment_date`. **Skip/defer:** income `is_taxable` +
  `payment_day_of_month`, asset `ownership_percentage`, asset/investment `description` (use notes-via-pages);
  investment `dividends_received` → model as income transactions, not a column; derived investment math (G3)
  stays computed, not stored. → candidate ADR-002 amendment.
- **G10 — Tags → shared system; categories → managed list.** `[INTENT]` Transaction `tags` migrate to the
  platform-wide shared tag system (`tags`/`page_tags`, the Notes & Pages-owned vocabulary used across Vida —
  same precedent as Tasks). `category` = a **managed category list** (stable analytics grouping) + free-text
  `subcategory`. `[FACT: shared tags = Notes & Pages contract]`
- **G11 — Analytics: set template + user personalization.** `[INTENT]` Ship a default chart template; the
  user picks/adds which charts to show (ties to the per-module personalization / onboarding theme, G_meta).
- **G12 — Note targets = all five (adopted recommendation).** `[INTENT]` Notes-via-`pages` on
  `transaction`, `account`, `asset`, `investment`, `liability` (same mechanism; `transaction` already a valid
  `entity_links` target). Highest value: investment (thesis) + asset (receipts) + transaction (context).

### ⚠ BUDGETING — NOW IN SCOPE (Victor at G12: "we will need a budgeting") — INTENDED, needs its own design pass
Neither v2 nor v1 has a budget model. Victor wants **budgeting** in Vida. It is **large enough to need its own
mini-intake** before it can be specced — open design questions: budget *period* (monthly/custom?), per-**category**
limits (ties to G10 managed categories), **rollover** of unspent, **alerts/thresholds**, and whether it integrates
with **Purpose & Goals** targets. ⚠ DECISION DEFERRED: document as an INTENDED Finance capability now; it may
**graduate to its own feature context** (own manifest row) when designed. NOT invented here — only the intent +
the open questions are recorded. → candidate ADR + new table(s).

### ⚠ LIABILITY PAYMENT VIEW — IN SCOPE (Victor at G12: "a tab for the liability payment")
A **liability payment tab/view** on the liability standalone page: upcoming + made payments, schedule from the
restored fields (G9: `payment_frequency`/`next_payment_date`/`interest_type`/`payoff_date`). ⚠ Open: tracking
**actual payments made** needs either linking transactions→liability or a `liability_payments` ledger — design
decision deferred (candidate ADR-002 amendment). Documented as INTENDED.

### G7 — confirmed: the future fetch service will be **private** (anonymizing/oblivious fetch, not blockchain). `[INTENT]`

## Status: intake WHOLE (2026-06-27). All G1–G12 resolved. INTENDED surface (bank-connection/import [ADR], multi-currency+FX, recurring auto-gen option, G9 restored fields, budgeting [needs design], liability-payment view, derived-storage opt-in) flagged for the build phase — NOT documented as shipped.

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-27 | documentation-blueprint | intake harvested (v2 ADR-002 §5.8 6 tables + finance.ts + CLAUDE.md §1 · v1 life-os finances 9-page feature + API.md); gap map G1–G12 raised. Headline INTENDED surface: CSV/OFX import + conciliation (no schema in either version). |
| 2026-06-27 | documentation-blueprint | G1–G12 resolved with Victor; intake WHOLE. Flagged: ⚠ constitutional ZK tension on bank/investment-API connections → candidate ADR; budgeting NOW in scope (needs own design pass, may graduate to its own feature); liability-payment view in scope; multi-currency YES (FX device-side/private); balance = ledger-derived; G9 restore 4 liability fields + income next_payment_date; tags→shared, categories→managed list. |
