# PLAN (§XXVI gate 1 — the SPEC) — data-plane-wiring

> **Session:** 2026-10-20-data-plane-wiring · **Language:** English · **Unit:** `docs/specs/foundation/data-plane-wiring/`
> **Status:** Approval 1 ✅ (2026-10-20). **⛔ SCOPE REVISED 2026-10-20 (Victor): PURELY ADDITIVE — the per-module notes/home flips (C3/C4 below) are MOVED OUT to separate per-module completions; this unit touches ZERO done-task files and proves the plane at the QA-1 fixture level. The authoritative build spec is the (revised) IMPLEMENTATION-PLAN.** The C3/C4 "flip" text below is superseded by that invariant.
> **Everything below is DERIVED from existing docs/primitives — no new design.** Citations are to built code + current docs.

## 1. Context & demand
Two well-built halves — `@vida/core` services (tested, headless) + the `apps/web` shells (merged, swap-ready) — are **not joined at the data level**: `apps/web/src/db/client.ts:154-162` throws on `values`/`batch`/`exec`, and there is **no composition root** constructing live services. So notes/journal (and the whole MVP-1 fleet) can render but not persist. Victor's requirement: build the data plane as a **foundation** so each module's frontend becomes usable **as it is built** — build-once + per-module `register + flip`, incremental availability. Feasibility verified YES/by-design.

## 2. What changes & why (foundation vs per-module)

**Build ONCE (the foundation):**
- **C1 — Worker Drizzle seam.** Implement `values`/`batch`/`exec` on `apps/web/src/db/worker.ts` (currently `open|exists|migrate|run|exec-alias|query|close`, seam at `worker.ts:35-37`) + mirror on the `client.ts` driver (replace the throwing `SEAM`, `client.ts:44,154-162`). Reuses the built RPC correlation + error-propagation (`client.ts:67-112`) and the EXISTING driver result-shape contract (`values`=positional arrays, `exec`=`RawQueryResult`, `batch`=void; `adapter.ts:61-85`). `batch` mirrors the adapter's `BEGIN/COMMIT` (`adapter.ts:256-260`). *Why one seam:* every module's query flows through the single `createDrizzleProxy` (`adapter.ts:182`, built+Node-tested) → one implementation unblocks all CRUD.
- **C2 — Composition root (`apps/web`).** After the DB-ready gate (`App.tsx`/`boot.ts:36-47`), instantiate `DrizzleDb` from the single client, build the shared registries once (`createViewProviderRegistry()` empty, `JournalRegistry`, `Sessions`), construct the proof-module services (`createNotesService({db,deviceId,...})`, `createJournalsService`), expose them via the EXISTING `ProviderRead<T>` + React Query convention (`providers/CLAUDE.md`, `seams/CLAUDE.md` — "do not re-invent it"; injection shape is this first consumer's trivial pick). `deviceId` ← `app_state` (ADR-002).

**Per-module (additive, repeatable — proof consumers notes + home):**
- **C3 — register.** `registerX*` into the shared registries (additive by entityType key, `provider-registry.ts:21`).
- **C4 — flip hooks.** `use-notes-rows`/`use-note-entity`/`use-journal-summary`/home hooks stub→live (`useQuery` over the provider; writes per **BR-RT-2/4** invalidate+re-read, no optimistic). Per-slice query keys fixed at `/contract`.

**OUT (separate documented seams — do not fold in):** Yjs editor-body persistence (`pages.content` CRDT, `canvas-editor/page-binding`, IR-7); FTS5 search (DB-8/M1.4).

## 3. Functional business rules (derived)
- R1 — one shared seam: implementing `values`/`batch`/`exec` once unblocks every module's Drizzle CRUD (no per-module seam). `[adapter.ts:182; db/CLAUDE.md:34]`
- R2 — additive registration: a module registers by its own entityType key; an un-registered module stays honest-empty (incrementality, no coupling). `[provider-registry.ts:18-31]`
- R3 — reads via `ProviderRead` + React Query; **no direct cross-module tables**. `[providers/CLAUDE.md]`
- R4 — writes invalidate + re-read, **no optimistic** (local reads <10ms). `[BR-RT-2/4]`
- R5 — no query before DB-ready; single client, one open. `[BR-RT-BOOT/D5]`
- R6 — crypto non-blocking: M1 repos run `encryptedFields:[]` pass-through; persistence does not wait on M3. `[db/CLAUDE.md:8]`
- R7 — do NOT rebuild: `createDrizzleProxy`, driver shapes, QA-1 fixture, migrations, factories/`useXService()` convention, Yjs binding (reinvention guard).

## 4. Functional acceptance
- CRUD round-trip in a real OPFS worker via the QA-1 `db` fixture (write→reload→read) for notes rows + journal dashboard. `[qa-1 _index §1/§2 reserved extension point]`
- notes + home surfaces persist the fe-notes `seam-contract.md:11-23` ops (list/get/create/updatePage-metadata/softDelete, links, attachments; journal summary).
- Incrementality: a non-registered module renders honest-empty (no crash, no coupling).
- Out-of-scope untouched (Yjs body, FTS5); §XXIX promotion + phantom-home re-homing done in the same commit.

## 5. Implementation prompt → the IMPLEMENTATION-PLAN (gate 2)
After Approval 1, the IMPLEMENTATION-PLAN enumerates anchor+operation build steps: (S1) worker `values`/`batch`/`exec` + client driver; (S2) composition root + registries + deviceId; (S3) notes register+flip; (S4) home register+flip; (S5) QA-1 CRUD E2E; (S6) §XXIX currency + light homing. Each step: before/after + per-step verification (typecheck/test + the live OPFS E2E). The composition-root injection shape is decided in S2 by reading 3-5 existing `apps/web` provider patterns (§XXIV), within the `useXService()`/`ProviderRead` convention.

## Open items
- None blocking. `deviceId` exact read path from `app_state` confirmed at S2 (convention known; line-level read is a build detail). Linear mint deferred (orphan-create guard; parallel sessions in flight).
