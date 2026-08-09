# Baseline — UX-4 State Conventions (Step 0 ground truth · 2026-08-09)

> The No-Guessing floor the PLAN builds on. Every claim is `[FACT: src]` (verified on disk) /
> `[INTERP: from fact]` / `[UNKNOWN]`. Produced by the `add-frontend-component / Default` Step-0 baseline +
> Step-1 pattern read. Grounds [`sessions/PLAN-2026-08-09-ux-4-state-conventions.md`](sessions/PLAN-2026-08-09-ux-4-state-conventions.md).

## §1 — The issue
UX-4 (`#24`, LIF-93, ← UX-1 ✅) sets the **interaction-state conventions every screen follows**: empty / loading /
error / skeleton patterns, optimistic-update behaviour, and the keyboard model — "defined once so no module reinvents
what loading looks like." `[FACT: .claude/tasks/ux-4-state-conventions.md; reconstructed-structure.md:81]`
Profile **add-frontend-component**, authority **STANDARDS engineering.md + §XXII DoD**, Home **`apps/web/src`,
`packages/ui`**. `[FACT: m1.0-delivery-plan.md:211]`

## §2 — The state plane is CURRENT (no `current-*` refresh needed)
`docs/infrastructure/web-client-runtime/current-{spec,business-rules}.md` match the code verbatim for the mechanism
UX-4 sits atop:
- `apps/web/src/lib/query-client.ts` — RQ singleton (`staleTime 30s · gcTime 5m · retry 1 · refetchOnWindowFocus false`). `[FACT]`
- `apps/web/src/lib/forms.ts` — `useZodForm` (Zod → `validators.onChange`). `[FACT]`
- `apps/web/src/stores/{app-shell,command-bar}-ui-store.ts` — both follow BR-RT-6 (one store per feature, ephemeral UI only). `[FACT]`
- **Minor lag (not UX-4's to fix):** the current-spec `stores/` inventory omits `command-bar-ui-store` (a UX-2
  instance, rule unchanged) — a UX-2 currency lag, flagged not touched. `[FACT]`

## §3 — The terminal-state canon ALREADY EXISTS in code (reuse, do not redefine)
- **`packages/core/src/foundation/capability/types.ts:13`** — `export const TERMINAL_STATE = ['loading','empty','error','success'] as const`
  + `export type TerminalState`. **Exported from the `@vida/core` barrel** (`index.ts:124 export * from './foundation/capability'`). `[FACT]`
- `@vida/web` already depends on `@vida/core` + `@vida/types` (`apps/web/package.json:19-20`). So
  `import { TERMINAL_STATE, type TerminalState } from '@vida/core'` resolves today. `[FACT]`
- **Blast radius of the canon = capability foundation only** (types · registry · schema · tests · CLAUDE). Not
  consumed elsewhere in code yet → UX-4 is its **first web consumer**. `[FACT: grep]`

## §4 — The rules UX-4 must inherit (already decided)
| Piece | Authority | Rule |
|-------|-----------|------|
| Per-render-target declaration | CB6 / `capability/current-business-rules.md:13` (BR-4); registry `MissingTerminalStates` | every render target declares all four `[FACT]` |
| ADR mandate | ADR-007:91 · ADR-008:142 | terminal states are a declared ADR requirement — **the same four** `[FACT]`. (ADR-009:108 declares a *different* set — `in-progress/success/partial-failure`, an instantiation lifecycle — NOT the four; excluded.) |
| Result→state derivation | `spaces/current-spec.md:29` — `ViewEngine.resolve()` returns `loading\|empty\|error\|success`, "degrade, never throw/drop" | the mapping pattern is already implemented — **but over its own local `ViewState`** (`views/types.ts:29`), NOT the shared `TerminalState`. Conceptual parallel, not code reuse. `[FACT]` |
| Optimistic | `data-flow.md:427` / BR-RT-4 | **no optimistic updates by default** (local reads <10 ms → invalidate-and-reread) `[FACT]` |
| State plane | `data-flow.md §7` (code examples `useTasks` / `task-ui-store`) | RQ = DB data · Zustand = ephemeral UI, no overlap `[FACT]` |
| Skeleton | `performance-strategy.md:144` | "Sections show skeleton loaders until their data arrives" `[FACT]` |
| Keyboard model | engineering §XIV + `command-bar-and-search.md §3` (focus contract) + `resolveKeybind` (keybind-as-data, D5) | focus-at-transitions, Esc-closes, arrows-in-composites, keybind-as-data — established `[FACT]` |
| Fail-loud precedent | `command-bar/types.ts:62` — `SearchStatus` (a superset of the canon) | per-surface unions extend the four `[FACT]` |
| Primitive loading stance | UI-1 DEF-register U5-a/U5-f | containers have **no `loading` prop**; loading is consumer-composed (skeleton children + `aria-busy`); the standalone `Skeleton` was SUPERSEDED (U5-a, `DEF-register:39`). **UX-4 COMPOSES this model — it builds no new primitive** (state-conventions logic, engineering-gated, NOT visual-gated per `frontend-visual-gate.md:23`). `[FACT]` |

## §5 — The sibling deliverable pattern (UX-1 · UX-2 · UX-3)
A UX convention issue ships **doc + declarative artifact**, no rendered component:
- Home dir `apps/web/src/<name>/` = central DATA/logic only, no JSX (`nav/`, `command-bar/`, `shell/`). `[FACT]`
- Typed model (discriminated unions + `const` maps + pure predicate/derivation fns, deps injected) +
  reserved contract/seam for the UI-4 renderer. `[FACT: regions.ts; types.ts; module-map.ts]`
- Companion arch doc `docs/core/architecture/<name>.md` + layer `CLAUDE.md` + colocated `*.test.ts`. `[FACT]`
- Invariants: data-not-chrome · no barrel `index.ts` (§XX) · apply-the-authority-never-invent · typed seams for
  unbuilt systems · reserved contract not store mutation · fail-loud terminal states · cite `[FACT: file:line]`. `[FACT: shell/CLAUDE.md; nav/CLAUDE.md; command-bar/CLAUDE.md]`
