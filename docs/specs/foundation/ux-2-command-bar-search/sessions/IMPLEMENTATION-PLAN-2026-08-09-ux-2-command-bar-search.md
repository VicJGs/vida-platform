# IMPLEMENTATION-PLAN — UX-2 Command bar + Search   (session: 2026-08-09-ux-2-command-bar-search · language: English)
> Human gate 2: read to catch a wrong / missing / destructive step BEFORE code. Self-sufficient build prompt; each
> step cites the PLAN rule it satisfies. Derived from the APPROVED PLAN Rev 2 (§6 Approval 1, 2026-08-09, D1–D5 as
> recommended). No step imports an unbuilt system. FULL variant — the `apps/web/src/command-bar/` artifact is code.

## 1. Full context
- **Deliverable (2 artifacts, dual home):** (1) an interaction-model **design doc**; (2) a declarative **command-bar
  contract** code artifact. `[FACT: PLAN §2 IN.1/IN.2]`
- **What it is:** the `⌘K` global overlay interaction model — two modes (Command/Search), frecency+pinning command
  model, focus contract, keybind semantics, all terminal states incl. explicit **search-unavailable**. `[FACT: PLAN §2a-f]`
- **The seam discipline (the whole point):** three backing systems are UNBUILT — `command_bar_history`
  (MOD-prefs/M1.1), FTS5 (DB-8/M1.4), the render host (UI-4). The artifact **derives** nav commands from the real
  `module-map.ts`, **types** the frecency/history shape from the v1 schema, and **stubs** search behind a seam.
  Nothing here imports an unbuilt module. `[FACT: PLAN §1 constraint; baseline §2]`
- **Homes (VERIFIED):** doc → `docs/core/architecture/command-bar-and-search.md` (D3); code →
  **`apps/web/src/command-bar/`** — a NEW non-component data/logic dir, sibling of `nav/`, **NOT** under
  `components/` (that is UI-4's render dir) `[FACT: PLAN §2 IN.2; nav/CLAUDE.md "Data, not chrome"]`; the ephemeral
  store → `apps/web/src/stores/command-bar-ui-store.ts` (the AR-4 sibling pattern) `[FACT: app-shell-ui-store.ts]`.
- **Ground-truth floors:** `MODULE_MAP` + `GLOBAL_SURFACES` shape `[FACT: module-map.ts:35-121]`; the v1 history
  shape `[FACT: schema.v1.ts:1291]`; the Zustand ephemeral-only rule (BR-RT-6) `[FACT: app-shell-ui-store.ts:4-6]`;
  the test pattern (vitest, colocated `*.test.ts`, `// @vitest-environment jsdom` only where DOM is needed)
  `[FACT: apps/web/src/lib/forms.test.tsx:1-4]`; **no feature barrels** `[FACT: STANDARDS §XX]`; visual/terminal
  states + focus/a11y `[FACT: components.md §VIII; engineering.md §XIV:84-85]`.

## 2. Scope of changes
**Files touched (all NEW except the one doc-index row):**
1. `docs/core/architecture/command-bar-and-search.md` — NEW doc (IN.1)
2. `docs/core/architecture/README.md` — EDIT: add one index row for the new doc
3. `apps/web/src/command-bar/types.ts` — NEW
4. `apps/web/src/command-bar/nav-commands.ts` + `nav-commands.test.ts` — NEW
5. `apps/web/src/command-bar/frecency.ts` + `frecency.test.ts` — NEW
6. `apps/web/src/command-bar/search-provider.ts` + `search-provider.test.ts` — NEW
7. `apps/web/src/command-bar/registry.ts` + `registry.test.ts` — NEW
8. `apps/web/src/stores/command-bar-ui-store.ts` + `command-bar-ui-store.test.ts` — NEW
9. `apps/web/src/command-bar/CLAUDE.md` — NEW layer doc (ADR-018 §3.6)

**NOT done (table):**
| Not done | Why / owner |
|----------|-------------|
| Any rendered React component (overlay, input, result list, dock icon) | UI-4 renders the model `[PLAN §3]` |
| Create/import the `command_bar_history` table | MOD-prefs, M1.1 — typed as a seam only `[baseline §2]` |
| Import/implement FTS5 or any real search ranking | DB-8, M1.4 — behind the stub seam `[PLAN §2d]` |
| Per-module action commands | each module contributes at M1.1+ via `CommandProvider` `[PLAN §2c]` |
| Edit `routes.tsx` / register routes | AR-4 owns the central tree; commands `navigate()`, don't register `[PLAN §2f]` |
| "Toggle theme" seed action | no theme store exists in the thin shell (D4 guard) `[baseline §1]` |
| A barrel `index.ts` in `command-bar/` | STANDARDS §XX — consumers import specific files `[nav/ precedent]` |
| Client-state *conventions* | UX-4 — UX-2 only places its own store per the existing AR-4 pattern `[PLAN §3]` |

## 3. Exact changes

### 3.1 — `apps/web/src/command-bar/types.ts` (NEW) — satisfies PLAN §2b/c/d/e, D5
The contract UI-4 renders against. Shapes only (no logic):
- `CommandCategory = 'navigation' | 'action' | 'search'`.
- `Command` = `{ id: string; label: string; category: CommandCategory; keywords?: string[]; run: (ctx: CommandRunContext) => void; visibleWhen?: string }`. `run` receives a `CommandRunContext` = `{ navigate: (path: string) => void }` — the ONLY host capability commands may use now (keeps nav decoupled from `routes.tsx`; UI-4 injects the real `navigate`). `[PLAN §2f]`
- `CommandProvider` = `{ id: string; getCommands: () => Command[] }` — the seam modules implement at M1.1+. `[PLAN §2c]`
- `CommandHistoryEntry` — mirrors the v1 six fields EXACTLY: `{ command_key: string; command_label: string; command_category: string | null; use_count: number; last_used_at: number | null; is_pinned: 0 | 1 }`. This is the **v2 MOD-prefs target-shape assertion** `[FACT: schema.v1.ts:1291]`.
- `SearchResult` = `{ id: string; entityType: string; title: string; routePath: string }` — **display-only fields** (already client-decrypted view data; the ZK-safe surface — PLAN §2d reserve).
- `SearchResultGroup` = `{ entityType: string; results: SearchResult[] }`.
- `SearchStatus = 'idle' | 'typing' | 'loading' | 'results' | 'empty' | 'search-unavailable' | 'error'` — **all terminal states, fail-loud** `[FACT: components.md §VIII; PLAN §2e]`.
- `SearchOutcome` = `{ status: SearchStatus; groups?: SearchResultGroup[]; message?: string }`.
- `SearchProvider` = `{ search: (query: string) => Promise<SearchOutcome> }` — the DB-8 seam. `[PLAN §2d]`
- `CommandKeybind` = `{ key: 'k'; mod: 'meta' | 'ctrl'; preventDefault: true }` + `resolveKeybind(platform): CommandKeybind` (meta on mac, ctrl else). **Binding as DATA, not hardcoded in UI-4** `[PLAN §2a; D5]`.

### 3.2 — `apps/web/src/command-bar/nav-commands.ts` (+ test) — satisfies PLAN §2c
`deriveNavCommands(map = MODULE_MAP, surfaces = GLOBAL_SURFACES): Command[]`:
- Emit one `navigation` command per entry with a **non-null `routePath`** (dock/global/secondary have routes;
  `non-nav`/`spaces-only` have `routePath: null` → excluded — reached within a realm, not directly). `[FACT: module-map.ts:33,45]`
- Merge `GLOBAL_SURFACES` targets; **de-dupe by `routePath`** (journals/`/`, notifications, settings appear in BOTH
  arrays) — MODULE_MAP entry wins. The `command-palette` surface has `routePath: null` → **self-excluded** (no
  "go to search" command). `[FACT: module-map.ts:114-121]`
- `label` = entry.label (UX label, e.g. "Home", "Settings"); `id` = `nav:${routePath}`; `run` = `ctx.navigate(routePath)`.
  **Never assume `'/'+key`** (relationships→`/people`). `[FACT: nav/CLAUDE.md]`
- Carry `visibleWhen` onto the command (gamification) so the host filters by flag — do NOT hardcode/drop it. `[FACT: module-map.ts:102]`
- **Test (pure, no jsdom):** **pin the literal expected count = 21** (19 non-null `MODULE_MAP` routes + 2
  GLOBAL-only: `/calendar`, `/graph`; the 3 overlaps `/`·`/notifications`·`/settings` dedupe away — NOT a
  tautological `toBe(derive().length)`); assert `/calendar` **and** `/graph` ARE present (GLOBAL-only proof);
  `/people` present & `/notes`≠key assumption; no `command-palette`/null-route entries; dedupe → exactly one `/`
  command; `visibleWhen` preserved on gamification; a spy `navigate` receives the right path from `run`.

### 3.3 — `apps/web/src/command-bar/frecency.ts` (+ test) — satisfies PLAN §2b
`rankByFrecency(commands: Command[], history: CommandHistoryEntry[]): Command[]` — pure, no table, no I/O:
- Pinned first (`is_pinned === 1`), then by a frecency score `f(use_count, last_used_at, now)` (recency-weighted
  frequency); unknown commands (no history row) keep a stable order after ranked ones. `now` is an **injected param**
  (`now: number`) — deterministic tests, no `Date.now()` in the pure core.
- Join key = `command_key` ↔ `Command.id`.
- **Test (pure):** pinned outranks higher-use non-pinned; more-recent outranks older at equal use_count; empty
  history → input order preserved; fixture rows use the **exact v1 six fields** → doubles as the MOD-prefs contract check.

### 3.4 — `apps/web/src/command-bar/search-provider.ts` (+ test) — satisfies PLAN §2d
- Export `stubSearchProvider: SearchProvider` whose `search()` resolves `{ status: 'search-unavailable', message:
  'Search activates when the index is built (DB-8).' }` — **the guarded gap; no FTS5 import** `[FACT: baseline §2]`.
- Export `emptyQueryOutcome()` → `{ status: 'idle' }` for blank query.
- **Test:** stub resolves `search-unavailable` for any query; never throws; blank → idle.

### 3.5 — `apps/web/src/command-bar/registry.ts` (+ test) — satisfies PLAN §2c/b
- `createCommandRegistry()` → `{ register(p: CommandProvider): void; collect(history?: CommandHistoryEntry[], now?: number): Command[] }`.
- `collect` = flatten all providers' `getCommands()` → `rankByFrecency`. Built-ins registered by the caller: the
  nav provider (`{ id:'nav', getCommands: () => deriveNavCommands() }`) + a `shellActionsProvider` seed = **only
  "Toggle sidebar"** (`run: () => useAppShellUIStore.getState().toggleSidebar()` — already-built state, D4)
  `[FACT: app-shell-ui-store.ts:18]`. NO theme toggle.
- **Test:** two providers merge; frecency applied; a registered action command runs its effect.

### 3.6 — `apps/web/src/stores/command-bar-ui-store.ts` (+ test) — satisfies PLAN §2f, M1 focus
Ephemeral Zustand (AR-4 pattern, BR-RT-6 — no entity data, no persistence) `[FACT: app-shell-ui-store.ts]`:
- State: `isOpen: boolean; query: string; mode: 'command' | 'search'`.
- Actions: `open()`, `close()` (clears query, resets mode → `command`; the focus-RESTORE-to-trigger is a documented
  contract for UI-4, noted in the doc — the store just signals closed), `setQuery(q)` → **auto-switches `mode` to
  `search` when `q` non-empty, back to `command` when cleared** (the two-mode transition, PLAN §2a).
- **Test:** `open` sets isOpen; `setQuery('x')`→mode `search`; `setQuery('')`→mode `command`; `close` resets all.

### 3.7 — `apps/web/src/command-bar/CLAUDE.md` (NEW layer doc — ADR-018 §3.6)
What lives here (contract + derivation + seams, NOT chrome); the rules (data-not-chrome; no unbuilt imports; no
barrel; nav derived from module-map; search behind the stub until DB-8; history typed to the v1 shape).

### 3.8 — `docs/core/architecture/command-bar-and-search.md` (NEW doc — IN.1) — satisfies PLAN §2a-f
The interaction model prose: overlay + two modes; keyboard grammar + **focus contract** (enter on open, restore to
trigger on close, visible ring — `engineering.md §XIV`); **keybind semantics** (`⌘K`/`Ctrl+K` + preventDefault +
non-keyboard affordance reserved for UI-4/mobile — D5); the frecency+pinning model (v1 shape); command sources
(nav-derived + provider seam); search UX + result grouping + **all terminal states incl. search-unavailable**; the
ZK display-constraint reserve (result contract carries display-only fields; history stores app vocabulary, not
plaintext); explicit ownership hand-offs (UI-4 renders · MOD-prefs backs history · DB-8 backs search).

### 3.9 — `docs/core/architecture/README.md` (EDIT) — add one index row for the new doc.

## 4. Build order & done-check
1. `types.ts` → 2. `nav-commands.ts`(+test) → 3. `frecency.ts`(+test) → 4. `search-provider.ts`(+test) →
5. `registry.ts`(+test) → 6. `stores/command-bar-ui-store.ts`(+test) → 7. `CLAUDE.md` → 8. the design doc + README row.
**Done = PLAN §4 acceptance:** typecheck + lint green; `pnpm --filter @vida/web test` green (new tests pass); zero
imports of `command_bar_history`/FTS5/UI-4; nav commands derived (not duplicated); doc promoted to
`docs/core/architecture/`. Then → `victor:quality-gate` (engineering) → commit/PR.

## 4a. Preflight folds (PASSED 2026-08-09 — 3 clarifications, no blockers)
- **F1 — test env.** `vite.config.ts` uses `include: ['src/**/*.test.{ts,tsx}']`, env `node` `[FACT: vite.config.ts:26-28]`.
  **Every UX-2 test is pure logic / Zustand-vanilla → node-safe; add NO `@vitest-environment jsdom` pragma anywhere.**
- **F2 — run-dispatch rule (document in `types.ts` doc-comment + CLAUDE.md).** Two justified patterns: **navigation**
  commands act via the injected `CommandRunContext.navigate` (the router is UI-4-injected, not available at registry
  build time); **action** commands (e.g. Toggle sidebar) call the already-global Zustand store directly
  (`useAppShellUIStore.getState()`). The asymmetry is intentional — router = host-injected, store = global singleton.
- **F3 — intra-app coupling.** `registry.ts`'s `shellActionsProvider` imports `stores/app-shell-ui-store` (both built,
  same app) — a legitimate `command-bar/ → stores/` import, not a layering violation.

## 5. Open UNKNOWNs
- none blocking. D3 doc-home confirmed (new file). Frecency scoring formula is an implementation detail bounded by
  the tested invariants in §3.3 (pinned-first, recency-weighted) — not a gate decision.
