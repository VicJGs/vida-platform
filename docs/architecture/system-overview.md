# System Overview

The highest-level description of the Vida Platform. The first thing a new developer reads.

**Audience:** All developers and agents. Start here before reading any other architecture document.

**Governs:** No code directly. Provides the mental model for the entire system.

**Content Source:** Extracted and updated from `docs/architecture.md` (v2 legacy) and ADR-001.

---

## 1. Platform Purpose

Vida is a **zero-knowledge, local-first, multiplatform life management platform**. It replaces the need for separate apps for tasks, habits, journaling, finance, learning, relationship management, and goal tracking with a single encrypted system where all modules integrate through a unified note-taking layer.

**The architecture in one sentence:** All user data lives encrypted on the user's device, syncs between devices as opaque encrypted blobs through a zero-knowledge server, and decrypts only on the client side with keys only the user possesses — with a note-taking layer that acts as the unified interface across all modules.

### Target User

Vida is for a **single individual** managing all aspects of their life — a student tracking classes and study sessions, a professional managing projects and finances, an entrepreneur juggling goals and relationships. The target user:

- **Values privacy** — wants full ownership of their data with zero-knowledge encryption. No company, server, or third party can read their notes, finances, or personal reflections.
- **Wants one integrated system** — instead of 10 separate apps (one for tasks, one for habits, one for finance, one for journaling), they want a single platform where everything connects. A journal entry links to today's completed tasks. A project links to the habits that support it. A study session links to course notes.
- **Uses multiple devices** — works on a laptop during the day, checks habits on their phone in the evening, and reviews their journal on a tablet. Data syncs seamlessly and works fully offline.

Vida is **not** a collaborative tool. It is single-user, multi-device. There is no sharing, no team features, and no real-time collaboration between users.

---

## 2. Module Inventory

Vida has **17 modules** organized into six domains.

### Integration Layer

The unifying interface that surfaces data from every other module.

| Module | Description |
|--------|-------------|
| **Notes & Pages** | The integration hub. Every module's entities can have linked pages. Supports wiki-style `[[entity links]]`, bidirectional backlinks, tags, and attachments. The `pages` table with its polymorphic `entity_type`/`entity_id` pattern is how all modules connect to the note-taking system. |
| **Journals** | One page per day. The daily summary block (`/summary`) auto-populates from Habits, Tasks, Routines, Learning, Finance, and Relationships. Journals are the user's daily dashboard — a snapshot of everything that happened. |

### Productivity

Day-to-day task execution, habit building, and focus.

| Module | Description |
|--------|-------------|
| **Tasks** | Task management with sub-tasks, priority, difficulty, due dates, time logging, and cross-module links (projects, milestones, courses, contacts). Task notes are full pages with the TipTap editor. |
| **Habits** | Build or break habits with daily/weekly/monthly frequency. Tracks streaks, completion counts, mood before/after, cue/reward patterns. Completable from the journal's `/habits` block. |
| **Routines** | Daily routine actions (morning, afternoon, evening) with recurrence patterns. Can link to habits and tasks. Tracks actual vs estimated duration. |
| **Projects** | Project management with milestones, deliverables, documents, and progress tracking. Aggregates tasks and links to habits via junction tables. |
| **Pomodoro** | Focus timer sessions linked to any entity (task, note, study session) via polymorphic reference. Tracks completed pomodoros, break patterns, and focus statistics. Embeddable as a `/pomodoro` block in the editor. |

### Knowledge

Learning, studying, and language acquisition.

| Module | Description |
|--------|-------------|
| **Learning** | Courses, books (with chapter-level tracking), skills, study sessions, flashcard decks with SM-2 spaced repetition, knowledge notes, and a study planner that schedules sessions based on availability and urgency. ICS calendar sync imports class schedules. |
| **Languages** | Language learning with proficiency tracking (A1-C2), vocabulary management, daily structured sessions (grammar, conversation, music, bible study), audio recordings for pronunciation practice, and weekly plans. |

### Personal Growth

Self-reflection, goal setting, and life aspirations.

| Module | Description |
|--------|-------------|
| **Purposes & Goals** | Life purposes with vision/why statements, quantitative/qualitative targets, metrics with time-series tracking, and review cycles. Links to habits, routines, and projects via junction tables with aggregated progress computation. |
| **Check-ins** | Daily morning/evening check-ins with mood (1-10), energy level, intentions, wins, gratitude, challenges, and reflection. Customizable templates with user-defined questions. |
| **Bucket List** | Life aspirations with categories, progress steps, estimated costs, target dates, and inspiration links. Can link to purposes and projects. |

### Life Management

Finance and relationships.

| Module | Description |
|--------|-------------|
| **Finance** | Accounts (checking, savings, credit, investment), transactions with categories, assets with depreciation, liabilities with payment tracking, investments with price tracking, and income streams. All financial amounts are encrypted. |
| **Relationships** | Contact CRM with interaction logging (calls, texts, meetings), sentiment tracking, stay-in-touch reminders, birthday/anniversary events, and grouped reminder templates. Contact PII (name, email, phone) is encrypted. |

### Platform Services

Cross-cutting services that enhance all modules.

| Module | Description |
|--------|-------------|
| **Gamification** | XP points, levels, and achievements. Each module service emits XP events on significant actions (task completion, habit streaks, study sessions). Achievement detection is distributed — each module checks its own conditions. |
| **Notifications** | Alerts from all modules — task reminders, streak warnings, check-in prompts, achievement alerts, study plan due dates, recurring transaction reminders. All categories are user-configurable (opt-in/opt-out per category, quiet hours). |
| **Preferences** | User settings: theme (light/dark/system), date/time formats, currency, pomodoro durations, notification toggles, module enable/disable, dashboard layout, quiet hours. Read by every module. |

---

## 3. Three-Layer Architecture

The platform is organized into three layers. Each layer depends only on the layer below it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   NOTES & JOURNALS LAYER                             │
│            (Unified interface — surfaces all module data)            │
│                                                                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │ Journals │  │  Notes   │  │  Task    │  │  Class Notes     │  │
│   │ (daily)  │  │ (general)│  │  Notes   │  │  (per course)    │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘  │
│        │              │              │                │              │
│        └──────────────┴──────┬───────┴────────────────┘              │
│                              │                                       │
│                    ┌─────────v──────────┐                           │
│                    │   Block Editor     │                           │
│                    │   (TipTap)         │                           │
│                    │                    │                           │
│                    │  Custom Blocks:    │                           │
│                    │  /summary  /tasks  │                           │
│                    │  /habits   /chart  │                           │
│                    │  /pomodoro /events │                           │
│                    │  /timeline         │                           │
│                    │  [[entity-links]]  │                           │
│                    └─────────┬──────────┘                           │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ reads/writes
┌──────────────────────────────┼───────────────────────────────────────┐
│                        DATA MODULES LAYER                            │
│                                                                      │
│  ┌───────┐ ┌────────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌────────┐   │
│  │Finance│ │Projects│ │Tasks │ │Habits │ │Relation│ │Learning│   │
│  └───────┘ └────────┘ └──────┘ └───────┘ │ships   │ └────────┘   │
│                                           └────────┘               │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │Routines│ │Languages│ │Purposes &│ │Check-ins │ │Bucket List│ │
│  └────────┘ └─────────┘ │Goals     │ └──────────┘ └───────────┘ │
│                          └──────────┘                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐                  │
│  │Gamification  │ │Notifications │ │Pomodoro  │                  │
│  └──────────────┘ └──────────────┘ └──────────┘                  │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                     CORE INFRASTRUCTURE                               │
│                                                                       │
│  ┌────────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Encryption │  │   Sync    │  │  SQLite  │  │ Entity Linking   │ │
│  │ (libsodium)│  │ (LWW+Yjs)│  │(SQLCipher)│ │ (backlinks, refs)│ │
│  └────────────┘  └───────────┘  └──────────┘  └──────────────────┘ │
│                                                                       │
│  ┌────────────┐  ┌───────────┐  ┌──────────────────────────────┐   │
│  │    Auth    │  │ Repo +    │  │ Preferences                  │   │
│  │   (SRP)   │  │ Migrations│  │ (user settings, module config)│   │
│  └────────────┘  └───────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Notes & Journals Layer** — The user-facing integration interface. The TipTap block editor with custom blocks (`/summary`, `/tasks`, `/habits`, `/chart`, `/pomodoro`, `/timeline`) and `[[entity-links]]` provides a unified way to interact with all module data. Journals aggregate daily activity. Notes connect entities across modules via backlinks.

**Data Modules Layer** — The 17 modules that each manage their own domain entities. Each module has its own service layer, Zod validation schemas, and repository interactions. Modules communicate through the patterns documented in `cross-module-integration.md` — never by directly accessing another module's database tables.

**Core Infrastructure** — Shared foundation that every module depends on:
- **Encryption** — Three-layer model: SQLCipher (L1, full DB), libsodium field-level (L2, sensitive fields), sync blob (L3, transport). See `security-model.md`.
- **Sync** — Field-level LWW for structured data, Yjs CRDT for editor content. See `docs/infrastructure/sync-implementation.md`.
- **SQLite** — Local-first database via platform-specific adapters (wa-sqlite, expo-sqlite, Tauri plugin). See `platform-strategy.md`.
- **Auth** — SRP (Secure Remote Password) zero-knowledge authentication. Server never sees passwords.
- **Repository + Migrations** — Generic encrypted CRUD via `createRepository()`, sequential migration runner.
- **Entity Linking** — Polymorphic `entity_type`/`entity_id` pattern, `[[wiki-links]]`, bidirectional backlinks.
- **Preferences** — User settings read by every module.

---

## 4. Platform Targets

Vida runs on web, mobile, and desktop from a single TypeScript monorepo. All business logic, encryption, and sync code lives in shared packages. Each platform provides only a database adapter and platform-specific UI.

| Platform | Technology | Database | Status |
|----------|-----------|----------|--------|
| **Web** | React 19 + Vite (SPA) | wa-sqlite + OPFS (SQLCipher WASM) | Active |
| **Mobile** | Expo (React Native) | expo-sqlite (or alternative with SQLCipher) | Phase 3 |
| **Desktop** | Tauri v2 + React | Tauri SQLite plugin + SQLCipher | Phase 6 |
| **Server** | Hono on Cloudflare Workers | N/A (zero-knowledge blob relay) | Active |

For the complete code sharing matrix, platform-specific features, and build pipeline, see `platform-strategy.md`.

---

## 5. Code Sharing Strategy

### Shared Across All Platforms

| Package | Contents |
|---------|----------|
| `packages/types` | TypeScript interfaces, Zod validation schemas, enums. Zero runtime platform dependencies. |
| `packages/core` | Business logic, encryption (libsodium), database schema (Drizzle), repository, migrations, services, sync engine. Platform-agnostic via the `DatabaseAdapter` interface. |

### Shared with Adaptation

| Package | Web/Desktop | Mobile |
|---------|-------------|--------|
| `packages/editor` | TipTap runs natively in the DOM | TipTap runs in a WebView; native toolbar/slash menu |
| `packages/ui` | Tamagui compiles to optimized CSS | Tamagui renders as React Native views |

### Platform-Specific

| Concern | Where It Lives |
|---------|---------------|
| Database adapter | `apps/web/src/db/`, `apps/mobile/db/`, `apps/desktop/src-tauri/` |
| App shell, routing, layouts | Per-app `src/` directory |
| Platform features (tray, push notifications, biometrics) | Per-app |

---

## 6. Technology Stack Summary

The complete technology stack is defined in **ADR-001**. Below is a summary with brief rationale for each choice.

### Core

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Language** | TypeScript (strict mode) | One language across all platforms. Shared business logic, encryption, data models, and sync engine written once. |
| **Monorepo** | Turborepo + pnpm 9.x | Task caching, dependency graph orchestration, workspace support. |
| **Node.js** | 22 LTS | Active support until 2027. Required for tooling and build. |

### Database

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **ORM** | Drizzle ORM | Type-safe, lightweight, works with SQLite across all platforms. |
| **Web DB** | wa-sqlite + OPFS | True persistent storage via Origin Private File System. Custom WASM build with SQLCipher for full DB encryption at rest. |
| **Mobile DB** | expo-sqlite (with SQLCipher) | Native SQLite on iOS/Android. Exact approach deferred to Phase 3. |
| **Desktop DB** | Tauri SQLite plugin + SQLCipher | Native SQLite with encryption at rest via Rust backend. |

### Encryption & Auth

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **E2E Encryption** | libsodium.js | XChaCha20-Poly1305 for data, Argon2id for key derivation, BLAKE2b-256 for vault key. Industry-standard, audited. Client-side only — server never encrypts or decrypts. |
| **Authentication** | SRP (Secure Remote Password) | Zero-knowledge — server never sees passwords. Stores only salt + SRP verifier. |
| **Key Model** | Vault Key = BLAKE2b-256(Master Key, Account Key) | Master Key derived from password via Argon2id. Account Key is user's recovery key (shown once). |

### Editor

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Block Editor** | TipTap (ProseMirror-based) | Yjs-native CRDT sync, extensible custom blocks, React-first, headless, battle-tested. |
| **CRDT** | Yjs via y-prosemirror | First-class TipTap integration for offline merge of editor content. |
| **PDF Export** | @react-pdf/renderer (web/desktop), expo-print (mobile) | Cross-platform document generation. |
| **DOCX Export** | docx (npm) | Word document generation from TipTap JSON. |

### UI & Visualization

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Components** | Tamagui | Universal — single API for web + React Native + desktop. Built-in animation system. Replaces shadcn/ui (web-only). |
| **Icons** | Lucide React / lucide-react-native | Clean, consistent, tree-shakeable. Works on web + RN. |
| **Charts** | Chart.js + react-chartjs-2 | Canvas-based, handles large datasets (years of habits, thousands of transactions). Built-in data decimation. ~60KB. |
| **Graph** | Sigma.js + @sigma/react | WebGL-rendered, handles 10K+ nodes for note/relationship graphs. ~50KB. |

### State & Routing

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Data Cache** | React Query (TanStack Query) v5 | Caches local SQLite reads, manages loading/error states, auto-invalidates on writes. Sole cache for all entity data. |
| **UI State** | Zustand | Lightweight, works across web/RN. Holds only ephemeral UI state (filters, view mode, selections). No entity data. |
| **Validation** | Zod | TypeScript-first. Used for forms, API payloads, service input validation. Schemas co-located in `packages/types`. |
| **Forms** | TanStack Form + Zod | Framework-agnostic (web + RN). Integrates with Zod for validation. |
| **Web/Desktop Routing** | TanStack Router | Fully type-safe routes with Zod search param validation. |
| **Mobile Routing** | Expo Router | File-based routing native to Expo/React Native. |

### Sync & Transport

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Structured Data Sync** | Field-level LWW (Last-Writer-Wins) | Custom implementation with per-field timestamps. Sufficient for single-user multi-device. |
| **Editor Content Sync** | Yjs CRDT | Conflict-free merge of text edits via y-prosemirror. |
| **Transport** | WebSocket (primary) + HTTP polling (fallback) | Real-time push via WebSocket, with graceful degradation. |
| **HTTP Client** | Native `fetch` | Built into all runtimes. Zero dependency. |
| **Server** | Hono on Cloudflare Workers | Fast, lightweight, edge-native. Runtime-agnostic (portable to Node/Bun/Deno for self-hosting). |

### Infrastructure

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Web Hosting** | Cloudflare Pages | Free tier, pairs with Workers. Auto-deploy on merge. |
| **Blob Storage** | Cloudflare R2 | S3-compatible, stores encrypted sync blobs and attachments. |
| **CI/CD** | GitHub Actions | Lint, typecheck, test on push. Deploy on merge. EAS Build for mobile, Tauri matrix for desktop. |
| **Testing** | Vitest + Testing Library + Playwright | Unit/integration (Vitest), component (Testing Library), E2E (Playwright). |
| **Date Library** | date-fns | Tree-shakeable, immutable, pure functions. |
| **ICS Parsing** | ical.js | Calendar feed parsing for Learning module class schedules. |

---

## References

- **ADR-001** — Complete technology stack with full rationale for every choice
- **ADR-002** — Complete data model (~72 tables, ~520 fields, encryption classification)
- **ADR-003** — Complete sync protocol (LWW, Yjs, transport, offline behavior, device management)
- `docs/architecture/data-flow.md` — How data moves through write/read/encrypt/sync pipelines
- `docs/architecture/cross-module-integration.md` — Every cross-module data access point
- `docs/architecture/platform-strategy.md` — Code sharing, database adapters, editor/visualization per platform
- `docs/architecture/security-model.md` — Encryption architecture and key hierarchy
- `docs/architecture/module-dependency-graph.md` — Module dependencies and risk points
