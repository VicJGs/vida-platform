# IMPLEMENTATION-PLAN: mod-notes-and-pages — S4 Delegation facade + registry

Gate: §XXVI gate-2. Spec: `PLAN-s4-delegation-facade-registry.md` (Approval 1 ✅, incl. D-S4-2). Preflight PASSED.
Final slice. Delegates to AR-6 `SpacesService` (writes) + AR-8 `BacklinkResolver` (reads); read-only entity_tags repo. No `this.`.

## Build order
- [ ] **B1 — `types.ts`.** Append the 6 S4 method sigs to `NotesService`; import `EntityLinkRow`, `EntityTagRow` from `../../db/schema/foundation/spaces`.
- [ ] **B2 — `service.ts` imports + repo.** Import `entityTags` + `type EntityLinkRow, type EntityTagRow` from `../../db/schema/foundation/spaces`; add `spaces` + `backlinks` to the destructure (`const { db, deviceId, registry, spaces, backlinks } = deps`); `const entityTagRepo = createRepository(db, entityTags, { deviceId, encryptedFields: [], softDelete: true })` (D-S4-1).
- [ ] **B3 — entity-link facade (BR-S4-1/2).** `createEntityLink: async (pageId, entityType, entityId, context?) => { assertRegistered(entityType); return spaces.createLink(pageId, entityType, entityId, context ?? null) }`. `removeEntityLink: async (pageId, entityType, entityId) => { await spaces.removeLink(pageId, entityType, entityId) }`.
- [ ] **B4 — entity-link reads (BR-S4-3/4).** `getEntityLinksFrom: async (pageId) => backlinks.getLinksFrom(pageId)`. `getBacklinks: async (entityType, entityId) => ({ entityLinks: await backlinks.getBacklinksTo(entityType, entityId), pageLinks: await service.getPageLinksTo(entityId) })` (D-S4-2 unconditional).
- [ ] **B5 — entity_tags reads (BR-S4-5).** `getTagsForEntity: async (entityType, entityId) => entityTagRepo.findWhere(allOf(eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId), isNull(entityTags.deleted_at)))`. `getEntitiesByTag: async (tagId) => entityTagRepo.findWhere(allOf(eq(entityTags.tag_id, tagId), isNull(entityTags.deleted_at)))`.
- [ ] **B6 — barrel.** No new exported types needed (EntityLinkRow/EntityTagRow are spaces-owned; NotesService references them transitively). Leave `index.ts` as-is unless tsc requires a type re-export.
- [ ] **B7 — tests (`notes-service.test.ts` append).** Extend the harness to return `spaces`. Live-store: register 'task'; createEntityLink(page, 'task', 't1') → row; unregistered type → UnregisteredEntityTypeError; the link shows in getEntityLinksFrom(page) + getBacklinks('task','t1').entityLinks; getBacklinks for a page target (createPageLink A→B then getBacklinks(<page-type>, B.id)) → pageLinks has the A→B link; seed a tag via spaces.createTag + spaces.tagEntity('task','t1') then getTagsForEntity('task','t1') + getEntitiesByTag(tagId) read it; removeEntityLink drops it from getBacklinks.
- [ ] **B8 — gates.** typecheck 0 · `@vida/core` green (≥990 + new) · eslint 0 · Verification Gate · post-impl `/critique` · §XXIX refresh current-* (S4 rows; mark ① COMPLETE) → commit.

## On divergence
Any wrong/missing step → STOP → §XXVIII. `getBacklinks` uses `service.getPageLinksTo` (S3, via the `service` const — no `this.`).
