# Security Model

This document describes the zero-knowledge security architecture of the Vida Platform. It specifies the encryption model, key hierarchy, authentication protocol, field classification, threat model, and device management.

**Audience:** Developers implementing any code that touches user data, encryption, authentication, or sync. Security auditors reviewing the system's guarantees.

**Governs:** All encryption and authentication code.

**Code it documents (already implemented and tested):**

- `packages/core/src/encryption/vault.ts` — Key derivation, encryption/decryption, key chain creation
- `packages/core/src/encryption/key-management.ts` — Vault key lifecycle, auto-lock, key rotation prep
- `packages/core/src/encryption/srp.ts` — SRP client protocol
- `packages/core/src/encryption/__tests__/vault.test.ts` — Passing test suite
- `packages/core/src/encryption/__tests__/srp.test.ts` — Passing test suite
- `packages/core/src/db/repository.ts` — `encryptRow` and `decryptRow`

---

## 1. Zero-Knowledge Guarantee

The Vida Platform is **zero-knowledge**: the server never receives, stores, processes, or has access to plaintext user content. The server is a blind relay that routes opaque encrypted blobs between a user's devices.

**What the server stores:**

- SRP salt and verifier (NOT the password)
- Encrypted sync blobs (opaque ciphertext — the server cannot read them)
- Encrypted Yjs snapshots (opaque ciphertext)
- Encrypted attachment files (opaque ciphertext)
- Metadata: table names, row IDs (UUIDv7), sync versions, timestamps, device IDs, operation types

**What the server never sees:**

- User passwords (SRP ensures this)
- Master keys, account keys, or vault keys
- Any decrypted field value (title, description, amount, name, content, etc.)
- Foreign key relationships between entities (FKs are inside the encrypted blob)
- Tags, categories, or user-generated labels

---

## 2. Security Guarantees

These are concrete, testable claims that define what the system promises. Any code change that violates a guarantee is a security regression.

### Guarantee 1: The server never receives plaintext user content

All user-generated content is encrypted on the client before leaving the device. The sync server receives only ciphertext blobs. The server has no decryption keys and no code path that decrypts data.

**Adversary scenario:** A malicious server operator (or an attacker who compromises the server) inspects all stored data and all traffic. They find only encrypted blobs. Without the user's vault key, the content is unrecoverable.

### Guarantee 2: A complete R2 storage dump reveals no user content

Given a full dump of the Cloudflare R2 bucket, an attacker recovers: table names, row IDs, sync versions, timestamps, blob sizes, and encrypted ciphertext. They cannot determine what any task says, what any note contains, what any financial transaction represents, or who any contact is.

**Adversary scenario:** An attacker obtains backup tapes or gains read access to R2. They can count how many tasks a user has and when they were modified, but they cannot read any content.

### Guarantee 3: A stolen locked device yields no user content

When the device is locked (app closed or vault locked), the SQLite database file is encrypted at rest by SQLCipher (L1). The SQLCipher key is derived from the vault key, which is wiped from memory on lock. Without the master password + account key, the database file is unreadable.

**Adversary scenario:** A thief steals a laptop or phone. The app is closed. They copy the SQLite database file. Without the vault key (which requires the master password AND account key to derive), the file is indistinguishable from random bytes.

### Guarantee 4: Vault key derivation requires both master password AND account key

The vault key is derived as: `Vault Key = BLAKE2b-256(Master Key, Account Key)`, where `Master Key = Argon2id(password, salt)`. Knowing only the password is insufficient — the account key (256-bit random, shown once at registration) is also required. This protects against password-only compromise.

**Adversary scenario:** An attacker obtains the user's password (phishing, shoulder surfing). Without the account key, they cannot derive the vault key and cannot decrypt any data — not even via the sync server.

### Guarantee 5: No API call returns decrypted user data

The sync server API has no endpoint that returns plaintext user content. All `/api/sync/pull` responses contain encrypted blobs. The server has no decryption capability in its codebase.

**Adversary scenario:** An attacker discovers an API vulnerability or gains authenticated access to another user's session token. All data they can retrieve is encrypted. Without the victim's vault key, it is useless.

### Guarantee 6: Field-level encryption protects sensitive fields even while the app is running

Even when the app is open and the vault is unlocked, sensitive fields (titles, descriptions, amounts, PII) are stored encrypted in SQLite (L2). They are decrypted only in application memory at the repository boundary for rendering. The SQLite file on disk always contains ciphertext for E-classified fields.

**Adversary scenario:** An attacker gains read access to the SQLite file while the app is running (e.g., via a backup tool or file browser). Plaintext structural fields (status, dates, IDs) are visible, but all user-generated content (titles, descriptions, financial amounts, contact names) remains encrypted.

### Guarantee 7: Sync blob encryption protects data in transit and at rest on the server

Every row pushed to the sync server is: serialized to JSON, compressed with LZ4, encrypted with XChaCha20-Poly1305 using the vault key with a random 24-byte nonce, and base64-encoded. The server stores only the resulting opaque blob.

**Adversary scenario:** An attacker performs a man-in-the-middle attack on the sync connection (bypassing TLS). They capture sync blobs. Without the vault key, the blobs cannot be decrypted. Each blob uses a unique nonce, preventing correlation attacks.

### Guarantee 8: SRP authentication means the server never sees or stores passwords

Registration sends only a salt and SRP verifier to the server. Login uses a zero-knowledge proof — the server verifies the user knows the password without the password ever being transmitted. The server stores no password, no password hash, and no material from which the password could be recovered.

**Adversary scenario:** An attacker dumps the server's user database. They obtain SRP salts and verifiers. These cannot be used to derive the password (SRP verifier is a one-way function). They cannot log in as the user or derive the user's vault key.

---

## 3. Threat Model

### Trust Boundaries

```
TRUSTED                              UNTRUSTED
┌────────────────────────┐           ┌──────────────────────────┐
│  Client Device         │           │  Sync Server             │
│  (when vault unlocked) │           │  (zero-knowledge relay)  │
│                        │           │                          │
│  - Vault key in memory │  -----→   │  - Stores encrypted blobs│
│  - Decrypted data in   │  encrypted│  - Routes sync messages  │
│    app memory          │  only     │  - Manages auth (SRP)    │
│  - SQLite file on disk │           │  - Cannot decrypt data   │
└────────────────────────┘           └──────────────────────────┘
```

The client device is the **trust boundary**. When the vault is unlocked, the device has the vault key in memory and can decrypt all data. The server is always untrusted — it is designed to function correctly even if fully compromised.

### Adversary Matrix

| Adversary                        | What They Can Do                                                                                                  | What They Cannot Do                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Malicious server operator**    | Read metadata (table names, row IDs, timestamps, blob sizes). Count entities. Observe activity patterns.          | Read any user content. Decrypt blobs. Know what entities contain. See FK relationships.               |
| **Network attacker (MITM)**      | Capture encrypted sync blobs (if TLS is bypassed).                                                                | Decrypt blobs without vault key. Replay old blobs (version + timestamp rejection).                    |
| **Thief (device locked)**        | Possess the physical device and the encrypted SQLite file.                                                        | Read the SQLite file (SQLCipher L1). Derive the vault key without password + account key.             |
| **Thief (device unlocked)**      | Access all decrypted data in the running app. Copy the SQLite file (can decrypt if vault key is still in memory). | Access data on other devices (revoking the device + changing password invalidates the old vault key). |
| **Attacker with password only**  | Nothing useful — vault key requires password + account key.                                                       | Derive vault key. Authenticate (SRP requires both). Decrypt any data.                                 |
| **Attacker with server DB dump** | Read SRP salts and verifiers.                                                                                     | Derive passwords from verifiers. Authenticate as the user. Decrypt sync blobs.                        |

### What We Explicitly Do NOT Defend Against

| Scenario                                  | Why                                                                                                                                                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keylogger on the device**               | If malware captures the master password as the user types it, the attacker can derive the vault key (if they also have the account key). Device security is the user's responsibility.                                                                      |
| **User shares their account key**         | The account key is the second factor of vault key derivation. If the user gives it away along with their password, all data is accessible.                                                                                                                  |
| **Physical access to an unlocked device** | When the app is open and the vault is unlocked, the vault key is in memory. An attacker with physical access can read all data through the app's UI. Auto-lock mitigates this.                                                                              |
| **Metadata analysis**                     | The server knows table names, row counts, activity timestamps, and device IDs. An adversary can infer how active a user is, what types of entities they create, and when they work. This is inherent to any sync system and is documented for transparency. |

---

## 4. Three-Layer Encryption Model

| Layer                | What It Protects                 | When Active                                                                                    | Implementation                                                                                                                                         |
| -------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **L1 — SQLCipher**   | Entire `.db` file on disk        | At rest (device locked, app closed)                                                            | SQLCipher transparent encryption. Key derived from vault key. 256K KDF iterations, HMAC_SHA512, 4KB page size, fully encrypted (no plaintext header).  |
| **L2 — Field-level** | Individual columns inside SQLite | At rest AND in memory (fields stay encrypted in SQLite until explicitly decrypted for display) | libsodium `crypto_secretbox` (XChaCha20-Poly1305). Random 24-byte nonce per encryption. Ciphertext stored as base64 TEXT in format `nonce:ciphertext`. |
| **L3 — Sync blob**   | Rows in transit and on server    | In transit + server at rest                                                                    | Full row → LZ4 compress → libsodium `crypto_secretbox` → base64 blob. Server stores only opaque blobs.                                                 |

### How the Layers Interact

```
User creates a note with title "Meeting with Prof. Johnson"

L2 (field-level): title is encrypted before writing to SQLite
    title column in SQLite: "rAnDoMnOnCe:eNcRyPtEdCiPhErTeXt..."
    (even if SQLCipher is unlocked while app is running, title is still encrypted)

L1 (SQLCipher): the entire .db file is encrypted on disk
    (if the device is locked or app is closed, the whole file is unreadable)

L3 (sync blob): when the row syncs, the ENTIRE row is serialized,
    compressed, and encrypted as a single opaque blob
    (the server stores only this blob — it cannot read even the P fields)
```

**Key insight:** L1 protects everything when the device is locked. L2 adds defense-in-depth for the most sensitive fields — even if SQLCipher is unlocked (app running), these fields remain encrypted in the SQLite file until the app explicitly decrypts them for rendering. L3 ensures the sync server is zero-knowledge.

---

## 5. Key Hierarchy

```
Master Password (user-chosen)
    │
    │  Argon2id(password, salt)
    │  salt: 16 bytes random (stored on server with SRP verifier)
    │  OWASP interactive limits
    │
    v
Master Key (32 bytes)
    │                          Account Key (32 bytes random)
    │                          (generated once, shown to user as recovery key)
    │                          (format: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXX")
    │                          │
    │  BLAKE2b-256(masterKey, accountKey)
    │                          │
    v                          v
Vault Key (32 bytes)  <────────┘
    │
    ├──> SQLCipher key (derived from vault key for L1)
    ├──> Field encryption key (vault key used directly for L2)
    └──> Sync blob encryption key (vault key used directly for L3)
```

### Key Properties

| Key                 | Size     | Persistence                                                                                | Derivation                                            |
| ------------------- | -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Master Password** | Variable | User's memory only                                                                         | User-chosen                                           |
| **Salt**            | 16 bytes | Stored on server alongside SRP verifier                                                    | `generateSalt()` — random                             |
| **Account Key**     | 32 bytes | Shown once at registration as recovery key. User stores it offline.                        | `generateAccountKey()` — random                       |
| **Master Key**      | 32 bytes | **Never persisted.** Derived in memory, used to compute vault key, then immediately wiped. | `deriveMasterKey(password, salt)` — Argon2id          |
| **Vault Key**       | 32 bytes | Cached in memory while vault is unlocked. Wiped on lock.                                   | `deriveVaultKey(masterKey, accountKey)` — BLAKE2b-256 |

### Code References

- `packages/core/src/encryption/vault.ts`:
  - `deriveMasterKey(password, salt)` — Argon2id key derivation
  - `deriveVaultKey(masterKey, accountKey)` — BLAKE2b-256
  - `generateSalt()` — 16 bytes random
  - `generateAccountKey()` — 32 bytes random
  - `formatAccountKey(key)` — Convert to display format
  - `parseAccountKey(formatted)` — Parse display format back to bytes
  - `createKeyChain(password)` — Generate all keys for new account
  - `unlockKeyChain(password, accountKey, salt)` — Re-derive vault key for login

---

## 6. Key Lifecycle

### Account Creation

```
1. User chooses master password
2. Client calls createKeyChain(password):
   a. generateSalt() → salt (16 bytes)
   b. generateAccountKey() → accountKey (32 bytes)
   c. deriveMasterKey(password, salt) → masterKey
   d. deriveVaultKey(masterKey, accountKey) → vaultKey
   e. zeroKey(masterKey) — wipe master key from memory
   f. Return { salt, accountKey, vaultKey }
3. Client shows account key to user ONCE as recovery key
   Format: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXX"
4. Client creates SRP registration (salt + verifier sent to server)
5. Server stores: { email, salt, srp_verifier } — nothing else
6. Client caches vaultKey in memory, opens database with SQLCipher
```

### Login (Existing Device)

```
1. User enters master password + account key
2. Client calls unlock(password, accountKey, salt):
   a. deriveMasterKey(password, salt) → masterKey
   b. deriveVaultKey(masterKey, accountKey) → vaultKey
   c. zeroKey(masterKey) — wipe master key immediately
   d. Cache vaultKey in memory
   e. Set vault state to 'unlocked'
   f. Emit status change to listeners
3. Client opens SQLite database with SQLCipher key (derived from vaultKey)
4. markDbUnlocked() — DB is now accessible
5. Background: rebuild FTS5 indexes from decrypted data
6. markFtsReady() — search is now available
```

### Lock / Wipe

```
1. Auto-lock timer fires (configurable idle period) OR user manually locks
2. Client calls lock():
   a. zeroKey(vaultKey) — overwrite vault key bytes with zeros
   b. Set vaultKey = null
   c. Set vault state to 'locked'
   d. Emit status change to listeners
3. Database operations will throw VaultLockedError until next unlock
```

### In-Memory Key Management

Managed by `packages/core/src/encryption/key-management.ts`:

| State                      | Vault Key    | DB Access  | FTS Search    |
| -------------------------- | ------------ | ---------- | ------------- |
| `locked`                   | null (wiped) | Blocked    | Blocked       |
| `unlocking`                | Deriving...  | Blocked    | Blocked       |
| `unlocked` (db not ready)  | In memory    | Opening... | Blocked       |
| `unlocked` (fts not ready) | In memory    | Available  | Rebuilding... |
| `unlocked` (fully ready)   | In memory    | Available  | Available     |

### Auto-Lock Timer

- Configurable idle period (default: 15 minutes)
- `startAutoLockTimer(durationMs)` — sets timeout
- `resetAutoLockTimer()` — resets on user activity
- `clearAutoLockTimer()` — cancels pending auto-lock
- On timer fire: calls `lock()` which wipes the vault key

---

## 7. SRP Authentication

SRP (Secure Remote Password) is a zero-knowledge proof protocol. The server verifies the user knows their password without the password ever being transmitted.

### Registration Flow

```
Client                                          Server
  │                                               │
  │  createRegistration(email, password)           │
  │  ├── Generate salt (random)                    │
  │  ├── Derive private key from password + salt   │
  │  ├── Compute SRP verifier from private key     │
  │                                               │
  │  ── POST /api/auth/register ──────────────→   │
  │     { email, salt, verifier }                  │
  │                                               │
  │                            Server stores:      │
  │                            { email, salt,      │
  │                              srp_verifier }    │
  │                                               │
  │                            Server does NOT     │
  │                            store: password,    │
  │                            private key, or     │
  │                            any decryptable     │
  │                            material            │
  │  ←── 201 Created ────────────────────────────  │
```

**Code:** `packages/core/src/encryption/srp.ts` — `createRegistration(email, password)`

### Login Flow

```
Client                                          Server
  │                                               │
  │  Step 1: Generate client ephemeral             │
  │  generateLoginEphemeral() → { public, secret } │
  │                                               │
  │  ── POST /api/auth/challenge ──────────────→  │
  │     { email, clientPublic }                    │
  │                                               │
  │                            Server looks up     │
  │                            { salt, verifier }  │
  │                            for this email      │
  │                                               │
  │                            Server generates    │
  │                            server ephemeral    │
  │                                               │
  │  ←── { salt, serverPublic } ─────────────────  │
  │                                               │
  │  Step 2: Derive client session                 │
  │  deriveClientSession(                          │
  │    email, salt, password,                      │
  │    clientEphemeral, serverPublic               │
  │  ) → { key, proof: M1 }                       │
  │                                               │
  │  ── POST /api/auth/verify ────────────────→   │
  │     { email, clientProof: M1 }                 │
  │                                               │
  │                            Server verifies M1  │
  │                            using stored        │
  │                            verifier            │
  │                                               │
  │                            If valid:           │
  │                            compute server      │
  │                            proof M2            │
  │                                               │
  │  ←── { serverProof: M2, sessionToken } ──────  │
  │                                               │
  │  Step 3: Verify server proof (mutual auth)     │
  │  verifyServerProof(session, M2)                │
  │  ├── If valid: server is authenticated         │
  │  └── If invalid: abort (server is imposter)    │
```

**Code references:**

- `generateLoginEphemeral()` — Client key pair generation
- `createChallengeRequest(email, ephemeral)` — Package for server
- `deriveClientSession(email, salt, password, ephemeral, serverPublic)` — Compute shared key + proof
- `createVerifyRequest(session)` — Package proof for server
- `verifyServerProof(session, serverProof)` — Mutual authentication

**Convenience wrappers:**

- `startLogin(email)` — Generates ephemeral, returns it
- `completeLogin(email, password, ephemeral, serverSalt, serverPublic)` — Derives session, returns key + proof

### What SRP Guarantees

| Property                          | Explanation                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Zero-knowledge**                | The server never receives the password in any form. It verifies knowledge of the password via the SRP proof.           |
| **Mutual authentication**         | The server proves to the client that it has the correct verifier (M2). A fake server cannot complete the handshake.    |
| **No password equivalent stored** | The SRP verifier cannot be used to impersonate the client. Even with a full server DB dump, an attacker cannot log in. |
| **Forward secrecy per session**   | Each login generates fresh ephemeral keys. Compromising one session doesn't reveal others.                             |

---

## 8. Field Classification (P/E System)

Every column in every table is classified as **P (Plaintext)** or **E (Encrypted)**.

> **Scope of this section (2026-07-25).** The **classification rules** and the **substrate field-classes** below are
> current and authoritative at the _class_ level. The **per-table breakdown** (§8 "Per-Table Breakdown") is a snapshot
> of the **pre-rebuild (v1) schema** and is retained for orientation only — the authoritative per-column P/E
> classification is regenerated table-by-table by the storage rebuild (**DB-11 / ADR-016**), so retired tables still
> listed there (`page_tags`, `pomodoro_sessions`, the `purpose_*` junctions, `xp_history`, `flashcard_*`) are v1
> As-is, not the go-forward model. This section does **not** re-tabulate the rebuilt schema (that is schema-level work
> owned by DB-11). **Encryption itself is a deferred hardening pass** (ADR-017): Phase-1.0 is features-first; the P/E
> classification is the _target_, enforced when field-level encryption lands. §1–7 (the crypto architecture) are
> current and unaffected.

### Classification Rules

| Classification    | Marker     | Properties                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Rule                                                                                                                                                |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P — Plaintext** | (unmarked) | Queryable with `WHERE`/`ORDER BY`/`JOIN`. Indexed. Still encrypted at rest by SQLCipher (L1) and in sync blobs (L3).                                                                                                                                                                                                                                                                                                                                                                                                                         | Structural identifiers, foreign keys, enums/status values, timestamps, booleans, sort orders, numeric aggregates needed for queries, sync metadata. |
| **E — Encrypted** | `-- [E]`   | Opaque ciphertext in SQLite (random-nonce XChaCha20-Poly1305). **Cannot be queried, indexed, sorted, or aggregated with SQL.** Query features run only in the app after decrypt: aggregation via **decrypt-in-memory** (e.g. all Finance money charts); equality lookup via an **equality-only blind index** (keyed-BLAKE2b PRF in a P side column, domain-separated key per ADR-001 §Key Model); full-text via a **plaintext-fed standalone FTS5** (FTS-2, rebuilt on unlock). Never SQL over ciphertext. See ADR-002 §P/E + §5.19 (F7/D7). | All user-generated free text, PII, financial amounts, names, titles, descriptions, content, tags, URLs that reveal user activity.                   |

### Always Plaintext (P)

- `id` — Primary key, needed for joins and lookups
- `*_id` — All foreign keys, needed for joins
- `created_at`, `updated_at`, `deleted_at` — Needed for sort, sync, cleanup
- `_sync_*` — All sync metadata, needed for sync protocol
- `type`, `status`, `priority`, `difficulty`, `frequency` — Enum-like, needed for filtering
- `sort_order`, `is_active`, `is_favorite`, `is_archived`, `is_completed` — Booleans/ordering
- `progress`, `current_streak`, `longest_streak`, `total_completions` — Numeric aggregates for dashboards
- `*_date` — Calendar dates needed for scheduling queries
- `day_of_week`, `start_time`, `end_time` — Scheduling structure
- `color`, `icon` — UI hints, not user content
- `currency` — Structural

### Always Encrypted (E)

- All `title` / `name` fields — User-generated names
- All `description` / `content` / `vision` / `why` / `reflection` fields — Free text
- All `summary` / `key_learnings` / `key_concepts` fields — Free text
- All PII: `first_name`, `last_name`, `email`, `phone`, `nickname`
- All financial amounts: `amount`, `current_balance`, `purchase_price`, `current_value`, `monthly_payment`
- Tag values on `entity_tags` (the universal tag substrate, ADR-006 — supersedes inline `*.tags` / `page_tags`) — user-generated labels reveal interests
- All user-generated URLs: `url`, `feed_url`, `playlist_url`, `song_url`, `inspiration_url`, `cover_url`
- All `metadata` / `custom_data` / `steps` / `resources` JSON fields — Arbitrary user content
- Vocabulary + review-item content: `word`, `translation`, review-item `front`/`back`/`hint` (on the review engine, ADR-005)
- Blob fields: `encrypted_blob`, `thumbnail_blob`, `audio_blob`

### Substrate Field-Classes

The foundation substrates (ADRs 004–015) introduce field-classes not present in the v1 per-table breakdown below. Their
P/E tier is stated here **at the class level** (the exhaustive per-column table is owned by DB-11):

| Substrate class                                              | Tier                                         | Rationale                                                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity_tags` — `tag_value` / label                          | **E**                                        | User-generated labels reveal interests (ADR-006). Structural columns (`entity_type`, `entity_id`, FKs) are P.                                                 |
| `spaces` — `name`                                            | **E**                                        | User-named workspace. Structural columns P.                                                                                                                   |
| `sessions` — user notes / free text on a session             | **E**                                        | Free text. Structural columns (`sub_type`, `status`, timers, counts, FKs, `effect_event_id`) are P.                                                           |
| `contributions` — weight / structural                        | **P**                                        | Weights and FKs are numeric/structural aggregates for the rollup (ADR-011); no free text.                                                                     |
| `consequence_ledger` — currency / amount / rule ref          | **P**                                        | Currency amounts here are gamification points, not financial money — numeric structural values needed to derive balances (ADR-012). Any free-text label is E. |
| review engine — `review_events` / `method_bindings` metadata | **P** (event/metadata); **E** (item content) | Timing, ease, interval, curve params are structural; the reviewed item's content is E (see review-item row above).                                            |
| `views` — `name`, filter/layout config                       | **E** (name); **P** (structural config)      | The view name is user text; the filter/layout/grouping structure is queryable config (ADR-007).                                                               |

### Per-Table Breakdown

> **v1 snapshot — As-is, not the go-forward model.** The tables below reflect the **pre-rebuild schema** and still list
> retired tables (`page_tags`, `pomodoro_sessions`, the `purpose_*` junctions, `xp_history`, `flashcard_*`). They are
> kept for orientation; the **authoritative per-column classification is regenerated per-table by DB-11** (ADR-016)
> against the substrate model (see "Substrate Field-Classes" above). Do not treat a retired table here as current.

#### Notes & Pages Domain

**`pages`**

| Field                                        | P/E   | Rationale                                    |
| -------------------------------------------- | ----- | -------------------------------------------- |
| `id`, `parent_id`                            | P     | PK / FK                                      |
| `type`                                       | P     | Filter: journal, note, task_note, etc.       |
| `title`                                      | **E** | User-generated                               |
| `content`                                    | **E** | TipTap JSON document — core user content     |
| `entity_type`, `entity_id`                   | P     | Polymorphic FK for queries                   |
| `journal_date`                               | P     | Calendar queries                             |
| `is_favorite`, `is_archived`, `has_pomodoro` | P     | Booleans for filtering                       |
| `icon`                                       | P     | UI hint                                      |
| `cover_image`                                | **E** | User-chosen image URL                        |
| `summary_config`                             | **E** | JSON config reveals which modules are active |
| `word_count`                                 | P     | Numeric aggregate                            |
| `created_at`, `updated_at`, `deleted_at`     | P     | Timestamps                                   |
| `_sync_*`                                    | P     | Sync protocol                                |

**`page_links`** — `context` is **E** (text snippet from user content). All FKs and timestamps are P.

**`entity_links`** — `context` is **E** (text snippet). All FKs, `entity_type`, `entity_id` are P.

**`tags`** — `name` is **E** (user-generated label). `color` is P.

**`page_tags`** — All P (FKs + sync metadata only).

**`note_attachments`** — `filename` is **E**, `encrypted_blob` is **E**, `thumbnail_blob` is **E**. `mime_type`, `size_bytes` are P.

**`pomodoro_sessions`** — All P (structural/numeric only: timers, counts, status, FKs).

#### Tasks Domain

**`tasks`**

| Field                                                | P/E   | Rationale             |
| ---------------------------------------------------- | ----- | --------------------- |
| `id`, `project_id`, `milestone_id`, `parent_task_id` | P     | PK / FKs              |
| `title`                                              | **E** | User-generated        |
| `description`                                        | **E** | Free text             |
| `status`, `priority`, `difficulty`                   | P     | Enum filters          |
| `due_date`                                           | P     | Scheduling queries    |
| `estimated_minutes`, `actual_minutes`                | P     | Numeric aggregates    |
| `tags`                                               | **E** | User-generated labels |
| `sort_order`                                         | P     | Ordering              |
| `created_at`, `updated_at`, `deleted_at`             | P     | Timestamps            |
| `_sync_*`                                            | P     | Sync protocol         |

**`task_time_logs`** — All P (FKs, timestamps, duration — structural).

#### Projects Domain

**`projects`** — `title`, `description`, `vision`, `tags` are **E**. Status, progress, dates, hours are P.

**`milestones`** — `title`, `description` are **E**. Status, progress, dates are P.

**`project_documents`** — `name`, `encrypted_blob` are **E**. File type, size are P.

#### Habits Domain

**`habits`** — `name`, `description`, `unit`, `cue`, `reward`, `tags` are **E**. Type, frequency, streaks, completions are P.

**`habit_completions`** — All P (numeric ratings and dates — no free text).

#### Routines Domain

**`routine_actions`** — `title`, `description` are **E**. Type, recurrence, FKs are P.

**`routine_completions`** — `skip_reason` is **E**. Dates, duration, booleans are P.

#### Purposes & Goals Domain

**`purposes`** — `title`, `description`, `vision`, `why` are **E** (deeply personal). Domain, status, progress, dates are P.

**`targets`** — `title`, `description`, `unit` are **E**. Values, dates, status are P.

**`purpose_metrics`** — `name`, `description`, `unit` are **E**. Values, calculation method are P.

**`target_reviews`** — `reflection`, `next_actions` are **E** (personal reflection). Rating, date are P.

**`dreams`** — `title`, `description`, `estimated_cost` are **E**. Domain, age target are P.

**Junction tables** (`purpose_habits`, `purpose_routines`, `purpose_projects`, `project_habits`) — All P (FKs + sync metadata only).

#### Financial Domain

**`accounts`** — `name`, `institution`, `current_balance`, `credit_limit`, `interest_rate` are **E**. Account type, currency, `is_active` are P.

**`transactions`** — `amount`, `category`, `subcategory`, `description`, `tags` are **E**. Type, date, `is_recurring`, currency are P.

**`assets`** — `name`, `purchase_price`, `current_value`, `depreciation_rate`, `location` are **E**. Type, dates are P.

**`liabilities`** — `name`, `original_amount`, `current_balance`, `monthly_payment`, `interest_rate`, `lender` are **E**. Type, due date are P.

**`investments`** — `name`, `ticker_symbol`, `quantity`, `purchase_price`, `current_price` are **E**. Type is P.

**`income_streams`** — `name`, `amount`, `employer` are **E**. Type, frequency, dates are P.

#### Relationships / CRM Domain

**`contacts`** — `first_name`, `last_name`, `nickname`, `email`, `phone`, `avatar_url`, `company`, `job_title`, `location`, `birthday`, `tags`, `social_links` are **E** (PII). Relationship type, frequency, interaction count, dates are P.

**`contact_events`** — `title`, `description` are **E**. Type, date, recurrence are P.

**`interactions`** — `summary`, `follow_up_notes` are **E**. Type, date, duration, sentiment are P.

**`contact_reminders`** — `title` is **E**. Date, frequency, booleans are P.

**`reminder_groups`** — `name`, `message_template` are **E**. Time, frequency, days are P.

#### Learning Domain

**`courses`** — `title`, `description`, `provider`, `instructor`, `url`, `tags`, `metadata` are **E**. Type, status, progress, dates are P.

**`books`** — `title`, `author`, `isbn`, `review`, `cover_url`, `genre`, `tags` are **E**. Format, status, pages, rating are P.

**`book_chapters`** — `title` is **E**. Numbers, pages, times are P.

**`skills`** — `name`, `description` are **E**. Mastery level, hours are P.

**`study_sessions`** — `key_learnings` is **E**. Duration, ratings, timestamps are P.

**`study_topics`** — `title`, `description`, `key_concepts`, `resource_urls` are **E**. Status, difficulty, dates, SM-2 state are P.

**`flashcard_decks`** — `title`, `description` are **E**. Settings, counts are P.

**`flashcards`** — `front`, `back`, `hint`, `explanation` are **E**. SM-2 state, review stats are P.

**`knowledge_notes`** — `title`, `content`, `topic`, `subtopic`, `tags` are **E**. Booleans are P.

#### Language Learning Domain

**`languages`** — `resources` is **E** (user-curated links). Language identifiers, proficiency levels, streaks are P.

**`language_practice_sessions`** — `content` is **E**. Skill type, duration, accuracy are P.

**`language_vocabulary`** — `word`, `translation`, `pronunciation`, `example_sentence`, `meaning_in_target_language`, `source_activity` are **E**. Mastery, review count are P.

**`language_daily_sessions`** — `grammar_video_url`, `vocabulary_video_url`, `conversation_video_url` are **E**. Booleans, dates, numbers are P.

**`language_recordings`** — `title`, `audio_blob`, `transcript`, `metadata` are **E**. Type, duration are P.

**`language_weekly_plans`** — `song_title`, `song_artist`, `song_url`, `song_lyrics`, `bible_book`, `planned_videos`, `weekly_reflection`, `highlight_moments`, `challenges_faced` are **E**. Numbers, topic enum are P.

**`language_base_words`** — `english_word`, `translation`, `meaning_in_target_language`, `pronunciation` are **E**. Category, booleans are P.

**`language_video_playlists`** — `playlist_url`, `title` are **E**. Counts are P.

#### Check-ins Domain

**`daily_check_ins`** — `top_intentions`, `wins`, `gratitude`, `challenges`, `tomorrow_focus`, `reflection`, `custom_data` are **E** (deeply personal). Mood score, energy level, date are P.

**`check_in_templates`** — `name`, `description` are **E**. Schedule, booleans are P.

**`check_in_template_questions`** — `label`, `placeholder` are **E**. Field type, constraints are P.

#### Bucket List Domain

**`bucket_list_items`** — `title`, `description`, `estimated_cost`, `location`, `image_url`, `cover_image_url`, `tags`, `steps`, `inspiration_url` are **E**. Category, status, dates, progress are P.

#### Gamification Domain

**`user_profile`** — `display_name`, `avatar_url`, `birth_date`, `focus_areas` are **E** (PII). Persona, XP, level, streaks are P.

**`achievements`** — All P (app-defined static content, not user-generated).

**`user_achievements`** — All P (FK, timestamp, progress counters).

**`xp_history`** — All P (action type, amounts, timestamps — structural).

#### Notifications Domain

**`notifications`** — `title`, `message`, `action_label` are **E** (may contain entity names). Type, entity refs, booleans, timestamps are P.

#### Preferences & Navigation Domain

**`user_preferences`** — All P (settings values: theme, locale, config — not user content).

**`nav_preferences`** — All P (dock config — structural).

**`command_bar_history`** — All P (command keys, counts — structural).

#### ICS Calendar Sync Domain

**`ics_feed_configs`** — `feed_url`, `feed_name`, `last_error`, `metadata` are **E**. Booleans, intervals, timestamps are P.

**`ics_synced_events`** — `summary`, `description`, `location`, `raw_event` are **E**. Times, recurrence, FKs are P.

### Encryption Statistics

> **v1 figures — superseded; not re-asserted here.** The field/table counts that stood in this section described the
> pre-rebuild schema (the retired ~520-field / ~72-table model). Exact counts are **owned by the storage rebuild
> (DB-11 / ADR-016)** and are deliberately **not** re-asserted in this doc — asserting a new count would cross into
> schema-level reconciliation (out of scope for the architecture layer). The **shape** of the distribution is stable
> and is the useful takeaway:
>
> - The **majority of fields are P** (structural identifiers, FKs, enums, timestamps, numeric aggregates, sync
>   metadata) — this is what keeps the local DB queryable.
> - **E is concentrated** in user-generated free text, PII, financial amounts, tag values (`entity_tags`), and blobs.
> - **All-structural tables carry zero E fields** (junction/link tables, time logs, `contributions`, `consequence_ledger`,
>   review-event metadata, availability, preferences) — they hold only FKs, numbers, and enums.
> - **E-dominant tables** are the content-heavy ones (contacts, vocabulary, check-ins, bucket-list items, review-item
>   content).

---

## 9. Device Management

### Device Registration

On first login on a new device:

1. Client generates a `device_id` (UUIDv4)
2. Client sends `POST /api/devices/register` with `{ device_id, device_name, platform }`
3. Server creates device record
4. Server returns `{ registered: true, device_count: N }`

### Device Limits

| Plan | Max Devices |
| ---- | ----------- |
| Free | 3           |
| Pro  | 10          |

Exceeding the limit returns `429 Too Many Devices`.

### Device Revocation

When a user revokes a device (e.g., lost phone):

1. User selects "Remove device" in settings on another device
2. Client sends `DELETE /api/devices/{device_id}`
3. Server marks device as revoked (`is_revoked = 1`)
4. Server closes any active WebSocket connection from that device
5. Server broadcasts `{ type: "device_revoked", device_id }` to other devices
6. Future auth attempts from the revoked device are rejected

**What revocation does NOT do:**

- Does NOT re-encrypt data (impractical for zero-knowledge — server can't re-encrypt)
- Does NOT delete data from the revoked device (can't — it's local)
- The revoked device still has its local SQLite with all data up to the point of revocation

### Password Change After Device Compromise

What the user SHOULD do after revoking a lost device:

1. Change master password → re-derives vault key
2. This produces a new vault key (different from the old one)
3. Existing devices re-authenticate and derive the new vault key
4. The lost device's vault key is now stale — it cannot sync to get new data
5. The lost device's local data from before the compromise remains accessible to whoever has it, but it becomes an increasingly stale snapshot

---

## References

- **ADR-001 section 6** — Encryption and authentication technology choices
- **ADR-002 section 4** — Three-layer encryption model and complete field classification
- **ADR-002 section 4.5** — Sync blob encryption format and what the server knows
- **ADR-003 section 12** — Device management (registration, revocation, limits)
- **ADR-003 section 14** — Security considerations (header leakage, metadata analysis, replay protection)
- `packages/core/src/encryption/vault.ts` — Key derivation and encryption primitives
- `packages/core/src/encryption/key-management.ts` — Vault lifecycle and auto-lock
- `packages/core/src/encryption/srp.ts` — SRP client protocol
- `packages/core/src/db/repository.ts` — encryptRow/decryptRow at repository boundary
