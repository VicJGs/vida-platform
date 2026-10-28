# data-plane-wiring — Foundational unit (live data plane)

> **Type:** feature (foundation, FULL double-gate) · **Status:** planning — PLAN gate open (nothing built)
> **Home:** M1 / M1.1.3 (Depth & Recovered · Backend) — DERIVED (first-consumer-pull; completes AR-2's deferred Drizzle-write seam). See `.claude/tasks/data-plane-wiring.md`.
> **Session gate files:** `sessions/PLAN-2026-10-20-data-plane-wiring.md` (gate 1). IMPLEMENTATION-PLAN after Approval 1.
> **Closes:** `docs/specs/fixes/notes-dataplane-orphan-deferral/` (this is the real owner the phantom "UI-3/M1.1+" pointed at).

## Identity

The **build-once foundation** that makes each module's frontend usable with real persistence, consumed incrementally (module A live while B stays stubbed): (1) expose the worker-side Drizzle `values`/`batch`/`exec` seam; (2) the `apps/web` composition root that instantiates services + shared registries over the existing `ProviderRead`/React-Query convention. Per-module `register + flip` is additive and repeatable. First proof consumers: notes + home.

**Scope + mechanism are DERIVED FROM EXISTING DOCS — no new design.** createDrizzleProxy + driver contract (built, `@vida/core adapter.ts`), write/invalidation convention (BR-RT-2/4), QA-1 test fixture, migrations, service factories + `useXService()` convention all pre-exist (reinvention guard in the task file). OUT: Yjs note body (separate seam), FTS5 search (DB-8).

## Acceptance (unit DoD — PURELY ADDITIVE; detail in the IMPLEMENTATION-PLAN)

- **⛔ HARD INVARIANT:** `git diff --name-only` modifies ZERO already-done-task files — `client.ts` (stub driver) + `client.test.ts` stay green; ALL `notes/*` + `home/*` + every merged `fe-*` untouched. (Revised 2026-10-20 per Victor: nothing changed on done tasks.)
- Worker exposes `values`/`batch`/`exec` (additive); a NEW `createLiveDriver` + `createDrizzleProxy` round-trip real `pages`/journal rows in a real OPFS worker (QA-1 `db`-fixture CRUD E2E) — **no surface hook flipped.**
- A composition root (new) constructs `createNotesService`/`createJournalsService` (+deps) + the shared registries once, exposed per the `ProviderRead`/React-Query convention; `deviceId` ← `app_state`.
- Incrementality is inherent (no surface flipped → every merged surface stays exactly as shipped); the foundation ENABLES each later per-module `register + flip` (an owned completion of that module, OUT of this unit).
- §XXIX: `web-client-runtime/current-*` promoted ADDITIVELY; homing = **alias only** (`UI-3/M1.1+` = `data-plane-wiring` in MVP-PATH + this index + a decisions entry) — no done-task file re-homed.
- Out-of-scope: per-module hook flips (separate completions), Yjs body path, FTS5 search.
