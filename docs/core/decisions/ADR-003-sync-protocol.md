# ADR-003: Sync Protocol Design

**Status:** Accepted
**Date:** 2026-03-13
**Decision Makers:** Victor J.
**Context:** Vida Platform — Sync protocol for zero-knowledge, local-first, multiplatform life management SaaS
**References:** ADR-001 (Tech Stack), ADR-002 (Data Model), Life OS `syncManager.ts`
**Amended:** 2026-07-19 ([ADR-013](ADR-013-zero-knowledge-notification-delivery.md)) — adds a **wake-relay** server responsibility (a content-minimal OS push to a user's closed devices on blob-push arrival, by per-user routing — composes/reads nothing) and **extends the §12 device registry** with `push_token` + `push_platform` columns (registration rides the existing `/api/devices/register`). Doc-only; server stays a blind relay.

---

## 1. Summary

This document defines the **complete sync protocol** for the Vida Platform. It specifies how data moves between a user's devices through the zero-knowledge server, covering sync units, triggers, conflict resolution, transport, offline behavior, device management, and data export.

**The protocol in one sentence:** Each entity syncs as an individually encrypted blob via debounced auto-push over WebSocket (with polling fallback), using field-level LWW for structured data and per-page Yjs CRDT documents for editor content, with large attachments flowing through a separate R2 pipeline.

---

## 2. Design Principles

1. **Local-first** — The device is the source of truth. Sync is an eventually-consistent replication, not a dependency.
2. **Zero-knowledge** — The server stores and relays only opaque encrypted blobs. It cannot read, index, or query user data.
3. **Single-user, multi-device** — This is NOT collaborative editing between users. One user, multiple devices. No presence/cursor sync needed.
4. **Offline-resilient** — All writes succeed locally. Sync catches up when connectivity returns.
5. **Minimal server logic** — The server is a blob store + relay + auth. All merge logic runs on the client.

---

## 3. Sync Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           DEVICE A                                    │
│                                                                       │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │ App UI   │──▸│ Core Engine  │──▸│ SQLite       │                 │
│  │ (React)  │   │ (write ops)  │   │ (SQLCipher)  │                 │
│  └──────────┘   └──────┬───────┘   └──────────────┘                 │
│                         │                                             │
│                         ▼                                             │
│              ┌──────────────────┐                                    │
│              │   Sync Engine    │                                    │
│              │                  │                                    │
│              │  ┌────────────┐  │                                    │
│              │  │ Change     │  │  Debounced triggers               │
│              │  │ Detector   │──┼──▸ Structured: 2s inactivity      │
│              │  └────────────┘  │    Yjs: 5s interval + on blur     │
│              │                  │                                    │
│              │  ┌────────────┐  │                                    │
│              │  │ Sync Queue │  │  Local queue (sync_queue table)    │
│              │  │ (offline)  │  │  Persists across app restarts     │
│              │  └────────────┘  │                                    │
│              │                  │                                    │
│              │  ┌────────────┐  │                                    │
│              │  │ Encryption │  │  LZ4 compress → XChaCha20 encrypt │
│              │  │ Layer      │  │                                    │
│              │  └────────────┘  │                                    │
│              │                  │                                    │
│              │  ┌────────────┐  │                                    │
│              │  │ Transport  │  │  WebSocket (primary)               │
│              │  │ Layer      │  │  HTTP polling (fallback)           │
│              │  └────────────┘  │                                    │
│              └────────┬─────────┘                                    │
│                       │                                               │
└───────────────────────┼───────────────────────────────────────────────┘
                        │ encrypted blobs only
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SYNC SERVER (Zero-Knowledge)                       │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Hono API     │  │ WebSocket    │  │ Cloudflare R2            │   │
│  │ (CF Workers) │  │ Hub          │  │ (blob storage)           │   │
│  │              │  │              │  │                          │   │
│  │ • Auth (SRP) │  │ • Per-user   │  │ • Sync blobs (latest)   │   │
│  │ • Push/Pull  │  │   rooms      │  │ • Yjs snapshots         │   │
│  │ • Device mgmt│  │ • Relay msgs │  │ • Attachment files      │   │
│  │ • Signed URLs│  │              │  │                          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                                                                       │
│  Server metadata (Cloudflare D1 or KV):                               │
│  • SRP verifiers, user records                                        │
│  • Device registry (device_id, name, registered_at, last_seen_at)     │
│  • Blob index (table, row_id → R2 key, version, lww_ts, device_id)   │
│  • Attachment index (attachment_id → R2 key, size, mime_type)         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                        │ encrypted blobs only
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           DEVICE B                                    │
│                    (same architecture as Device A)                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Sync Units

### 4.1 Structured Data — Per-Row Encrypted Blobs

Every syncable table row is an independent sync unit. When a row changes, the entire row is serialized, compressed, encrypted, and pushed as a single blob.

**Sync unit = one row from one table.**

```
Sync blob structure (from ADR-002 §4.5):

┌─────────────────────────────────────────────────────┐
│ Header (plaintext — server can read)                 │
│ {                                                    │
│   "table": "tasks",                                  │
│   "row_id": "01924f...",       // UUIDv7             │
│   "sync_version": 3,                                │
│   "sync_lww_ts": 1741856400000,                     │
│   "sync_device_id": "device_abc123",                │
│   "operation": "update",       // create|update|delete│
│   "field_timestamps": {        // For field-level LWW │
│     "title": 1741856400000,                          │
│     "status": 1741856390000,                         │
│     "description": 1741856350000                     │
│   }                                                  │
│ }                                                    │
├─────────────────────────────────────────────────────┤
│ Payload (encrypted — server CANNOT read)             │
│                                                      │
│ nonce (24 bytes)                                     │
│ ciphertext = XChaCha20-Poly1305(                     │
│   key   = Vault Key,                                │
│   nonce = random 24 bytes,                           │
│   data  = LZ4( JSON.stringify(row) )                │
│ )                                                    │
│ → base64-encoded for transport                       │
└─────────────────────────────────────────────────────┘
```

**Note on `field_timestamps`:** This is the key addition for field-level LWW (see §6). Each mutable field's last-modified **HLC stamp** (§6.1) is stored in the header so the receiving client can perform per-field merge without decrypting the remote blob first for comparison. Field names are NOT sensitive — they are schema-defined column names, not user content. The server stores these values as-is in the `blob_index` (§9.4) and only ever compares them; the HLC's storage encoding (§6.1) must keep them comparable, or the header + `blob_index` change together at build.

### 4.2 Editor Content — Per-Page Yjs Documents

Each `pages` row has its content synced via a **separate Yjs document**. This means every page has two sync units:

1. **Structured metadata** (title, type, entity_id, is_favorite, journal_date, etc.) → LWW blob (§4.1)
2. **Editor content** (TipTap JSON / Yjs state) → Yjs binary snapshot

```
pages row sync:

┌─────────────────────────────────────────────┐
│ Sync Unit 1: Structured Metadata (LWW)       │
│ Header: { table: "pages", row_id: "..." }    │
│ Payload: encrypted row (all fields EXCEPT    │
│          content — content is null/omitted)   │
├─────────────────────────────────────────────┤
│ Sync Unit 2: Yjs Document (CRDT)             │
│ Header: { table: "pages_yjs", row_id: "..." }│
│ Payload: encrypted Yjs state vector +        │
│          update binary                        │
└─────────────────────────────────────────────┘
```

**Why split?** Yjs handles text merging (insertions, deletions, formatting) through CRDT operations — it doesn't use timestamps and cannot be merged with LWW. Structured fields (title, favorite status, tags) are simple values better served by LWW. Splitting avoids forcing all page fields into CRDT types.

**Yjs sync flow:**

```
1. User edits a page in TipTap
2. TipTap emits Yjs updates via y-prosemirror
3. Sync engine collects Yjs updates (debounced, every 5-10 seconds)
4. Encode Yjs state as binary: Y.encodeStateAsUpdate(ydoc)
5. Encrypt the binary blob (same XChaCha20-Poly1305 scheme)
6. Push to server as a "pages_yjs" sync blob
7. Server stores/relays the encrypted blob
8. Receiving device decrypts → Y.applyUpdate(localYdoc, remoteUpdate)
9. Yjs CRDT guarantees conflict-free merge
```

**Server storage for Yjs:** The server stores the **latest full Yjs snapshot** per page (not incremental updates). On each push, the client sends the full encoded state. This keeps server storage bounded and simplifies pull.

### 4.3 Attachments — Separate Binary Pipeline

Attachments (`note_attachments`, `language_recordings`, `project_documents`) sync through a dedicated pipeline, separate from the row-blob sync queue.

**Maximum file size: 25 MB per attachment.**

```
Attachment sync flow:

UPLOAD (client → R2):
1. User adds attachment to a page
2. Client encrypts file: XChaCha20-Poly1305(Vault Key, file_bytes)
3. Client requests a signed upload URL from the server:
   POST /api/sync/attachments/upload-url
   Body: { attachment_id, size_bytes, mime_type }
4. Server generates a time-limited R2 signed URL
5. Client uploads encrypted blob directly to R2
6. Client saves the attachment row locally (with R2 key reference)
7. Attachment metadata row syncs via normal LWW pipeline
   (filename, mime_type, size_bytes, r2_key — but NOT the blob itself)

DOWNLOAD (R2 → client):
1. New device pulls attachment metadata via normal LWW sync
2. Attachment blob is NOT downloaded automatically (lazy loading)
3. When user opens the page containing the attachment:
   a. Client requests a signed download URL:
      POST /api/sync/attachments/download-url
      Body: { attachment_id }
   b. Client downloads encrypted blob from R2
   c. Client decrypts locally
   d. Client caches decrypted file in local storage
4. Thumbnails follow the same pattern but are smaller, so
   they can optionally be pre-fetched during background sync

DELETE:
1. Client soft-deletes the attachment row (deleted_at)
2. Metadata syncs via LWW
3. Server garbage-collects the R2 blob after 30 days
```

**Why separate?** A 25MB encrypted image blob would block the sync queue for other changes. The separate pipeline allows structured data to sync instantly while large files upload in the background.

---

## 5. Sync Transport

### 5.1 Hybrid: WebSocket + HTTP Polling Fallback

```
┌─────────────────────────────────────────────────────┐
│               TRANSPORT LAYER                        │
│                                                      │
│   Primary: WebSocket                                 │
│   ┌──────────────────────────────────────┐          │
│   │ wss://sync.vida.app/ws              │          │
│   │                                      │          │
│   │ • Authenticated via session token    │          │
│   │ • Per-user room (not per-device)     │          │
│   │ • Bidirectional: push + receive      │          │
│   │ • Heartbeat every 30 seconds         │          │
│   │ • Auto-reconnect with backoff        │          │
│   │   (1s, 2s, 4s, 8s, 16s, 30s max)   │          │
│   └──────────────────────────────────────┘          │
│                                                      │
│   Fallback: HTTP Polling                             │
│   ┌──────────────────────────────────────┐          │
│   │ GET /api/sync/changes?since={ts}     │          │
│   │                                      │          │
│   │ • Activates when WebSocket fails     │          │
│   │ • Poll interval: 60 seconds          │          │
│   │ • Switches back to WS when available │          │
│   └──────────────────────────────────────┘          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.2 WebSocket Protocol

**Connection handshake:**

```
1. Client opens WebSocket: wss://sync.vida.app/ws
2. Client sends AUTH message: { type: "auth", token: "<session_token>", device_id: "<uuid>" }
3. Server validates token, registers device in user's room
4. Server responds: { type: "auth_ok", server_time: 1741856400000 }
5. Client sends SYNC_REQUEST: { type: "sync_request", since: <last_sync_timestamp> }
6. Server sends any pending blobs for this user since that timestamp
```

**Message types (client → server):**

| Type | Payload | Description |
|------|---------|-------------|
| `auth` | `{ token, device_id }` | Authenticate connection |
| `push_blob` | `{ header, payload }` | Push an encrypted sync blob |
| `push_yjs` | `{ page_id, payload }` | Push encrypted Yjs state |
| `push_attachment_meta` | `{ header, payload }` | Push attachment metadata blob |
| `sync_request` | `{ since }` | Request changes since timestamp |
| `ack` | `{ blob_id }` | Acknowledge receipt of a blob |
| `ping` | `{}` | Heartbeat |

**Message types (server → client):**

| Type | Payload | Description |
|------|---------|-------------|
| `auth_ok` | `{ server_time }` | Auth succeeded |
| `blob` | `{ header, payload }` | Incoming sync blob from another device |
| `yjs_update` | `{ page_id, payload }` | Incoming Yjs state from another device |
| `ack` | `{ blob_id }` | Server confirmed storage |
| `pong` | `{}` | Heartbeat response |
| `device_revoked` | `{ device_id }` | A device was deauthorized |

### 5.3 HTTP Polling Endpoints (Fallback)

```
POST /api/sync/push
  Body: { blobs: [{ header, payload }] }
  Response: { acked: ["blob_id_1", "blob_id_2"] }

GET  /api/sync/pull?since={timestamp}&limit={100}
  Response: { blobs: [{ header, payload }], has_more: boolean }

POST /api/sync/push-yjs
  Body: { updates: [{ page_id, payload }] }
  Response: { acked: ["page_id_1"] }

GET  /api/sync/pull-yjs?since={timestamp}
  Response: { updates: [{ page_id, payload }] }
```

---

## 6. Conflict Resolution

### 6.1 Structured Data — Field-Level LWW

For all non-page tables (and page metadata), conflicts are resolved using **field-level Last-Writer-Wins**. Instead of comparing a single row-level timestamp, each mutable field has its own timestamp.

#### The clock: Hybrid Logical Clock (HLC)

Every LWW timestamp in this protocol — the row-level `_sync_lww_ts` **and** every value in the field-level `_sync_field_ts` map — is produced by a **Hybrid Logical Clock (HLC)**, not a bare wall clock. This is what the word "logical" in the constitution (business-rules.md SU-2) and in ADR-002 §3 means: a clock that orders by **causality**, not by each device's uncorrected `Date.now()`.

**Why not a bare wall clock.** LWW picks the write with the higher timestamp. If device A's clock runs ahead of B's by δ, an edit made on A *earlier in real time* can carry a higher timestamp than a *later* edit on B — so B's newer write is **silently discarded** with no conflict surfaced. On a single-user, multi-device, offline-resilient vault this still bites: offline devices accumulate edits, clocks drift / DST-jump / get set by hand, a device rejoins after a week. The loss is silent and permanent — it violates the "all writes succeed locally" promise. An HLC removes this: on every merge the receiving clock jumps past any remote time it observes, so a skewed clock self-corrects the moment it syncs.

**An HLC stamp is a pair `(physical_ms, counter)`.** The canonical update rules (Kulkarni/Demirbas):

```
Local event (write / send):
  l'  = max(last_l, pt)           where pt = Date.now()  (wall clock, may jump backward)
  c'  = (l' == last_l) ? last_c + 1 : 0
  store (l', c')

Receive / merge a remote stamp (l_msg, c_msg):
  l'  = max(last_l, l_msg, pt)
  if   l' == last_l == l_msg :  c' = max(last_c, c_msg) + 1
  elif l' == last_l          :  c' = last_c + 1
  elif l' == l_msg           :  c' = c_msg + 1
  else                       :  c' = 0            // physical time advanced past both
  store (l', c')
```

The `max(last_l, …)` in the local rule handles a **backward wall-clock jump** (the logical part never regresses). The receive rule is what yields causal ordering: if write X is observed before write Y is produced, then `hlc(X) < hlc(Y)`.

**Compare** two stamps lexicographically: `(physical, counter)`, then — on a full tie — **the lexicographically-higher `_sync_device_id` (TEXT) wins**. Because device ids are unique and totally ordered, this makes the comparison a **total order** over all writes, so every device converges on the same winner (see the tie-break note under "How it works").

**Scope.** The HLC governs **structured LWW only** (`_sync_lww_ts` + `_sync_field_ts`, including `deleted_at` — see §6.3). Editor content uses **Yjs CRDT (§6.2), which is timestamp-free** — the HLC does not touch page content.

**Storage representation (build-phase).** SQLite `INTEGER` is a signed 64-bit (`i64`) and could hold a packed HLC, **but** Drizzle/JS reads it into a `number` (float64), capped at `Number.MAX_SAFE_INTEGER = 2⁵³`. A naive pack `physical_ms × 2ᵏ + counter` breaks: `physical_ms` today ≈ 2⁴⁰·⁷, so even a 12-bit counter overflows the JS-safe range by ~2039, and a 16-bit counter overflows today. So the encoding is a real build-phase choice — a zero-padded sortable **string**, a **`BigInt`-typed** column, or **two columns** (`physical`, `counter`) — and it is **coupled to the wire header** (`SyncBlobHeader.sync_lww_ts` / `field_timestamps`) and the server **`blob_index`** (§9.4), which must stay comparable or change together.

**Interim state (not yet built).** The HLC/field-LWW merge logic is not implemented — `packages/core/src/sync/` holds only empty stubs (`crdt.ts`, `queue.ts`, `resolver.ts`); the `mergeFieldLWW`/`hlc.ts` below are the *proposed* targets. Today `packages/core/src/db/repository.ts` stamps `_sync_lww_ts = Date.now()` (interim v0), and the shared type `packages/types/src/sync.ts` still comments the field "Logical timestamp" — both are corrected in the build edit that introduces the HLC.

**How it works:**

```
Scenario: User edits a task on two devices while offline.
(The T-values below are HLC stamps, shown as scalars for readability; because they
 are HLC — not raw Date.now() — a skewed clock is corrected on merge, so the compare
 reflects causal order, not whichever device's wall clock happened to run faster.)

Device A (offline): Changes title at T=100
  Local field_timestamps: { title: 100, status: 50, description: 30 }

Device B (offline): Changes status at T=110
  Local field_timestamps: { title: 50, status: 110, description: 30 }

Both come online. Device A pushes first (T=100), Device B pushes second (T=110).

Device B receives Device A's blob:
  Compare per field:
    title:       A=100 > B=50   → accept A's title ✓
    status:      A=50  < B=110  → keep B's status ✓
    description: A=30  = B=30   → no change

  Result: Merged row has A's title + B's status + original description.
  No data lost. No user intervention needed.
```

**Implementation details:**

```typescript
// packages/core/src/sync/field-lww.ts

interface FieldTimestamps {
  [fieldName: string]: number  // HLC stamp (see "The clock: Hybrid Logical Clock" above), NOT raw Unix ms
}

/**
 * Merge two versions of a row using field-level LWW.
 * Returns the merged row and whether any field was updated.
 */
function mergeFieldLWW(
  localRow: Record<string, unknown>,
  localFieldTs: FieldTimestamps,
  remoteRow: Record<string, unknown>,
  remoteFieldTs: FieldTimestamps,
  immutableFields: string[],  // id, created_at, _sync_id — never merged
  localDeviceId: string,      // for the global tie-break on equal HLC stamps
  remoteDeviceId: string,
): { merged: Record<string, unknown>; mergedTs: FieldTimestamps; changed: boolean } {
  const merged = { ...localRow }
  const mergedTs = { ...localFieldTs }
  let changed = false

  for (const field of Object.keys(remoteFieldTs)) {
    if (immutableFields.includes(field)) continue

    const remoteTs = remoteFieldTs[field] ?? 0  // HLC stamp
    const localTs = localFieldTs[field] ?? 0     // HLC stamp

    // Compare HLC stamps; on an exact tie, break globally by device id so BOTH
    // devices pick the SAME winner (lexicographically-higher _sync_device_id).
    // This replaces the old "keep local" rule, which was deterministic per-device
    // but NOT globally — two devices setting the same field to different values at
    // the same stamp would diverge permanently.
    const remoteWins =
      remoteTs > localTs ||
      (remoteTs === localTs && remoteDeviceId > localDeviceId)

    if (remoteWins) {
      merged[field] = remoteRow[field]
      mergedTs[field] = remoteTs
      changed = true
    }
  }

  return { merged, mergedTs, changed }
}
```

**Immutable fields (never merged, set once at creation):**
- `id`, `_sync_id`, `created_at`

**Fields excluded from field-level tracking (managed by sync engine):**
- `_sync_version`, `_sync_device_id`, `_sync_lww_ts`, `_sync_status`, `_sync_hash`
- `updated_at` (a user-facing wall-clock `Date.now()` value — DATA-2 Unix ms; set to the wall-clock time of the merge, **not** the HLC max, so HLC stamps never pollute the human-readable "last modified" column)

**Schema change — `_sync_field_ts` column:**

Every syncable table gains one additional column:

```sql
_sync_field_ts TEXT  -- JSON: { "title": <hlc>, "status": <hlc>, ... } — HLC stamps, not raw Unix ms (see "The clock: HLC" above). Final encoding is build-phase (string / BigInt / two-column, §6.1) and coupled to the §9.4 blob_index.
```

This stores the per-field timestamps locally. The same data is also included in the sync blob header (§4.1) so that the receiving client can compare without decrypting.

### 6.2 Editor Content — Yjs CRDT (Conflict-Free)

Page content uses Yjs, which is a CRDT — **conflicts are impossible by design**. Concurrent edits from multiple devices merge automatically:

- Character insertions/deletions merge positionally
- Formatting changes merge per-range
- Block-level operations (add/remove/reorder blocks) merge structurally

**No conflict resolution UI is needed for editor content.**

The Yjs document is the authoritative source for page content. The `content` column in the `pages` table stores a **TipTap JSON snapshot** derived from the Yjs state (for local rendering without loading the full Yjs doc). This snapshot is regenerated from the Yjs doc after every merge.

### 6.3 Conflict Edge Cases

| Scenario | Resolution |
|----------|------------|
| Same field edited on two devices offline | Field-level LWW: highest timestamp wins |
| Different fields edited on two devices | Both changes preserved (field-level merge) |
| Row created on two devices with same UUIDv7 | Extremely unlikely (UUIDv7 includes random bits). If it happens: row_id collision detected, second device regenerates ID |
| Row deleted on one device, edited on another | Ordered by **HLC field-timestamps**, not the raw wall-clock `deleted_at`: `deleted_at` is a field-tracked mutable field, so it carries its own HLC stamp in `_sync_field_ts`. Delete wins if `_sync_field_ts['deleted_at']` > the edited field's HLC stamp; otherwise the edit wins and `deleted_at` is cleared. (Soft-delete is thus plain field-level LWW under the same clock — no separate delete-ordering rule, no residual wall-clock comparison that skew could corrupt.) |
| Page metadata edited + content edited simultaneously | Independent sync units — no conflict possible between them |
| Attachment row metadata vs. binary blob | Independent pipelines — no conflict possible |

---

## 7. Sync Triggers

### 7.1 Structured Data (LWW Tables)

| Trigger | Behavior |
|---------|----------|
| **On write (debounced)** | After any local write, start a 2-second debounce timer. If no further writes occur within 2s, push all pending changes. Rapid edits (e.g., toggling checkboxes) batch together. |
| **On reconnect** | When network connectivity returns (or WebSocket reconnects), flush the entire sync queue immediately. |
| **Manual sync** | User can trigger sync from settings or a sync button. Flushes queue + pulls latest. |
| **Periodic background** | Every 5 minutes while the app is open, check for pending items and pull remote changes. Safety net for missed triggers. |
| **App lifecycle** | On app foreground (mobile): pull changes. On app background/close: flush queue if possible. |

### 7.2 Yjs Editor Content

| Trigger | Behavior |
|---------|----------|
| **Interval while editing** | While a page is open in the editor, sync Yjs state every **5 seconds** if there are local changes. |
| **On blur / navigate away** | When the user leaves the page (blur event, route change), immediately sync the final Yjs state. |
| **On save (Ctrl+S / Cmd+S)** | Explicit save triggers immediate Yjs sync. |
| **On reconnect** | Same as structured data — flush pending Yjs updates. |

### 7.3 Attachments

| Trigger | Behavior |
|---------|----------|
| **On add** | Immediately start background upload (non-blocking). Metadata row enters normal LWW queue. |
| **On demand (pull)** | Download attachment blob only when user opens the containing page. Cache locally after first download. |
| **Thumbnail pre-fetch** | During background sync, optionally pre-fetch thumbnails (< 100KB each) for gallery views. |

---

## 8. Offline Behavior

### 8.1 Local Sync Queue

All changes are written to the `sync_queue` table (defined in ADR-002 §5.1) before any network operation. This ensures durability across app crashes, restarts, and extended offline periods.

```
Offline write flow:

1. User creates/updates/deletes an entity
2. Core Engine writes to local SQLite (immediate, always succeeds)
3. Sync Engine enqueues a sync_queue entry:
   { table_name, row_id, operation, payload (JSON snapshot), status: 'pending' }
4. If online: trigger debounced push (2s)
5. If offline: entry stays in queue

On reconnect:
1. Network status changes to online (or WebSocket reconnects)
2. Sync Engine reads all sync_queue entries with status = 'pending'
3. Sorts by created_at (FIFO)
4. Processes sequentially:
   a. Encrypt payload → push to server
   b. On ACK: delete from sync_queue, set _sync_status = 'synced' on the row
   c. On failure: increment retry_count, set status = 'failed' if retries exhausted
5. After push complete: pull remote changes since last_sync_at
6. Apply field-level LWW merge for any incoming changes
7. Update last_sync_at in app_state
```

### 8.2 Queue Deduplication

If the user edits the same row multiple times while offline, the queue should deduplicate:

```
Strategy: UPSERT by (table_name, row_id)

- sync_queue has UNIQUE(table_name, row_id, operation)
- On second edit of same row: replace the existing pending entry
  with the latest payload (last state wins for the queue)
- Exception: if a 'create' is followed by a 'delete', collapse to no-op
  (remove both entries)
```

### 8.3 Retry & Error Handling

| Condition | Behavior |
|-----------|----------|
| Network error (transient) | Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max |
| Server 5xx | Same retry strategy as network error |
| Server 4xx (client error) | Do NOT retry. Mark as `failed`. Log error for debugging. |
| Max retries exceeded (3 attempts) | Mark as `failed`. Surface in UI as "X changes failed to sync". User can retry manually. |
| Auth error (401/403) | Stop all sync. Prompt user to re-authenticate. |
| Encryption error | Stop sync for that blob. Log error. Do not corrupt remote state. |

### 8.4 Offline Capabilities Matrix

| Feature | Offline Support |
|---------|----------------|
| Create/edit/delete any entity | Full — writes to local SQLite |
| View all local data | Full — reads from local SQLite |
| Search (FTS5) | Full — local index |
| Edit notes (TipTap) | Full — Yjs state stored locally |
| View attachments (already cached) | Full |
| View attachments (not yet cached) | Not available — needs download |
| Pomodoro timer | Full — runs locally |
| Analytics/charts | Full — computed from local data |
| Sync | Not available — queued for reconnect |

---

## 9. Server Role

The server is a **zero-knowledge blob relay**. It performs the following functions and NOTHING else with user data:

### 9.1 Server Responsibilities

| Function | Implementation |
|----------|---------------|
| **Auth** | SRP (Secure Remote Password) — verify identity without seeing passwords |
| **Blob storage** | Store encrypted sync blobs in R2, indexed by `(user_id, table, row_id)` |
| **Blob relay** | When Device A pushes a blob, relay it to all other online devices via WebSocket |
| **Yjs storage** | Store latest encrypted Yjs snapshot per page in R2 |
| **Attachment storage** | Store encrypted attachment files in R2, serve via signed URLs |
| **Change feed** | Maintain an ordered log of blob updates per user for pull requests |
| **Device registry** | Track registered devices, enforce device limits |
| **Billing** | Manage subscriptions (if applicable) |
| **Garbage collection** | Delete soft-deleted blobs after 30 days |

### 9.2 Server Does NOT

- Decrypt any blob
- Index, query, or search user data
- Know what type of content a blob contains (beyond the table name)
- Know relationships between entities (FKs are inside encrypted payloads)
- Perform any merge or conflict resolution
- Store more than the latest version of each blob

### 9.3 Server Storage Structure (R2)

```
R2 bucket: vida-sync-{environment}

Structure:
├── blobs/
│   └── {user_id}/
│       └── {table}/
│           └── {row_id}.blob          # Latest encrypted row blob
├── yjs/
│   └── {user_id}/
│       └── {page_id}.yjs             # Latest encrypted Yjs snapshot
├── attachments/
│   └── {user_id}/
│       └── {attachment_id}.enc       # Encrypted file blob
└── thumbnails/
    └── {user_id}/
        └── {attachment_id}.thumb.enc  # Encrypted thumbnail
```

### 9.4 Server Metadata (D1 or KV)

The server maintains a lightweight metadata index (NOT user content):

```sql
-- Server-side metadata tables (D1)

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  srp_salt       TEXT NOT NULL,
  srp_verifier   TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE devices (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  device_name    TEXT,            -- User-provided label ("iPhone", "Laptop")
  platform       TEXT,            -- 'web', 'ios', 'android', 'macos', 'windows', 'linux'
  registered_at  INTEGER NOT NULL,
  last_seen_at   INTEGER NOT NULL,
  is_revoked     INTEGER NOT NULL DEFAULT 0,
  revoked_at     INTEGER
);

CREATE TABLE blob_index (
  user_id        TEXT NOT NULL,
  table_name     TEXT NOT NULL,
  row_id         TEXT NOT NULL,
  r2_key         TEXT NOT NULL,
  sync_version   INTEGER NOT NULL,
  sync_lww_ts    INTEGER NOT NULL,
  sync_device_id TEXT NOT NULL,
  operation      TEXT NOT NULL,      -- create|update|delete
  field_timestamps TEXT,             -- JSON, from header
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, table_name, row_id)
);

CREATE TABLE change_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT NOT NULL,
  table_name     TEXT NOT NULL,
  row_id         TEXT NOT NULL,
  operation      TEXT NOT NULL,
  timestamp      INTEGER NOT NULL
);
CREATE INDEX idx_change_log_user_ts ON change_log(user_id, timestamp);
-- Used for pull requests: "give me all changes since timestamp X"
-- Entries older than 90 days are garbage collected

CREATE TABLE attachment_index (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  r2_key         TEXT NOT NULL,
  size_bytes     INTEGER NOT NULL,
  mime_type      TEXT NOT NULL,
  uploaded_at    INTEGER NOT NULL
);
```

---

## 10. Sync Triggers — Detailed Flows

### 10.1 Push Flow (Client → Server)

```
┌────────────────────────────────────────────────────────────┐
│                     PUSH FLOW                               │
│                                                             │
│  User writes data                                           │
│       │                                                     │
│       ▼                                                     │
│  Write to local SQLite                                      │
│       │                                                     │
│       ▼                                                     │
│  Update _sync_* columns:                                    │
│    _sync_version++                                          │
│    _sync_lww_ts = hlc.now()          // HLC, not Date.now() │
│    _sync_status = 'pending'                                 │
│    _sync_field_ts[changedField] = hlc.now()   // HLC stamp  │
│    _sync_hash = SHA-256(JSON.stringify(row))                │
│       │                                                     │
│       ▼                                                     │
│  Enqueue in sync_queue                                      │
│       │                                                     │
│       ▼                                                     │
│  Online? ──No──▸ Stay in queue. Wait for reconnect.        │
│       │                                                     │
│      Yes                                                    │
│       │                                                     │
│       ▼                                                     │
│  Debounce timer (2s for structured, 5s for Yjs)            │
│       │                                                     │
│       ▼                                                     │
│  Serialize row → JSON                                       │
│  For E fields: decrypt from SQLite first                    │
│       │                                                     │
│       ▼                                                     │
│  Compress (LZ4)                                             │
│       │                                                     │
│       ▼                                                     │
│  Encrypt (XChaCha20-Poly1305, Vault Key, random nonce)     │
│       │                                                     │
│       ▼                                                     │
│  Build header (plaintext: table, row_id, version,          │
│                device_id, operation, field_timestamps)      │
│       │                                                     │
│       ▼                                                     │
│  Send via WebSocket (or HTTP POST if WS unavailable)       │
│       │                                                     │
│       ▼                                                     │
│  Server ACK ──No──▸ Retry with backoff                     │
│       │                                                     │
│      Yes                                                    │
│       │                                                     │
│       ▼                                                     │
│  Remove from sync_queue                                     │
│  Set _sync_status = 'synced'                                │
│  Update last_sync_at in app_state                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 10.2 Pull Flow (Server → Client)

```
┌────────────────────────────────────────────────────────────┐
│                     PULL FLOW                               │
│                                                             │
│  Trigger: WebSocket message / poll response / manual sync  │
│       │                                                     │
│       ▼                                                     │
│  Receive encrypted blob(s) with headers                    │
│       │                                                     │
│       ▼                                                     │
│  For each blob:                                             │
│       │                                                     │
│       ▼                                                     │
│  Is it from THIS device? ──Yes──▸ Skip (already local)     │
│       │                                                     │
│      No                                                     │
│       │                                                     │
│       ▼                                                     │
│  Read header: table, row_id, operation, field_timestamps   │
│       │                                                     │
│       ▼                                                     │
│  ┌─ operation = 'delete'?                                  │
│  │   Yes → soft-delete local row (set deleted_at)          │
│  │         → done                                          │
│  │   No  ↓                                                 │
│  │                                                          │
│  │  Does local row exist?                                  │
│  │   No  → decrypt blob → decompress → insert row          │
│  │         → re-encrypt E fields → write to SQLite         │
│  │         → done                                          │
│  │   Yes ↓                                                 │
│  │                                                          │
│  │  Has local row been modified since last sync?           │
│  │  (check _sync_status = 'pending')                       │
│  │   No  → decrypt blob → decompress → overwrite row       │
│  │         → done (no conflict possible)                   │
│  │   Yes ↓                                                 │
│  │                                                          │
│  │  CONFLICT — both sides modified                         │
│  │  Decrypt remote blob → decompress → parse JSON          │
│  │  Run field-level LWW merge (§6.1)                       │
│  │  Write merged result to local SQLite                    │
│  │  If local fields won any: re-queue push for those       │
│  │  Set _sync_status = 'synced'                            │
│  └─ done                                                   │
│                                                             │
│  Send ACK to server                                        │
│  Update last_sync_at                                        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Initial Device Setup (Priority-Based Sync)

When a user logs in on a new device (password + Account Key), the device needs to bootstrap its local database.

### 11.1 Bootstrap Flow

```
Phase 1: Immediate (blocks UI until complete, ~seconds)
├── Authenticate via SRP
├── Derive Vault Key (Argon2id Master Key → BLAKE2b-256 keyed)
├── Pull user_profile, user_preferences, nav_preferences
├── Pull app config tables (achievements, check_in_templates)
└── Device is now usable with basic settings

Phase 2: Recent data (background, user can start using the app)
├── Pull all blobs modified in the last 30 days
│   ├── Ordered by table priority:
│   │   1. pages (journals + notes — user likely wants these first)
│   │   2. tasks (daily workflow)
│   │   3. habits, routine_actions (daily tracking)
│   │   4. contacts (CRM)
│   │   5. Everything else
│   ├── Decrypt + decompress + write to local SQLite
│   └── Pull Yjs snapshots for recently modified pages
├── UI shows sync progress indicator
└── Attachments are NOT pulled (lazy-load on demand)

Phase 3: Backfill (background, low priority)
├── Pull all remaining blobs (older than 30 days)
├── Processed in batches of 100 blobs
├── Lower priority than user-initiated actions
├── Can be paused/resumed
└── Progress saved — survives app restart

Phase 4: Post-bootstrap
├── Rebuild FTS5 indexes from local data
├── WebSocket connection established
└── Normal sync loop begins
```

### 11.2 Sync Progress UI

During initial setup, the user sees:

```
┌─────────────────────────────────────────┐
│  Setting up your data...                │
│                                          │
│  ✅ Account verified                    │
│  ✅ Preferences loaded                  │
│  ▶  Syncing recent data (347/1,204)     │
│     ░░░░░░░░░░░░░████████░░░░░░  29%    │
│                                          │
│  You can start using the app now.        │
│  Older data will sync in the background. │
└─────────────────────────────────────────┘
```

---

## 12. Device Management

### 12.1 Device Registration

```
On first login on a new device:
1. Client generates a device_id (UUIDv4)
2. Client sends: POST /api/devices/register
   Body: { device_id, device_name, platform }
3. Server creates device record
4. Server returns: { registered: true, device_count: 3 }
```

### 12.2 Device Listing

```
GET /api/devices
Response: {
  devices: [
    {
      id: "device_abc",
      name: "MacBook Pro",
      platform: "macos",
      registered_at: 1741856400000,
      last_seen_at: 1741942800000,
      is_current: true
    },
    {
      id: "device_def",
      name: "iPhone 15",
      platform: "ios",
      registered_at: 1741770000000,
      last_seen_at: 1741939200000,
      is_current: false
    }
  ]
}
```

### 12.3 Device Revocation

```
When a user revokes a device (e.g., lost phone):

1. User selects "Remove device" in settings
2. Client sends: DELETE /api/devices/{device_id}
3. Server marks device as revoked (is_revoked = 1, revoked_at = now)
4. Server immediately closes any WebSocket connection from that device
5. Server broadcasts { type: "device_revoked", device_id } to other devices
6. Future auth attempts from the revoked device are rejected

What revocation does NOT do:
- Does NOT re-encrypt data (impractical for zero-knowledge)
- Does NOT delete data from the revoked device (can't — it's local)
- The revoked device still has its local SQLite with all data

What the user SHOULD do after revoking a lost device:
- Change their master password → re-derives Vault Key
- This effectively invalidates the old Vault Key
- Existing devices re-authenticate and get the new key
- The lost device's encrypted sync blobs become undecryptable
  (it has the old Vault Key but can't sync to get new data)
```

### 12.4 Device Limits

| Plan | Max Devices |
|------|-------------|
| Free | 3 |
| Pro | 10 |

Attempting to register beyond the limit returns `429 Too Many Devices`.

---

## 13. Data Export

Users can export all their decrypted data as a local backup. This is critical for trust in a zero-knowledge system — the user must never feel locked in.

### 13.1 Export Format

```
vida-export-2026-03-13/
├── metadata.json              # Export metadata (date, device, version)
├── data/
│   ├── pages.json             # All pages metadata
│   ├── tasks.json             # All tasks
│   ├── habits.json            # All habits
│   ├── ...                    # One JSON file per table
│   └── (all syncable tables)
├── pages/
│   ├── journals/
│   │   ├── 2026-03-13.md      # Each journal as Markdown
│   │   ├── 2026-03-12.md
│   │   └── ...
│   ├── notes/
│   │   ├── meeting-notes.md   # Each note as Markdown
│   │   └── ...
│   ├── task-notes/
│   │   └── ...
│   └── class-notes/
│       └── ...
└── attachments/
    ├── {attachment_id}-{filename}  # Original files, decrypted
    └── ...
```

### 13.2 Export Flow

```
1. User triggers export from Settings
2. Client reads all local SQLite data (already decrypted in memory)
3. For E fields: decrypt from SQLite
4. Serialize structured data as JSON (one file per table)
5. Convert page content (TipTap JSON) to Markdown via serializer
6. Copy attachment blobs (decrypted) to export folder
7. Package as ZIP
8. User downloads/saves the ZIP
```

**Export runs entirely on the client.** The server is not involved.

---

## 14. Security Considerations

### 14.1 Sync Header Leakage

The sync blob header is plaintext (the server needs it for routing). This intentionally reveals:
- Table name (what type of entity)
- Row ID (opaque UUIDv7)
- Sync version and timestamp
- Device ID
- Operation type
- Field names that changed (in `field_timestamps`)

**Mitigation:** Field names are schema-defined (e.g., "title", "status"), not user content. They reveal structure but not data. The server already knows the table name, so field names add minimal information. This is an acceptable trade-off for field-level LWW without requiring decryption on the server.

### 14.2 Metadata Analysis Risks

An adversary with server access could infer:
- How many entities a user has per table
- When the user is active (from timestamps)
- How often they edit (from version numbers)
- Which devices they use

**Mitigation:** This is inherent to any sync system. The zero-knowledge guarantee is about **content** — the server never knows what tasks say, what notes contain, or what financial transactions represent. Metadata analysis is a known limitation documented for user transparency.

### 14.3 Replay Protection

Each sync blob includes a unique nonce (24 bytes, random) for XChaCha20-Poly1305. Replaying an old blob would:
1. Be detected by the version number (server rejects lower versions)
2. Be detected by the LWW timestamp (client rejects older timestamps)
3. Not compromise encryption (nonces are never reused)

### 14.4 Device Compromise

If a device is compromised (stolen, malware), the attacker has:
- The local SQLite database (encrypted with SQLCipher, key derived from Vault Key)
- The Vault Key (if the app was unlocked)

**Mitigation:**
1. User revokes the device immediately
2. User changes master password → new Vault Key
3. All existing data on the compromised device becomes stale (can't sync)
4. New data uses the new Vault Key (compromised device can't decrypt)
5. SQLCipher protects the DB if the device was locked when stolen

---

## 15. Implementation Phases

The sync protocol is implemented incrementally across the development roadmap:

| Phase | Scope | What's Added |
|-------|-------|-------------|
| **0 (Foundation)** | Basic push/pull | sync_queue, LWW sync for single table (pages), HTTP polling only |
| **1 (Journals + Tasks)** | Multi-table sync | LWW for tasks + pages, Yjs sync for page content, WebSocket transport |
| **3 (Mobile)** | Cross-device | Full sync engine, priority-based initial sync, offline queue |
| **6 (Desktop)** | Third platform | Same sync engine, platform-specific SQLite adapter |
| **9 (Polish)** | Full feature set | Data export, attachment pipeline optimization, device management UI |

---

## 16. API Reference Summary

### 16.1 Sync Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync/push` | Push encrypted blobs (batch) |
| `GET` | `/api/sync/pull?since={ts}&limit={n}` | Pull changes since timestamp |
| `POST` | `/api/sync/push-yjs` | Push encrypted Yjs snapshots |
| `GET` | `/api/sync/pull-yjs?since={ts}` | Pull Yjs snapshots |
| `POST` | `/api/sync/attachments/upload-url` | Get signed R2 upload URL |
| `POST` | `/api/sync/attachments/download-url` | Get signed R2 download URL |
| `WSS` | `/ws` | WebSocket connection for real-time sync |

### 16.2 Device Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/devices/register` | Register a new device |
| `GET` | `/api/devices` | List all devices |
| `DELETE` | `/api/devices/{id}` | Revoke a device |
| `PATCH` | `/api/devices/{id}` | Update device name |

### 16.3 Export Endpoint

Export runs entirely client-side. No server endpoint needed.

---

## 17. Schema Additions (ADR-002 Amendment)

This ADR introduces one new column to every syncable table:

```sql
_sync_field_ts TEXT  -- JSON object mapping field names to HLC stamps (see §6.1 "The clock: HLC")
```

This column is classified as **P (plaintext)** — it contains only schema-defined field names and timestamps, no user content. The value type is an **HLC stamp**, not raw Unix ms; the exact encoding (string / BigInt / two-column) is build-phase and coupled to the §9.4 `blob_index` (§6.1).

---

## 18. Decisions Deferred

| Decision | Deferred To |
|----------|-------------|
| WebSocket implementation (Cloudflare Durable Objects vs. third-party) | Phase 1.7 (Sync Server) |
| Exact debounce timing tuning (2s vs 3s, 5s vs 10s for Yjs) | Phase 1.7, adjusted based on real-world testing |
| Sync blob compression algorithm (LZ4 vs zstd) | Phase 1.7 |
| Change log retention period (90 days vs configurable) | Phase 1.7 |
| Thumbnail pre-fetch strategy (eager vs. lazy) | Phase 3 (Mobile) |
| Device limit enforcement per pricing plan | Post-Phase 12 (Billing) |
| Bandwidth throttling / rate limiting specifics | Phase 1.7 |

---

*This ADR is the single source of truth for the Vida Platform sync protocol. Any deviation requires a new ADR with justification.*
