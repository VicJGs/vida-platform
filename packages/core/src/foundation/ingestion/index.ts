// Foundation substrate: the device-mediated ingestion guard (XS-ingestion #44 · ADR-014 · XCU-01…05,09…16).
// The one model by which every module's external data crosses the vault boundary — device-mediated (never
// server-proxied), three honestly-disclosed layers, whole-set public-reference fetch, reconcile-on-import
// staging, add-only feed dedup, integration-identity + normalization contract, opt-in/revocable lifecycle.
// Decides/normalizes/registers; holds no credential, makes no network call. No schema at M1 — the durable
// stores (import_staging, connection_config, integration registry) are M2 via the ports.
export * from './types'
export { classifyLayer, buildDisclosure } from './classification'
export { createIngestionGuard } from './guard'
export { autoMatch, commitStaged, dedupeFeed, createInMemoryStagingPort } from './reconcile'
export { createPublicReferenceEngine } from './public-reference'
export { createIntegrationRegistry } from './registry'
