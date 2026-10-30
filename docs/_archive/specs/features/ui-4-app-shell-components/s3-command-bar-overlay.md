# Spec: feature:ui-4-app-shell-components / S3 — Command-bar overlay

Status: draft <!-- draft → approved → implemented -->
Source-repo: apps/web/src/shell (chrome), apps/web/src/command-bar + apps/web/src/stores (model, read-only)
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X]. Inherits the umbrella §2 BR-1..7.
Sessions: 2026-08-16-ui-4-app-shell-components-4

> Unit S3 of UI-4 (umbrella `_index.md` §5). The **⌘K command-bar overlay**: the rendered launcher the UX-2 model
> (`command-bar/*` + `stores/command-bar-ui-store.ts`) was designed against. S2 already wired the _trigger_
> (`commandBar.open()`); S3 renders what `isOpen` shows, owns the global ⌘K keydown, and injects the router into the
> command run-context. Composes UI-1 `Dialog` + `Input` (BR-1 — no new `@vida/ui` component). Off clean `main`, own PR.

## 1. Identity

The **command-bar overlay** — a single always-available modal launcher, opened with **⌘K (mac) / Ctrl+K (win/linux)**
or the global-bar Search trigger (S2), that lets the user **jump anywhere** (navigation commands) and **do anything**
(action commands), and — once DB-8 lands — **search** their data. Keyboard-first, from any screen.

- [FACT: _index.md:80] S3 scope = "⌘K launcher (input + command list + result list + `search-unavailable`) + router
  injection + trigger". [FACT: command-bar-and-search.md:11-16] the interaction model this renders.
- [FACT: command-bar-and-search.md:76-78] ownership: "Rendered overlay / input / result list / trigger → **UI-4**,
  M1.0". S3 is that render host; UX-2 owns the model, MOD-prefs the history store (M1.1), DB-8 the search index (M1.4).

**What it renders/wires** (existing artifacts, referenced not redefined):

- [FACT: stores/command-bar-ui-store.ts:18-25] `useCommandBarUIStore` — `isOpen`/`query`/`mode` + `open()`/`close()`/
  `setQuery()`. The overlay reads `isOpen` to mount, `query`/`mode` to switch surfaces; `close()` on execute/dismiss.
- [FACT: command-bar/registry.ts:15-43] `createCommandRegistry()` + `navProvider` + `shellActionsProvider` — S3
  assembles the registry, registers the two built-in providers, and `collect()`s the ranked command list.
- [FACT: command-bar/types.ts:15-27] `Command` + `CommandRunContext{navigate}` — S3 builds the run-context from
  `useShellNavigate` and calls `command.run(ctx)`.
- [FACT: command-bar/types.ts:79-95] `SearchProvider` + `resolveKeybind(platform)` — S3 mounts the `stubSearchProvider`
  (DB-8 seam) and the ⌘K keybind (resolved by platform, `preventDefault`).
- [FACT: command-bar/search-provider.ts:5-15] `stubSearchProvider` (→ `search-unavailable`) + `emptyQueryOutcome()`.
- [FACT: shell/nav-link.tsx:92-96] `useShellNavigate()` — the SPA navigate injected into `CommandRunContext.navigate`.
- [FACT: shell/feature-flags.ts] `isFeatureEnabled` — the host filters commands by `visibleWhen` (S2-BR-b precedent).
- [FACT: @vida/ui index.ts:25 `Input`, :31 `Dialog`] compose UI-1 `Dialog` (modal envelope) + `Input` (combobox field); no new component.

**What it is NOT** — [INTERP] not the FTS5 search backend (DB-8; search is a guarded stub → `search-unavailable`,
not a blank) · not the `command_bar_history` recency store (MOD-prefs, M1.1 — history is an EMPTY seam in M1.0, the
frecency rank degrades to provider order) · not per-module action commands (each module contributes at M1.1+; M1.0
seeds nav + "Toggle sidebar" only) · not the Search _trigger_ (S2 shipped it — S3 owns only the global ⌘K keydown +
the overlay) · not onboarding (S4) · not a new `@vida/ui` primitive (rule-of-three unmet — composes UI-1) · not
client-state conventions (UX-4).

## 2. Business Rules (S3 refinements of the umbrella BR-1..7)

- **S3-BR-a · Compose UI-1 Dialog + Input; build the combobox inside (BR-1).** [FACT: dialog.tsx:35-49 `DialogProps`,
  :159/:283-316 self-portal, :207-226 background `inert`+`aria-hidden`, :182-203 focus **returns to whatever was
  focused before open** (captured `document.activeElement`, not a trigger ref) + export-dialog precedent
  v6-export-dialog.md] the overlay IS a UI-1 `Dialog` — so ⌘K-from-anywhere restores focus there, Search-button-open
  restores to the button; Esc + backdrop dismiss → `close()`. The command/result
  UI is **hand-rolled inside** the Dialog (the export-dialog radiogroup precedent — a specialized ARIA widget UI-1
  doesn't ship). **No `packages/ui` edit** — the only UI-4 `packages/ui` write remains the S1 `media` object (BR-1).
- **S3-BR-b · The input is a combobox; the list is a listbox; focus stays in the input (the Select pattern, not a
  Tab-trap).** [FACT: components.md §VIII + select.tsx aria-activedescendant model] the field is UI-1 `Input` with
  `role="combobox"`, `aria-expanded="true"`, `aria-controls={listboxId}`, `aria-activedescendant` (see the empty-list
  rule below), `aria-autocomplete="list"`, and its own `aria-label`. The command list is a `role="listbox"` of
  `role="option"` **divs with NO `tabindex`** (click-only — `onClick` executes, `onMouseMove` sets active); `↑/↓`
  move a _virtual_ active option (wrapping), `Enter` executes it. **These ARIA + `onKeyDown` props reach the inner
  `<input>` via UI-1 Input's consumer-extras pass-through** ([FACT: input.tsx:192-194] `{...rest}` is spread onto
  `NativeInputEl` before the computed props; JSX spread forwards keys outside the narrowed `NativeInputExtra` Pick,
  and `render:'input'` forwards native attrs at runtime) — so NO Input type-widening / `packages/ui` edit is needed (BR-1).
  - **Single tab stop is LOAD-BEARING (B1).** [FACT: dialog.tsx:52-53 `getFocusable` matches `[tabindex]:not([tabindex="-1"])`,
    focus-into = `focusables[0]` at :188, Tab-trap at :247-250] the options being **non-focusable divs** is what keeps
    Dialog's `getFocusable(panel)` returning **exactly `[the input]`** — so focus-into lands on the input and the trap
    is a single stop. If an option were focusable, `focusables[0]` could land on it (not the input) and the trap would
    include it. The `leading` search icon is a non-focusable `<svg>`; Dialog renders no default close button
    (dialog.tsx has no close control) → the input is the sole focusable. This is asserted in §4 + tested.
  - **Empty-list rule (B2 — the M1.0-shipping state).** When the active option list is empty (search mode in M1.0 is
    always `search-unavailable` → zero options), `aria-activedescendant` is **omitted** (`undefined`), never a dangling
    IDREF; `↑/↓` are **no-ops** (`options.length === 0`); the `search-unavailable`/`empty`/`error` surface is a
    `role="status"` region, **not** a listbox, and carries no active option. `activeIndex` clamps to `[0, len)` and the
    `aria-activedescendant` id is emitted only when `options.length > 0`.
- **S3-BR-c · Two modes, query-driven — the store is the contract.** [FACT: command-bar-ui-store.ts:24 +
  command-bar-and-search.md:20-27] mode is **strictly** `query.length > 0 ? 'search' : 'command'` (the store owns the
  transition; S3 reads it, never re-derives). **Command mode** (empty query) → the ranked command list. **Search
  mode** (non-empty query) → the `SearchProvider` outcome. There is **no client-side command-filter-by-keystroke**
  in M1.0 — that is not in the model/store (typing switches to entity search); the launcher browses commands with an
  empty query and searches entities with a non-empty one. (Not a defect — the store contract; command-filtering would
  be a UX-2 model change, out of S3 scope.)
  - **The doc's "type-ahead filters" is NOT a command-mode filter (M2).** [FACT: command-bar-and-search.md:32] §3's
    keyboard grammar lists "type-ahead filters" — this is the **search-mode result narrowing** (DB-8), not a
    command-mode filter: the store's `setQuery` mode-flip (line 24) makes command-mode filtering **structurally
    impossible** (any keystroke → `query` non-empty → search mode). So §3:32 and this rule agree, not conflict.
- **S3-BR-d · Search fails LOUD, never blank (BR-4).** [FACT: search-provider.ts:5-10 + types.ts:63-76] on a non-empty
  query S3 calls `stubSearchProvider.search(query)` and renders the `SearchOutcome.status` as an explicit terminal
  state: `idle` (blank → command mode) · `loading` (in-flight) · `results` (grouped listbox — DB-8) · `empty`
  (query, no matches) · **`search-unavailable`** (the M1.0 reality — a loud `role="status"` message carrying
  `outcome.message`, NEVER a silent empty list) · `error`. In M1.0 every non-empty query resolves to
  `search-unavailable` (DB-8 unbuilt). The async call is **race-guarded** (a stale resolve for an old query is
  discarded — the last query wins).
  - **M1.0-BUILT vs DB-8-SEAM split (FOLD-2).** S3 BUILDS + tests: `idle` (command mode, no call), `loading` (transient
    `aria-busy` indicator), and the **`role="status"` message region** that renders `search-unavailable` **and** `empty`
    **and** `error` (all three → the same cheap loud message, differing only in copy) — degrade-safe for every status.
    S3 does NOT build the grouped **`results`** listbox UI — a **DB-8 seam** (a documented `results`-branch TODO
    rendering nothing in M1.0, since `stubSearchProvider` never yields `results`). Scopes the build to what ships
    without under-handling `empty`/`error`.
- **S3-BR-e · The command run-context is host-injected; the run-dispatch asymmetry is honored.** [FACT: types.ts:6-9,
  15-27 + registry comment] navigation commands act via the injected `CommandRunContext.navigate` (built from
  `useShellNavigate()`); action commands ignore `ctx` and call their global store directly (their `run` closes over
  it). S3 builds ONE `ctx = { navigate }` and calls `command.run(ctx)` for the executed item, then `close()`. **Order:
  run THEN close** (navigation must fire before the store resets `query`/`mode`). Selecting a command is the only
  execution path (there is no separate "confirm").
  - **Post-nav focus (FOLD-3).** After a nav command, `close()` unmounts the Dialog → its focus-return runs, but the
    pre-open element may have unmounted (route changed). Dialog's restore is **guarded** (dialog.tsx:200-201:
    `document.contains(prev)` → else `document.body.focus()`) so it never throws/strands. Moving focus to the new
    route's main heading is the router's/UX concern (§XIV page-nav), NOT S3's — S3 only closes cleanly.
- **S3-BR-f · S3 owns the global launcher keydown (S2 ceded it).** [FACT: global-bar.tsx:5-6 "S3 … owns the global
  keydown listener. S2 wires the trigger only" + types.ts:92-95 `resolveKeybind` + command-bar-and-search.md:30-32] a
  **document**-level keydown listener that opens the store (`open()`) on **EITHER platform mod (⌘ OR Ctrl) + K**,
  **always `preventDefault`** (avoid browser-native collisions). **Open-only, not a toggle** (the store has no
  `toggle()`; the model's grammar is opens / **Esc-closes**, so the combo while already open is a documented no-op —
  Esc/backdrop are the close paths, S3-BR-a). Mounted ONCE (with the overlay), cleaned up on unmount; fires from any
  screen incl. inside inputs (a mod-combo is safe). The click trigger stays S2's (`open()` — done).
  - **⚠ LENIENT MOD MATCH (§XXVIII deviation — Visual-Gate fix, 2026-08-17).** The approved plan matched only the
    platform-resolved mod (`bind.mod === 'meta' ? e.metaKey : e.ctrlKey`). In the browser this **failed on a real Mac**:
    the button opened the overlay but ⌘K did nothing, because `detectPlatform()` resolved `'other'` (Brave's
    fingerprint shields farble `navigator.platform`/`userAgent`) → the listener expected Ctrl+K. Fix: the listener
    accepts `(e.metaKey || e.ctrlKey) && key==='k'` — reachability must not hinge on fragile `navigator` detection, and
    neither combo collides with an action we preserve (we `preventDefault`). `resolveKeybind` stays the CANONICAL
    binding (the ⌘K/Ctrl+K hint the UI renders); only the listener's _match_ is lenient. jsdom missed this because a
    test controls `navigator` — it can only prove "given platform X, mod Y opens," never the detection mismatch itself.
- **S3-BR-g · Frecency + flag filter, with an EMPTY history seam (M1.0).** [FACT: registry.ts:21-25 + frecency.ts:6-22
  - feature-flags.ts] S3 `collect(history, now)`s the registry; `command_bar_history` is unbuilt (MOD-prefs, M1.1) so
    **history = `[]`** → `rankByFrecency` degrades to provider order (nav commands, then "Toggle sidebar"). `now` =
    `Date.now()` (irrelevant with empty history; correct when history arrives — apps may call `Date.now()`, the pure lib
    may not). Then **filter by `visibleWhen`**: a command with `visibleWhen` shows only when `isFeatureEnabled(flag)` —
    M1.0 fail-closed, so `gamification`'s nav command is absent (S2-BR-b parity; no default-open surface, BR-6).
- **S3-BR-h · Dialog accessible name + M1.0 positioning — disclosed, not a fork.** [FACT: dialog.tsx:38-39,84-104]
  `Dialog` REQUIRES a `title` (its `aria-labelledby`) and renders it as a visible `<h2>`, and centers the panel
  (no sheet/top-anchor variant). S3 passes a concise `title` ("Command menu") as the accessible name; a
  visually-hidden title and a top-anchored/`sheet` command-palette placement are **deferred DS enhancements**
  (`DEF-S3-a`), NOT built here (BR-1 forbids a `packages/ui` edit). Dialog `size="lg"` + its `width:100%` gives a
  near-full-width panel at 375 (the sheet approximation) and a 720-capped centered panel tablet+. Acceptable for M1.0.
- **S3-BR-i · The overlay self-portals; the `overlayHost` region stays a reserved marker.** [FACT: dialog.tsx:159-179,
  283-316 — Dialog creates its OWN body-child portal root] like every UI-1 overlay (Select/Menu/Dialog/Popover/Toast),
  the command bar portals to `<body>`, not into the S1 `overlayHost` region. That region stays the reserved empty
  marker S1 shipped (app-shell.tsx:170-182) — consistent with the whole UI-1 overlay family, not a contradiction.
  `<CommandBar/>` MOUNTS inside `AppShell` (so it has router + store context for `useShellNavigate`); it renders the
  Dialog, which portals out. (The reserved marker is app-shell.tsx:170-182 — the `<View data-region="overlayHost">` at
  :172-182 under the :170-171 comment.)
- **S3-BR-j · Tokens only, states complete (BR-2, §VIII).** every surface/text/border/gap/radius/z resolves to a DS
  token (Dialog + Input already do; the hand-rolled listbox uses base semantic tokens — the export-dialog radiogroup
  precedent); the active option shows a visible highlight (an `active`-state style, NOT `:focus-visible` — the option
  is never DOM-focused; the Menu/Select lesson); ≥44×44 option rows; motion is Dialog's (transform/opacity, DS-3,
  reduced-motion→instant — B12). No hex, no invented spacing/z.

## 3. Contract

Existing UI-1 primitives + the `command-bar/*` model + the stores + `useShellNavigate` are REFERENCED, not redefined.
New chrome lives in `apps/web/src/shell/` (+ one `apps/web/src/lib/` util); the `apps/web/src/command-bar/` model layer
is read-only (its CLAUDE.md forbids chrome). `app-shell.tsx` gains one mount point.

- **`CommandBar`** (`apps/web/src/shell/command-bar.tsx`) — `function CommandBar(): JSX.Element` (no props; reads the
  store + router via hooks). Responsibilities:
  - Read `useCommandBarUIStore` (`isOpen`, `query`, `mode`, `open`, `close`, `setQuery`).
  - Build the registry **once** (`useMemo([], …)`): `createCommandRegistry()` → `register(navProvider)` +
    `register(shellActionsProvider)`. Derive the visible command list: `registry.collect([], Date.now())` then
    `.filter(c => c.visibleWhen == null || isFeatureEnabled(c.visibleWhen))` (S3-BR-g). (Command list is stable in
    M1.0 — no history, no flags on — so it can memoize on `[]`.)
  - `const ctx: CommandRunContext = { navigate: useShellNavigate() }` — **rebuilt per render, NOT memoized** (M3): it
    must close over the live `useNavigate` (nav-link.tsx:92-97 returns a fresh closure each render); execute reads it
    at call time (S3-BR-e).
  - `useCommandKeybind()` — the global ⌘K listener (S3-BR-f).
  - `useCommandSearch(mode === 'search' ? query : '', stubSearchProvider)` → the `SearchOutcome` (S3-BR-d). In **command
    mode** the query passed is `''` → the hook returns `idle`, and command mode renders the **command listbox** (it
    ignores the `idle` outcome — the outcome only drives the search-mode surface) (minor).
  - Active-option state: `const [activeIndex, setActiveIndex] = useState(0)`, reset to 0 whenever the mode or the
    active option list changes; the active list = the command list (command mode) or the result options (search mode —
    **empty in M1.0**). `aria-activedescendant` is emitted **only when `options.length > 0`** (B2); `↑/↓` no-op on an
    empty list; `activeIndex` clamps to `[0, options.length)`.
  - Render `<Dialog open={isOpen} onOpenChange={(o)=>{ if(!o) close() }} title="Command menu" size="lg">`:
    - the `Input` combobox (S3-BR-b): `leading={<Search/>}` icon, `aria-label="Search and run commands"` (this
      satisfies Input's own accessible-name dev-warn, input.tsx:168-177 — no console noise), `value={query}`,
      `onChangeText={setQuery}`, `role="combobox"` + `aria-expanded` + `aria-controls={listboxId}` +
      `aria-activedescendant={options.length > 0 ? activeId : undefined}` (B2) + `aria-autocomplete="list"`,
      `onKeyDown` (↑/↓ move activeIndex wrapping + `preventDefault`, **no-op on an empty list**; `Enter` → execute the
      active option + `preventDefault`, **no-op when there is none**; Esc bubbles to Dialog's panel handler,
      dialog.tsx:229-236).
    - **command mode:** a `role="listbox"` (`id={listboxId}`, `aria-label="Commands"`) of `role="option"` **divs
      with NO `tabindex`** (`id`, `aria-selected={i===activeIndex}`, active-highlight, ≥44×44, base DS tokens, pointer
      `onClick`=execute + `onMouseMove`=set active) — non-focusable so Dialog's `getFocusable` stays `[input]` (B1).
      Empty-list guard → a disabled "No commands" option (shouldn't occur — nav commands always exist).
      - **Option DOM id (FOLD-1).** The `id` is a **sanitized, stable, unique** derivation of `command.id` — the raw
        ids contain `:`/`/` (`nav:/people`, `action:toggle-sidebar`), legal as an id _value_ (so `aria-activedescendant`
        resolves) but `querySelector`-unsafe. Derive `` `cmdbar-opt-${slug(command.id)}` `` (slug = non-`[A-Za-z0-9_-]`
        → `-`); uniqueness holds because `command.id` is already unique (registry dedupes by route). `aria-activedescendant`
        references this id (never the raw `command.id`).
    - **search mode:** render `outcome.status` (S3-BR-d): `search-unavailable`/`empty`/`error` → a `role="status"`
      message region (loud, carries `outcome.message`); `loading` → a busy indicator (`aria-busy`); `results` →
      grouped listbox (DB-8 seam — options carry `{id, title, routePath}`, select navigates). M1.0 lands
      `search-unavailable` for every non-empty query.
  - **Execute(option):** command mode → `option.command.run(ctx)`; search mode/result → `ctx.navigate(result.routePath)`;
    THEN `close()` (S3-BR-e order). Guard: no active option (e.g. search-unavailable) → Enter is a no-op.
- **`useCommandKeybind`** (`apps/web/src/shell/use-command-keybind.ts`) — `(): void`. A `useEffect` that adds a
  `document` `keydown` listener; on `resolveKeybind(detectPlatform())` match (mod + `k`) → `preventDefault()` +
  `useCommandBarUIStore.getState().open()`. Cleanup removes it. Deps stable (`[]` — reads the store imperatively via
  `getState`, the registry-action precedent). (§XVI: a hook for an external-system sync — the one legitimate effect.)
- **`useCommandSearch`** (`apps/web/src/shell/use-command-search.ts`) — `(query: string, provider: SearchProvider):
SearchOutcome`. Empty `query` → `emptyQueryOutcome()` (`idle`, no call). Non-empty → a race-guarded `useEffect`:
  set `loading`, `await provider.search(query)`, and apply the result ONLY if the query is still current (an
  incrementing request-id or a captured-query compare — discard stale). Returns the current `SearchOutcome`. (§XVI:
  external async sync; the one effect.)
- **`detectPlatform`** (`apps/web/src/lib/platform.ts`) — `(): Platform` → `'mac' | 'other'` from
  `navigator.platform`/`userAgent` (`/Mac|iP(hone|ad|od)/` → `'mac'`), SSR/undefined-guarded → `'other'`. Pure,
  unit-tested. (Isolated so the keybind hook + tests don't touch `navigator` directly.)
- **`app-shell.tsx` change** [FACT: app-shell.tsx:56-185] — mount `<CommandBar/>` once inside the `AppShell` return
  (a sibling of the region tree; it renders a Dialog that self-portals, so placement in the flow is irrelevant to
  layout — S3-BR-i). NO change to the 5-region frame, `useMedia`, `__bp`, `LAYERING`, or the empty `overlayHost`
  marker. (Optionally call `useCommandKeybind()` from within `CommandBar` rather than `AppShell` — one mount.)
- **a11y** [FACT: §XIV + command-bar-and-search.md:29-36] — Dialog supplies role=dialog/aria-modal/labelledby +
  focus-into (lands on the combobox input, `focusables[0]`) + focus-return + Esc + inert background. The combobox +
  listbox supply the within-overlay grammar (aria-activedescendant, ↑/↓, Enter). The `search-unavailable`/`empty`/
  `error` message is a `role="status"` (polite — it's a rendered state, not a live insertion, the list-view contrast).
  Every actionable element has an accessible name.

## 4. Acceptance (S3 DoD — includes the component Visual Gate)

- [ ] ⌘K (mac) / Ctrl+K (other) opens the overlay from any screen; `preventDefault` fires; the trigger click (S2)
      also opens it; both resolve via the store `open()` (S3-BR-f) — asserted in jsdom (dispatched keydown)
- [ ] On open, focus lands IN the combobox input; Esc closes + restores focus to the pre-open element; backdrop click
      closes (Dialog contract) (S3-BR-a) — jsdom `activeElement` assertions
- [ ] The listbox options are non-focusable (no `tabindex`); `getFocusable(panel)` returns exactly `[the input]` →
      focus-into lands on the input, the trap is a single stop (S3-BR-b, B1) — jsdom
- [ ] Search mode with zero options (M1.0 `search-unavailable`): `aria-activedescendant` is ABSENT (no dangling
      IDREF); `↑/↓` are no-ops; the surface is `role="status"`, not a listbox (S3-BR-b, B2) — jsdom
- [ ] Command mode (empty query): the ranked command list renders as a `role="listbox"` of `role="option"`; `↑/↓`
      move the active option (wrapping), `Enter` executes it, focus never leaves the input (S3-BR-b,c) — jsdom
- [ ] A navigation command executes via the injected `ctx.navigate` (SPA, then `close()`); an action command
      ("Toggle sidebar") flips its store then closes (S3-BR-e) — asserted via a spy `navigate` + the shell store
- [ ] `gamification`'s nav command is ABSENT in M1.0 (fail-closed `visibleWhen` filter); history is empty → order is
      provider order (S3-BR-g) — jsdom
- [ ] Search mode (non-empty query): renders `search-unavailable` as a loud `role="status"` message carrying the
      stub's message, NEVER a blank list; the async call is race-guarded (last query wins) (S3-BR-d) — jsdom
- [ ] Combobox ARIA present on the inner `<input>` (role/aria-expanded/aria-controls/aria-activedescendant/
      aria-autocomplete) via Input pass-through; no `packages/ui` edit in the diff (S3-BR-b, BR-1)
- [ ] The `overlayHost` region is unchanged (still the empty reserved marker); `<CommandBar/>` self-portals via
      Dialog (S3-BR-i)
- [ ] Option rows are ≥44×44; the hand-rolled listbox surfaces/borders/gaps/radius resolve to DS tokens (no hex,
      no invented spacing); the active-option highlight is an `active`-state style, not `:focus-visible` (S3-BR-j)
- [ ] The Dialog visible `<h2>` title ("Command menu") renders as the accessible name; `DEF-S3-a` (sr-only title +
      sheet/top-anchor placement) filed as a deferred DS enhancement (S3-BR-h)
- [ ] Visual Gate = running app (`pnpm dev`, render-table:45; `apps/web` has no Storybook) at 375/768/1440, **both
      themes** (temp root `theme='dark'`): overlay opens centered with the visible title, scrim + panel motion correct,
      input + command list legible, active-option highlight visible, `search-unavailable` message loud; DS tokens, no hex (S3-BR-j,h)
- [ ] `@vida/web` typecheck · tests · lint green; `apps/web`→`@vida/ui` boundary one-way; no new runtime dep
      (`lucide-react` already added by S2; UI-1 Dialog/Input already consumed)
- [ ] Currency (§XXIX): `command-bar-and-search.md` re-verified current for the rendered overlay; shell layer-doc
      (`apps/web/src/shell/CLAUDE.md`) updated with the new files; `DEF-S3-a` (sr-only title / sheet placement) filed

## 5. Implementation Prompt (ordered; each step cites §2/§3)

1. **Platform util.** `apps/web/src/lib/platform.ts` — `detectPlatform(): Platform` (`'mac'|'other'` from
   `navigator`, SSR-guarded). +test (mac UA → 'mac'; other → 'other'; undefined navigator → 'other') (S3-BR-f).
2. **⌘K keybind hook.** `apps/web/src/shell/use-command-keybind.ts` — `useCommandKeybind()`: a `useEffect([])` adding
   a `document` keydown listener resolved by `resolveKeybind(detectPlatform())` (mod+`k`) → `preventDefault` +
   `useCommandBarUIStore.getState().open()` — **open-only, not a toggle** (Esc/backdrop close; ⌘K-while-open is a
   no-op, M1); cleanup removes it (S3-BR-f). +test (dispatch Meta+K / Ctrl+K → `open()` called + `defaultPrevented`;
   a bare `k` does nothing; unmount removes the listener).
3. **Search hook.** `apps/web/src/shell/use-command-search.ts` — `useCommandSearch(query, provider): SearchOutcome`:
   empty → `emptyQueryOutcome()`; non-empty → race-guarded effect (loading → awaited outcome, stale discarded)
   (S3-BR-d). +test (empty → idle; non-empty → the stub's `search-unavailable`; a fast query change keeps only the
   last result — stale ignored).
4. **CommandBar overlay.** `apps/web/src/shell/command-bar.tsx` — compose `Dialog` (open=`isOpen`, onOpenChange→`close`
   when false, `title="Command menu"`, `size="lg"`) wrapping the UI-1 `Input` combobox + the hand-rolled listbox
   (command mode) / the search-state region (search mode). Build the registry once (nav + shell providers), collect +
   `visibleWhen`-filter (S3-BR-g); build `ctx` from `useShellNavigate` (rebuilt per render, M3); call
   `useCommandKeybind()`; manage `activeIndex` (↑/↓ wrap, clamp `[0,len)`, no-op on empty, reset on mode/list change);
   options are **non-focusable `role="option"` divs** (B1); `aria-activedescendant` only when `options.length>0` (B2);
   execute = `run(ctx)` then `close()` (S3-BR-a,b,c,e,i,j). Combobox ARIA + `onKeyDown` via Input pass-through (S3-BR-b).
   +test (jsdom via the store): open→focus-in + `getFocusable`==`[input]`; command list roles + activedescendant +
   ↑/↓/Enter; nav command calls a spy navigate + closes; "Toggle sidebar" flips the shell store; gamification absent;
   non-empty query → `search-unavailable` `role="status"` + **no `aria-activedescendant`**; Esc closes + restores focus.
5. **Wire app-shell.** `apps/web/src/shell/app-shell.tsx` — mount `<CommandBar/>` once inside the `AppShell` return
   (sibling of the region tree; layout-irrelevant, S3-BR-i). Frame / `useMedia` / `__bp` / `LAYERING` / `overlayHost`
   unchanged. Update `app-shell.test.tsx` (CommandBar mounts; ⌘K opens; overlayHost still empty).
6. **Visual Gate = running app** (`pnpm dev`, render-table:45; no Storybook in `apps/web`) — capture 375/768/1440 ×
   {light, dark via a temporary root `theme='dark'`}: overlay open (centered, scrim, panel enter motion), input +
   command list, active-option highlight, `search-unavailable` message, focus ring. Fix anything jsdom can't see (the
   S1 process-shim/viewport lessons already landed; the Dialog motion is UI-1's, already gated).
7. **Currency + docs.** Re-verify `command-bar-and-search.md` current for the rendered overlay; update
   `apps/web/src/shell/CLAUDE.md` with the new files (command-bar.tsx, use-command-keybind.ts, use-command-search.ts)
   - note `apps/web/src/lib/platform.ts`; file `DEF-S3-a` (Dialog sr-only-title + sheet/top-anchor placement — DS
     enhancement). Done-check → §4; run `@vida/web` typecheck/test/lint + build, confirm the one-way boundary; Visual
     Gate (step 6).

## 6. Open UNKNOWNs / Decisions Needed

- **None (no fork).** Every gap is closed by the documentation + the shipped model; two composition details are
  **disclosed** (not decisions):
  - **Two-mode surface** → the store contract (`command-bar-ui-store.ts:24`) + command-bar-and-search.md:20-27 fix it
    (empty=command browse, non-empty=entity search). Command-filter-by-keystroke is NOT M1.0 — a UX-2 model change, not
    S3's (S3-BR-c). Not a defect.
  - **Overlay primitive** → BR-1 "compose, don't rebuild" + the v6 export-dialog precedent fix it: compose UI-1
    `Dialog` + a hand-rolled combobox/listbox; no `packages/ui` edit (S3-BR-a,b). Input pass-through carries the
    combobox ARIA (input.tsx:192-194) — verified, no type-widening.
  - **Disclosed (DEF-S3-a, deferred):** Dialog's visible `title` + centered positioning are accepted for M1.0; an
    sr-only title + a top-anchored/`sheet` command-palette placement are DS enhancements, out of BR-1's `packages/ui`
    fence for S3 (S3-BR-h).

## 7. Change Log

| Date       | Session                                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-4 | S3 detailed spec authored (⌘K command-bar overlay: Dialog+Input compose, combobox/listbox, ⌘K keydown, router injection, search-unavailable states; BR-a..j; §5 7-step prompt; §6 = none/all doc-resolved) — per Step-0 baseline (current) + the shipped UX-2 model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-17 | 2026-08-16-ui-4-app-shell-components-4 | **Approval 2 ✅ → IMPLEMENTED. Visual-Gate finding (§XXVIII deviation): ⌘K dead on a real Mac** — the button opened the overlay but the shortcut didn't, because `detectPlatform()` resolved `'other'` (Brave farbles `navigator`) → the single-mod listener expected Ctrl+K. Fix: lenient match `(metaKey OR ctrlKey) && key==='k'` (S3-BR-f); `resolveKeybind` stays the canonical/display binding. +2 regression tests (⌘K opens under a farbled 'other' platform; Ctrl+K opens under 'mac'). jsdom couldn't catch it (a test controls `navigator`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-4 | **Approval 1 ✅. Rev 3 — /preflight PASSED (3 folds).** FOLD-1 option DOM id = `cmdbar-opt-${slug(command.id)}` (raw ids hold `:`/`/` → querySelector-unsafe; `aria-activedescendant` refs the slug). FOLD-2 M1.0-built (idle · loading · `role=status` message for search-unavailable/empty/error) vs DB-8-seam (`results` grouped listbox = TODO, unbuilt). FOLD-3 post-nav focus: Dialog's guarded restore (dialog.tsx:200-201, body fallback) handles the unmounted pre-open element; page-nav focus is the router's, not S3's. No new material.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-4 | **Rev 2 — gate-1 critique (independent) REVISE folded** (2 blockers + 4 material + minors; the load-bearing S3-BR-b Input-passthrough claim was VERIFIED by the critic compiling it — no `packages/ui` edit, BR-1 holds). **B1** options are non-focusable `role=option` divs so Dialog's `getFocusable`==`[input]` (single-stop trap; focus-into lands on the input) — asserted+tested. **B2** the M1.0-shipping empty-search state: `aria-activedescendant` OMITTED when zero options (no dangling IDREF), ↑/↓ no-op, `search-unavailable` is `role=status` not a listbox. **M1** ⌘K is open-only, not a "toggle" (Esc/backdrop close). **M2** cite command-bar-and-search.md:32 — "type-ahead filters" is search-mode narrowing, not a command-mode filter (the store's mode-flip makes command-filtering structurally impossible). **M3** `ctx` rebuilt per render (live navigate). **M4** acceptance parity: ≥44×44 rows + token-only listbox + visible-title lines. Minors: precise cites (dialog focus-return :182-203; barrel Input:25/Dialog:31; overlayHost marker :172-182). |
