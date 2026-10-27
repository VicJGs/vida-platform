<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R5 · Modules + ⌘K
     Implements PLAN-R5 rev 2 (Approval 1: Victor 2026-10-27, D-R5-1 = A + A1, option D not taken). Worktree @ d3a1880. -->

# IMPLEMENTATION-PLAN-R5 — Modules + ⌘K

> **Status:** rev 2, 2026-10-27 — **/preflight PASSED** (run 2) · independent gate-2 critique **REVISE** (3 blocking, 9 nits), all folded (Gate record). **Approval 2 given (Victor, 2026-10-27), incl. D-R5-2 + D-R5-3.** **Two §XXVIII items for Victor at
> Approval 2: D-R5-2 · D-R5-3** (below).
> **Runtime:** run every suite on **Node ≥ 22** (`nvm use 24`; the shell default v20.20.2 can't load jsdom/undici).
> **Verified against (installed):** `@tanstack/react-query` 5.101.4 (`invalidateQueries` on an exact key refetches
> active observers) · React 19 · vitest 3.2 (per-file `// @vitest-environment jsdom`).

## §XXVIII — deviations from PLAN-R5 rev 2 wording (Victor, Approval 2)
- **D-R5-2 · The dock isn't mounted in the live app, so its Visual-Gate cells are unit-proven only.**
  - **What PLAN said.** PLAN-R5 Visual Gate 13/14 check hide/rename in "the dock (sidebar, rail, drawer)", and §6 calls
    the dock's subscription a risk.
  - **On disk.** No production module imports `module-dock.tsx` `[FACT: grep "module-dock" apps/web/src — only its test,
    shell-panel.tsx's comment, nav-link.tsx's comment]`. The fe-shell #14 reshape replaced the S1 dock with the Modules
    panel, whose body is still a placeholder `[FACT: shell/app-shell.tsx:44-60; shell/CLAUDE.md:64-65]`. Mounting the dock
    in that panel is **shell-rescope's** scope `[FACT: .claude/tasks/shell-rescope.md:9,17 "dock mounted … Modules
    panel"]`.
  - **Change.** R5 still makes the dock **reader** honor visibility and names (decisions.md:80 homes the readers here),
    proven by unit tests (PLAN acceptance 2). Live, R5 can only prove ⌘K. The dock cells of Visual Gate 13/14 are
    recorded "unit-proven; re-verified live when shell-rescope mounts the dock", the R4 precedent for unmountable
    surfaces (R4 acceptance 11, the graph).
  - **Edge (R8).** shell-rescope's scope line still says "read moduleVisibility/rename/reduceMotion". That predates
    decisions.md:80. The edge tells it the readers ship here and that it only mounts.
- **D-R5-3 · `pinCommand(command_key, pinned, command_label?, command_category?)`.**
  - **Why.** A1 says "creates the row when absent", but a row needs a `command_label` (NOT NULL,
    `schema/preferences.ts:108`) and today's signature carries none (`service.ts:226`).
  - **Change.** Two optional trailing parameters.
  - **Rules.** An absent row with `pinned: true` and a non-empty label (`label.trim() !== ''`) → create (`use_count: 0`, `last_used_at: null`,
    `is_pinned: true`), validated by `RecordCommandSchema`. An absent row with `pinned: false`, or with no/empty label → no-op,
    as today. A present row → update the flag only (the label is not overwritten; display reads the live label anyway,
    R5-BR-4).
  - **Compatibility.** Existing callers and the D-S3 test keep compiling. The test is re-cut into "no label → no-op" +
    "label → creates".

## Files (build order)
| # | File | Change | PLAN |
|---|---|---|---|
| 1 | `apps/web/src/nav/nav-prefs.ts` (new) | `ALWAYS_REACHABLE_KEYS` (moved) · `isHideableModule(e)` = `e.placement === 'dock' && !ALWAYS_REACHABLE_KEYS.has(e.key)` · `type NavPrefs = { visibility: Record<string, boolean>; names: Record<string, string> }` · `applyNavPrefs<T extends { key: string; label: string; placement: NavPlacement }>(entries: readonly T[], prefs?: NavPrefs): T[]` · **`MANAGED_SURFACE_KEYS = ['features','sync'] as const`** (the valid non-entry keys live here, so `nav/` never imports `settings/`) · DEV `warnInvalidNavKeys(prefs)` (once per key per session, module-level `Set`; valid = hideable keys ∪ `MANAGED_SURFACE_KEYS`). **Call site: `applyNavPrefs` itself** (both readers get it; the `Set` makes repeat renders silent) | BR-2/3/4 |
| 2 | `apps/web/src/settings/settings-model.ts` | import `ALWAYS_REACHABLE_KEYS`, `isHideableModule` from `nav/nav-prefs`; re-export `ALWAYS_REACHABLE_KEYS` (existing importers keep working); `HIDEABLE_MODULES = MODULE_MAP.filter(isHideableModule).map((m) => ({ key: m.key, label: m.label }))` (projection kept); `MANAGEABLE_SURFACES` keeps its labels/descriptions, its keys typed against `MANAGED_SURFACE_KEYS` (a test asserts the two sets equal). One-way import settings → nav (no cycle, no TDZ) | BR-2 |
| 3 | `apps/web/src/preferences/preferences-writer.ts` | `VISIBILITY_KEYS` = `MODULE_MAP.filter(m => m.placement === 'dock')` keys + `MANAGED_SURFACE_KEYS` from `nav/nav-prefs` (**unchanged membership**: the write side still accepts every dock key, incl. `gamification`, D13b; only the read side excludes always-reachable keys, which aren't dock keys today). A comment points at `isHideableModule` | BR-2 |
| 4 | `apps/web/src/command-bar/nav-commands.ts` | `deriveNavCommands(map = MODULE_MAP, surfaces = GLOBAL_SURFACES, prefs?: NavPrefs)` → `applyNavPrefs(map, prefs)` first; surfaces untouched | BR-2/4 |
| 5 | `apps/web/src/command-bar/registry.ts` | `createNavProvider(prefs?: NavPrefs): CommandProvider`; `navProvider = createNavProvider()` (registry test unchanged: 22) | BR-2 |
| 6 | `packages/core/src/services/preferences/service.ts` (+ test) | D-R5-3 `pinCommand` | D-R5-1 A1 |
| 7 | `apps/web/src/preferences/preferences-keys.ts` | `COMMANDS_KEY = ['preferences','commands'] as const` | BR-5 |
| 8 | `apps/web/src/preferences/command-history.ts` (new) | `toHistoryEntry(row)` · `createCommandHistory({ getService, queryClient, log })` → `{ record(cmd), pin(cmd, pinned): Promise<boolean>, idle(): Promise<void> }` · `commandHistory` app instance (over `getServices`, the singleton `queryClient`, `console.warn`) · `resetCommandHistoryForTests()` | BR-6 |
| 8b | `apps/web/src/settings/settings-copy.ts` (+ `settings-copy.test.ts`) | **R3-BR-10 / F17 — every R5 string in the ONE copy module:** `cmdPinned(label)` → `Pinned ${label}` · `cmdUnpinned(label)` · `cmdPinFailed(label)` → `Couldn’t pin ${label}` · `cmdUnpinFailed(label)` → `Couldn’t unpin ${label}` · `cmdPinnedSuffix` → `, pinned` · `cmdHintMac` → `⌥P pins the highlighted command` · `cmdHintOther` → `Alt+P pins the highlighted command` (a full sentence — it is now the combobox's `aria-describedby`, read by SRs). Functions take the label; the module still imports nothing. The `lintCopy` test is re-cut: `Object.entries` now yields functions → call them with a sample label | BR-7 |
| 9 | `apps/web/src/preferences/preferences-queries.ts` | `commandHistoryQuery()` = `{ queryKey: COMMANDS_KEY, retryOnMount: false, retry: 0, staleTime: PREFERENCES_STALE_MS, gcTime: PREFERENCES_GC_MS, queryFn: async () => (await (await getServices()).preferences.getCommandHistory()).map(toHistoryEntry) }`. **Not** in the boot seed (⌘K is not first-paint) | BR-5 |
| 10 | `apps/web/src/shell/command-bar.tsx` | see "Key algorithms" §C | BR-5/6/7/8 |
| 11 | `apps/web/src/shell/module-dock.tsx` | `visibleDockGroups(prefs?: NavPrefs)` → `applyNavPrefs` over the dock entries after the flag filter; `ModuleDock` reads `usePreferences().view` → `{ visibility: view.moduleVisibility, names: view.moduleNames }`; `entry.label` already flows to `NavLink label` (rail `aria-label`) | BR-2/3/4 |
| 12 | `apps/web/src/settings/modules-pane.tsx` | rebind (§D) | BR-1 |
| 13 | `apps/web/src/stores/preferences-store.ts` · `preferences/preferences-bridge.tsx` | remove `moduleVisibility`/`moduleNames`/`setModuleVisible`/`setModuleName` (+ from `hydrate`'s key union); `MIRRORED` = 7; header comments | BR-1 |
| 14 | `apps/web/src/test/preferences-test-utils.tsx` | the fake gains `recordCommand`/`pinCommand`/`getCommandHistory` with a **real read-then-create window** (`await tick()` between the lookup and the insert, a duplicate insert throws `UNIQUE constraint failed: command_bar_history.command_key`), plus `state.history` + `state.failHistory: 'none' \| 'read' \| 'write'` | tests |
| 15 | Test harnesses: `shell/test-router.tsx` (wraps in `createPrefsWrapper()`), `shell/module-dock.test.tsx`, `shell/command-bar.test.tsx`, `shell/app-shell.test.tsx`, `routes.test.tsx`, `App*.test.tsx`, `session-hud-surface.test.tsx` (mounts the real router → now renders CommandBar, `routes.tsx:31`) as needed. `renderInShell` gains an **opt-in** `{ prefs: true }` option (wraps `createPrefsWrapper()`), NOT a default — the singleton client would otherwise share cache across every `renderInShell` file: `vi.mock('../db/composition-root', …compositionRootMock())` + reset hooks | tests |
| 16 | Docs (§XXIX) | PLAN §3 row 11, + `nav/CLAUDE.md` (nav-prefs) + `packages/core/src/services/preferences/CLAUDE.md` (D-R5-3) | — |

## Key algorithms
**§A · `applyNavPrefs` (pure).**
```ts
export function applyNavPrefs<T extends NavEntryLike>(entries: readonly T[], prefs?: NavPrefs): T[] {
  if (!prefs) return [...entries]
  const out: T[] = []
  for (const e of entries) {
    if (!isHideableModule(e)) { out.push(e); continue }      // Settings/Home/global/secondary: never touched (EC-8)
    if (prefs.visibility[e.key] === false) continue           // hidden (absent/true = shown)
    const name = prefs.names[e.key]
    out.push(typeof name === 'string' && name.trim() !== '' ? { ...e, label: name } : e)
  }
  return out
}
```
- `applyNavPrefs` calls `warnInvalidNavKeys(prefs)` first (DEV only). It flags each map key that is neither hideable nor
  in `MANAGED_SURFACE_KEYS`. The pane can't produce one, because the writer rejects it. It comes from a synced or forged row.
- The managed surfaces are in no entry list, so `applyNavPrefs` never sees them.

**§B · The history chain (`command-history.ts`).**
```ts
let tail: Promise<unknown> = Promise.resolve()
function enqueue<R>(op: () => Promise<R>, fallback: R): Promise<R> {
  const run = tail.then(op).catch((e) => { log('command history write failed', e); return fallback })
  // NOT awaited: invalidateQueries returns refetchQueries, which awaits the active query's fetch (query-core 5.101.4
  // queryClient.js:148-179). Chaining it would make the next write wait on a read (and its retry), and a hung read
  // would stall every later write.
  tail = run.then(() => { void queryClient.invalidateQueries({ queryKey: COMMANDS_KEY, exact: true }) })
  return run
}
record = (c) => void enqueue(async () => (await getService()).recordCommand(c.id, c.label, c.category), undefined)
pin = (c, pinned) => enqueue(async () => { await (await getService()).pinCommand(c.id, pinned, c.label, c.category); return true }, false)
idle = () => tail.then(() => undefined)
```
- `record` returns `void` and never rejects (best-effort).
- `pin` resolves `true`/`false`, which drives the announcement copy.
- The invalidate is **triggered** after each op settles, never awaited, so `tail` resolves as soon as the write settles:
  writes stay strictly ordered, and reads run unordered with later writes. That converges, because every write is
  followed by its own invalidate. `run` never rejects (its catch), so `tail` can't be poisoned. The query also sets
  `retry: 0` (a local read; the app default is `retry: 1`, `lib/query-client.ts`).

**§C · `CommandBar`.**
1. **Reads.**
   - `const { view } = usePreferences()`
   - `const history = useQuery(commandHistoryQuery())`
   - `const prefs = useMemo(() => ({ visibility: view.moduleVisibility, names: view.moduleNames }), [view.moduleVisibility, view.moduleNames])`
2. **Command list.** `commands = useMemo(() => { registry over createNavProvider(prefs) + shellActionsProvider; collect(history.data ?? [], Date.now()).filter(flag) }, [prefs, history.data])`.
   - Loading or error → `history.data` is `undefined` → unranked (BR-5).
   - `Date.now()` inside the memo is fine: it re-ranks on data change only.
3. **Active option by id (BR-8).**
   - `const [activeId, setActiveId] = useState<string | null>(null)`
   - `index = Math.max(0, options.findIndex((o) => o.id === activeId))`; `activeOption = options[index]`.
   - The `useEffect` reset changes from `[mode, options.length]` to `[mode, isOpen]` (→ `null`). `isOpen` too, because
     CommandBar stays mounted and `close()` leaves `mode` at `command`, so a stale id would survive close/reopen.
     `setQuery`/`close` drive `mode` (`command-bar-ui-store.ts:23-24`); no test depends on the length reset.
   - The arrow keys set `activeId` to `options[(index ± 1) mod n].id`; hover sets `options[i].id`.
   - Removing the length dependency is what keeps the highlight on a re-ranked command. A hidden active command just
     falls back to index 0.
4. **Execute.** `execute(cmd)`: `cmd.run(ctx); close(); commandHistory.record(cmd)`, in that order.
5. **Pin key.** At the **top** of `onInputKeyDown`, above the existing `if (options.length === 0) return` (`command-bar.tsx:101`):
   ```ts
   if (e.code === 'KeyP' && e.altKey && !e.ctrlKey && !e.metaKey) {
     e.preventDefault()
     if (activeOption) void togglePin(activeOption)
     return
   }
   ```
   - `togglePin` reads `pinned` from a local `pendingPins: Map<id, boolean>` first, else `historyEntry(id)?.is_pinned === 1`,
     so two quick presses toggle twice instead of both reading the stale cache. It sets `pendingPins[id] = !pinned`,
     awaits `commandHistory.pin(cmd, !pinned)`, then deletes the pending entry once the refetched history agrees (or
     the op failed). The announcement is `cmdPinned`/`cmdUnpinned` on success, `cmdPinFailed`/`cmdUnpinFailed` on
     failure (file 8b). The **ranking** reads `pendingPins` over history too (an overlay entry `is_pinned`), so the row
     moves at once.
   - Announce by clearing, then setting on the next frame (`setAnnouncement('')` → `requestAnimationFrame(() =>
     setAnnouncement(text))`), so two identical messages in a row are both read.
   - It rides `onKeyDown` on the input (the single tab stop). It runs only in command mode (`options.length > 0`), but
     its `preventDefault` runs in any mode so no `π` lands in the field.
6. **Live region.** The house pattern: a raw `<span role="status" aria-live="polite" style={SR_ONLY}>{announcement}</span>`
   (`session-hud.tsx:95,209`; `year-view.tsx:246`), not a Tamagui `Text` with a `CSSProperties` style. It is rendered
   **unconditionally** inside the Dialog body and cleared on close. `SR_ONLY` is a local copy of the NG-5 recipe
   (`packages/ui/src/internal/calendar-shared.ts:8-20`; `internal/` is not exported to apps/web).
   - Containing block: the Dialog body is an `overflowY: auto` scroller (`dialog.tsx:307`). The region sits inside a
     positioned child of that scroller, so it can't widen the page. The Visual Gate overflow probe confirms it.
   - The search-mode `SearchStatusRegion` keeps its own `role="status"`. The two never announce at once.
7. **Pinned rows.** A trailing Lucide `Pin` (16, `aria-hidden`, `$colorTextMuted`) and an `aria-label` of
   `label + SETTINGS_COPY.cmdPinnedSuffix` on the option (the visible text stays the label).
8. **Footer hint.** `<Text id={hintId} fontSize="$caption" color="$colorTextMuted">` reading `SETTINGS_COPY.cmdHintMac`
   when `detectPlatform() === 'mac'`, else `cmdHintOther`. It renders in command mode with ≥1 option and is **exposed**:
   the combobox gets `aria-describedby={hintId}` (Input forwards it, `input.tsx:105-109`). That is the SR path to learn
   the gesture (WCAG 1.3.1: visible instructions not hidden from assistive tech). No `aria-keyshortcuts`: on the
   combobox it would claim Alt+P activates the combobox itself, and VoiceOver doesn't read it.

**§D · `ModulesPane`.**
- `const { view } = usePreferences(); const { readOnly, update } = useSettings()`.
- **Row.** `visible = view.moduleVisibility[key] ?? true`, `displayName = view.moduleNames[key] ?? module.label`.
  - The switch writes `update({ moduleVisibility: { [key]: v } })`.
  - Save writes `update({ moduleNames: { [key]: trimmed } })` when `trimmed !== ''` (and an echo-equal name is dropped by
    `withoutEcho`).
- **`<Input maxLength={40}>`.** `Input` forwards it (`InputProps extends InputHTMLAttributes`, `input.tsx:114-118,194`).
- **Accessible names.** Every aria-label uses `displayName`: `Rename ${displayName}`, `Save name for ${displayName}`,
  `Cancel renaming ${displayName}`, `Show ${displayName} in the nav`.
- **Surfaces.** `checked = view.moduleVisibility[s.key] ?? true`, writes `update({ moduleVisibility: { [s.key]: v } })`.

## Build Steps (TDD — each: write the test, see it fail, implement, see it pass)
0. `nvm use 24` · `git log -1` = d3a1880 (+ this doc) · targeted baseline: `command-bar` · `module-dock` · `modules-pane` ·
   `nav-commands` · `registry` · `preferences-*` · `app-shell` · `routes` green before edits. Grep the blast radius
   (`ModuleDock|CommandBar|AppShell|deriveNavCommands|HIDEABLE_MODULES|ALWAYS_REACHABLE_KEYS|VISIBILITY_KEYS|preferences-store|moduleVisibility|moduleNames`).
1. `nav-prefs.test.ts`:
   - hidden omitted · renamed relabelled · whitespace name ignored
   - `preferences`/`journals`/global entries untouched by `false`+names
   - unknown key inert + DEV-warned once
   - no prefs = identity
   - a flag-off entry: still filtered by the caller (the documented order)
   - `HIDEABLE_MODULES`/`VISIBILITY_KEYS` key snapshots unchanged
   - → implement §A, steps 2–3 files.
2. `nav-commands.test.ts` + `registry.test.ts`: with prefs → hidden `nav:/tasks` absent, renamed label, `nav:/settings`
   + `nav:/` present under forged `false`. No prefs → today's 21. → implement files 4–5.
3. Core `preferences-service.test.ts`: re-cut D-S3 (no label → no-op; label → creates `use_count 0`, `last_used_at null`,
   `is_pinned true`, leads `getCommandHistory`; `pinned:false` on absent → no-op; present → flag only, label unchanged)
   → implement file 6 · `pnpm --filter @vida/core build` (apps/web consumes dist).
4. `command-history.test.ts` over the fake (file 14 first):
   - two back-to-back `record` of a new key → one row, `use_count 2` (and, as the guard, **without** the chain the fake
     throws UNIQUE)
   - `pin` right after the first `record` lands pinned
   - a rejected op logs, resolves (`record` → undefined, `pin` → false), the next op runs
   - invalidation after each settle (spy `invalidateQueries`), **not awaited**: with `failHistory: 'read'` and a held
     read, a `pin` right after a `record` settles without waiting on the read
   - `toHistoryEntry` maps `true` → 1
   - → implement files 7–8.
5. `preferences-queries.test.ts`: `commandHistoryQuery()` key/stale/gc/`retryOnMount:false`; queryFn maps rows; not
   part of `seedPreferences` (spy). → file 9.
6. `command-bar.test.tsx` (wrapper + mock):
   - **reactive:** open → write a hide through the writer → the option disappears without remount; rename → the new name
   - **ranked:** seeded history ranks a frequent command first and a pinned one leads; history read failing → the
     unranked list, no error text
   - **execute order:** `run` spy before the fake's `recordCommand`
   - **activeId:** arrow to row 3, pin it → still `aria-activedescendant` = its id, and Enter runs it
   - **pin key:**
     - `{ code:'KeyP', altKey:true, key:'π' }` toggles and announces "Pinned …"
     - `metaKey` variant → nothing
     - a failure → "Couldn't pin …"
     - the region exists before the first pin (empty)
     - the pinned option's name ends ", pinned"
   - **footer** by platform (mock `lib/platform`); the combobox's `aria-describedby` resolves to the hint text
   - **pending pins:** two quick Alt+P presses → pin then unpin (two service calls with `true` then `false`)
   - **repeat announcement:** two failures in a row → the region is cleared between them
   - **reopen:** close + reopen → the first option is active again
   - **never-run key:** pin it → it leads the list after the refetch (acceptance 7)
   - copy asserted through `SETTINGS_COPY` (curly ’), never literals
   - first, **file 8b** (`settings-copy` entries + the `lintCopy` test re-cut for function entries) → then file 10.
7. `module-dock.test.tsx`: seeded prefs hide Tasks + rename Habits → link absent / named "Rituals" (sidebar + rail
   `aria-label`); hiding every Productivity module drops its heading; forged `false` on `journals` → no effect (not a
   dock entry anyway; asserts no crash). → implement file 11 + `test-router` wrapper (file 15).
8. `modules-pane.test.tsx`:
   - switch → the writer's user patch `module_visibility: { tasks: false }`
   - two quick toggles → both in the persisted row (IR-2)
   - rename save/Enter/Esc/empty
   - `maxLength` 40
   - after rename, all four aria-labels use the custom name
   - read-only state
   - Surfaces keys
   - → implement file 12.
9. Store/bridge: `preferences-store.test` / `preferences-bridge.test` updated (7 fields; no module keys) → file 13.
   grep `moduleVisibility|moduleNames` → only `preferences-view.ts`, the pane, the dock, the bar, tests.
10. Blast radius: `app-shell` · `routes` · `App` · `App.integration` · `calendar-surface` · `global-bar-1` ·
    `global-surfaces-*` green (each touched harness gets the mock + reset). Heavy shell tests run alone first (memory).
11. Mutations (copy-restored, never `git checkout --`): the 13 of PLAN acceptance 11, plus "pinCommand ignores the
    label (no create)". Each must fail ≥1 named test.
12. `tsc` 0 (core build → ui → web) · eslint 0 · full apps/web suite in chunks (F008) · core preferences suite.
13. Live smoke on real OPFS (dev server, `pnpm dev:app`, Playwright from the repo's playwright-core; memory
    visual-gate-playbook):
    - hide + rename → reload → row JSON holds, `dashboard_layout.theme` survives
    - two quick runs of a never-run command → one history row, `use_count 2`
    - pin a never-run command → reload → `is_pinned 1`, leads
14. Visual Gate (PLAN 13–19, with D-R5-2: dock cells recorded unit-proven): ⌘K open/pinned/hint + Modules pane ×
    light/dark × 375/768/1440, axe, AA, ≥44, overflow, focus ring → screenshots → Victor `visual-approved`.
15. Pre-ship `/critique` → docs §XXIX (PLAN §3 row 11 + file 16) → commit.

## Preflight (2026-10-27)
- **Correction (gate-2 nit 2):** the accepted assumption "history refetches on window focus" below was false: the app sets
  `refetchOnWindowFocus: false` (`lib/query-client.ts`). History refreshes only on the chain's invalidate or a stale remount.
- **Ground truth read:** `docs/modules/preferences/current-spec.md` (incl. :119 "`ModuleDock` is mounted nowhere" — agrees
  with D-R5-2) + `current-business-rules.md`.
- **Run 1 — BLOCKED (1 gap):** R3-BR-10 / F17 (`current-business-rules.md` R3-BR-10; slice-map.md:91) — R5's new strings
  (pin announcements, ", pinned", the footer hint) were inline in `command-bar.tsx`, not in `SETTINGS_COPY` under
  `lintCopy`. **Fixed:** file 8b; §C items 5/7/8 read from it.
- **Assumptions resolved on disk:** `Input` forwards `maxLength`/`aria-keyshortcuts` (`InputProps extends
  InputHTMLAttributes`, `packages/ui/src/components/input.tsx:114-118,194`) · `use_count 0` / `last_used_at NULL` are
  legal (no CHECK, `013_preferences.ts:124-130`).
- **Assumptions accepted:** Surfaces switches default ON (`?? true`, pre-existing; R5 only persists) · history refetches on
  window focus (React Query default; harmless).
- **Run 2 — PASSED:** frontend (surfaces · data sources · states · interactions) · backend (`pinCommand` typed + cases) ·
  database (tables · ops · no schema change) · integration (UI → writer / chain → service → OPFS) all specified; every
  documented rule met or revised by an approved decision (BR-PREF-10 ← D-R5-3/A1).

## Gate record
- **Approval 2 (Victor, 2026-10-27):** D-R5-2 + D-R5-3 approved; build starts.
- **rev 1.1 → rev 2 (2026-10-27): independent gate-2 critique REVISE**, 3 blocking, all folded:
  1. §B awaited the invalidate, and `invalidateQueries` awaits the refetch (query-core `queryClient.js:148-179`) → the
     next write waited on a read and its retry → fire-and-forget invalidate + `retry: 0` + a non-blocking test.
  2. Screen-reader users couldn't learn Alt+P (footer `aria-hidden`; `aria-keyshortcuts` mis-scoped and not read by VO)
     → the exposed footer is the combobox's `aria-describedby`; `aria-keyshortcuts` dropped; the copy is a full sentence.
  3. `warnInvalidNavKeys` had no valid-key source (it would need `features`/`sync` from settings → a cycle) and no call
     site → `MANAGED_SURFACE_KEYS` lives in `nav-prefs`; `applyNavPrefs` calls it.

  Nits folded:
  - decisions.md:71 → :80 (here and in PLAN-R5)
  - the false window-focus assumption
  - the live region is a raw `<span>` (house pattern), plus the scroller containing block
  - Alt+P above the early return
  - `activeId` reset on `isOpen`
  - pending-pins overlay + clear-then-set announcements + `cmdUnpinFailed`
  - file 8b gets a TDD step, plus "never-run leads"
  - `session-hud-surface` blast radius + an opt-in `renderInShell` wrapper
  - `HIDEABLE_MODULES` projection kept · valid Tamagui props · an empty label = no create · copy asserted via `SETTINGS_COPY`

  The critique confirmed D-R5-2 and D-R5-3 on disk, §A, the length-reset removal, the provider chain, and the
  primitives' passthrough.
- rev 1 (2026-10-27): drafted from PLAN-R5 rev 2 after Approval 1. D-R5-2 found while mapping the blast radius (the dock
  has no production mount). D-R5-3 found reading the schema (`command_label` NOT NULL).
