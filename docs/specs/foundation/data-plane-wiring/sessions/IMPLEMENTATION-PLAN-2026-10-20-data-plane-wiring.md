# IMPLEMENTATION-PLAN (§XXVI gate 2 — build steps) — data-plane-wiring

> **Session:** 2026-10-20-data-plane-wiring · **Follows:** Approval 1 · **Revised 2026-10-20** per Victor: the foundation must be PURELY ADDITIVE — **zero already-done-task files modified.**
> **Status:** awaiting /critique → Approval 2 (nothing built until Approval 2) · **Node 24** · fresh worktree off main.

## ⛔ HARD INVARIANT — nothing on done tasks changes
This unit builds the foundation as **NEW code only**. It MUST NOT edit any file owned by a done/merged task, and MUST NOT change any existing behavior or break any existing test. Explicitly UNTOUCHED:
- `apps/web/src/db/client.ts` (the stub driver whose `values`/`batch` throw) + `apps/web/src/db/client.test.ts` (asserts they throw) — **stay green**.
- ALL `apps/web/src/notes/*` + `apps/web/src/home/*` (hooks, components, tests) — fe-notes + fe-home, untouched.
- Every other merged `fe-*` surface — untouched.

Consequence: the **per-module go-live flips** (turning a surface's stub hooks → live) are **OUT of this unit** — each is a separate, explicit COMPLETION of that module, done when Victor chooses (that is the only step that touches a done task, and it's owned + opt-in, not buried here). This unit only **enables** them.

## Build steps (all NEW files unless marked; anchor → operation → before/after → verify)

### S1 — Live driver (NEW file) — GOAL: zero `worker.ts` edit
- **Anchor:** the worker's EXISTING ops `open|exists|migrate|run|exec-alias|query|close` + the RPC `call()` channel (`client.ts:67-112`).
- **Operation:** add `apps/web/src/db/live-driver.ts` — `createLiveDriver(driver): SqliteDriver` that **composes over the EXISTING public `client.driver`** (its live `run`/`query`), adding the missing ops by composition — **so `client.ts` is NOT edited (no new export needed; uses the public driver surface):** `values` ← `driver.query` + `Object.values(row)` to positional arrays (per `adapter.ts:73-78`); `batch` ← `driver.run` wrapping statements in `BEGIN`/`COMMIT` (the migration runner does exactly this, `adapter.ts:256-260`); `exec` ← `driver.run`/`query` → `RawQueryResult`. **Build-time determination (No-Guessing):** READ `worker.ts`/`driver` return shapes first; if they suffice (expected), `worker.ts` is NOT edited. ONLY if `values` positional-order can't be reconstructed (unaliased exprs/dupe columns), add the MINIMAL `.raw()` op at the declared extension point (`worker.ts:36` "add the ops here") — the SOLE possible done-task touch, FLAGGED + surfaced for approval before doing it.
- **Does NOT touch** `client.ts` (the stub `client.driver` + `client.test.ts:74-77` stay green — the live driver wraps the public driver, no export added).
- **Verify:** typecheck; `client.test.ts` passes unchanged; a NEW unit test asserts `values` positional shape + `batch` atomicity via the live driver; `git diff` shows `client.ts`/`worker.ts` untouched (or `worker.ts` ONLY the flagged, approved additive op).

### S2 — (folded into S1) — the live driver IS the additive seam fill; no separate client edit.

### S3 — Composition root (NEW file, additive — module singleton, no App.tsx edit)
- **Anchor:** `boot.ts:36-47` (single client, DB-ready gate) — the singleton reads the already-open client; App.tsx is NOT touched.
- **S3a — establish deviceId [grounded]:** read `app_state['device_id']` (KV, `runner.ts:111`); if absent, generate via the EXISTING `uuidv7()` (`@vida/core repository.ts:67`) + `INSERT OR REPLACE` (mirror `adapter.ts:231`). *Basis:* ADR-002 §5.0 + `repository.ts:179` + ADR-003.
- **S3b — construct once, dep-order [grounded]:** `DrizzleDb = createDrizzleProxy(createLiveDriver(client))`; build shared read registries once (`createViewProviderRegistry()` empty, `createJournalRegistry()`) + the shared `Sessions` SERVICE (`createSessionsService`); construct services in the order `NotesServiceDeps` requires (`services/notes/types.ts:20-28`): `TaggableTypeRegistry` → `SpacesService` → `BacklinkResolver` → `createNotesService` ; `JournalRegistry` → `createJournalsService`.
- **S3c — expose via a MODULE SINGLETON (no App.tsx edit):** the composition root is a NEW module (`apps/web/src/db/composition-root.ts` or similar) exporting a **lazily-initialized singleton** (`getServices()` constructs on first call, AFTER the DB-ready gate — BR-RT-BOOT). Hooks import it directly in their `queryFn` (`services.notes.listPages()`). `seams/CLAUDE.md:24-28` explicitly sanctions "a module singleton" as the injection mechanism → **App.tsx is NOT touched** (no provider wrapper added; the existing provider hierarchy is unchanged). Mechanism + registries build-once; the construction manifest GROWS per module (`seams/CLAUDE.md:85`).
- **Verify:** typecheck; services construct without throwing (seam now live via the live driver); no query before DB-ready; `deviceId` stable across reloads; all existing App/boot tests stay green.

### S4 — Proof via the QA-1 fixture (ADDITIVE test — no surface touched)
- **Anchor:** `apps/web/e2e/fixtures.ts` `db` fixture + OPFS reset (built; `qa-1 _index §1/§2` reserved extension point).
- **Operation:** a NEW E2E that constructs the live driver + `createNotesService` and does a write→reload→read CRUD round-trip in a real OPFS worker — proving the plane end-to-end **without flipping any surface hook**.
- **Verify:** green ×2 no-flake in real Chromium (Node 24, `PW_EXECUTABLE_PATH`). Also measure one live read's round-trip latency (sanity-check BR-RT-4's `<10ms`, §XIII; a worker-RPC hop may exceed it → flag for cache-time rules, don't assume).

### S5 — §XXIX currency + homing (ADDITIVE docs only)
- **Operation:** promote `web-client-runtime/current-*` ADDITIVELY — add the composition-root plane + live-driver BR + the deviceId-establishment BR; note the stub `client.driver` is superseded by `live-driver` (do NOT rewrite BR-RT-D5's record, append the completion). Homing = **ALIAS ONLY**: in `MVP-PATH.md` (the plan doc) + this unit's `_index` + a `decisions` entry, record "`UI-3/M1.1+` = `data-plane-wiring`". **Leave every code/currency-doc phantom ref untouched** — they resolve via the alias (no done-task file edited for homing).
- **Verify:** docs build; `git diff --name-only` touches ZERO `apps/web/src/{notes,home}/*`, ZERO `client.ts`/`client.test.ts`.

## Acceptance (unit DoD)
- Worker `values`/`batch`/`exec` live; `createLiveDriver` + `createDrizzleProxy` round-trip real `pages`/journal rows in a real OPFS worker (S4 fixture CRUD E2E).
- Composition root constructs notes/journals (+deps) + registries once, `deviceId` from `app_state`, exposed per convention.
- **`git diff --name-only` modifies ZERO done-task files** (the invariant above) — verified mechanically.
- Incrementality is inherent: no surface is flipped, so every merged `fe-*` stays exactly as shipped. The foundation ENABLES each later per-module flip (register + flip, an owned completion of that module).

## Reinvention / out-of-scope
Do NOT rebuild: `createDrizzleProxy`, SqliteDriver shapes, QA-1 fixture, migrations, factories/`useXService()` convention, Yjs body binding. Net-new primitives: the deviceId read-or-generate + `createLiveDriver`. OUT: per-module hook flips (separate completions), Yjs editor-body persistence (IR-7), FTS5 search (DB-8/M1.4).
