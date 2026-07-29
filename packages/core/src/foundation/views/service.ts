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
  }
}
