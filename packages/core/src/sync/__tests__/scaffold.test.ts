// ============================================================================
// AR-9 · Sync scaffolding (no-flush) — scaffold tests.
// Proves the charter: seams EXIST + resolve through the barrel, are STUBBED (throw
// SyncNotActivated, M4-inert), construct without touching DB/network (SY-1), and have
// ZERO consumers today (locks the no-flush invariant AR-9b will later flip).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SyncNotActivated, createSyncQueueReader, createFieldLWWResolver, createYjsSyncSeam } from '../index'
import type { DrizzleDb } from '../../db/adapter'
import type { SyncBlob, YjsSyncUnit } from '@vida/types'

// A never-touched DB handle: the stub must not dereference it (SY-1).
const NEVER_TOUCHED = {} as DrizzleDb
const BLOB = {} as SyncBlob
const UNIT = {} as YjsSyncUnit

describe('AR-9 sync scaffold — construction (SY-1)', () => {
  it('factories construct without touching DB/network', () => {
    expect(() => createSyncQueueReader(NEVER_TOUCHED)).not.toThrow()
    expect(() => createFieldLWWResolver()).not.toThrow()
    expect(() => createYjsSyncSeam()).not.toThrow()
  })
})

describe('AR-9 sync scaffold — seams are stubbed / M4-inert', () => {
  // All seams are non-async and throw SYNCHRONOUSLY — use the () => form, never .rejects.
  it('SyncQueueReader.readPending throws SyncNotActivated', () => {
    const r = createSyncQueueReader(NEVER_TOUCHED)
    expect(() => r.readPending()).toThrow(SyncNotActivated)
  })

  it('FieldLWWResolver.merge throws SyncNotActivated', () => {
    const r = createFieldLWWResolver()
    expect(() => r.merge(BLOB, BLOB)).toThrow(SyncNotActivated)
  })

  it('YjsSyncSeam.encode / apply throw SyncNotActivated', () => {
    const s = createYjsSyncSeam()
    expect(() => s.encode(UNIT)).toThrow(SyncNotActivated)
    expect(() => s.apply(UNIT, new Uint8Array())).toThrow(SyncNotActivated)
  })

  it('SyncNotActivated is exported, named, and message-bearing', () => {
    const err = new SyncNotActivated('probe')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('SyncNotActivated')
    expect(err.message).toContain('probe')
  })
})

describe('AR-9 sync scaffold — no-consumer guard (no-flush invariant)', () => {
  // Guards specifically against SEAM-FACTORY consumption (construction/call sites — the only way to
  // actually flush). Type-only imports of the interfaces or SyncNotActivated are harmless and NOT
  // flagged (they call nothing). AR-9b, when it wires the first real consumer, flips this test.
  // Resolve the repo root ESM-safely (package is "type":"module").
  const here = dirname(fileURLToPath(import.meta.url))
  function repoRoot(from: string): string {
    let dir = from
    // walk up until pnpm-workspace.yaml, guarding against filesystem root.
    for (let i = 0; i < 20; i++) {
      if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    throw new Error('repo root (pnpm-workspace.yaml) not found from ' + from)
  }

  const SEAM_FACTORIES = /createSyncQueueReader|createFieldLWWResolver|createYjsSyncSeam/
  const SYNC_DIR = join('packages', 'core', 'src', 'sync')

  function collect(dir: string, acc: string[]): string[] {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name === '.turbo') continue
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        // skip the sync module itself (defines the factories) and all test dirs
        if (full.includes(SYNC_DIR) || name === '__tests__') continue
        collect(full, acc)
      } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) {
        acc.push(full)
      }
    }
    return acc
  }

  it('no non-test module under packages/ or apps/ imports the sync seams yet', () => {
    const root = repoRoot(here)
    const files: string[] = []
    for (const top of ['packages', 'apps']) {
      const base = join(root, top)
      if (existsSync(base)) collect(base, files)
    }
    // Not vacuous: we must actually have scanned real source.
    expect(files.length).toBeGreaterThan(0)

    const offenders = files.filter((f) => SEAM_FACTORIES.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
