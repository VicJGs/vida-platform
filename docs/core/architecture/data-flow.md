# Data Flow

This document describes how data moves through the Vida Platform at every layer — from user input to encrypted storage to synced state. Every service method, repository call, and state management hook follows the patterns defined here.

**Audience:** Developers implementing service methods, state management hooks, or debugging data issues.

**Governs:** All service implementations in `packages/core/src/services/`. Every service must follow the data flow described here.

**Code it documents (already implemented):**
- `packages/core/src/db/repository.ts` — Generic repository with `encryptRow`, `decryptRow`, `create`, `update`, `findById`, `findAll`
- `packages/core/src/db/adapter.ts` — Database adapter interface with `SqliteDriver`, `DatabaseAdapter`, `initializeConnection`
- `packages/core/src/encryption/vault.ts` — Encryption primitives with `encryptField`, `decryptField`, `hashContent`
- `packages/core/src/encryption/key-management.ts` — Vault key lifecycle with `unlock`, `lock`, `getVaultKey`

---

## 1. Universal Write Flow

Every write operation in the platform follows this exact sequence. No service method may skip a step.

```
User action (button click, form submit, inline edit)
    |
    v
[1] UI VALIDATION (apps/web or apps/mobile)
    Zod schema from packages/types validates form input
    Instant error feedback to user
    |
    v
[2] SERVICE CALL (packages/core/src/services/)
    Service receives input
    |
    v
[3] SERVICE RE-VALIDATION
    Same Zod schema validates again (defense-in-depth)
    Throws ServiceError if invalid
    |
    v
[4] DATA TRANSFORMATION
    Convert input to repository shape
    Set defaults, compute derived fields
    |
    v
[5] BUSINESS RULES
    Enforce preconditions (e.g., task not already completed)
    Throws typed ServiceError on violation
    |
    v
[6] SQLite TRANSACTION begins
    |
    v
[7] REPOSITORY WRITE
    7a. Generate id (UUIDv7) for creates
    7b. Set timestamps (created_at, updated_at)
    7c. Encrypt E-classified fields (encryptRow)
    7d. Update sync metadata:
        - _sync_version++ (increment)
        - _sync_lww_ts = Date.now()
        - _sync_status = 'pending'
        - _sync_field_ts[changedField] = Date.now() (only changed fields)
        - _sync_hash = SHA-256 of pre-encryption row
    7e. INSERT or UPDATE in SQLite
    |
    v
[8] SYNC QUEUE ENQUEUE (inside same transaction)
    Insert into sync_queue: { table_name, row_id, operation, payload }
    UPSERT by (table_name, row_id) to deduplicate rapid edits
    |
    v
[9] TRANSACTION COMMIT
    |
    v
[10] POST-COMMIT SIDE EFFECTS (best-effort, non-transactional)
    10a. Award XP via gamification (if applicable)
    10b. Dispatch notification (if applicable, respecting user preferences)
    10c. Invalidate React Query cache keys
    10d. Trigger sync debounce timer (2s for structured data)
    |
    v
[11] RETURN typed result to UI
```

### Why Sync Queue Is Transactional

The sync queue enqueue (step 8) is inside the SQLite transaction because it must be atomic with the data write. If the app crashes after writing data but before enqueuing, that row would never sync to other devices. By including it in the transaction, either both succeed or neither does.

### Why Post-Commit Side Effects Are Best-Effort

Notifications and XP awards (step 10) run after the transaction commits. A failed notification or gamification write must never roll back a successful data write — the user's data is more important than a badge or toast message. These side effects are retryable and non-critical.

---

## 2. Universal Read Flow

Every read operation follows this sequence. The repository handles decryption transparently — services and UI always work with plaintext.

```
User navigates to a view or component mounts
    |
    v
[1] REACT QUERY HOOK (apps/web or apps/mobile)
    useQuery(['tasks', filters], () => taskService.findAll(filters))
    Checks cache first (staleTime determines freshness)
    |
    v
[2] SERVICE METHOD (packages/core/src/services/)
    Applies business logic to query (e.g., exclude soft-deleted)
    Delegates to repository
    |
    v
[3] REPOSITORY QUERY
    3a. Build Drizzle query with filters, ordering, pagination
    3b. Execute SQL against local SQLite
    3c. Decrypt all E-classified fields (decryptRow) — EAGER, always
    3d. Return plaintext typed rows
    |
    v
[4] SERVICE POST-PROCESSING
    Compute derived fields if needed
    Apply cross-module joins (on-demand, not pre-loaded)
    Return typed result
    |
    v
[5] REACT QUERY CACHE
    Result cached with configured staleTime
    Component renders with data
    |
    v
[6] COMPONENT RENDER
    Data is always plaintext — no decryption logic in UI
```

### Eager Decryption Strategy

The repository decrypts **all** E-classified fields on every read — both `findById` and `findAll`. This is the correct strategy because:

1. **XChaCha20-Poly1305 is fast** (~1GB/s) — decrypting a few text fields per row adds negligible latency
2. **Simplicity** — services and UI code never handle encrypted data
3. **No leaked ciphertext** — encrypted fields never appear in React Query cache or component state

### Soft Delete Filtering

By default, `findAll` excludes rows where `deleted_at IS NOT NULL`. Services can explicitly include soft-deleted rows when needed (e.g., trash view, export).

---

## 3. Encryption Pass-Through Pattern

Encryption enters the data pipeline at exactly one point: the **repository boundary**. No other layer touches encryption.

```
                    PLAINTEXT ZONE                  CIPHERTEXT ZONE
                    (services, UI)                  (SQLite, sync)

UI ──> Service ──> Repository ──[encryptRow]──> SQLite (L2 encrypted fields)
                                                    |
UI <── Service <── Repository <──[decryptRow]<──────┘
```

### How `encryptRow` Works

Located in `packages/core/src/db/repository.ts`:

1. Receives a plaintext row and a `TableEncryptionSchema` (maps field names to P/E classification)
2. For each field classified as **E**:
   - If the value is not a string, JSON-serialize it first
   - Call `encryptField(vaultKey, plaintext)` from `vault.ts`
   - Returns `EncryptedField { nonce, ciphertext }` (both base64)
   - Pack as `"nonce:ciphertext"` TEXT for SQLite storage
3. P-classified fields pass through unchanged
4. Returns the row with E fields replaced by ciphertext

### How `decryptRow` Works

The reverse operation:

1. For each field classified as **E**:
   - Unpack `"nonce:ciphertext"` format
   - Call `decryptField(vaultKey, { nonce, ciphertext })` from `vault.ts`
   - If the original was JSON-serialized (arrays, objects), parse it back
2. Returns the row with all fields as plaintext

### Vault Key Access

The repository obtains the vault key via `getVaultKey()` from `packages/core/src/encryption/key-management.ts`. This function:

- Returns the cached in-memory vault key if unlocked
- Throws `VaultLockedError` if the vault is locked
- The vault key is derived once at login via `unlock(password, accountKey, salt)` and cached in memory until `lock()` is called or auto-lock triggers

### Encryption Classification Source

Each table's encryption schema is defined alongside its Drizzle schema in `packages/core/src/db/schema.ts`. Fields marked with `/* E */` comments in the SQL correspond to E-classified fields in the `TableEncryptionSchema`.

---

## 4. Sync Metadata Management

Every syncable table has sync metadata columns managed automatically by the repository on every write. No service method updates these directly.

### Sync Columns

| Column | Type | Managed By | Purpose |
|--------|------|-----------|---------|
| `_sync_id` | TEXT (UUIDv4) | Repository `create()` | Stable sync identifier, set once |
| `_sync_version` | INTEGER | Repository `create()`, `update()` | Incremented on every write |
| `_sync_device_id` | TEXT | Repository `create()`, `update()` | Device that last modified this row |
| `_sync_lww_ts` | INTEGER | Repository `create()`, `update()` | `Date.now()` — used for LWW conflict resolution |
| `_sync_status` | TEXT | Repository + sync engine | `'pending'` on write, `'synced'` after server ACK |
| `_sync_hash` | TEXT | Repository `create()`, `update()` | SHA-256 of pre-encryption row for change detection |
| `_sync_field_ts` | TEXT (JSON) | Repository `update()` | Per-field timestamps for field-level LWW |

### Field Timestamp Tracking (`_sync_field_ts`)

On **create**: All mutable fields get the current timestamp.

On **update**: Only the fields included in the update payload get new timestamps. Unchanged fields retain their previous timestamps. This is critical for correct field-level LWW merge — if a user changes a task's title on Device A and its status on Device B, the merge preserves both changes because each field has an independent timestamp.

```typescript
// Example: updating only the title
await taskService.update(taskId, { title: 'New title' })

// _sync_field_ts result:
{
  "title": 1711500000000,        // updated NOW
  "status": 1711490000000,       // kept from previous write
  "description": 1711480000000,  // kept from previous write
  "priority": 1711470000000      // kept from previous write
}
```

### Sync Hash Computation

`computeSyncHash()` in `repository.ts` computes SHA-256 over all non-sync fields of the row (sorted keys, JSON-serialized). This hash is used by the sync engine to detect whether a row actually changed (avoiding unnecessary pushes when the same data is written twice).

---

## 5. Service Layer Pattern

Every service method in `packages/core/src/services/` follows the same structural pattern. This consistency makes services predictable and auditable.

### Standard Service Method Structure

```typescript
// packages/core/src/services/task-service.ts

import { createTaskSchema, type Task } from '@vida/types'
import { createRepository } from '../db/repository'
import { tasks } from '../db/schema'
import { ServiceError } from '../errors'

const taskRepo = createRepository(tasks, taskEncryptionSchema)

export async function createTask(input: unknown): Promise<Task> {
  // [1] VALIDATE — Zod parse (defense-in-depth, UI already validated)
  const validated = createTaskSchema.parse(input)

  // [2] TRANSFORM — Convert input to repository shape
  const data = {
    ...validated,
    status: 'not_started',
    sort_order: await getNextSortOrder(validated.project_id),
  }

  // [3] BUSINESS RULES — Enforce preconditions
  if (validated.project_id) {
    const project = await projectRepo.findById(validated.project_id)
    if (!project) throw new ServiceError('PROJECT_NOT_FOUND', 'Project does not exist')
    if (project.status === 'completed')
      throw new ServiceError('PROJECT_COMPLETED', 'Cannot add tasks to a completed project')
  }

  // [4] REPOSITORY WRITE — Encrypts + writes + sync metadata (in transaction with sync queue)
  const task = await taskRepo.create(data)

  // [5] POST-COMMIT SIDE EFFECTS — Best-effort
  await awardXP({ action: 'task_created', entityType: 'task', entityId: task.id, xp: 5 })
  // React Query invalidation happens at the hook layer, not here

  // [6] RETURN typed result
  return task
}
```

### Pattern Rules

1. **Validate first** — Always call `schema.parse(input)` before any business logic. Fail fast on bad input.
2. **Transform before rules** — Compute defaults and derived fields so business rules see the final shape.
3. **Business rules throw `ServiceError`** — With a typed error code and human-readable message. Never throw generic `Error`.
4. **One repository call per write** — The repository handles the transaction (write + sync queue). Don't open manual transactions unless doing a batch operation.
5. **Side effects after write** — XP, notifications, and other cross-module effects run post-commit. They never block the write.
6. **Return the created/updated entity** — The UI needs the result to update its cache.

### Batch Operations

The default pattern is single-entity. When the UI requires batch operations (e.g., completing multiple habits at once), the service provides an explicit batch method:

```typescript
export async function batchCompleteHabits(
  entries: { habitId: string; data: unknown }[]
): Promise<HabitCompletion[]> {
  return db.transaction(async (tx) => {
    const results: HabitCompletion[] = []
    for (const entry of entries) {
      results.push(await completeHabit(entry.habitId, entry.data, tx))
    }
    return results
  })
}
```

Batch methods wrap multiple single-entity calls in one transaction. The transaction parameter is threaded through to the repository so all writes share the same SQLite transaction.

---

## 6. Error Handling

Errors are categorized by origin and handled at the appropriate layer.

### Error Types

| Error Type | Origin | Handling |
|-----------|--------|----------|
| **Zod validation error** | Invalid input shape | Caught at UI (form errors) or service (throws `ServiceError` with code `VALIDATION_FAILED`) |
| **ServiceError** | Business rule violation | Thrown by service, caught by UI mutation error handler, mapped to user-facing toast/message by error code |
| **VaultLockedError** | Vault not unlocked | Thrown by repository when `getVaultKey()` fails. UI redirects to unlock screen |
| **Database error** | SQLite constraint violation, disk error | Caught by repository, wrapped in `ServiceError` with code `DB_ERROR` |
| **Encryption error** | Corrupt ciphertext, wrong key | Caught by repository during `decryptRow`. Logged, row marked as corrupted |

### ServiceError Class

```typescript
// packages/core/src/errors.ts

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
```

### Error Codes Convention

Error codes are `SCREAMING_SNAKE_CASE` prefixed by domain:

- `TASK_ALREADY_COMPLETED` — Task module business rule
- `HABIT_NOT_FOUND` — Habit module lookup failure
- `PROJECT_COMPLETED` — Project module precondition
- `VALIDATION_FAILED` — Zod schema validation
- `VAULT_LOCKED` — Encryption layer
- `DB_ERROR` — Database layer
- `SYNC_CONFLICT` — Sync engine

---

## 7. State Management Architecture

The platform uses **React Query for all data from SQLite** and **Zustand for ephemeral UI state only**. These two systems have distinct responsibilities with no overlap.

### React Query — Data Layer

React Query is the sole cache for all entity data read from the local SQLite database.

```typescript
// apps/web/src/hooks/useTasks.ts

// READ — cached query
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.findAll(filters),
    staleTime: 30_000, // 30 seconds
  })
}

// READ — single entity
export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskService.findById(id),
  })
}

// WRITE — mutation with cache invalidation
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // Invalidate journal summary if task is due today (reactive integration)
      queryClient.invalidateQueries({ queryKey: ['journal-summary', today()] })
    },
  })
}
```

**Key patterns:**
- `queryKey` structure: `[entityType]` for lists, `[entityType, id]` for single entities
- `staleTime` varies by data type (see cross-module-integration.md section 9)
- Mutations invalidate their own entity list + any reactive cross-module views
- No optimistic updates by default — local SQLite reads are fast enough (<10ms)

### Zustand — UI State Only

Zustand stores hold only **ephemeral, non-persisted UI state** that does not come from the database.

```typescript
// apps/web/src/stores/task-ui-store.ts

interface TaskUIState {
  viewMode: 'list' | 'board' | 'calendar'
  activeFilters: { status?: string; priority?: string }
  selectedTaskIds: Set<string>
  sortBy: 'due_date' | 'priority' | 'created_at'
  isSidebarOpen: boolean
}

export const useTaskUIStore = create<TaskUIState>((set) => ({
  viewMode: 'list',
  activeFilters: {},
  selectedTaskIds: new Set(),
  sortBy: 'due_date',
  isSidebarOpen: true,
  // ... actions to update these
}))
```

**What goes in Zustand:**
- View mode (list/board/calendar/gallery/neural)
- Active filter selections
- Selected item IDs (multi-select)
- Sort preferences
- Sidebar/panel open/closed state
- Editor focus state
- Modal/dialog open state

**What does NOT go in Zustand:**
- Entity data (tasks, habits, notes, etc.) — use React Query
- User preferences (theme, locale, etc.) — stored in SQLite, read via React Query
- Anything that should persist across sessions — stored in SQLite

---

## 8. Complete Data Flow Diagram

Putting it all together — the full path from user input to encrypted storage to sync:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI LAYER                                    │
│                                                                      │
│  Zustand (UI state)          React Query (data cache)               │
│  ┌──────────────┐            ┌──────────────────────┐               │
│  │ viewMode     │            │ ['tasks', filters]   │               │
│  │ filters      │            │ ['task', id]         │               │
│  │ selectedIds  │            │ ['journal-summary']  │               │
│  └──────────────┘            └──────────┬───────────┘               │
│                                          │                           │
│  User input ──> Zod validate ──> useMutation() ──────────────────── │
│                 (form errors)            │                           │
└──────────────────────────────────────────┼───────────────────────────┘
                                           │
┌──────────────────────────────────────────┼───────────────────────────┐
│                     SERVICE LAYER (packages/core)                     │
│                                                                       │
│  [1] Re-validate (Zod)                                               │
│  [2] Transform input                                                 │
│  [3] Enforce business rules (throw ServiceError)                     │
│  [4] Call repository ─────────────────────────────────────────────── │
│                                           │                          │
│  Post-commit: [5] Award XP  [6] Notify  [7] Invalidate cache       │
└───────────────────────────────────────────┼──────────────────────────┘
                                            │
┌───────────────────────────────────────────┼──────────────────────────┐
│                   REPOSITORY LAYER (packages/core/db)                 │
│                                                                       │
│  ┌─ SQLite TRANSACTION ──────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  [a] Generate UUIDv7 (create) or load existing row (update)   │  │
│  │  [b] Set timestamps (created_at / updated_at)                 │  │
│  │  [c] encryptRow() ── vault.encryptField() per E-field         │  │
│  │  [d] Update _sync_version, _sync_lww_ts, _sync_field_ts      │  │
│  │  [e] computeSyncHash() ── SHA-256 of row                     │  │
│  │  [f] INSERT/UPDATE in SQLite                                  │  │
│  │  [g] UPSERT into sync_queue                                  │  │
│  │                                                                │  │
│  └─ COMMIT ──────────────────────────────────────────────────────┘  │
│                                                                       │
│  On READ:                                                            │
│  [a] SELECT from SQLite                                              │
│  [b] decryptRow() ── vault.decryptField() per E-field               │
│  [c] Return plaintext to service                                     │
└───────────────────────────────────────────┼──────────────────────────┘
                                            │
┌───────────────────────────────────────────┼──────────────────────────┐
│                   STORAGE LAYER                                       │
│                                                                       │
│  SQLite (SQLCipher L1)                    Sync Engine                │
│  ┌─────────────────────┐                 ┌────────────────────┐     │
│  │ Plaintext fields (P)│                 │ Debounce 2s        │     │
│  │ Encrypted fields (E)│                 │ Read sync_queue    │     │
│  │ Sync metadata       │                 │ Serialize row JSON │     │
│  │ FTS5 virtual tables │                 │ LZ4 compress       │     │
│  └─────────────────────┘                 │ XChaCha20 encrypt  │     │
│                                           │ Push to server (L3)│     │
│                                           └────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Validation Schema Location

Zod validation schemas live in `packages/types` alongside the TypeScript interfaces they validate. This ensures a single source of truth for data shapes across all consumers.

### File Pattern

```typescript
// packages/types/src/task.ts

import { z } from 'zod'

// --- Zod schemas (runtime validation) ---

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  project_id: z.string().optional(),
  // ... remaining fields
})

export const updateTaskSchema = createTaskSchema.partial()

// --- Inferred types from schemas ---

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

// --- Full entity type (includes managed fields) ---

export interface Task extends SyncableEntity {
  title: string
  description?: string
  status: TaskStatus
  // ... all fields including id, timestamps, sync metadata
}
```

### Why `packages/types`

1. **Single import path** — Both UI (for forms) and services (for validation) import from `@vida/types`
2. **Type inference** — `z.infer<>` derives TypeScript types from schemas, avoiding duplication
3. **No circular dependencies** — `packages/types` has no dependency on `packages/core`, so schemas never import service or repository code

---

## References

- **ADR-001 section 12** — Zod as schema validation library, React Query for async state, Zustand for client state
- **ADR-002 section 3** — Sync metadata columns and their update rules
- **ADR-002 section 4** — Encryption boundaries (P/E classification, three-layer model)
- **ADR-003 section 6** — Field-level LWW merge using `_sync_field_ts`
- **ADR-003 section 10** — Push/pull flow diagrams
- `packages/core/src/db/repository.ts` — Repository implementation (encryptRow, decryptRow, create, update)
- `packages/core/src/encryption/vault.ts` — Encryption primitives
- `packages/core/src/encryption/key-management.ts` — Vault key lifecycle
