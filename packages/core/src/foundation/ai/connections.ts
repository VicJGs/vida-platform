// ============================================================================
// foundation/ai — ai_connections config registry (S4 · XCU-25)
//
// The dedicated AI layer's per-provider connection config (ADR-015 §3.5 — separate
// from general integrations). The config carries NO key: the BYO-key credential is
// mediator-custodied, NEVER in agent/sandbox reach (XCU-25/IR-6) — so a registration
// whose key is not mediator-custodied is REFUSED (fail-closed, key_not_mediated).
// In-memory at M1, mirroring the built capability/effect/integration registries; the
// durable `ai_connections` table ([E] + mediator key custody) is M2 (the store port).
// Factory-of-closures (no `this`).
// ============================================================================

import { resolveMode } from './modes'
import {
  AiConnectionDenied,
  type AiConnection,
  type AiConnectionRegistry,
  type AiConnectionStorePort,
} from './types'

export function createAiConnectionRegistry(ports?: { store?: AiConnectionStorePort }): AiConnectionRegistry {
  // M1 default: an in-memory map (deterministic list, ingestion-registry precedent).
  // M2 swaps a durable [E] store behind this port.
  const local = new Map<string, AiConnection>()
  const store: AiConnectionStorePort = ports?.store ?? {
    put(c) {
      local.set(c.integrationId, c)
    },
    get(id) {
      return local.get(id) ?? null
    },
    list() {
      return [...local.values()]
    },
  }

  function register(connection: AiConnection): AiConnection {
    // XCU-25 — the key is mediator-custodied; any other custody is refused before the
    // config is ever persisted (the secret never enters an in-reach store).
    if (connection.keyCustody !== 'mediator') {
      throw new AiConnectionDenied(connection.integrationId, 'key_not_mediated')
    }
    // Fail-loud on a garbage mode (propagates UnknownAiMode — a bug, not a policy deny).
    resolveMode(connection.mode)
    store.put(connection)
    return connection
  }

  function get(integrationId: string): AiConnection | null {
    return store.get(integrationId)
  }

  // Deterministic order (sorted by id) — matches the ingestion registry list contract.
  function list(): AiConnection[] {
    return store.list().sort((a, b) => a.integrationId.localeCompare(b.integrationId))
  }

  return { register, get, list }
}
