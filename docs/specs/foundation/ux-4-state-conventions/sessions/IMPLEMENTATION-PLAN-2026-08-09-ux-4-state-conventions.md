# IMPLEMENTATION-PLAN — UX-4 State Conventions   (session: 2026-08-09-ux-4-state-conventions)
> Gate-2 artifact (§XXVI step 4-6). Concrete build steps for the direction approved at Approval 1
> ([`PLAN`](PLAN-2026-08-09-ux-4-state-conventions.md), Rev 3 — zero decisions). FULL variant (emits code). Authority
> engineering.md + §XXII DoD. **No rendered component, no Visual Gate** — engineering-gated state-conventions logic.
> No-Guessing: every claim `[FACT: src]` / `[INTERP]` / `[UNKNOWN]`.

## 0. Preconditions (verified)
- `TerminalState` + `TERMINAL_STATE` import from `@vida/core` resolves (`packages/core/src/index.ts:124`;
  `apps/web/package.json:19` depends on `@vida/core`). `[FACT]`
- React Query v5 is the cache; `UseQueryResult` exposes `isPending` / `isError` / `data` `[FACT: @tanstack/react-query v5;
  lib/query-client.ts]`. Sibling data-dir pattern (`nav/`, `command-bar/`, `shell/`): data-only, no barrel, layer CLAUDE.md. `[FACT]`
- No new dependency. No edit to `packages/ui`, `tamagui.config.ts`, stores, or `routes.tsx`. `[FACT: scope §3]`

## 1. Build steps (ordered — types → derivation → keyboard data → tests → layer doc → arch doc)

### S1 — `apps/web/src/state-conventions/terminal-state.ts` (types + derivation)
- Re-export the canon (single web import point): `export { TERMINAL_STATE, type TerminalState } from '@vida/core'`.
- `type QueryResultLike<T> = { isPending: boolean; isError: boolean; data: T | undefined }` — the minimal RQ-v5 slice
  (structural, so it accepts a real `UseQueryResult` without importing React). `[INTERP: keeps the fn pure + RN-portable]`
- `deriveTerminalState<T>(result: QueryResultLike<T>, isEmpty: (data: T) => boolean): TerminalState` — the §2(b) rule in
  **strict precedence**:
  ```
  if (result.isPending) return 'loading'      // FIRST — closes the empty-vs-loading race
  if (result.isError)   return 'error'
  if (result.data === undefined) return 'loading'  // defensive: not-pending yet no data ⇒ still resolving, never flash empty
  return isEmpty(result.data) ? 'empty' : 'success'
  ```
- JSDoc: cite BR-RT (state plane), the `ViewEngine.resolve` conceptual parallel (degrade-never-crash), and the
  ordering guarantee. No `any`; generic constrained via the `isEmpty` predicate (no bare `<T>`, §XV).

### S2 — `apps/web/src/state-conventions/keyboard.ts` (keyboard-model data)
- `FOCUS_CONTRACT` — the §XIV focus-at-transition map as typed const data (single source modules reference), e.g.
  `{ overlayOpen: 'first-focusable', overlayClose: 'trigger', pageNav: 'main-heading', tabChange: 'panel', toastAppear: 'none' }`
  `[FACT: engineering §XIV]`.
- `OVERLAY_DISMISS` — `{ escape: true }` (Esc closes every overlay) `[FACT: §XIV]`.
- Re-document (not re-implement) the keybind-as-data pattern by re-exporting the TYPE precedent path in a comment
  pointer to `command-bar/types.ts` `resolveKeybind`; UX-4 owns NO concrete global keybind (⌘K is UX-2's). `[FACT]`
  → the artifact provides the shared *focus-contract constants*; the keybind mechanism already exists in command-bar.

### S3 — `apps/web/src/state-conventions/*.test.ts` (unit tests, Vitest)
- `terminal-state.test.ts`: all four branches + the ordering guarantee:
  1. `isPending:true, data:undefined` → `loading` · 2. `isPending:true, data:[]` → `loading` (**race guard** — pending
  wins over empty) · 3. `isError:true` → `error` · 4. `data:[], isEmpty=len0` → `empty` · 5. `data:[x]` → `success` ·
  6. not-pending/not-error/`data:undefined` → `loading` (defensive). Table-driven.
- `keyboard.test.ts`: `FOCUS_CONTRACT`/`OVERLAY_DISMISS` shape assertions (contract lock, the frecency-fixture precedent).

### S4 — `apps/web/src/state-conventions/CLAUDE.md` (layer doc)
Mirror `nav/CLAUDE.md`: owning issue UX-4 (LIF-93), authority engineering.md §XIV + §XXII; "What lives here"
(terminal-state derivation + keyboard-model data); Rules: data-not-chrome · no barrel `index.ts` (§XX) · reuse
`@vida/core` `TerminalState` never redefine · compose UI-1, add no primitive · derivation `isPending`-first.

### S5 — `docs/core/architecture/state-conventions.md` (the convention doc) + README row
The IN.1 model, sibling of ia/command-bar/shell-layout: §1 terminal-state model (reuse canon; surface-extension rule
w/ UX-2 `SearchStatus` example) · §2 derivation (isPending-first, the race) · §3 per-state presentation (loading=
skeleton no-CLS + `aria-busy` + reduced-motion static; empty=guided never-blank; error=inline+retry-refetch→loading,
`aria-live=assertive`; success=content, aria-busy cleared, §XIV focus-on-nav) · §4 optimistic=BR-RT-4 + named
exception · §5 keyboard model (§XIV + command-bar focus contract + keybind-as-data) · §6 scope/ownership boundaries.
Add the row to `docs/core/architecture/README.md`. `[FACT: §XXIX currency]`
- **G1 (preflight fold) — the skeleton-composition RECIPE is REQUIRED content of §3-loading.** Because UI-1's standalone
  `Skeleton` was superseded (DEF-U5-a) there is no shared component, so consistency comes from a documented recipe every
  module composes identically: a placeholder block = Tamagui `View` at the content's box, **`backgroundColor` from the DS
  surface/neutral token (`$colorSurfaceSecondary`), `borderRadius` from the `$md`/`$lg` radius scale** (DEF-U8-h:
  dimension props read the token SCALE), **STATIC bars by default — NO shimmer** (matching the one shipped skeleton
  precedent `card.stories.tsx:147` "static bars, B12 / reduced-motion safe"); *if* a subtle animation is used it must be
  `opacity`/`transform`-only reading the `motion.ts` duration/easing tokens (B12) and disabled under
  `prefers-reduced-motion`. Sized to the real content box (no CLS). The recipe names tokens/motion primitives that
  already exist — it introduces no new component. If a shared `Skeleton` primitive is ever wanted, that is a separate
  future UI issue, explicitly out of UX-4. `[FACT: DEF-register U5-a; card.stories.tsx:146-161; tokens.ts:8 radius;
  DS-3 motion.ts; [[tamagui-dimension-props-read-token-scale-not-theme]]]`

## 2. Acceptance (maps 1:1 to PLAN §4)
- [ ] S1 compiles; `deriveTerminalState` pure, generic constrained, no `any`; re-exports the `@vida/core` canon.
- [ ] S3 green: all four states + `isPending`-first ordering + `data:undefined` defensive branch covered.
- [ ] S2 keyboard data typed; no duplicate ⌘K keybind (references command-bar).
- [ ] S4 CLAUDE.md present (data-not-chrome, no-barrel, reuse-canon, compose-UI-1).
- [ ] S5 doc written + README row (§XXIX).
- [ ] `pnpm typecheck` + `pnpm lint` green; no new dep; no edit to packages/ui / tamagui.config / stores / routes.tsx.
- [ ] Grep-clean: no new `@vida/ui` component; no re-declared terminal-state literals (imports the canon).

## 3. Verification
`pnpm --filter @vida/web test` (new tests green) · `pnpm typecheck` (root 10/10) · `pnpm lint` (0 err) ·
grep guard (no `['loading','empty','error','success']` re-declaration in `apps/web`; import from `@vida/core`).

## 4. Route History
| Date | Event |
|------|-------|
| 2026-08-09 | Approval 1 (Rev 3, zero decisions) → IMPLEMENTATION-PLAN authored. |
| 2026-08-09 | RQ v5.101.4 result semantics verified on disk (pending→data:undefined; error may retain stale data; success→data:T) — derivation ordering sound. |
| 2026-08-09 | **Preflight PASSED** — 1 gap folded: **G1** (loading convention under-specified — no shared `Skeleton` since U5-a superseded → S5 must carry the explicit token/motion composition recipe). |
| 2026-08-09 | **Gate-2 critique SHIP** — drift-residue sweep CLEAN (no surviving build-primitive/Visual-Gate/D3 instruction); derivation correct vs RQ v5; G1 recipe grounded. 1 material folded: **M1** — recipe defaulted to "shimmer" but the shipped `card.stories.tsx:147` precedent is STATIC-no-shimmer → corrected to static bars default (PLAN §2c + S5). → Approval 2 next. |
