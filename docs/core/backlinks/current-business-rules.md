# Backlink resolution — CURRENT BUSINESS RULES
# Durable ground-truth (§XXIX). AR-8 increment #1 (2026-08-04).

- **BL-1 Read-only.** The resolver never mutates `entity_links`. Link creation/removal is AR-6's
  `SpacesService.createLink`/`removeLink` (SP4). The resolver constructs no write path and exposes no
  repo write methods.
- **BL-2 Soft-delete aware (inherits BR-15).** Every query excludes `deleted_at IS NOT NULL`. A removed
  link disappears from all reads; a revived link (in-place `deleted_at → null`, permitted by the business
  UNIQUE key) reappears. `findWhere` does NOT filter soft-deletes itself — the resolver appends the predicate.
- **BL-3 No registry gate on reads.** An unregistered/unknown `entity_type` yields `[]`, never throws. The
  BR-2 fail-loud `TaggableTypeRegistry` check is a write-path guard (AR-6), not a read concern.
- **BL-4 Composite identity.** Backlinks match on BOTH `entity_type` AND `entity_id`; a link to `(task, T1)`
  never surfaces for `(task, T2)` or `(note, T1)`.
- **BL-5 Single live link per business key.** `UNIQUE(page_id, entity_type, entity_id)` guarantees ≤1 live
  row, so `resolveLink` returns exactly one or null.
- **BL-6 Encryption pass-through until M3.** `context` is `[E]`-classified but runs empty-`[E]` pass-through
  at M1.0 (BR-13); the read path decrypts correctly once `[E]` activates because the repo config matches AR-6's.
