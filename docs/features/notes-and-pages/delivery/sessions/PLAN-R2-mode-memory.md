# PLAN — notes-rescope R2 · Mode memory (SHARED)

> Entity Delivery Flow recovery variant · Step 6 · per-slice §XXVI **gate 1** (rev 4, 2026-10-27; critique r1 REVISE
> folded in, r2 SHIP, rev 4 = Victor's correction, see §6). Slice-map R2 (`slice-map.md:55-61`, approved 2026-10-26). Ledger rows: A-42 · A-43 · B-21 · B-22
> (B-20 ✅ stays). Yardsticks: `interpretation.md` §5 #3 (resolved at the Interpretation Gate) · fe-notes `envision.md`
> EC-5 · EC-4 · EC-19.
> Grounding resolved IN this PLAN (no calls for Victor): `[FACT: path:line]` · `[INTERP — grounded: …]` · `[UNKNOWN]`.
> Branch `notes-rescope` @ `bb8e42b`. **1a:** `docs/modules/notes/current-*` are current (R1's currency step,
> `6e54402`/`1e8105b`; no code change since). Core's db layer has no `current-*` docs, so there is nothing else to refresh.

## 1. Identity

- **What:** the merged ⇄ tabbed choice on a page is **remembered per page, across reloads**, on this device. A page that
  was never toggled opens in its **type's default**.
- **Why:** EC-5 "the choice is a per-type default, remembered per instance" (MUST, live memory) `[FACT: fe-notes
  envision.md:32]`. Today it lives in a module-level `Map`, so a reload loses it (B-21), and one global default serves
  every type (B-22) `[FACT: note-entity.tsx (createInMemoryEntityModeStore('tabbed')); entity/adapter.ts:101-122]`.
- **Envision:** EC-5 (memory = live-only), EC-4 (the note page leads with the editor; unchanged), EC-19 (merged =
  continuous; unchanged).

## 2. Grounded scope — verdicts

| # | Item | Verdict | Grounding |
|---|------|---------|-----------|
| G1 | **Storage** | `app_state` (device-local KV, not synced), key `entity_mode:<entityType>:<entityId>`, value `'merged' \| 'tabbed'`. No new schema. Not a Preferences field (Preferences are singletons) | decided at the Interpretation Gate `[FACT: interpretation.md:174]`; `app_state` `[FACT: ADR-002-data-model.md:1262-1268; db/schema/foundation/app-state.ts:18-21]`; PR-3 `[FACT: preferences/business-rules.md:11]` |
| G2 | **Core KV accessor (A-42)** | `@vida/core` `db/app-state.ts`, in the `getSchemaVersion` idiom (a `SqliteDriver` argument; the type is exported from the barrel; apps/web's `client.driver` is a `SqliteDriver`):<br>• `readAppState(driver, key): Promise<string \| null>`<br>• `readAppStatePrefix(driver, prefix): Promise<Array<{key, value}>>`, as `substr(key, 1, length(?)) = ?` with the prefix bound **twice** (`[prefix, prefix]`; 1-based, character length). **Not LIKE**: `_` is itself a LIKE wildcard, SQLite has no default escape, and LIKE is ASCII case-insensitive<br>• `writeAppState(driver, key, value)` (`INSERT OR REPLACE`)<br>• `deleteAppState(driver, key)`<br>• the key builder `entityModeKey(entityType, entityId)` + `ENTITY_MODE_PREFIX = 'entity_mode:'`<br>All exported beside `getSchemaVersion`. `readAppState`/`deleteAppState` have no R2 consumer; they complete the A-42 accessor. The ad-hoc callers (`first-run-repo.ts`, the composition-root device id) keep their SQL, since migrating them is not R2's scope | A-42 `[FACT: reconciliation.md:73]`; idiom `[FACT: db/adapter.ts:210-232; core/src/index.ts:63-68]`; `client.driver: SqliteDriver` `[FACT: apps/web/src/db/client.ts:176]`; ad-hoc SQL `[FACT: first-run-repo.ts:11-27; composition-root.ts:64-73]` |
| G3 | **The store (A-43): preloaded, so the interface stays sync** | A-43 allows "async/preloaded" `[FACT: reconciliation.md:74]`. **Preloaded** keeps the `EntityModeStore` convention (`readMode` sync) and the seam-contract shape `[FACT: fe-codec-entity-facet seam-contract.md:86-88]`. **One source of truth:** `useEntityModes()` = a React Query read of every `entity_mode:` row, as a `Record<fullKey, value>` (key = the full stored key, so no parsing is needed). `createAppStateEntityModeStore(rows, persist)` is derived with `useMemo`: `readMode(t,id)` = `rows[entityModeKey(t,id)]` if valid, else the per-type default; `persistMode` = `setQueryData((old) => ({ ...(old ?? {}), [key]: mode }))` (the cache IS the map; `old` is `undefined` after a failed read) + the write. The `useMemo` depends on the query data and the stable query client only, never a fresh closure. Query: `['app_state','entity_mode']`, `staleTime: Infinity`, **`retry: false`, `retryOnMount: false`** (a local read; a failure must not re-fetch on every mount, per memory react-query-retryonmount-loop). The `queryFn` first `await ensureDbReady()` (readiness parity with the composition root `[FACT: composition-root.ts:119]`), then `readAppStatePrefix`. `createInMemoryEntityModeStore` stays as the reference implementation (its tests stay) | slice R2 `[FACT: slice-map.md:56-57]` |
| G4 | **Seeded per-type default while loading (the slice line, as written)** | The page does **not** wait for the mode read: `NoteEntity`'s ladder is unchanged (page read only). While `useEntityModes()` is loading, the store has no rows, so `readMode` returns the **per-type default** (seeded); when the rows arrive, the store re-derives and the page switches to the remembered mode. `NoteEntityView`'s mode = `override ?? store.readMode(type, id)`: `override` is set only by a user toggle, so a toggle made while the read is still loading **wins** over the arriving row (and is persisted). On a miss or a failed read the default simply stays | slice R2 "async read, seeded per-type default while loading" `[FACT: slice-map.md:56-57]` — delivered verbatim |
| G5 | **A failed read keeps the default** | The page never waits on this read (G4). With `retry: false` it errors after one read and the page keeps the per-type default (`console.error`, no toast; losing a layout preference isn't worth one). With `retryOnMount: false` and **one observer** (`NoteEntity`, which passes the store down as a prop), navigating between notes doesn't re-read an errored query. Pinned: an error → the page renders after exactly one read; navigating keeps the read count flat | memory react-query-retryonmount-loop; app default `retry: 1` `[FACT: lib/query-client.ts]` |
| G6 | **Per-type defaults (B-22)** | `notes/mode-defaults.ts`: `registerModeDefault(type, mode)` + `defaultModeFor(type)`, the RIDE shape of `registerOverview`. Notes registers `note` = `tabbed`. The fallback is `tabbed`. `journal` isn't a Notes mode: it's Home's arrangement (journals-rescope); a journal opened at `/notes/$id` gets the fallback. `*_note` types are registered by their RIDE owners. `defaultFacet` stays `'editor'` for every type (EC-4). The page gate opens for every page type (R1), so the toggle always applies on `/notes/$id` | slice R2 bullet 2 `[FACT: slice-map.md:58-59]`; Q1 closed by EC-4 `[FACT: interpretation.md:174]`; precedent `[FACT: notes/overview-registry.ts]` |
| G7 | **Persist + failure** | A toggle persists **in its event handler** (as today, `note-entity.tsx` `onModeChange`), never inside a `setState` updater, so StrictMode can't double-write. `setQueryData` runs synchronously, then the write. A write failure → `notifyError('remember this page’s layout', e)` (BR-R1-7), and the chosen mode stays for the session (the cache holds it) | BR-R1-7 `[FACT: current-business-rules.md (R1 section)]` |
| G8 | **Validation** | A stored value other than `'merged'`/`'tabbed'` → the per-type default; it is never written back. No key parsing: the store looks up by the full key | `[INTERP — grounded: a corrupt or legacy row must not break the page]` |
| G9 | **`?sample`** | The DEV sample uses the in-memory reference store: no `app_state` read or write (the query is disabled) | `?sample` precedent `[FACT: use-note-entity.ts devSampleActive]` |
| G10 | **Orphan rows + ownership** | The key space belongs to the shared entity-adapter convention: **each entity's hard-delete owner removes its own keys.** A soft-deleted page keeps its row, so restore brings the layout back. **R5 forward obligation:** `deletePageForever` / `emptyTrash` delete `entityModeKey(type, id)` **inside their transaction, through the Drizzle `appState` mirror** (`db/schema/foundation/app-state.ts:18`). A driver-level call can't join that transaction. The NP-9 hard-delete cleanup list gets the `app_state` mode row | NP-9 `[FACT: business-rules.md:33-40]` |
| G11 | **Staleness (stated)** | With an observer mounted and `staleTime: Infinity` it never refetches; once unobserved it is garbage-collected after `gcTime` (5 min) and re-read on the next mount (same rows, harmless). Two tabs on the same device: the other tab stays stale until reload, and the last write wins. After an R5 purge, a leftover cache entry for a gone page is harmless | `lib/query-client.ts` (gcTime 5 min) |
| G12 | **ADR-006 amendment** | The repo convention: an `**Amended:** 2026-10-27 (notes-rescope R2) — …` header line (as `ADR-001:7-9`, `ADR-004:10`) + a §3 Decision subsection. In ADR-006's bold-paragraph style that's **`**3.6 Per-instance facet-mode memory (Amendment · 2026-10-27 · notes-rescope R2).**`**, after 3.5 and before the "What this decision does NOT do" paragraph. Content: the storage (`app_state`, device-local per ADR-002 §5.0), the key, the per-type default + RIDE registration, the seeded-default load, hard-delete ownership, and the M4 note (cross-device memory needs a synced store) | owed `[FACT: interpretation.md:174,200; structure-data.md:62]`; convention `[FACT: ADR-001:7-9; ADR-004:10; ADR-012 §3.11]`; ADR-006 §3 numbering `[FACT: ADR-006-spaces-foundation-universal-tags.md:59-124]` |
| G13 | **Stale headers (IR-R16)** | Rewrite: `adapter.ts` header + the mode-store comments (O4 "design-pass-open") · `entity/CLAUDE.md` `EntityModeStore` bullet · `note-entity.tsx` (header "until R2" + the `modeStore` comment) · `seam-contract.md:86` "storage design-pass-open" (→ resolved: `app_state`, R2) | A-43 "stale header" `[FACT: reconciliation.md:74]` |
| G14 | **Not in R2** | The Home Journal-first/Dashboard-first arrangement (preferences-rescope/journals-rescope); `*_note`/journal defaults (their owners); active-facet memory beyond `defaultFacet:'editor'` | slice-map R2; interpretation §5 #3 |

## 3. Business rules (BR-R2-*)

- **BR-R2-1 · Remembered per page, per device.** A toggle persists `entity_mode:<type>:<id>`; a reload on the same device
  opens the page in that mode. Cross-device memory is M4. Same-device multi-tab: last write wins, and another tab sees it
  after reload.
- **BR-R2-2 · An unremembered page opens in its type's default.** `note` = tabbed; others = their owner's registration,
  else tabbed. The Note (editor) tab still leads (EC-4).
- **BR-R2-3 · Seeded default while loading.** The page renders immediately in its type's default; the remembered mode
  applies when the read returns, unless the user toggled meanwhile (the toggle wins).
- **BR-R2-4 · A failed read keeps the default:** one read (no retry, no re-read on remount); the page never waits on it.
  **A failed write fails loud** (one toast), and the chosen mode stays for the session.
- **BR-R2-5 · Only valid values count.** An unknown stored value means the default applies; nothing is written back.
- **BR-R2-6 · A mere open never writes.** Only a user toggle does, from its event handler.
- **BR-R2-7 · Hard delete removes the mode row** (R5, in the purge transaction). Soft delete keeps it.

## 4. Acceptance — Verification Gate + Visual Gate

**A. Vitest (core)** — `packages/core/src/db/tests/app-state.test.ts` (the better-sqlite3 driver idiom of
`migrations-runner.test.ts:32,75`):
1. read absent → `null`; write → read; overwrite; delete; the prefix read returns only `entity_mode:` keys, and a key with
   `_` or `%` elsewhere (`entityXmode:…`, `entity_mode_x`) is **not** matched; `entityModeKey` shape.

**B. Vitest (web):**
2. `createAppStateEntityModeStore`: rows → `readMode`; unknown value → default; `persistMode` → `setQueryData` + the writer
   called once.
3. `mode-defaults`: `note` → tabbed; unregistered → tabbed; `registerModeDefault('task_note','merged')` → merged.
4. `NoteEntity`:
   - preload pending → the page renders with the per-type default (tabbed) — no waiting on the mode read;
   - a stored `merged` row → once the read resolves the page is merged;
   - a toggle while the read is pending, then a stored `tabbed` row arrives → the user's toggle stays (and is the one write);
   - a preload **error** → the default stays, **exactly one** read, no toast; navigating to another note → read count
     unchanged;
   - a toggle → one write `entity_mode:note:<id>` = `merged`, under StrictMode too;
   - a mere open → zero writes;
   - a write failure → one `notifyError`, and the mode stays merged;
   - a preload **error**, then a toggle → exactly one write, no crash, and the mode stays (the `old ?? {}` path).
5. `?sample` → no `app_state` read or write; renders.

**C. Live on real OPFS** (`e2e/notes-mode-memory.spec.ts`, Brave): open a note (tabbed) → switch to Merged → reload →
the page settles in Merged; a second note → its default tabbed; read back `entity_mode:note:<id>` = `merged` on the harness.

**D. Visual Gate:** the regression check the slice mandates. The note page after reload in merged and in tabbed × light/dark
× 375/768/1440 must look identical to R1. axe 0.

**E. Gates:** `pnpm typecheck` · `pnpm lint` · core + web tests (alone, Node 24) · `/critique` SHIP.

## 5. Build steps (outline — refined into the IMPLEMENTATION-PLAN at gate 2)

1. core `db/app-state.ts` (+ `entityModeKey`, prefix) + barrel + tests (A1); `pnpm --filter @vida/core build` (apps/web
   reads dist).
2. web `notes/mode-defaults.ts` (B3); `entity/adapter.ts` `createAppStateEntityModeStore` (B2).
3. web `notes/use-entity-modes.ts` (the preload query) in `NoteEntity` (one observer; the ladder unchanged) + the store
   passed to `NoteEntityView` (mode = override ?? readMode) (B4, B5).
4. Docs: ADR-006 `**Amended:**` line + §3.6 (G12); slice-map R5 obligation (G10); NP-9 list
   (business-rules.md); notes current-* (BR-R2-*, BR-SUR-5 rewritten); stale headers (G13).
5. Live leg (C) → Visual Gate (D) → `/critique`.

## 6. Change log

- rev 1 (2026-10-27) — drafted from slice-map R2 + interpretation §5 #3 + code at `bb8e42b`.
- rev 2 (2026-10-27) — critique r1 **REVISE** (3 blocking, each verified on disk):
  (1) under `retry: 1` and retryOnMount a failed read would block and re-read → `retry: false`, `retryOnMount: false`, one
  observer, gated on `isLoading`, read count pinned (G3/G5);
  (2) G4 relabelled the slice text → stated as a refinement, with a slice-map amendment;
  (3) the ADR append precedent was wrong → the `**Amended:**` header + a §3.6 subsection (G12).
  Folded non-blocking: a full-key map (no parsing); a `substr` prefix instead of LIKE; one source of truth (the RQ cache);
  persist in the event handler; `ensureDbReady` parity; staleness stated; delete ownership + the transactional R5 delete
  + the NP-9 list; the stale-header list; the e2e flash detector; the core test location; the citation fix.
- rev 3 (2026-10-27) — critique r2 **SHIP**; folded its non-blocking notes: the `old ?? {}` updater + its test, the
  `useMemo` deps, the double-bound prefix, the G11 wording. The ADR-006 `Amended:` line goes after `**Amends:**` (line 9).
- rev 4 (2026-10-27) — **Victor: "You should follow the documentation, don't try to change that, it is there for a
  reason."** G4's "refinement" (preload in the loading ladder, no flash) withdrawn: the slice line "async read, seeded
  per-type default while loading" is delivered as written (G4, BR-R2-3, B4, C); the slice-map amendment and the flash
  detector are dropped.
- **APPROVED by Victor (Approval 1) on 2026-10-27** (rev 4).
