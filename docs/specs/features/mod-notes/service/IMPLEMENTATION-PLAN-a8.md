<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A8. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a8-cascade-cleanup.md (§2 rules, §4 acceptance). A8 = the DOCUMENTED IR-13 app-layer cascade
     (per-entity, page-last, fail-loud, re-drivable) — NOT transactional, NO *InTx surface. -->

# IMPLEMENTATION-PLAN — A8 page-delete cascade cleanup (IR-13)

**Home:** `services/notes/service.ts` (`softDeletePage` body) + tests (all `@vida/core`). No new file, no new import,
no signature change. **Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified surface (confirmed on disk — everything the cascade needs is already in `service.ts`)
- **Target:** `softDeletePage(id)` at `service.ts:109-111` — currently `await pageRepo.delete(id)` only. Body grows; the
  `NotesService.softDeletePage(id): Promise<void>` signature is UNCHANGED (`types.ts`).
- **Closures (already defined):** `live` (pages), `livePageLinks`, `liveEntityTags`, `liveAttachments`
  `[FACT: service.ts:68-76]` — each `findWhere(and(pred, isNull(<table>.deleted_at))!)`.
- **Repos (already constructed):** `pageRepo`, `pageLinkRepo`, `entityTagRepo`, `noteAttachmentRepo`
  `[FACT: service.ts:58-67]`. All `softDelete: true` → `.delete(id)` soft-deletes + enqueues `operation:'update'`.
- **Deps (already wired, A5):** `deps.backlinks.getLinksFrom(id)` (AR-8, entity_links `page_id=id`, live-filtered)
  `[FACT: backlink-resolver.ts:56-60]`; `deps.spaces.removeLink(pageId, entityType, entityId)` +
  `deps.spaces.untagEntity(tagId, entityType, entityId)` (AR-6, idempotent guarded no-op when already gone)
  `[FACT: foundation/spaces/service.ts:145-155,182-192]`.
- **Imports (already present):** `eq`, `and`, `isNull`, `type SQL` from drizzle (`service.ts:16`); `pages`, `pageLinks`,
  `noteAttachments` from schema (`service.ts:19-26`); `entityTags` from spaces schema (`service.ts:27`). **A8 adds NO import.**
- **Row shapes:** `PageLinkRow.id`/`.source_page_id`/`.target_page_id`; `EntityLinkRow.entity_type`/`.entity_id`;
  `EntityTagRow.tag_id`/`.entity_type`/`.entity_id`; `NoteAttachmentRow.id`. All confirmed via A1-A6 usage.

## Re-drive-doesn't-throw check (empirical, the crux)
A soft-deleted row **physically remains** (soft delete = `update` setting `deleted_at`, `repository.ts:457-461`), so a
re-driven `pageRepo.delete`/`pageLinkRepo.delete`/`noteAttachmentRepo.delete` re-runs `update` on a PRESENT row → re-stamps
`deleted_at`, never the `Row not found` throw (`repository.ts:409-413`). AR-6 `removeLink`/`untagEntity`
`.find(r=>r.deleted_at==null)`→`undefined`→`if(live)` guarded no-op. The `live*` enumerations + `getLinksFrom` filter
`isNull(deleted_at)` → a re-drive enumerates only remaining rows. ⇒ a 2nd `softDeletePage` does not throw. (Confirmed at g1.)

## Build step 1 — `services/notes/service.ts` (replace the `softDeletePage` body)
Replace `service.ts:109-111` with the IR-13 cascade (satellites first, page LAST, fail-loud, no try/catch):
```ts
async softDeletePage(id) {
  // IR-1/IR-13: service-driven per-entity cascade. Satellites first, page LAST, FAIL-LOUD (no swallow) → a mid-
  // cascade failure leaves a LIVE, re-drivable page. Eventually consistent (per-entity LWW blobs, ADR-003). NOT
  // transactional — cross-entity atomicity is not the platform model (no-FK; IR-13). No *InTx.
  // 1. page_links — both FK sides (page↔page), de-duped by id (a self-link P→P appears in both)
  const [outLinks, inLinks] = await Promise.all([
    livePageLinks(eq(pageLinks.source_page_id, id)),
    livePageLinks(eq(pageLinks.target_page_id, id)),
  ])
  const linkIds = new Set([...outLinks, ...inLinks].map((l) => l.id))
  for (const linkId of linkIds) await pageLinkRepo.delete(linkId)
  // 2. entity_links — the page's OUTGOING links (page_id side, As-is FK) → AR-6 removeLink (delegate)
  for (const el of await deps.backlinks.getLinksFrom(id)) {
    await deps.spaces.removeLink(id, el.entity_type, el.entity_id)
  }
  // 3. entity_tags — rows referencing P by entity_id (NP-9 ADR-006) → AR-6 untagEntity (delegate)
  for (const et of await liveEntityTags(eq(entityTags.entity_id, id))) {
    await deps.spaces.untagEntity(et.tag_id, et.entity_type, et.entity_id)
  }
  // 4. note_attachments (page_id = P)
  for (const a of await liveAttachments(eq(noteAttachments.page_id, id))) {
    await noteAttachmentRepo.delete(a.id)
  }
  // 5. the page itself — LAST (a partial failure above left a live, re-drivable page)
  await pageRepo.delete(id)
},
```
Notes: `for…of await` (sequential) — SQLite serializes; sequential keeps the fail-loud propagation simple. `Set<string>`
of `id` for the page_links de-dup. No `.filter`/dedup needed for entity_links/tags/attachments (each id is distinct).

## Build step 2 — `services/notes/__tests__/notes-service.test.ts` (append)
`describe('A8 — cascade cleanup')`, reuse `setup()` (destructure `{ svc, spaces }`). ⚠ Seed with a REGISTERED
`entity_type` (`'note'`) — `tagEntity`/`createEntityLink` run `assertRegistered` (throws at seed on an unregistered type).
Read-facades used for assertions all exist (A1/A5/A6): `getPage`, `getPageLinksFrom`, `getPageLinksTo`,
`getEntityLinksFrom`, `getTagsForEntity`, `getAttachments`. Cases (§4):
1. **full cascade (live-DB smoke, N1):** `P=createPage({type:'note',title:'P'})`, `Q=createPage({type:'note',title:'Q'})`.
   Seed: `createPageLink(P.id,Q.id)` + `createPageLink(Q.id,P.id)`; `createEntityLink(P.id,'note','ent-x')`; a tag
   `t=spaces.createTag(...)` then `svc.tagEntity(t.id,'note',P.id)`; `addAttachment(P.id,{filename:'a',mime_type:'x',
   encrypted_blob:new Uint8Array([1]),size_bytes:1})`. `await softDeletePage(P.id)` → assert ALL empty/null:
   `getPage(P.id)` null · `getPageLinksFrom(P.id)` [] · `getPageLinksTo(P.id)` [] · `getEntityLinksFrom(P.id)` [] ·
   `getTagsForEntity('note',P.id)` [] · `getAttachments(P.id)` [].
2. **both directions cleaned:** covered by the P→Q + Q→P seed above (getPageLinksFrom AND getPageLinksTo both empty).
   (Optionally add an explicit R→P via a 2nd page R to make the "into P" direction unmistakable.)
3. **self-link de-dup:** `createPageLink(P.id,P.id)` then `softDeletePage(P.id)` does NOT throw; `getPageLinksFrom(P.id)` [].
4. **backlinks INTO P survive (target side does NOT cascade):** `X=createPage({type:'note'})`;
   `createEntityLink(X.id,'note',P.id)` (X links to P as an entity). After `softDeletePage(P.id)`,
   `getEntityLinksFrom(X.id)` still length 1 (X's outgoing link is untouched — only P's OWN outgoing cascade).
5. **idempotent re-drive:** `await softDeletePage(P.id)` a SECOND time → `await expect(...).resolves.toBeUndefined()`
   (no throw).
6. **fail-loud partial-failure (BR-A8-5, the live-DB partial-failure smoke):** seed a tag + attachment on P; reassign
   `spaces.untagEntity = () => Promise.reject(new Error('boom'))` (the notes service captured this same `spaces` object
   as `deps.spaces`, so the running cascade faults). `await expect(softDeletePage(P.id)).rejects.toThrow('boom')`;
   `getPage(P.id)` still non-null (page deleted LAST → survives); `getAttachments(P.id)` still length 1 (fail-loud
   halted the downstream steps). Restore `spaces.untagEntity = realUntag`; re-drive `softDeletePage(P.id)` resolves;
   `getPage(P.id)` null · `getTagsForEntity('note',P.id)` [] · `getAttachments(P.id)` []. (Case 1 also asserts the
   pre-state — each satellite length 1 before delete — so the emptiness assertions are non-vacuous.)
7. **unrelated rows untouched:** a sibling page S with its own page_link/entity_link/tag/attachment is fully intact
   after `softDeletePage(P.id)` (its reads still non-empty).

## Build step 3 — currency
Do NOT touch `current-*` (§XXIX runs at the A-track close — A8 is the last slice). Do NOT add any transaction/`*InTx`.

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1-A7's 51 stay green → ~57) · root `pnpm typecheck` 0 · `eslint` 0. All within
`@vida/core`. Then A8's ░Verification Gate░ (post-impl critique). **Run test ALONE**, not concurrent with typecheck.

## Deviation note
Any change to the landed `softDeletePage` semantics → §XXVIII. Record any divergence in Route History.
