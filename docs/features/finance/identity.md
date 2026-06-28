<!-- Identity — features/finance · /documentation Phase 2 · sources: ADR-002 §5.8 · @vida/types/finance.ts · CLAUDE.md §1 · docs/intake/finance.md -->

# Identity — Finance  (level: Feature)

**What it is.** The platform's **private financial command center**. It records and reconciles money across
**accounts, transactions, assets, liabilities, investments, and income streams**, derives **net worth** and
cash-flow analytics, and forecasts the future — all encrypted, all local-first. `[FACT: CLAUDE.md §1; ADR-002 §5.8]`

**The desire behind it.** The user wants one place to see and steer his **entire financial life** — *record*
what happened, *forecast* what's coming, and *analyze* how money flows so he can make decisions — eventually
pulling data from his banks and brokers to do it — **without anyone, the server included, ever seeing the
numbers**. Privacy is the whole point; convenience must never cost zero-knowledge. `[INTENT: Victor 2026-06-27]`

**Scope — full v1 + deliberate expansions.** `[INTENT G1–G12]`
- Owns **6 tables**: `accounts`, `transactions`, `assets`, `liabilities`, `investments`, `income_streams`.
  `[FACT: ADR-002 §5.8]`
- **Ledger model:** account balances are **derived** from an opening balance + the transaction ledger (the
  ledger is the single source of truth, G4). Transfers are one row, excluded from income/expense totals (G5).
- **Views (G1):** switchable top dashboard (Financial ⇄ Accounts) · account standalone pages with nested
  account-scoped views (transactions/assets/liabilities/investments) · all-transactions dashboard + timeframe
  page (default = current month) · all-assets / all-investments pages (value ↑/↓ emphasis) · all-liabilities
  page (⚠ view design TBD) · **liability-payment view** (G12).
- **Multi-currency (G8):** base/display currency with per-currency holdings; FX handled **device-side/manually**
  (private), never server-fetched (G7).
- **Analytics (G11):** a default Chart.js template the user personalizes.

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules + constitution]`
- **Not a server-side data aggregator.** Zero-knowledge holds: any external fetch (prices, FX, bank/broker
  data, statement parsing) happens **on the user's device**; the server only ever stores opaque blobs. The
  future "fetch-on-your-behalf" service must be a **private/anonymizing** fetch, never a plaintext server relay
  (FN-8/FN-9, ⚠ candidate ADR). `[INTENT G2,G7; FACT: ADR-001/002 ZK]`
- **Not a budgeting tool *yet*.** Budgeting is **in scope but undesigned** — documented as ⚠ INTENDED, needs
  its own design pass; may graduate to its own feature. `[INTENT G12]`
- **Not a notes store.** Finance entities link notes via `pages` (`entity_type` ∈ transaction/account/asset/
  investment/liability), never inline. `[FACT: ADR-002 §5.2; INTENT G12]`
- **Not its own tag vocabulary.** Transactions tag through the **shared** tag system (Tasks precedent), not the
  inline `[E]` JSON (going forward — structure-data ⚠). `[INTENT G10]`
- **Not the Purpose-metrics / Gamification owner.** Finance **feeds** them (net-worth/savings targets, achievement
  events) but doesn't own those tables. `[INTENT; FACT: CLAUDE.md modules]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
