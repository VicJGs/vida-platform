// ============================================================================
// CapabilityEnforcer — the envelope-enforcement decision tier (XS-capability #31)
//
// ADR-010 declare→grant→enforce, the *what* (platform-agnostic decision logic) over
// the AR-7 `capability_grants` structure. Fail-closed by default (INV-1). Shipped/trusted
// defs bypass (INV-2). This service DECIDES; it does not execute — effect firing (#32),
// egress mediation (#43), ingestion layer (#44), and the user-code sandbox (#116) are
// delegated seams. Spec: docs/specs/foundation/xs-capability/.
//
// S1 (this slice): decision core (checkAction/assertPermitted) + grant reads
// (getGrant/isEnvelopeCurrent) + canonicalEnvelopeHash. S2 adds grant/revoke (writes).
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import { hashContent } from '../../encryption/vault'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import {
  capabilityGrants,
  type CapabilityGrantRow,
} from '../../db/schema/foundation/capability'
import type { CapabilityRegistry } from './registry'
import {
  SENSITIVE_MODULE_CLASSES,
  CapabilityDenied,
  GrantExceedsDeclaration,
  type CapabilityAction,
  type CapabilityDefinition,
  type CapabilityGrant,
  type DeclaredEnvelope,
  type EnforcementDecision,
  type GrantEnvelope,
  type SensitiveModuleClass,
} from './types'

const ALLOW: EnforcementDecision = { allowed: true }

/**
 * Canonical hash of a def's DECLARATION — the privilege parts of the ADR-008 6-part
 * anatomy: `{bindings, effects}` (parts 3 + 5). Order-independent (sorted) so a benign
 * reorder never mis-fires the re-grant-on-change check. NOT render_targets/config/kind.
 * The grant-time hash and the drift-check hash both call this → symmetric by construction.
 * Uses the exported keyless BLAKE2b primitive (needs libsodium loaded — `sodium.ready`).
 * [ADR-008:119-121 · ADR-010 §3.2]
 */
export function canonicalEnvelopeHash(decl: DeclaredEnvelope): string {
  const canonical = JSON.stringify({
    bindings: [...decl.bindings].sort(),
    effects: [...decl.effects].sort(),
  })
  return hashContent(canonical)
}

function isSensitive(moduleClass: string): moduleClass is SensitiveModuleClass {
  return (SENSITIVE_MODULE_CLASSES as readonly string[]).includes(moduleClass)
}

/** Per-action decision against a resolved, current grant. Pure. */
function decide(grant: CapabilityGrant, action: CapabilityAction): EnforcementDecision {
  switch (action.type) {
    case 'effect':
      return grant.granted_effects.includes(action.effect)
        ? ALLOW
        : { allowed: false, reason: 'not_in_envelope' }
    case 'binding':
      return grant.granted_bindings.includes(action.entityType)
        ? ALLOW
        : { allowed: false, reason: 'not_in_envelope' }
    case 'media':
      return grant.media_ok ? ALLOW : { allowed: false, reason: 'media_not_granted' }
    case 'sensitive':
      // A non-sensitive class needs no consent gate; a sensitive one requires explicit consent.
      if (!isSensitive(action.moduleClass)) return ALLOW
      return grant.consented_sensitive_modules.includes(action.moduleClass)
        ? ALLOW
        : { allowed: false, reason: 'sensitive_consent_missing' }
    case 'external_in':
      return decideExternal(grant.external_in_ok)
    case 'external_out':
      return decideExternal(grant.external_out_ok)
    default: {
      // Total fail-closed (IR-4): an unrecognized action denies, never crashes. The `never`
      // binding also makes this switch exhaustive at compile time — a new CapabilityAction
      // member forces a decision here rather than silently falling through.
      const _exhaustive: never = action
      void _exhaustive
      return { allowed: false, reason: 'not_in_envelope' }
    }
  }
}

/**
 * External reach = the grant BOOLEAN gate (XCU-07). The compositional-exfiltration union
 * (INV-5 / XCU-08) is enforced ACROSS the two action checks: to read sensitive AND reach
 * external, a cap must pass both `sensitive` (needs consent) and `external_*` (needs the
 * boolean) — so an unconsented sensitive read is blocked before any external reach. Per-source
 * LAYER (#44) and per-target consent + audit (#43) are delegated — not gated here.
 */
function decideExternal(boolOk: boolean): EnforcementDecision {
  return boolOk ? ALLOW : { allowed: false, reason: 'not_in_envelope' }
}

export interface CapabilityEnforcer {
  /** Non-throwing decision: allow/deny + reason. Fail-closed on any missing input. */
  checkAction(defId: string, action: CapabilityAction): Promise<EnforcementDecision>
  /** Guard variant: throws CapabilityDenied on deny. */
  assertPermitted(defId: string, action: CapabilityAction): Promise<void>
  /** Resolve the (parsed) grant for a def, or null if none / revoked. */
  getGrant(defId: string): Promise<CapabilityGrant | null>
  /** True iff the grant's hash matches the def's current declaration (else re-grant needed). */
  isEnvelopeCurrent(defId: string): Promise<boolean>
  /** S2 — record the user's grant (validates envelope ⊆ declaration, stamps the hash, syncs). */
  grant(defId: string, envelope: GrantEnvelope): Promise<CapabilityGrant>
  /** S2 — revoke the grant (soft-delete; still syncs; next check fails closed on no_grant). */
  revoke(defId: string): Promise<void>
}

export function createCapabilityEnforcer(
  db: DrizzleDb,
  deviceId: string,
  registry: CapabilityRegistry,
): CapabilityEnforcer {
  // softDelete:true — a revoke soft-deletes the grant (still syncs), and findWhere excludes it.
  const grantRepo = createRepository(db, capabilityGrants, {
    deviceId,
    encryptedFields: [],
    softDelete: true,
  })

  function rowToGrant(row: CapabilityGrantRow): CapabilityGrant {
    return {
      capability_def_id: row.capability_def_id,
      granted_bindings: JSON.parse(row.granted_bindings) as string[],
      granted_effects: JSON.parse(row.granted_effects) as CapabilityGrant['granted_effects'],
      media_ok: row.media_ok,
      external_in_ok: row.external_in_ok,
      external_out_ok: row.external_out_ok,
      consented_sensitive_modules: JSON.parse(row.consented_sensitive_modules) as string[],
      granted_envelope_hash: row.granted_envelope_hash,
    }
  }

  // NOTE: Repository.findWhere runs the raw clause and does NOT apply the soft-delete filter
  // (only findAll/findById/count do). So we filter deleted_at explicitly — a revoked grant must
  // not resolve. `activeGrant` is the single source of that clause, reused by revoke.
  function activeGrant(defId: string): SQL {
    // and() types as SQL | undefined (its all-undefined case); both args here are always defined.
    return and(
      eq(capabilityGrants.capability_def_id, defId),
      isNull(capabilityGrants.deleted_at),
    ) as SQL
  }

  async function getGrant(defId: string): Promise<CapabilityGrant | null> {
    const rows = await grantRepo.findWhere(activeGrant(defId))
    return rows.length === 0 ? null : rowToGrant(rows[0])
  }

  function envelopeCurrent(def: CapabilityDefinition, grant: CapabilityGrant): boolean {
    return grant.granted_envelope_hash === canonicalEnvelopeHash(def)
  }

  async function isEnvelopeCurrent(defId: string): Promise<boolean> {
    const def = await registry.get(defId) // throws CapabilityNotFound (a real bug, not a policy deny)
    const grant = await getGrant(defId)
    if (!grant) return false // no grant ⇒ not current (fail closed)
    return envelopeCurrent(def, grant)
  }

  async function checkAction(
    defId: string,
    action: CapabilityAction,
  ): Promise<EnforcementDecision> {
    const def = await registry.get(defId) // throws CapabilityNotFound if unresolvable
    if (!def.is_user_type) return ALLOW // INV-2 — shipped/trusted bypass, no grant read
    const grant = await getGrant(defId)
    if (!grant) return { allowed: false, reason: 'no_grant' } // INV-1
    if (!envelopeCurrent(def, grant)) return { allowed: false, reason: 'envelope_changed' } // INV-6
    return decide(grant, action)
  }

  async function assertPermitted(defId: string, action: CapabilityAction): Promise<void> {
    const decision = await checkAction(defId, action)
    if (!decision.allowed) {
      throw new CapabilityDenied(defId, decision.reason ?? 'not_in_envelope')
    }
  }

  // --- S2 — grant lifecycle (writes) ----------------------------------------

  // INV-3 — the granted envelope may not exceed the def's declaration. The consent booleans
  // (media/external/sensitive) are the user's decisions with no declaration counterpart
  // (media/external are encoded in the declared effects), so only bindings + effects are subset-checked.
  function assertWithinDeclaration(def: CapabilityDefinition, envelope: GrantEnvelope): void {
    const extraBindings = envelope.granted_bindings.filter((b) => !def.bindings.includes(b))
    if (extraBindings.length > 0) {
      throw new GrantExceedsDeclaration(def.id, `bindings not declared: ${extraBindings.join(', ')}`)
    }
    const extraEffects = envelope.granted_effects.filter((e) => !def.effects.includes(e))
    if (extraEffects.length > 0) {
      throw new GrantExceedsDeclaration(def.id, `effects not declared: ${extraEffects.join(', ')}`)
    }
  }

  async function revoke(defId: string): Promise<void> {
    // Soft-delete each ACTIVE grant (idempotent; delete() sets deleted_at and syncs).
    const rows = await grantRepo.findWhere(activeGrant(defId))
    for (const row of rows) await grantRepo.delete(row.id)
  }

  async function grant(defId: string, envelope: GrantEnvelope): Promise<CapabilityGrant> {
    const def = await registry.get(defId) // throws CapabilityNotFound if unresolvable
    assertWithinDeclaration(def, envelope)
    await revoke(defId) // re-grant: retire any existing active grant so exactly one stays live
    const row = await grantRepo.create({
      capability_def_id: defId,
      granted_bindings: JSON.stringify(envelope.granted_bindings),
      granted_effects: JSON.stringify(envelope.granted_effects),
      media_ok: envelope.media_ok,
      external_in_ok: envelope.external_in_ok,
      external_out_ok: envelope.external_out_ok,
      consented_sensitive_modules: JSON.stringify(envelope.consented_sensitive_modules),
      granted_envelope_hash: canonicalEnvelopeHash(def), // symmetric with the drift check
    })
    return rowToGrant(row)
  }

  return { checkAction, assertPermitted, getGrant, isEnvelopeCurrent, grant, revoke }
}
