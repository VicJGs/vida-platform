// ============================================================================
// Main-thread DB client — AR-4 (LIF-75), the app-facing main↔worker binding.
// AR-2 proved the engine works INSIDE the worker (worker.ts) and explicitly
// handed the app-facing binding to AR-4 (worker.ts header; db/CLAUDE.md).
//
// This client spawns the DB worker, correlates {id} request/response, promisifies
// replies, and exposes:
//   - lifecycle: open(dbName) · exists(dbName) [first-run detection] · migrate() · close()
//   - `driver`: an `SqliteDriver` proxy so `getSchemaVersion(client.driver)` and
//     (later) `createDrizzleProxy` work unchanged across the worker boundary.
//
// GRAIN (AR-4): query · run · close are live; `exec`/`values`/`batch` (the richer
// RawQueryResult + Drizzle-proxy path) THROW a documented seam error — they land
// with module entity-CRUD (UI-3 / M1.1+), together with the worker-side ops.
// ============================================================================

import type { SqliteDriver, RawQueryResult } from '@vida/core'

// Request bodies (no id — the client stamps it). A dedicated union rather than
// `Omit<WorkerRequest,'id'>`: Omit over a discriminated union collapses to the
// common keys only, dropping `dbName`/`sql`.
type RequestBody =
  | { op: 'open'; dbName: string }
  | { op: 'exists'; dbName: string }
  | { op: 'migrate' }
  | { op: 'run'; sql: string; params?: unknown[] }
  | { op: 'query'; sql: string; params?: unknown[] }
  | { op: 'values'; sql: string; params?: unknown[] } // MOD-notes ② · B1 — the Drizzle-proxy read path (was the AR-4 seam)
  | { op: 'close' }

type WorkerRequest = RequestBody & { id: number }

// `rows` is column-keyed objects for `query`, positional arrays for `values` (the Drizzle-proxy shape).
type OkResponse = {
  id: number
  ok: true
  rows?: Record<string, unknown>[] | unknown[][]
  result?: unknown
}
type ErrResponse = { id: number; ok: false; error: string }
type WorkerResponse = OkResponse | ErrResponse

/** The minimal structural surface AR-4 needs from a Worker (real or mocked). */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null
  onerror: ((event: unknown) => void) | null
  terminate(): void
}

// `values` landed with MOD-notes ② · B1 (the Drizzle-proxy read path). `exec`/`batch` stay deferred (unused by the
// createDrizzleProxy callback — it needs only `run` + `values`).
const SEAM = 'AR-4 seam: exec/batch are unused by the Drizzle-proxy path (needs run+values only); land with their consumer.'
// A worker RPC that never replies (worker crash, WASM load failure, killed
// worker) must fail loud, not hang the boot gate. 15s is generous vs a local read.
const RPC_TIMEOUT_MS = 15_000

/** Spawn the real DB worker (Vite resolves the URL + bundles it as an ES worker). */
function spawnDefaultWorker(): WorkerLike {
  // `WorkerLike` is a structural subset of the DOM `Worker` (postMessage/onmessage/
  // onerror/terminate) — the cast narrows to the surface we use, not a type hole.
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
}

export class WorkerDbClient {
  private readonly worker: WorkerLike
  private seq = 0
  private readonly pending = new Map<
    number,
    { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }
  >()

  /** `worker` is injectable so tests supply a mock (jsdom has no `Worker`). */
  constructor(worker: WorkerLike = spawnDefaultWorker()) {
    this.worker = worker
    this.worker.onmessage = (event) => {
      const res = event.data
      // Guard malformed / id-less replies (e.g. an unknown-op fallthrough that
      // posts an incomplete message) — never throw inside the event handler.
      if (res == null || typeof res.id !== 'number') return
      const entry = this.pending.get(res.id)
      if (!entry) return
      this.pending.delete(res.id)
      entry.resolve(res)
    }
    // A worker-scope error is delivered via onerror, not onmessage — reject every
    // pending request so callers fail loud instead of hanging forever (MUST-1).
    this.worker.onerror = () => {
      const err = new Error('DB worker crashed')
      for (const [, entry] of this.pending) entry.reject(err)
      this.pending.clear()
    }
  }

  private request(body: RequestBody): Promise<WorkerResponse> {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`DB worker RPC ${id} (${body.op}) timed out after ${RPC_TIMEOUT_MS}ms`))
        }
      }, RPC_TIMEOUT_MS)
      this.pending.set(id, {
        resolve: (r) => {
          clearTimeout(timer)
          resolve(r)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
      this.worker.postMessage({ ...body, id })
    })
  }

  private async call(body: RequestBody): Promise<OkResponse> {
    const res = await this.request(body)
    if (!res.ok) throw new Error(res.error)
    return res
  }

  // --- lifecycle -----------------------------------------------------------
  /** Open the DB (the worker's `open` also migrates — worker.ts). */
  async open(dbName: string): Promise<void> {
    await this.call({ op: 'open', dbName })
  }

  /** First-run detection: has a persisted DB been created for this name? */
  async exists(dbName: string): Promise<boolean> {
    const res = await this.call({ op: 'exists', dbName })
    return res.result === true
  }

  /** Explicit re-migrate (idempotent; boot's `open` already migrated). */
  async migrate(): Promise<void> {
    await this.call({ op: 'migrate' })
  }

  async close(): Promise<void> {
    await this.call({ op: 'close' })
  }

  terminate(): void {
    this.worker.terminate()
  }

  // --- SqliteDriver proxy --------------------------------------------------
  /** An `SqliteDriver` whose live methods RPC to the worker. */
  readonly driver: SqliteDriver = {
    query: async <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> => {
      const res = await this.call({ op: 'query', sql, params })
      return (res.rows ?? []) as T[]
    },
    run: async (sql: string, params?: unknown[]): Promise<void> => {
      await this.call({ op: 'run', sql, params })
    },
    close: async (): Promise<void> => {
      await this.close()
    },
    // Deferred seam — see file header. Present to satisfy the interface; throw
    // loudly rather than silently no-op if a consumer reaches them early.
    exec: (): Promise<RawQueryResult> => {
      throw new Error(SEAM)
    },
    // MOD-notes ② · B1 — the Drizzle-proxy read path (createDrizzleProxy calls `values` for every SELECT).
    // RPCs to the worker's real driver.values (positional arrays). Was the AR-4 seam; entity-CRUD landed.
    values: async (sql: string, params?: unknown[]): Promise<unknown[][]> => {
      const res = await this.call({ op: 'values', sql, params })
      return (res.rows ?? []) as unknown[][]
    },
    batch: (): Promise<void> => {
      throw new Error(SEAM)
    },
  }
}
