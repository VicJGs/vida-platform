# fe-session-runtime (#23, LIF-218) — Interpretation Layer

> Entity Delivery Flow ② · Step 1. Make the implicit explicit **before** decomposing.
> No-Guessing: every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]`.
> Authored 2026-10-15 (session fe-session-runtime-1). Branch `fe-session-runtime` off `main @1458b67`.

## What this unit is
The **Session runtime page** — a routed `apps/web` page that renders ONE live session as a staged,
"deliverable-per-stage" flow (title · stage · deliverable+desc · attach · proof · effect-rail log).
It is the **first real consumer** of the shipped `fe-codec-flow-session` seam (#11).
`[FACT: docs/specs/foundation/frontend-replan/g6-reshape-runbook.md:57 — unit 23, "new", blocker fe-codec-flow-session]`
`[FACT: reconstructed-structure.md:48 — #23 "Session runtime page", composition = Flow archetype #11]`

It is **codec-tier reuse** — built once, later consumed by Sessions (#34), Routines (#33), Health
workouts (#40), Pomodoro. `[FACT: reconstructed-structure.md:88]` ⇒ the page must be **module-agnostic**:
it renders whatever session it is given, not a Tasks/Routines-specific screen. `[INTERPRETATION]`

## 1. DEPENDENCIES (what must already exist — and does)
- **`@vida/ui` `FlowSessionView`** (shipped shell #11). The page's whole frame.
  `[FACT: packages/ui/src/components/flow-session-view.tsx:52-89 — FlowSessionViewProps]`
  `[FACT: …:30-42 — FlowStage{id,label,title,status:'done'|'current'|'upcoming',state?,proof?}]`
- **`apps/web/src/flow/adapter.ts`** (shipped seam #11 S2). The pure pieces the page composes:
  `toFlowProps` `[FACT: adapter.ts:52-70]` · `mapEffectLog` (applied_effects ledger → effect-rail)
  `[FACT: adapter.ts:93-95]` · `bindFlowIntents` (mark-done→`transition(id,'complete')`, attach→`attach(…)`,
  require-proof→consumer flow) `[FACT: adapter.ts:113-122]` · `SessionsPort{transition, attach}`
  `[FACT: adapter.ts:99-102]` · `FlowSource` `[FACT: adapter.ts:29-47]`.
- **TanStack Router** — the page registers a route (e.g. `/sessions/:id`).
  `[FACT: apps/web/src/App.tsx routing via ./routes; RootComponent → AppShell+Outlet — per scoping sweep]`
- **The app shell** — the page mounts inside `AppShell`. `[FACT: apps/web/src/shell/]`

## 2. NEEDS (what this unit must create — the two deferred pieces #23 OWNS)
Both are explicitly homed to the first consumer, which is this unit:
- **N1 — the live `useFlowSession(sessionId)` hook** in `apps/web/src/flow/`: React Query →
  the session + its attachments + the effect log, binding the **real `@vida/core` sessions service** to
  `SessionsPort`. Deferred from #11, built "at the FIRST consumer".
  `[FACT: apps/web/src/flow/CLAUDE.md:18-20 (R3)]` `[FACT: adapter.ts:13-18]`
  This is the `@vida/core` edge (the adapter is pure/port-only today). `[FACT: adapter.ts:97-98]`
- **N2 — render `FlowStage[]` by assembling EXISTING primitives (DOC-RESOLVED — not a decision).** There is no
  "stage"/"deliverable" backend entity, and that is intentional: the staged-deliverable structure is a
  **design-intent extension assembling existing primitives — `deliverable_note` pages + `note_attachments` +
  the ADR-004 effect rail — with NO NEW PLUMBING (no schema amendment).**
  `[FACT: docs/specs/foundation/frontend-quality-bar/_index.md:134-140]`
  `[FACT: fe-codec-flow-session/delivery/slice-map.md:88-94 — O2 runtime page=#23 · O5 deliverable_note pages
   frozen/READ in @vida/core · O7 the per-module "stages" realization is homed to each owning module's ② track,
   NOT #23]`
  ⇒ #23 renders stages **generically from the session** (single-stage by default — EC-9; multi-stage only when a
  driving module supplies staged structure, which is that module's ② track per O7). #23 invents no stages model.
  `[FACT: docs/features/sessions-and-scheduling/structure-data.md:5-8 — session base = 6 schema-only tables, 0
   logic, no stage/deliverable table (expected — the assembly is design-intent, not a table)]`

## 3. ORGANIZATION (where the code lands — following the sibling-adapter precedent)
- **`apps/web/src/flow/`** — extend with the live `useFlowSession` hook (N1). The sibling precedent is
  `apps/web/src/reader/` (the done canvas-reader adapter deferred its `useReader` hook identically).
  `[FACT: apps/web/src/flow/CLAUDE.md:18-20; reader adapter per sweep]`
- **`apps/web/src/session-runtime/`** (new, `[INTERPRETATION]`) — the page component + its route wiring +
  the consumer-resolved stages/attach-target/proof glue. Named after the unit; neighbors `shell/`.
- **`apps/web/src/routes.tsx`** — register the runtime route. `[FACT: apps/web routing per sweep]`
- Durable context docs (D6): birth `docs/modules/…/current-*` for the new page context at scaffold.

## 4. IMPLICIT RULES (the traps no doc states at the call site)
- **IR-1 — the shell NEVER writes** (BR-FS-2). All writes go through `bindFlowIntents` → the port → the
  live hook → `@vida/core`. The page must not write directly. `[FACT: adapter.ts:110-113; flow/CLAUDE.md:13-15]`
- **IR-2 — `@vida/ui` is Tamagui-only**; no `@vida/core` import crosses into it. The `@vida/core` edge lives
  ONLY in the live hook (N1). `[FACT: flow/CLAUDE.md:5,16-17,29-30]`
- **IR-3 — progress is DERIVED** from stages (done/total) unless overridden; pass `progressLabel` with any
  explicit `progress`. `[FACT: flow-session-view.tsx:57-60; adapter.ts:35-37]`
- **IR-4 — unknown effect types are never dropped** (fall back to raw key — the no-guessing bar).
  `[FACT: adapter.ts:91-94]`
- **IR-5 — degrade-never-crash**: every stage threads its own `state` (loading/empty/error/success); the
  effect rail empty → a teaching EmptyState. `[FACT: flow-session-view.tsx:38-39,79-82]`
- **IR-6 — WORKTREE `@vida/ui` SYMLINK RESOLVES TO MAIN** (Visual-Gate trap, recorded in memory). The live
  Visual Gate must account for this. `[FACT: memory/worktree-apps-web-ui-symlink-resolves-to-main]`
- **IR-7 — the effect catalogue is a fixed 12-member enum**; `mapEffectLog`'s label map covers 8, rest
  fall through to key. `[FACT: adapter.ts:73-82; packages/types/src/session.ts EFFECT_TYPE per sweep]`

## 5. DOC-RESOLVED (corrected 2026-10-15 — Victor flagged my first draft's "forks" as drift)
My first draft raised stages-realization + M1-scope as open forks. **Both are already decided by the docs** — I
manufactured a fork the documentation answers (the exact anti-pattern). Corrected:
- **Stages realization — DECIDED.** Assemble existing primitives (`deliverable_note` pages + `note_attachments` +
  ADR-004 effect rail), **no new plumbing / no schema amendment.** `[FACT: frontend-quality-bar/_index.md:134-140]`
  The per-module stages shape is homed OUT of #23 (O7). `[FACT: slice-map.md:88-94]` → no fork.
- **M1 render scope — DECIDED by the envision.** The page is generic: **single-stage by default (EC-9)**,
  multi-stage only when a driving module supplies it. `[FACT: fe-codec-flow-session/delivery/envision.md:57 EC-9]`
  So #23 proves the seam against any session (incl. the minimal M1 ones) and degrades to single-stage cleanly — no
  fixture-vs-real fork. → no fork.
- **The ONE genuinely design-pass-open item** (not a fork, a bounded composition point): how session-runtime
  **composes within Spaces scope** — flagged design-pass-open per ADR-006. `[FACT: frontend-quality-bar:150-151;
  ADR-006:130]` Handled inside the slice work against the shipped shell, not a gate question.

## 6. ENVISION GATE — RATIFIED (Step 1.5, Victor 2026-10-15)
Victor authored the envision record himself when building the shell: EC-1…EC-11 approved 2026-10-07 across two
review rounds (his typography corrections: semantic scale/no-px · title-hero · progress BAR not a subtitle ·
dropped the eyebrow+dot-string; + the 16px breathing-room fix). `[FACT: fe-codec-flow-session/delivery/envision.md:1-70]`
That record already covers #23's whole surface: multi-stage (EC-1), current stage deliverable+attach+mark-done/proof
(EC-2), done-proof/upcoming-faded (EC-3), effect rail + teaching empty (EC-4), title-hero header (EC-5), per-stage
state (EC-6), 375→1440 reflow (EC-7), dark + preset flips (EC-8), **single-stage reads sanely (EC-9)**, stage-advance
feel (EC-10), typography discipline (EC-11).
⇒ **RATIFY** (no fresh greybox): #23 **inherits EC-1…EC-11 as its structural checkpoints**, re-asserted in #23's own
per-slice live Visual Gate against the real routed page + live data (vs the shell's greybox). The net-new surface is
the composition (route + live `useFlowSession` hook), not a novel affordance — nothing to re-greybox.
