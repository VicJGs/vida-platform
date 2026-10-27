<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R5 · Modules + ⌘K
     Scope: delivery/slice-map.md R5 (APPROVED 2026-10-21) · ledger rows D11 · D12 · D13b · F9 · ECs fe-settings EC-4
     (Modules), EC-8, EC-12. Inherits R2's writer (PLAN-R2 R2-BR-1…11), R3's read seam + Settings save path
     (PLAN-R3 R3-BR-1/6/7) and R1's lock rules (R1-BR-6/7/8). No-Guessing: [FACT: path:line] · [INTERP — grounded] · [UNKNOWN].
     Worktree @ 5769ab1 (origin/main 879d8a6 merged: mod-routines #162/#163, no apps/web change). -->

# PLAN-R5 — Modules + ⌘K

> **Status:** **SHIPPED 2026-10-27** (Visual Gate PASS, Victor `visual-approved`; build record in §7). rev 2 — **Approval 1 given (Victor), D-R5-1 = A + A1** (Alt+P by `e.code`; `pinCommand`
> creates the row when absent) **and D not taken** (the Settings pinned-commands row → an fe-settings follow-up edge at
> R8). rev 1 went to an independent critique: REVISE, 4 blocking + 11 nits, all folded in (§7).
> **Plane:** frontend + shared (+ one backend line if D-R5-1 picks A1). Both gates run: the **Verification Gate**
> (Vitest + a live smoke on real OPFS) and the **Visual Gate** (real browser · light/dark × 375/768/1440 · §XIV a11y ·
> stage-4 Victor `visual-approved`).
> **Context baseline (§XXVI.1a):** `docs/modules/preferences/current-*` (refreshed by R4) ·
> `docs/core/architecture/command-bar-and-search.md` §4 · `apps/web/src/{preferences,settings,shell,command-bar}/CLAUDE.md`.
> They describe the code as read for this plan.

## 1. Problem (as-built, after R4)
- **The Modules pane doesn't persist (D11).**
  - Both cards read and write the transitional mirror `preferences-store`: the row switch + rename
    `[FACT: settings/modules-pane.tsx:44-47,60,104]` and the Surfaces switches `[FACT: modules-pane.tsx:113-114,152-153]`.
  - The seam to persist them already exists. `toUserPatch` maps `moduleVisibility` → `module_visibility` and
    `moduleNames` → `dashboard_layout.moduleNames` `[FACT: preferences/preferences-view.ts:110-112]`. Both merge as maps
    `[FACT: preferences-view.ts:133-145]`. BR-PREF-6 key validation runs on every path that writes `module_visibility`
    `[FACT: preferences/preferences-writer.ts:55-58,164-172]`. The queue merges each batch against a fresh read, so
    sibling keys survive `[FACT: preferences-writer.ts:133-142]`.
  - The pane never calls any of it.
- **No reader honors visibility or names (D12).**
  - The dock groups `MODULE_MAP` by placement + feature flag only `[FACT: shell/module-dock.tsx:34-55]` and renders
    `entry.label` `[FACT: module-dock.tsx:125]`. In the rail, that label becomes the link's `aria-label`
    `[FACT: shell/nav-link.tsx:46-50]`.
  - ⌘K's nav commands come from `deriveNavCommands()` with no arguments `[FACT: command-bar/registry.ts:30]`, which reads
    `MODULE_MAP` labels `[FACT: command-bar/nav-commands.ts:14-27]`.
  - The host builds the list **once** (`useMemo(…, [])`) `[FACT: shell/command-bar.tsx:68-75]`.
  - This unit owns these readers: decisions.md:80 ("Readers of hide/rename/reduce-motion → preferences-rescope; shell
    mounts the dock + placement").
- **⌘K has no history (F9).**
  - The host ranks with empty history (`collect([], Date.now())`, `command-bar.tsx:73`).
  - `recordCommand` · `pinCommand` · `getCommandHistory` have no app caller. The palette is their consumer by design
    `[FACT: delivery/slice-map.md:45 "renders getCommandHistory + calls recordCommand/pinCommand"]`; the persistence is
    MOD-prefs' `[FACT: command-bar-and-search.md:40-44]`.
  - `rankByFrecency` (pinned → frecency → input order) is built and pure `[FACT: command-bar/frecency.ts:6-22]`.
- **Both history writes read, then write.**
  - `recordCommand` reads by key, then creates `[FACT: packages/core/src/services/preferences/service.ts:318-330]` over a
    UNIQUE `command_key` `[FACT: reconciliation.md:119 → 013_preferences.ts:126]`. Two overlapping first runs of one
    command both miss the read, and the second create throws.
  - `pinCommand` reads by key, then updates, and is a **silent no-op on a key that was never recorded**
    `[FACT: service.ts:333-337; D-S3 at docs/specs/features/mod-preferences/sessions/PLAN-slice3-command-bar-history.md:37-39,66]`.
  - R1's lock covers neither, because neither runs in a transaction and the lock does not replace per-table queues
    (R1-BR-7).
- **Shape gap.** The service row's `is_pinned` is a boolean (`boolInt`, `schema/preferences.ts:112`). The palette's
  `CommandHistoryEntry.is_pinned` is `0 | 1` `[FACT: command-bar/types.ts:40-47]`, the v1 contract `frecency.ts:11` keys on.
- **The active option is an index.** It resets only when the mode or the list length changes
  `[FACT: command-bar.tsx:83-89]`. Once the list re-ranks under the user, the index points at a different command.

## 2. Business rules (after R5)
- **R5-BR-1 · The Modules pane persists, on R3's path.**
  - **Read and write.** Both cards read `usePreferences().view.{moduleVisibility, moduleNames}` and write
    `useSettings().update({ moduleVisibility: { [key]: v } })` / `update({ moduleNames: { [key]: name } })`: an
    optimistic cache write, then the user queue, then one batched write. The maps merge, so two quick toggles keep both
    (IR-2).
  - **Rename.** The value is trimmed and capped at 40 characters (`maxLength`, so a dock label can't grow without
    bound). Empty or whitespace → no write, and Esc cancels. Duplicates are allowed (no doc forbids them; the key, not
    the label, is the identity).
  - **Accessible names.** Every per-row control's accessible name uses the **display** name (rename · save · cancel ·
    switch), so a renamed row speaks one name, not the canonical one on three controls and the custom one on the switch
    (today `modules-pane.tsx:80,87,88,98` vs `:102`).
  - **Read-only.** Keeps today's behavior: rename hidden, switches disabled (`modules-pane.tsx:97-101`).
  - **Mirror.** `moduleVisibility`/`moduleNames`/`setModuleVisible`/`setModuleName` leave `preferences-store`, and the
    bridge mirrors 7 fields `[FACT: preferences-bridge.tsx:22-32]`. This repeats R3's arrangement move and R4's
    reduce-motion move.
- **R5-BR-2 · One pure nav filter, two readers. The hideable rule moves into `nav/`.**
  - **The predicate.** `nav/nav-prefs.ts` owns `ALWAYS_REACHABLE_KEYS` and `isHideableModule(entry)` (dock placement,
    not always-reachable). `settings-model.ts` (`HIDEABLE_MODULES`, `:38,45-47`) and the writer's `VISIBILITY_KEYS`
    (`preferences-writer.ts:55-58`) derive from it. That way `nav/` never imports `settings/`, and there is one
    definition.
  - **The filter.** `applyNavPrefs(entries, { visibility, names })` removes hidden entries and applies renamed labels,
    **only for hideable keys**. Every other entry passes through unchanged whatever the map says, including Settings
    (`preferences`), Home (`journals`) and every global surface. That is EC-8's read side (IR-3; business-rules.md:27):
    a synced `false` or a name on Settings/Home is ignored.
  - **Invalid keys.** An unknown or non-hideable key in the map is ignored and **flagged**: one DEV-only `console.warn`
    per key per session `[FACT: business-rules.md:36 "invalid module key ignored + flagged"]`.
  - **Readers.** `visibleDockGroups` and `deriveNavCommands` both call it.
  - **Flags.** Flag filtering (`visibleWhen`) is unchanged and independent (PR-7 business-rules.md:15, D13b, IR-6:
    hidden ≠ feature-off).
- **R5-BR-3 · Hidden is a nav fact, not a lock.**
  - A hidden module leaves the dock and ⌘K, but its route still opens (deep link, back button, a backlink)
    `[FACT: business-rules.md:15 PR-7]`.
  - Hiding the module you are on leaves the dock with no active entry. That is correct, because it is no longer in the
    nav.
  - A group left with no entries drops its heading (the existing filter-then-group order, `module-dock.tsx:34-38`).
- **R5-BR-4 · Renames are labels, not identities.**
  - The custom name shows in the dock text, the rail's icon-only `aria-label` (`nav-link.tsx:46-50`) and the ⌘K label.
  - The command id stays `nav:<routePath>`, so history survives a rename.
  - Labels are never read from `command_label`: the palette displays the live command's label, and history joins on the
    key only (`frecency.ts:11`).
  - Rename stays scoped to the nav readers; module page titles are not in D12.
- **R5-BR-5 · ⌘K reads ranked history, reactively.**
  - **The query.** A third preferences query, `commandHistoryQuery()`, lives in `preferences-queries.ts` (the
    one-definition rule, `preferences/CLAUDE.md` Rules). Key `['preferences','commands']` (exact; doesn't overlap
    `user`/`nav`). `staleTime`/`gcTime` are set **on the definition**: they don't depend on the writer's
    `setQueryDefaults` (`preferences-writer.ts:99`) having been imported first. `retryOnMount: false`. Rows map to
    `CommandHistoryEntry` (`is_pinned` → `0|1`).
  - **Reactivity.** The host's memo depends on the view's `moduleVisibility` + `moduleNames` and the history data, so a
    hide, a rename or a new history row re-ranks without a reload.
  - **Loading.** The unranked list renders at once; when history arrives, it re-ranks. R5-BR-8 keeps the highlight on
    the same command through that change. This is business-rules.md:34's "querying history" state: the palette is
    usable while it loads, with no spinner.
  - **Failure.** A history read failure degrades to unranked (business-rules.md:34: "query error, keep typing"). ⌘K
    never blocks, and nothing renders an error.
- **R5-BR-6 · History writes are best-effort and serialized, on one chain.**
  - **Where it lives.** `preferences/command-history.ts` holds the recorder (next to `writer-instance.ts`). It exposes
    `record(cmd)` and `pin(key, pinned)`, both chained on **one** promise (the per-table-queue rule for
    `command_bar_history`, R1-BR-7). A pin pressed before the same command's first record has settled therefore runs
    after it.
  - **Error handling.** Each operation has its own try/catch. A `record` failure is logged, never thrown, never toasted,
    and `run()` has already happened (memory: a best-effort side effect after a durable action gets its own try/catch).
    A `pin` failure is announced (R5-BR-7).
  - **After each operation** settles, the history key is invalidated. `CommandBar` is always mounted, so this refetches,
    and it also recovers an errored history query.
  - **Order in `execute`.** Run → close → `record`. Both nav and action commands record.
  - **One chain is enough.** Only one tab owns the DB: the OPFS access-handle pool is exclusive (R1-BR-8).
  - **Docs.** `preferences/CLAUDE.md`'s "never the raw service" rule is amended to "…or `command-history.ts` for
    `command_bar_history`".
- **R5-BR-7 · Pinning (per D-R5-1).**
  - The pin toggles `!is_pinned` of the active option, through the chain.
  - An **always-mounted** polite live region (rendered with the dialog's content, empty at rest) announces the pin
    result **after** it settles: "Pinned …" / "Unpinned …" / "Couldn't pin …".
  - Pinned rows carry a Lucide `Pin` glyph (`aria-hidden`), and "pinned" is added to the option's accessible name.
- **R5-BR-8 · The active option is tracked by command id, not by index.**
  - `activeId` falls back to the first option when the id is absent (mode switch, the command hidden).
  - `aria-activedescendant` and Enter / Alt+P act on the same command after any re-rank: a pin, a settling record,
    history arriving.
- **R5-BR-9 · Atlas + Sync-log persist; their readers are not this slice.**
  - The Surfaces switches write `module_visibility.features`/`.sync`.
  - No route or surface reads them yet: `GLOBAL_SURFACES` has no `features`/`sync` entry
    `[FACT: nav/module-map.ts:114-121]`.
  - The readers belong to fe-feature-atlas (LIF-215) and fe-sync-log, written as edges at R8.

### 2a. D-R5-1 — the pin affordance (Victor, Approval 1)
**What the docs fix:**
- The palette calls `pinCommand` (slice-map.md:45), and pins lead (PR-6).
- The Envision record also shows a **Settings-side** "⌘K pinned commands · 3 pinned" row under ② Compose
  `[FACT: docs/specs/foundation/frontend-replan/p5-discover-own-specimen.html:189]`. That row is **not** among
  fe-settings EC-4's controls `[FACT: docs/specs/foundation/fe-settings/delivery/envision.md:35]`, so no slice-map row
  homes it.
- No doc defines a gesture inside the palette.

**The constraint:** the palette is a combobox whose options are non-focusable `role="option"` divs with one tab stop
(S3-BR-b, `command-bar.tsx:5-8`). A button nested in an option fails axe `nested-interactive`, and a listbox may own only
options.

**Options:**
- **(A) Recommended — a keyboard pin on the active option, plus the mark and an always-mounted live region (R5-BR-7).**
  - **Key:** `Alt+P`, matched by **`e.code === 'KeyP' && e.altKey && !e.ctrlKey && !e.metaKey`**. On mac, Option+P
    yields `e.key === 'π'` (and differs again on ABNT2), so matching on `e.key` would never fire. It calls
    `preventDefault`, so no character lands in the input.
  - **Hint:** a muted footer reads "Alt+P pin · ↵ open" (on mac: "⌥P pin").
  - **Pointer:** hover a row (which makes it active, `command-bar.tsx:148`), then press the key.
  - **Touch:** no pin until the mobile ⌘K affordance (reserved, command-bar-and-search.md:36-37).
  - **Sub-choice — a never-run command:**
    - **(A1) Recommended:** `pinCommand` creates the row when absent (`use_count: 0`, `last_used_at: null`, which
      `frecency.ts` already scores as 0). One backend line + a core test. It revises the self-made default D-S3 ("docs
      silent → simplest-correct"), which now has a consumer reason.
    - **(A2):** offer the pin only on rows already in history, and announce "Run it once to pin" otherwise. No core
      change, but a first-time user can't pin.
- **(B) Grid pattern.** Make the list `role="grid"` so each row has an option cell and a real pin button. Every device
  can pin, but it rewrites UI-4's host interaction model (a shell-rescope-owned file), which is more than this slice
  should take.
- **(C) Read pins only, no setter in R5.** Rejected. slice-map.md:45 homes the setter in the palette, and R5's
  done-when includes "a pinned one leads". Deferring it would manufacture a deferral (memory).
- **(D) Also build the specimen's Settings "⌘K pinned commands" row.** A list of pins with unpin; it covers touch and
  screen-reader users without a shortcut. It is a new Settings control outside EC-4 and outside the approved slice-map,
  so it would be a **scope addition** to R5. Otherwise it needs a home (fe-settings follow-up), filed as an edge at R8.
  It can sit alongside A.

## 3. Design (file order)
| # | File | Change |
|---|---|---|
| 1 | `nav/nav-prefs.ts` (+test) | `ALWAYS_REACHABLE_KEYS` · `isHideableModule` · `applyNavPrefs` (R5-BR-2/4, DEV flag of invalid keys) · `NavPrefs` type; `settings-model.ts` + the writer's `VISIBILITY_KEYS` re-derive from it |
| 2 | `command-bar/nav-commands.ts` (+test) | `deriveNavCommands(map, surfaces, prefs?)` runs the map entries through `applyNavPrefs` before deriving; no-prefs = today's output (existing tests unchanged) |
| 3 | `preferences/command-history.ts` (+test) | `toHistoryEntry(row)` (boolean → `0|1`) · `createCommandHistory({ getService, queryClient })` → `{ record, pin }` on one chain, own try/catch, invalidate on settle (R5-BR-6) · the app instance |
| 4 | `preferences/preferences-keys.ts` · `preferences-queries.ts` (+test) | `COMMANDS_KEY` + `commandHistoryQuery()` (own stale/gc, `retryOnMount: false`, mapped rows) |
| 5 | `command-bar/registry.ts` | prefs reach `navProvider` (a factory, or prefs passed at collect time); decided at IMPL-PLAN against the registry tests |
| 6 | `shell/command-bar.tsx` (+test) | memo deps = view maps + history; `collect(history, now)`; `activeId` (R5-BR-8); `execute` → run → close → `record`; D-R5-1 wiring (mark, `e.code` key, live region, footer) |
| 7 | `shell/module-dock.tsx` (+test) | `visibleDockGroups(prefs)` via `applyNavPrefs`; the dock reads `usePreferences().view` |
| 8 | `settings/modules-pane.tsx` (+test) | rebind both cards (R5-BR-1): view + `useSettings().update`, `maxLength` 40, display-name a11y labels; header comment X5 refresh |
| 9 | `stores/preferences-store.ts` · `preferences/preferences-bridge.tsx` (+tests) | drop the two fields + setters; MIRRORED = 7 |
| 10 | *(A1 only)* `packages/core/src/services/preferences/service.ts` (+test) | `pinCommand` creates the row when absent |
| 11 | Docs (§XXIX) | `docs/modules/preferences/current-*` (R5 rules; D-S3 revised if A1) · `apps/web/src/{preferences,settings,shell,command-bar,nav}/CLAUDE.md` (incl. the amended raw-service rule) · `command-bar-and-search.md` §4 (history live; the pin key) · `web-client-runtime/current-business-rules.md` (the history chain) · slice-map R5 status · task file |

Edges filed at R8 (not built here):
- `shell-rescope`: R5 edits `command-bar.tsx` + `module-dock.tsx`, its mount.
- fe-feature-atlas LIF-215 + fe-sync-log: the `features`/`sync` readers.
- R7: the onboarding picker's flag-only lockstep + `moduleNames` labels (D12's onboarding clause, slice-map R7).
- If D is not taken: a home for the Settings pinned-commands row.

## 4. Acceptance
**Verification Gate (Vitest + live smoke)**
1. **Filter:**
   - `applyNavPrefs` omits a hidden dock key and relabels a renamed one.
   - It ignores `false` and names on `preferences`/`journals`/every global surface.
   - An unknown key is inert and DEV-warned once.
   - Flags still filter independently (a visible-but-flag-off `gamification` stays out; a hidden-but-flag-on one is out).
   - `HIDEABLE_MODULES` and `VISIBILITY_KEYS` are unchanged after the move (snapshot of keys).
2. **Readers:**
   - `visibleDockGroups` omits hidden entries, drops an emptied group heading, and uses renamed labels (text + rail
     `aria-label`).
   - `deriveNavCommands(…, prefs)` does the same for ⌘K. With no prefs, the output is today's.
3. **Reactive ⌘K:** with the palette open, a cache change (hide/rename) re-renders the list without remount.
4. **History chain:**
   - Two back-to-back `record()` calls for one new key produce one row with `use_count: 2`. The test uses a fake service
     with a real read-then-create, which throws on a duplicate create without the chain.
   - A `pin()` issued right after the first `record()` of a new key lands pinned.
   - A rejected record logs, doesn't reject, and leaves the next operation running.
   - `run()` is called before `record()`.
   - The history key is invalidated after each settle.
5. **Ranking:**
   - History (mapped `0|1`) reaches `collect`.
   - A pinned command leads, and a more frequent one ranks above a less frequent one.
   - While history loads, the list is unranked and usable. On a history read error: the unranked list, no error UI.
6. **Active option (R5-BR-8):** with row 3 active, a re-rank (pin, history arrival) keeps the same command id active, in
   `aria-activedescendant` and for Enter.
7. **Pin (per D-R5-1):**
   - A synthetic `keydown` with `code: 'KeyP', altKey: true, key: 'π'` toggles the active option's pin. The same event
     with `metaKey` does nothing.
   - The live region exists before the first pin and announces the settled result (incl. the failure copy).
   - The mark + accessible name reflect state.
   - **Never-run key:** under A1 it lands pinned and leads (+ a core test: `pinCommand` on an absent key creates
     `use_count 0`, `is_pinned 1`); under A2 it announces "Run it once to pin" and writes nothing.
8. **Pane:**
   - A switch → `update({ moduleVisibility: { tasks: false } })`.
   - Two quick toggles (tasks off, habits off) → both persist (IR-2).
   - Save rename → `update({ moduleNames: { tasks: 'Todo' } })`. Empty/whitespace → no write. Esc cancels.
     `maxLength` 40.
   - After a rename, every row control's accessible name uses the custom name.
   - Read-only → no rename, disabled switches.
   - Surfaces → `features`/`sync` keys.
9. **Mirror:** the store has no module fields; the bridge mirrors 7; grep finds no other reader.
10. **Live smoke (real OPFS):**
    - Hide + rename → reload → the row's `module_visibility` + `dashboard_layout.moduleNames` hold, and a sibling
      `dashboard_layout` key (theme) survives.
    - Two quick runs of a never-run command → one `command_bar_history` row, `use_count` 2.
    - Pin → reload → `is_pinned` 1.
11. **Mutations killed** (copy-restored):
    - filter ignores the hideable guard
    - filter drops names
    - `deriveNavCommands` ignores prefs
    - dock ignores prefs
    - memo deps reverted to `[]`
    - recorder without the chain
    - pin bypasses the chain
    - record before run
    - record's catch removed
    - history mapper keeps the boolean
    - active option by index again
    - key matched on `e.key`
    - pane writes the mirror again
12. `tsc` 0 · eslint 0 · the suite green (F008 timeouts re-run alone and recorded).

**Visual Gate (real browser, dev server, real OPFS)**
13. Hide Tasks → it's gone from the dock (sidebar, rail, drawer) and from ⌘K; `/tasks` still opens by URL. Reload →
    still hidden, and no flash of Tasks on the first frame.
14. Rename Habits → "Rituals" in the dock text, the rail's accessible name and ⌘K. Reload → persists. A 40-character
    name at 375 drawer / 768 rail / 1440 sidebar truncates without overflow.
15. EC-8: no Settings/Home switch exists, and with a forged `false` for `preferences`/`journals` in the row, Settings and
    Home stay in ⌘K and the bar.
16. ⌘K: run "Go to Projects" ×3 → it ranks first on reopen. Pin "Go to Finance" (never run; per A1/A2) → it leads with
    the mark, the highlight stays on it, and the announcement is heard (VoiceOver spot-check). Reload → the order holds.
17. EC-12 rename feel: pencil → inline Input with visible save/cancel, Enter/Esc, non-modal. EC-4: all Modules + Surfaces
    controls present and persisting.
18. Matrix: Modules pane + ⌘K open (with the footer hint) × light/dark × 375/768/1440 · axe 0 · text AA · ≥44 targets ·
    0 page/region overflow · focus ring visible.
19. Victor `visual-approved` (stage 4).

## 5. Out of scope (owned elsewhere, unchanged)
- The onboarding picker's seeding and labels (R7).
- Locale/Notifications + deleting the store (R6).
- The Atlas/Sync-log readers (their units).
- The `feature_gamification` control (fe-feature-atlas, F11).
- Renaming module page titles.
- Search mode (DB-8).
- A touch pin affordance (mobile ⌘K).
- The Settings pinned-commands row, unless D is taken.
- Resetting a custom name to the canonical one (no doc asks; renaming it back works).

## 6. Risks
- **The dock now subscribes to preferences.** `ModuleDock` re-renders on any user-row change. The map is small, and the
  boot seed fills the cache before the first frame (R3), so a hidden module never flashes in (Visual Gate 13 checks it on
  reload).
- **Shell test blast radius.** These mount the dock or ⌘K and now need the preferences test wrapper +
  `compositionRootMock()` (R3's pane lesson): `module-dock` · `command-bar` · `app-shell` · `routes.test.tsx` (renders
  AppShell with `<CommandBar/>`, `routes.tsx:30-31`) · `App`/`App.integration`. Grep for `ModuleDock`, `CommandBar`,
  `AppShell`, `deriveNavCommands`, `HIDEABLE_MODULES`, `VISIBILITY_KEYS` and `preferences-store` before editing.
- **Heavy Tamagui shell tests flake under load** (memory). Run them alone before calling a regression.
- **F008.** Run targeted suites first and the full suite when the load allows; record timeouts that pass alone.

## 7. Gate record
- **Approval 1 (Victor, 2026-10-27):** D-R5-1 = **A + A1**; option D not taken (edge at R8).
- **Approval 2 (Victor, 2026-10-27):** IMPL-PLAN rev 2 incl. D-R5-2 (dock unit-proven) + D-R5-3 (`pinCommand` label params).
- **Build + gates (2026-10-27):**
  - **TDD:** steps 1–10, each red → green, except `command-history`: its module was written in the same pass as its
    first run, so it went straight to green; the mutations cover it.
  - **Mutations:** **14/14 killed** (copy-restored; all 30 files verified byte-identical afterwards). #8 (record before
    run) first SURVIVED: the chain makes the service call async either way. It is now killed by an order probe —
    `record` must see `navigate` called and the bar closed.
  - **Suites:**
    - apps/web **126 files · 966/966**, one pass. R4 recorded 999 over two chunked runs; R5 deleted no test files.
    - core preferences 27/27.
    - tsc 0 (core · ui · web).
    - eslint 0 errors (4 pre-existing warnings in `db/client.test.ts`).
  - **Harness fixes (test-only):**
    - Drain the history chain in `afterEach`: an in-flight record leaked into the next test's fake.
    - Find the search status by text: the always-mounted announcer is a second `role=status`.
  - **Live smoke (real OPFS, Brave):**
    - two quick first runs → 1 row, `use_count 2`
    - pin never-run → `use_count 0`, pinned
    - `user_preferences` 1 row
    - the `dashboard_layout.theme` sibling survives
    - reload → order, hides and renames hold
    - a forged `false` on Settings/Home is ignored + DEV-flagged
    - a hidden route still opens
  - **Visual Gate** (Modules pane + ⌘K × light/dark × 375/768/1440, 12 cells): axe 0 · text AA 4.86–5.76 · 0
    page/region overflow · keyboard `:focus-visible` · ⌘K options ≥44 · the keyboard pin keeps the highlight ·
    read-only ✓. Victor **`visual-approved`** 2026-10-27.
  - **In-gate fixes:**
    1. Modules-pane targets measured 36×20 / 40×32 → Switch `lg` (its documented touch size, `s1-switch.md`) + icon
       Buttons `lg` 48 (decisions.md:138).
    2. The pin hint moved from a footer to UNDER the input: the Dialog body scrolls, so a footer after ~22 rows is
       never seen. It is still the combobox's `aria-describedby`.
    3. Clear-then-set uses a 50 ms timeout (`ANNOUNCE_GAP_MS`), not rAF: jsdom rAF timing is unreliable, and
       screen readers need a gap anyway.
  - **Siblings recorded** (`docs/specs/fixes/ds-type-lineheight-unpaired/` items 5–6): Switch `lg` = 44×24 (a
    primitive contract gap) · the Settings rail (40) and search (38) · the other panes' `md` switches.
  - **Unattributed:** one console 404 in a reopened profile, not reproducible on a fresh one. Likely a worker request,
    which page listeners can't see; R5 adds no fetched resource.
  - **Pointer note:** after a pin re-ranks, the highlight follows the row under a stationary pointer (Chromium re-fires
    hover). That is expected; id tracking is the keyboard guarantee.
  - **Pre-ship /critique (independent): REVISE → folded → SHIP-ready.** The code was judged ship-quality; 5 blocking items
    were doc/comment currency:
    - `current-spec` status, mirror count 9 → 7, the third key, and an R5 surface section
    - the "footer" wording in `command-bar.tsx` and `settings-copy.ts`
    - the `registry.ts` header

    Nits folded:
    - A pending pin now settles only after its own latest write (per-id sequence). Three quick presses end pinned.
    - A pin that settles after close is no longer announced on the next open (test red → green).
    - The read-failure test now waits on the query's error state.
    - The stale R4 line in `settings/CLAUDE.md` is fixed.
    - The IMPL-PLAN "footer" now carries an as-built pointer.

    Recorded for R8:
    - No way to reset a custom name (fe-settings follow-up edge).
    - `pinCommand`/`recordCommand` `findWhere` skips the soft-delete filter. Pre-existing pattern; nothing soft-deletes
      history today.

    After the fold: the touched suites pass 27 files / 260 tests, and App/integration/routes pass 18/18; tsc 0; eslint 0.
- **rev 1 → rev 2 (2026-10-27):** independent critique REVISE, 4 blocking, all folded in:
  1. `pinCommand` is a no-op on a never-recorded key, so the announcement would lie → A1/A2 sub-choice + acceptance 7.
  2. Pin wasn't on the serial chain (it reads, then updates) → one chain for `record` + `pin` (R5-BR-6), mutation.
  3. A re-rank under an index-tracked active option retargets Enter/Alt+P → `activeId` (R5-BR-8), acceptance 6.
  4. Alt+P by `e.key` never fires on mac (`π`); the live region has to be always mounted; the framing omitted the
     specimen's Settings pinned-commands row → `e.code` match, R5-BR-7, option D.

  Nits folded:
  - citations (`types.ts:40-47` · `nav-link.tsx:46-50` · `frecency.ts:11` · `preferences-view.ts:133-145`)
  - `routes.test.tsx` blast radius
  - the hideable predicate moved into `nav/` (no nav→settings import)
  - the raw-service rule amended + the recorder in `preferences/`
  - IR-2 test + the `deriveNavCommands` mutation
  - invalid key "flagged" (business-rules.md:36)
  - the history loading state (business-rules.md:34)
  - rename `maxLength` 40 + display-name a11y labels
  - stale/gc on the query definition
  - hiding the current module's route

  The critique verified the writer's sibling-key merge, the 7-field mirror and its readers, the single-tab ownership,
  the first-frame claim and the recorder's refetch path as sound.
