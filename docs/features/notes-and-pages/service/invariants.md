<!-- service/invariants.md — Track A · §5 lens 3. The business rules the SERVICE enforces. REFERENCES
     ../business-rules.md + ../current-business-rules.md — does NOT restate them. Born 2026-08-22 (recovery). -->

# Invariants — what the NotesService enforces

The enforced rules are authored in `../current-business-rules.md` (the shipped record) against the intended
authority `../business-rules.md`. This lens **maps each to its enforcement site** and flags the cross-plane
NEED; it does not restate the rule text.

| Invariant | Enforced at | Doc |
|-----------|-------------|-----|
| **NP-2** one journal per date (`JournalExistsError`; identity immutable via update) | `service.ts:80-84,112-116` | `../current-business-rules.md:11-13` |
| **NP-5** page-links unique + idempotent (no-op / revive / create) | `service.ts:144-164` | `../current-business-rules.md:14-15` |
| **NP-6 / SP2** registered `entity_type` only (`UnregisteredEntityTypeError`) | `service.ts:62-64,79,197,247` | `../current-business-rules.md:16-18` |
| **NP-7** wiki-links resolve by id (caller binds `target_page_id`; create-on-miss explicit) | `service.ts:190-194` | `../current-business-rules.md:19-20` |
| **NP-8** entity notes auto-exist · deterministic · client-side | `service.ts:196-214,41-48` | `../current-business-rules.md:21-23` |
| **NP-9** soft delete (sets `deleted_at`, enqueues `update`; reads append `isNull`) | `service.ts:118-120,166-175,241-243` | `../current-business-rules.md:24-26` |
| **async-rejection contract** (validating methods `async` → rejection not sync throw) | `service.ts:76,112,246` | `../current-business-rules.md:27-28` |
| **delegation (ADR-018 §3.3)** writes→AR-6, reads→AR-8; composes never re-implements | `service.ts:246-262` | `../current-business-rules.md:29-30` |

## The enforced NEED (cross-plane — not a ①-code rule, but a hard precondition)

- **IR-1 / NEED #1 — keyless `_sync_hash` requires libsodium at boot.** The service ASSUMES it (its tests call
  `initVault()`); the consuming app must satisfy it. Today app-owned (`apps/web/db/boot.ts`); S6 hoists it to
  `@vida/core` so every platform enforces it. `[FACT: ../current-business-rules.md:67-70; ../delivery/interpretation.md NEED #1]`

## Not enforced here (homed elsewhere — do NOT add to ①)

`[E]` encryption (M1.0 pass-through) → M3/DB-5 · `/summary` aggregation → MOD-journals · FTS5 → DB-8 ·
`getBacklinks` page+entity **merge** (G6 tentative) → ②d · hard-delete cascade → deferred (no FK).
`[FACT: ../current-business-rules.md:63-66]`
