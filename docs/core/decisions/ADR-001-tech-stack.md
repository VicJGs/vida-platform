# ADR-001: Technology Stack

**Status:** Accepted
**Date:** 2026-03-07
**Decision Makers:** Victor J.
**Context:** Vida Platform — Zero-knowledge, local-first, multiplatform life management SaaS
**Amended:** 2026-07-16 (F5 / D6) — §6 Key Model: `HKDF` → `BLAKE2b-256` (keyed), aligning this ADR to the authoritative implementation (`packages/core/src/encryption/vault.ts`, tested). Doc-only alignment; no code changed.

---

## 1. Summary

This document locks all technology choices for the Vida Platform. Every library, framework, and service listed here is the **canonical choice** — no alternatives should be introduced without a new ADR.

---

## 2. Core Principles Driving Choices

1. **TypeScript everywhere** — one language across all platforms, shared business logic
2. **Local-first** — user's device is the source of truth, server is a sync relay
3. **Zero-knowledge** — all user content encrypted client-side, server stores only opaque blobs
4. **Code reuse** — monorepo with shared packages; write once, run on web/mobile/desktop
5. **Performance at scale** — libraries chosen for long-term datasets (years of usage, thousands of records)

---

## 3. Platform Technologies

| Platform | Technology | Rationale |
|----------|-----------|-----------|
| **Web** | React + Vite | Fast, SPA (no SSR needed — data is local), huge ecosystem |
| **Mobile (iOS + Android)** | Expo (React Native) | Shares React patterns with web, Expo simplifies builds |
| **Desktop (Win/Mac/Linux)** | Tauri v2 + React | Lightweight (not Electron), Rust security layer, same React UI |
| **Shared Core** | TypeScript package (`packages/core`) | Business logic, encryption, sync, data models — written once |
| **Sync Server** | Hono on Cloudflare Workers | Minimal zero-knowledge blob relay. Hono is runtime-agnostic (portable to Node/Bun/Deno for self-hosting if needed) |
| **Web Hosting** | Cloudflare Pages | Free tier, pairs with Workers |
| **Blob Storage** | Cloudflare R2 | S3-compatible, cheap, stores encrypted sync blobs |

---

## 4. Monorepo & Tooling

| Tool | Version | Role |
|------|---------|------|
| **Turborepo** | Latest | Monorepo orchestration, task caching, dependency graph |
| **pnpm** | 9.x | Package manager with workspace support |
| **Node.js** | 22 LTS | Runtime (active support until 2027) |
| **TypeScript** | 5.7+ | Strict mode across all packages |
| **ESLint** | Latest | Linting |
| **Prettier** | Latest | Code formatting |

---

## 5. Database

| Platform | Implementation | Rationale |
|----------|---------------|-----------|
| **Web** | wa-sqlite + OPFS | True persistent storage via Origin Private File System. Better performance than sql.js. **Custom WASM build with SQLCipher bundled** for full DB encryption at rest |
| **Mobile** | expo-sqlite (with SQLCipher support) | Native SQLite with encryption at rest. Note: `expo-sqlite` doesn't bundle SQLCipher by default — requires custom native build or alternative like `react-native-quick-sqlite` with SQLCipher. Exact approach decided in Phase 1.3 |
| **Desktop** | Tauri SQLite plugin + SQLCipher | Native SQLite with SQLCipher encryption at rest |
| **ORM** | Drizzle ORM | Type-safe, lightweight, works with SQLite across all platforms |

### Encryption at Rest Strategy

**Both layers:**
- **SQLCipher** — full database file encryption at rest on all platforms (custom WASM build for web)
- **Application-level** — sensitive fields encrypted with libsodium before writing to SQLite; encrypted blobs for sync

---

## 6. Encryption & Authentication

| Concern | Library/Protocol | Details |
|---------|-----------------|---------|
| **E2E Encryption** | libsodium.js (client-side only — server never encrypts/decrypts) | XChaCha20-Poly1305 for data, Argon2id for key derivation, BLAKE2b-256 (keyed) for Vault Key |
| **Authentication** | SRP (Secure Remote Password) | Zero-knowledge — server never sees passwords. Stores only salt + SRP verifier |
| **Key Model** | Vault Key = BLAKE2b-256(key = Master Key, message = Account Key) | Master Key derived from password via Argon2id; Account Key is the user's recovery key. **BLAKE2b keyed-hash** (libsodium-native `crypto_generichash`) replaces HKDF: both inputs are already uniform 256-bit keys, so HKDF's entropy-extraction step buys nothing here — a keyed PRF is sufficient, faster, and adds no extra primitive on WASM. ⚠ **Forward-flag:** no domain-separation label today (one Vault Key only); if a future feature derives *additional* sub-keys from the same Master+Account pair, add per-purpose domain separation then (BLAKE2b `personal`/`salt` or a labelled message). Authoritative impl: `packages/core/src/encryption/vault.ts`. |

---

## 7. Sync & Conflict Resolution

| Data Type | Strategy | Library |
|-----------|----------|---------|
| **Note/editor content** | CRDT (conflict-free merge) | **Yjs** — native TipTap integration via `y-prosemirror` |
| **Structured data** (tasks, habits, finance, etc.) | LWW (Last-Writer-Wins) with logical timestamps | Custom — simpler, sufficient for single-user multi-device |
| **Sync transport** | Encrypted blob push/pull | Custom over Hono API endpoints |
| **Offline behavior** | Local queue, flush on reconnect | Custom offline queue in `packages/core/sync` |

---

## 8. Editor

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Block Editor** | TipTap (ProseMirror-based) | Yjs-native CRDT sync, extensible custom blocks, React-first, headless, battle-tested |
| **CRDT binding** | y-prosemirror | First-class Yjs integration for offline merge |
| **Markdown serialization** | Custom serializer (TipTap JSON <-> Markdown) | Round-trip lossless |
| **PDF Export** | @react-pdf/renderer (web/desktop), expo-print (mobile) | Export notes/journals to PDF. `@react-pdf/renderer` targets web/Node only — mobile uses `expo-print` |
| **DOCX Export** | docx (npm) | Export notes/journals to Word |
| **Mobile editor** | **Hybrid** — TipTap in WebView (content area) + native RN toolbar/slash menu/chrome | Full custom block support with native-feeling UI around the editor |

---

## 9. UI & Design System

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Component Library** | **Tamagui** | Universal components — single API for web + React Native + desktop. Replaces shadcn/ui (web-only). Includes built-in animation system |
| **Animations** | Tamagui built-in (uses react-native-reanimated on native) | Cross-platform, no extra dependency |
| **Icons** | Lucide React / lucide-react-native | Clean, consistent, tree-shakeable. Works on web + RN |
| **Theme** | Light/dark via Tamagui theme system | CSS variables on web, native theming on mobile |

**Decision:** Neumorphic design from Life OS is **dropped**. Tamagui provides the design system across all platforms.

---

## 10. Data Visualization

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Charts** | **Chart.js** + react-chartjs-2 | Canvas-based — handles large datasets (years of habits, thousands of transactions) without DOM bloat. Built-in data decimation. ~60KB. On mobile: runs in WebView |
| **Graph (Neural View)** | **Sigma.js** | WebGL-rendered — handles 10K+ nodes for note/relationship graphs after years of usage. ~50KB. On mobile: runs in WebView |

**Mobile strategy:** Both Chart.js and Sigma.js run in WebViews on React Native, consistent with the hybrid editor approach. This ensures full feature parity across platforms.

---

---

## 11. Data Parsing

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **ICS/iCal Parsing** | ical.js | Calendar feed parsing for Learning module (class schedules) |

---

## 12. State & Data Management

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Client State** | Zustand | Lightweight, works across web/RN. 12 stores already proven in Life OS |
| **Async State** | React Query (TanStack Query) v5 | Caches local SQLite reads in memory, manages loading/error states, auto-invalidates on writes. Same patterns from Life OS, querying local DB instead of Supabase |
| **Schema Validation** | Zod | TypeScript-first. Used for forms, API payloads, DB records, TanStack Router param validation |
| **Forms** | TanStack Form + Zod | Framework-agnostic (works on web + RN). Integrates with Zod for validation. Matches TanStack Router ecosystem |

---

## 13. Routing

| Platform | Router | Rationale |
|----------|--------|-----------|
| **Web + Desktop** | TanStack Router | Fully type-safe routes, built-in search param validation with Zod, excellent TypeScript DX |
| **Mobile** | Expo Router | File-based routing native to Expo/React Native |

---

## 14. HTTP & Networking

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **HTTP Client** | Native `fetch` | Built into all runtimes (web, RN, Tauri). Zero dependency. Sufficient for blob sync and simple API calls |
| **Server Framework** | Hono | Fast, lightweight, built for edge runtimes. First-class Cloudflare Workers support. **Runtime-agnostic** — same code portable to Node/Bun/Deno for self-hosting |

---

## 15. Date & Time

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Date Library** | date-fns | Tree-shakeable (import only what you use), immutable, pure functions. Lightweight per-function. TypeScript-first |

---

## 16. Testing

| Layer | Tool | Rationale |
|-------|------|-----------|
| **Unit + Integration** | Vitest | Native Vite integration, fast, Jest-compatible API |
| **Component Testing** | @testing-library/react (web/desktop), @testing-library/react-native (mobile) | Standard companion to Vitest for rendering and asserting on components |
| **E2E** | Playwright | Multi-browser, fast, excellent SPA testing (handles OPFS/local storage well) |

---

## 17. CI/CD

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **CI/CD** | GitHub Actions | Free tier (2,000 min/month). Lint, typecheck, test on push. Deploy on merge to main |
| **Web Deploy** | Cloudflare Pages (via GitHub Actions) | Auto-deploy on merge |
| **Mobile Build** | Expo EAS Build | Cloud builds for iOS/Android. Free tier (30 builds/month) |
| **Desktop Build** | Tauri + GitHub Actions | Cross-platform matrix build (Win/Mac/Linux) |
| **Server Deploy** | Wrangler (Cloudflare CLI) | Deploy Workers via GitHub Actions |

---

## 18. PWA

**Decision:** PWA is **dropped**. The platform focuses on native apps (Expo for mobile, Tauri for desktop) and the web SPA. No Workbox, no service worker, no installable web app.

---

## 19. Libraries NOT Carried Over from Life OS

| Life OS Library | Status | Replacement |
|----------------|--------|-------------|
| Supabase (Auth, DB, Storage, Realtime) | **Dropped** | SQLite + libsodium + SRP + Hono sync server |
| Dexie.js (IndexedDB) | **Dropped** | wa-sqlite + OPFS |
| Capacitor | **Dropped** | Expo (React Native) |
| React Router | **Dropped** | TanStack Router (web), Expo Router (mobile) |
| Workbox / PWA | **Dropped** | Not needed — native apps replace installable web app |
| Neumorphic design system | **Dropped** | Tamagui |

---

## 20. Complete Dependency Map

```
packages/core
├── libsodium.js          # Encryption
├── yjs                   # CRDT for editor content
├── drizzle-orm           # Database ORM
├── date-fns              # Date utilities
├── zod                   # Schema validation
└── ical.js               # ICS parsing

packages/editor
├── @tiptap/core          # Block editor
├── @tiptap/react         # React bindings
├── y-prosemirror         # Yjs <-> ProseMirror bridge
├── @react-pdf/renderer   # PDF export
└── docx                  # DOCX export

packages/ui
├── tamagui               # Universal component library
├── lucide-react          # Icons (web)
└── lucide-react-native   # Icons (mobile)

apps/web
├── react                 # UI framework
├── vite                  # Build tool
├── @tanstack/react-router # Routing
├── @tanstack/react-query  # Async state
├── @tanstack/react-form   # Forms
├── zustand               # Client state
├── wa-sqlite             # SQLite WASM (with SQLCipher)
├── chart.js + react-chartjs-2 # Charts
└── @sigma/react          # Graph visualization

apps/mobile
├── expo                  # React Native framework
├── expo-sqlite           # Native SQLite (SQLCipher support — see note below)
├── expo-router           # File-based routing
├── react-native-webview  # For editor, charts, graphs
├── react-native-reanimated # Animations (via Tamagui)
├── @tanstack/react-query  # Async state
├── @tanstack/react-form   # Forms
├── zustand               # Client state
├── zod                   # Schema validation
└── expo-print            # PDF generation on mobile (replaces @react-pdf/renderer)

apps/desktop
├── @tauri-apps/api       # Tauri APIs
├── tauri-plugin-sql      # Native SQLite (with SQLCipher)
└── (shares web React codebase)

apps/server
├── hono                  # HTTP framework
├── @cloudflare/workers-types # Worker types
└── secure-remote-password # SRP verification (or Web Crypto API — decide in Phase 1.4)
```

---

## 21. Decisions Deferred

| Decision | Deferred To |
|----------|-------------|
| Specific Tamagui theme configuration | Phase 0.5 (Monorepo Init) |
| SQLCipher WASM build pipeline details | Phase 1.3 (Database Layer) |
| Mobile SQLite + SQLCipher implementation (`expo-sqlite` custom build vs `react-native-quick-sqlite`) | Phase 1.3 (Database Layer) |
| SRP server library (`secure-remote-password` npm vs Web Crypto API implementation) | Phase 1.4 (Auth System) |
| Server metadata storage (Cloudflare D1 vs KV for SRP verifiers, user records, device lists) | Phase 1.4 (Auth System) / 1.7 (Sync Server) |
| Zustand stores placement (`packages/core` vanilla vs per-app React hooks) | Phase 0.5 (Monorepo Init) |
| Platform-conditional icon exports (`lucide-react` vs `lucide-react-native` in `packages/ui`) | Phase 0.5 (Monorepo Init) / 1.9 (Design System) |
| Sigma.js vs alternatives (if WebGL issues arise) | Phase 10 (Relationship Management) |
| Push notification service (Expo Notifications vs OneSignal) | Phase 6.7 (Mobile Push) |
| Billing/payment provider | Post-Phase 12 |

---

## 22. Version Pinning

| Dependency | Minimum Version |
|------------|----------------|
| Node.js | 22.x LTS |
| TypeScript | 5.7+ |
| pnpm | 9.x |
| React | 19.x |
| Vite | 7.x (or latest stable) |
| Expo SDK | Latest stable at project start |
| Tauri | 2.x |

---

*This ADR is the single source of truth for technology choices. Any deviation requires a new ADR with justification.*
