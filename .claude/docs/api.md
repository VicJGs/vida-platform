<!-- Last updated: 2026-09-27 by /session-end -->
| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| *(add rows as endpoints are built)* | | | | | |

## @vida/core service surfaces (local-first — not HTTP)

### `services/preferences` — `createPreferencesService({ db, deviceId })` (mod-preferences #37, LIF-133)
Config provider over the DB-4 #2 schema; plaintext (`encryptedFields: []`).
| Method | Purpose | Returns |
|--------|---------|---------|
| `getMergedPreferences()` | user config, row overlaid on DEFAULTS (never `undefined`, no persist) | `MergedPreferences` |
| `updatePreferences(patch)` | validated partial merge; create-on-first-write singleton | `MergedPreferences` |
| `getModuleVisibility()` / `setModuleVisibility(key, visible)` | nav module show/hide map (PR-7) | `Record<string,boolean>` / `void` |
| `getNavPreferences()` / `updateNavPreferences(patch)` | dock + mobile-nav config singleton | `MergedNavPreferences` |
| `recordCommand(key, label, category?)` | Cmd+K upsert-by-key (PR-6) | `void` |
| `pinCommand(key, pinned)` | set pin; no-op on unrecorded key | `void` |
| `getCommandHistory()` | pinned-then-frecency list | `CommandBarHistoryRow[]` |

## @vida/core — NotesService (mod-notes-and-pages ①, LIF-131)
`createNotesService({db, deviceId, spaces, backlinks, registry}): NotesService` — the Notes & Pages hub service (factory-object, no `this.`). Surface: pages CRUD (`createPage`/`getPage`/`updatePage`/`softDeletePage`/`getPageByJournalDate`/`getPagesByType`/`getPagesForEntity`/`listPages`) · `ensureEntityNote` + attachments (`addAttachment`/`getAttachments`/`removeAttachment`) · page-links (`createPageLink` idempotent+revive/`removePageLink`/`getPageLinksFrom`/`getPageLinksTo`/`resolveWikiLink`) · entity-link facade (`createEntityLink`/`removeEntityLink`→AR-6, `getEntityLinksFrom`/`getBacklinks`→AR-8) · entity-tag reads (`getTagsForEntity`/`getEntitiesByTag`). Errors: `JournalExistsError`, `UnregisteredEntityTypeError`. Spec: `docs/specs/features/mod-notes-and-pages/`; currency: `docs/modules/notes/current-*`.

## @vida/core — KnowledgeService (mod-knowledge ①, LIF-128) — S1–S4/8
`createKnowledgeService({ db, deviceId, spaces, backlinks, review }): KnowledgeService` — factory-object, no `this.`; composes `SpacesService` (link/tag writes) + `BacklinkResolver` (link reads) + the `foundation/review` engine (`review`, D1). Persistence: DB-6 repos, `encryptedFields:[]` (M1.0), `softDelete:true` on objects/kinds/containers/references.
| Group | Methods |
|-------|---------|
| S1 kinds | `seedDefaultKinds` · `createKind` · `listKinds` |
| S1 objects | `createObject` · `updateObject` · `getObject` · `listObjects` · `deleteObject` (cycle-safe `parent_object_id`; `mastery_level` derived, unsettable) |
| S2 containers | `createContainer` · `listContainers` · `deleteContainer` (Module⊃Area⊃Subject; membership via entity_tags, KN-7) |
| S2 references | `addReference` · `listReferences` · `removeReference` (first-class, replaces resource_urls) |
| S2 links | `linkObject` · `unlinkObject` · `listLinks` (entity_links via spaces/backlinks; never resource_type) |
| S2 tags | `tagMembership` · `untagMembership` · `listMemberships` (scoped entity_tags) |
| S3 methods | `listMethods` · `registerMethod` (capability `kind='study_method'` partition) |
| S3 curves | `listCurves` · `defineCurve` · `removeCurve` (review_curves; SM-2 preset seed = later) |
| S3 bindings | `bindMethod` · `listBindings` · `unbindMethod` (method_bindings, no-FK) · `resolveDefaultMethod(kindId)` (2-tier) |
| S4 review ② | `recordReview` (append-only review_events, no mastery write) · `getDue`/`dueIn` (due-queue) · `deriveMastery` (0–100 or null, derive-on-read via measurement.normalize) · `rollupMastery` (up parent_object_id via measurement.rollup) |
Errors: `ObjectKindNotFoundError` · `InvalidParentRefError` · `HierarchyCycleError` · `KnowledgeObjectNotFoundError` · `KnowledgeContainerNotFoundError` · `ReferenceNotFoundError` · (engine) `ReviewCurveNotFoundError` · `MethodBindingNotFoundError` · (delegated) `UnknownEntityType` · `TagNotFound` · `DuplicateCapabilityId`. Engine home: `foundation/review` (`createReviewEngine(db, deviceId, {capability})`). Spec/currency: `docs/modules/knowledge/current-{spec,business-rules}.md`. Not yet built: S5–S8.
