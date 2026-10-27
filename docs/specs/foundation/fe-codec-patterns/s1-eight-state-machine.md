# fe-codec-patterns · S1 — The 8-state machine (PLAN + spec, §XXVI gate)

> **Slice:** S1 of 5 (slice-map.md) · **Plane:** `apps/web` logic (EXTENDs ux-4) · **Gate:** Verification (pure logic,
> no chrome — the ux-4 precedent) · **Branch:** `worktree-fe-codec-patterns`.
> **Grounds:** interpretation.md §6 (R1) + §6-tails · seam-contract.md §A · state-conventions.md:30-99 ·
> apps/web/src/state-conventions/terminal-state.ts · apps/web/src/command-bar/types.ts:62-73 + search-provider.ts.

## §0. Context (BASELINE — current ground truth)

ux-4 ships `apps/web/src/state-conventions/terminal-state.ts`: re-exports the `@vida/core` canon
(`TERMINAL_STATE = ['loading','empty','error','success']`, `TerminalState`) + the structural `QueryResultLike<T>` +
the `isPending`-first `deriveTerminalState<T>(result, isEmpty)` [FACT: terminal-state.ts:18-58]. No barrel — import
specific files [FACT: state-conventions/CLAUDE.md "No barrel"]. The 8-state superset is declared nowhere as a reusable
machine; ux-2's `SearchStatus` is a **flat 7-member union with no collapse fn** [FACT: command-bar/types.ts:62-73].

## §1. What S1 is / is not

**Is:** the input-bearing **`InteractionState`** superset (the `decomposition.md:39` list) + a **total collapse map**
`→ TerminalState` + **`deriveInteractionState`** (extends `deriveTerminalState` with the input dimension) + the
**canonical state→primitive render mapping** (extends state-conventions.md §3). Pure logic, in
`apps/web/src/state-conventions/interaction-state.ts`.

**Is not:** any new canon (reuses `@vida/core` — R1); any rendering/component (that's S2–S4); any `@vida/types`
consolidation (deferred, canon owner's job — O3); re-homing ux-2 `SearchStatus` (O3).

## §2. Business rules (invariants — the critique/acceptance check against these)

- **BR-S1-1 Reuse the canon.** `InteractionState`'s terminal members and the collapse TARGET are `@vida/core`'s four
  literals, imported via `terminal-state.ts`. No 5th un-unified copy [FACT: state-conventions.md:40,49-52].
- **BR-S1-2 The superset is exactly the doc list.** `INTERACTION_STATE = ['idle','typing','loading','results','empty','unavailable','error','success']` — the `decomposition.md:39` set, no more, no less.
- **BR-S1-3 Collapse is TOTAL and grounded.** `collapseToTerminal` is defined for all 8; each row grounded in
  state-conventions.md:44-47 "each maps back" + the member's documented semantics (§3 below). Enforced by an
  **exhaustive `switch` with a `never` default** — gives compile-time totality AND stays index-safe under the planned
  `noUncheckedIndexedAccess` (a `Record<InteractionState,TerminalState>` is totality-checked on write but reads as
  `T | undefined` under that flag — avoid it) [FACT: engineering.md §XV; .claude/tasks: tsconfig-strict-index-access planned].
- **BR-S1-4 Precedence preserved.** `deriveInteractionState` keeps `deriveTerminalState`'s `isPending`-first /
  `isError`-before-data precedence for its terminal dimension [FACT: terminal-state.ts:50-57].
- **BR-S1-5 Purity + portability.** No React, no `@tanstack/react-query` import — structural `QueryResultLike<T>`
  only (RN-portable, the ux-4 rule) [FACT: terminal-state.ts:27-31; CLAUDE.md "Pure + portable"].
- **BR-S1-6 No barrel.** New file imported directly; re-export the ux-4 canon through it for one import point, matching
  the existing `terminal-state.ts` re-export of `@vida/core` [FACT: CLAUDE.md "No barrel"; terminal-state.ts:18].
- **BR-S1-7 Degrade, never crash.** The render mapping (§3) names a renderer for every state; the collapse guarantees a
  capability that declared only the 4 canonical renderers still resolves [FACT: state-conventions.md:39,44].

## §3. The design (collapse map · deriver · render mapping)

**`InteractionState`** = the 8-member union (BR-S1-2).

**Collapse map** (BR-S1-3 — total; each row grounded):
| InteractionState | → TerminalState | grounding |
|---|---|---|
| `loading`/`empty`/`error`/`success` | itself | the four canonical [state-conventions.md:34] |
| `typing` | `loading` | a query is forming/in-flight — not-yet-resolved work [state-conventions.md:44-47 semantics] |
| `results` | `success` | content present (the search analogue of success) [command-bar/types.ts:67] |
| `unavailable` | `error` | fail-loud; generalizes `search-unavailable` (a loud terminal state, never blank) [search-provider.ts:2; command-bar CLAUDE.md:28] |
| `idle` | `empty` | nothing requested yet → no content to show; the nearest no-content canonical renderer for the degrade fallback. (A surface with a richer idle affordance — e.g. the command bar's recent-searches — renders its own idle; the collapse is only the degrade fallback, state-conventions.md:44.) [search-provider.ts:12-14] |

**`deriveInteractionState<T>(result, isEmpty, input?)`** — precedence:

1. if `input` present and `input.query === ''` → `idle` (nothing requested yet). **Keyed on the empty query ALONE, not
   focus** — the ground truth keys only on a blank query [FACT: search-provider.ts:12-14 `emptyQueryOutcome`]. (An
   unfocused blank input is still `idle` — gating on focus would misclassify it as `loading`/`empty`.)
2. if `input` present and `result.isPending && input.query !== ''` → `typing` (query in flight) — else fall through.
3. else delegate the terminal dimension to `deriveTerminalState(result, isEmpty)` (`loading`/`error`/`empty`/`success`),
   then, for an input surface with a non-empty query, remap a non-empty `success` → `results` (surface-semantic alias).

**`unavailable` ingress (producer path — NOT the result-deriver).** `unavailable` is a **provider verdict** ("this
capability isn't available", generalizing `search-unavailable`), not derivable from `isError` (which → `error`). So a
surface whose provider returns a status (the `SearchOutcome.status` shape) feeds that status **straight to
`collapseToTerminal` + the render map, bypassing `deriveInteractionState`** [FACT: search-provider.ts:2,6; command-bar/types.ts:71-73].
The deriver therefore emits 7 of 8 by design; `unavailable` enters only via the producer path. Both paths are first-class.

> **Pinned at IMPLEMENTATION-PLAN** (not open design): the exact `typing` trigger — `isPending` is the fixed fallback,
> but whether `typing` distinguishes "user still entering (debounce)" from "fetch in flight" is ratified there; both
> collapse to `loading` regardless, so this never affects the degrade contract.

**Render mapping** (extends state-conventions.md §3 — seam-contract §A table): `idle`/`typing`→input affordance;
`loading`→skeleton recipe §3.1 + `aria-busy`; `results`/`success`→content; `empty`→`EmptyState` (S3);
`error`/`unavailable`→inline error card + retry + `aria-live="assertive"` [FACT: state-conventions.md:78-99].

## §4. Acceptance (Verification Gate — pure logic, no Visual Gate, the ux-4 precedent)

- [ ] `INTERACTION_STATE` = the exact 8-member doc list; `InteractionState` derived from it (BR-S1-2).
- [ ] `collapseToTerminal` is an exhaustive `switch` (a removed case fails `tsc` via the `never` default); test asserts
      every member → a valid `TerminalState`; the 4 canonical → themselves; `typing→loading`, `results→success`,
      `unavailable→error`, `idle→empty` (BR-S1-3).
- [ ] `deriveInteractionState` preserves `isPending`-first / `isError`-before-data; a non-input call === `deriveTerminalState`
      lifted (parity test); `idle` keys on `query===''` ALONE (test: unfocused blank query → `idle`, not `empty`/`loading`);
      idle/typing/results only arise with the `input` arg; `unavailable` is NEVER emitted by the deriver (producer-path only) (BR-S1-4).
- [ ] No `@vida/core` re-declaration (grep: the 4 literals appear only via import); no React/react-query import (BR-S1-1/5).
- [ ] `tsc --noEmit` 0; `eslint` 0; `apps/web` full suite green (+ the new `interaction-state.test.ts`).
- [ ] state-conventions.md §3 extended with the 3 added states' render convention (doc currency, §XXIX).

## §5. Implementation prompt (type-first order)

1. `apps/web/src/state-conventions/interaction-state.ts`:
   - `import { type TerminalState, TERMINAL_STATE, type QueryResultLike, deriveTerminalState } from './terminal-state'`
     (re-export them through this file too — BR-S1-6 one import point).
   - `export const INTERACTION_STATE = [...] as const` + `export type InteractionState`.
   - `export function collapseToTerminal(s: InteractionState): TerminalState` — an **exhaustive `switch`** returning the
     canonical state per the §3 table, with `default: { const _x: never = s; return _x }` for compile-time totality
     (index-safe under `noUncheckedIndexedAccess`; BR-S1-3).
   - `export function deriveInteractionState<T>(result, isEmpty, input?): InteractionState` per §3.
   - `export const INTERACTION_RENDER` (or doc-only) — the state→primitive mapping as typed data for surfaces.
2. `apps/web/src/state-conventions/interaction-state.test.ts` — the §4 assertions (totality, precedence, parity, grep-guard).
3. Update `docs/core/architecture/state-conventions.md` §1/§3 — note the superset + the 3 added states' render convention
   (§XXIX currency; promote BR-S1-_ into `current-_` if the context carries them).
4. `apps/web/src/state-conventions/CLAUDE.md` — add `interaction-state.ts` to "What lives here".

**On divergence:** §XXVIII. **Done:** §4 all checked → Verification Gate PASS → S1 commit → loop to S2.
