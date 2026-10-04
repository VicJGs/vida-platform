# fe-codec-patterns — Slice Map (Decomposition Gate, Step 2) · Decide-mode

> **Unit grain is doc-fixed** (Tier-0 §1.3 pattern-kit, G5 unit #2) [FACT: decomposition.md:36-40; g6-reshape-runbook.md:32];
> the **internal slicing below is proposed** (Decide-mode — no doc fixes sub-slices). Plane per slice noted.
> Grounds: interpretation.md §6 (R1–R8) · state-conventions.md · packages/ui/src/{components,internal} · the BR-2 boundary.

## The pieces this codec adds (interpretation §0 / R1–R8), and their home (R2 = the BR-2 boundary)

| Piece | Kind | Home | Gate |
|---|---|---|---|
| 8-state machine (type + collapse map + input deriver) | canon-importing logic | `apps/web` (EXTEND ux-4) | Verification |
| `ReducedMotion` | motion contract — **ALREADY ENFORCED (RATIFY)** | `@vida/ui` (`useReducedMotion` + `@media` conv.) | — (doc ratify) |
| `EmptyState` | rendering primitive (state-as-prop) | `@vida/ui` | Visual |
| `SyncStatus` + `HonestProgress` | rendering primitives | `@vida/ui` | Visual |
| `ReachabilityRegistry` · `ProviderRead` · `VoiceCopy` | pure app conventions/logic | `apps/web` | Verification |

> Why the split: **`@vida/ui` cannot import `@vida/core`** → rendering primitives take state/status **as a prop**
> (structurally typed, the `ViewState`/`list-view` precedent); the canon-importing deriver + the app-coupled conventions
> live in `apps/web` [FACT: packages/ui/src/CLAUDE.md:125; list-view.tsx:34-35; interpretation R2].

## Slices

### S1 — The 8-state machine (the vocabulary every other piece speaks) · `apps/web` (EXTEND ux-4) · logic
**Does:** extend `apps/web/src/state-conventions/` with the **input-bearing superset** `InteractionState`
(the `decomposition.md:39` list: `idle·typing·loading·results·empty·unavailable·error·success`), the **total collapse map**
`→ @vida/core TerminalState` (**net-new logic** — SearchStatus is a 7-member union with no map; author each row grounded
in state-conventions.md:44-47 + SearchStatus semantics, interpretation §6-tail), and `deriveInteractionState(...)`
extending the `isPending`-first `deriveTerminalState` with the input dimension. **Reuses the `@vida/core` canon — authors
no new canon** (R1). **Also authors the canonical state→primitive render mapping** (extends state-conventions §3 for the 3
added states — so surfaces get ONE mapping; interpretation §6).
**Touches:** `state-conventions/interaction-state.ts` (+ test); re-export alongside `terminal-state.ts` (no barrel, §XX);
the §3 render-mapping note in `docs/core/architecture/state-conventions.md`.
**Invariants:** reuse-the-canon (no 5th copy); collapse is total; `isPending`/`isError` precedence preserved.
**Done when (Verification Gate — pure logic, no render, the ux-4 precedent):** unit tests prove the collapse map **total**
(all 8 covered) + the documented semantics (`typing`→`loading`, `results`→`success`, `unavailable`→`error`) + precedence;
`tsc` 0; `apps/web` tests green. *(No Visual Gate — no chrome, like ux-4.)*

### S2 — `ReducedMotion` · `@vida/ui` · **RATIFY (no net-new component; Victor-confirmed 2026-10-04)**
**Why RATIFY:** the B12 enforcer already exists and covers every animation (interpretation §5 W2-CORRECTED / §6 R5):
- **JS-driven** — `useReducedMotion()` (exported) gates the Tamagui `animation` prop (`animation={reduced ? undefined : …}`);
  live in `button.tsx`, `app-shell.tsx`, `onboarding.tsx` [FACT: packages/ui/src/hooks/use-reduced-motion.ts].
- **CSS-driven** — `@media (prefers-reduced-motion: reduce)` reading `motion.ts` in every animating `*-styles.ts`
  (card/tabs/menu/dialog/popover/select/toast/interaction), transform/opacity-only [FACT: internal/card-styles.ts:32; CLAUDE.md:220-233].
A `@vida/ui`+`apps/web` sweep found **zero unguarded animation**. A new `<ReducedMotion>` wrapper would duplicate the
hook + fit Tamagui's prop/style-driven animation worse → over-engineering.
**Does:** name this the codec `ReducedMotion` primitive + document the two patterns so downstream `fe-*` **inherit, not
reinvent** (a short note in `packages/ui/src/CLAUDE.md` / the delivery docs). **No new component, no new test, no code.**
**Done when:** the pattern is named + documented; the existing enforcement is confirmed complete (sweep = 0 unguarded).
*(No Visual Gate — nothing new rendered; the existing primitives already Visual-Gate + unit-test their reduced-motion.)*

### S3 — `EmptyState` (teaching-invitation) · `@vida/ui` · rendered
**Does:** a presentational **teaching empty state** — headline + teaching body (what it is, why it's empty) + a
**primary action slot** (the way in) + an **optional guided-setup slot** (opt-in, never a wall). Never a blank region,
never "No data available". Composes ui-1 `Button`; copy obeys VoiceCopy (S5); honours `ReducedMotion` (S2) for any
entrance [FACT: state-conventions.md:81; frontend-quality-bar/_index.md:84 P5; p5 specimen:154-166].
**Touches:** `packages/ui/src/components/empty-state.tsx` (+ test + stories); `index.ts`.
**Done when (Visual Gate):** teaching empty + primary-action + opt-in guided-setup render; default state; light/dark ×
375/768/1440; a11y (heading + focusable action) swept; `tsc` 0; tests green against the p5 specimen.

### S4 — `SyncStatus` + `HonestProgress` · `@vida/ui` · rendered
**Does:** a **calm, never-alarming** local-first status **chiplet** + an **honest progress** (determinate/indeterminate)
for genuinely-slow local ops (FTS rebuild, export, vault unlock). **M1 copy is stage-honest** — it reflects *on-device*
persistence only, **never claims cross-device sync** (that + the `/sync` page + chip/page/on-change/hidden presentation
are deferred seams: fe-sync-log #21 / M3) [FACT: frontend-quality-bar/_index.md:50-51 §2.6, 79-82 P4; p5 specimen:197; interpretation O1-O2].
> **The honest M1 state SET is grounded at the spec, not assumed here.** Local writes invalidate-and-reread (<10ms, no
> optimistic patching) and the bar forbids fake spinners — so a `'saving'` chiplet is probably NOT honest; the likely M1
> set is `'saved'` (on-device) + `'error'`, with `HonestProgress` carrying genuinely-slow ops. Resolve the exact set at
> the S4 spec against `state-conventions.md:102-108` (BR-RT-4) + `data-flow.md §7` + P4 — No-Guessing, don't invent `'saving'`.
**Touches:** `packages/ui/src/components/sync-status.tsx` (+ test + stories); `index.ts`.
**Done when (Visual Gate):** calm status + honest progress (both modes) render; no fake spinner (determinate where known);
copy carries no sync overclaim; light/dark × 375/768/1440; a11y (`aria-live` polite, `aria-busy`); `tsc` 0; tests green.

### S5 — The convention layer: `ReachabilityRegistry` · `ProviderRead` · `VoiceCopy` · `apps/web` · logic
**Does:** the three pure conventions (one cohesive logic slice, the ux-4 terminal-state+keyboard precedent):
- **`ReachabilityRegistry`** — register a capability's reach paths (dock · ⌘K · contextual/`[[link]]` · M1.1 Spaces) +
  `assertReachable` the **≥2-path hard floor**; the runtime companion to the G4 set-cover [FACT: quality-bar:46-47 §2.4, 84 P5].
- **`ProviderRead`** — the typed convention + hook shape for cross-module reads via a **provider seam** (React Query over
  a backend provider method); direct cross-module table reads are forbidden [FACT: quality-bar:27; decomposition.md:66,84].
- **`VoiceCopy`** — the `VOICE` constants (plain·calm·honest·warm·yours·sentence-case) + a `lintCopy` honesty check
  (overclaim→staged-honest; blame→teach; dead-end→anti-lost; **never ZK-sync before M3**) [FACT: quality-bar:41-43 §2.1-2.2; p6-voice-coherence-specimen.html].
**Touches:** `apps/web/src/{reach/reachability-registry.ts, providers/provider-read.ts, voice/voice-copy.ts}` (+ tests).
**Done when (Verification Gate):** `assertReachable` fails a 1-path capability + passes ≥2; `ProviderRead` type forbids a
raw table handle (compile-level); `lintCopy` flags the 3 honesty violations + the ZK-sync overclaim; `tsc` 0; tests green.

## Dependency order
S1 (vocabulary) → **S2 (ReducedMotion = RATIFY, doc-only)** → S3 (EmptyState) → S4 (SyncStatus) → S5 (conventions).
S3/S4 "honour `ReducedMotion`" = they use the already-ratified `useReducedMotion` hook / `@media` convention (nothing new
from S2 to wait on). S5 may run anytime after S1; sequenced last to keep the rendered-primitive Visual Gates contiguous.

## Out of scope (interpretation O1–O4; doc-verified)
- **The `/sync` page** + multi-device compare + chip/page/on-change/hidden presentation switch → `fe-sync-log` #21 / M3 (O1-O2).
- **The `@vida/types` canon consolidation** (unify the 3 copies) → deferred, the `@vida/core` canon owner's job, NOT this unit (O3) [FACT: state-conventions.md:49-52].
- **Per-module reach *wiring*** (each module's actual dock/⌘K/link entries) → the modules' M1.2.2+ job; S5 ships the registry + the floor, not the entries (O4).
- **The theme/density switcher UI** → already out (fe-codec-theme / Settings).

## Envision coverage (gate SATISFIED — interpretation §8; no per-slice re-greybox)
Each P4/P5/P6 `structural` fact maps to a slice: teaching-invitation empty → S3; honest sync/progress → S4; voice +
honesty → S5 (+ copy in S3/S4); reduced-motion → S2; ≥2-paths → S5; the 8-state machine (the "state outside the machine
is WRONG" bar) → S1. The p4/p5/p6 specimens are the Visual-Gate reference at S2–S4.
