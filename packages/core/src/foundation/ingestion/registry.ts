// ============================================================================
// foundation/ingestion — integration registry + connector seams (S5 · XCU-14/15/16)
//
// XCU-14 — the stable integration-identity + per-source normalization contract both
// layers emit to, so a Layer-3→Layer-1 upgrade is a connector migration, not a data
// migration (IR-11). XCU-15 — attach a curated native adapter to an existing identity
// (the real source-direct connectors + qualification policy are M2 · U-1). XCU-16 —
// a user-managed connector is a sandboxed ADR-010 capability whose credentials are
// mediator-custodied (never held by the connector, XCU-09). In-memory at M1 (the
// durable registry rows are M2 · U-4); mirrors the built capability/effect registries.
// ============================================================================

import {
  RegistryDenied,
  type IngestionSource,
  type IntegrationRegistry,
  type NativeAdapterSeam,
  type NormalizationContract,
  type UserConnectorDef,
} from './types'

export function createIntegrationRegistry(): IntegrationRegistry {
  const entries = new Map<string, { source: IngestionSource; contract: NormalizationContract }>()
  const adapters = new Map<string, NativeAdapterSeam>()

  function register(source: IngestionSource, contract: NormalizationContract): void {
    if (entries.has(source.integrationId)) throw new RegistryDenied(source.integrationId, 'duplicate_identity')
    entries.set(source.integrationId, { source, contract })
  }

  function get(integrationId: string) {
    return entries.get(integrationId) ?? null
  }

  // Deterministic order (sorted by identity) — mirrors the built capability/effect registries' list().
  function list(): IngestionSource[] {
    return [...entries.values()]
      .map((e) => e.source)
      .sort((a, b) => a.integrationId.localeCompare(b.integrationId))
  }

  // XCU-15 / IR-11 — attach a native adapter to an EXISTING integration-identity: the source upgrades to the
  // `native` layer while keeping the same integrationId + normalization contract (connector migration, not
  // data migration). Attaching to an unregistered identity is refused.
  function registerNativeAdapter(integrationId: string, adapter: NativeAdapterSeam): void {
    const entry = entries.get(integrationId)
    if (!entry) throw new RegistryDenied(integrationId, 'unknown_integration')
    adapters.set(integrationId, adapter)
    entries.set(integrationId, {
      source: { ...entry.source, layer: 'native' },
      contract: entry.contract,
    })
  }

  // XCU-16 — a user-managed connector must be mediator-custodied (it never holds its own credential, XCU-09);
  // a def declaring any other custody is refused. Registered at the `user-managed` layer.
  function registerUserManagedConnector(def: UserConnectorDef): void {
    if (def.credentialCustody !== 'mediator') {
      throw new RegistryDenied(def.integrationId, 'credential_not_mediated')
    }
    register(
      { integrationId: def.integrationId, layer: 'user-managed', normalizationContractId: def.contract.id },
      def.contract,
    )
  }

  return { register, get, list, registerNativeAdapter, registerUserManagedConnector }
}
