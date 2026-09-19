// ============================================================================
// TemplatesService — templates store CRUD  (XS-templates #36 · ADR-009 · XCU-01)
//
// Thin CRUD over the DB-6 Repository (→ co-transactional sync_queue) for the
// light `templates` store (ADR-009 §3.3). M1.0 pass-through (XCU-09): empty [E]
// set; syncable soft-delete. NO updateTemplate — templates follow the FORK model
// (no propagation, no edit-in-place); you save a new bundle, never mutate a
// stored one. `bundle` is stringified to JSON TEXT on write (the views JSON-TEXT
// precedent); reads return it raw — parsing is the consumer's concern (S4).
// Mirrors foundation/views/service.ts.
// ============================================================================

import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { templates, type TemplateRow } from '../../db/schema/foundation/templates'
import type { TemplateBundle } from '@vida/types'
import { TemplateNotFound } from './types'

export interface CreateTemplateInput {
  name: string
  bundle: TemplateBundle
}

export interface TemplatesService {
  createTemplate(input: CreateTemplateInput): Promise<TemplateRow>
  listTemplates(): Promise<TemplateRow[]>
  getTemplate(id: string): Promise<TemplateRow>
  deleteTemplate(id: string): Promise<void>
}

export function createTemplatesService(db: DrizzleDb, deviceId: string): TemplatesService {
  const repo = createRepository(db, templates, {
    deviceId,
    encryptedFields: [], // M1.0 pass-through (XCU-09); name/bundle [E] is the M3 target
    softDelete: true,
  })

  return {
    createTemplate(input) {
      // bundle → opaque JSON TEXT (transport serialize, not the per-member schema — that is S3).
      return repo.create({ name: input.name, bundle: JSON.stringify(input.bundle) })
    },

    listTemplates() {
      return repo.findAll() // findAll applies isNull(deleted_at) — soft-deleted excluded
    },

    async getTemplate(id) {
      // Inline findById+throw (not this.* — factory service breaks on destructure).
      const row = await repo.findById(id)
      if (!row) throw new TemplateNotFound(id)
      return row
    },

    deleteTemplate(id) {
      return repo.delete(id) // soft-delete → enqueue operation:'update'
    },
  }
}
