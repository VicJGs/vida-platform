---
Session 1 — 2026-08-05
Goal: work the M1.0 `#`-order heads: AR-9 (sync scaffolding), then DS-5 (primitive contracts)
Profile: Add Backend Component (AR-9) → switched to Design System (DS-5)
---

## Accomplished
- **AR-9 — Sync scaffolding (no-flush)** (LIF-80 → Done · PR #4 merged). No-flush stub skeleton in
  `packages/core/src/sync/{types,queue,resolver,crdt,index}.ts` — reserved seams that all throw
  `SyncNotActivated`, reusing `@vida/types` sync types, exported from `@vida/core`. Document-first +
  full §XXVI double-gate (spec critique REVISE→6/6, IMPL-PLAN critique SHIP materialized-green, post-impl
  SHIP). core 183/183 · typecheck 10/10. Docs: `docs/core/sync/current-*` + `sync/CLAUDE.md`.
- **F003 — token-pipeline fix** (PR #5 merged). Component sub-themes emitted identical light/dark (dark
  used light values). Fixed the `vida/tamagui-themes` emitter to reference the semantic base-theme keys
  (`light.<k>`/`dark.<k>`) per DS-1 spec:113 → dark inherits the overlay. Triaged (`/victor-triage`) +
  regression fixture + independent critique SHIP. @vida/ui 31/31. Diagnosis + F003 in known-failures.
- **DS-5 — Primitive contracts + component-token set** (LIF-85 In Progress · PR #7 merged, #6
  auto-closed). 10 contracts (Button·Input·Checkbox·Select·Card·Tabs·Menu·Dialog·Popover·Toast) — 7
  sections, §VIII 8-state matrix, B12-legal motion, §XIV a11y verbatim; + `component.json` full set (refs
  into DS-2 semantics), all dark-resolving. components-gate critique REVISE→4 fixed. Ships on the normal
  §XXVI gate (no token Visual Gate — see Decisions).
- **Triage of the DS-5 reasoning loop** — persisted `docs/specs/fixes/ds-5-visual-gate-scope-misread/` +
  memory. Zero implementation blast radius; deliverables verified sound.
- All PRs merged to `main` (#4, #5, #7); doc-currency committed (`afc89dc`). `main` @ `5a9e0f9`.

## Decisions Made
- **AR-9 = scaffold-only** (throw `SyncNotActivated`); table/enqueue=DB-6, HLC/columns=DB-2,
  transport/merge/yjs=AR-9b/M4 (ADR-003 §8 + ADR-017).
- **F003 fix at the pipeline root (DS-1 emitter), not per-component in DS-5** — a per-component patch
  would mask a shared root cause.
- **DS-5 owns the full component-token set** (ds-2:54/:101) but authors **references, not values**; no
  built components.
- **No token Visual Gate for DS-5** — it makes references, not values; per the render table DS-5 is the
  Components/Storybook row, deferred to UI-1. (This was the loop: I flip-flopped by conflating
  component-token references with token-value authoring.)
- Contrast/scrim/danger-AA gaps flagged to DS-2/brand-pass, never fabricated.

## Open Questions
- DS-5 LIF-85 kept **In Progress** (Victor's call) though work is merged — component Visual Gate is UI-1's.
- Two couplings fenced to **UI-1**: register the 9 new `light_/dark_<Comp>` sub-themes in
  `tamagui.config.ts`; resolve danger-AA / scrim values at the brand pass.

## Failures This Session
- **F003** — component sub-themes not dark-resolving (STRUCTURAL, emitter). Resolved + regression fixture.
  Written to `.claude/knowledge/failure-patterns/known-failures.md`.
- **Reasoning loop (non-code)** — token-ref vs token-value conflation → Visual-Gate flip-flop +
  over-reaction (halted temp-toggle). Diagnosed `docs/specs/fixes/ds-5-visual-gate-scope-misread/`;
  memory `dont-conflate-token-refs-with-values-for-visual-gate`. Zero code blast radius.

## Next Session
First step: **UI-1 — Vida UI primitives** (`#27`, ← DS-5) — build the components against DS-5's contracts;
carries the component Visual Gate (Storybook, 8 states) + the `tamagui.config` sub-theme registration.
Context to reload: `docs/specs/components/ds-5-primitive-contracts/` (the contracts UI-1 implements),
`packages/ui/src/{tamagui.config.ts,themes/themes.ts}`, `frontend-visual-gate.md` (UI-1 runs the Storybook gate).
