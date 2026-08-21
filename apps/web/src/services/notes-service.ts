// ============================================================================
// Notes service accessor — MOD-notes ②a (LIF-131). Constructs the @vida/core
// NotesService dependency graph over the app's main-thread Drizzle instance +
// device id, and memoizes it (DP-2). Shared infra: MOD-journals reuses it to
// read the journal page (JR-1), so it lives in `services/`, not under `app/notes`.
//
// Wiring mirrors the ① test harness verbatim (notes-service.test.ts:64-68):
//   registry → spaces(registry) → backlinks → notes({spaces, backlinks, registry}).
// Business logic is entirely ①-owned; this file only assembles + exposes it.
// ============================================================================

import {
  createNotesService,
  createSpacesService,
  createBacklinkResolver,
  createTaggableTypeRegistry,
  type NotesService,
} from '@vida/core'
import { getDb } from '../db/drizzle'
import { getDeviceId } from '../db/device-id'

let service: NotesService | null = null

/**
 * The process-wide `NotesService` (memoized). Safe only after `ensureDbReady()`
 * — `getDeviceId()` throws pre-boot, and the app gates render on boot, so no hook
 * reaches this before the id + db are ready (DP-3).
 */
export function getNotesService(): NotesService {
  if (service) return service
  const db = getDb()
  const deviceId = getDeviceId()
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, deviceId, registry)
  const backlinks = createBacklinkResolver(db, deviceId)
  service = createNotesService(db, deviceId, { spaces, backlinks, registry })
  return service
}

/** Test-only reset of the memoized service. */
export function resetNotesServiceForTest(): void {
  service = null
}
