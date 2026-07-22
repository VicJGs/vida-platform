// Public surface for the v2 schema primitives. Table modules (DB-3+) are re-exported here as authored.
// The v1 monolith `../schema.ts` keeps its own import path '@vida/core/db/schema' — a file resolves before a
// same-named directory (moduleResolution: "bundler"), so existing consumers (index.ts, adapter.ts) are unaffected.
export * from './_shared'
export * from './_registry'
