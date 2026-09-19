// ============================================================================
// ViewsService — saved-view CRUD  (AR-6 · ADR-007)
//
// Thin CRUD over the DB-6 Repository (→ co-transactional sync_queue). M1.0
// pass-through (BR-13): empty [E] set; syncable soft-delete. filter/grouping/
// sort are JSON-TEXT — the service stringifies on write (the sync-queue payload
// / session-registry precedent), the ViewEngine JSON.parses on read.
// ============================================================================

import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { views, type ViewRow } from '../../db/schema/foundation/spaces'
import type { ViewLayout } from '@vida/types'
import { ViewNotFound, type ViewFilter, type ViewGrouping } from './types'

export interface CreateViewInput {
  space_id?: string | null // NULL = global; set = Space-owned (V2)
  name: string
  layout: ViewLayout
  filter?: ViewFilter
  grouping?: ViewGrouping
  sort?: unknown
}

export interface ViewsService {
  createView(input: CreateViewInput): Promise<ViewRow>
  updateView(id: string, patch: Partial<CreateViewInput>): Promise<ViewRow>
  deleteView(id: string): Promise<void>
  getView(id: string): Promise<ViewRow>
  /**
   * Clone a saved view into an independent copy (XCU-05 · ADR-007:50-51 · ADR-009 fork stance).
   * `targetSpaceId` redirects ownership — a string re-homes into that Space, `null` makes it global.
   * name/layout/filter/grouping/sort are copied verbatim; the clone gets a fresh id + sync metadata
   * (no back-link) and never touches `spaces.default_view_id`.
   */
  cloneView(sourceId: string, targetSpaceId: string | null): Promise<ViewRow>
}

function encodePatch(patch: Partial<CreateViewInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.space_id !== undefined) out.space_id = patch.space_id
  if (patch.name !== undefined) out.name = patch.name
  if (patch.layout !== undefined) out.layout = patch.layout
  if (patch.filter !== undefined) out.filter = patch.filter == null ? null : JSON.stringify(patch.filter)
  if (patch.grouping !== undefined)
    out.grouping = patch.grouping == null ? null : JSON.stringify(patch.grouping)
  if (patch.sort !== undefined) out.sort = patch.sort == null ? null : JSON.stringify(patch.sort)
  return out
}

export function createViewsService(db: DrizzleDb, deviceId: string): ViewsService {
  const repo = createRepository(db, views, { deviceId, encryptedFields: [], softDelete: true })

  return {
    createView(input) {
      return repo.create({
        space_id: input.space_id ?? null,
        name: input.name,
        layout: input.layout,
        filter: input.filter == null ? null : JSON.stringify(input.filter),
        grouping: input.grouping == null ? null : JSON.stringify(input.grouping),
        sort: input.sort == null ? null : JSON.stringify(input.sort),
      })
    },

    updateView(id, patch) {
      return repo.update(id, encodePatch(patch))
    },

    deleteView(id) {
      return repo.delete(id) // soft-delete → enqueue operation:'update'
    },

    async getView(id) {
      const row = await repo.findById(id)
      if (!row) throw new ViewNotFound(id)
      return row
    },

    async cloneView(sourceId, targetSpaceId) {
      // Inline findById+throw (not this.getView — factory service breaks on destructure).
      const source = await repo.findById(sourceId)
      if (!source) throw new ViewNotFound(sourceId) // BR-clone-4

      // PICK the copyable fields — never spread the source row (id/_sync_* are select-only,
      // repo.create mints them fresh → independent copy, no back-link). filter/grouping/sort are
      // already JSON TEXT on the row, so they pass through raw (no re-stringify). BR-clone-1/3/6.
      return repo.create({
        space_id: targetSpaceId, // BR-clone-2 — string → Space, null → global
        name: source.name, // verbatim, no rename (BR-clone-2)
        layout: source.layout,
        filter: source.filter,
        grouping: source.grouping,
        sort: source.sort,
      })
    },
  }
}
