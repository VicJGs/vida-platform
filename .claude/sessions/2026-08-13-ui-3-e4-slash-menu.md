---
Date: 2026-08-13
Task: ui-3-vida-editor (LIF-88, #29) — @vida/editor · E4 slash menu
Profile: New Feature · Scenario: Default
Branch: ui-3-e4-slash-menu (off main) · PR #18 OPEN · commit 9697b4d
---

# Session: UI-3 / E4 (slash menu) — shipped

Goal: build E4 (the `/`-triggered slash menu) through the full §XXVI double-gate + post-impl gate + Visual Gate,
then commit + open a per-unit PR, and hand off to E5.

## Completed
- **E4 SHIPPED.** `@vida/editor` v0.3.0→**0.4.0**. Full loop: baseline (current-* verified current, no drift) →
  integration-check → /read-docs-first (Tiptap v3 suggestion) → spec `e4-slash-menu.md` → **gate-1 /critique REVISE →
  fixed** (2 blockers + 5 material) → **Approval 1** → **/preflight PASS +4 folds** (installed `@tiptap/suggestion@
  3.30.0`, verified the whole API vs its d.ts) → **gate-2 /critique SHIP** +2 material → **Approval 2** → implement →
  **post-impl /critique REVISE → 1 real blocker (B1) fixed** → **Visual Gate PASS** (both themes) → commit + PR #18.
- **Architecture (the load-bearing correction).** A slash menu is a **WAI-ARIA combobox** (focus stays in the editor,
  highlight via `aria-activedescendant`), NOT a menu. So E4 is **`@tiptap/suggestion` (new dep) + `@tiptap/react`
  `ReactRenderer`**, NOT a UI-1 `Menu`/`Popover` mount (those are trigger-anchored + move focus in — the umbrella's
  "composes UI-1 Menu/Popover" was gate-1-corrected; BR-4 honored at the token layer via the Menu sub-theme). v3's
  `props.mount` does caret-anchored positioning (its own floating-ui; E4 imports none).
- **Command set** (`slash-commands.ts`): an editor-local **`SlashMenuItem`** view-model (`@vida/types.SlashCommand`
  untouched — its `block_type` is `IntegrationBlockType`, can't describe a standard block; BR-7). `SLASH_MENU_ITEMS` =
  standard blocks that **insert now** (Text·H1–3·bullet/numbered/task list·quote·code·divider·table·callout; heading =
  `setNode` turn-into, NOT E3's toggle; **Image excluded**, no attachment UI) + the **11 integration commands DERIVED
  from `INTEGRATION_BLOCK_COMMANDS`, shown DISABLED** via the `isBlockAvailable` seam. `filterSlashItems`.
- **Files:** `slash-commands.ts` · `slash-menu.tsx` (forwardRef role=listbox popup, `<Theme name="Menu">`, imperative
  onKeyDown) · `extensions/slash-command.ts` (Suggestion extension + render lifecycle + `slashComboboxAttrs`/
  `slashActive`) · `editor.tsx` (mount + host combobox ARIA via editorProps). +40 tests (102 total) + 2 stories.
- **§XXIX currency:** `current-spec`/`current-business-rules` refreshed · `docs/editor/slash-menu-spec.md` filled
  (was 0-byte) · `packages/editor/src/CLAUDE.md` E4 section · umbrella `_index.md` §5 E4 → ✅.
- **Automated acceptance GREEN:** editor typecheck ✓ · **102 tests** ✓ · build + build-storybook ✓ · root typecheck
  11/11 · boundary clean (only `@tiptap/*` + `@vida/types` + `@vida/ui`) · no raw hex.

## Decisions
- **Command-set scope = documented, not a fork.** Standard-blocks + deferred-disabled-integration is fixed by the
  capability-framework graceful-degradation model + `SLASH_COMMAND_CATEGORY` headroom + the umbrella row — Victor
  corrected me for surfacing it as an "open decision" at Approval 1 (memory [[decide-dont-ask-when-docs-give-the-answer]]
  reinforced: even at a gate, present the grounded plan, don't offload a derivable call).
- **Heading uses `setNode` (turn-into), deliberately NOT E3's `toggleHeading`** — a slash PICK chooses a target, a
  toolbar button toggles state (BR-E4-4b, recorded so two surfaces reading the same block differently is intentional).
- **New dep `@tiptap/suggestion@^3.30.0`** (justified at gate, family-pinned; `ReactRenderer` from the existing
  `@tiptap/react`). No `y-prosemirror`/`yjs` (BR-2 unchanged).

## Gate quality — the post-impl critique earned its keep (again)
- **B1 (post-impl, RUNTIME-PROVEN):** the host `role`→combobox flip via a ProseMirror **plugin** was DEAD. PM's
  `computeDocDeco` consumes `view._props` (E1's static `editorProps.attributes` `role:'textbox'`) BEFORE plugins with
  **first-writer-wins**, so a plugin can only ADD absent keys — it can NEVER override `role`. Fix: `role` has ONE
  writer — `editor.tsx`'s `editorProps.attributes` became a **function of state** merging
  `slashComboboxAttrs(slashActive(state))`; the plugin was deleted. Proven by a real active-flip test
  (`insertContent('/')` trips detection → `slashActive` true → role=combobox; stays false in a code block). This is the
  recurring lesson: **jsdom green ≠ correct for a mechanism that only fires at runtime** — the independent post-impl
  critic (a fresh subagent) built a minimal repro on the real stack to prove it.
- gate-1 killed a FALSE FACT (`@floating-ui/dom` is NOT a resolvable `@tiptap/react` transitive dep — it's an optional
  peer of `@tiptap/react/menus`); E4 uses `props.mount` and imports no floating-ui.
- §XXVIII deviations: DEV-1 (`@tiptap/react` import path, not `@tiptap/core` — pnpm isolation), DEV-2 (the B1 fix),
  DEV-3 (no injected CSS — fully Tamagui), DEV-4 (ReactRenderer↔Tamagui context = a React portal inside
  `<EditorContent>` → inherits context; the UNKNOWN is closed, no code change).

## NEXT — E5 (block-registry seam + placeholder node-views)
- **FIRST ACTION next session: start E5** through the §XXVI gate (baseline → spec `e5-block-registry.md` → critique →
  Approval 1 → preflight → critique → Approval 2 → implement → post-impl → Visual Gate).
- **E5 = the `BlockRegistry` typed map + a placeholder node-view for every `INTEGRATION_BLOCK_TYPE` (11)** (BR-3,
  graceful degradation — a declared "block unavailable until its module ships" state, never a crash). Reconcile the
  `extensions/*.ts` stub filenames (`daily-summary.ts`, `backlink-panel.ts`, …, all still 0-byte) against the enum keys.
- **The E4→E5 seam is already built and waiting:** E4's slash menu LISTS the 11 integration blocks, disabled, gated by
  **`isBlockAvailable(type)` in `slash-commands.ts`** (currently `AVAILABLE_INTEGRATION_BLOCKS = new Set()` — empty).
  E5 flips them on by populating that set (or replacing it with a runtime registry query) AND registering the
  placeholder node-views. **Decide at E5** whether E4's integration `run` closures get wired to insert the placeholder
  node, or stay deferred — the seam supports either.
- Branch: cut `ui-3-e5-*` off main **after PR #18 merges** (per-unit PR model). Ground truth `docs/editor/current-*` +
  the `docs/editor/{block-registry,extension-catalog}.md` durable docs.
- Sequence remaining after E5: **E6** markdown (to+from round-trip, property test) → **E7** PDF (@react-pdf/renderer) →
  **E8** DOCX (docx) → then **UI-4** (#30, app shell). UX-6 (#26) stays gated behind the `-c` wave (needs UI-4).

## Housekeeping note
Pre-existing uncommitted leftovers from prior sessions were NOT staged in E4's commits (they're untouched, not E4's):
`docs/specs/_index.md`, `.claude/tasks/ux-6-home-journal-dashboard.md`, `.claude/sessions/2026-08-09-*.md`,
`docs/specs/features/ux-6-home-journal-dashboard/`, `docs/specs/fixes/ui-3-ui-4-ordering-reconcile/`. Sort these into
their own commit/branch when their task is picked up (UX-6 / the UI-3↔UI-4 reconcile).
