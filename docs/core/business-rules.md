# Core Business Rules — The System Constitution

The invariants that govern the **entire** Vida Platform. Every feature, service, and component inherits
these and must comply. Each rule is a FACT cited to its source; nothing here is invented.
(No-Guessing Principle.) These are the rules v1 (life-os) lacked or violated — see `[[v1-failure-lessons]]`.

---

## Zero-Knowledge (ZK)
- **ZK-1** — All encryption/decryption happens **client-side only**. The server stores opaque encrypted blobs
  and never sees, stores, or can derive plaintext user data. `[FACT: CLAUDE.md "Core Privacy Model"; ADR-002 §4]`
- **ZK-2** — The server never receives the user's password or any key. Auth is SRP: the server stores only a
  salt + verifier and proves password knowledge without transmission. `[FACT: ADR-001 §Auth; packages/core/src/encryption/srp.ts]`
- **ZK-3** — Key hierarchy: Master Key = Argon2id(password, salt); Vault Key = BLAKE2b-256(key=Master Key, message=Account Key);
  the Vault Key encrypts/decrypts all field-level data (XChaCha20-Poly1305). The Account Key is the user's recovery
  key, shown once. `[FACT: packages/core/src/encryption/vault.ts L9,L85-95 — sodium.crypto_generichash(); authoritative (enforced reality)]`
  ⚠ **Unresolved drift (needs ADR amendment):** the code uses **BLAKE2b-256** and is authoritative, but **both ADR-001 §Key Model (L74,L76) and CLAUDE.md still say HKDF**. This is two top-tier sources in conflict, not mere doc-lag — `vault.ts` L82 states the switch was deliberate ("replaces HKDF — BLAKE2b is libsodium-native"). ADR-001 + CLAUDE.md must be amended to record the BLAKE2b decision. `[[authoritative-docs]]`

## Local-First (LF)
- **LF-1** — The user's device is the source of truth; the server is a **sync relay**, not a database. `[FACT: CLAUDE.md "Core Privacy Model"; ADR-003]`
- **LF-2** — Every write **succeeds locally first**; sync reconciles on reconnect. The app is fully functional offline. `[FACT: CLAUDE.md "Offline-resilient"; ADR-003 §Offline]`
- **LF-3** — Local-first/offline coverage is **all-or-explicitly-scoped**: every syncable entity is offline-capable;
  no entity may silently degrade to online-only. (This is the exact v1 failure — "offline-first" was promised
  platform-wide but built for 5 of 19 features.) `[FACT: v1-failure-lessons; enforced rule]`

## Single-User, Multi-Device (SU)
- **SU-1** — Vida is single-user across multiple devices — **not** collaborative. No sharing, no team features,
  no real-time multi-user editing. `[FACT: CLAUDE.md "Single-user, multi-device"; ADR-003]`
- **SU-2** — Structured data syncs via field-level **LWW** (last-writer-wins, logical timestamps); editor content
  syncs via **Yjs CRDT** per page. `[FACT: ADR-003 §Sync]`
  ⚠ Drift note: legacy architecture.md says "Automerge" for structured data — ADR-003 uses LWW. ADR authoritative.

## Encryption Boundaries (EN)
- **EN-1** — Three-layer encryption: **L1** SQLCipher (full DB at rest), **L2** field-level libsodium (fields
  marked `-- [E]` / `@encrypted`), **L3** sync blob (entire row encrypted for transit/server). `[FACT: ADR-002 §4]`
- **EN-2** — A field is encrypted iff it is marked `[E]` in the schema / `@encrypted` in `@vida/types`. ~150 of
  ~520 fields (29%). Encryption status is defined once, in the schema, and honored everywhere. `[FACT: ADR-002 §4.3]`

## Data Conventions (DATA) — structural invariants
- **DATA-1** — Primary keys: UUIDv7 (time-sortable) TEXT, generated client-side. `[FACT: CLAUDE.md Conventions; ADR-002 §2.1]`
- **DATA-2** — Timestamps: Unix ms INTEGER. Booleans: INTEGER 0/1. Money: INTEGER cents. JSON: stringified TEXT.
  Calendar dates: TEXT `YYYY-MM-DD`. `[FACT: CLAUDE.md Conventions; ADR-002 §2]`
- **DATA-3** — **No inline `notes` columns.** All notes are rows in the `pages` table via the polymorphic
  `entity_type`/`entity_id` pattern. `[FACT: CLAUDE.md Conventions; ADR-002 §2.7, §5.2]`
- **DATA-4** — Every syncable table carries `_sync_*` metadata (`_sync_id`, `_sync_version`, `_sync_device_id`,
  `_sync_lww_ts`, `_sync_status`, `_sync_hash`). Soft deletes via `deleted_at` (NULL = live). `[FACT: CLAUDE.md Conventions; ADR-002 §3]`
- **DATA-5** — Enums: SQL CHECK constraints + canonical Zod validators in `@vida/core`. `[FACT: CLAUDE.md Conventions]`

## Integration Invariant (INT)
- **INT-1** — Notes & Pages is the **integration hub**: every module connects via `pages` + `entity_links`
  (polymorphic backlinks). Modules do not read each other's tables directly — cross-module access goes through
  documented integration points. `[FACT: docs/core/architecture/module-dependency-graph.md; cross-module-integration.md]`

---

## How this constitution is used
- Every feature spec's Business Rules section must **comply with and reference** the relevant rules above.
- The Verify step of any documentation/build pass treats a violation of a core rule as a **blocker**.
- Authoritative sources, in order: ADRs + current code > `docs/core/architecture/*` > legacy `docs/architecture.md` (do not use the legacy doc for decisions — `[[authoritative-docs]]`).

## Change Log
| Date | Source pass | Change |
|------|-------------|--------|
| 2026-06-09 | documentation-blueprint · Phase 0 | initial constitution drafted from ADR-001/002/003 + code |
| 2026-06-13 | documentation-blueprint · Phase 0 Verify | ZK-3 corrected — drift note had falsely claimed ADR-001 agreed with the code (BLAKE2b); ADR-001 + CLAUDE.md actually say HKDF. Flagged for ADR amendment. |
