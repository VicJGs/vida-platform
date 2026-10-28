# IMPLEMENTATION-PLAN (§XXVI g2) — AR-9 Sync scaffolding (no-flush)

> Gate-2 artifact. Derived from the approved forward spec (`../_index.md`, Approval 1 · 2026-08-05).
> Profile: Add Backend Component. Every path/signature `[FACT: file:line]`-grounded (below), not guessed.
> Scope is scaffold-only: reserved seams that throw `SyncNotActivated`; no logic, no `yjs`, no network,
> no schema change. Fences: DB-6 (queue+enqueue+dedup) · DB-2 (`_sync_*`+HLC) · AR-9b/M4 (activation) · AR-3 (crypto).

## Grounded facts (verified this session)

- `@vida/types` re-exports all sync types: `export * from './sync'` [FACT: packages/types/src/index.ts:8];
  names present: `SyncQueueItem, SyncBlob, YjsSyncUnit, SyncOperation, SyncQueueStatus` [FACT: packages/types/src/sync.ts].
- `DrizzleDb` from `../db/adapter` (sync/ is one level under src; peers at two levels use `../../`) [FACT: foundation/capability/registry.ts:13].
- Lint: `@typescript-eslint/no-unused-vars: ['error', {argsIgnorePattern:'^_'}]` → `_`-prefixed stub params pass [FACT: eslint.config.js:12; precedent vault.ts:24].
- Error idiom = message-bearing + `this.name` [FACT: foundation/effects/types.ts:55 `UnknownEffectType`; sessions/types.ts:73 `SessionTypeNotFound`].
- Barrel-export idiom: root `index.ts` header comment + `export * from './<dir>'` [FACT: packages/core/src/index.ts:113-133].
- Premise: the 3 files exist and are 0 bytes; grep confirms **zero consumers** import the sync seams (critique-verified).

## Build order (5 files created, 1 edited) + exact content

### 1. `packages/core/src/sync/types.ts` (new)

```ts
// ============================================================================
// Sync engine — module-local guard (AR-9 · ADR-003 §8, scaffold-only).
// Every reserved seam throws this until M4 (AR-9b) fills it. See docs/core/sync/.
// ============================================================================

/** Thrown by every AR-9 sync seam: scaffolded but inert until M4 (AR-9b). */
export class SyncNotActivated extends Error {
  constructor(seam: string) {
    super(`sync seam not activated until M4 (AR-9b): ${seam}`)
    this.name = 'SyncNotActivated'
  }
}
```

### 2. `packages/core/src/sync/queue.ts` (new)

```ts
// ============================================================================
// Sync-queue reader seam (AR-9 · ADR-003 §8.1) — SCAFFOLD-ONLY, inert until M4.
// Consumer-only of DB-6's sync_queue (SY-2). The enqueue-WRITE + UNIQUE dedup/collapse
// are DB-6 (repository.ts), NOT here (SY-5). readPending activates at M4 (AR-9b).
// ============================================================================
import type { SyncQueueItem } from '@vida/types'
import type { DrizzleDb } from '../db/adapter'
import { SyncNotActivated } from './types'

export interface SyncQueueReader {
  /** Read pending items FIFO by created_at (ADR-003 §8.1). Activated at M4 (AR-9b). */
  readPending(): Promise<SyncQueueItem[]>
}

export function createSyncQueueReader(_db: DrizzleDb): SyncQueueReader {
  return {
    readPending(): Promise<SyncQueueItem[]> {
      throw new SyncNotActivated('SyncQueueReader.readPending')
    },
  }
}
```

### 3. `packages/core/src/sync/resolver.ts` (new)

```ts
// ============================================================================
// Field-level LWW resolver seam (AR-9 · ADR-003 §6.1) — SCAFFOLD-ONLY, inert until M4.
// No HLC clock, no merge logic — that is "the build edit that introduces the HLC"
// (DB-2 columns + AR-9b), NOT AR-9. [ADR-003 §6.1 "Interim state"]
// ============================================================================
import type { SyncBlob } from '@vida/types'
import { SyncNotActivated } from './types'

export interface FieldLWWResolver {
  /** Merge two field-level-LWW blobs (ADR-003 §6.1). Activated at M4 (AR-9b). */
  merge(local: SyncBlob, remote: SyncBlob): SyncBlob
}

export function createFieldLWWResolver(): FieldLWWResolver {
  return {
    merge(_local: SyncBlob, _remote: SyncBlob): SyncBlob {
      throw new SyncNotActivated('FieldLWWResolver.merge')
    },
  }
}
```

### 4. `packages/core/src/sync/crdt.ts` (new)

```ts
// ============================================================================
// Per-page Yjs CRDT seam (AR-9 · ADR-003 §4.2) — SCAFFOLD-ONLY, inert until M4.
// Dependency-free: NO `yjs` import until activation (AR-9b adds the dependency).
// ============================================================================
import type { YjsSyncUnit } from '@vida/types'
import { SyncNotActivated } from './types'

export interface YjsSyncSeam {
  /** Encode a page's Yjs state to a binary update (ADR-003 §4.2). Activated at M4. */
  encode(unit: YjsSyncUnit): Uint8Array
  /** Apply a remote Yjs update to a page's state (ADR-003 §4.2). Activated at M4. */
  apply(unit: YjsSyncUnit, update: Uint8Array): void
}

export function createYjsSyncSeam(): YjsSyncSeam {
  return {
    encode(_unit: YjsSyncUnit): Uint8Array {
      throw new SyncNotActivated('YjsSyncSeam.encode')
    },
    apply(_unit: YjsSyncUnit, _update: Uint8Array): void {
      throw new SyncNotActivated('YjsSyncSeam.apply')
    },
  }
}
```

### 5. `packages/core/src/sync/index.ts` (new — barrel)

```ts
// sync — AR-9 sync engine scaffolding (no-flush). Reserved seams, inert until M4 (AR-9b).
// ADR-003 §8 (offline queue) · ADR-017 (scaffold-only).
export * from './types'
export * from './queue'
export * from './resolver'
export * from './crdt'
```

### 6. `packages/core/src/index.ts` (edit — append after the `services/search` export block)

```ts
// Sync — AR-9 engine scaffolding (no-flush): reserved seams inert until M4 (AR-9b · ADR-003 §8)
export * from './sync'
```

## Tests — `packages/core/src/sync/__tests__/scaffold.test.ts` (new)

Vitest. Four groups (spec §4.2):

1. **exports resolve / factories construct** — `createSyncQueueReader({} as DrizzleDb)`,
   `createFieldLWWResolver()`, `createYjsSyncSeam()` return objects without throwing (SY-1: construction
   touches no DB/network; the DB arg is never dereferenced by the stub).
2. **each seam throws `SyncNotActivated`** — ⚠ all seams (incl. `readPending`) are **non-`async`** and
   throw **synchronously**, so use the synchronous matcher, NOT `.rejects` (critique finding 1):
   `expect(() => r.readPending()).toThrow(SyncNotActivated)`, `expect(() => resolver.merge(a, b)).toThrow(...)`,
   `expect(() => seam.encode(u)).toThrow(...)`, `expect(() => seam.apply(u, up)).toThrow(...)`. Assert each
   thrown error's `.name === 'SyncNotActivated'`. (A `.rejects.toThrow` form would FAIL — the throw escapes
   before a promise exists.)
3. **`SyncNotActivated` is exported + message-bearing** — `new SyncNotActivated('x').message` contains the seam.
4. **no-consumer guard** (locks the no-flush invariant AR-9b flips): resolve this file's dir via ESM-safe
   `const __dirname = dirname(fileURLToPath(import.meta.url))` (finding 5 — the package is `"type":"module"`;
   do not rely on the Vitest `__dirname` shim), walk up to the repo root (first dir containing
   `pnpm-workspace.yaml`), scan `packages/` + `apps/` `.ts`/`.tsx` files
   (exclude `node_modules`, `dist`, the `sync/` dir itself, and `*.test.*`/`__tests__`) for the seam
   factory identifiers (`createSyncQueueReader|createFieldLWWResolver|createYjsSyncSeam`); assert **zero
   matches**. ⚠ **LIVE-SMOKE RISK** — the FS walk + root resolution is the one non-trivial bit; verify it
   actually finds the root and scans real files (not an empty set that passes vacuously). [[live-smoke-catches-data-shape-bugs]]

## Verification (DoD gate)

```
pnpm --filter @vida/core typecheck      # zero errors; barrel re-export resolves
pnpm --filter @vida/core test           # existing suite + scaffold.test.ts green
pnpm --filter @vida/core lint           # _-prefixed args clean (eslint.config.js:12)
pnpm typecheck                          # root 10/10 unaffected
```

Then: `/critique` (post-impl, independent) → engineering quality-gate → `[C]` promote `_index.md` →
`docs/core/sync/current-*` + `[L]` `sync/CLAUDE.md` layer-doc → commit docs WITH code (branch-first).

## Assumptions locked (from preflight)

- Reader reserves **only** `readPending`; `markInFlight`/`markFailed` status transitions are AR-9b (not now).
- Stub bodies throw (not no-op). `_db` intentionally unused (arg reserved for the M4 read impl).
- No `yjs`, no migration, no `_sync_*` column, `repository.ts` untouched (interim `Date.now()` stays → DB-2/AR-9b).
