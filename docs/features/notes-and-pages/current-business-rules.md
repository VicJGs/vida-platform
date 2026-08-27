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

## Enforced now (② · B6 tag surface — §XXVIII touches on the frozen ① seam, A5-category)
- **`listPages({tag})` — server-side tag filter (was throwing, now implemented).** The A1 fail-loud placeholder is
  replaced: read the tagged page-ids from `entity_tags` (`entity_type='page'`, `isNull(deleted_at)`) then
  `inArray(pages.id, ids)`, AND-composed with favorite/archived; an empty id-set → `[]`. No client-side re-filter
  (BR-B6-1). `[FACT: service.ts listPages]`
- **`listTags()` / `createTag(name)` — Notes owns net-new tag reads + a create facade → AR-6.** `listTags` returns live
  tag definitions (NP-9 discipline); `createTag` trims + **rejects a blank name** (AR-6's `createTag` validates nothing)
  then delegates. The nestable color/icon tags-browser is MOD-spaces ② (delivery-plan:232). `[FACT: service.ts listTags/createTag]`
- **② tag/filter UI rules (homed in `current-spec.md`):** the filter maps 1:1 to `listPages` params, default `{}` (no
  invented default-hide, BR-B6-2); create-with-tags creates THEN tags, per-tag fail-loud, note survives a partial
  failure (BR-B6-4); the tag picker is search + create-on-miss (BR-B6-5); tag writes invalidate `['tags']` +
  `NOTES_LIST_KEY`, never `noteKey` (no editor re-seed, BR-B6-7); the create-dialog TagPicker is **inline** (a portalled
  Popover dismisses the modal Dialog — Visual-Gate catch).

## Enforced now (② · B7 — the `/summary` block + Home entry seam; NO ① change)
- **The `/summary` block degrades per-row against the inert engine — never blanks (EC-5 · G5).** `buildJournalSummary(date,
  sections)` is a ② `apps/web` surface (NOT an ① method — `contract.md:20`); it consumes MOD-journals' engine, which is
  0 lines / fenced to #33, and `mod-journals` blocks-on `mod-notes` — so every enabled row degrades to `state:'empty'`
  with "available when Journals ships" (`'error'` is reserved for a #33-era provider that threw — `business-rules.md:30`
  "empty is NOT an error"). The block never blanks (structural: one card per enabled row; `sections=[]` → an explicit
  non-blank surface). B7 authors ZERO `@vida/core` journal code. `[FACT: BR-B7-2/3; build-journal-summary.ts]`
- **Rows come from the block `sections` attr (CB2); `getSummaryConfig` is the persisted default (5-flag→5-row map).**
  When `sections` is empty, fall back to A7's `summary_config` mapped `showHabits→habits · showTasks→tasks ·
  showStudySessions→study · showTransactions→transactions · showInteractions→interactions` (`routines` has no flag — the
  **G5 delta → M1.4**, not resolved here). `[FACT: BR-B7-4; business-rules.md:43; editor.ts:56-63; note.ts:83-89]`
- **The journal `entry` mount seam is a typed resolver, not a screen (Home render = Phase-1b).** `resolveTodayJournalPageId`
  resolves-or-creates today's journal page (NP-2 idempotent, resolve-first). `[FACT: BR-B7-5; journal-entry-seam.ts]`
- **Reuse the `TerminalState` canon by TYPE only.** B7 uses its own `SummaryRow` (row-granular) — NOT `home/`'s
  `SectionData`/`resolveDashboardStates`/`journalStillRenders` (those are `HomeSectionKey`-typed, the 3 Home lanes).
  `[FACT: BR-B7-6; home/journal-contribution.ts:22-26]`

## Status
2026-08-26 — **MOD-notes ① COMPLETE** (Track A, A1–A8) + **② Track B COMPLETE (B1–B7)** (collection · detail · `[[` picker ·
link panels · Neural edges · tags/filters/metadata · **B7 `/summary` block + entry seam**). `@vida/core` **846** ·
`@vida/editor` **252** · `@vida/web` **269**. **⇒ ENTITY CLOSE: MOD-notes (LIF-131), the in-degree-14 hub, is COMPLETE.**
Next M1.1: **MOD-journals #33** fills the `buildDashboard` engine B7's `buildJournalSummary` seam consumes.
