<!-- Last updated: 2026-06-07 by /init -->
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
