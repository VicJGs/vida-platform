<!-- PLAN — mod-finance ① · S5 external / ingestion / config seams · Entity Delivery Flow v1 (backend Service track, per-slice) -->
<!-- §XXVI Gate 1 = THIS spec. Operations authority: parts/finance.md FIN-20/21/25/28/29/30/40. Invariants: business-rules.md FN-5/8/9/10 + ADR-014 X1/X5/X8 + ADR-010. -->

# PLAN — Finance ① S5: external / ingestion / config seams

**Slice:** S5 (of 8). **Legs:** FIN-20 (recurring forecast), FIN-21 (FX convert), FIN-25 (persisted-aggregates
opt-in), FIN-28 (CSV/OFX import-reconcile), FIN-29 (external grant-gate), FIN-30 (managed-category resolve),
FIN-40 (fail-loud typed errors). **Track:** backend. **Envision Gate:** N/A (pure logic + seams).

**Shape (the whole slice in one line):** 3 real derivations + 5 deny-safe ports over deferred stores +
delegation to the BUILT ingestion #44 / egress #43 / enforcer #31 — no schema, no re-implementation
`[[xs-security-services-deny-safe-port-build-shape]]`.

---

## §1 Context (BASELINE — code as-is)
- The **ingestion guard is BUILT and deny-safe** (`createIngestionGuard(egressGuard, mediator?)`): with no
  mediator (the M1 default) **any live fetch is REFUSED** (`server_proxy_refused`, `IngestionDenied`); it composes
  the egress guard and ships reconcile primitives `createInMemoryStagingPort` / `autoMatch` / `commitStaged` /
  `dedupeFeed`. `[FACT: foundation/ingestion/{guard,reconcile}.ts]`
- The **egress guard** (`createEgressGuard` → `assertEgressPermitted`/`assertFetchEgress`, `EgressDenied`) and the
  **capability enforcer** (`createCapabilityEnforcer` → `checkAction`/`assertPermitted` over `external_in_ok`/
  `external_out_ok`) are BUILT. `[FACT: foundation/egress/service.ts; foundation/capability/enforcer.ts]`
- **No schema for the deferred stores** — `import_staging`, FX/base-currency, managed-category, persisted-aggregates
  are all M2 durable stores per the slice-map. `[FACT: slice-map.md:37-38]`
- S1–S4 shipped: CRUD, ledger, `getBalance`, analytics (S3), `move_money` (S4). `transactions.category_bidx`
  exists (blind index). `[FACT: service.ts; schema/finance.ts:82]`

## §2 Business Rules (invariants this slice MUST satisfy — cited)
- **BR-S5-1 (FN-5).** Recurring = **forecast-by-default** (predicts cash flow, creates NO row); **materialize** is
  opt-in (a Preferences recurring-mode setting) → on due date a real, editable/skippable row. M1 default =
  forecast-only; materialize behind a deferred port. `[FACT: business-rules.md:23-26; parts/finance.md:30]`
- **BR-S5-2 (FN-8 / ZK-1).** FX converts holdings to a user-set **base currency** with **device-side/manual**
  rates — **never server-fetched**. A missing rate → typed **`FxRateMissingError`**, **never a silent 1:1**.
  Same-currency → identity (no rate needed). `[FACT: business-rules.md:34; parts/finance.md:31]`
- **BR-S5-3 (FN-6 / G3).** Persisted-aggregates are **opt-in**; default = **compute-only** (S3 behavior). The
  opt-in persist path is a deferred Preferences port; M1 default never persists. `[FACT: business-rules.md:27-30,139; parts/finance.md:35]`
- **BR-S5-4 (FN-9 / X1/X8).** CSV/OFX import is **device-mediated** (parse on device → stage → match → user-confirm
  → commit; **never silent overwrite/duplicate**). A path needing **server plaintext is REFUSED, not downgraded**
  (typed **`ZeroKnowledgeViolationError`**). Reuses the ingestion reconcile primitives; `import_staging` durable =
  M2 (in-memory staging port default). `[FACT: business-rules.md:35-42; parts/finance.md:38; ADR-014 X1/X8]`
- **BR-S5-5 (FN-9 / X5).** External bank/broker/price/FX access **gates on the ADR-010 grant fields**
  (`external_in_ok`/`external_out_ok`), **revocable + fail-closed, NO new grant table**. M1 has no mediator/grant
  wired → the gate **refuses** (fail-closed). The aggregator ZK-dent (Belvo/OFBR) is an unresolved candidate ADR
  (C4) — **out of scope**, refused like any external path. `[FACT: business-rules.md:35-42; parts/finance.md:29,118; ADR-010/014 X5]`
- **BR-S5-6 (FN-10 / G10).** `category` resolves against a **managed list** (stable analytics) + free-text
  `subcategory`. Managed store deferred → M1 default = **free-text passthrough + `category_bidx`** (blind index),
  never a silent reject. `[FACT: business-rules.md:43-46; parts/finance.md:40]`
- **BR-S5-7 (FN-40).** Fail loud: a failed import/convert **reverts + typed error**, never silent money loss.
  Typed errors this slice adds: `FxRateMissingError`, `ZeroKnowledgeViolationError`. `[FACT: business-rules.md:115-121; parts/finance.md:50]`

## §3 Design

### 3.1 Deny-safe ports (deferred stores; optional deps, each a "not-configured" default)
```ts
// FX rates — device-side/manual (ZK-1). Default: in-memory (usable in-process/tests), swapped for Preferences (M2).
export interface FxRatePort {
  getRate(from: string, to: string): Promise<number | null> // ratio; null = not configured
  setRate(from: string, to: string, rate: number): Promise<void>
}
export function createInMemoryFxRatePort(): FxRatePort   // the M1 default (no rates until set)

// Recurring mode — a Preferences setting (deferred). Default: 'forecast' (never auto-materializes).
export interface RecurringModePort { mode(): Promise<'forecast' | 'materialize'> }
export const forecastOnlyRecurringPort: RecurringModePort  // default → 'forecast'

// Persisted-aggregates opt-in (deferred Preferences). Default: disabled (compute-only, BR-S5-3).
export interface PersistedAggregatesPort { enabled(): Promise<boolean> }
export const computeOnlyAggregatesPort: PersistedAggregatesPort // default → false

// Managed-category resolve (deferred store). Default: passthrough (free-text, BR-S5-6).
export interface ManagedCategoryPort { resolve(category: string): Promise<string | null> } // null = not in list
export const passthroughCategoryPort: ManagedCategoryPort // default → echoes input (free-text allowed)

// External access — the BUILT ingestion guard (#44) is INJECTED, never constructed here (B1). Default: none →
// assertExternalAccess throws ZeroKnowledgeViolationError (fail-closed). The app/M2 composition root wires the
// real createIngestionGuard(enforcer, egressGuard) and injects it; finance owns NO egress/ingestion construction.
// (dep field: ingestionGuard?: IngestionGuard)
```

### 3.1b Import DTO (reuse ingestion types; define only the finance delta — B2)
Reuse the BUILT ingestion types verbatim: `StagedRow` (`{sourceRowId, date, amountCents, parsed, status, matchId?, error?}`),
`MatchCandidate` (`{id, date, amountCents}`), `MatchTolerance`, `CommitResult`, `ImportStagingPort`,
`createInMemoryStagingPort`, `autoMatch`, `commitStaged`. The ONLY net-new finance type:
```ts
// The device/P6 CSV-OFX parse output; maps to a StagedRow (parsed = this row) for matching, and carries the
// finance fields needed to CREATE the transaction on commit (commitStaged is a pure partition — the caller writes).
export interface ParsedStatementRow {
  sourceRowId: string
  date: string            // 'YYYY-MM-DD'
  amountCents: Money
  account_id: string
  transaction_type: TransactionType
  description?: string | null
  category?: string | null
}
```

### 3.1c Recurring forecast DTO (preflight gap #1)
```ts
// A projected occurrence of a recurring transaction over the forecast range — a PREDICTION, never a written row.
export interface RecurringForecast {
  date: string                    // 'YYYY-MM-DD' the occurrence falls on
  amount: Money
  account_id: string
  transaction_type: TransactionType
  sourceTransactionId: string     // the recurring txn this projects from
}
```

### 3.2 Typed errors
```ts
export class FxRateMissingError extends Error {}          // from → base, no rate configured (BR-S5-2)
export class ZeroKnowledgeViolationError extends Error {} // a path would need server plaintext (BR-S5-4/5)
```

### 3.3 Operations (append to `FinanceService`; deferred ports via `FinanceServiceDeps` optional fields, defaults above)
```ts
// FIN-20 — forecast occurrences of recurring transactions over [from,to]; creates NO row. materialize is opt-in
// via RecurringModePort (M1 default forecast-only → materialize() returns [] + a "mode=forecast" note, never writes).
forecastRecurring(range: ChartRange): Promise<RecurringForecast[]>
materializeDue(asOf?: string): Promise<Transaction[]>   // [] unless the port says 'materialize' (deferred)

// FIN-21 — convert an amount from its currency to base; identity if equal; missing rate → FxRateMissingError.
convertToBase(amount: Money, from: string, base: string): Promise<Money>
getFxRate(from: string, to: string): Promise<number | null>
setFxRate(from: string, to: string, rate: number): Promise<void>

// FIN-30 — resolve a category against the managed list; passthrough free-text default (BR-S5-6). NO category_bidx
// here — the blind index is a KEYED hash needing the vault key (dormant M1, encryptedFields:[]); deferred to M3 (B4).
resolveCategory(category: string): Promise<{ category: string; managed: boolean }>

// FIN-25 — whether derived aggregates are persisted (opt-in). M1 default false → S3 stays compute-only.
aggregatesPersisted(): Promise<boolean>

// FIN-28 — CSV/OFX import over the BUILT ingestion reconcile primitives (B2/B3). ParsedStatementRow is the finance
// import shape (the device/P6 parse output); it maps to the ingestion StagedRow (its `parsed` field carries the
// finance payload). Staging round-trips by batchId through an INSTANCE-level ImportStagingPort (in-memory default,
// durable import_staging = M2).
importStatement(rows: ParsedStatementRow[]): Promise<{ batchId: string; staged: StagedRow[] }>
confirmImport(batchId: string, confirmedSourceRowIds: string[]): Promise<CommitResult> // commitStaged → create confirmed txns; never silent dup

// FIN-29 — external access gate: delegate to the INJECTED ingestion guard (#44); M1 default (none) → fail-closed.
assertExternalAccess(source: IngestionSource, act: IngestionAct): Promise<void> // no guard injected → ZeroKnowledgeViolationError
```

### 3.4 Operation flow (key points)
- **forecastRecurring** — `TransactionFilter` has NO `is_recurring` field (preflight #2) → read via a raw
  `txRepo.findWhere(and(eq(is_recurring, true), isNull(deleted_at)))`; project each by `recurring_frequency`
  across `[from,to]` → `RecurringForecast[]`. Pure; no writes. **materializeDue** consults
  `RecurringModePort.mode()`; `'forecast'` → `[]` (M1 default).
- **convertToBase** — `from === base` → return `amount` (identity, no rate). Else `fxPort.getRate(from, base)`;
  `null` → `throw FxRateMissingError` (BR-S5-2, no silent 1:1); else `Math.round(amount * rate)`.
- **resolveCategory** — `managedCategoryPort.resolve(category)`; a hit → `{category: hit, managed:true}`; a miss →
  `{category, managed:false}` (free-text allowed, BR-S5-6). **No `category_bidx`** — it is a keyed blind index
  needing the vault key (dormant M1, `encryptedFields:[]`; `category` is plaintext today so no index is needed);
  deferred to M3 with field-encryption (B4, `[[m10-repos-use-empty-encryptedfields-seam]]`).
- **importStatement** — map each `ParsedStatementRow` → a `StagedRow` (`parsed` = the finance row; `amountCents`,
  `date` = the match metadata); build `MatchCandidate[]` from `listTransactions` (`{id, date, amountCents: amount}`);
  `autoMatch(staged, candidates, tolerance)`; `stagingPort.put(batchId, staged)` (batchId = `uuidv7()` from
  `repository.ts` — verified export, preflight #3);
  return `{batchId, staged}`. NO commit yet. **confirmImport(batchId, confirmedSourceRowIds)** —
  `stagingPort.take(batchId)` → keep the confirmed → `commitStaged(confirmed)` (pure partition) → for each
  `committed` sourceRowId, CREATE the transaction from `row.parsed` via `createTransaction` (never silent dup — an
  `auto_matched` row is offered for MERGE, the user chooses; a `parse_error` row is rejected fail-loud) →
  `stagingPort.clear(batchId)` → return `CommitResult`. **INSTANCE-level `stagingPort`** (created once in
  `createFinanceService`, shared by both calls, B3). Raw CSV/OFX text→`ParsedStatementRow[]` parse is device/P6 (D1).
- **assertExternalAccess** — if `deps.ingestionGuard` is injected → `ingestionGuard.assertIngestionPermitted(act)`
  (it refuses in M1 anyway — no mediator); if NOT injected (the M1 default) → `throw ZeroKnowledgeViolationError`
  (fail-closed, B1). Finance constructs NO egress/ingestion guard; it maps `IngestionDenied`/`EgressDenied` →
  `ZeroKnowledgeViolationError` at the boundary. No finance-local gate logic (reuse #44/#43/#31).

### 3.5 Deferred inside S5 (recorded, homed)
- **Raw CSV/OFX parse** (text → `ParsedStatementRow[]`) — device/P6 concern; S5 takes parsed rows. `[FACT: import wizard = P6]`
- **Durable `import_staging`, FX/base-currency store, managed-category store, persisted-aggregates store** — all M2
  (the ports). `[FACT: slice-map.md:37-38]`
- **Materialize write path** — behind `RecurringModePort='materialize'` (deferred Preferences); M1 forecast-only.
- **Aggregator ZK-dent** (Belvo/OFBR) — unresolved candidate ADR (C4); refused like any external path.

## §4 Acceptance
1. `forecastRecurring` projects recurring txns across a range (no rows written); non-recurring excluded.
2. `materializeDue` returns `[]` under the default forecast-only port (never auto-writes).
3. `convertToBase`: same-currency identity; cross-currency with a set rate converts (rounded, `rate`=base-per-1-from); **missing rate → `FxRateMissingError`** (no silent 1:1).
4. `resolveCategory`: managed hit → `managed:true`; miss → free-text passthrough `managed:false`. **No `category_bidx`** in the result (dormant M3, B4).
5. `aggregatesPersisted()` → false under the default (S3 stays compute-only).
6. `importStatement` → `{batchId, staged}` (auto-matched vs existing txns, in-memory); `confirmImport(batchId, ids)` takes the SAME batch (instance port, B3), commits confirmed rows as real transactions, an `auto_matched` row offered for merge (no silent duplicate), a `parse_error` row rejected fail-loud.
7. `assertExternalAccess` → `ZeroKnowledgeViolationError` under the M1 default (no guard injected, fail-closed); with an injected guard it delegates (still refuses in M1).
8. tsc 0, eslint 0. Live-store Verification Gate PASS (`confirmImport` creates real rows over the store; `importStatement`→`confirmImport` round-trip through the instance port). S1–S4 + `@vida/types` untouched (S5 additive). `asOf`/`batchId`-bearing tests pin their values (N2).

## §5 Implementation Prompt
Add ports + typed errors to a new `services/finance/config-seams.ts` (or extend `types.ts` + a small `seams.ts`);
append the operations to `service.ts`/`types.ts` reusing S2/S3 readers and the ingestion reconcile primitives.
Wire deferred ports as optional `FinanceServiceDeps` fields with the deny-safe defaults. Type-first → logic →
tsc → Vitest (each real derivation + each deny-safe default's typed refusal + import stage/match/commit) →
live-store smoke → code-review → `/critique` → Currency (§XXIX) → commit. No route; no schema.

**Auth/ZK:** external access + import fail-closed by default (BR-S5-4/5); FX rates are device-side only (never
server-fetched). No egress except through the built, consented egress guard (which itself refuses in M1).

## Gate-1 critique resolution (§XXVI step 2)
- **B1 — RESOLVED.** `assertExternalAccess` takes an **injected** `IngestionGuard` (dep field); the M1 default (none)
  is a direct fail-closed `throw ZeroKnowledgeViolationError`. Finance constructs no egress/ingestion guard — the
  app/M2 root wires + injects it (§3.1/§3.3/§3.4). No re-implementation.
- **B2 — RESOLVED.** Import reuses the built ingestion `StagedRow`/`MatchCandidate`/`MatchTolerance`/`CommitResult`/
  `ImportStagingPort`/`autoMatch`/`commitStaged`; the only net-new finance type is `ParsedStatementRow` (§3.1b),
  carried in `StagedRow.parsed` for the commit write.
- **B3 — RESOLVED.** Staging round-trips by `batchId` through an **instance-level** `ImportStagingPort`
  (created once in `createFinanceService`; `put` on stage, `take`/`clear` on confirm), so state survives
  `importStatement`→`confirmImport`.
- **B4 — RESOLVED.** `resolveCategory` no longer derives `category_bidx` — a keyed blind index needs the vault key
  (dormant M1); returns `{category, managed}` only; bidx deferred to M3.
- **N1–N3 folded** (FX rounding display-grade + rate direction · clock reads pinned in tests · slice-size contained by the port pattern, no leg grows a store).

## Open decisions for Approval 1
- **D1** — `importStatement` takes **pre-parsed** `ParsedStatementRow[]`; the raw CSV/OFX text parse is deferred (device/P6). (Alt: build a parser in S5 — rejected: heavy, and the wizard/device owns parse; keeps S5 a thin adapter.)
- **D2** — `createInMemoryFxRatePort` is the M1 default (rates settable in-process, swapped for Preferences at M2), so `setFxRate`/`getFxRate` work now; a **missing** rate still throws `FxRateMissingError` (no silent 1:1). (Alt: fully deny-safe no-op port — rejected: makes FX untestable + unusable in M1 with no upside.)
- **D3** — `assertExternalAccess` **reuses** the ingestion guard's deny-safe refusal rather than a finance-local gate (single fail-closed path; no re-implementation).
- **D4** — `resolveCategory` default is **passthrough** (free-text allowed) — BR-S5-6 forbids a silent reject; the managed list only *labels* `managed:true/false`.
