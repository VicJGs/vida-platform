<!-- Last updated: 2026-06-07 by /init -->
## Stack
- Monorepo: Turborepo + pnpm workspaces
- Language: TypeScript 5.7+ (strict), Node 22 LTS, React 19
- Packages: @vida/types, @vida/core, @vida/editor, @vida/ui (Tamagui)
- Web: Vite + React SPA, TanStack Router, wa-sqlite + OPFS (SQLCipher WASM)
- Mobile: Expo (React Native), Expo Router, expo-sqlite
- Desktop: Tauri v2 + React (shares web codebase)
- Server: Hono on Cloudflare Workers, SRP auth, R2 blob storage
- Privacy: zero-knowledge, local-first, libsodium (XChaCha20-Poly1305), Drizzle ORM

## Patterns in Use
[filled as sessions progress]

## ADR Index
| ADR | Decision | Status | Date |
|-----|----------|--------|------|
| ADR-001 | Tech stack | Accepted | (see docs/decisions/) |
| ADR-002 | Data model | Accepted | (see docs/decisions/) |
| ADR-003 | Sync protocol | Accepted | (see docs/decisions/) |
