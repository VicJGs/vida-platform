// ============================================================================
// CapabilityRegistry — the thin capability-definition registry (AR-7 · ADR-008 CB1)
//
// SHIPPED definitions live in-memory (code-registered, SS-4 precedent — "configured
// by us", not synced). USER definitions persist to `capability_definitions` via the
// db-6 Repository (→ co-transactional sync_queue enqueue) and sync. This is the SEAM
// modules/authoring register through; it does NOT run the sandbox/DSL/enforce runtime
// (deferred → #85 CAP-authoring).
// ============================================================================

import { eq } from 'drizzle-orm'
import { EFFECT_TYPE, RENDER_TARGET } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import {
  capabilityDefinitions,
  type CapabilityDefinitionRow,
} from '../../db/schema/foundation/capability'
import {
  TERMINAL_STATE,
  type CapabilityDefinition,
  InvalidRenderTarget,
  UnknownDeclaredEffect,
  MissingTerminalStates,
  CapabilityPrivilegeExceeded,
  DuplicateCapabilityId,
  CapabilityNotFound,
} from './types'

const RENDER_TARGETS = new Set<string>(RENDER_TARGET)
const EFFECT_TYPES = new Set<string>(EFFECT_TYPE)

// --- Shipped roster (SS-4 — configured by us; seed from code) ---------------
// ≥1 def with a NON-EMPTY bindings+effects envelope so BR-5's subset check is real.
export const SHIPPED_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'habit_logger',
    kind: 'logger',
    render_targets: ['inline', 'standalone'],
    bindings: ['habit'],
    effects: ['complete_habit_occurrence', 'award_xp'],
    terminal_states: {
      inline: [...TERMINAL_STATE],
      standalone: [...TERMINAL_STATE],
    },
  },
]

export interface CapabilityRegistry {
  /** Register a USER definition (validates BR-2..6, persists + syncs). */
  register(def: CapabilityDefinition): Promise<void>
  /** Resolve a definition by id — shipped first, then persisted user. */
  get(id: string): Promise<CapabilityDefinition>
  /** All known definitions: shipped ∪ persisted user. */
  list(): Promise<CapabilityDefinition[]>
}

function rowToDef(row: CapabilityDefinitionRow): CapabilityDefinition {
  return {
    id: row.def_id,
    kind: row.kind,
    render_targets: JSON.parse(row.render_targets),
    bindings: JSON.parse(row.bindings),
    effects: JSON.parse(row.effects),
    config_schema: row.config_schema ? JSON.parse(row.config_schema) : undefined,
    terminal_states: JSON.parse(row.terminal_states),
    is_user_type: row.is_user_type,
  }
}

export function createCapabilityRegistry(db: DrizzleDb, deviceId: string): CapabilityRegistry {
  const shipped = new Map<string, CapabilityDefinition>(
    SHIPPED_CAPABILITIES.map((d) => [d.id, d]),
  )
  // The union of every shipped def's effects + bindings — the ceiling a user def
  // may not exceed (BR-5 / A4.5). Single-level: a def has no separate internal envelope.
  const shippedEnvelope = new Set<string>([
    ...SHIPPED_CAPABILITIES.flatMap((d) => d.effects),
    ...SHIPPED_CAPABILITIES.flatMap((d) => d.bindings),
  ])
  const userRepo = createRepository(db, capabilityDefinitions, { deviceId, encryptedFields: [] })

  return {
    async register(def) {
      // BR-2 — declared render targets are a subset of the FIXED set.
      for (const rt of def.render_targets) {
        if (!RENDER_TARGETS.has(rt)) throw new InvalidRenderTarget(rt)
      }
      // BR-3 — declared effects are known EFFECT_TYPEs.
      for (const e of def.effects) {
        if (!EFFECT_TYPES.has(e)) throw new UnknownDeclaredEffect(e)
      }
      // BR-4 — every supported render target declares all four terminal states.
      for (const rt of def.render_targets) {
        const states = def.terminal_states[rt] ?? []
        const present = new Set(states)
        if (!TERMINAL_STATE.every((s) => present.has(s))) throw new MissingTerminalStates(rt)
      }
      // BR-5 — a user def's effects ∪ bindings ⊆ the shipped privilege union.
      for (const priv of [...def.effects, ...def.bindings]) {
        if (!shippedEnvelope.has(priv)) throw new CapabilityPrivilegeExceeded(priv)
      }
      // BR-6 — id unique across shipped + persisted (thrown BEFORE insert so the raw
      // SQLite UNIQUE error is never surfaced).
      if (shipped.has(def.id)) throw new DuplicateCapabilityId(def.id)
      const existing = await userRepo.findWhere(eq(capabilityDefinitions.def_id, def.id))
      if (existing.length > 0) throw new DuplicateCapabilityId(def.id)

      await userRepo.create({
        def_id: def.id,
        kind: def.kind,
        render_targets: JSON.stringify(def.render_targets),
        bindings: JSON.stringify(def.bindings),
        effects: JSON.stringify(def.effects),
        config_schema: def.config_schema ? JSON.stringify(def.config_schema) : null,
        terminal_states: JSON.stringify(def.terminal_states),
        is_user_type: true,
      })
    },

    async get(id) {
      const shippedDef = shipped.get(id)
      if (shippedDef) return shippedDef
      const rows = await userRepo.findWhere(eq(capabilityDefinitions.def_id, id))
      if (rows.length === 0) throw new CapabilityNotFound(id)
      return rowToDef(rows[0])
    },

    async list() {
      const userRows = await userRepo.findAll()
      return [...shipped.values(), ...userRows.map(rowToDef)]
    },
  }
}
