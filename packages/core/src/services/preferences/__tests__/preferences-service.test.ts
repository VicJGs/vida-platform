// ============================================================================
// mod-preferences #37 ① · Slice 1 — user_preferences service (LIF-133)
//
// Node / better-sqlite3 live-store harness (mirrors sessions-service.test.ts): REAL data store, UNLOCKED vault
// (IR-a — the sync-hash path runs even with empty [E]). Covers the PLAN §4 acceptance (AC1-9).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { userPreferences, navPreferences, commandBarHistory } from '../../../db/schema/preferences'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import {
  createPreferencesService,
  USER_PREFERENCES_DEFAULTS,
  NAV_PREFERENCES_DEFAULTS,
  InvalidModuleError,
  type PreferencesService,
} from '../index'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

interface Harness {
  svc: PreferencesService
  db: DrizzleDb
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createPreferencesService({ db, deviceId: 'test-device' })
  return { svc, db }
}

describe('mod-preferences Slice 1 — user_preferences service', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // AC1 — read-or-DEFAULT, no persist (PR-2 / N-3 / B1)
  it('returns full DEFAULTS on an empty store and creates no row', async () => {
    const prefs = await h.svc.getMergedPreferences()
    expect(prefs).toEqual(USER_PREFERENCES_DEFAULTS)
    const repo = createRepository(h.db, userPreferences, { deviceId: 'test-device', encryptedFields: [] })
    expect(await repo.findAll()).toHaveLength(0)
  })

  it('the merged view carries no SyncableEntity metadata (config view only)', async () => {
    const prefs = (await h.svc.getMergedPreferences()) as Record<string, unknown>
    for (const k of ['id', 'created_at', 'updated_at', '_sync_id', '_sync_version', '_sync_hash']) {
      expect(prefs).not.toHaveProperty(k)
    }
  })

  // AC2 — first write persists + merges (PR-2)
  it('persists a change and merges it over defaults', async () => {
    const updated = await h.svc.updatePreferences({ theme: 'dark' })
    expect(updated.theme).toBe('dark')
    expect(updated.currency).toBe('USD') // untouched → default
    expect((await h.svc.getMergedPreferences()).theme).toBe('dark')
  })

  // AC3 — second write updates the SAME row + bumps _sync_version (PR-3 / BR-P4)
  it('updates the same singleton row on a second write', async () => {
    await h.svc.updatePreferences({ theme: 'dark' })
    await h.svc.updatePreferences({ week_starts_on: 0 })
    const repo = createRepository(h.db, userPreferences, { deviceId: 'test-device', encryptedFields: [] })
    const rows = await repo.findAll()
    expect(rows).toHaveLength(1)
    expect(rows[0]._sync_version).toBe(2)
    const merged = await h.svc.getMergedPreferences()
    expect(merged.theme).toBe('dark') // first write preserved
    expect(merged.week_starts_on).toBe(0)
  })

  // AC4 — E9 config round-trip (PR-1 / PR-10)
  it('round-trips E9 config fields (persona + active_modules)', async () => {
    await h.svc.updatePreferences({ persona: 'student', active_modules: ['tasks', 'habits'] })
    const merged = await h.svc.getMergedPreferences()
    expect(merged.persona).toBe('student')
    expect(merged.active_modules).toEqual(['tasks', 'habits'])
  })

  // AC5 — module visibility JSON boundary (PR-7)
  it('sets and reads module visibility distinctly from feature_gamification', async () => {
    await h.svc.setModuleVisibility('habits', false)
    await h.svc.setModuleVisibility('finance', true)
    expect(await h.svc.getModuleVisibility()).toEqual({ habits: false, finance: true })
    // distinct concern: feature flag untouched (PR-7) — still its GM-1 opt-in default (off; preferences-rescope F11)
    expect((await h.svc.getMergedPreferences()).feature_gamification).toBe(false)
  })

  // AC6 — invalid module key (D3)
  it('throws InvalidModuleError on a structurally-invalid key', async () => {
    await expect(h.svc.setModuleVisibility('', true)).rejects.toBeInstanceOf(InvalidModuleError)
  })

  // AC7 — malformed JSON degrades to default (IR-e)
  it('degrades malformed JSON to default without throwing', async () => {
    await h.svc.updatePreferences({ theme: 'dark' }) // create the row
    const repo = createRepository(h.db, userPreferences, { deviceId: 'test-device', encryptedFields: [] })
    const row = (await repo.findAll())[0]
    // corrupt module_visibility to non-JSON via a raw update (it's a TEXT column → any string is valid at the DB layer)
    await repo.update(row.id, { module_visibility: 'not json{' })
    const merged = await h.svc.getMergedPreferences()
    expect(merged.module_visibility).toBeNull() // fell back to default, no throw
  })

  // AC8 — co-transactional sync_queue enqueue (PR-9)
  it('enqueues a sync_queue row per write', async () => {
    await h.svc.updatePreferences({ theme: 'dark' })
    const q = await createRepository(h.db, syncQueue, { deviceId: 'test-device', encryptedFields: [] }).findAll()
    expect(q.length).toBeGreaterThanOrEqual(1)
    expect(q.some((r) => r.table_name === 'user_preferences')).toBe(true)
  })

  // AC9 — invalid patch rejected (BR-P2)
  it('rejects an out-of-enum patch value', async () => {
    // @ts-expect-error — deliberately invalid enum value to prove Zod rejects at runtime
    await expect(h.svc.updatePreferences({ theme: 'neon' })).rejects.toThrow(/Invalid preferences patch/)
  })
})

describe('mod-preferences Slice 2 — nav_preferences service', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // AC1 — read-or-DEFAULT, no persist (PR-2 / N-3)
  it('returns full nav DEFAULTS on an empty store and creates no row', async () => {
    expect(await h.svc.getNavPreferences()).toEqual(NAV_PREFERENCES_DEFAULTS)
    const repo = createRepository(h.db, navPreferences, { deviceId: 'test-device', encryptedFields: [] })
    expect(await repo.findAll()).toHaveLength(0)
  })

  // AC2 — first write persists + merges (PR-2)
  it('persists a nav change and merges it over defaults', async () => {
    const updated = await h.svc.updateNavPreferences({ dock_position: 'left' })
    expect(updated.dock_position).toBe('left')
    expect(updated.dock_size).toBe('medium') // untouched → default
    expect((await h.svc.getNavPreferences()).dock_position).toBe('left')
  })

  // AC3 — second write updates the SAME row + bumps _sync_version (PR-3 / BR-P4)
  it('updates the same nav singleton on a second write', async () => {
    await h.svc.updateNavPreferences({ dock_position: 'left' })
    await h.svc.updateNavPreferences({ dock_size: 'large' })
    const repo = createRepository(h.db, navPreferences, { deviceId: 'test-device', encryptedFields: [] })
    const rows = await repo.findAll()
    expect(rows).toHaveLength(1)
    expect(rows[0]._sync_version).toBe(2)
    const merged = await h.svc.getNavPreferences()
    expect(merged.dock_position).toBe('left') // first write preserved
    expect(merged.dock_size).toBe('large')
  })

  // AC4 — mobile_nav_items JSON round-trip (IR-e boundary)
  it('round-trips the mobile_nav_items JSON array', async () => {
    await h.svc.updateNavPreferences({ mobile_nav_items: ['home', 'tasks'] })
    expect((await h.svc.getNavPreferences()).mobile_nav_items).toEqual(['home', 'tasks'])
  })

  // AC5 — invalid enum rejected (BR-P2)
  it('rejects an out-of-enum dock_size', async () => {
    // @ts-expect-error — deliberately invalid enum value
    await expect(h.svc.updateNavPreferences({ dock_size: 'huge' })).rejects.toThrow(/Invalid nav preferences patch/)
  })

  // AC6 — falsy-valid values survive the ?? merge
  it('preserves falsy-but-valid values (reduce_motion stays false when set)', async () => {
    await h.svc.updateNavPreferences({ reduce_motion: false, show_labels: false })
    const merged = await h.svc.getNavPreferences()
    expect(merged.reduce_motion).toBe(false)
    expect(merged.show_labels).toBe(false) // not clobbered back to the `true` default
  })

  // AC7 — co-transactional sync_queue enqueue (PR-9)
  it('enqueues a nav_preferences sync_queue row per write', async () => {
    await h.svc.updateNavPreferences({ dock_position: 'right' })
    const q = await createRepository(h.db, syncQueue, { deviceId: 'test-device', encryptedFields: [] }).findAll()
    expect(q.some((r) => r.table_name === 'nav_preferences')).toBe(true)
  })

  // user + nav are independent singletons
  it('keeps user and nav config independent', async () => {
    await h.svc.updatePreferences({ theme: 'dark' })
    await h.svc.updateNavPreferences({ dock_position: 'left' })
    expect((await h.svc.getMergedPreferences()).theme).toBe('dark')
    expect((await h.svc.getNavPreferences()).dock_position).toBe('left')
  })
})

describe('mod-preferences Slice 3 — command_bar_history service', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  const cmdRepo = () => createRepository(h.db, commandBarHistory, { deviceId: 'test-device', encryptedFields: [] })

  // AC1 — recordCommand creates a row
  it('records a new command', async () => {
    await h.svc.recordCommand('open.tasks', 'Open Tasks')
    const rows = await cmdRepo().findAll()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ command_key: 'open.tasks', use_count: 1, is_pinned: false })
  })

  // AC2 — re-record upserts by key (no dup, use_count++) — PR-6/BR-P3
  it('upserts by command_key on re-record (increments use_count, no duplicate)', async () => {
    await h.svc.recordCommand('open.tasks', 'Open Tasks')
    await h.svc.recordCommand('open.tasks', 'Open Tasks')
    const rows = await cmdRepo().findAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].use_count).toBe(2)
    expect(rows[0].last_used_at).not.toBeNull()
  })

  // AC3 — pinned sorts above a higher-use unpinned command (PR-6)
  it('orders pinned-first regardless of frecency', async () => {
    await h.svc.recordCommand('a', 'A')
    await h.svc.recordCommand('a', 'A') // use_count 2
    await h.svc.recordCommand('b', 'B') // use_count 1
    await h.svc.pinCommand('b', true)
    const hist = await h.svc.getCommandHistory()
    expect(hist[0].command_key).toBe('b') // pinned first, despite lower use_count
  })

  // AC4 — unpinned ordering is frecency (use_count desc)
  it('orders unpinned commands by frecency', async () => {
    await h.svc.recordCommand('low', 'Low')
    await h.svc.recordCommand('high', 'High')
    await h.svc.recordCommand('high', 'High') // use_count 2
    const hist = await h.svc.getCommandHistory()
    expect(hist.map((c) => c.command_key)).toEqual(['high', 'low'])
  })

  // AC5 — pinCommand sets the flag on an existing row; with no label an unrecorded key is still a no-op (D-S3)
  it('pins an existing command and no-ops on an unrecorded key without a label', async () => {
    await h.svc.recordCommand('open.tasks', 'Open Tasks')
    await h.svc.pinCommand('open.tasks', true)
    expect((await cmdRepo().findAll())[0].is_pinned).toBe(true)
    // unrecorded key, no label → no throw, no row created
    await h.svc.pinCommand('never.seen', true)
    await h.svc.pinCommand('never.seen', true, '   ') // an empty label creates nothing either
    expect(await cmdRepo().findAll()).toHaveLength(1)
  })

  // AC5b — preferences-rescope R5 (D-R5-3, A1): pinning a never-run command WITH its label creates the row, pinned,
  // unused (use_count 0, last_used_at null) — so it leads the palette.
  it('creates a pinned, unused row for an unrecorded key when given a label', async () => {
    await h.svc.recordCommand('open.notes', 'Open Notes')
    await h.svc.pinCommand('nav:/finance', true, 'Finance', 'navigation')
    const row = (await cmdRepo().findAll()).find((r) => r.command_key === 'nav:/finance')
    expect(row).toMatchObject({
      command_label: 'Finance',
      command_category: 'navigation',
      use_count: 0,
      last_used_at: null,
      is_pinned: true,
    })
    expect((await h.svc.getCommandHistory())[0].command_key).toBe('nav:/finance')
  })

  it('unpinning an unrecorded key creates nothing; a present row keeps its label', async () => {
    await h.svc.pinCommand('nav:/finance', false, 'Finance')
    expect(await cmdRepo().findAll()).toHaveLength(0)
    await h.svc.recordCommand('nav:/habits', 'Habits')
    await h.svc.pinCommand('nav:/habits', true, 'Rituals')
    expect((await cmdRepo().findAll())[0]).toMatchObject({ command_label: 'Habits', is_pinned: true, use_count: 1 })
  })

  // AC6 — empty command_key rejected (fail-loud)
  it('rejects an empty command_key', async () => {
    await expect(h.svc.recordCommand('', 'X')).rejects.toThrow(/Invalid command record/)
  })

  // AC7 — co-transactional sync_queue enqueue (PR-9)
  it('enqueues a command_bar_history sync_queue row', async () => {
    await h.svc.recordCommand('open.tasks', 'Open Tasks')
    const q = await createRepository(h.db, syncQueue, { deviceId: 'test-device', encryptedFields: [] }).findAll()
    expect(q.some((r) => r.table_name === 'command_bar_history')).toBe(true)
  })
})
