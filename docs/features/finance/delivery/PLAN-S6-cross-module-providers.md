<!-- PLAN — mod-finance ① · S6 cross-module providers + delegates · Entity Delivery Flow v1 (backend Service track) -->
<!-- §XXVI Gate 1 = THIS spec. Operations authority: parts/finance.md FIN-31/32/33/34/35/37. -->

# PLAN — Finance ① S6: cross-module providers + delegates

**Slice:** S6 (of 8). **Legs:** FIN-31 (Gamification emit), FIN-32 (Journal `/summary` provider), FIN-33 (Purpose
read seam), FIN-34 (notes→`pages` delegate), FIN-35 (tags→`entity_tags` consume), FIN-37 (`dueIn` provider).
**Track:** backend. **Envision Gate:** N/A (providers + seams, no surface).

**Shape:** finance PROVIDES into others' registries + CONSUMES injected ports — every cross-module edge is a
provider registration or a deny-safe/injected port (the S5 pattern). Zero re-implementation; no schema.

---

## §1 Context (BASELINE — code as-is)
- **Journals registry is BUILT** — `createJournalRegistry().register(def: JournalContribution)`; a
  `JournalContribution` = `{module, sectionKey, dataPoints, summary(date)→SectionData, dueIn?(range)→SectionData}`
  `[FACT: journals/registry.ts; journals/types.ts:58-65]`. **FIN-37's `dueIn` IS `JournalContribution.dueIn`** — so
  FIN-32 + FIN-37 are ONE finance contribution (summary + dueIn), not two mechanisms.
- **Effect rail** (`EffectsPort = {rail, registry}`) is the FIN-31 emit path — the checkins CHE-17 precedent:
  optional `effects?` dep, guarded emit (`if (!effects || !registry.resolve(type)) return`), dormant without a
  registered handler. `[FACT: checkins/service.ts:229-241; checkins/types.ts:33-46]`
- **AssociationResolver is BUILT** — `createAssociationResolver(db, deviceId, registry).resolveAssociations(ref, mode)`
  reads an entity's tag memberships (`entity_tags`) + outbound links; `TaggableRef = {entity_type, entity_id}`,
  entity_type registry-validated. `[FACT: foundation/spaces/association-resolver.ts]`
- **Notes service is BUILT** — `createNotesService` with an injected `TaggableTypeRegistry` (NP-6/SP2) validates
  `entity_type`; `getOrCreatePageForEntity`/`createPage` attach a `pages` row per (entity_type, entity_id). `[FACT: notes/service.ts]`
- **S3 gives the reads S6 exposes/aggregates**: `getOverview().netWorth`, `getBalance`, `getTransactionsInRange`;
  G9 schedule fields exist (`liabilities.next_payment_date`, `income_streams.next_payment_date`). `[FACT: service.ts; schema/finance.ts]`
- `TerminalState = 'loading'|'empty'|'error'|'success'`; `DataPoint = {id,label}`; `DateRange = {from,to}`. `[FACT: capability/types.ts:13; journals/types.ts:25,33]`

## §2 Business Rules (invariants this slice MUST satisfy — cited)
- **BR-S6-1 (FIN-31).** A transaction create EMITS an event that feeds achievement checks; **Finance emits,
  Gamification owns achievements**. Guarded (dormant without a registered handler), emit-only, apply→#48. Mirrors
  checkins CHE-17 (`grant_currency`). `[FACT: parts/finance.md:41; checkins CHE-17]`
- **BR-S6-2 (FIN-32/37).** Finance provides a **Journal contribution** (`summary(date)` = today's transactions +
  net-worth snapshot; `dueIn(range)` = upcoming G9 installments). The registry is Journals-owned; the journal
  **names no module** (finance registers itself). A provider throw degrades only its section (the dashboard's job). `[FACT: parts/finance.md:42,47; journals JR-3/IR-d]`
- **BR-S6-3 (FIN-33 / C6).** Purpose reads net-worth/balance THROUGH finance's derived read surface (a
  measurement SOURCE, derived-pull). Finance is a **FEEDER** — **NO `measurement_kind`/`binding_mode` on finance
  entities**. `[FACT: parts/finance.md:43; ADR-011 C6]`
- **BR-S6-4 (FIN-34 / G12).** Notes on a finance entity are `pages` rows (`entity_type` ∈ the finance set), owned
  by Notes & Pages — **NEVER inline columns** (finance schema has none). Read/written through the Notes contract. `[FACT: parts/finance.md:44]`
- **BR-S6-5 (FIN-35 / FN-10/SP1).** Finance tags via the shared `entity_tags` primitive (Spaces-owned);
  registers its `entity_type`s in the OPEN taggable registry; **Finance is a CONSUMER** — authors no tag DDL. The
  S1 `Transaction.tags: []` stub is superseded by the real read here. `[FACT: parts/finance.md:45; S1 note]`
- **BR-S6-6 (FIN-37).** `dueIn` derives upcoming installments from the **BUILT G9 payment-schedule fields**
  (liabilities/income `next_payment_date`) — **NOT** the deferred Commitments derive (FIN-36, no table). `[FACT: parts/finance.md:47; slice-map.md:39]`

## §3 Design

### 3.1 Deps additions (optional; deny-safe/dormant when absent — the S5 pattern)
```ts
associations?: AssociationResolver // FIN-35: tag read; absent ⇒ getEntityTags returns [] (deny-safe)
```
No `notes?` dep (B1/N1): FIN-34 is a pure boundary — finance owns NO note columns and DECLARES its entity types;
the actual note read/write is the Notes service's, called by the consumer (P6), not wrapped by finance.
No `effects?` dep (preflight): FIN-31 emits nothing concrete in M1, so no dep is reserved (YAGNI, no dead field) —
just a documented emit-point comment in `createTransactionImpl`; the dep + emit are added by Gamification at #48.

### 3.2 The finance entity-type declaration (FIN-34/35 registration input)
```ts
// The finance entities that may carry notes/tags — the app registers these into the shared TaggableTypeRegistry
// (notes + associations). Finance DECLARES; it authors no registry (Spaces/Notes own it). income_stream included.
export const FINANCE_ENTITY_TYPES = ['account', 'transaction', 'asset', 'investment', 'liability', 'income_stream'] as const
```

### 3.3 Operations (append to FinanceService + a standalone journal-contribution factory)
```ts
// FIN-31 — emit is folded INTO createTransactionImpl (post-commit, guarded); no new public method.

// FIN-32 + FIN-37 — the finance Journal contribution (standalone, takes the service's reads).
export function createFinanceJournalContribution(svc: FinanceService): JournalContribution
export function registerFinanceJournal(registry: JournalRegistry, svc: FinanceService): void

// FIN-33 — the Purpose measurement-source read seam (feeder; NO measurement_kind on finance). Returns the value
// PLUS the partial flag (ADR-011 §3.6 "last-known + a flag, never stale-as-fresh") so Purpose never treats an
// understated net worth (unvalued assets, S3) as authoritative. getBalance (S2) is the other advertised measure.
getNetWorth(opts?: OverviewOptions): Promise<{ value: Money; partial: boolean }>

// FIN-34 — no method: finance owns no note columns + DECLARES FINANCE_ENTITY_TYPES; the consumer uses Notes directly.

// FIN-35 — read a finance entity's tags via the shared entity_tags primitive (deny-safe → []). NOTE: the sync
// `toTransaction` row mapper keeps `tags: []` (the DB-11 stale field); THIS async method is the real read path (N2).
getEntityTags(entityType: string, entityId: string): Promise<TagAssociation[]>
```

### 3.4 Operation flow
- **FIN-31 emit (comment-only seam, B1+preflight)** — a documented emit point (a comment) sits in
  `createTransactionImpl`; M1 emits **nothing concrete** and reserves **no dep** (YAGNI). `grant_currency` is a
  currency award (wrong for an achievement FEED, and would misfire per-transaction once economy's handler is
  registered — it needs a `currencyId`/`amount` finance doesn't own). Achievements PULL finance's `net_worth`/count
  via the ADR-011 §3.6 seam (FIN-33), so finance need not push. The emit event type + payload + the `effects` dep are
  **Gamification-owned, deferred to #48**. `[FACT: parts/finance.md:41 owner=gamification; ADR-012 §3.7 pull; economy/handlers.ts]`
- **createFinanceJournalContribution** — `{ module: 'finance', sectionKey: 'summary', dataPoints: [{id:'net_worth',
  label:'Net worth'}, {id:'today_spending', label:"Today's spending"}], summary, dueIn }`.
  - `summary(date)` → read `getTransactionsInRange(date, date)` + `getOverview({month: date.slice(0,7)})`;
    build `SectionData{ sectionKey:'summary', module:'finance', dataPoints, state, items:[{netWorth, todaysTransactions}] }`;
    `state` = `'success'` if any data else `'empty'` (reuse the `TerminalState` canon by TYPE, not `deriveTerminalState`).
  - `dueIn(range)` → collect liabilities/income with `next_payment_date` within `[range.from, range.to]`; build
    `SectionData{ sectionKey:'agenda', … items: upcoming installments }`; empty → `state:'empty'`.
- **getNetWorth** — `const o = await getOverview(opts); return { value: o.netWorth, partial: o.partial }` (the
  derived-pull source + its flag, ADR-011 §3.6). netWorth is month-independent; recomputing the full overview for
  the value+flag is acceptable at single-user scale (N3).
- **getEntityTags** — `if (!deps.associations) return []`; else `const r = await resolveAssociations({entity_type,
  entity_id}, 'separate'); return r.mode === 'separate' ? r.tags : []` (narrow the union, preflight #2). The
  injected resolver's registry must include the finance entity types (else it throws unregistered — tests wire it, #3).

### 3.5 Deferred inside S6 (recorded, homed)
- **Achievement event SEMANTICS + handler** (which effect, what condition) — Gamification #48 (finance emits, guarded). `[FACT: parts/finance.md:41]`
- **Commitments derive** (FIN-36, `listCommitments`) — no table, design-pass; `dueIn` uses only the built G9 fields. `[FACT: slice-map.md:39]`
- **The app-level registry wiring** (registering `FINANCE_ENTITY_TYPES` into the shared taggable/notes registry) — composition-root/P6; finance only DECLARES the set.
- **Global Calendar consumer of `dueIn`** — other consumers beyond the Journal agenda are their own modules' wiring.

## §4 Acceptance
1. Creating a transaction succeeds unchanged — **no concrete emit, no reserved dep** in M1 (FIN-31 = a documented emit-point comment; the emit + `effects` dep are added at #48).
2. `createFinanceJournalContribution` registers under `module:'finance'`; `summary(date)` returns today's txns + net-worth snapshot with a correct `state` (success/empty); `dueIn(range)` returns upcoming G9 installments.
3. `summary`/`dueIn` return a well-formed `SectionData` (never throw on empty → `state:'empty'`); the dashboard's per-section degrade is Journals' to test.
4. `getNetWorth` returns `{ value, partial }` (the ADR-011 §3.6 measure + flag); no `measurement_kind`/`binding_mode` on any finance entity (grep-verified).
5. FIN-34 = boundary only: `FINANCE_ENTITY_TYPES` exported for registration; finance has **no note columns** (grep-verified) and no note method (the consumer uses Notes directly).
6. `getEntityTags` returns the entity's tags via the AssociationResolver; absent → `[]` (deny-safe). `Transaction.tags` stays `[]` (N2).
7. tsc 0, eslint 0. Live-store Verification Gate PASS. S1–S5 + `@vida/types` untouched (S6 additive).

## §5 Implementation Prompt
Add `FINANCE_ENTITY_TYPES` + the S6 method signatures (`getNetWorth`/`getEntityTags`) to `types.ts`; extend
`FinanceServiceDeps` with `associations?` only. Add a documented FIN-31 emit-point comment in `createTransactionImpl`
(no code, no dep). Add `getNetWorth`/`getEntityTags` to the service object. Add
`createFinanceJournalContribution`/`registerFinanceJournal` in a new `journal.ts` (takes the service). Barrel-export.
tsc → Vitest (contribution summary/dueIn well-formed SectionData · getNetWorth {value,partial} · tags via a live
AssociationResolver + deny-safe [] · FINANCE_ENTITY_TYPES) → live-store smoke → code-review → `/critique` → Currency (§XXIX) → commit.

**Auth/ZK:** all local reads/providers; the emit is guarded + dormant; no egress. Notes/tags delegate to their owning modules.

## Gate-1 critique resolution (§XXVI step 2)
- **B1 — RESOLVED.** FIN-31 no longer emits `grant_currency` (wrong effect for an achievement FEED + would misfire
  per-transaction once economy's handler registers, needing a `currencyId`/`amount` finance doesn't own). The
  `effects?` seam is reserved + a documented emit point; M1 emits nothing concrete — the achievement event/payload/
  consumption are Gamification-owned, deferred to #48 (doc-grounded: FIN-31 homing "owner=gamification").
- **N1 — RESOLVED (scope removed).** The real `NotesService.getOrCreateNoteForEntity(pageType, entityType,
  entityId, seed)` doesn't match a thin finance wrapper; FIN-34 is a pure boundary (no note columns + declare
  `FINANCE_ENTITY_TYPES`) — the consumer uses Notes directly. Dropped `NotesPort`/`NotesNotWired`/`getEntityNote`.
- **N2/N3 — folded** (`Transaction.tags` stays `[]`, `getEntityTags` is the async read; `getNetWorth` full-overview recompute noted).

## Open decisions for Approval 1
- **D1** — FIN-31 concrete emit is **deferred to #48** (Gamification owns the achievement event); M1 reserves the `effects?` seam only.
- **D2** — FIN-32+FIN-37 are ONE `JournalContribution` (`summary` + `dueIn`), per `journals/types.ts:64`. Not two mechanisms.
- **D3** — `getEntityTags` deny-safe → `[]` (a missing resolver = no tags, not an error).
- **D4** — `dueIn` uses only the BUILT G9 fields (FIN-37), never the deferred Commitments derive (FIN-36).
