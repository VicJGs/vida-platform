<!-- current-business-rules — features/notes-and-pages · the ENFORCED rules in the built slice (durable, §XXIX).
     business-rules.md is the INTENDED authority; THIS records what the shipped code actually enforces, cited to
     file. Born: MOD-notes ① (2026-08-21). Refreshed: MOD-notes rebuild Track A close (A1-A8, 2026-08-25). -->

# Current Business Rules — Notes & Pages (built slice, MOD-notes ① · A1–A8)

The rules the shipped `@vida/core` Notes & Pages service enforces in code. Inherits the CORE constitution
(ZK-1/2/3, LF-1/2/3). Cited to `packages/core/src/services/notes/`.

## Enforced now (① · A1–A8)
- **NP-2 — One journal per date.** `createPage({type:'journal', journal_date})` checks for a live clash first; a
  duplicate throws `JournalExistsError`. Journal identity is immutable — `updatePage` (`.strict()`) omits
  `type`/`journal_date` (IR-9). `[FACT: service.ts createPage/updatePage]`
- **NP-5 / IR-11 — Page-links unique + idempotent revive-or-noop.** `createPageLink` on the `(source,target)` FULL
  UNIQUE key: live → no-op; soft-deleted → revive (`update {deleted_at:null}`, context re-supplied); absent → create.
  Mirrors AR-6 `createLink`. `[FACT: service.ts createPageLink]`
- **NP-6 / SP2 / IR-2 — Registered entity_type only (runtime registry, not the closed enum).** `createEntityLink`/
  `tagEntity` pre-validate `entity_type` against the injected `TaggableTypeRegistry` (NOT `EntityLinkTargetSchema`);
  unregistered → `UnregisteredEntityTypeError`. No redundant guard on the `pages` insert (N3). `[FACT: service.ts assertRegistered]`
- **NP-7 / IR-4 — Wiki-links resolve by id; never create.** `resolveWikiLink(text)` returns title-substring candidates
  (case-insensitive, empty→all live, live-only); the caller binds a `target_page_id` via `createPageLink`. Create-on-
  miss is an explicit caller compose. `[FACT: service.ts resolveWikiLink]`
- **NP-8 / IR-5 — Entity notes auto-exist, deterministic, client-side.** `ensureEntityNote` is idempotent (returns the
  existing `*_note` of that type); the seed `content` is a pure function of the passed parent fields (stable key order,
  no `Date.now`/random); the row's id/timestamps are repository-generated. `[FACT: service.ts ensureEntityNote + buildSeedContent]`
- **NP-9 / IR-6 — Soft delete + verbatim-read discipline.** `softDeletePage`/`removePageLink`/`removeAttachment`/
  `removeEntityLink`/`untagEntity` set `deleted_at` (softDelete repos → enqueue `operation:'update'`). Every read
  appends `isNull(deleted_at)` (findWhere runs predicates verbatim). `[FACT: service.ts; repository.ts]`
- **IR-8 — `summary_config` is service-stringified plain text.** `getSummaryConfig`/`setSummaryConfig` JSON-parse/
  stringify the `pages.summary_config` text column themselves (it is `text()`, not `json<T>()`); a corrupt persisted
  value **fails loud** (natural `SyntaxError`/`ZodError`) — `null` is reserved for the legitimately-unset case.
  `[FACT: service.ts getSummaryConfig/setSummaryConfig]`
- **A6 — Attachment 25 MB per-attachment limit, fail-loud.** `addAttachment` rejects `AttachmentTooLargeError` when
  `size_bytes > MAX_ATTACHMENT_BYTES` (ADR-003:185), at the creation entry point (local-first). `[FACT: service.ts addAttachment]`
- **IR-1 / IR-13 — Page-delete cascade is service-driven + eventually-consistent (A8).** `softDeletePage` soft-deletes
  the satellites (`page_links` both FK sides, deduped · outgoing `entity_links` via AR-6 `removeLink` · `entity_tags`
  by `entity_id` via AR-6 `untagEntity` · `note_attachments`) then the page **LAST**. Per-entity, **NOT transactional**
  (no-FK; the atomicity unit is one-entity + enqueue; each row syncs as its own LWW blob). **Fail-loud** (no swallow):
  a satellite failure propagates, leaving the page live + **re-drivable** (idempotent). Backlinks *into* P (the
  entity_link target side) are left — they are other pages' links. `[FACT: service.ts softDeletePage]`
- **Async-rejection contract.** Validating methods (`createPage`/`updatePage`/`createEntityLink`/`tagEntity`/
  `setSummaryConfig`) are `async` so a Zod/registry failure is a Promise rejection, never a sync throw. `[FACT: service.ts]`
- **Delegation (ADR-018 §3.3).** entity-link/tag WRITES → AR-6 `SpacesService`; entity-link READS → AR-8
  `BacklinkResolver`. Notes composes, never re-implements. `[FACT: service.ts facade methods]`
- **`getBacklinks` = ①-merge (A5).** Returns `{ entityLinks (AR-8 getBacklinksTo), pageLinks (A2 getPageLinksTo) }`,
  kept typed-distinct — supersedes the old-①'s entity-links-only. `[FACT: service.ts getBacklinks]`

## Not enforced here (homed elsewhere — do not add to ①)
- Field-level `[E]` encryption (M1.0 pass-through) → M3/DB-5. `/summary` aggregation ENGINE + the `buildJournalSummary`
  block surface → MOD-journals ① / ② B7. FTS5 → DB-8. Cross-entity transactional atomicity / `*InTx` → not the
  platform model (IR-13). Saved-view selection → MOD-spaces/ADR-007.

## Status
2026-08-25 — **MOD-notes ① COMPLETE** (Track A, A1–A8). **57 tests green** (`@vida/core` 844/844). See
`current-spec.md` + `docs/specs/features/mod-notes/service/`. Next: MOD-notes ② (Track B).
