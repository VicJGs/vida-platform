# Multiplatform App Architecture Guide (v2)
## Zero-Knowledge, Local-First Life Management Platform

---

## 1. Executive Summary

You're building a **zero-knowledge, local-first, multiplatform life management SaaS** with 8 major modules (Finance, Projects, Tasks, Habits, Routines, Relationships, Learning, **Notes & Journals**). The core constraint — **you never own, store, or have access to user data** — drives every architectural decision.

**Critical architectural insight:** The Notes & Journals system is not just another module — it is the **unifying layer** of the entire platform. Every other module produces data that flows into notes and journals. The journal is the user's daily dashboard. Notes are the connective tissue linking tasks, projects, classes, and milestones. This changes the architecture from "8 independent modules" to "7 data modules + 1 integration layer that surfaces everything."

**The architecture in one sentence:** All user data lives encrypted on the user's device, syncs through your server as opaque encrypted blobs, and decrypts only on the client side with keys only the user possesses — with a note-taking layer that acts as the unified interface across all modules.

---

## 2. Recommended Technology Stack

### 2.1 Why TypeScript Everywhere

For a solo developer building across all platforms, **TypeScript** is the only sane choice. It lets you write your business logic, encryption layer, data models, and sync engine **once** and share it across web, mobile, and desktop. No other language gives you this level of cross-platform code reuse.

### 2.2 Platform Breakdown

| Platform | Technology | Why |
|----------|-----------|-----|
| **Web** | React + Vite (SPA) | Fast, huge ecosystem, no SSR needed (data is local) |
| **Mobile (iOS + Android)** | React Native via Expo | Shares React component patterns with web, Expo simplifies builds |
| **Desktop (Win/Mac/Linux)** | Tauri v2 + React | Lightweight (unlike Electron), Rust security layer, same React UI |
| **Shared Core** | TypeScript package | Business logic, encryption, sync, data models — written once |
| **Local Database** | SQLite (all platforms) | Universal, fast, supports encryption via SQLCipher |
| **Sync Server** | Hono on Cloudflare Workers (or Node.js on Fly.io) | Minimal — only routes encrypted blobs |
| **Auth** | SRP (Secure Remote Password) or similar zero-knowledge auth | Server never sees passwords |

### 2.3 Key Libraries

| Concern | Library | Role |
|---------|---------|------|
| **Local DB (web)** | `wa-sqlite` or `sql.js` | SQLite compiled to WASM for browser |
| **Local DB (mobile)** | `expo-sqlite` | Native SQLite on iOS/Android |
| **Local DB (desktop)** | `better-sqlite3` via Tauri sidecar, or Tauri's built-in SQLite plugin | Native SQLite |
| **E2E Encryption** | `libsodium.js` (`sodium-native` on Node) | Industry-standard, audited, fast |
| **Sync (CRDT)** | `Automerge` or `Yjs` | Conflict-free offline sync |
| **ORM/Query Builder** | `Drizzle ORM` | Type-safe, works with SQLite, lightweight |
| **UI Components** | `shadcn/ui` (web/desktop), adapted for RN | Consistent design system |
| **State Management** | `Zustand` or `Jotai` | Lightweight, works everywhere |
| **Graph Visualization** | `D3.js` or `react-force-graph` | For Obsidian-style neural network views |
| **Charts/Embeds** | `Recharts` or `Victory Native` | Analytics dashboards + embeddable chart blocks in notes |
| **Block Editor** | **TipTap** (ProseMirror-based) | The note-taking editor — see Section 3.5 |
| **Markdown Serialization** | `prosemirror-markdown` or custom serializer | Convert between block editor state and `.md` |
| **ICS/ICF Parsing** | `ical.js` | Calendar feed parsing for Learning module |
| **PDF Export** | `@react-pdf/renderer` | Export notes/journals to PDF |
| **DOCX Export** | `docx` (npm) | Export notes/journals to Word |
| **PDF Viewing** | `react-pdf` | Document viewing in Learning module |
| **Pomodoro/Timer** | Custom (shared core) | Timer logic in core, UI per platform |

---

## 3. Architecture Deep Dive

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NOTES & JOURNALS LAYER                       │
│           (Unified interface — surfaces all module data)             │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │ Journals │  │  Notes   │  │  Task    │  │  Class Notes     │  │
│   │ (daily)  │  │ (general)│  │  Notes   │  │  (per class)     │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘  │
│        │              │              │                │              │
│        └──────────────┴──────┬───────┴────────────────┘              │
│                              │                                       │
│                    ┌─────────▼──────────┐                           │
│                    │   Block Editor     │                           │
│                    │   (TipTap)         │                           │
│                    │                    │                           │
│                    │  Custom Blocks:    │                           │
│                    │  • Markdown text   │                           │
│                    │  • Entity embeds   │                           │
│                    │  • Timeline view   │                           │
│                    │  • Chart block     │                           │
│                    │  • Pomodoro timer  │                           │
│                    │  • Daily summary   │                           │
│                    │  • Task checklist  │                           │
│                    │  • Image/file      │                           │
│                    │  • Backlink        │                           │
│                    └─────────┬──────────┘                           │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ reads/writes
┌──────────────────────────────┼───────────────────────────────────────┐
│                        DATA MODULES LAYER                            │
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌────────┐ │
│  │Finance  │ │Projects │ │Tasks │ │Habits │ │Relation│ │Learning│ │
│  │         │ │         │ │      │ │       │ │ships   │ │        │ │
│  └─────────┘ └─────────┘ └──────┘ └───────┘ └────────┘ └────────┘ │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                        CORE INFRASTRUCTURE                           │
│                                                                      │
│  ┌────────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Encryption │  │ Sync      │  │ SQLite  │  │ Entity Linking   │  │
│  │ (libsodium)│  │ (Automerge)│ │(SQLCipher)│ │ (backlinks, refs)│  │
│  └────────────┘  └───────────┘  └─────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Zero-Knowledge Data Model

```
┌─────────────────────────────────────────────────────┐
│                   USER'S DEVICE                      │
│                                                      │
│  ┌─────────┐    ┌──────────┐    ┌────────────────┐  │
│  │ React   │◄──►│ Core     │◄──►│ SQLite         │  │
│  │ UI      │    │ Engine   │    │ (SQLCipher)    │  │
│  │         │    │          │    │ Encrypted DB   │  │
│  └─────────┘    └────┬─────┘    └────────────────┘  │
│                      │                               │
│              ┌───────▼────────┐                      │
│              │ Encryption     │                      │
│              │ Layer          │                      │
│              │ (libsodium)   │                      │
│              └───────┬────────┘                      │
│                      │ encrypted blobs only          │
└──────────────────────┼──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                YOUR SERVER (Zero Knowledge)           │
│                                                       │
│  • Stores encrypted blobs (cannot read them)          │
│  • Routes sync messages between user's devices        │
│  • Handles auth via SRP (never sees passwords)        │
│  • Manages billing/subscriptions                      │
│  • Stores NO plaintext user data                      │
│                                                       │
│  Tech: Cloudflare Workers + R2 (blob storage)         │
│        or Fly.io + S3-compatible storage              │
└──────────────────────────────────────────────────────┘
```

### 3.3 Encryption Architecture

```
User creates account:
  1. User chooses master password
  2. Client derives Master Key via Argon2id (password + random salt)
  3. Client generates Account Key (random 256-bit)
  4. Client creates Vault Key = HKDF(Master Key, Account Key)
  5. Vault Key encrypts/decrypts all data locally
  6. Account Key is shown to user ONCE as recovery key (e.g., "XXXXX-XXXXX-XXXXX")
  7. Server stores: salt, SRP verifier (NOT the password or any keys)

Data encryption flow:
  1. User creates a note → plaintext JSON/markdown
  2. Core Engine encrypts with Vault Key using XChaCha20-Poly1305
  3. Encrypted blob + metadata (timestamps, blob ID — no content) sent to server
  4. Server stores blob, cannot decrypt it

Sync between devices:
  1. User logs in on new device with password + Account Key
  2. Client re-derives Vault Key
  3. Client pulls encrypted blobs from server
  4. Decrypts locally
```

### 3.4 Local-First with Offline Sync

**Recommended approach: CRDT-based (Automerge or Yjs)**

- Use **Yjs** for the note-taking editor (TipTap has native Yjs bindings for real-time collaborative editing and offline merge)
- Use **Automerge** for structured data (tasks, habits, transactions — JSON-like documents)
- Each change is encrypted before leaving the device
- Server acts as a relay, forwarding encrypted CRDT operations between devices
- Works fully offline — changes queue and merge when back online

**Why Yjs for notes specifically:** TipTap (ProseMirror-based) has first-class Yjs integration via `y-prosemirror`. This means your note content automatically handles offline edits and cross-device merge without custom conflict resolution. This is the single strongest reason to choose TipTap over alternatives.

### 3.5 The Block Editor (Heart of the Notes System)

The editor is the most critical UI component in the entire platform. It needs to be a **block-based editor** (like Notion or Obsidian) that supports custom blocks for platform integration.

**Why TipTap (ProseMirror-based):**
- Battle-tested (ProseMirror powers the NYT, Atlassian, and many others)
- Native Yjs integration for CRDT sync (critical for offline merge)
- Extensible block/node system — you can create custom blocks
- Works in React (web/desktop) and has community React Native support
- Markdown import/export via serializers
- Headless — you fully control the UI

**Custom Block Types You'll Need:**

```
Standard Blocks:
├── Paragraph (text with inline formatting)
├── Headings (H1-H6)
├── Bullet / Numbered / Checklist
├── Blockquote
├── Code block
├── Divider
├── Image (encrypted, stored locally)
├── Table
└── Callout / Admonition

Platform Integration Blocks:
├── /summary      → Daily summary block (auto-populates from all modules)
├── /tasks        → Embedded task checklist (live, completable)
├── /events       → Today's events from calendar/classes
├── /classes      → Today's class schedule
├── /habits       → Today's habit tracker (completable)
├── /timeline     → Timeline visualization of any entity set
├── /chart        → Embeddable chart (from analytics data or custom)
├── /pomodoro     → Embedded pomodoro timer (linked to task/note)
├── /entity-link  → Reference to any system entity (person, project, etc.)
├── /backlink     → Bidirectional link to another note/journal
├── /class-notes  → Quick link to create/open class notes
└── /milestone    → Embedded milestone progress view

Export Targets:
├── .md  (Markdown — native format)
├── .pdf (via @react-pdf/renderer)
└── .docx (via docx npm package)
```

**How blocks work internally:**

```typescript
// TipTap custom node example — Daily Summary Block
import { Node, mergeAttributes } from '@tiptap/core'

export const DailySummaryBlock = Node.create({
  name: 'dailySummary',
  group: 'block',
  atom: true, // Non-editable, rendered as component

  addAttributes() {
    return {
      date: { default: null },
      sections: {
        default: ['habits', 'tasks', 'study', 'transactions'],
        // User configures which sections appear
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['daily-summary', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DailySummaryComponent)
    // React component that queries local DB for the day's data
    // and renders: habits done, tasks finished, sessions, etc.
  },
})
```

### 3.6 Entity Linking & Backlinks (The Obsidian Model)

This is what makes the note-taking system powerful. Every entity in the system (task, person, project, class, book, habit) is linkable from any note, and those links are **bidirectional**.

**Database schema for links:**

```sql
-- Universal entity reference table
CREATE TABLE entity_links (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,     -- 'note', 'journal', 'task_note', 'class_note'
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,     -- 'note', 'task', 'person', 'project', 'class', 'book', 'url'
  target_id TEXT NOT NULL,
  context TEXT,                  -- Snippet of surrounding text for backlink preview
  position_start INTEGER,       -- Character position in source document
  position_end INTEGER,
  created_at INTEGER NOT NULL,

  UNIQUE(source_id, target_id, position_start)
);

CREATE INDEX idx_links_source ON entity_links(source_type, source_id);
CREATE INDEX idx_links_target ON entity_links(target_type, target_id);
-- ^ This index is what makes backlinks fast:
-- "Show me every note that links to Person X" = query by target
```

**How backlinks work in the UI:**

```
┌─────────────────────────────────────────┐
│  Note: "Meeting with Prof. Johnson"      │
│                                          │
│  Discussed the [[Midterm Exam]] and      │
│  reviewed [[Chapter 5: Game Theory]].    │
│  Need to follow up with [[John Smith]]   │
│  about the group project [[CS301 Final]] │
│                                          │
│  ─────────────────────────────────────── │
│  📎 Backlinks (3 notes link to this)     │
│  • Journal 2026-02-15 — "Had a great..." │
│  • CS301 Class Notes #12 — "Professor..."│
│  • Project: Group Presentation — "Key..."│
└─────────────────────────────────────────┘
```

### 3.7 Neural Graph View

The neural graph view (Obsidian-style) is a force-directed graph that visualizes connections between entities. You need it in two places: Relationship module (people/networks) and Notes module (all notes).

**Implementation:** Use `react-force-graph-2d` (or 3d) which wraps D3's force simulation in a React component. Feed it nodes (entities) and edges (entity_links table).

```typescript
// Graph data generation from entity_links
interface GraphNode {
  id: string
  type: 'note' | 'journal' | 'task' | 'person' | 'class' | 'project'
  label: string
  color: string  // Color-coded by type
  size: number   // Based on number of connections
}

interface GraphEdge {
  source: string  // source entity ID
  target: string  // target entity ID
}

// Query: get all nodes and edges for the graph
const nodes = await db.query(`
  SELECT DISTINCT source_id, source_type, target_id, target_type
  FROM entity_links
`)
```

### 3.8 Journal System Architecture

The journal is not just a note — it's a **dynamic daily dashboard** that aggregates data from every module.

```
┌──────────────────────────────────────────────────────┐
│  📓 Journal — February 19, 2026 (Wednesday)          │
│                                                       │
│  ┌─ Daily Summary (auto-generated) ──────────────┐   │
│  │ ✅ 5/7 habits completed                        │   │
│  │ ✅ 3 tasks finished (2 remaining)              │   │
│  │ 📚 1 study session (CS301, 45 min)             │   │
│  │ 💰 2 transactions ($45.20 food, $12 transport) │   │
│  │ 👥 Interacted with: John, Maria                │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ Today's Agenda (user-configured) ────────────┐   │
│  │ □ Review CS301 homework (due Friday)           │   │
│  │ □ Call Mom (weekly reminder)                    │   │
│  │ 📅 CS301 Lecture — 10:00 AM                    │   │
│  │ 📅 Ethics Seminar — 2:00 PM                    │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ── User's journal entry (markdown) ──────────────── │
│                                                       │
│  Today was productive. I finally understood the       │
│  concept of [[Nash Equilibrium]] after the lecture.   │
│  Need to talk to [[Prof. Johnson]] about the paper.   │
│                                                       │
│  ![photo from campus](encrypted-image-ref)            │
│                                                       │
│  Tags: #productive #campus #cs301                     │
└──────────────────────────────────────────────────────┘
```

**How the summary auto-populates:**

```typescript
// Journal summary service (in packages/core)
export async function generateDailySummary(
  date: string,
  config: JournalSummaryConfig // User's chosen sections
): Promise<DailySummary> {
  const summary: DailySummary = {}

  if (config.showHabits) {
    summary.habits = await db.query(`
      SELECT h.name, hc.completed
      FROM habits h
      LEFT JOIN habit_completions hc ON h.id = hc.habit_id
      WHERE hc.date = ?`, [date])
  }

  if (config.showTasks) {
    summary.tasks = await db.query(`
      SELECT t.title, t.status, t.completed_at
      FROM tasks t
      WHERE date(t.due_date) = ? OR date(t.completed_at) = ?`, [date, date])
  }

  if (config.showStudySessions) {
    summary.studySessions = await db.query(`
      SELECT ss.*, c.name as class_name
      FROM study_sessions ss
      JOIN classes c ON ss.class_id = c.id
      WHERE date(ss.started_at) = ?`, [date])
  }

  if (config.showTransactions) {
    summary.transactions = await db.query(`
      SELECT t.description, t.amount, t.category
      FROM transactions t
      WHERE date(t.date) = ?`, [date])
  }

  if (config.showInteractions) {
    summary.interactions = await db.query(`
      SELECT p.name, il.type, il.summary
      FROM interaction_logs il
      JOIN people p ON il.person_id = p.id
      WHERE date(il.date) = ?`, [date])
  }

  return summary
}
```

### 3.9 Pomodoro System

The Pomodoro timer is embedded in notes but the logic lives in the shared core. It ties to the entity (task, task group, class note) it's running on.

```typescript
// packages/core/src/services/pomodoro.ts
export interface PomodoroSession {
  id: string
  entity_type: 'task' | 'task_group' | 'class_note' | 'note'
  entity_id: string
  started_at: number
  duration_minutes: number // Default 25
  break_minutes: number   // Default 5
  status: 'running' | 'paused' | 'break' | 'completed' | 'cancelled'
  completed_pomodoros: number
}

// Stored in DB, so progress persists across app restarts
// Timer countdown runs on client (not server — zero-knowledge)
// Push notifications via platform-native APIs for break/resume
```

### 3.10 Task Notes & Milestone Notes Architecture

Tasks and milestones have a special relationship with notes:

```
Task Note Model:
├── Every task CAN have a linked note (default: yes)
├── User opts out per-task if they don't want a note
├── Task note page = full editor with pomodoro embedded
├── Task completion updates both task status AND note metadata
│
Task Group Note:
├── Multiple tasks grouped for a single work session
├── One note page containing all grouped tasks
├── Each sub-task is a completable checklist block in the editor
├── On completion → recorded as a "grouped task session" note
│
Milestone Note:
├── One note page per milestone
├── Contains: deliverables (each with their own sub-note), tasks, documents
├── Deliverables are expandable/navigable to their own standalone notes
├── Progress bar block auto-calculates from child task/deliverable status
│
Class Note:
├── Created per class session or manually
├── Linked to class entity, date, and topics covered
├── Sortable by: most recent, grouped by class, calendar view
├── Can reference books, topics, definitions, concepts via entity links
```

**Database relationships:**

```sql
-- Notes table (universal for all note types)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,            -- 'journal', 'note', 'task_note', 'task_group_note',
                                 -- 'class_note', 'milestone_note', 'deliverable_note'
  title TEXT,
  content BLOB NOT NULL,         -- Encrypted TipTap JSON document
  parent_id TEXT,                -- For deliverable notes → milestone note
  entity_type TEXT,              -- What this note is linked to
  entity_id TEXT,                -- ID of the linked entity
  date TEXT,                     -- For journals: YYYY-MM-DD
  tags TEXT,                     -- JSON array of tags
  summary_config TEXT,           -- JSON: which summary sections to show (journals)
  has_pomodoro INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_date ON notes(date);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

-- Tags for filtering and grouping
CREATE TABLE note_tags (
  note_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (note_id, tag),
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

CREATE INDEX idx_tags ON note_tags(tag);

-- Pomodoro sessions linked to notes
CREATE TABLE pomodoro_sessions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_seconds INTEGER,
  type TEXT NOT NULL,             -- 'focus', 'short_break', 'long_break'
  status TEXT NOT NULL,           -- 'completed', 'cancelled', 'interrupted'
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- Images/files attached to notes (stored encrypted locally)
CREATE TABLE note_attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  encrypted_blob BLOB NOT NULL,  -- The file, encrypted
  thumbnail_blob BLOB,           -- Encrypted thumbnail for gallery view
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);
```

---

## 4. Views Architecture

### 4.1 Journal Views

| View | Implementation | Grouping |
|------|---------------|----------|
| **Calendar** | Custom calendar grid, each day cell shows journal preview | By week, month, year |
| **List** | Virtualized list (tanstack-virtual) for performance | By week, month, year |
| **Gallery** | Card grid showing first image + excerpt | By week, month, year |

### 4.2 Notes Views

| View | Implementation | Grouping |
|------|---------------|----------|
| **Calendar** | Same calendar component as journals | By date created/modified |
| **List** | Virtualized list with search/filter | By type, tag, entity |
| **Gallery** | Card grid with previews | By type, tag, entity |
| **Neural** | `react-force-graph-2d` | By entity relationships (from entity_links) |

### 4.3 Class Notes Views

| View | Implementation |
|------|---------------|
| **All class notes** | Sortable by most recent / oldest |
| **Grouped by class** | Collapsible sections per class |
| **Calendar** | Calendar grid showing class note dates |

### 4.4 Task Notes Views

| View | Implementation |
|------|---------------|
| **All tasks** | Filtered by: has note / no note, status, date |
| **Grouped tasks** | Shows task group sessions |
| **Milestone view** | Hierarchical: Milestone → Deliverables → Tasks |

---

## 5. Monorepo Structure

### 5.1 Tool: Turborepo + pnpm

```
vida-platform/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
│
├── packages/
│   ├── core/                           # 🔑 SHARED BUSINESS LOGIC
│   │   ├── src/
│   │   │   ├── encryption/
│   │   │   │   ├── vault.ts
│   │   │   │   ├── srp.ts
│   │   │   │   └── sharing.ts
│   │   │   ├── sync/
│   │   │   │   ├── crdt.ts
│   │   │   │   ├── queue.ts
│   │   │   │   └── resolver.ts
│   │   │   ├── models/
│   │   │   │   ├── finance.ts
│   │   │   │   ├── project.ts
│   │   │   │   ├── task.ts
│   │   │   │   ├── habit.ts
│   │   │   │   ├── routine.ts
│   │   │   │   ├── relationship.ts
│   │   │   │   ├── learning.ts
│   │   │   │   ├── note.ts             # Note, Journal, ClassNote types
│   │   │   │   └── entity-link.ts      # Backlink/reference types
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   ├── migrations/
│   │   │   │   └── adapter.ts
│   │   │   ├── services/
│   │   │   │   ├── finance-service.ts
│   │   │   │   ├── study-planner.ts
│   │   │   │   ├── reminder-engine.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── journal-service.ts   # Daily summary generation
│   │   │   │   ├── pomodoro-service.ts  # Timer logic
│   │   │   │   ├── backlink-service.ts  # Parse & manage entity links
│   │   │   │   ├── export-service.ts    # PDF/DOCX export logic
│   │   │   │   └── search-service.ts    # Full-text search across notes
│   │   │   └── utils/
│   │   │       ├── ics-parser.ts
│   │   │       ├── markdown.ts
│   │   │       └── graph-data.ts        # Neural graph data builder
│   │   └── package.json
│   │
│   ├── editor/                          # 📝 SHARED BLOCK EDITOR
│   │   ├── src/
│   │   │   ├── extensions/
│   │   │   │   ├── daily-summary.ts     # /summary block
│   │   │   │   ├── task-checklist.ts    # /tasks block (live, completable)
│   │   │   │   ├── events-block.ts      # /events block
│   │   │   │   ├── habits-block.ts      # /habits block
│   │   │   │   ├── timeline-block.ts    # /timeline visualization
│   │   │   │   ├── chart-block.ts       # /chart embeddable charts
│   │   │   │   ├── pomodoro-block.ts    # /pomodoro embedded timer
│   │   │   │   ├── entity-link.ts       # [[wiki-link]] resolution
│   │   │   │   ├── backlink-panel.ts    # Backlinks display at bottom
│   │   │   │   ├── image-block.ts       # Encrypted image embed
│   │   │   │   └── tag-extension.ts     # #tag support
│   │   │   ├── serializers/
│   │   │   │   ├── to-markdown.ts       # TipTap JSON → Markdown
│   │   │   │   ├── from-markdown.ts     # Markdown → TipTap JSON
│   │   │   │   ├── to-pdf.ts           # TipTap JSON → PDF
│   │   │   │   └── to-docx.ts          # TipTap JSON → DOCX
│   │   │   ├── editor.tsx               # Main editor component
│   │   │   ├── toolbar.tsx              # Formatting toolbar
│   │   │   └── slash-menu.tsx           # Slash command menu
│   │   └── package.json
│   │
│   ├── ui/                              # 🎨 SHARED UI COMPONENTS
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── calendar-view.tsx    # Shared calendar grid
│   │   │   │   ├── gallery-view.tsx     # Card gallery
│   │   │   │   ├── list-view.tsx        # Virtualized list
│   │   │   │   ├── neural-graph.tsx     # Force-directed graph
│   │   │   │   ├── pomodoro-widget.tsx  # Timer UI
│   │   │   │   ├── timeline.tsx         # Timeline visualization
│   │   │   │   └── export-dialog.tsx    # PDF/DOCX export UI
│   │   │   ├── hooks/
│   │   │   ├── themes/
│   │   │   └── icons/
│   │   └── package.json
│   │
│   └── types/
│       ├── src/
│       │   ├── api.ts
│       │   ├── models.ts
│       │   ├── notes.ts                 # Note, Journal, ClassNote types
│       │   ├── editor.ts               # Block types, editor state
│       │   └── sync.ts
│       └── package.json
│
├── apps/
│   ├── web/                             # 🌐 WEB APPLICATION
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── finance/
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   ├── habits/
│   │   │   │   ├── routines/
│   │   │   │   ├── relationships/
│   │   │   │   ├── learning/
│   │   │   │   ├── journals/            # All journals views
│   │   │   │   │   ├── index.tsx        # Calendar/List/Gallery
│   │   │   │   │   └── [date].tsx       # Single journal page
│   │   │   │   ├── notes/               # All notes views
│   │   │   │   │   ├── index.tsx        # Calendar/List/Gallery/Neural
│   │   │   │   │   └── [id].tsx         # Single note page
│   │   │   │   ├── class-notes/         # Class notes views
│   │   │   │   │   ├── index.tsx        # All/Grouped/Calendar
│   │   │   │   │   └── [id].tsx         # Single class note
│   │   │   │   └── settings/
│   │   │   ├── components/
│   │   │   ├── db/                      # wa-sqlite adapter
│   │   │   └── workers/                 # Web Workers for encryption
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── mobile/                          # 📱 MOBILE (Expo)
│   │   ├── app/                         # Expo Router
│   │   │   ├── (tabs)/
│   │   │   │   ├── journals.tsx
│   │   │   │   ├── notes.tsx
│   │   │   │   ├── tasks.tsx
│   │   │   │   └── more.tsx
│   │   │   ├── journal/[date].tsx
│   │   │   ├── note/[id].tsx
│   │   │   └── ...
│   │   ├── components/
│   │   ├── db/                          # expo-sqlite adapter
│   │   └── package.json
│   │
│   ├── desktop/                         # 🖥️ DESKTOP (Tauri v2)
│   │   ├── src/                         # React frontend (shares with web)
│   │   ├── src-tauri/
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── db.rs
│   │   │   │   └── file-system.rs       # Local file storage for attachments
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   │
│   └── server/                          # ☁️ SYNC SERVER (zero-knowledge)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── sync.ts
│       │   │   └── billing.ts
│       │   └── storage/
│       └── package.json
│
├── tools/
│   ├── scripts/
│   └── generators/
│
└── docs/
    ├── architecture.md
    ├── encryption.md
    ├── sync-protocol.md
    ├── editor-blocks.md
    └── module-specs/
```

### 5.2 Git Branching Strategy

```
main              ← Production-ready, always deployable
  └── develop     ← Integration branch
       ├── feat/core-encryption
       ├── feat/editor-blocks
       ├── feat/journal-summary
       ├── feat/neural-graph
       └── fix/sqlite-migration
```

**Rules:** `main` is protected, merge only from `develop`. Feature branches are short-lived. Tag releases with semver (`v0.1.0`). Use conventional commits (`feat:`, `fix:`, `refactor:`).

---

## 6. Build & Deployment Pipeline

### 6.1 Build Matrix

| Platform | Build Tool | Output | Distribution |
|----------|-----------|--------|-------------|
| **Web** | Vite | Static SPA | Cloudflare Pages or Vercel |
| **iOS** | Expo EAS Build | `.ipa` | Apple App Store |
| **Android** | Expo EAS Build | `.apk` / `.aab` | Google Play Store |
| **Windows** | Tauri + GitHub Actions | `.msi` / `.exe` | GitHub Releases |
| **macOS** | Tauri + GitHub Actions | `.dmg` | GitHub Releases |
| **Linux** | Tauri + GitHub Actions | `.AppImage` / `.deb` | GitHub Releases |
| **Server** | Wrangler or Docker | Worker / Container | Cloudflare Workers or Fly.io |

### 6.2 CI/CD with GitHub Actions

```yaml
# .github/workflows/ci.yml (simplified)
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  core-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm turbo run lint typecheck test --filter=@vida/core --filter=@vida/editor

  deploy-web:
    needs: core-checks
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm turbo run build --filter=@vida/web
      - uses: cloudflare/pages-action@v1

  build-mobile:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - run: npx eas-cli build --platform all --non-interactive

  build-desktop:
    if: startsWith(github.ref, 'refs/tags/v')
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - run: pnpm turbo run build --filter=@vida/desktop
      - uses: tauri-apps/tauri-action@v0
```

---

## 7. Phased Development Roadmap (Revised)

The Notes & Journals system now starts in Phase 0 as part of the foundation, because it's the integration layer.

### Phase 0: Foundation + Editor Core (Weeks 1-8)
**Goal: Core infrastructure + basic note-taking working**
- [ ] Monorepo setup (Turborepo + pnpm)
- [ ] Shared `core` package: encryption layer, DB abstraction, sync skeleton
- [ ] Auth system (SRP-based, zero-knowledge)
- [ ] Web app shell (Vite + React + Router)
- [ ] Local SQLite in browser (wa-sqlite + OPFS)
- [ ] **TipTap editor setup with basic blocks** (text, headings, lists, images)
- [ ] **Basic note CRUD** (create, edit, save encrypted, list)
- [ ] **Markdown import/export**
- [ ] **Tag system + basic search**
- [ ] CI/CD pipeline

### Phase 1: Journals + Tasks (Weeks 9-14)
**Goal: Daily journal with task integration — first real user value**
- [ ] Journal system (one per day, calendar/list/gallery views)
- [ ] Task CRUD with local persistence
- [ ] **Task notes** (linked note per task, with opt-out)
- [ ] **/tasks block** in editor (live, completable checklist)
- [ ] **Daily summary block** (initially just tasks)
- [ ] **Entity linking** ([[wiki-links]]) + backlink tracking
- [ ] **Backlinks panel** on each note
- [ ] Sync working between web instances

### Phase 2: Habits + Routines + Pomodoro (Weeks 15-19)
**Goal: Time-based features, focus tools**
- [ ] Habit/Routine CRUD with recurrence
- [ ] **/habits block** in journal (completable)
- [ ] **/pomodoro block** in task notes
- [ ] Pomodoro session tracking + analytics
- [ ] Daily summary block expanded (habits, routines)
- [ ] Calendar view for habits/routines
- [ ] Analytics charts (streaks, completion rates)

### Phase 3: Mobile App (Weeks 20-24)
**Goal: Second platform, cross-device sync proven**
- [ ] Expo app shell with shared core + editor
- [ ] SQLite on mobile (expo-sqlite)
- [ ] Cross-device sync (web ↔ mobile)
- [ ] Offline mode
- [ ] Push notifications (habits, reminders, pomodoro)
- [ ] Mobile-optimized editor experience

### Phase 4: Learning Management + Class Notes (Weeks 25-34)
**Goal: Your most-needed module as a student**
- [ ] Class management + ICS sync
- [ ] **Class notes system** (all views: all, grouped, calendar)
- [ ] Knowledge base (topics, definitions, concepts)
- [ ] Book tracking with TOC
- [ ] Study plan wizard
- [ ] **/classes block** and **/events block** in journals
- [ ] Study session timer (uses pomodoro infrastructure)
- [ ] Daily summary expanded (study sessions, classes)
- [ ] Language learning section

### Phase 5: Financial Management (Weeks 35-40)
**Goal: High-value privacy module**
- [ ] Accounts, transactions, assets, liabilities
- [ ] Bank statement import (CSV/OFX)
- [ ] Transaction reconciliation
- [ ] Daily summary expanded (transactions)
- [ ] **/chart block** for financial visualizations in notes

### Phase 6: Desktop App (Weeks 41-44)
**Goal: Third platform**
- [ ] Tauri app shell with shared React UI
- [ ] Native SQLite + file system access
- [ ] Auto-update mechanism
- [ ] Desktop-specific features (system tray, keyboard shortcuts)

### Phase 7: Relationship Management + Neural Graph (Weeks 45-52)
**Goal: Complex relational data, graph visualization**
- [ ] People, networks, groups
- [ ] Interaction logging
- [ ] Reminder engine
- [ ] **Neural graph view** (D3 force-directed) for relationships
- [ ] **Neural graph view for notes** (reuse same component)
- [ ] Relationship health scoring
- [ ] Daily summary expanded (interactions)

### Phase 8: Project Management (Weeks 53-58)
**Goal: Document-heavy, milestone system**
- [ ] Project CRUD with markdown editor
- [ ] **Milestone notes** (hierarchical: milestone → deliverables → tasks)
- [ ] **Deliverable notes** (standalone)
- [ ] Document storage (encrypted attachments)
- [ ] Progress visualization
- [ ] **/milestone block** in editor
- [ ] **/timeline block** for project timelines

### Phase 9: Polish + Advanced Features (Weeks 59+)
**Goal: Export, search, and refinement**
- [ ] **PDF export** from any note/journal
- [ ] **DOCX export** from any note/journal
- [ ] **Global full-text search** across all notes and entities
- [ ] **Task groups** (grouped task sessions with combined notes)
- [ ] **Timeline blocks** for arbitrary content
- [ ] **Chart blocks** with custom data
- [ ] Advanced neural graph filtering and clustering
- [ ] Performance optimization (virtualization, lazy loading)

---

## 8. Critical Decisions & Trade-offs

### 8.1 Why TipTap Over Alternatives

| Editor | Pros | Cons | Verdict |
|--------|------|------|---------|
| **TipTap** | Yjs-native (CRDT sync), extensible blocks, React-first, active development | Learning curve for custom nodes | ✅ Best fit |
| **Plate.js** | Also ProseMirror-based, plugin system | Smaller community, less Yjs integration | Close second |
| **BlockNote** | Notion-like out of the box | Less customizable, harder to add deep integrations | Too rigid |
| **Lexical** (Meta) | Fast, modern | Weaker Yjs support, less mature ecosystem | Not ready |
| **CodeMirror** | Great for code | Not a block editor | Wrong tool |

### 8.2 Why NOT Separate Note App

You might be tempted to build the note-taking app as a separate product. Don't. The entire value proposition is the integration — journals that auto-populate from habits, task notes with pomodoro timers, class notes linked to knowledge bases. Separate apps means losing all of that.

### 8.3 Storage Size Optimization

With everything local, storage matters. Strategies:
- **Text notes:** Compress TipTap JSON with LZ4 before encrypting (~60-80% reduction)
- **Images:** Compress to WebP, generate thumbnails, encrypt both
- **Attachments:** Store encrypted blobs with lazy loading (download from sync server on demand)
- **SQLite:** Use WAL mode for better write performance, run VACUUM periodically
- **Target:** A heavy user with 1000 notes, 500 images should use <500MB

### 8.4 Mobile Editor Limitations

TipTap on React Native is the biggest risk. Options:
- **Option A:** Use `react-native-webview` + TipTap (run the editor in a webview). Obsidian mobile does this.
- **Option B:** Use a native RN editor like `10play/10tap-editor` (TipTap wrapper for RN, actively maintained).
- **Option C:** Build a simplified editor for mobile (view-only for complex blocks, edit for text).
- **Recommendation:** Start with **Option A** (webview). It's proven and gives you feature parity immediately.

---

## 9. Cost Estimation

| Service | Free Tier | Paid Estimate |
|---------|-----------|--------------|
| **Cloudflare Pages** | 500 builds/month | Free |
| **Cloudflare Workers** | 100K req/day | ~$5/month |
| **Cloudflare R2** | 10GB | ~$0.015/GB/month |
| **Expo EAS** | 30 builds/month | Free |
| **GitHub Actions** | 2,000 min/month | Free |
| **Domain** | — | ~$12/year |
| **Apple Developer** | — | $99/year |
| **Google Play** | — | $25 one-time |
| **Total** | | **~$15/month + $136/year** |

---

## 10. Summary

The platform now has three architectural layers: **Core Infrastructure** (encryption, sync, DB), **Data Modules** (finance, projects, tasks, habits, routines, relationships, learning), and the **Notes & Journals Layer** (the unifying interface that surfaces everything through a TipTap block editor with custom integration blocks).

The note-taking system is built into Phase 0 from day one because it's not a feature — it's the interface. Start with the editor + basic notes, then add integration blocks as you build each module. By Phase 4 (Learning), you'll have a fully functional knowledge management system with journals, task notes, class notes, backlinks, and a neural graph.
