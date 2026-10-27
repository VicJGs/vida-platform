<!-- PLAN — mod-finance ① · S3 Derived Analytics · Entity Delivery Flow v1 (backend Service track, per-slice) -->
<!-- §XXVI Gate 1 = THIS spec. Operations authority: docs/specs/foundation/backend-intent/parts/finance.md (FIN-17/19/22). -->
<!-- Invariants authority: docs/features/finance/business-rules.md (FN-6/FN-7/FN-8/FN-12/FN-40). Ratify+detail mode; net-new derivation shapes decided here. -->

# PLAN — Finance ① S3: Derived Analytics

**Slice:** S3 (of 8). **Legs:** FIN-17 (`getOverview`), FIN-19 (`getInvestmentValue`), FIN-22 (chart datasets).
**Service:** `createFinanceService` (append-only to `services/finance/{types,service}.ts`; no new file).
**Track:** backend. **Envision Gate:** N/A (pure derivation, renders no surface — `default.md` Step 1.5).

---

## §1 Context (BASELINE — code as-is)

- `createFinanceService` (`service.ts:91`) is a factory-object, hoisted closures, no `this.`
  `[[factory-service-no-this-for-intra-calls]]`; `encryptedFields: []` M1.0; `softDelete: true`.
- S2 already ships the ledger primitives S3 reuses: `getBalance(accountId)` (derived, FN-3, `service.ts:199`),
  `getTransactionsInRange(start,end)` (`service.ts:282`), `listTransactions(filter)` (`service.ts:269`),
  `listAssets`/`listLiabilities`/`listInvestments` (`service.ts:324/338/352`).
- Money is `INTEGER` cents (`Money = number`); `investments.quantity` is `real` (fractional shares)
  `[FACT: schema/finance.ts:161,163,165]`; `assets.current_value` / `liabilities.current_balance` /
  `investments.current_price`/`purchase_price` are `money` and **nullable** `[FACT: schema/finance.ts:115,133,163,165]`.
- No `FinanceOverview` / investment-value / chart types exist in `@vida/types` or `@vida/core`
  `[FACT: grep — 0 hits]` → all S3 shapes are **net-new in `services/finance/types.ts`** (service-local; the
  DB-11 interface-reconcile does not own derivation DTOs).

## §2 Business Rules (invariants this slice MUST satisfy — cited)

- **BR-S3-1 (FN-7).** `netWorth = Σ account balances + Σ asset current_value − Σ liability current_balance`
  — the **simple sum**, NOT the `store` tree. `[FACT: business-rules.md:31-32; slice-map.md:16; traceability.md:157]`
  - Account balances use the **derived** `getBalance` (S2), never a stored `current_balance` column.
  - **Investments are NOT a net-worth term** — FN-7 sums accounts + assets − liabilities only. Investment
    wealth surfaces via `getInvestmentValue`; the store-tree net worth (FIN-18, deferred) folds it in later.
    Excluding it here is doc-faithful, not an omission (N1). `[FACT: business-rules.md:31-32]`
  - **`totalBalance` spans all non-deleted accounts, including `is_active:false`** (a closed/inactive account
    may still hold a balance; `listAccounts` returns all non-deleted) (N2).
  - **A null `current_value`/`current_balance` is UNKNOWN, not zero** — it contributes 0 to the sum but the
    entity is COUNTED as unvalued, so the roll-up never presents an understated number as correct (see BR-S3-4).
- **BR-S3-2 (FN-6).** All aggregates are **computed client-side**, never stored. No column write on read. `[FACT: business-rules.md:27-30]`
- **BR-S3-3 (FN-12 / FN-4).** Transfers are **excluded** from every income/expense aggregate (monthly totals,
  charts) — no double-count. `[FACT: parts/finance.md:22 (FIN-12); business-rules.md:20-22]`
- **BR-S3-4 (FN-40).** A compute error OR an incomplete input shows a **flagged partial**, never a wrong
  number as correct. `getOverview` sets `partial:true` when (i) a per-account balance throws, OR (ii) any
  included asset/liability has a null value — and reports `unvaluedAssets`/`unvaluedLiabilities` counts so the
  understatement is VISIBLE, not silent. The chart aggregator carries `degraded: string[]` (a data error
  degrades **only** that chart, FIN-22). `[FACT: business-rules.md:118; parts/finance.md:32 (FIN-22),50 (FIN-40)]`
- **BR-S3-5 (FN-19 empty state / consistency).** A missing value is treated the SAME way across derivations:
  it is surfaced, never silently zeroed. On a single investment, `getInvestmentValue` names it `priceSet:false`
  - value `null` (an empty state, not an error/partial); in the overview roll-up the equivalent signal is the
    `unvalued*` count + `partial` (BR-S3-4). Two surfaces, one policy. `[FACT: parts/finance.md:29 (FIN-19)]`
- **BR-S3-6 (FN-8 boundary).** S3 sums **raw cents, currency-agnostic** — no FX conversion. Multi-currency
  base-currency conversion + `FxRateMissingError` is **S5/FIN-21** (needs the deferred Preferences base-currency
  port). Documented slice boundary, not a defect. `[FACT: slice-map.md:18,38; business-rules.md:33 (FN-8)]`

## §3 Design (net-new types + operations)

### 3.1 Types (append to `services/finance/types.ts`)

```ts
export interface FinanceOverview {
  totalBalance: Money // Σ getBalance over non-deleted accounts (BR-S3-1)
  totalAssets: Money // Σ asset.current_value (null → 0)
  totalLiabilities: Money // Σ liability.current_balance (null → 0)
  netWorth: Money // totalBalance + totalAssets − totalLiabilities (FN-7 simple sum)
  monthlyIncome: Money // Σ income txns in the month window (transfers excluded, BR-S3-3)
  monthlyExpenses: Money // Σ expense txns in the month window (transfers excluded)
  month: string // 'YYYY-MM' the monthly figures cover (echoed for the caller)
  unvaluedAssets: number // BR-S3-4 — count of non-deleted assets with null current_value (understatement is visible)
  unvaluedLiabilities: number // BR-S3-4 — count of non-deleted liabilities with null current_balance
  partial: boolean // BR-S3-4 — true if a balance compute threw OR unvalued{Assets,Liabilities} > 0
}

export interface OverviewOptions {
  month?: string
} // 'YYYY-MM'; default = current calendar month

export interface InvestmentValue {
  investmentId: string
  quantity: number | null
  currentPrice: Money | null
  purchasePrice: Money | null
  currentValue: Money | null // round(quantity × currentPrice); null if either missing → "no price set"
  costBasis: Money | null // round(quantity × purchasePrice)
  gainLoss: Money | null // currentValue − costBasis (null if either missing)
  gainLossPct: number | null // gainLoss / costBasis (null if costBasis missing or 0); ratio, not %
  priceSet: boolean // currentPrice != null (BR-S3-5)
}

export interface SpendingByCategory {
  category: string | null
  total: Money
}
export interface IncomeExpensePoint {
  period: string
  income: Money
  expenses: Money
  net: Money
} // period 'YYYY-MM'
export interface BreakdownSlice {
  type: string
  total: Money
}
export interface AssetLiabilityBreakdown {
  assets: BreakdownSlice[]
  liabilities: BreakdownSlice[]
}

export interface ChartRange {
  from: string
  to: string
} // 'YYYY-MM-DD' inclusive
export interface ChartDatasets {
  spendingByCategory: SpendingByCategory[] | null
  incomeVsExpense: IncomeExpensePoint[] | null
  assetLiabilityBreakdown: AssetLiabilityBreakdown | null
  degraded: string[] // BR-S3-4 — names of charts that failed to compute
}
```

### 3.2 Operations (append to the `FinanceService` interface + `service` object)

```ts
getOverview(opts?: OverviewOptions): Promise<FinanceOverview>          // FIN-17
getInvestmentValue(id: string): Promise<InvestmentValue>              // FIN-19
getSpendingByCategory(range: ChartRange): Promise<SpendingByCategory[]>   // FIN-22
getIncomeVsExpense(range: ChartRange): Promise<IncomeExpensePoint[]>      // FIN-22 (net = income − expenses; cash-flow folded in)
getAssetLiabilityBreakdown(): Promise<AssetLiabilityBreakdown>           // FIN-22 (current snapshot)
getChartDatasets(range: ChartRange): Promise<ChartDatasets>             // FIN-22 aggregator, per-chart degrade
```

### 3.3 Operation flow

- **getOverview** — resolve `month` (default current calendar month; caller may pin). `totalBalance` =
  Σ `getBalance(acct.id)` over ALL non-deleted `listAccounts()` (incl. inactive, N2), each in a try/catch →
  on throw contribute 0 + `partial=true` (BR-S3-4). `totalAssets` = Σ `current_value ?? 0` while counting
  null values into `unvaluedAssets`; `totalLiabilities` = Σ `current_balance ?? 0` counting `unvaluedLiabilities`
  (BR-S3-4 — null is UNKNOWN, surfaced not silently zeroed). `partial = balanceThrew || unvaluedAssets > 0 ||
unvaluedLiabilities > 0`. `netWorth` = the FN-7 sum (accounts + assets − liabilities; investments excluded,
  N1). Monthly: window `[month-01 … month-lastDay]` via `getTransactionsInRange`; `monthlyIncome` = Σ `income`
  amounts, `monthlyExpenses` = Σ `expense` amounts, **`transfer` rows excluded** (BR-S3-3).
- **getInvestmentValue** — `findById`; not-found → `throw new Error('investment not found: '+id)` (the
  `getBalance` precedent, `service.ts:201`). `currentValue = currentPrice!=null && quantity!=null ?
Math.round(quantity*currentPrice) : null`; `costBasis` likewise from `purchasePrice`; `gainLoss =
currentValue!=null && costBasis!=null ? currentValue-costBasis : null`; `gainLossPct = costBasis ?
gainLoss/costBasis : null`. `priceSet = currentPrice!=null`. A null price is empty-state, not partial (BR-S3-5).
- **getSpendingByCategory** — `getTransactionsInRange`, keep `transaction_type === 'expense'` only (income and
  `transfer` rows both dropped — BR-S3-3/N5), group by `category` (null bucket allowed), sum, sort by total desc.
- **getIncomeVsExpense** — same range read; bucket by `'YYYY-MM'` (from `date`); per bucket sum income /
  expense (transfers excluded); `net = income − expenses`; ascending by period.
- **getAssetLiabilityBreakdown** — group `listAssets()` by `asset_type` (Σ `current_value ?? 0`), group
  `listLiabilities()` by `liability_type` (Σ `current_balance ?? 0`); sort by total desc. **Null values sum as
  0 here WITHOUT an unvalued signal** — this is a _chart approximation_; the authoritative unvalued surface is
  `getOverview`'s `unvalued*` counts (BR-S3-4). The breakdown's contract is per-chart degrade on _error_
  (FIN-22), not on unknown-value (an empty type bucket is legitimate). Documented divergence, consistent with
  BR-S3-5's "one policy, surfaced not silent" — the surfacing lives on the overview, not duplicated per chart.
- **Empty-dataset path** — no accounts/assets/liabilities → overview all-zero, `unvalued*:0`, `partial:false`;
  every chart derivation → `[]` (or empty breakdown). Not an error, not degraded.
- **getChartDatasets** — call the three independent derivations; each in its own try/catch: on throw set that
  field `null` + push its name to `degraded` (BR-S3-4 / FIN-22 "degrades ONLY that chart"). NB (N4): the
  aggregator re-reads the window via `getSpendingByCategory` + `getIncomeVsExpense` (two reads of the same
  range). Deferred as premature at single-user SQLite scale; a read-once + pure-shaper refactor is the P6/scale
  optimization, not S3's concern.

### 3.4 Deferred inside S3 (recorded, homed)

- **net-worth-over-time chart** — DEFERRED. Assets/liabilities carry no historical values (no snapshot store),
  so an honest time series can't be computed in S3. Homes with the `journal_snapshots`/FIN-25 persisted-aggregates
  design-pass. The three shipped charts ARE the S3 default template. `[FACT: FIN-25 slice-map.md:18; no finance snapshot table]`
- **FX conversion** — S5/FIN-21 (BR-S3-6). **Store-tree net worth** (FIN-18) — deferred (slice-map.md:26).

### 3.5 Helpers

- **No `date-fns`** — it is NOT a `@vida/core` dependency `[FACT: package.json — 0 hits]`. Follow the checkins
  precedent: compute the "now" boundary inline + allow injection (`checkins/service.ts:441`
  `asOf ?? new Date().toISOString().slice(0,10)`).
- `currentMonth()` → `new Date().toISOString().slice(0, 7)` (`'YYYY-MM'`).
- `monthWindow(m: 'YYYY-MM')` → `{ from: `${m}-01`, to: `${m}-${lastDay}` }` where
  `lastDay = String(new Date(Date.UTC(+y, +mo, 0)).getUTCDate()).padStart(2,'0')` — pure calendar arithmetic
  (day 0 of the next month = last day of `m`), UTC so no TZ off-by-one, and no instant→string round-trip
  (the calendar-view TZ-safe-keying caution applies to keying a specific day, not to counting a month's length).
  Range is inclusive (matches `getTransactionsInRange`'s `gte/lte`).

## §4 Acceptance

1. `getOverview` returns the figures; `netWorth` = FN-7 simple sum over a live multi-account/asset/liability
   set (tests **pin `{month}`** for determinism, N3). Investments do not move `netWorth` (N1).
2. Monthly income/expense **exclude transfers** (a transfer in-window does not move either figure).
3. `getInvestmentValue` — value & gain/loss correct with rounding; `priceSet:false` + null value on missing price (no throw); not-found throws.
4. `getSpendingByCategory` / `getIncomeVsExpense` / `getAssetLiabilityBreakdown` correct; transfers excluded from the income/expense charts.
5. `getChartDatasets` degrades only the failing chart (`degraded` names it, others still return).
6. **Partial semantics (BR-S3-4):** `partial:true` when a per-account balance throws **OR** an asset/liability
   has a null value; `unvaluedAssets`/`unvaluedLiabilities` report the counts; `partial:false` + zero counts on
   the fully-valued clean path.
7. tsc 0, eslint 0. Live-store Verification Gate PASS (real better-sqlite3 + `initVault()` + `migrate()`).
8. `@vida/types` untouched (all shapes service-local); no column writes on any read path (BR-S3-2).

## §5 Implementation Prompt

Append to `services/finance/types.ts` (the §3.1 types) then `service.ts` (the §3.3 closures + interface
methods), reusing S2's `getBalance`/`getTransactionsInRange`/`list*`. Type-first → logic → wire into the
returned `service` object. Then tsc → Vitest (logic + failure/empty/partial paths) → live-store smoke →
code-review → `/critique` → Currency (§XXIX) → commit. No route (local-first service; no HTTP handler).

**Auth/ZK axis (preflight):** no capability/consent gate on these methods — they read the user's OWN local
rows and compute in-process; no egress, no server, no plaintext leaves the device (ADR-001 ZK; auth-off M1.0
per ADR-017). Contrast S5/S7, whose external/fiscal reaches DO gate (enforcer #31/egress #43).

**Currency close (§XXIX / Step 7 D6):** `docs/modules/finance/current-{spec,business-rules}.md` do **not yet
exist** (S1/S2 shipped before the module's durable docs were born). S3 closes by **birthing** them via
`/document-context finance`, covering the S1–S3 surface (CRUD + ledger + derived balance + analytics), promoting
FN-3/FN-4/FN-7/FN-12/FN-40 + BR-S3-1…6. Committed WITH the code.

## Gate-1 critique resolution (§XXVI step 2)

- **B1 (blocking) — RESOLVED.** Null asset/liability values were silently zeroed in the overview while
  investment null-price was an explicit empty state (FN-40 violation + internal inconsistency). Fixed via
  option (a): `FinanceOverview` now carries `unvaluedAssets`/`unvaluedLiabilities` counts and `partial` trips
  when either > 0 — one null-handling policy across both surfaces (BR-S3-4/BR-S3-5, §3.1/§3.3).
- **N1–N5 — folded** (investments-excluded stated · `totalBalance` spans inactive · tests pin month ·
  redundant-read note · spending-by-category transfer exclusion explicit).

## Open decisions for Approval 1

- **D1** — `getOverview` monthly window defaults to the **current calendar month**; caller may pin `{month}`.
  (Alt: require an explicit month. Chosen: default-with-override for ergonomics + determinism in tests.)
- **D2** — net-worth-over-time chart **deferred** to a snapshot design-pass (§3.4). Ship 3 charts as the S3 template.
- **D3** — `gainLossPct` is a **ratio** (0.12), not a pre-multiplied percent — the render layer formats (P6).
- **D4** — S3 sums **raw cents, no FX** (BR-S3-6); mixed-currency correctness lands with S5. Not flagged partial in S3.
