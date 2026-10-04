# State Conventions

The interaction-state conventions every Vida web screen follows: the four terminal states (loading / empty / error /
success), how a React Query result derives to one, how each is presented, the optimistic-update stance, and the
keyboard model. Defined **once** so no module reinvents "what does loading look like" — consistency is a decision made
here. This is the **experience-track state layer** (UX-4, LIF-93); it builds on the state plane (AR-4) and reuses the
platform terminal-state canon.

**Audience:** All developers and agents building any web read/write surface. Read after `data-flow.md §7`.

**Governs:** how a surface maps its data to a terminal state and presents it, plus the app-wide keyboard/focus
contract. The code artifact is `apps/web/src/state-conventions/{terminal-state.ts, keyboard.ts}` (central logic; not
chrome). Rendering is owned by UI-4 and each module (M1.1+).

**Content Source:** `@vida/core` `TerminalState` canon (`foundation/capability/types.ts`, ADR-008 CB6 / R5) · `data-flow.md §7`
(React Query / Zustand state plane; BR-RT-1..7) · `performance-strategy.md §5` (skeletons, cache) · `standards/engineering.md §XIV`
(keyboard/focus/aria) + §XIII (CLS) — the authority `[FACT: m1.0-delivery-plan.md:211]`. Full derivation + gates:
`docs/specs/foundation/ux-4-state-conventions/`.

> **Scope (what this is NOT):** not the state-plane *mechanism* (AR-4 — this consumes it); not any new `@vida/ui`
> *primitive* (UX-4 composes UI-1's existing primitives + the consumer-composed skeleton model — it builds no
> component and runs no Visual Gate); not per-module hooks/loading UIs (each module's M1.1+ wave composes these
> conventions); not the command-bar keyboard *grammar* (UX-2 — this references its focus contract); not the sync/
> optimistic *engine* (M4). This doc DEFINES the conventions; modules + UI-4 apply them.

---

## 1. The terminal-state model — reuse the canon

Every data surface's status **is** a `TerminalState` — the four canonical states, imported from `@vida/core`:

```ts
// packages/core/src/foundation/capability/types.ts
export const TERMINAL_STATE = ['loading', 'empty', 'error', 'success'] as const
export type TerminalState = (typeof TERMINAL_STATE)[number]
```

These are the **same four** the capability registry mandates every render target declare (CB6 / BR-4,
`MissingTerminalStates`) and that the `ViewEngine.resolve` degrade contract emits ("degrade, never throw/drop"). The
principle across all of them: **degrade, never crash.** The web layer reuses this canon (`import { TerminalState }
from '@vida/core'`) rather than defining its own — so the frontend, the capability registry, and the view engine
speak one vocabulary.

> **A surface MAY extend** with surface-specific sub-states, but each sub-state **maps back** to one of the four for
> the fail-loud/degrade contract. The worked example already in the codebase is the command bar's `SearchStatus`
> (`idle · typing · loading · results · empty · search-unavailable · error`) — a superset whose members each collapse
> to one canonical state.
>
> **Known duplication (deferred).** The four literals are currently declared **three times, un-unified**:
> `TerminalState` (capability), `ViewState` (views engine), `SearchStatus` (command bar). A future consolidation into
> a shared `@vida/types` vocabulary belongs to the canon's owner — UX-4 imports the `@vida/core` canon and does not
> re-home it.

> **The codec 8-state machine (fe-codec-patterns S1, LIF-211).** `apps/web/src/state-conventions/interaction-state.ts`
> ships the reusable **`InteractionState`** superset `idle · typing · loading · results · empty · unavailable · error ·
> success` — the generalized form of `SearchStatus`, so every input-bearing surface shares ONE vocabulary.
> `collapseToTerminal` maps all 8 **back to the four canon literals** (total, exhaustive `switch`): `typing`→loading,
> `results`→success, `unavailable`→error, `idle`→empty, the four → themselves. `deriveInteractionState(result, isEmpty,
> input?)` extends `deriveTerminalState` with the input dimension (`idle` keyed on an empty query ALONE; `typing` on a
> pending non-empty query; a non-empty `success` → `results`). `unavailable` is a **producer verdict** (fed from a
> provider's status, like `search-unavailable`), never derived. Still a reuse of the `@vida/core` canon — **no new
> canon, no `@vida/types` consolidation** (that remains the canon owner's deferred job).

## 2. The derivation — React Query result → terminal state

One rule maps a React Query result to a `TerminalState`, in **strict precedence** (`apps/web/src/state-conventions/terminal-state.ts`):

```ts
deriveTerminalState(result, isEmpty):
  if (result.isPending)        return 'loading'   // FIRST — closes the empty-vs-loading race
  if (result.isError)          return 'error'     // before data — error wins over a stale value
  if (result.data === undefined) return 'loading' // defensive + narrows T for isEmpty
  return isEmpty(result.data) ? 'empty' : 'success'
```

- **`isPending` first** is the crux: a first paint where `data` is still `undefined`/`[]` must read as **loading**,
  never flash **empty**. Checking pending before the empty predicate guarantees it.
- **`isError` before `data`**: React Query may retain a previous successful value on error (`placeholderData` /
  `keepPreviousData`); an error still resolves to **error** (fail-loud), not stale success.
- **`isEmpty` is injected** because "empty" is entity-shaped (`d => d.length === 0` for a list; a domain predicate
  otherwise). The `data === undefined` guard also narrows `T | undefined → T` so `isEmpty` receives a defined value.

This is conceptual parallelism with `ViewEngine.resolve` — the same four-state degrade shape, a distinct
implementation over React Query.

## 3. Presentation per state

| State | Convention |
|-------|-----------|
| **loading** | Skeleton placeholders **matching the settled content box so there is no layout shift on resolve** (CLS ≈ 0, §XIII) + `aria-busy` on the region. Never a bare spinner-blank. Composed per the recipe in §3.1 (there is no shared `Skeleton` primitive). |
| **empty** | A **guided** empty state — never a blank region: say what it is and offer the primary action to fill it. |
| **error** | An **inline error + retry affordance** (compose UI-1 `Card` + `Button`; the App-boot error+retry is the shipped precedent). **Retry calls React Query `refetch()` and re-enters `loading`** — it never stacks a second error over the first. The error message is `aria-live="assertive"`. |
| **success** | The content; no wrapper state; `aria-busy` cleared. On a **page-level navigation** that resolves, focus moves to the main heading / top-of-content (§XIV); a same-surface refetch does **not** steal focus. |

**The three added `InteractionState` states** (fe-codec-patterns S1 — for input-bearing surfaces; `renderKindFor` is the canonical map, `interaction-state.ts`):

| State | Convention |
|-------|-----------|
| **idle** | Nothing requested yet (empty query) — render the **input affordance itself**, no overlay state. A surface with a richer idle view (e.g. the command bar's recent/suggestions) renders that; degrade fallback = the **empty** convention above. |
| **typing** | A query in flight — render **as loading** (the skeleton/§3.1 recipe); collapses to `loading`. |
| **results** | Content present for a query — render **as success** (the content); collapses to `success`. |
| *(unavailable)* | Not a derived state — a **producer verdict** (a capability isn't available, e.g. `search-unavailable`); render **as error** (inline, loud, never a blank); collapses to `error`. |

### 3.1 Skeleton composition recipe (no shared primitive — compose by convention)

UI-1 deliberately **superseded** the standalone `Skeleton` (DEF-U5-a — "loading is consumer-composed children"), so
there is no shared component. To keep every module's skeleton identical, compose it from this recipe (the shipped
precedent is `packages/ui/src/components/card.stories.tsx:146-161`):

- A placeholder block = a Tamagui `View` sized to the **real content box** (so resolving causes no CLS).
- `backgroundColor` from the DS surface/neutral token (`$colorSurfaceSecondary`).
- `borderRadius` from the **radius scale** — `$md` (8) / `$lg` (12); dimension props read the token *scale*, not the
  theme (DEF-U8-h). (This recipe **supersedes the raw `borderRadius={4}`** in the `card.stories.tsx` precedent — match
  the content's radius via the token scale, not a literal.)
- **Static bars by default — no shimmer** (the `card.stories.tsx` precedent). *If* a subtle animation is ever used it
  must be `opacity`/`transform`-only, reading the `motion.ts` duration/easing tokens (B12), and **disabled under
  `prefers-reduced-motion`**.

A shared `Skeleton` primitive, if ever wanted, is a **separate future UI issue** — out of UX-4's scope.

## 4. Optimistic updates — none by default

Local SQLite reads are <10 ms (BR-RT-4), so a write **invalidates its query keys and re-reads** rather than
optimistically patching the cache. This is the convention; it keeps the cache and the DB trivially consistent. The
**only** grounded exception is a write whose downstream re-read is genuinely slow (e.g. one that must cross the
deferred sync/transport seam) — that is a **future, opt-in, per-mutation** decision, never a default. No module
reaches for optimistic patching casually.

## 5. Keyboard model

The app is keyboard-first. The convention **references** the authorities rather than restating a new scheme
(`apps/web/src/state-conventions/keyboard.ts` encodes the focus contract as data):

- **Focus at every transition** (`FOCUS_CONTRACT`, §XIV): overlay open → first focusable inside; overlay close →
  return to trigger; page nav → main heading; tab change → panel; toast appear → focus **not** moved (announced via
  `aria-live`). Already realized by the UI-1 primitives and the UX-2 command-bar focus contract (enter-on-open,
  restore-on-close, visible ring).
- **Escape closes every overlay** (`OVERLAY_DISMISS`); arrow keys navigate within composites; Tab order follows
  visual reading order (§XIV).
- **Keybind-as-data**: concrete keybinds follow the command bar's `resolveKeybind(platform) → CommandKeybind`
  (`preventDefault`) — UX-4 owns no keybind (⌘K is UX-2's); this layer holds only the shared focus constants.

## 6. Ownership boundary

UX-4 owns the **conventions + logic** (this doc + the `state-conventions/` artifact). Each module (M1.1+) and UI-4
own the **rendering** — they consume `deriveTerminalState` + `FOCUS_CONTRACT` and compose UI-1 primitives per §3.
UX-4 adds no `@vida/ui` component and no store.
