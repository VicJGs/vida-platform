# apps/web/src/state-conventions — Client interaction-state conventions layer

**Owning issue:** UX-4 State conventions (LIF-93) · **Authority:** `standards/engineering.md §XIV`/§XVII + §XXII DoD ·
**Owning canon:** `@vida/core` `TerminalState` (ADR-008 CB6 / R5). Full model: `docs/core/architecture/state-conventions.md`.

## What lives here
The **logic** every screen's interaction states follow — the terminal-state derivation and the keyboard model — as
central DATA/logic the render layer (UI-4 + each module, M1.1+) consumes. **No chrome.** UX-4 owns the *convention*;
modules own the *rendering*.

- `terminal-state.ts` — re-exports the `@vida/core` canon (`TERMINAL_STATE`, `TerminalState`) + `deriveTerminalState<T>(result, isEmpty)`, the pure React-Query-result → state derivation (`QueryResultLike<T>` slice).
- `interaction-state.ts` — **(fe-codec-patterns S1, LIF-211)** the CODEC 8-state machine: the `InteractionState` superset (`idle·typing·loading·results·empty·unavailable·error·success`) + `collapseToTerminal` (total, exhaustive `switch`, back to the 4 canon literals) + `deriveInteractionState(result, isEmpty, input?)` (extends the derivation with the input dimension) + `renderKindFor`/`INTERACTION_RENDER` (the canonical state→primitive map). Re-exports the terminal canon for one import point. Reuses the `@vida/core` canon — **no new canon, no `@vida/types` consolidation** (the canon owner's deferred job).
- `keyboard.ts` — `FOCUS_CONTRACT` (the §XIV focus-at-transition map) + `OVERLAY_DISMISS`, as typed data.

## Rules (do not violate)
- **Data/logic, not chrome.** No JSX, no components, no rendering. UX-4 builds **no `@vida/ui` primitive** — it
  composes UI-1's existing primitives + consumer-composed skeleton model (DEF-U5-a/U5-f). Rendering is UI-4/modules.
- **Reuse the canon — never redefine.** The four terminal states import from `@vida/core`; do NOT re-declare
  `['loading','empty','error','success']` here (that would be a fourth un-unified copy — the doc §1 notes the
  existing three: `TerminalState` · views `ViewState` · command-bar `SearchStatus`).
- **Derivation is `isPending`-first.** Check pending before the empty predicate, and error before data — this closes
  the empty-vs-loading race and lets error win over stale (placeholderData) values. It is a locked unit-test case.
- **No optimistic updates by default** (BR-RT-4) — writes invalidate-and-reread; the derivation is read-side only.
- **Keybind-as-data.** Concrete keybinds follow `../command-bar/types.ts` `resolveKeybind`; UX-4 owns no keybind
  (⌘K is UX-2's). This layer holds only the shared FOCUS constants.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Pure + portable.** `deriveTerminalState` takes a structural `QueryResultLike<T>` (no `@tanstack/react-query`
  import) so it stays dependency-free and RN-portable; a real `UseQueryResult<T>` is assignable to it.
