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
