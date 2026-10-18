# fe-session-runtime (#23, LIF-218) — Slice Map (Decomposition Gate, Step 2)

> **Delivery scope (DOC-FIXED — not my discretion):** #23 delivers the Session runtime page —
> **entity title + summary · stage · deliverable + description (a `deliverable_note` page) · attach
> (`note_attachments`: doc/photo/audio) · mark-done / proof · logs via the effect rail.**
> `[FACT: docs/specs/foundation/frontend-replan/decomposition.md:70]` `[FACT: surface-map.md:32]`
> `[FACT: frontend-quality-bar/_index.md:134-140]` It is **Wave-1 codec-tier reuse — built once now, consumed by
> Sessions #34 / Health / Pomodoro later** `[FACT: reconstructed-structure.md:88]`, so it is specified to be built
> ahead of its producers (⇒ seeded data at the Visual Gate is the documented consequence, not a scope choice).
>
> Entity Delivery Flow ② · Step 2. Grounded in interpretation §1–§6 + the **ratified** envision EC-1…EC-11
> (`fe-codec-flow-session/delivery/envision.md`, Victor 2026-10-07). **Mode: Ratify** — the shape is doc-fixed
> (slice-map O2/O5/O7 + frontend-quality-bar §4.5). The shell (`FlowSessionView`) + the pure adapter
> (`toFlowProps`/`mapEffectLog`/`bindFlowIntents`/`SessionsPort`) are SHIPPED; #23 cashes the two deferred IOUs.
> Approved before per-slice work.

## Planes (all `apps/web` — the shell is already in `@vida/ui`; no `@vida/core` or `@vida/ui` authoring here)

| plane | slice | what |
|---|---|---|
| **`apps/web/src/flow`** (data edge) | **S1** | the live `useFlowSession(sessionId)` hook — binds the real `@vida/core` sessions service to the shipped `SessionsPort`; reads the session + `session_attachments` + the `applied_effects` log; assembles `FlowStage[]` generically from existing primitives (single-stage default) |
| **`apps/web/src/session-runtime`** (surface) | **S2** | the routed runtime **page** — composes `FlowSessionView` via `toFlowProps` + `bindFlowIntents` + the S1 hook; registers the route; wires attach-target + proof; threads the 8-state. **Carries the per-slice blocking Visual Gate (EC-1…EC-11).** |

Two slices, mirroring the sibling-adapter shape (data hook → surface). No backend track — the sessions spine +
effect rail + attachments are FROZEN/SHIPPED in `@vida/core` (AR-5). No new plumbing (frontend-quality-bar §4.5).

## Slices

### S1 — `useFlowSession(sessionId)` live hook · plane `apps/web/src/flow` · data
**Scope:** the deferred `@vida/core` edge (N1), built here as the first consumer (R3).
- a React-Query `useFlowSession(sessionId)` → `{ source: FlowSource, port: SessionsPort, state: ViewState }`;
- **reads** (frozen `@vida/core`, READ-only): the `sessions` row · its `session_attachments` · the local
  `applied_effects` log → `mapEffectLog` (shipped);
- **stages assembly (generic, no new plumbing — frontend-quality-bar §4.5):** `FlowStage[]` from the session
  itself — **single-stage by default (EC-9)**: the session is one `current` stage; a `done` session → one `done`
  stage with its attachment-derived `proof`; multi-stage is supplied by a driving module later (O7, not #23);
- **the data leg is DEFERRED (the doc-fixed apps/web M1 pattern — NOT a live binding).** `createSessionsService` is
  live in `@vida/core` (`getSession`/`completeSession`/`transitionSession`/`attach` → the built #32 engine fires
  effects + records the `applied_effects` ledger) `[FACT: services/sessions/service.ts:120,133,135,411-416;
  foundation/sessions/lifecycle.ts:62-134]`, **but apps/web cannot reach it in M1** — no service composition root +
  the worker-RPC Drizzle `values` seam throws (S1-D2/F3) `[FACT: notes/use-note-entity.ts:4-5; use-attachments.ts:1-10;
  use-collection.ts:7-14]`. So `useFlowSession` ships the SHAPE + `?sample` DEV seed (single-stage sample `FlowSource`),
  M1 default empty/degraded, **live swap zero-signature-change** (documented in the hook header), mirroring every
  sibling hook. Deferred downstream (does NOT block #23): per-module effect handlers + scheduler (#46/MOD-*).
- unit tests (sample assembly + the pure `toFlowSource`/port shape + degrade); **no Visual Gate** (no rendered
  surface — sibling-hook precedent).
**Covers:** N1 + the data behind EC-1/EC-3/EC-4/EC-9.
**Out:** the page/route (S2) · multi-stage per-module assembly (O7) · the effect WRITES/lifecycle engine (`@vida/core` #32).

### S2 — the runtime page + route · plane `apps/web/src/session-runtime` · surface
**Scope:** the routed page that renders the `useFlowSession` output via the shipped shell (M1 data via the `?sample`
seed, live later — the sibling-hook pattern).
- a `/sessions/:id` (or shell-scoped) route in `apps/web/src/routes.tsx`, mounted in `AppShell`;
- the page component: `useFlowSession(id)` → `toFlowProps(source)` + `bindFlowIntents(port, id, { attachTarget, onProof })`
  → `<FlowSessionView {...props} />`;
- **attach-target + proof wiring** — `attachTarget(stageId, kind)` resolves the `deliverable_note` page /
  `note_attachments` target (existing primitives, O5 READ); `onProof` the proof flow;
- **8-state threading** — loading (skeleton) · empty (teaching) · error (calm `role="status"`) · success;
- **session-runtime composition within Spaces scope** — the one design-pass-open point (ADR-006:130), resolved
  against the shipped shell, not re-envisioned.
**Covers:** EC-1…EC-11 (ratified) re-asserted on the real routed page, fed by the `?sample` seed (the M1 data path).
**Visual Gate MUSTs:** EC-1…EC-9 + EC-11 in a real browser × 3 presets × light/dark × 375/768/1440 + axe — the
blocking per-slice gate, driving the real vite app at the route with `?sample` (the sibling-hook gate pattern).
**Out:** effect WRITES/lifecycle (`@vida/core`) · the timer HUD (#16) · per-module staged surfaces (O7).

## EC → slice coverage (every `structural` EC maps to ≥1 slice)

| EC | type | slice | carried as |
|----|------|-------|-----------|
| EC-1 staged progression (single-stage default; multi when supplied) | structural | S2 (render) + S1 (assembly) | Visual-Gate MUST |
| EC-2 current stage deliverable + attach + mark-done/proof | structural | S2 (wire) | Visual-Gate MUST |
| EC-3 done proof · upcoming faded · dot temporal state | structural | S2 (render) + S1 (proof data) | Visual-Gate MUST |
| EC-4 effect-rail log · empty = teaching | structural | S2 (render) + S1 (log data) | Visual-Gate MUST |
| EC-5 title-hero header + progress bar + 16px rhythm | structural | S2 | Visual-Gate MUST |
| EC-6 per-stage independent state, calm degrade | structural | S2 | Visual-Gate MUST |
| EC-7 reflow 375→1440, no overflow, centered | structural | S2 | Visual-Gate MUST |
| EC-8 serif title · DIRECT tokens · dark designed · preset flips | structural | S2 | Visual-Gate MUST |
| EC-9 single-stage reads sanely | structural | S1 (default assembly) + S2 (render) | Visual-Gate MUST |
| EC-10 stage-advance immediacy · attach/proof feel direct | feel | S2 | live Visual Gate (feel) |
| EC-11 semantic type scale, consistent hierarchy | structural | S2 | Visual-Gate MUST |

All structural ECs home to S2 (the live surface) with their data in S1 — coverage complete, no unhomed EC.

## Out of scope (homed by the docs)
- Multi-stage per-module assembly (routine-run · study-plan · workout) → each owning module's ② track (O7).
- Effect WRITES + lifecycle transition engine → `@vida/core` #32 (AR-7).
- The persistent timer HUD (region 6) → `fe-session-hud` #16.
- A stages/deliverables schema → NOT built (frontend-quality-bar §4.5: no new plumbing).

## Build order
**S1 → S2.** S1 is the data edge the page needs; S2 is the routed surface that carries all ECs + the Visual Gate.
