// ============================================================================
// Composition root — data-plane-wiring (2026-10-20)
//
// The live service composition root for apps/web. A lazily-initialized MODULE
// SINGLETON (seams/CLAUDE.md sanctions "a module singleton" as the injection
// mechanism) — NOT a React provider. Constructed ONCE,
// after the DB-ready gate (BR-RT-BOOT), on first `getServices()` call.
//
// It builds `DrizzleDb` over the now-live `client.driver` (the data-plane seam),
// establishes the device id, and constructs the module services in dependency
// order. Each entity's closing slice (register + flip — the Entity Live Close,
// docs/specs/foundation/golive-replan/process.md) consumes these; adding a
// module APPENDS its construction here (seams/CLAUDE.md:85) — the mechanism is
// build-once, the construction manifest grows. Every write is serialized by the app-wide
// write lock (write-lock.ts, BR-RT-LOCK) applied to `db.transaction` below.
// ============================================================================

import {
  createDrizzleProxy,
  initVault,
  uuidv7,
  createTaggableTypeRegistry,
  createSpacesService,
  createBacklinkResolver,
  createNotesService,
  createJournalRegistry,
  createJournalsService,
  createPreferencesService,
  type DrizzleDb,
  type SqliteDriver,
  type NotesService,
  type JournalsService,
  type PreferencesService,
} from '@vida/core'
import { getDbClient, ensureDbReady } from './boot'
import { withTransactionLock, writeLock } from './write-lock'

export interface Services {
  readonly notes: NotesService
  readonly journals: JournalsService
  readonly preferences: PreferencesService
}

let buildPromise: Promise<Services> | null = null

/**
 * The device id (HLC LWW tie-break, ADR-003) lives in the device-local `app_state`
 * KV (ADR-002 §5.0; `repository.ts:179` — "device ID from app_state"). Read it;
 * generate a time-sortable UUIDv7 (ADR-002 §2.1) + persist on first boot.
 */
async function resolveDeviceId(driver: SqliteDriver): Promise<string> {
  const rows = await driver.query<{ value: string }>(
    "SELECT value FROM app_state WHERE key = 'device_id'",
  )
  const existing = rows[0]?.value
  if (existing) return existing
  const id = uuidv7()
  await driver.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('device_id', ?)", [id])
  return id
}

async function build(): Promise<Services> {
  await ensureDbReady() // BR-RT-BOOT — never construct before the DB is open+migrated
  // Load libsodium WASM once, before any write. Despite the name, initVault() takes no
  // secret — it only awaits `sodium.ready` (vault.ts). The repository computes an UNKEYED
  // _sync_hash (BLAKE2b, hashContent) on every row (ADR-002 sync metadata), which needs
  // libsodium loaded even in M1 where field encryption stays dormant (crypto unlock = M3).
  await initVault()
  const driver = getDbClient().driver
  // BR-RT-LOCK (preferences-rescope R1): every service shares this ONE db over ONE worker connection, and drizzle's
  // sqlite-proxy transactions are unlocked async begin/commit pairs — serialize them app-wide (write-lock.ts).
  const db: DrizzleDb = withTransactionLock(createDrizzleProxy(driver), writeLock)
  const deviceId = await resolveDeviceId(driver)

  // Dependency order per NotesServiceDeps (services/notes/types.ts): registry → spaces → backlinks → notes.
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, deviceId, registry)
  const backlinks = createBacklinkResolver(db, deviceId)
  const notes = createNotesService({ db, deviceId, spaces, backlinks, registry })

  const journalRegistry = createJournalRegistry()
  const journals = createJournalsService({ db, deviceId, registry: journalRegistry })

  // Preferences — no service deps (out-degree 0); ELC-3 of preferences-rescope (R2).
  const preferences = createPreferencesService({ db, deviceId })

  return { notes, journals, preferences }
}

/**
 * The live services, constructed exactly once (after DB-ready). Safe to import at
 * module scope — nothing runs until the first call. Hooks consume it in `queryFn`.
 */
export function getServices(): Promise<Services> {
  return (buildPromise ??= build())
}
