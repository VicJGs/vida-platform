# fe-codec-patterns — Seam Contract (Decomposition Gate, Step 2)

> The API this codec exposes to **surfaces** (every `fe-*` unit inherits it) and to **apps/web**. Boundary governed by
> BR-2: **`@vida/ui` renders (state/status as a prop, structurally typed); `apps/web` imports the `@vida/core` canon,
> derives, and owns the app-coupled conventions** [FACT: packages/ui/src/CLAUDE.md:125; list-view.tsx:34-35; interpretation R2].

## A. The 8-state machine — `apps/web/src/state-conventions/` (EXTENDs ux-4)

```ts
import { type TerminalState, TERMINAL_STATE } from '@vida/core' // reuse the canon — never a 5th copy (R1)

// the input-bearing SUPERSET (generalizes ux-2 SearchStatus into the codec)
export const INTERACTION_STATE = [
  'idle',
  'typing',
  'loading',
  'results',
  'empty',
  'unavailable',
  'error',
  'success',
] as const
export type InteractionState = (typeof INTERACTION_STATE)[number]

// TOTAL collapse to the canon — the fail-loud/degrade contract (state-conventions.md:44-47). This map is NET-NEW logic
// (ux-2 SearchStatus is a flat 7-member union with NO collapse fn — command-bar/types.ts:62-73). Authored at S1 grounded
// in the "each sub-state maps back" rule + SearchStatus semantics: typing→loading · results→success · unavailable→error ·
// {loading,empty,error,success}→themselves · idle→the documented pre-state. No-Guessing: ground each row, don't assume.
export function collapseToTerminal(s: InteractionState): TerminalState

// derive an InteractionState from a React-Query result + the input dimension (extends deriveTerminalState,
// isPending-first precedence preserved). Structural QueryResultLike<T> — no @tanstack import, RN-portable.
export function deriveInteractionState<T>(
  result: QueryResultLike<T>,
  isEmpty: (data: T) => boolean,
  input?: { focused: boolean; query: string }, // drives idle/typing/results for input surfaces
): InteractionState

export { TERMINAL_STATE, type TerminalState, deriveTerminalState } from './terminal-state' // ux-4, unchanged
```

- **Surfaces** derive with `deriveInteractionState` (input surfaces) or the existing `deriveTerminalState` (plain reads),
  then render the matching `@vida/ui` primitive. A surface **never** invents a state outside the machine (G2 WRONG).

### The canonical state → primitive render mapping (so the codec doesn't leak — authored at S1, extends state-conventions §3)

One mapping every surface follows instead of re-deciding:

| InteractionState        | renders                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `idle` / `typing`       | the input affordance itself (no overlay state)                            |
| `loading`               | the skeleton recipe (state-conventions §3.1), `aria-busy`                 |
| `results` / `success`   | content                                                                   |
| `empty`                 | `EmptyState` (S3)                                                         |
| `error` / `unavailable` | inline error card + retry (state-conventions §3), `aria-live="assertive"` |

[FACT: state-conventions.md:78-99 §3 — the 4-canonical table this extends.]

## B. Rendering primitives — `@vida/ui` (state/status as a PROP; no `@vida/core` edge)

```ts
// S3 — EmptyState: the teaching-invitation empty (R3). Presentational; composed when the derived state is 'empty'.
interface EmptyStateProps {
  title: string // what this is (sentence-case, VoiceCopy)
  children?: ReactNode // teaching body — why it's empty / what living here looks like
  action?: ReactNode // the primary way in (slot — composition over config, §VII)
  guidedSetup?: ReactNode // optional, opt-in — never a wall
  // no `state` prop: EmptyState IS the 'empty' render; the surface chooses to mount it
}

// S4 — SyncStatus + HonestProgress (R4). M1 copy is on-device-honest; cross-device states are a deferred seam.
// ⚠ The M1 state SET is grounded at the S4 spec (state-conventions.md:102-108 BR-RT-4 + data-flow §7 + P4), NOT assumed:
// local writes invalidate-and-reread (<10ms, no optimistic patching) + "no fake spinners" → a 'saving' chiplet is likely
// NOT honest. Probable set below; the spec ratifies it. No-Guessing — don't ship 'saving' without grounding it.
type LocalSyncState = 'saved' | 'error' // M1 on-device only — NO cross-device claim (P4/M3 seam); S4-ratified
interface SyncStatusProps {
  state: LocalSyncState
  label?: string
} // calm chiplet; aria-live polite
interface HonestProgressProps {
  value?: number // 0..1 determinate; omit → indeterminate (genuinely-unknown only — no fake spinner)
  label: string // honest op name ("Rebuilding search index…")
  indeterminate?: boolean
}

// S2 — ReducedMotion: the B12 enforcer (R5).
function usePrefersReducedMotion(): boolean
interface ReducedMotionProps {
  children: ReactNode /* animated vs instant alternative */
}
function ReducedMotion(props: ReducedMotionProps): JSX.Element
```

- All three take their state/status **as a prop** and compose ui-1 primitives + theme `$`-tokens; **no derivation, no
  `@vida/core` import** (BR-2). Exported via the `@vida/ui` `index.ts` barrel (DS components).

## C. App conventions — `apps/web` (S5)

```ts
// ReachabilityRegistry — the ≥2-path hard floor as a runtime registry (R6)
type ReachPath = 'dock' | 'command-bar' | 'contextual' | 'link' | 'spaces'
function registerReach(capabilityId: string, path: ReachPath): void
function assertReachable(capabilityId: string): void // throws below the ≥2 floor (fail-loud)
function getReach(capabilityId: string): readonly ReachPath[]

// ProviderRead — cross-module reads go through a provider seam, never a raw cross-module table (R7).
// HONEST teeth: a `() => Promise<T>` can't itself forbid a table handle. M1 enforcement = CONVENTION + the fact that the
// real boundary is the backend provider methods (getDayBooksDigest, dueIn, …) being the only exposed cross-module reads
// (like VoiceCopy is a lint, not a compiler). S5 decides whether to add a branded ProviderFn type for compile-level teeth.
function useProviderRead<T>(key: QueryKey, providerFn: () => Promise<T>, opts?): UseQueryResult<T>

// VoiceCopy — voice constants + the honesty lint (R8)
export const VOICE: { tone: readonly string[] /* plain·calm·honest·warm·yours */; case: 'sentence' }
interface CopyIssue {
  rule: 'overclaim' | 'blame' | 'dead-end' | 'zk-sync-claim'
  message: string
  at: string
}
function lintCopy(text: string): CopyIssue[] // dev-time; flags overclaim/blame/dead-end + any ZK-sync claim pre-M3
```

## Consumption

- **Surfaces (every `fe-*`):** derive an `InteractionState` (A) → render the matching primitive (B); wrap animations in
  `ReducedMotion`; read cross-module data via `useProviderRead` (C); register their reach paths (C); run copy through
  `lintCopy` (C). **No surface re-implements a state, a skeleton, an empty, a sync chip, or a cross-module table read.**
- **ux-2 command bar:** its `SearchStatus` is the pre-existing instance of the superset — it may later re-express over
  `InteractionState`, but **this unit does not re-home it** (O3; a same-shape migration is the canon owner's call).

## Invariants (contract-level)

- **Reuse the canon** — the machine imports/mirrors `@vida/core`'s four literals; no 5th un-unified copy (R1).
- **Collapse is total** — every `InteractionState` maps to exactly one `TerminalState` (degrade, never crash).
- **State is a prop across the boundary** — `@vida/ui` never derives; `apps/web` derives + passes (BR-2).
- **Honest copy** — no cross-device/ZK-sync claim in M1; `SyncStatus` is on-device-honest; `lintCopy` enforces it.
- **Reduced-motion** — instant alternative; animate transform/opacity/clip-path only (B12).
- **≥2 reachable paths** — `assertReachable` is a hard floor, not a warning.
- The codec holds **no module data** and reads **no cross-module table** directly — provider seams only (R7).
