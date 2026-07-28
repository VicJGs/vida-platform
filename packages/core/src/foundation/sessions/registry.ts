// ============================================================================
// SessionRegistry — the thin sub-type registry (AR-5 · ADR-004 §3.2; SS-1/SS-3/SS-4/SS-6)
//
// Stores + validates SessionTypeDefs. SHIPPED types live in-memory (seeded from
// code, SS-4 — "configured by us", not synced). USER long-tail types persist to
// `session_type_registry` via the db-6 Repository (→ co-transactional sync_queue
// enqueue) and sync. This is the SEAM modules register through; it does NOT fire
// effects or run the lifecycle engine (deferred to AR-7 / later).
// ============================================================================

import { eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { sessionTypeRegistry, type SessionTypeRegistryRow } from '../../db/schema/foundation/sessions'
import {
  type SessionTypeDef,
  InvalidSessionTypeDef,
  CapabilityEnvelopeExceeded,
  DuplicateSubType,
  SessionTypeNotFound,
} from './types'

// --- Shipped roster (SS-4 — fully configured by us; seed from code) ---------
// At least one COMPLETE 4-dimension def so the registry is a real seam and the
// BR-4 subset check has a shipped envelope to validate against.
export const SHIPPED_SESSION_TYPES: SessionTypeDef[] = [
  {
    sub_type: 'focus',
    owner_module: 'sessions',
    attachment_defaults: {},
    effects: ['attach_pomodoro', 'log_time'],
    lifecycle: {
      transitions: [
        { from: 'scheduled', to: 'in_progress', event: 'start' },
        { from: 'in_progress', to: 'completed', event: 'complete' },
      ],
      hooks: {},
    },
    permissions: { allowed_effects: ['attach_pomodoro', 'log_time'] },
    default_purpose: 'maintenance',
  },
]

export interface SessionRegistry {
  /** Register a USER long-tail type (validates BR-3/BR-4/BR-1, persists + syncs). */
  register(def: SessionTypeDef): Promise<void>
  /** Resolve a type by sub_type — shipped first, then persisted user types. */
  get(subType: string): Promise<SessionTypeDef>
  /** All known types: shipped ∪ persisted user. */
  list(): Promise<SessionTypeDef[]>
}

const REQUIRED_DIMENSIONS: (keyof SessionTypeDef)[] = [
  'attachment_defaults',
  'effects',
  'lifecycle',
  'permissions',
]

function rowToDef(row: SessionTypeRegistryRow): SessionTypeDef {
  return {
    sub_type: row.sub_type,
    owner_module: row.owner_module,
    default_purpose: row.default_purpose ?? undefined,
    attachment_defaults: JSON.parse(row.attachment_defaults ?? '{}'),
    effects: JSON.parse(row.effects ?? '[]'),
    lifecycle: JSON.parse(row.lifecycle ?? '{"transitions":[]}'),
    permissions: JSON.parse(row.permissions ?? '{"allowed_effects":[]}'),
  }
}

export function createSessionRegistry(db: DrizzleDb, deviceId: string): SessionRegistry {
  const shipped = new Map<string, SessionTypeDef>(
    SHIPPED_SESSION_TYPES.map((d) => [d.sub_type, d]),
  )
  // The union of every shipped type's allowed effects — the ceiling a user type
  // may not exceed (BR-4 / SS-6). encryptedFields: [] — the registry has no [E] fields.
  const shippedEnvelope = new Set(
    SHIPPED_SESSION_TYPES.flatMap((d) => d.permissions.allowed_effects),
  )
  const userRepo = createRepository(db, sessionTypeRegistry, { deviceId, encryptedFields: [] })

  return {
    async register(def) {
      // BR-3 — all 4 contract dimensions present.
      for (const dim of REQUIRED_DIMENSIONS) {
        if (def[dim] == null) throw new InvalidSessionTypeDef(dim)
      }
      // BR-4 (SS-6) — the full containment: declared effects[] (dim2) ⊆ the type's own permission
      // envelope (dim4) ⊆ the shipped envelope. Checking only the envelope would let a type DECLARE
      // an effect it is not permitted to fire (spec BR-4: "declared effects[] + permission envelope
      // MUST be a subset"). (sensitive_optins CONSENT is enforced at fire-time — deferred with the
      // effect rail, AR-7 — so it is not statically checked here.)
      const allowed = new Set(def.permissions.allowed_effects)
      for (const effect of def.effects) {
        if (!allowed.has(effect)) throw new CapabilityEnvelopeExceeded(effect) // declares beyond its own envelope
      }
      for (const effect of def.permissions.allowed_effects) {
        if (!shippedEnvelope.has(effect)) throw new CapabilityEnvelopeExceeded(effect) // envelope beyond shipped
      }
      // BR-1 — sub_type unique across shipped + persisted user types (typed,
      // thrown BEFORE the insert so the raw SQLite UNIQUE error is never surfaced).
      if (shipped.has(def.sub_type)) throw new DuplicateSubType(def.sub_type)
      const existing = await userRepo.findWhere(eq(sessionTypeRegistry.sub_type, def.sub_type))
      if (existing.length > 0) throw new DuplicateSubType(def.sub_type)

      await userRepo.create({
        sub_type: def.sub_type,
        owner_module: def.owner_module,
        is_user_type: true,
        default_purpose: def.default_purpose ?? null,
        attachment_defaults: JSON.stringify(def.attachment_defaults),
        effects: JSON.stringify(def.effects),
        lifecycle: JSON.stringify(def.lifecycle),
        permissions: JSON.stringify(def.permissions),
      })
    },

    async get(subType) {
      const shippedDef = shipped.get(subType)
      if (shippedDef) return shippedDef
      const rows = await userRepo.findWhere(eq(sessionTypeRegistry.sub_type, subType))
      if (rows.length === 0) throw new SessionTypeNotFound(subType)
      return rowToDef(rows[0])
    },

    async list() {
      const userRows = await userRepo.findAll()
      return [...shipped.values(), ...userRows.map(rowToDef)]
    },
  }
}
