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
// GRAIN: query · run · close are live. `exec` · `values` · `batch` (the richer
// RawQueryResult + Drizzle-proxy read path) were AR-4's reserved seam; data-plane-
// wiring (2026-10-20) landed them — they now RPC to the worker ops that call the
// in-worker web-driver. `createDrizzleProxy(client.driver)` works end-to-end.
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
  | { op: 'exec'; sql: string; params?: unknown[] }
  | { op: 'values'; sql: string; params?: unknown[] }
  | { op: 'batch'; statements: Array<{ sql: string; params?: unknown[] }> }
  | { op: 'close' }

type WorkerRequest = RequestBody & { id: number }

type OkResponse = { id: number; ok: true; rows?: Record<string, unknown>[]; result?: unknown }
type ErrResponse = { id: number; ok: false; error: string }
type WorkerResponse = OkResponse | ErrResponse

/** The minimal structural surface AR-4 needs from a Worker (real or mocked). */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null
  onerror: ((event: unknown) => void) | null
  terminate(): void
}

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
    // data-plane-wiring (2026-10-20) — the reserved Drizzle-proxy path, now live:
    // RPC to the worker ops that call the in-worker web-driver.
    exec: async (sql: string, params?: unknown[]): Promise<RawQueryResult> => {
      const res = await this.call({ op: 'exec', sql, params })
      return res.result as RawQueryResult
    },
    values: async (sql: string, params?: unknown[]): Promise<unknown[][]> => {
      const res = await this.call({ op: 'values', sql, params })
      return res.result as unknown[][]
    },
    batch: async (statements: Array<{ sql: string; params?: unknown[] }>): Promise<void> => {
      await this.call({ op: 'batch', statements })
    },
  }
}
