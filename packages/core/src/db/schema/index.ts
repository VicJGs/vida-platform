// Public surface for the v2 schema primitives. Table modules (DB-3+) are re-exported here as authored.
// The v1 monolith was quarantined to `../_legacy/schema.v1.ts` in Part 2 (ADR-018) — with no adjacent
// `schema.ts` file, `./db/schema` (index.ts) and `./schema` (adapter.ts) now unambiguously resolve to THIS
// directory. Tables are authored per-feature at build phase (ADR-016 §3.5 / ADR-017).
export * from './_shared'
export * from './_registry'
// Foundation tables (device-local infra, not domain data): DB-6 sync_queue.
export * from './foundation/sync-queue'
