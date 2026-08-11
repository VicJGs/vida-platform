# Task: ui-3-vida-editor
# Profile: New Feature
# Scenario: Default
# Spec: docs/specs/features/ui-3-vida-editor/_index.md  (to author — Step 3)
# Created: 2026-08-11
# Updated: 2026-08-11
# Status: in-progress
# Linear: LIF-88
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ④ UI · m1.0-delivery-plan.md:201

## Goal
Build `@vida/editor` — the TipTap block editor that is the heart of the Notes & Journals integration
layer: editor shell + toolbar + slash menu + standard blocks + serializers (Markdown / PDF / DOCX),
plus a typed extension/block-registry seam through which the 12 platform integration blocks
(`/summary`, `/tasks`, `/habits`, `/events`, `/chart`, `/pomodoro`, …) are registered later by their
module phases. Fills the 0-byte `docs/editor/*` stubs. Needs the app runtime (AR-4).

## Context
Profile: **New Feature** (per `m1.0-delivery-plan.md:201` + `:107` "editor/shell → new-feature" —
  authoritative per-issue binding, NOT the `#`-table coarse "Design-Sys" label; see
  [[load-delivery-plan-profile-not-coarse-order-table-label]]). Scenario: Default.
Files involved: `packages/editor/src` (home — currently an empty named skeleton: shell/toolbar/slash-menu
  + 11 extension files + 4 serializer files, all 0 bytes; package.json v0.0.0, NO tiptap/yjs deps yet).
Intent sources: ADR-001 (TipTap + y-prosemirror + custom serializers), `docs/editor/README.md`,
  CLAUDE.md §8 (Notes & Journals — block set + platform integration blocks + export md/PDF/DOCX).
DoC targets: `docs/editor/{editor-architecture,slash-menu-spec,extension-catalog,block-registry,
  serialization-spec}.md` (all 0-byte stubs → fill in M1).
Integration points: ← UI-1 (primitives ✅) + AR-4 (client runtime / React Query / routes ✅). Editor
  integration blocks issue React Query reads + mount in routes (AR-4). Primary consumer = the
  Notes & Pages feature (`pages` table). → Blocks CAP-authoring.
Next in the `-c` UI wave (UI-1 ✅ → UI-2 ✅ → **UI-3** → UI-4).

## Dependencies
- blocked by `ui-1-vida-ui-primitives` (DONE ✅ — LIF-86)
- blocked by `ar-4-state-routing-forms` (DONE ✅ — LIF-75)

## Open Questions
- [x] **Scope decomposition boundary** — RESOLVED at PLAN: UI-3 builds editor mechanism + standard blocks +
      serializers + typed deferred block-registry seam. The **11** (not 12 — enum) integration-block bodies
      defer to MOD-*; app-mount → M1.1+. (umbrella §1)
- [x] **Yjs/CRDT grain** — RESOLVED: Yjs is a **deferred SEAM, no dep** (M4/AR-9b). `pages.content` = TipTap-JSON
      snapshot renders locally without the Yjs doc (ADR-003:457); `YjsSyncSeam` throws til M4. M4 inverts
      authority (JSON→Yjs-derived) — E1 shell must keep the content source swappable (BR-2).
- [x] **Serializer depth** — RESOLVED: full MD round-trip (E6, property test) + PDF (@react-pdf/renderer, E7) +
      DOCX (docx, E8); integration blocks handled via `integration_block_handling='placeholder'`.
- [x] **Visual Gate applicability** — RESOLVED: rendered component → **visual-gated** (UI-1/UI-2 class), per unit.

## Session 1 (2026-08-11) — PLAN only, no code
Head confirmed UI-3, profile corrected → new-feature, baseline + integration-check done, umbrella spec (Approval 1)
+ E1 sub-spec fully double-gated (**Approval 1 + Approval 2**). E1 is APPROVED-TO-BUILD, not implemented.
Specs: `docs/specs/features/ui-3-vida-editor/{_index.md, e1-editor-core.md}`.

## Session 2 (2026-08-11) — E1 IMPLEMENTED (no re-gate; approved at Approval 2)
Implemented E1 §7 (B1–B7). `@vida/editor` v0.1.0 shipped: `<VidaEditor>` (Tiptap v3.30.0 + StarterKit + Placeholder
in a `@tamagui/core` base-token frame, uncontrolled + `forwardRef` handle, `assertEditorDocument` runtime gate,
a11y role=textbox via `editorProps.attributes`) · `internal/editor-styles.ts` (focus ring + placeholder inj-CSS) ·
`commands.ts` (`INTEGRATION_BLOCK_COMMANDS`, 11×7 fields) · tests (17/17) · stories (default/empty/disabled) ·
`src/CLAUDE.md`. **Automated acceptance GREEN:** editor typecheck ✓ · build ✓ · test **17/17** · build-storybook ✓ ·
root typecheck **11/11** · boundary clean (no `@vida/core`/app import) · `@vida/ui` **317/317** (no regression).
**§8 UNKNOWN resolved:** base semantic tokens suffice → **NO `light_/dark_Editor` sub-theme**, `tamagui.config.ts`
untouched (BR-E1-5, UI-2 conditional-sub-theme rule).

### Deviations (§XXVIII — mechanical, no re-gate)
- **DEV-1 · tsconfig no project references.** Spec §7.1 said "add project refs to types/ui" but the concrete precedent
  `@vida/ui/tsconfig.json` has NONE (turbo `^build` orders cross-package builds). Followed the working precedent.
- **DEV-2 · `Content` type import** from `@tiptap/react` (which `export *`s `@tiptap/core`), not `@tiptap/core`
  (not a direct dep).
- **DEV-3 · `env.d.ts`** added (mirrors `@vida/ui/src/env.d.ts`) for the ambient `process.env.NODE_ENV` dev-guard type.
- **DEV-4 · `test-setup.ts`** (+ `@testing-library/user-event` devDep) — jsdom test-harness shims for browser globals
  the `@vida/ui` barrel transitively needs (sigma `WebGL(2)RenderingContext`) + ProseMirror layout/hit-test
  (`getClientRects`/`elementFromPoint`). Test-env only; `apps/web` (real browser) unaffected.

### Auto-triage (§XXIV) — 1 ISOLATED defect fixed inline
- **@vida/ui barrel runtime `.d.ts` import** → crashed any bundler consuming `@vida/ui` (E1 = first runtime consumer).
  Fixed `packages/ui/src/index.ts`: value `import './tamagui.d.ts'` → `/// <reference>`. Diagnosis:
  `docs/specs/fixes/ui-tamagui-dts-runtime-import/`. `@vida/ui` 317/317 confirms no regression.

### Post-impl gates — DONE
- **Visual Gate PASS** (Victor, real browser — default/focus/disabled/empty × light｜dark, a11y panel clean). 2026-08-11.
- **Step 8 `/critique`** — independent adversarial critic (fresh subagent) = **SHIP**, no blockers/material. Verified
  token/theme correctness, assertEditorDocument wiring, command parity, the barrel fix, "created-once". Folded 1 MINOR:
  `setContent` → `emitUpdate:false` (v3 defaults true, `setContent.ts:52`) so a reset never echoes `onChange` (+ test).
  Discovered while testing: `onChange` fires one benign idempotent mount echo (Tiptap seed normalization) — documented
  (spec §8, current-business-rules) not hacked (deterministic suppression = out-of-scope normalization edge-cases).
- **§XXIX Currency** — created `docs/editor/current-spec.md` + `docs/editor/current-business-rules.md` (code-cited),
  refreshed the E1 spec change-log + `packages/editor/src/CLAUDE.md`. Test count now **18/18**.

### NEXT
- **Commit** E1 (branch `ui-3-vida-editor`): `@vida/editor` v0.1.0 + the `@vida/ui` barrel fix + `docs/editor/current-*`
  + specs. NOT yet committed. (Whether to PR E1 alone or stack E2+ before a UI-3 PR is Victor's call.)
- Then **E2** (standard blocks: table/callout/divider/image/code-block) — the next UI-3 unit, re-enters the §XXVI gate.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Profile | New Feature | delivery-plan:201/:107 authoritative over `#`-table label | 2026-08-11 |
| UI-3 before UI-4 | UI-3 first | reconcile doc: all authoritative sources unanimous; part-3:116 proven non-ordering | 2026-08-11 |

## Build Steps
_(materialized 2026-08-11 from E1 §7 — approved at Approval 2, no re-gate. Implement in order.)_
- [x] B1 · Package foundation — `package.json` v0.0.0→0.1.0: deps `@tiptap/react`+`@tiptap/pm`+`@tiptap/starter-kit`+`@tiptap/extension-placeholder` (`^3.30.0`, family-pinned) + `@tamagui/core@2.6.2` + `@vida/types`/`@vida/ui` (`workspace:*`); peer `react>=19`; devDeps+scripts mirrored from `@vida/ui`. Config: `vite.config.ts` (React plugin, `test.environment:'node'`), `tsconfig.json` (+jsx react-jsx +lib DOM +project refs to types/ui), `tsconfig.storybook.json`, `.storybook/{main.ts,preview.tsx,preview-head.html}`. Turbo tasks already generic (build/typecheck/test) — no turbo.json change.
- [x] B2 · `internal/editor-styles.ts` — injected CSS (idempotent, browser-only): focus ring on frame `:has(.ProseMirror:focus-visible)` → `var(--colorFocusRing)`; placeholder `::before` color → `var(--colorTextMuted)` (NOT `--placeholder`, sub-theme-only); disabled cursor.
- [x] B3 · `editor.tsx` — `assertEditorDocument(json)` runtime structural gate (§6) + `useEditor` (StarterKit + Placeholder, `immediatelyRender:false`, `onUpdate→onChange`) + `<VidaEditor>` Tamagui `@tamagui/core` styled frame (base semantic tokens, no sub-theme) wrapping `<EditorContent>`; `editable`/`placeholder`; `forwardRef`→`setContent`/`focus`/`getDocument`; a11y via `editorProps.attributes` (role=textbox, aria-label/labelledby, aria-multiline).
- [x] B4 · `commands.ts` — `INTEGRATION_BLOCK_COMMANDS: readonly SlashCommand[]` — one per `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields (BR-E1-4).
- [x] B5 · `index.ts` barrel — `VidaEditor`, `VidaEditorProps`/`VidaEditorHandle`, `INTEGRATION_BLOCK_COMMANDS`, re-export `EditorDocument` type.
- [x] B6 · Tests (jsdom, `// @vitest-environment jsdom`): `editor.test.tsx` (render/edit/onChange-valid-doc, setContent/getDocument/focus ref, editable=false, placeholder, aria-name axe, `waitFor(isEditable)` guard) + `commands.test.ts` (parity vs enum, all-7-fields, valid category). Stories `editor.stories.tsx` (default/focus/disabled/empty, under UIProvider) + `src/CLAUDE.md` (§XXIX).
- [x] B7 · Verify — `pnpm install` (adds tiptap to lock); `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck; no `@vida/core`/app import.
