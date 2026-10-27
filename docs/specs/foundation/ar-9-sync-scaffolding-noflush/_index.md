# Spec: component:ar-9-sync-scaffolding-noflush

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: implemented (2026-08-05 — 2 gate critiques + post-impl SHIP; core 183/183, typecheck 10/10, eslint 0) <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-05-ar-9-sync-scaffolding-noflush.

<!-- FORWARD spec — §1–§4 describe; §5 is the executable build prompt citing §1–§4. -->

## 1. Identity

**AR-9 — Sync scaffolding (no-flush)** (LIF-80) — M1.0 `#15`, Boot & Connective Base. Home:
`packages/core/src/sync/{queue,resolver,crdt}.ts`. Profile: add-backend-component. Depends: DB-6 (done).
[FACT: m1.0-delivery-plan.md:183; reconstructed-structure.md:72]

**Scope (authoritative row).** "Sync scaffolding (no-flush): the **reader/flush engine stub**
(`sync/{queue,resolver,crdt}.ts`), **stubbed** (M4 activates); HLC encoding deferred." Governing:
**ADR-003 §8 + ADR-017 (scaffold-only).** [FACT: m1.0-delivery-plan.md:183]

Intent: convert the three empty 0-line placeholder files into the **wired, exported, no-flush stub
skeleton** — reserved public seams the M4 activation (AR-9b) fills with HLC/Yjs/blob-relay/transport
**without a schema change and without touching consumers**. AR-9 implements no working flush logic; it
reserves the shape. [FACT: ADR-017:28 "fill the stubs"; roadmap.md:88 "engine stubbed (M4 activates)"]

### What it is NOT (each fenced against a named owner — no boundary crossing)

- **NOT the `sync_queue` table, the enqueue-WRITE, or the queue dedup/collapse.** All are **DB-6** (the
  co-transactional `enqueue` + its `UNIQUE(...)` UPSERT coalescing, ADR-004 §3.4 / ADR-003 §8.2) and
  already shipped. [FACT: m1.0-delivery-plan.md:183 "moved → DB-6"; migrations/001_sync_queue.ts;
  db/schema/foundation/sync-queue.ts; repository.ts:267 `enqueue` (docblock :255)]
- **NOT the `_sync_*` metadata columns or the HLC encoding.** That is **DB-2** (parked→folded, lands
  per-table) — "the build edit that introduces the HLC." [FACT: m1.0-delivery-plan.md:183; ADR-003 §6.1
  "Interim state … the mergeFieldLWW/hlc.ts below are the *proposed* targets"]
- **NOT activation** — transport (WebSocket/HTTP, §5), push/pull flows (§10), device mgmt (§12),
  debounce triggers (§7), `last_sync_at` cursor, the live field-LWW merge (§6.1), the live Yjs merge
  (§4.2), and the `yjs` dependency are all **AR-9b / M4**. [FACT: reconstructed-structure.md:179;
  m1.0-delivery-plan.md:183 "M4 activates"]
- **NOT encryption.** `payload` arrives already-encrypted from the producer; the engine treats it as an
  opaque blob (ZK). Crypto = **AR-3**, deferred. [FACT: repository.ts `enqueue`; ADR-002 three-layer]
- **NOT new sync types.** Every type already exists in `@vida/types/src/sync.ts` — AR-9 **reuses**,
  never redefines. [FACT: packages/types/src/sync.ts]

### Reconciliation of the ADR-017 "0 lines" vs plan-`#15` apparent conflict (recorded for the critic)

ADR-017:21 says the sync files "stay empty stubs (0 lines today)" and :61 sequences AR-9 in the
hardening pass "after the feature deliverable"; the reconstruction places AR-9 at `#15` (before the
M1.1 modules) and has it _write_ a stub. Resolved, not decided ad-hoc:

- **The authority that re-scoped AR-9 is the later doc, not this inference.** ADR-017:21's "0 lines
  today" is superseded on the sequencing axis by the sanctioned replan: ADR-017:59-61 _delegates_ the
  order, and the replan (delivery-plan:183 + reconstructed:72) assigns AR-9 a full **`B·F·C·L`
  doc-spine + gate at `#15`** — an artifact set that is **incompatible with a 0-line no-op**. That, not
  "fill presupposes seams," is why AR-9 writes the skeleton now. (ADR-017:28 "**fill** the stubs" is
  corroborating: the fill step presumes seams exist.) [FACT: ADR-017:21,28,59-61; delivery-plan:183;
  reconstructed-structure.md:72; TASKS.md "Delivery Routing"]
- The "cheap scaffolding" real work (columns + queue rows) is **DB-6/DB-2's**, leaving AR-9 exactly the
  **engine stub skeleton** — and the full doc-spine+gate assigned to AR-9 fits a skeleton, not a 0-line
  no-op. [FACT: roadmap.md:31-34; m1.0-delivery-plan.md:183 Doc `B·F·C·L`]

### 1.1 Gathered source set (delivery-plan §2.1 `[B]` DoD — routed, not derived)

- **Authoritative scope:** `m1.0-delivery-plan.md:183` (the AR-9 row).
- **Governing decision:** `ADR-003` §8 (offline queue/dedup/retry), §6.1 (field-LWW seam), §4.2 (Yjs
  seam); `ADR-017` §5/:21/:28 (scaffold-only, fill-later).
- **Producer contract (fixed, consumed):** `migrations/001_sync_queue.ts`; `db/schema/foundation/
sync-queue.ts` (`SyncQueueRow`); `repository.ts:267` (`enqueue`; docblock :255).
- **Types reused:** `packages/types/src/sync.ts` — `SyncOperation`, `SyncQueueItem`, `SyncQueueStatus`,
  `SyncBlob*`, `YjsSyncUnit`, `SyncCursor`, `SyncTriggerConfig`, `SyncResult`.
- **Pattern in active use:** `foundation/sessions/registry.ts`, `foundation/spaces/service.ts`,
  `services/search/backlink-resolver.ts` (factory + interface + barrel + header + `types.ts` errors).
- **Baseline `[B]`:** `docs/core/sync/current-{spec,business-rules}.md`.

## 2. Contract — the reserved scaffold surface

New file `sync/types.ts` (module-local types + the deferral error, per the sessions/effects `types.ts`
idiom [FACT: foundation/sessions/types.ts:73 `SessionTypeNotFound`; foundation/effects/types.ts:55 `UnknownEffectType`]):

```ts
// The one idiom that makes AR-9 "stubbed": every reserved seam throws this until M4/AR-9b fills it.
// Message-bearing + named, matching the cited idiom (they carry a message + this.name).
export class SyncNotActivated extends Error {
  constructor(seam: string) {
    super(`sync seam not activated until M4 (AR-9b): ${seam}`)
    this.name = 'SyncNotActivated'
  }
}
```

`sync/queue.ts` — the sync-queue reader/flush seam (ADR-003 §8.1):

```ts
export interface SyncQueueReader {
  /** Read pending items FIFO by created_at (ADR-003 §8.1). Activated at M4. */
  readPending(): Promise<SyncQueueItem[]> // [INTERP: SyncQueueItem from @vida/types]
}
export function createSyncQueueReader(db: DrizzleDb): SyncQueueReader // stub → readPending throws SyncNotActivated
```

> **No `collapse()` here (critique fix).** The create→delete collapse / last-state-wins dedup is the
> _producer's_ `UNIQUE(table_name,row_id,operation)` UPSERT — **DB-6**, already shipped (SY-5; ADR-003
> §8.2). Reserving it on the AR-9 reader would duplicate DB-layer logic AR-9 does not own. Any push-time
> no-op filter is **AR-9b's**. [FACT: repository.ts:255-267; current-business-rules.md SY-5; ADR-003 §8.2]

`sync/resolver.ts` — the field-LWW merge seam (ADR-003 §6.1); signature reserved, **no HLC, no merge**:

```ts
export interface FieldLWWResolver {
  merge(local: SyncBlob, remote: SyncBlob): SyncBlob // [INTERP: SyncBlob from @vida/types §4.1]
}
export function createFieldLWWResolver(): FieldLWWResolver // stub → merge() throws SyncNotActivated
```

`sync/crdt.ts` — the per-page Yjs seam (ADR-003 §4.2); signature reserved, **dependency-free** (no `yjs`):

```ts
export interface YjsSyncSeam {
  encode(unit: YjsSyncUnit): Uint8Array // [INTERP: YjsSyncUnit from @vida/types §4.2]
  apply(unit: YjsSyncUnit, update: Uint8Array): void
}
export function createYjsSyncSeam(): YjsSyncSeam // stub → both throw SyncNotActivated
```

`sync/index.ts` — barrel: `export * from './types' | './queue' | './resolver' | './crdt'`.
Root `packages/core/src/index.ts` — add `export * from './sync'` under a header comment
(AR-9 · ADR-003 §8, scaffold-only). [FACT: index.ts pattern lines for foundation/services]

## 3. Business rules

Governed by `docs/core/sync/current-business-rules.md` — the load-bearing ones for AR-9-now:
**SY-1** no-flush (zero network I/O) · **SY-2** consumer-only of the queue · **SY-3** payload opaque (ZK)
· **SY-8** resolver/crdt shape-only · **SY-9** activation is non-structural. [FACT: current-business-rules.md]

## 4. Definition of Done (verified by Vitest — no network, no schema change)

1. `pnpm --filter @vida/core typecheck` — zero errors; `@vida/core` re-exports the `sync` barrel.
2. `sync/__tests__/scaffold.test.ts`: (a) module imports + all exports resolve; (b) each seam method
   throws `SyncNotActivated` (proves _stubbed_, M4-inert — the meaningful invariant); (c) each factory
   **constructs** without touching the DB or network (SY-1); (d) **no-consumer guard** — a repo-level
   assertion that no non-test module under `packages/`/`apps/` imports `core/src/sync/{queue,resolver,
crdt}` yet, locking the no-flush invariant AR-9b will later flip. (The naïve "no `fetch` string in
   `sync/`" check is dropped — trivially green by construction, proves nothing. Critique fix #6.)
3. No new runtime dependency (no `yjs`); no migration; no `_sync_*` column added; `repository.ts`
   untouched (its interim `_sync_lww_ts = Date.now()` stays — corrected by DB-2/AR-9b, not AR-9).
   [FACT: ADR-003 §6.1 "Interim state"]
4. `[C]` currency: promote this spec → `docs/core/sync/current-*`; `[L]` layer-doc if `sync/` is a new
   layer.

## 5. Build prompt (executable — cites §1–§4)

Create `packages/core/src/sync/{types,queue,resolver,crdt,index}.ts` per §2, reusing all types from
`@vida/types/src/sync.ts` (§1.1) and following the `foundation/*` factory+interface+`types.ts`-error
pattern. All seam bodies throw `SyncNotActivated` (§2) — **no working logic, no `yjs`, no network, no
schema change** (§1 What-it-is-NOT, §4). Add `export * from './sync'` to the core barrel. Add
`sync/__tests__/scaffold.test.ts` per §4.2. Gate: `/critique` → engineering quality-gate; then `[C]`+`[L]`.

## 6. Open items — resolved by the independent critique (2026-08-05, verdict REVISE→fixed)

- **[RESOLVED]** stub idiom = _throw `SyncNotActivated`_ (message-bearing + named, §2), not no-op —
  explicit "sync off", matches the `types.ts` error idiom + vault.ts:31 guard. Critic **verified zero
  consumers** import the sync seams today, so the throw breaks nothing; the DoD §4.2(d) guard locks it.
- **[RESOLVED]** `collapse()` **removed** from the AR-9 reader — it duplicates DB-6's UPSERT dedup
  (§2 note, §1 What-it-is-NOT). Any push-time no-op filter is AR-9b's.
- **[RESOLVED]** ADR-017 "0 lines" reconciliation strengthened to cite the later replan as the
  re-scoping authority (§1), not the "fill presupposes seams" inference alone.
- Citations corrected: `sessions/types.ts:73`, `repository.ts:267`. All `@vida/types` type names
  independently verified present (critic).
