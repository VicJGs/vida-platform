# fe-codec-seams #13 — Interpretation Layer (Entity Delivery Flow, Step 1)

> **Unit:** G6 Wave-0 codec unit #13 — "Composition seams — SavedView · Capability/Block (inline/standalone) ·
> Template · Spaces engine runtime wiring (consume `@vida/core`)" [FACT: reconstructed-structure.md:33;
> g6-reshape-runbook.md:43]. **Profile:** Add Frontend Component · Entity Delivery Flow ②. **Plane:** `apps/web`
> (+ a one-line `@vida/core` barrel fix). **Renders no new surface** → Verification Gate, no Visual Gate.
> Every claim below is [FACT: path:line] or [INTERP] (labelled); nothing is guessed past an [UNKNOWN].

---

## §0. What this unit IS (the one-sentence purpose)

The apps/web **runtime-wiring + convention layer** that lets any surface *consume* the four already-built `@vida/core`
composition-primitive engines — SavedView (ADR-007), Capability/Block (ADR-008), Template (ADR-009), Spaces (ADR-006) —
through documented seam contracts, **without each consumer re-deriving the seam**. It renders nothing; it is the
`ProviderRead`-grade substrate the view/dashboard/entity/canvas shells and the module ②-tracks sit on
[FACT: reconstructed-structure.md:33,44; quality-bar §4.3].

---

## §1. DEPENDENCIES

### 1a. Explicit (the runbook/structure edges)
- **Blocked by #3 `fe-codec-viewmodes`** (the 7 renderers) [FACT: g6-reshape-runbook.md:43] — ✅ Done (PR #76).
- **Blocked by #4 `fe-codec-collection`** (the Collection shell + SavedView↔Collection adapter) [FACT:
  g6-reshape-runbook.md:43] — ✅ Done (PR #78).
- **Blocked by #7 `fe-codec-canvas-editor`** (the block canvas; the 11+11 block registry) [FACT:
  reconstructed-structure.md:33; g6-reshape-runbook.md:43] — **the task file OMITS this edge** (lists only #3/#4)
  [FACT: .claude/tasks/fe-codec-seams.md:14-16]; the governing structure asserts it. **Resolving test:** the thing #7
  provides to #13 — the block registry — already ships in `@vida/editor` [FACT: packages/editor/src/extensions/
  standard-blocks.ts:24-30; integration-blocks.tsx INLINE_BLOCK_DEFS (11); commands.ts:8-107 INTEGRATION_BLOCK_COMMANDS].
  #7's *codec aesthetic pass* (its ② treatment) is orthogonal to the registry-wiring #13 needs → **#7 does not block
  #13's convention deliverable** [INTERP, grounded in the registry-exists FACT].

### 1b. Implicit (the interpretation layer's whole job — boot/runtime readiness, injected deps)
- **[IMPLICIT-1 — the worker-db boundary — load-bearing.]** The four engines are **factories that take a
  `DrizzleDb` + `deviceId`** [FACT: foundation/views/service.ts:16 createViewsService(db,deviceId); spaces/service.ts:38;
  capability/registry.ts:49; templates/service.ts:24]. In apps/web, SQLite **+ the Drizzle instance live INSIDE the
  Web Worker**; the main thread holds only an RPC `SqliteDriver` proxy whose richer `exec`/`values`/`batch` path
  (what Drizzle needs) **THROWS a documented seam error** [FACT: apps/web/src/db/client.ts:12-14,44,154-162;
  db/CLAUDE.md "exec/values/batch … deferred to entity-CRUD, UI-3/M1.1+"]. **Therefore no live service can be
  instantiated on the main thread today** — the live bootstrap is doc-homed to UI-3/entity-CRUD, not #13 (see §4 IR-1).
- **[IMPLICIT-2 — React Query + DB-ready boot.]** apps/web boots a single `queryClient` gated on `ensureDbReady()`
  [FACT: apps/web/src/lib/query-client.ts; App.tsx:15-77; db/client.ts getDbClient/ensureDbReady]. Any consumption
  convention #13 writes must target React Query over a `ProviderRead` seam, never a direct driver call
  [FACT: s5-conventions.md:63-70].
- **[IMPLICIT-3 — the empty provider/capability registries.]** The View provider registry **ships EMPTY** (modules
  register at their build) [FACT: foundation/views/CLAUDE.md "ViewProviderRegistry ships EMPTY"; provider-registry.ts:12-31];
  `SHIPPED_CAPABILITIES` = only `habit_logger` in M1 [FACT: capability/registry.ts SHIPPED_CAPABILITIES]. A seam that
  assumes a populated registry is wrong today — the convention must be degrade-safe (BR-11) [FACT: views/engine.ts:
  22-82; views/CLAUDE.md BR-11].
- **[IMPLICIT-4 — Templates is not exported from the barrel.]** `TemplatesService` is reachable only via the internal
  path, not `@vida/core`'s public surface [FACT: packages/core/src/index.ts — no `./foundation/templates` export
  (confirmed absent); templates/index.ts exists]. A consumer cannot import it from `@vida/core` → a real gap #13
  closes (one line).

---

## §2. NEEDS (the pieces this unit adds — and the EXISTS/NET-NEW/RATIFY split)

| Seam | What the UI needs to consume it | Already exists | #13 delivers |
|---|---|---|---|
| **SavedView** (ADR-007) | resolve a view via `ViewEngine`, drive `CollectionView`, persist layout via `ViewsService` | Collection adapter (`toCollectionChrome`·`bindViewConfigWrites`·`createCollectionAdapter`) [FACT: apps/web/src/collection/adapter.ts:1-94]; engines barrel-exported [FACT: index.ts:118] | **RATIFY** the adapter against the engine API + author the **provider-registry wiring convention** (how a module registers a `ReadProvider` + resolves) [FACT: views/provider-registry.ts:12-31; types.ts:22-27] |
| **Capability/Block** (ADR-008) | registry `get`/`list`, enforcer, offered-set; inline (editor) + standalone (ui) render | Dashboard adapter (`toBlocks`·`isStandalone`·`parseBlockConfig`) [FACT: apps/web/src/dashboard/adapter.ts:1-116]; editor registry [FACT: editor/extensions/*]; engines exported [FACT: index.ts:124] | **RATIFY** the dashboard adapter + author the **inline↔standalone placement convention** (offered-set → add-menu; `render_targets` gate) [FACT: ADR-008:104-140; offered-set.ts:17-49] |
| **Template** (ADR-009) | import `TemplatesService`; fork-on-instantiate consumption shape | Store CRUD built (no update) [FACT: templates/service.ts:24-59]; instantiate/capture = `@vida/core` S3–S5 deferred (first-consumer-pull, in CORE) [FACT: templates/CLAUDE.md] | **NET-NEW:** barrel export (1 line, `@vida/core`) + the **fork-on-instantiate consumption convention** (how a surface lists/instantiates a template) [FACT: ADR-009 §1; templates/types.ts InstantiationResult] |
| **Spaces** (ADR-006) | `SpacesService` (tags·links·spaces·enabled_blocks), scope state | Service exported [FACT: index.ts:117]; scope selector = #15, Spaces page = #20 | **NET-NEW:** the **Spaces consumption convention** (service access + `enabled_blocks` offered-set shape); scope-STATE + page are NOT here (→ #15/#20) |
| **Service access** (cross-cutting) | one shared way to reach the 7 engine instances | — | **type + convention** (the `useXService()` access SHAPE); the **live** instantiation is deferred to UI-3/first-consumer (§4 IR-1) |

---

## §3. ORGANIZATION (plane + home boundary)

- **R-1 — apps/web is the home.** Every piece imports `@vida/core` (engine types/services) and/or targets React
  Query → it cannot live in `@vida/ui` (Tamagui-only boundary, BR-2) [FACT: collection slice-map R2; s5-conventions.md].
  The ONE exception is the Templates **barrel export**, which is a `@vida/core/src/index.ts` edit.
- **R-2 — convention modules mirror the shipped adapters.** New pieces follow the `apps/web/src/collection/` +
  `apps/web/src/dashboard/` shape: a pure adapter/convention module + `CLAUDE.md` + a convention test; no live React
  hook (deferred to first consumer) [FACT: apps/web/src/collection/CLAUDE.md; dashboard/CLAUDE.md].
- **R-3 — no new rendered surface.** The renderers (#3), shells (#4–#12), Spaces page (#20), Calendar (#19) own all
  pixels. #13 is wiring/convention → **Verification Gate only** (the Collection-S3 / ProviderRead precedent)
  [FACT: collection slice-map S3 "no Visual Gate"].

---

## §4. IMPLICIT RULES (the doc-resolved invariants this unit must honour)

- **IR-1 — the live service bootstrap is NOT #13's.** The main-thread Drizzle-proxy (`exec`/`values`/`batch`) is
  doc-homed to "entity-CRUD, UI-3/M1.1+" [FACT: apps/web/src/db/client.ts:44; db/CLAUDE.md], and #13's own consumer
  #19 depends on "#13 **(ProviderRead)**" — the convention seam, not a live service [FACT:
  reconstructed-structure.md:44]. #13 ships the **ProviderRead-grade convention + access SHAPE**; the live wiring is
  first-consumer-pull [FACT: s5-conventions.md:63-70]. (This is doc-homing, NOT a manufactured deferral — §2 shows the
  genuine net-new that remains.)
- **IR-2 — View = read-only lens; Capability = the interactive/write mixture.** Two deliberately separate primitives
  [FACT: quality-bar §4.3; ADR-007 §3.3 vs ADR-008 §3.2]. The SavedView seam carries no entity write; any write
  (drag-to-move, inline edit) is a Capability (INT-2) [FACT: ADR-008:71-77]. The two seams stay separate in #13.
- **IR-3 — `enabled_blocks` (palette/menu) ≠ `block_instances` (placements).** Keep them distinct at the convention
  layer [FACT: ADR-008:128-140,181-183]. Offered-set: inline = union across the page's Spaces + global base;
  standalone = restricted to the Space palette [FACT: offered-set.ts:26-46].
- **IR-4 — degrade, never crash.** A missing provider/capability contributes nothing + a declared degraded note; the
  seam never throws mid-fan-out [FACT: views/engine.ts:22-82; views/CLAUDE.md BR-11; dashboard/adapter.ts toBlocks
  "degrade unresolvable"].
- **IR-5 — fork-on-instantiate has no back-link.** A template instance keeps no `template_id`; instantiation deep-copies
  [FACT: ADR-009 §1]. The consumption convention must not imply a live link.

---

## §5. OPEN / UNKNOWN (carried to the Decomposition Gate)
- **[RESOLVED at the gate, not UNKNOWN]** The build-vs-defer-bootstrap fork → Option A (convention + defer live), by
  IR-1's three resolving tests. Recorded here so the gate ratifies, not re-opens.
- **[UNKNOWN — minor]** Whether the Templates + Spaces consumption conventions warrant two `apps/web` convention
  modules or one combined `seams/` module — a slice-granularity call for §slice-map, not a correctness question.
