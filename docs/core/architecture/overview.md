---
id: ARCH-overview
kind: architecture
module: platform
status: active
supersedes: []
summary: Vida is a TypeScript monorepo where each app is a thin shell over @vida/core; every write runs service → repository → encrypt seam → DatabaseAdapter → local SQLite, and encryption and sync are seams kept dormant until their milestone.
anchors:
  - packages/core/src/foundation/
  - packages/core/src/services/
  - packages/core/src/db/repository.ts
  - packages/core/src/db/adapter.ts
  - packages/core/src/sync/
  - apps/web/src/db/web-adapter.ts
  - apps/server/src/index.ts
tokens: 998
---

# Architecture overview

Vida is local-first and zero-knowledge. The user's device holds the data in local SQLite. The server only relays opaque encrypted blobs, and it does that only once sync is on. Each app is a thin shell over one shared TypeScript core, so business logic is written once ([ADR-001](../decisions/ADR-001-tech-stack.md)).

## Where code lives

- **`packages/types/src/`**: shared types and Zod schemas. `@vida/core` has no models tier of its own ([ADR-018](../decisions/ADR-018-repository-structure-from-documentation.md)).
- **`packages/core/src/foundation/`**: the substrate tier, one folder per cross-cutting substrate ([ADR-018](../decisions/ADR-018-repository-structure-from-documentation.md)).
- **`packages/core/src/services/`**: the module tier, one folder per module ([ADR-018](../decisions/ADR-018-repository-structure-from-documentation.md)).
- **`packages/core/src/db/`**: storage. Hand-written migrations define the tables. The Drizzle objects mirror them only to type queries ([ADR-002](../decisions/ADR-002-data-model.md), [ADR-016](../decisions/ADR-016-storage-layer-rebuild-from-zero.md)).
- **`packages/core/src/encryption/`**: client-side crypto ([ADR-001](../decisions/ADR-001-tech-stack.md) §6).
- **`packages/core/src/sync/`**: sync ([ADR-003](../decisions/ADR-003-sync-protocol.md)).
- **`packages/editor/src/`, `packages/ui/src/`**: the block editor and shared components ([ADR-001](../decisions/ADR-001-tech-stack.md) §8–9).
- **`apps/web`, `apps/desktop`, `apps/mobile`**: the Vite, Tauri and Expo shells ([ADR-001](../decisions/ADR-001-tech-stack.md) §3, [ADR-017](../decisions/ADR-017-features-first-resequencing-defer-encryption-sync.md)).
- **`apps/server`**: the relay, a Hono app (`apps/server/src/index.ts:4`).

## The write path

1. A screen calls a module service in `packages/core/src/services/<module>`.
2. The service validates, then writes through the repository.
3. The repository passes each row through the encrypt seam, `encryptRow` (`packages/core/src/db/repository.ts:118`), and reads come back through `decryptRow` (`packages/core/src/db/repository.ts:140`).
4. Rows reach SQLite through the platform's `DatabaseAdapter` (`packages/core/src/db/adapter.ts:96`). On the web, that adapter is wa-sqlite in a Web Worker (`apps/web/src/db/web-adapter.ts:33`). Only the adapter changes from one platform to the next.

Each table spreads the shared `syncColumns` and `baseColumns` (`packages/core/src/db/schema/_shared.ts:24`, `:34`). Migrations are registered in `ALL_MIGRATIONS` (`packages/core/src/db/migrations/runner.ts:60`). Column conventions are [ADR-002](../decisions/ADR-002-data-model.md)'s.

## Dormant seams

These seams exist in the code today but stay inert until their milestone:

- **Field encryption** passes rows through unchanged while a table has no encrypted fields or there is no key (`packages/core/src/db/repository.ts:125`). It turns on with the encryption pass in [ADR-019](../decisions/ADR-019-build-sequencing-features-then-integrations-then-encryption.md).
- **SQLCipher at rest** defaults to an empty passphrase (`packages/core/src/db/adapter.ts:158`). It also turns on with the encryption pass in [ADR-019](../decisions/ADR-019-build-sequencing-features-then-integrations-then-encryption.md).
- **Sync**: the merge, queue and Yjs stubs throw `SyncNotActivated` (`packages/core/src/sync/resolver.ts:17`, `crdt.ts:18`, `queue.ts:18`). Sync works as [ADR-003](../decisions/ADR-003-sync-protocol.md) describes once ADR-019's multi-device milestone turns it on.

## Build order

Why the build order is what it is: [ADR-016](../decisions/ADR-016-storage-layer-rebuild-from-zero.md), [ADR-017](../decisions/ADR-017-features-first-resequencing-defer-encryption-sync.md), [ADR-018](../decisions/ADR-018-repository-structure-from-documentation.md), [ADR-019](../decisions/ADR-019-build-sequencing-features-then-integrations-then-encryption.md). The order itself is tracked in Linear, in the M1–M4 milestones.
