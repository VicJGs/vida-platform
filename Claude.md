# Vida Platform

Zero-knowledge, local-first, multiplatform life management SaaS.

## Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Language**: TypeScript everywhere (strict mode)
- **Packages**: `@vida/types`, `@vida/core`, `@vida/editor`, `@vida/ui`
- **Apps**: `@vida/web` (Vite+React), `@vida/mobile` (Expo), `@vida/desktop` (Tauri v2), `@vida/server` (Hono on Cloudflare Workers)

## Key Decisions (ADR-001)

- Local-first: SQLite on all platforms (wa-sqlite/OPFS for web, expo-sqlite for mobile, Tauri plugin for desktop)
- Zero-knowledge: All data encrypted client-side with libsodium (XChaCha20-Poly1305), server stores only opaque blobs
- Auth: SRP (Secure Remote Password) — server never sees passwords
- Editor: TipTap (ProseMirror-based) with Yjs CRDT sync
- UI: Tamagui (universal components across web/mobile/desktop)
- ORM: Drizzle ORM for type-safe SQLite access
- State: Zustand (client state) + React Query (async/DB state)
- Routing: TanStack Router (web/desktop), Expo Router (mobile)

## Commands

- `pnpm dev` — Start all apps in dev mode
- `pnpm build` — Build all packages and apps
- `pnpm typecheck` — Type-check all packages
- `pnpm lint` — Lint all packages
- `pnpm test` — Run all tests
- `pnpm format` — Format code with Prettier

## Conventions

- Primary keys: UUIDv7 (time-sortable) as TEXT
- Timestamps: Unix milliseconds as INTEGER
- Booleans: INTEGER (0/1)
- JSON data: TEXT (stringified JSON)
- Monetary values: INTEGER in cents
- No inline `notes` columns — all notes use `pages` table via `entity_type`/`entity_id`
- Sync metadata (`_sync_*`) on every syncable table
- Field-level encryption marked with `-- [E]` in schema
- Package scope: `@vida/*`
