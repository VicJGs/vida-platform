# Vida Platform

Zero-knowledge, local-first, multiplatform life management SaaS.

## Platform Overview

Vida is a comprehensive life management platform that puts user privacy first. All user data lives encrypted on the user's device, syncs through the server as opaque encrypted blobs, and decrypts only client-side with keys only the user possesses. The platform spans 8 major modules unified by a Notes & Journals integration layer that acts as the daily dashboard and connective tissue across all modules.

### Core Privacy Model

- **Zero-knowledge**: The server never sees, stores, or has access to plaintext user data
- **Local-first**: The user's device is the source of truth; the server is a sync relay
- **Single-user, multi-device**: Not collaborative editing — one user across multiple devices
- **Offline-resilient**: All writes succeed locally; sync catches up on reconnect

## Modules & Features

### 1. Financial Management

- Transaction import from bank statements (CSV/OFX) for conciliation with manually added transactions
- Assets tracker (real estate, vehicles, valuables with depreciation)
- Liabilities tracker (loans, debts with interest rates and payment schedules)
- Investments tracker (stocks, bonds, crypto with purchase/current price)
- Income streams tracker (employment, freelance, passive with frequency)
- Accounts and money storage entities management (checking, savings, credit, cash)
- Analytics charts for financial visualization (embedded via Chart.js)

### 2. Project Management

- Document storage for projects (encrypted blobs stored locally)
- Milestone tracker from tasks and deliverables
- Vision statement and mission statement (in markdown via TipTap editor)
- Progress tracker based on milestones, tasks, and deliverables (auto-calculated)
- Hierarchical structure: Project > Milestones > Deliverables > Tasks

### 3. Task Management

- Full tasks view aggregated from other modules (projects, learning, language, relationships)
- Task creation with relationships and linking to parent modules
- Sub-tasks via `parent_task_id` self-referencing
- Priority, difficulty, status, due dates, time estimation and tracking
- Task notes (linked page per task via `pages` table)
- Task time logs for actual time tracking

### 4. Habits Management

- Habits with recurrence and to-do list view for completion (separated by morning, evening, afternoon, all day)
- Single entity standalone page for each habit
- Analytics graphs and charts on each habit's standalone page (streaks, completion rates, mood tracking)
- Calendar view on standalone page for tracking completions
- Habit types: build (positive) and break (negative)
- Domains: health, career, finance, relationships, personal growth, spiritual, recreation, environment

### 5. Routine Management

- Routines with recurrence and to-do list view for completion (separated by morning, evening, afternoon)
- Single entity standalone page for each routine
- Analytics graphs and charts on each routine's standalone page
- Linked to habits or tasks via `linked_habit_id` / `linked_task_id`
- Skip tracking with reason capture

### 6. Relationship Management (CRM)

- People registration with full contact details (name, email, phone, company, job title, location)
- Standalone page per person with description and management
- Interaction log per person on standalone page (type, date, duration, sentiment, follow-up)
- Important events (birthdays, anniversaries) per person
- Social links per person
- Network groups with neural graph view (Obsidian-style, via Sigma.js WebGL)
- All network groups with people on a standalone page (force-directed graph visualization)
- Standalone pages for each network group
- Reminders per person to interact on timeframes: weekly, daily, monthly, yearly, specific day of the week
- Reminder groups (for networks, lists of people, or individuals) on a Reminders standalone page
- All reminders for the day, week, and month view on Reminders standalone page
- Relationship health per person and per network (based on interaction frequency and sentiment)
- All events (for relationships only) standalone page

### 7. Learning Management

- **Classes**: Registration for college and online classes with `course_type` discriminator
- **ICS Feed Sync**: Calendar feed sync via `ical.js` — user adds ICS URLs, relates them to courses, auto-syncs events
- **Weekly Schedule**: Schedule view for classes from synced ICS events
- **Class Standalone Pages**: Full visualization of class info, schedule, syllabus, books, homework, exams
- **Homework**: Registration, description, and standalone pages within class context
- **Schedule & Syllabus**: Document upload (PDF, DOC) on class standalone page
- **Books**: Registration, table of contents, progress tracking, bookmarks, notes per book
- **Book Standalone Pages**: TOC, progress, bookmarks, notes, URL/PDF link to access the book
- **Exams, Quizzes & Tests**: Registration and management on class standalone pages with auto-record from scraped syllabus/schedule/ICS
- **Auto-record**: Homeworks from ICS feed, books from syllabus, exam/quiz/test dates from syllabus and schedule
- **Auto-linking**: Book TOC chapters linked to class schedule based on syllabus and schedule data
- **Study Sessions**: Focus wizard and timer (Pomodoro-based) on each class standalone page
- **Knowledge Section**: Topics, definitions, concepts per class with standalone pages
- **Notes, References & Book Pages**: Linked to each topic/definition/concept
- **All Books Page**: Standalone page listing all books across classes
- **Book-to-Class Linking**: Link/unlink books to classes with automatic feed of book info to class (and reverse on removal)
- **All Knowledge Page**: Standalone page for all knowledge management across classes, books, skills, languages
- **Topic/Definition/Concept Pages**: Standalone pages with relationship links to classes, books, skills, languages
- **Language Learning**: Specific knowledge section for languages
  - Standalone page per language with proficiency tracking
  - Full dictionary view of all words learned per language (groupable, filterable)
  - Vocabulary with word, translation, pronunciation, example sentence, mastery level
  - Practice sessions with skill type and activity type tracking
  - Daily sessions with structured learning activities
  - Weekly plans with songs, bible passages, videos, reflections
  - Audio recordings for pronunciation practice
  - Base words with categories and learning progression
  - Video playlists for supplementary learning
- **Study Plan**: Standalone page with wizard for creating study plans
  - Selection of class, plan type (homework, topics/concepts, book reading, or all combined)
  - Auto-assignment of study schedules based on all platform information
  - User-defined time slots for study sessions with deliverables, goals, objectives
  - Optional class prep and post-class study sessions
  - Generated plan integrated with class contents, knowledge, books (TOC), schedule, syllabus, homework, exams
- **Study Sessions Management**: Standalone page with analytics (done, to-do, scheduled)
  - Grouped views per class (all, done, scheduled)
  - Start session wizard for knowledge, class, book, or language sessions
- **Flashcards**: SM-2 spaced repetition algorithm with decks linked to any resource type

### 8. Notes & Journals (Integration Layer)

This is NOT just another module — it is the **unifying layer** of the entire platform. Every other module produces data that flows into notes and journals.

- **Journal**: One per day, dynamic daily dashboard aggregating data from all modules
  - Auto-generated daily summary (habits, tasks, study sessions, transactions, interactions)
  - Today's agenda (tasks, reminders, class schedule)
  - Free-form markdown journal entry with entity linking
  - Views: Calendar, List, Gallery (grouped by week/month/year)
- **Notes**: General-purpose, task notes, class notes, milestone notes, deliverable notes
  - Views: Calendar, List, Gallery, Neural Graph
- **Block Editor (TipTap)**: The heart of the platform
  - Standard blocks: paragraph, headings, lists, blockquote, code, divider, image, table, callout
  - Platform integration blocks: `/summary`, `/tasks`, `/events`, `/classes`, `/habits`, `/timeline`, `/chart`, `/pomodoro`, `/entity-link`, `/backlink`, `/class-notes`, `/milestone`
  - Export: Markdown (.md), PDF (@react-pdf/renderer on web, expo-print on mobile), DOCX
- **Entity Linking & Backlinks**: `[[wiki-link]]` style bidirectional links across all entities
- **Neural Graph View**: Force-directed graph (Sigma.js) visualizing connections between notes, people, projects, etc.
- **Tags**: Shared tag system across all pages with color support
- **Pomodoro Timer**: Embedded in notes, linked to tasks/classes/study sessions

### 9. Additional Domains

- **Purpose & Goals**: Life purposes with vision/why, measurable targets, metrics, dreams, reviews
- **Check-ins**: Daily morning/evening check-ins with mood, energy, gratitude, reflection (customizable templates)
- **Bucket List**: Items linked to purposes and projects with steps, cost, location
- **Gamification**: XP system, achievements, levels, streaks
- **Notifications**: System notifications linked to any entity type

## Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Language**: TypeScript everywhere (strict mode, TS 5.7+)
- **Node.js**: 22 LTS
- **React**: 19.x

### Packages

- `@vida/types` — Shared TypeScript types, Zod schemas, editor types
- `@vida/core` — Business logic, encryption (libsodium), sync engine, DB abstraction (Drizzle ORM), services (journal, pomodoro, backlinks, study planner, reminder engine, analytics, search, export)
- `@vida/editor` — TipTap block editor with custom extensions, slash menu, serializers (markdown, PDF, DOCX)
- `@vida/ui` — Shared UI components via Tamagui (calendar, gallery, list, neural graph, pomodoro widget, timeline, export dialog)

### Apps

- `@vida/web` — Vite + React SPA, TanStack Router, wa-sqlite + OPFS (with SQLCipher WASM), Chart.js + Sigma.js
- `@vida/mobile` — Expo (React Native), Expo Router, expo-sqlite (with SQLCipher), WebView for editor/charts/graphs, expo-print for PDF
- `@vida/desktop` — Tauri v2 + React (shares web codebase), native SQLite + SQLCipher via Tauri plugin
- `@vida/server` — Hono on Cloudflare Workers, zero-knowledge blob relay, SRP auth, Cloudflare R2 for blob storage

## Key Technical Decisions (ADRs)

### ADR-001: Tech Stack

- **Local-first**: SQLite on all platforms (wa-sqlite/OPFS for web, expo-sqlite for mobile, Tauri plugin for desktop)
- **Zero-knowledge**: All data encrypted client-side with libsodium (XChaCha20-Poly1305), server stores only opaque blobs
- **Auth**: SRP (Secure Remote Password) — server never sees passwords
- **Key model**: Vault Key = BLAKE2b-256(key = Master Key from Argon2id, message = Account Key)
- **Editor**: TipTap (ProseMirror-based) with Yjs CRDT sync via y-prosemirror
- **UI**: Tamagui (universal components across web/mobile/desktop) — neumorphic design dropped
- **ORM**: Drizzle ORM for type-safe SQLite access
- **State**: Zustand (client state) + React Query v5 (async/DB state)
- **Routing**: TanStack Router (web/desktop), Expo Router (mobile)
- **Forms**: TanStack Form + Zod validation
- **Charts**: Chart.js + react-chartjs-2 (canvas-based, handles large datasets)
- **Graph**: Sigma.js (WebGL-rendered, handles 10K+ nodes)
- **Dates**: date-fns (tree-shakeable)
- **HTTP**: Native fetch (client), Hono (server)
- **Testing**: Vitest + Testing Library + Playwright (E2E)
- **Mobile editor**: Hybrid — TipTap in WebView + native RN toolbar/chrome

### ADR-002: Data Model

- **Database**: SQLite (not PostgreSQL) — single-user local DB, no RLS needed
- **Three-layer encryption**: L1 SQLCipher (full DB at rest), L2 field-level libsodium (sensitive fields marked `-- [E]`), L3 sync blob (entire row encrypted for transit/server)
- **~60 tables** across 12 domains (Notes, Tasks, Projects, Habits, Routines, Purpose, Finance, Relationships, Learning, Language, Check-ins, Gamification)
- **~520 fields**: ~370 plaintext (71%), ~150 encrypted (29%)
- **No inline notes columns**: All notes use `pages` table via `entity_type`/`entity_id` polymorphic pattern
- **FTS5** virtual tables for full-text search (rebuilt on vault unlock)

### ADR-003: Sync Protocol

- **Structured data**: LWW (Last-Writer-Wins) with logical timestamps — a **hybrid logical clock (HLC)** (causal ordering, device-id tie-break), not raw wall-clock, so cross-device skew can't silently drop writes — sufficient for single-user multi-device
- **Editor content**: Yjs CRDT per page for conflict-free offline merge
- **Transport**: Encrypted blob push/pull over WebSocket (with polling fallback)
- **Sync unit**: Each entity syncs as an individually encrypted blob
- **Attachments**: Large files flow through separate R2 pipeline
- **Offline**: Local queue, flush on reconnect, all writes succeed locally first

## Commands

- `pnpm dev` — Start all apps in dev mode (includes `@vida/server` via `wrangler dev` — requires macOS 13.5+ / `workerd`)
- `pnpm dev:app` — Local-first dev **without** the server (web + package watchers). Use this for M1 work: M1 is local-only/no-server (the server is an M4 concern per `docs/roadmap/MVP-PATH.md`), and `workerd` cannot run on macOS < 13.5.
- `pnpm build` — Build all packages and apps
- `pnpm typecheck` — Type-check all packages
- `pnpm lint` — Lint all packages
- `pnpm test` — Run all tests
- `pnpm format` — Format code with Prettier

## Conventions

- Primary keys: UUIDv7 (time-sortable) as TEXT, generated client-side
- Timestamps: Unix milliseconds as INTEGER (`Date.now()`)
- Booleans: INTEGER (0/1)
- JSON data: TEXT (stringified JSON) — arrays, nested objects
- Monetary values: INTEGER in cents
- Calendar dates (no time): TEXT in `YYYY-MM-DD` format
- No inline `notes` columns — all notes use `pages` table via `entity_type`/`entity_id`
- Sync metadata (`_sync_id`, `_sync_version`, `_sync_device_id`, `_sync_lww_ts`, `_sync_status`, `_sync_hash`) on every syncable table
- Field-level encryption marked with `-- [E]` in schema comments
- Enums: TEXT with CHECK constraints in SQL, canonical Zod validators in `@vida/core`
- Soft deletes: `deleted_at INTEGER` (NULL = not deleted)
- Package scope: `@vida/*`
- Conventional commits: `feat:`, `fix:`, `refactor:`
- Git: `main` (production), `develop` (integration), short-lived feature branches

## Monorepo Structure

```
vida-platform/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   ├── core/          # Business logic, encryption, sync, DB, services
│   ├── editor/        # TipTap block editor, extensions, serializers
│   ├── ui/            # Shared Tamagui components
│   └── types/         # TypeScript types, Zod schemas
├── apps/
│   ├── web/           # Vite + React SPA
│   ├── mobile/        # Expo (React Native)
│   ├── desktop/       # Tauri v2 + React
│   └── server/        # Hono on Cloudflare Workers
├── docs/
│   └── decisions/     # ADR documents
└── tools/             # Scripts, generators
```

## Data Domains (Key Tables)

> Orientation only — NOT the schema source of truth. Table names reflect the ADR-realigned model where a
> capability-framework anti-signal applied (ADRs 004–017); the authoritative schema is owned by ADR-002 + the
> per-table build phase (DB-3/DB-4). Rows not yet swept against every ADR may still lag.

| Domain                 | Key Tables                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notes & Pages          | `pages`, `page_links`, `entity_links`, `tags`, `entity_tags`, `note_attachments` (pomodoro is now a `sessions` sub-type — ADR-004)                                                                                                                   |
| Tasks                  | `tasks`, `task_time_logs`                                                                                                                                                                                                                            |
| Projects               | `projects`, `milestones`, `project_documents`                                                                                                                                                                                                        |
| Habits                 | `habits`, `habit_completions`                                                                                                                                                                                                                        |
| Routines               | `routine_actions`, `routine_completions`                                                                                                                                                                                                             |
| Purpose & Goals        | `purposes`, `targets`, `purpose_metrics`, `purpose_metric_values`, `target_reviews`, `dreams`                                                                                                                                                        |
| Finance                | `accounts`, `transactions`, `assets`, `liabilities`, `investments`, `income_streams`                                                                                                                                                                 |
| Relationships          | `contacts`, `contact_events`, `interactions`, `contact_reminders`, `reminder_groups`, `reminder_group_contacts`                                                                                                                                      |
| Learning               | `courses`, `books`, `book_chapters`, `skills`, `skill_resources`, `study_sessions`, `study_topics`, `topic_reviews`, `review_events`, `method_bindings`, `review_curves`, `knowledge_notes` (flashcard\_\* retired → generic review engine, ADR-005) |
| Study Planner          | `study_availability`, `availability_exceptions`, `study_plan_batches`, `scheduled_study_sessions`, `session_templates`                                                                                                                               |
| Language               | `languages`, `language_practice_sessions`, `language_vocabulary`, `language_daily_sessions`, `language_daily_progress`, `language_recordings`, `language_weekly_plans`, `language_base_words`, `language_video_playlists`                            |
| Check-ins              | `daily_check_ins`, `check_in_templates`, `check_in_template_questions`                                                                                                                                                                               |
| Bucket List            | `bucket_list_items`                                                                                                                                                                                                                                  |
| Gamification           | `user_profile`, `achievements`, `user_achievements`, `currencies`, `consequence_ledger` (xp_history retired → derived-balance ledger, ADR-012)                                                                                                       |
| Notifications          | `notifications`                                                                                                                                                                                                                                      |
| Preferences            | `user_preferences`, `nav_preferences`, `command_bar_history`                                                                                                                                                                                         |
| ICS Sync               | `ics_feed_configs`, `ics_synced_events`                                                                                                                                                                                                              |
| System (local-only)    | `app_state`, `sync_queue`                                                                                                                                                                                                                            |
| Cross-domain junctions | `contributions` (weighted, polymorphic — supersedes `purpose_habits`/`purpose_routines`/`purpose_projects`, ADR-011), `project_habits`                                                                                                               |

## Reference Documents

**The ADRs at `docs/core/decisions/` are the authoritative foundation — ADR-001 through ADR-017 govern.** The
legacy Multiplatform Guide v2 is quarantined at `docs/_legacy/architecture.md` (superseded on 5 axes; do not use).
The `docs/core/architecture/*` docs are themselves under realignment (campaign Part 1.3).

- All architecture decisions: `docs/core/decisions/` (ADR-001 … ADR-017)
- Capability framework (every ADR-004–015 capability + mechanical predicate): `docs/specs/foundation/capability-framework.md`
- Foundation-realignment campaign: `docs/specs/foundation/realignment-master-plan/_index.md`
- Tech stack: `docs/core/decisions/ADR-001-tech-stack.md`
- Data model & schema: `docs/core/decisions/ADR-002-data-model.md`
- Sync protocol: `docs/core/decisions/ADR-003-sync-protocol.md`
