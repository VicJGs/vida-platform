# Interpretation — fe-codec-canvas-editor (CODEC · Canvas: Editor, unit #7, LIF-234)

> Entity Delivery Flow ② · Step 1 (Interpretation layer). Make the implicit explicit before decomposing.
> Every claim is `[FACT: path:line]` or marked `[INFERENCE]` / `[OPEN → Envision/Decomposition]`.
> Baseline recon: 2026-10-10 (Explore agent, FACT-cited). Worktree off `origin/main @ f540b83`.

## 0. One-line

Canvas: Editor is the composition that **mounts the already-shipped `<VidaEditor>` inside the editorial CODEC
frame**, producing the *"Editor facet body"* that `EntityView` #6 — and later #18 home journal facet / #27 notes —
consume as their `editor` slot. It is **not** "build the editor" (that is UI-3, shipped E1–E8) and **not** "wire the
block registry" (the 11+11 blocks already register; real `CapabilityRegistry` wiring is MOD-notes #31).

## 1. DEPENDENCIES

### 1.1 The decisive one — the package boundary forces the plane
- `@vida/editor` **depends on** `@vida/ui` (and `@vida/types`) [FACT: packages/editor/package.json — deps `{@vida/types, @vida/ui}`].
- `@vida/ui` has **no `@vida/*` runtime deps** [FACT: packages/ui/package.json — no vida deps] → it **cannot import `@vida/editor`** without a dependency cycle (`editor→ui` + `ui→editor`).
- ⇒ **A shell that renders `<VidaEditor>` cannot live in `@vida/ui`.** Unlike siblings canvas-board/reader/graph
  (which shipped `@vida/ui` components hosting `@vida/ui` renderers), the editor-canvas composition must live where
  BOTH `@vida/ui` (the frame) and `@vida/editor` (the body) are importable = **`apps/web`** [INFERENCE from the two package.jsons].
- `apps/web` currently depends on `@vida/core`, `@vida/types`, `@vida/ui` — but **NOT `@vida/editor`** [FACT: apps/web/package.json deps]. Adding `@vida/editor` to `apps/web` is the enabling seam of this unit; `apps/web → @vida/editor → @vida/ui` is acyclic.

### 1.2 Shipped substrate this unit COMPOSES (not rebuilds)
- `<VidaEditor>` (UI-3, E1–E8) — uncontrolled: `defaultValue?` + `onChange?(doc)` + imperative `VidaEditorHandle{setContent,focus,getDocument}`; `editable`/`toolbar`/`placeholder`; `aria-label`|`aria-labelledby` REQUIRED [FACT: packages/editor/src/editor.tsx:36-58]. Exports + serializers `toMarkdown/fromMarkdown/toPdf/toDocx` [FACT: packages/editor/src/index.ts].
- The **11 standard + 11 integration blocks** already register into the editor schema; integration blocks render placeholder node-views until their modules ship (never crash) [FACT: packages/editor/src/extensions/{standard-blocks,integration-blocks}.tsx; baseline §2].
- `CanvasView` (#10) — renderer-agnostic, **children-based** frame: masthead (eyebrow/title/meta/progress slot/actions slot/hairline), state-override rule (`empty`/`error` override slots → else `children`), responsive wrap, `maxWidth:1136`, `role=region` [FACT: packages/ui/src/components/canvas-view.tsx:34-110].
- `SyncStatus` / `HonestProgress` (fe-codec-patterns S4) — the honest M1 `saved`/`error` save-state surface, in `@vida/ui` [FACT: packages/ui/src/components/sync-status.tsx; baseline §4].
- 8-state machine `interaction-state.ts` (patterns S1) in `apps/web/src/state-conventions/` — state derived in apps/web, passed as a prop [FACT: apps/web/src/state-conventions/interaction-state.ts; baseline §4].

### 1.3 Blocking / blocked
- Blocked by `fe-codec-patterns` (LIF-211 ✅ done) [FACT: g6-reshape-runbook.md:37 — dep = fe-codec-patterns only].
- Blocks `fe-home` #18 (journal Editor facet) + `fe-notes-and-pages` #27 (Note Entity, Editor-led) [FACT: frontend-replan/reconstructed-structure.md:43,57]. (Historically also #13 seams, already shipped-around #7.)
- **Not** a dependency of `fe-codec-entity-facet` #6 — #6 shipped the *seam* (optional `editor` slot) and explicitly deferred the body to #7 "later" [FACT: packages/ui/src/components/entity-view.tsx:14-15,20-22].

## 2. NEEDS (what the consumers actually require from #7)

- `EntityView` #6 consumes an **optional `editor` ReactNode**; the registry-gate (resolved in apps/web S2) runs `isEntityType()` + a page lookup and PASSES an `editor` node or omits it; the shell offers the Editor facet IFF `editor` is present [FACT: entity-view.tsx:11-22,20-22]. ⇒ #7 must produce a **drop-in `ReactNode`** (an editor-canvas element), composable into EntityView's `editor` slot — not a page/route.
- The editor emits `EditorDocument` (TipTap JSON) via `onChange`, meant to wire to `pages.content` [FACT: editor.tsx:40 comment "Wire to pages.content in the app (BR-1)"]. ⇒ #7 owns the **persistence CONVENTION** (doc ↔ page mapping); per sibling precedent the **live data hook is deferred to the first real consumer** (#27 notes / entity-facet wiring), not built in #7 [FACT: apps/web/src/canvas/adapter.ts — "DOES NOT ship a live data hook … built at the FIRST consumer … ProviderRead precedent"].
- A document surface needs a **save-state** affordance (`SyncStatus`) and honest 8-state threading (loading page / empty page / error) — all shipped primitives to compose.

## 3. ORGANIZATION (where the code lands — [INFERENCE], ratified at Decomposition)

| Piece | Plane | Build vs reuse |
|---|---|---|
| `CanvasEditor` composition (frames `<VidaEditor>` in the editorial voice + SyncStatus + state threading + a11y) | **apps/web** | net-new (thin) |
| `@vida/editor` added to `apps/web` deps + first real editor mount proven in the vite app | **apps/web** | seam enable |
| Persistence CONVENTION (EditorDocument ↔ pages.content mapping; pure) + deferred `usePage`/`useEditorDoc` hook note | **apps/web** | net-new (pure) + deferred |
| The CODEC frame | `@vida/ui` `CanvasView` | **RATIFY** (reuse; renderer-agnostic by design) |
| Save-state surface | `@vida/ui` `SyncStatus` | **RATIFY** (reuse) |
| The 11+11 blocks + their schema registration | `@vida/editor` | **RATIFY** (already shipped) |
| Real `CapabilityRegistry` block wiring | `@vida/core` | **OUT — MOD-notes #31** |

⇒ **Likely a small unit**: ~1 apps/web slice (compose + persistence convention) + possible 2nd slice only if an
editor-canvas needs chrome `CanvasView` lacks. Much is RATIFY. This is the anti-over-engineering reading the gate exists to pin down.

## 4. IMPLICIT RULES (caught here, not in the browser)

- **IR-1 (plane):** the editor-canvas composition lives in `apps/web`, never `@vida/ui` (circular dep) [FACT §1.1]. The Tamagui-only `@vida/ui` boundary that forbade the canvas-board adapter in `@vida/ui` applies identically here [FACT: canvas/adapter.ts header].
- **IR-2 (runtime readiness):** mounting `<VidaEditor>` in `apps/web` requires adding `@vida/editor` to deps AND the editor bundling cleanly in the vite/OPFS app — a boot concern to prove in the live gate, not assume.
- **IR-3 (uncontrolled editor):** persistence wires `onChange → page save` and resets via the imperative handle, NEVER by re-seeding `defaultValue` per keystroke [FACT: editor.tsx:36 "UNCONTROLLED", VidaEditorHandle].
- **IR-4 (block wiring = RATIFY):** "11+11 block registry wiring" is already done inside `@vida/editor`; #7 must NOT re-register blocks or build a registry. Real `CapabilityRegistry` wiring is MOD-notes #31 [FACT: baseline §2].
- **IR-5 (produce a slot, not a page):** #7's output is a drop-in `ReactNode` for EntityView's `editor` slot (+ future #18/#27), not a standalone route [FACT: entity-view.tsx:20-22].
- **IR-6 (defer the live hook):** ship the pure composition + persistence convention; the `@vida/core`-backed live data hook is the first consumer's, per the ProviderRead precedent [FACT: canvas/adapter.ts].
- **IR-7 (a11y):** `<VidaEditor>` dev-warns without an accessible name; the canvas frame (`role=region` + title) must supply/label it [FACT: editor.tsx:49-50, canvas-view.tsx:role=region].

## 5. OPEN — resolved by the Envision gate (§3.75) + Decomposition

1. **Frame choice:** reuse `CanvasView` as-is, or does an editor/document surface want lighter/different chrome than a board masthead-with-actions? (The editor has its own E3 toolbar.) → Envision greybox shows it.
2. **Save-state placement:** `SyncStatus` in the `actions` slot vs a footer vs inline — a feel decision for the greybox.
3. **Slice count:** 1 (apps/web compose + convention) vs 2 (if a net-new `@vida/ui` editor-canvas chrome is justified). Default to the thinnest that covers the Envision checkpoints.

### 5.1 RESOLVED by the docs — persistence scope = thin + defer (not a preference)
The live `@vida/core` persistence mount is **out of #7 by the decomposition**, confirmed 2026-10-10 (Victor: "check the documentation"):
- #7 is typed **"canvas" (presentational)**, dep on **#2 patterns only** [FACT: frontend-replan/reconstructed-structure.md:27; g6-reshape-runbook.md:37 "reuse UI-3"].
- The **"runtime wiring (consume @vida/core)" is #13 seams' scope, not #7's** [FACT: frontend-replan/reconstructed-structure.md:33 — seams = "Capability/Block (inline/standalone) · … Spaces engine runtime wiring (consume @vida/core)", deps #3 #4 #7].
- **`ProviderRead` = convention + `ProviderRead<T>` type, NOT a hook**; the hook is "**deferred to the first consumer**" [FACT: fe-codec-patterns/s5-conventions.md:33-35,67-69], applied verbatim by the sibling canvas adapters [FACT: apps/web/src/canvas/adapter.ts header].
⇒ #7 ships: the `apps/web` presentational composition + the **pure** EditorDocument↔pages.content convention. It does **NOT** consume `@vida/core` at runtime and ships **no live data hook** (that is #13/#27). This is IR-6, now doc-anchored.
4. **Envision trigger (§3.75):** "a user affordance whose UI answer isn't obvious from a shipped surface?" — the editorial document-writing canvas is a **novel composition surface** → Envision likely **FIRES**. State the ruling explicitly at Step 1.5.
5. **First-consumer boundary:** confirm entity-facet #6 is an unwired shell (so the live hook genuinely belongs to a later consumer, not #7).
