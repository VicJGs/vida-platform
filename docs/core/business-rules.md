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
  - **INT-1a (ADR-006 reconciliation, 2026-07-15)** — the polymorphic **association primitives** themselves
    (`entity_links` *reference* + the new `entity_tags` *grouping*) are owned by the **Spaces tier** (a foundation
    *beneath* N&P), **consumed** by N&P and every module — they are no longer N&P-owned. N&P remains the **pages/notes
    hub** (pages, note-backlinks, the journal page); Spaces owns the universal association substrate the hub and all
    modules use. INT-1's rule (connect via these primitives; no direct cross-table reads) is unchanged; only the
    *ownership* of the primitives moves down a tier. `[FACT: ADR-006 §3.1-3.3; PC-2]`

## Personalization & Composability (PC) — the Spaces invariant
The user composes his own module-like surfaces (Spaces) from generic primitives; that power **never** relaxes the
rules above. Source: the Spaces ADR set (ADR-006…010), which establishes Spaces as a foundation tier *beneath* Notes
& Pages.
- **PC-1** — **Personalization never breaks zero-knowledge.** Every user-composed surface — tags, saved views,
  capabilities, templates — obeys ZK/EN unconditionally: user content encrypts (EN-2), nothing plaintext leaves the
  device, ZK-1/ZK-2 hold no matter what the user composes or authors. `[FACT: ADR-006 §3.5; ADR-010 §3.5; intake SP8]`
- **PC-2** — **Ship defaults; the user personalizes; distinct primitives, user-owned composition.** The OS ships
  working defaults (tags, a default view set, shipped capabilities/templates) and the user creates/edits/forks his
  own. Tags (grouping) and links (reference) are **distinct at storage**; the OS **resolves** them into one
  association surface — or keeps them separate — **on the user's choice** (a real behavioral resolution, never a
  forced merge). `[FACT: ADR-006 §3.3; ADR-007 §3.2]`
- **PC-3** — **Untrusted capability code runs guarded (extension-model, applied to authoring).** Shipped
  capabilities are trusted; **user-authored or imported** capabilities run under a **declare→grant→enforce**
  permission envelope inside a **no-ambient-authority sandbox** — least privilege, attachment-scoped, guarded-write
  only, no double-count, sensitive-module consent, **revocable**, **fails closed**, **re-grant on envelope change**;
  the blast radius is bounded to the grant and ZK is never broken. `[FACT: ADR-010; ADR-004 §3.2.4/SS-6]`
- **PC-4** — **Community is external; the only bridge is user-initiated import/export.** Vida is a single-user
  local-first ZK vault (SU-1); there is **no in-OS sharing, feed, or marketplace**. The sole sharing bridge is
  **user-initiated import/export of authored (never accumulated) artifacts** — templates, external reference DBs.
  The OS never transmits vault data and never auto-shares. `[FACT: ADR-009 §3.4; SU-1; ADR-010 §Option-D-rejected]`
  - ⏸ **Expansion deferred (Victor 2026-07-15):** broadening the community-external bridge beyond the landed Spaces
    instance (further shareable artifact classes, external reference-DB ecosystems) **needs Victor's explicit go** —
    it is not opened by this pass.

## Extension Model (EX) — the guarded opt-in principle
- **EX-1** — **The zero-knowledge core is never changed by an integration.** Every external / AI / third-party
  integration is **opt-in**, the **user owns the risk**, and each is wrapped in a **protection layer** (consent +
  sandbox / permission envelope + encryption). The core stays a pure single-user local-first ZK vault **regardless of
  which integrations are enabled** — an integration adds a guarded surface, it never relaxes ZK-1/ZK-2/EN. `[FACT:
  Projects 2026-06-29 surfaced this as the governing principle; ADR-010 §3; task-file HIGH constitution item]`
- **EX-2** — **EX-1 frames the two standing ZK-integration ADRs** — *external-data ingestion* (bank/import,
  wearables, public reference data, **egress** to medical/external systems as the strictest case) and *AI/LLM
  integration* (agentic on-device = the ZK-safe path; cloud model = an opt-in, consented plaintext dent). Every
  module instance rides EX-1: Finance import, Health wearables/egress (CI-6), Books OCR/TTS, Skills external-DB.
  **PC-3** (capability authoring) is the *authoring* instance of EX-1; those two standing ADRs remain to be written
  in their own sessions. `[FACT: task-file candidate-ADRs; Health CI-6; Finance FN-9]`

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
| 2026-07-15 | documentation-blueprint · Spaces Transform | Added **Personalization & Composability (PC-1…PC-4)** — the Spaces invariant (ADR-006…010). PC-3 lands the **extension-model** principle's *authoring* instance; PC-4 lands the **community-is-external** principle. Added **INT-1a** (association primitives owned by the Spaces tier, consumed by N&P). |
| 2026-07-15 | documentation-blueprint · Spaces Accept (Victor) | **Folded the general extension-model principle → EX-1/EX-2** (Victor's go): ZK core unchanged by integrations; opt-in, user-owns-risk, wrapped guard; frames the two standing ZK-integration ADRs. **Community-external expansion deferred** (needs Victor's go to broaden beyond the Spaces instance). |
| 2026-07-16 | documentation-blueprint · ADR revise (F5/D6) | **Resolved the 2026-06-13 HKDF flag** — ADR-001 §6 + `CLAUDE.md` amended to `BLAKE2b-256` (keyed), matching the authoritative code (`vault.ts`, tested). Doc-vs-code drift closed; the code was always right. |
