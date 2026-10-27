# Performance Strategy

This document specifies performance targets, strategies, and budgets for the Vida Platform. It covers query latency, rendering, memory management, bundle size, and the approach to handling years of accumulated user data.

**Audience:** Developers implementing UI components, service methods, or optimizing existing code.

**Governs:** All list rendering, query patterns, cache configuration, code splitting decisions, and search infrastructure.

> **Implementation status (2026-07-25):** The performance guidance here is substrate-neutral and current — its query,
> cache, and index examples use tables that survive the substrate model (`tasks`, `pages`, `entity_links`,
> `habit_completions`, `transactions`). Note that latency targets referencing **decryption** apply once field-level
> encryption lands on the **deferred hardening pass** (ADR-017: Phase-1.0 is features-first). No retired tokens are
> used here; substrate primitives cite their owning ADR.

---

## 1. Latency Targets

Every user-facing operation has a strict latency target measured from user action to rendered result. These are enforced via performance testing.

| Operation                   | Target  | Notes                                                                                           |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| **List view render**        | < 100ms | From navigation to visible list items. Includes SQLite query + decryption + React render.       |
| **Detail view render**      | < 150ms | From navigation to fully rendered detail page. Includes cross-module joins for inline previews. |
| **Full-text search**        | < 200ms | From keystroke to results. FTS5 query against local index.                                      |
| **Dashboard aggregation**   | < 500ms | Aggregation queries across multiple modules (journal summary, purpose progress).                |
| **Editor load (TipTap)**    | < 300ms | From page navigation to interactive editor with content rendered. Includes Yjs document load.   |
| **Vault unlock (Argon2id)** | < 2s    | Key derivation time. Argon2id parameters tuned to balance security vs unlock speed.             |
| **Sync push/pull cycle**    | < 3s    | Full cycle: serialize, encrypt, push pending changes, pull remote changes, decrypt, merge.      |

### How to Measure

- **List/detail views:** Measure from React Router navigation event to `useQuery` `isSuccess` + first paint (via `performance.mark`)
- **Search:** Measure from input `onChange` to results rendered (debounce excluded)
- **Editor:** Measure from route load to TipTap `onReady` callback
- **Vault unlock:** Measure `unlock()` call duration
- **Sync:** Measure from sync trigger to `SyncResult` return

### What Happens When Targets Are Missed

If a target is consistently missed (>P95):

1. Profile the hot path (React DevTools, SQLite EXPLAIN QUERY PLAN)
2. Check for missing indexes, unnecessary decryption, or unvirtualized lists
3. If the query itself is slow, consider adding a materialized aggregate or denormalized column
4. Never sacrifice correctness for performance — fix the query, don't skip encryption

---

## 2. Database Query Performance

### Index Strategy

All frequently filtered, sorted, or joined columns are indexed in `packages/core/src/db/migrations/001_initial.ts`. The key index categories:

| Index Type             | Pattern                               | Examples                                                                                           |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Primary key**        | Every table has `id TEXT PRIMARY KEY` | Automatic B-tree lookup                                                                            |
| **Foreign key**        | Every FK column is indexed            | `tasks.project_id`, `habit_completions.habit_id`                                                   |
| **Date/calendar**      | Date columns used in WHERE clauses    | `pages.journal_date`, `transactions.date`, `habit_completions.completed_date`                      |
| **Status/enum**        | Status columns used for filtering     | `tasks.status`, `projects.status`, `habits.is_active`                                              |
| **Soft delete**        | `deleted_at` column for exclusion     | `pages.deleted_at` (partial index WHERE deleted_at IS NULL)                                        |
| **Sync**               | Sync status for queue processing      | `sync_queue.status`, `_sync_status` on all syncable tables                                         |
| **Unique constraints** | Natural keys                          | `pages.journal_date` (unique per date for journals), `habit_completions(habit_id, completed_date)` |
| **Composite**          | Multi-column filters                  | `entity_links(entity_type, entity_id)`, `pages(entity_type, entity_id)`                            |

### Query Patterns to Follow

**Always filter soft-deleted rows:**

```sql
WHERE deleted_at IS NULL
```

**Always use indexed columns in WHERE and ORDER BY:**

```sql
-- Good: uses index on due_date
SELECT * FROM tasks WHERE due_date = '2026-03-29' AND deleted_at IS NULL

-- Bad: full table scan on unindexed column
SELECT * FROM tasks WHERE description LIKE '%meeting%'
-- Use FTS5 instead for text search
```

**Limit result sets for list views:**

```sql
-- Paginated with cursor-based pagination
SELECT * FROM tasks
WHERE due_date >= ? AND deleted_at IS NULL
ORDER BY due_date ASC, created_at ASC
LIMIT 50
```

### SQLite Configuration for Performance

Configured in `packages/core/src/db/adapter.ts`:

| PRAGMA         | Value  | Purpose                                              |
| -------------- | ------ | ---------------------------------------------------- |
| `journal_mode` | WAL    | Write-ahead logging — concurrent reads during writes |
| `synchronous`  | NORMAL | Balance between safety and write speed               |
| `temp_store`   | MEMORY | Temp tables in memory (faster sorts and joins)       |
| `cache_size`   | -2000  | 2MB page cache (negative = KB)                       |
| `foreign_keys` | ON     | Enforce referential integrity                        |

---

## 3. Rendering Performance

### List Virtualization

Lists use **TanStack Virtual** when the item count exceeds **100 items**. Below that threshold, items render normally.

| List Size    | Strategy         | Rationale                                                                                                                             |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| <= 100 items | Full render      | Virtualization overhead not justified. Most user-facing lists (project tasks, daily habits, contact list) are under 100 items.        |
| > 100 items  | TanStack Virtual | Aggregated views (all tasks, all transactions, all notes) can grow to thousands. Virtual rendering keeps scroll performance at 60fps. |

**Implementation pattern:**

```typescript
const items = useTaskList(filters)

if (items.length > 100) {
  return <VirtualizedTaskList items={items} />
} else {
  return <TaskList items={items} />
}
```

### Lazy Loading

| Resource                       | Strategy                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Attachments**                | Never pre-loaded. Thumbnails lazy-loaded on scroll. Full image loaded on click.                       |
| **Cross-module data**          | On-demand — fetched when the user navigates to the view (see `cross-module-integration.md` section 9) |
| **Study sessions on entities** | Collapsible section, query runs only on expand                                                        |
| **Entity link preview cards**  | Fetched on hover, not pre-loaded                                                                      |
| **Editor extensions**          | TipTap loads only the extensions used on the current page                                             |

### Progressive Rendering

For views with multiple data sources (journal daily summary, dashboard):

1. Render the page shell immediately
2. Each data section loads independently via its own `useQuery`
3. Sections show skeleton loaders until their data arrives
4. No section blocks another — partial content is visible immediately

---

## 4. Full-Text Search (FTS5)

### Architecture

Encrypted fields (titles, descriptions, content) cannot be searched with SQL `LIKE` or `WHERE`. FTS5 virtual tables provide full-text search over decrypted content.

FTS5 tables are defined in `packages/core/src/db/migrations/001_initial.ts` and cover: pages (title + content), tasks (title + description), contacts (name), habits (name + description), and other searchable entities.

### Index Rebuild After Vault Unlock

FTS5 indexes are populated with **decrypted** plaintext. They must be rebuilt every time the vault is unlocked because:

- The FTS5 tables are empty on a fresh database open (SQLCipher encrypts everything)
- Encrypted fields are decrypted only after the vault key is available

**Rebuild strategy: Background, progressive.**

```
Vault unlock
  |
  v
DB opens (SQLCipher key applied)
  |
  v
App becomes usable immediately (markDbUnlocked)
  |
  v
Background: rebuild FTS5 in batches
  - 500 rows per batch
  - Yield between batches (requestIdleCallback on web, InteractionManager on mobile)
  - Search is available immediately but returns partial results
  - 'Indexing...' indicator shown in search UI until complete
  - markFtsReady() called when rebuild finishes
  |
  v
Full search available
```

**Batch processing:**

```typescript
async function rebuildFtsIndex(db: DrizzleDb, vaultKey: Uint8Array) {
  const BATCH_SIZE = 500
  let offset = 0

  while (true) {
    const rows = await db.select().from(pages).limit(BATCH_SIZE).offset(offset)

    if (rows.length === 0) break

    for (const row of rows) {
      const decrypted = decryptRow(row, pageEncryptionSchema, vaultKey)
      await db.insert(ftsPages).values({
        rowid: row.id,
        title: decrypted.title,
        content: extractPlainText(decrypted.content), // strip TipTap JSON to text
      })
    }

    offset += BATCH_SIZE
    await yieldToMainThread() // requestIdleCallback or equivalent
  }

  markFtsReady()
}
```

### Search Performance Target

FTS5 queries must return results in **< 200ms** regardless of index size. FTS5 is optimized for this — it uses an inverted index internally, not sequential scan.

```sql
-- Fast: uses FTS5 inverted index
SELECT rowid, rank FROM fts_pages WHERE fts_pages MATCH 'meeting notes'
ORDER BY rank LIMIT 20

-- Join back to get full rows
SELECT p.* FROM pages p
JOIN fts_pages fp ON p.id = fp.rowid
WHERE fts_pages MATCH ? ORDER BY fp.rank LIMIT 20
```

---

## 5. React Query Cache Configuration

Cache times are configured per data volatility category to balance freshness against unnecessary re-fetches.

### Cache Time Categories

| Category              | staleTime         | gcTime | Examples                                                                       |
| --------------------- | ----------------- | ------ | ------------------------------------------------------------------------------ |
| **High volatility**   | 30s               | 5 min  | Tasks, habit completions, routine completions, transactions, interactions      |
| **Medium volatility** | 60s               | 10 min | Projects, contacts, study sessions, milestones, courses, books                 |
| **Low volatility**    | 5 min             | 30 min | Preferences, achievements, user profile, check-in templates, session templates |
| **Reactive views**    | 0s (always fresh) | 5 min  | Journal daily summary, dashboard widgets                                       |

### What These Values Mean

- **staleTime** — How long data is considered fresh after a fetch. During this window, React Query returns cached data without re-fetching. After it expires, the next component mount triggers a background re-fetch.
- **gcTime** (garbage collection time) — How long inactive query data stays in memory after the last subscriber unmounts. After this window, the data is evicted from cache entirely.

### Configuration Pattern

```typescript
// apps/web/src/hooks/useTasks.ts
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.findAll(filters),
    staleTime: 30_000, // 30s — high volatility
    gcTime: 5 * 60_000, // 5 min
  })
}

// apps/web/src/hooks/usePreferences.ts
export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferenceService.get(),
    staleTime: 5 * 60_000, // 5 min — low volatility
    gcTime: 30 * 60_000, // 30 min
  })
}

// apps/web/src/hooks/useJournalSummary.ts
export function useJournalSummary(date: string) {
  return useQuery({
    queryKey: ['journal-summary', date],
    queryFn: () => journalService.getSummary(date),
    staleTime: 0, // always re-fetch — reactive
    gcTime: 5 * 60_000,
  })
}
```

### Global Defaults

Set in the React Query client configuration:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // default: high volatility
      gcTime: 5 * 60_000,
      retry: 1, // retry once on failure (local DB, failures are rare)
      refetchOnWindowFocus: false, // local-first — no server to re-fetch from
    },
  },
})
```

`refetchOnWindowFocus` is **false** because all data is local. There's no remote server to re-fetch from — the SQLite database is always available and consistent.

---

## 6. Bundle Size Budgets

### Target Budgets (Gzipped)

| Bundle                                    | Budget  | Loading                                         |
| ----------------------------------------- | ------- | ----------------------------------------------- |
| **Initial (shell + router + core React)** | < 80KB  | Blocking — must load before first paint         |
| **Framework (React + Tamagui base)**      | < 120KB | Blocking — loaded with initial bundle           |
| **Editor (TipTap + extensions)**          | < 150KB | Lazy — loaded when user opens a page/note       |
| **Charts (Chart.js + react-chartjs-2)**   | < 60KB  | Lazy — loaded when user opens a chart view      |
| **Graph (Sigma.js + @sigma/react)**       | < 50KB  | Lazy — loaded when user opens neural graph view |
| **WASM (wa-sqlite + SQLCipher)**          | ~800KB  | Parallel — loaded alongside initial bundle      |

### Code Splitting Strategy

**Route-based splitting:** Every top-level route is a lazy-loaded chunk. Navigating to `/habits` loads the habits page bundle. Navigating to `/finance` loads the finance page bundle.

```typescript
// apps/web/src/routes.tsx
const HabitsPage = lazy(() => import('./app/habits'))
const FinancePage = lazy(() => import('./app/finance'))
const NotesPage = lazy(() => import('./app/notes'))
```

**Heavy library splitting:** Libraries over 50KB are dynamically imported only when needed.

| Library             | Trigger                          | Dynamic Import                  |
| ------------------- | -------------------------------- | ------------------------------- |
| TipTap + extensions | User opens a page with an editor | `import('@vida/editor')`        |
| Chart.js            | User opens a view with charts    | `import('react-chartjs-2')`     |
| Sigma.js            | User opens neural graph view     | `import('@sigma/react')`        |
| PDF export          | User clicks "Export to PDF"      | `import('@react-pdf/renderer')` |
| DOCX export         | User clicks "Export to DOCX"     | `import('docx')`                |

**WASM loading:** The wa-sqlite WASM binary (~800KB) loads in parallel with the initial JavaScript bundle via a separate `<script>` or `fetch()`. The app shows a loading screen until both JS and WASM are ready.

### Monitoring

Bundle sizes are checked in CI via `vite-plugin-compression` or `source-map-explorer`. A PR that increases any lazy chunk beyond its budget requires justification.

---

## 7. Memory Management

Strategies for keeping memory usage stable during long-running sessions (user keeps the app open all day).

### React Query Garbage Collection

Inactive query data is evicted after `gcTime` expires. This prevents unbounded cache growth as the user navigates between views.

| Category          | gcTime | Effect                                               |
| ----------------- | ------ | ---------------------------------------------------- |
| High volatility   | 5 min  | Task/habit data evicted 5 min after leaving the view |
| Medium volatility | 10 min | Project/contact data evicted after 10 min            |
| Low volatility    | 30 min | Preferences cached for 30 min after last read        |

**Key behavior:** When a user navigates away from a tasks list, the query data stays in memory for 5 minutes. If they return within 5 minutes, instant render from cache. After 5 minutes, the data is garbage collected and re-fetched on next visit.

### Editor Memory (Yjs Documents)

Each open page loads a Yjs document into memory for CRDT support. For long documents with extensive edit history, the Yjs state vector can grow large.

**Strategies:**

- **One document at a time** — Only the currently viewed page's Yjs document is in memory. Navigating away disposes the previous document.
- **Yjs snapshot compaction** — Periodically compact the Yjs document by encoding the full state as a fresh snapshot (`Y.encodeStateAsUpdate(ydoc)`), discarding the incremental update history. This happens on page save or navigate-away.
- **Maximum document size** — If a Yjs document exceeds 5MB, warn the user and suggest splitting the page.

### Attachment Thumbnail Cache

Thumbnails for note attachments are cached in memory after first load.

**Strategies:**

- **LRU cache** — Keep the most recently viewed 100 thumbnails in memory. Evict oldest when the limit is reached.
- **Size limit** — Maximum 50MB total thumbnail cache. Individual thumbnails are < 100KB each.
- **Eviction on navigate** — When leaving a page with attachments, thumbnails are eligible for eviction (not immediately purged — kept in LRU for quick return).

### Vault Key Memory

The vault key (`Uint8Array`, 32 bytes) is cached in memory by `key-management.ts` for the duration of the session.

**Strategies (already implemented):**

- **Auto-lock timer** — Vault key is wiped from memory after a configurable idle period (default: 15 minutes). Resets on user activity.
- **Secure wipe** — `zeroKey()` in `vault.ts` overwrites the key bytes with zeros before releasing the reference.
- **Master key is never cached** — Only the vault key is kept in memory. The master key is derived, used to compute the vault key, and immediately wiped.

---

## 8. Long-Term Data Strategy

Strategies for maintaining performance as the user accumulates years of data.

### SQLite WAL Mode

WAL (Write-Ahead Logging) is enabled on all platforms. It provides:

- Concurrent reads during writes (no read blocking)
- Better write performance for frequent small writes (habit completions, task updates)
- Automatic WAL checkpointing keeps the WAL file bounded

### VACUUM Strategy

SQLite databases can accumulate fragmentation from deletions and updates. Periodic `VACUUM` reclaims space and defragments.

- **When:** On app startup, if more than 30 days since last VACUUM (tracked in `app_state`)
- **How:** `PRAGMA incremental_vacuum` for partial reclamation, full `VACUUM` only when triggered manually from settings
- **Impact:** Full VACUUM rewrites the entire database — can take seconds for large databases. Run only during low-activity periods.

### Pagination

All list queries use cursor-based pagination with a default page size of 50 items. This ensures consistent query time regardless of total table size.

```sql
-- Cursor-based: fetch next 50 tasks after the last seen ID
SELECT * FROM tasks
WHERE (due_date, id) > (?, ?)
  AND deleted_at IS NULL
ORDER BY due_date ASC, id ASC
LIMIT 50
```

### Chart Data Decimation

Chart.js built-in data decimation is used for time-series charts that span long periods:

- **Daily data over > 90 days:** Decimate to weekly averages
- **Daily data over > 365 days:** Decimate to monthly averages
- **Algorithm:** LTTB (Largest-Triangle-Three-Buckets) — preserves visual shape while reducing points

This ensures habit streak charts and financial trend lines remain responsive even with years of daily data.

### Sigma.js Graph Performance

The neural graph (Sigma.js, WebGL) is designed to handle 10K+ nodes:

- **Incremental loading** — Load the top 500 most-connected nodes first, expand on demand
- **Clustering** — Nodes with many connections are grouped into clusters at high zoom levels
- **Edge bundling** — Dense edge regions are simplified for rendering
- **WebGL rendering** — GPU-accelerated, avoids DOM node overhead

---

## References

- **ADR-001 section 5** — Database technologies per platform
- **ADR-001 section 10** — Chart.js and Sigma.js selection rationale
- **ADR-001 section 12** — React Query and Zustand for state management
- **ADR-002 section 5** — Complete schema with all indexes defined
- `packages/core/src/db/adapter.ts` — SQLite PRAGMA configuration
- `packages/core/src/db/migrations/001_initial.ts` — All indexes and FTS5 virtual tables
- `packages/core/src/encryption/key-management.ts` — Vault key lifecycle and auto-lock
- `docs/core/architecture/data-flow.md` — Read/write flow and cache invalidation patterns
- `docs/core/architecture/cross-module-integration.md` — Data freshness strategy (reactive vs on-demand)
