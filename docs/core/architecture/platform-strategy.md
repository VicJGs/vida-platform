# Platform Strategy

This document describes how the Vida Platform supports web, mobile, and desktop from a single monorepo. It specifies which code is shared, which is platform-specific, and how each platform handles database access, the editor, and data visualization.

**Audience:** Developers deciding where to place new code, or setting up a new platform target.

**Governs:** All platform-specific adapter implementations and the decision of where to place platform-specific versus shared code.

> **Implementation status (2026-07-25):** The code-sharing strategy here is substrate-neutral and current. Two
> foundation notes: the editor renders **capability blocks from the open registry** (ADR-008), not a closed extension
> set (§3.3); and delivery follows **ADR-017** — web SPA (A) first, then Tauri desktop (D), with mobile later and
> encryption/sync/auth on a deferred hardening pass. Substrate primitives cite their owning ADR; code/directory homes
> are decided in a later structural phase.

---

## 1. Platform Targets

| Platform                    | Technology                 | Runtime                | Status                                        |
| --------------------------- | -------------------------- | ---------------------- | --------------------------------------------- |
| **Web**                     | React 19 + Vite (SPA)      | Browser                | Active — shell + database adapter implemented |
| **Mobile (iOS + Android)**  | Expo (React Native)        | Native + WebViews      | Phase 3 — scaffolded, not implemented         |
| **Desktop (Win/Mac/Linux)** | Tauri v2 + React           | Webview (Rust backend) | Phase 6 — scaffolded, not implemented         |
| **Server**                  | Hono on Cloudflare Workers | Edge runtime           | Active — minimal health endpoint implemented  |

---

## 2. Code Sharing Matrix

Every package and app mapped to every platform. Shows whether the code is used directly, adapted, or not applicable.

### Shared Packages

| Package           | Web    | Mobile  | Desktop | Server   | Notes                                                                                                   |
| ----------------- | ------ | ------- | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `packages/types`  | Direct | Direct  | Direct  | Direct   | Pure TypeScript types + Zod schemas. Zero platform dependencies. Used everywhere.                       |
| `packages/core`   | Direct | Direct  | Direct  | Partial  | Business logic, encryption, repository, services. Server uses only type imports and API contract types. |
| `packages/editor` | Direct | Adapted | Direct  | Not used | TipTap editor. Runs natively on web/desktop. Runs inside a WebView on mobile.                           |
| `packages/ui`     | Direct | Adapted | Direct  | Not used | Tamagui universal components. Web/desktop render as HTML. Mobile renders as React Native views.         |

### Platform-Specific Apps

| App            | Platform | Shares With          | Key Differences                                                                                  |
| -------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/web`     | Web      | Imports all packages | wa-sqlite + OPFS database adapter, TanStack Router, Vite build                                   |
| `apps/mobile`  | Mobile   | Imports all packages | expo-sqlite database adapter, Expo Router (file-based), WebView for editor/charts                |
| `apps/desktop` | Desktop  | Imports all packages | Tauri SQLite plugin database adapter, TanStack Router, Tauri APIs (tray, shortcuts, auto-update) |
| `apps/server`  | Server   | Imports types only   | Hono framework, Cloudflare Workers, R2 blob storage. No UI, no database, no encryption.          |

### What Each App Provides

| Responsibility                             | Where It Lives                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Database adapter (SQLite driver)           | Per-app: `apps/web/src/db/`, `apps/mobile/db/`, `apps/desktop/src-tauri/` |
| App shell and routing                      | Per-app: `apps/*/src/App.tsx`                                             |
| Page components and layouts                | Per-app: `apps/*/src/app/` or `apps/*/src/pages/`                         |
| Platform-specific UI (tray, notifications) | Per-app                                                                   |
| Business logic, services, models           | Shared: `packages/core`                                                   |
| Editor, extensions, serializers            | Shared: `packages/editor`                                                 |
| Shared UI components                       | Shared: `packages/ui`                                                     |
| Type definitions, Zod schemas              | Shared: `packages/types`                                                  |

---

## 3. Shared Packages

### 3.1 `packages/types` — No Platform Dependencies

Pure TypeScript interfaces, Zod validation schemas, and enums. Has zero runtime dependencies beyond Zod. Every package and app imports from here.

**Key constraint:** This package must never import from `packages/core`, `packages/editor`, or any app. It is the leaf of the dependency graph.

### 3.2 `packages/core` — Platform-Agnostic Business Logic

Contains encryption, database schema, repository, migrations, services, and sync logic. Written in pure TypeScript with no platform-specific imports.

**Platform abstraction:** The `DatabaseAdapter` interface in `packages/core/src/db/adapter.ts` defines the contract that each platform implements:

```typescript
interface SqliteDriver {
  exec(sql: string): Promise<void>
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  batch(statements: { sql: string; params?: unknown[] }[]): Promise<void>
  close(): Promise<void>
}

interface DatabaseAdapter {
  open(config: DatabaseConfig): Promise<{ driver: SqliteDriver; db: DrizzleDb }>
  close(): Promise<void>
  exists(name: string): Promise<boolean>
  destroy(name: string): Promise<void>
}
```

Each platform provides a concrete `DatabaseAdapter` implementation that wraps its native SQLite library. The repository and services call the adapter interface — they never know which platform they're running on.

### 3.3 `packages/editor` — TipTap Block Editor

The shared editor package containing TipTap configuration, the **capability-block registry** (ADR-008 — an open
registry where each capability declares its render targets and the user chooses placement; e.g. daily summary, task
checklist, habits block — not a closed, hard-coded extension set), serializers (Markdown, PDF, DOCX), toolbar, and
slash menu.

- **Web and Desktop:** TipTap runs natively in the React DOM. The editor component renders directly.
- **Mobile:** TipTap runs inside a React Native WebView. The native app provides the toolbar and slash menu; the WebView provides the editing surface.

### 3.4 `packages/ui` — Universal Components

Tamagui-based universal components shared across platforms. Tamagui compiles to optimized CSS on web and native views on React Native.

Components in this package: calendar-view, gallery-view, list-view, neural-graph (Sigma.js), pomodoro-widget, timeline, export-dialog.

---

## 4. The DatabaseAdapter Interface

The most critical platform abstraction. Each platform wraps its native SQLite library behind the `DatabaseAdapter` interface defined in `packages/core/src/db/adapter.ts`.

### Per-Platform Implementations

| Platform    | Library                                                   | Adapter Location                   | Encryption                               | Status          |
| ----------- | --------------------------------------------------------- | ---------------------------------- | ---------------------------------------- | --------------- |
| **Web**     | wa-sqlite + OPFS                                          | `apps/web/src/db/web-adapter.ts`   | Custom WASM build with SQLCipher bundled | Implemented     |
| **Mobile**  | expo-sqlite (or react-native-quick-sqlite with SQLCipher) | `apps/mobile/db/`                  | SQLCipher via native module              | Not implemented |
| **Desktop** | Tauri SQLite plugin + SQLCipher                           | `apps/desktop/src-tauri/src/db.rs` | SQLCipher via native library             | Not implemented |

### Web Adapter (Implemented)

The web adapter in `apps/web/src/db/web-adapter.ts` is fully implemented and provides:

- **wa-sqlite WASM initialization** — Loads the SQLite WASM binary with SQLCipher support
- **OPFS VFS registration** — Uses Origin Private File System for persistent storage, with IDBBatchAtomicVFS fallback
- **SQLCipher configuration** — Sets PRAGMA key (must be first statement), cipher page size, KDF iterations, HMAC algorithm
- **Connection PRAGMAs** — WAL mode, foreign keys enabled, synchronous=NORMAL, temp_store=MEMORY
- **Drizzle ORM integration** — sqlite-proxy async driver wrapping wa-sqlite
- **Migration runner** — Applies migrations sequentially in transactions

### Mobile Adapter (Phase 3)

The mobile adapter will wrap `expo-sqlite` (or `react-native-quick-sqlite` with SQLCipher — exact library deferred to Phase 3 per ADR-001 section 21). It must implement the same `SqliteDriver` and `DatabaseAdapter` interfaces.

### Desktop Adapter (Phase 6)

The desktop adapter will use Tauri's SQLite plugin with SQLCipher, exposed to the React frontend via Tauri's `invoke()` bridge. The Rust side (`apps/desktop/src-tauri/src/db.rs`) handles the native SQLite connection; the TypeScript side wraps `invoke()` calls into the `SqliteDriver` interface.

**For build pipeline details, WASM compilation, and SQLCipher PRAGMA configuration, see `docs/infrastructure/database-layer.md`.**

---

## 5. Editor Strategy Per Platform

### Web — Native TipTap

TipTap runs directly in the React DOM. The editor component from `packages/editor` is imported and rendered as a standard React component.

```
apps/web/
  imports packages/editor/src/editor.tsx
  renders TipTap in the browser DOM
  full extension support (all custom blocks)
  Yjs integration via y-prosemirror for CRDT sync
```

### Desktop — Native TipTap (Same as Web)

Desktop uses the same React frontend in Tauri's webview. TipTap runs identically to web — same extensions, same rendering, same Yjs integration.

```
apps/desktop/
  imports packages/editor/src/editor.tsx
  renders TipTap in Tauri's webview DOM
  identical to web editor
```

### Mobile — TipTap in WebView + Native Chrome

Mobile uses a **hybrid approach**: TipTap runs inside a React Native WebView (the editing surface), while the toolbar, slash menu, and surrounding UI are native React Native components.

```
┌─────────────────────────────────────────┐
│  Native React Native App                │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Native Toolbar (React Native)     │ │
│  │  Bold | Italic | H1 | H2 | ...    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  WebView                           │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  TipTap Editor               │  │ │
│  │  │  (same extensions as web)    │  │ │
│  │  │  runs in embedded browser    │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Native Slash Menu (React Native)  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Communication between WebView and React Native:** The bridge implementation is deferred to Phase 3. The conceptual approach is a typed message protocol using `postMessage` / `onMessage` — the same pattern used by Obsidian mobile. Details will be documented when mobile development begins.

**Why hybrid?** Running TipTap directly in React Native is not well supported. The WebView approach gives full feature parity with web (same extensions, same rendering, same Yjs integration) while the native chrome provides a responsive, platform-native feel for toolbars and menus.

---

## 6. Visualization Strategy

### Web and Desktop — Native Rendering

Chart.js and Sigma.js run directly in the browser/webview DOM.

| Library                        | Purpose                             | Rendering | Bundle Size |
| ------------------------------ | ----------------------------------- | --------- | ----------- |
| **Chart.js** + react-chartjs-2 | Charts (habits, finance, analytics) | Canvas    | ~60KB       |
| **Sigma.js** + @sigma/react    | Neural graph (notes, relationships) | WebGL     | ~50KB       |

Both libraries handle large datasets efficiently:

- **Chart.js:** Built-in data decimation for time-series with thousands of points (years of habit data, transaction history)
- **Sigma.js:** WebGL rendering handles 10K+ nodes for note/relationship graphs accumulated over years of usage

### Mobile — WebView Rendering

Both Chart.js and Sigma.js run inside React Native WebViews on mobile, consistent with the hybrid editor approach. This ensures full feature parity across platforms.

**Instance strategy:** Deferred to Phase 3. The decision of whether each chart/graph uses its own WebView instance or shares a single visualization WebView will be made when mobile development begins, based on memory profiling and real-world performance testing.

---

## 7. Platform-Specific Features

Features that exist only on certain platforms.

### Desktop Only (Tauri v2)

| Feature                       | Implementation                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **System tray**               | Tauri tray API — quick access to today's journal, active pomodoro, habit check-off           |
| **Global keyboard shortcuts** | Tauri global shortcut API — quick capture (note, task, transaction) without focusing the app |
| **Auto-update**               | Tauri updater plugin — checks for updates on launch, downloads in background                 |
| **File system access**        | Direct file system for attachment storage and export (no browser sandboxing)                 |
| **Native notifications**      | Tauri notification API — OS-level notifications for reminders, pomodoro, streaks             |

### Mobile Only (Expo)

| Feature                | Implementation                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| **Push notifications** | Expo Notifications (or alternative — deferred per ADR-001 section 21) |
| **Haptic feedback**    | React Native haptics for habit completions, timer events              |
| **Share sheet**        | Expo Sharing — export notes, share journal entries                    |
| **Biometric unlock**   | Expo LocalAuthentication — Face ID / fingerprint to unlock vault      |
| **Background sync**    | Expo Background Fetch — periodic sync when app is backgrounded        |

### Web Only

| Feature          | Implementation                                                         |
| ---------------- | ---------------------------------------------------------------------- |
| **OPFS storage** | Origin Private File System for persistent SQLite database              |
| **Web Workers**  | Encryption operations in Web Workers to avoid blocking the main thread |

---

## 8. Build and Deploy Per Platform

| Platform            | Build Tool             | Output               | Deploy Target                         |
| ------------------- | ---------------------- | -------------------- | ------------------------------------- |
| **Web**             | Vite                   | Static SPA (`dist/`) | Cloudflare Pages via GitHub Actions   |
| **Mobile iOS**      | Expo EAS Build         | `.ipa`               | Apple App Store                       |
| **Mobile Android**  | Expo EAS Build         | `.apk` / `.aab`      | Google Play Store                     |
| **Desktop Windows** | Tauri + GitHub Actions | `.msi` / `.exe`      | GitHub Releases                       |
| **Desktop macOS**   | Tauri + GitHub Actions | `.dmg`               | GitHub Releases                       |
| **Desktop Linux**   | Tauri + GitHub Actions | `.AppImage` / `.deb` | GitHub Releases                       |
| **Server**          | Wrangler               | Cloudflare Worker    | Cloudflare Workers via GitHub Actions |

### CI/CD Pipeline

All platforms share a single CI pipeline in `.github/workflows/`:

1. **On every push/PR:** Lint, typecheck, test across `packages/core`, `packages/types`, `packages/editor`, `packages/ui`
2. **On merge to main:** Deploy web (Cloudflare Pages) and server (Cloudflare Workers)
3. **On version tag (`v*`):** Build mobile (Expo EAS) and desktop (Tauri matrix build for Win/Mac/Linux)

---

## 9. App Directory Structure

### Web (`apps/web/`)

```
apps/web/
  src/
    main.tsx              # React 19 root, StrictMode
    App.tsx               # App shell, provider hierarchy
    app/                  # Page routes (TanStack Router)
      notes/
      journals/
      class-notes/
      tasks/
      habits/
      ...
    components/           # Web-specific components
    db/
      web-adapter.ts      # wa-sqlite + OPFS adapter (implemented)
    workers/              # Web Workers for encryption
  vite.config.ts
  tsconfig.json
  package.json
```

### Mobile (`apps/mobile/`)

```
apps/mobile/
  app/                    # Expo Router (file-based routing)
    (tabs)/
      journals.tsx
      notes.tsx
      tasks.tsx
      more.tsx
    journal/[date].tsx
    note/[id].tsx
    ...
  components/             # Mobile-specific components
  db/                     # expo-sqlite adapter (not yet implemented)
  package.json
```

### Desktop (`apps/desktop/`)

```
apps/desktop/
  src/
    App.tsx               # Desktop-specific shell
    pages/                # Desktop pages (may differ from web)
    components/           # Desktop-only components (tray menu, etc.)
  src-tauri/
    src/
      main.rs             # Tauri entry point
      db.rs               # Native SQLite + SQLCipher adapter
      file-system.rs      # Local file storage for attachments
    tauri.conf.json        # Tauri configuration
  package.json
```

### Server (`apps/server/`)

```
apps/server/
  src/
    index.ts              # Hono app with CORS, health endpoints (implemented)
    routes/
      auth.ts             # SRP authentication (not yet implemented)
      sync.ts             # Push/pull sync endpoints (not yet implemented)
      billing.ts          # Subscription management (not yet implemented)
  wrangler.toml           # Cloudflare Workers configuration
  package.json
```

---

## References

- **ADR-001 section 3** — Platform technologies (React, Expo, Tauri, Hono)
- **ADR-001 section 5** — Database implementations per platform
- **ADR-001 section 8** — Editor strategy (TipTap, mobile hybrid, WebView)
- **ADR-001 section 9** — UI and design system (Tamagui)
- **ADR-001 section 10** — Data visualization (Chart.js, Sigma.js)
- **ADR-001 section 17** — CI/CD pipeline
- **ADR-001 section 21** — Deferred decisions (mobile SQLite, push notifications)
- `packages/core/src/db/adapter.ts` — DatabaseAdapter interface definition
- `apps/web/src/db/web-adapter.ts` — Web adapter implementation
