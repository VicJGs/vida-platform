// ============================================================================
// Notes service singleton — MOD-notes ② · B1 (LIF-131). The first per-module
// data-plane wiring in apps/web: constructs the `@vida/core` NotesService once
// and hands it to the React-Query read hooks (BR-B1-5/6).
//
// Module-scope memoized (mirrors db/boot's singleton). Constructs from the
// already-barrel-exported factories (N4 — Notes COMPOSES the seams, builds none):
// a main-thread DrizzleDb via `createDrizzleProxy(driver)` (the driver is an
// SqliteDriver, client.ts:141 — each SELECT/INSERT RPCs to the worker); ONE
// pre-seeded taggable-type registry (from ENTITY_TYPES — N3 needs no seeding)
// shared with the Spaces service; the AR-8 backlink resolver.
// ============================================================================

import {
  createNotesService,
  createSpacesService,
  createTaggableTypeRegistry,
  createBacklinkResolver,
  createDrizzleProxy,
  type NotesService,
} from '@vida/core'
import { getDbClient } from '../../db/boot'
import { getDeviceId } from '../../db/device'

let service: NotesService | null = null

/** The process-wide Notes service (constructed on first call; StrictMode-safe via the module-scope memo). */
export function getNotesService(): NotesService {
  if (service) return service
  const db = createDrizzleProxy(getDbClient().driver)
  const deviceId = getDeviceId()
  const registry = createTaggableTypeRegistry() // pre-seeded from ENTITY_TYPES (N3)
  const spaces = createSpacesService(db, deviceId, registry) // SAME registry instance (IR-2 validation shares it)
  const backlinks = createBacklinkResolver(db, deviceId)
  service = createNotesService(db, deviceId, { spaces, backlinks, registry })
  return service
}
