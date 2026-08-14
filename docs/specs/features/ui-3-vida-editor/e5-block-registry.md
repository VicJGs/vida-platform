# Spec: feature:ui-3-vida-editor — E5 (inline-block registry adapter + placeholder node-views)
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented      <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-13-ui-3-e5-block-registry (baseline verified drift-free; §1–§7 authored at PLAN; re-grounded in ADR-008 + AR-7 after Victor's doc-verify directive).
Parent: `_index.md` (umbrella §5 E5 row · BR-3) · Prior unit: `e4-slash-menu.md`.
Governing decision: **ADR-008 (capability/block registry)** + the AR-7 capability durable docs (`docs/core/capability/current-*`).

<!--
  FORWARD spec for E5 — written BEFORE the build (document-first + §XXVI). E5 is the fifth UI-3 sub-unit.
  IT IS THE EDITOR-SIDE REALIZATION OF ADR-008 THAT AR-7 EXPLICITLY DEFERRED TO UI-3 #29:
  capability/current-business-rules.md:26 — "Registry runtime (block placement · inline instances · TipTap re-home ·
  BlockType union · per-Block visual) → MOD-notes #31 / UI-3 #29". E5 = the editor's `inline` render surface (ADR-008
  §3.4): a registered inline capability becomes a TipTap node; in M1.0 the module bodies are absent, so each renders a
  placeholder (its inline `empty/unavailable` terminal state, CB6). E5 builds NO real body (MOD-* phases) and does NOT
  wire the @vida/core registry (MOD-notes #31's half of the re-home) — it builds the editor-side adapter + placeholders.
-->

## 1. Identity
UI-3 / **E5 — the editor-side `inline` render adapter for the ADR-008 capability registry + placeholder node-views.**
`@vida/editor` **v0.4.0 → v0.5.0**.

**Where E5 sits in the ADR-008 model.** ADR-008 retires the closed `BlockType = StandardBlockType | IntegrationBlockType`
union and makes capabilities an **open registry**; each definition declares `render_targets` and a `config_schema`, and
**`@vida/editor` is the `inline` renderer** — "a registered capability with an `inline` target is exposed as a TipTap
node + slash-menu entry" `[FACT: ADR-008 §3.4:104-109; §3.1:47-49; CB1/CB2 capability-framework.md:122-123]`. AR-7 shipped
the registry itself (`capability_definitions` with `render_targets·config_schema·terminal_states`, a `CapabilityRegistry`,
`RENDER_TARGET={inline,standalone}`) in `@vida/core/foundation/capability/` `[FACT: docs/core/capability/current-spec.md:11-16]`
and **explicitly deferred the editor-side runtime — "inline instances · TipTap re-home · BlockType union · per-Block visual"
— to UI-3 #29 / MOD-notes #31** `[FACT: docs/core/capability/current-business-rules.md:26; BR-7:20]`. **E5 is UI-3's half
of that re-home.**

**What E5 delivers** — a definition-shaped TipTap **node factory** producing ONE inline node per integration capability
(M1.0 definition source = the interim closed `INTEGRATION_BLOCK_TYPE` enum, 11 values) `[FACT: packages/types/src/editor.ts:28-40]`,
where each node:
1. **declares its `config_schema` as node attributes** (CB2: "inline = editor-node attrs (no table)") so an inline
   instance's config lives in — and round-trips through — the page-doc node `[FACT: ADR-008 §data-model:122; CB2
   capability-framework.md:123]`;
2. renders a **placeholder node-view** — the inline render target's `empty/unavailable` terminal state until its module
   body ships (CB6: terminal states per render target; graceful-degradation, never a crash) `[FACT: ADR-008 §terminal
   states:142; CB6:127]`.
Registering these makes the integration types part of the editor schema, which (a) renders any `EditorDocument` that
CONTAINS an integration block safely and (b) **flips E4's disabled slash-entries on** (BR-E4-5) `[FACT:
packages/editor/src/slash-commands.ts:17,167-190]`.

**What E5 is NOT (deferred — grounded):**
- **NOT the real capability bodies.** Each reads a module absent in M1.0. E5 ships only the placeholder inline view;
  the live body lands in its MOD-* phase, which REPLACES that type's node-view (the definition's `inline` renderer)
  `[FACT: _index.md §1:49-53; ADR-008:147 "become registered inline definitions — a build-time re-home"]`.
- **NOT the @vida/core registry wiring.** The editor stays presentational — it does NOT import `@vida/core`/the
  `CapabilityRegistry`. Feeding real `CapabilityDefinition`s (from AR-7's registry) into the factory is the app-mount
  half of the re-home, homed at **MOD-notes #31** `[FACT: capability/current-business-rules.md:26; _index.md §4 boundary]`.
  E5's factory takes an inline-SLICE shape (`InlineBlockDef`) so #31 supplies a thin `CapabilityDefinition→InlineBlockDef`
  adapter, not a factory rewrite. [INTERP]
- **NOT standalone / `block_instances`.** Standalone placement (a `block_instances` row on a Space, CB2/BR-7) is
  `@vida/ui` + MOD-notes, not the editor `[FACT: ADR-008 §3.4:106; capability/current-business-rules.md:19-20]`.
- **NOT serialization.** `integration_block_handling` (`comment|skip|placeholder`) is E6–E8; E5 only guarantees a
  type-identifying DOM `[FACT: packages/types/src/editor.ts:197-209]`.
- **NOT the app mount.** `/notes` renders an M1.1+ stub (`<h2>Notes</h2>`) and `@vida/editor` is imported by NO app
  `[FACT: apps/web/src/app/notes/index.tsx; grep '@vida/editor' apps/ → none]`.

## 2. Business Rules (E5)

- **BR-E5-1 · The editor's inline nodes ARE the ADR-008 registry's `inline` render surface (CB1/CB2) — definition-shaped,
  derived from E1's data.** `INTEGRATION_BLOCK_EXTENSIONS` is built by a `createIntegrationBlockNode(definition)` factory,
  the same shape as `STANDARD_BLOCK_EXTENSIONS` `[FACT: packages/editor/src/extensions/standard-blocks.ts]`. In M1.0 the
  `definition` is derived editor-locally from `INTEGRATION_BLOCK_COMMANDS` + the per-type config-schema interfaces (no
  `@vida/core` import); the factory's input (`InlineBlockDef`) is an inline SLICE — it does NOT reproduce AR-7's full
  `CapabilityDefinition` (`def_id·kind·render_targets·bindings·effects·config_schema·terminal_states` JSON) `[FACT:
  docs/core/capability/current-spec.md:12`); MOD-notes #31 supplies a `CapabilityDefinition→InlineBlockDef` mapping
  (`def_id→name`, JSON `config_schema`→the `{default}` runtime map) — a thin adapter, not a factory rewrite `[FACT: ADR-008 §3.4]`. Node `name` = the `block_type` value `[FACT: commands.ts:14; editor.ts:28-40]`. Schema-parity test:
  every `INTEGRATION_BLOCK_TYPE` value ∈ `editor.schema.nodes` (the E2 precedent).
- **BR-E5-2 · Inline config lives in node attrs, declared per the `config_schema` (CB2) — lossless for the DECLARED
  schema.** Each node is `group:'block'`, `atom:true` (no editable child content — a placeholder is a stub, not a
  container), `selectable:true`, `draggable:true`, and **declares `addAttributes()` from its capability's config schema**
  — the `@vida/types` per-type attr interface, **every attr given a `default`** (a `default`-less declared attr makes
  `computeAttrs` throw "No value supplied" on a partial insert — the `InlineBlockDef.configSchema: {default}` shape
  enforces this) `[FACT: prosemirror-model computeAttrs requires a value or hasDefault]`. So a `dailySummary` node
  declares `date`+`sections` `[FACT: packages/types/src/editor.ts:66-69]`; `entityLink` `entityType`+`entityId`+`label`
  `[FACT: :75-79]`; `chartBlock` `chartType`+`dataSource`+`config` (a nested-object attr — stored by reference, survives)
  `[FACT: :88-92]`; `timelineBlock`/`pomodoroBlock`/`habitsBlock`/`taskChecklist` likewise `[FACT: :98-138]`. Because
  ProseMirror preserves DECLARED attrs (both the HTML and the `Node.fromJSON` paths), an inline instance's config
  **round-trips losslessly for the declared schema** — the config an M1.0/other-device doc set survives render→
  re-serialize, ready for its MOD-* body to rehydrate `[FACT: ADR-008 §data-model:122 "config… editor node attrs";
  prosemirror-model computeAttrs preserves declared attrs]`. This is CB2, not a new mechanism.
  - ⚠ **Never-crash holds by TipTap's LENIENT content-load, not by attr-dropping — state the real mechanism.** Raw
    ProseMirror `Node.fromJSON → checkAttrs` **THROWS `RangeError: Unsupported attribute`** on any JSON attr key the node
    schema does NOT declare `[FACT: prosemirror-model@1.25 Node.fromJSON/checkAttrs]`. E5 doesn't crash because TipTap's
    `createNodeFromContent` wraps that in try/catch and — since `editor.tsx`'s `useEditor` sets neither
    `enableContentCheck` nor `errorOnInvalidContent` (both default OFF) — **catches → `console.warn`s → replaces the bad
    node with EMPTY content** `[FACT: @tiptap/core@3.30 createNodeFromContent; editor.tsx:123-147 sets neither flag]`.
    So an out-of-schema node degrades (warn + empty), it does not crash — but that degrade is **lossy**, which is exactly
    why declaring the 7 schemas matters.
  - ⚠ **4 types have no config schema YET** (`eventsBlock`, `classesBlock`, `backlink`, `milestoneBlock` — no `@vida/types`
    attr interface `[FACT: editor.ts has no *EventsBlockAttrs*/etc.]`). Their placeholder declares **no config attrs** →
    a doc carrying their (future) config hits the lenient-load degrade above (warn + empty), NOT loss-free preservation.
    Their schema is authored by their MOD-* alongside the real body `[UNKNOWN: config schema pending — authored per-module]`.
    Zero impact in M1.0 (no producer exists; editor unmounted). [INTERP]
- **BR-E5-3 · HTML contract is stable + type-identifying (the E6 seam).** `renderHTML` →
  `<div data-type="integration-block" data-block-type="<name>" …declared-attrs…>`; `parseHTML` matches the same, with a
  **per-node `getAttrs` discriminator** returning `false` unless `data-block-type === name` (all 11 register the SAME tag
  selector — without the discriminator the first-registered node claims every integration div) `[FACT: ProseMirror
  parseDOM getAttrs `false`→skip rule]`. This is the only coupling E6's markdown serializer needs to detect a block by
  TYPE and apply `integration_block_handling` `[FACT: editor.ts:197-209]`. No serializer code in E5.
- **BR-E5-4 · The placeholder view is the inline terminal state (CB6), composed from UI-1 tokens — no raw values, no new
  dep.** The node-view renders via `ReactNodeViewRenderer` `[FACT: @tiptap/react — /read-docs-first 2026-08-13]` inside a
  `NodeViewWrapper` whose content is `contentEditable={false}`: a Tamagui card on BASE semantic tokens
  (`$colorSurfaceSecondary`/`$colorBorderDefault`/`$colorTextMuted`, dimension props on the token SCALE `$md`/`$sm`)
  showing the capability `label`, `description`, and a muted "Available when its module ships" line — the inline
  render-target's `empty/unavailable` terminal state `[FACT: ADR-008 §terminal states:142; CB6; _index.md BR-4;
  packages/editor/src/CLAUDE.md BR-E1-5]`. **No icon → no `lucide-react` dependency** (E4's title-only decision carries)
  `[FACT: slash-commands.ts:24]`.
- **BR-E5-5 · Availability flips ON, tracking node-view existence (closes BR-E4-5).** E5 populates
  `AVAILABLE_INTEGRATION_BLOCKS` with all 11 types so `isBlockAvailable` returns true; the slash entries gain a `run` that
  inserts the node by type (`chain().focus().deleteRange(range).insertContent({ type: block_type }).run()`) — the DESIGNED
  trigger: "a deferred entry… lights up when E5 registers its node-view" `[FACT: slash-commands.ts:17,30; BR-E4-5]`.
  **Safe in M1.0 because the editor mounts in no app** (`/notes` is a stub) → a placeholder cannot reach a persisted doc
  until M1.1+, by which time (a) some MOD-* bodies may have shipped and (b) BR-E5-2 preserves any config anyway. A MOD-*
  later swaps the placeholder view for the real body — availability need not change again. [INTERP]
- **BR-E5-6 · Skeleton reconciliation (the "TipTap re-home" of the BlockType union — UI-3's charter).** The inline nodes
  live in ONE new `extensions/integration-blocks.ts` (11 data-derived nodes ≠ 11 files — the E2 `standard-blocks.ts` +
  "removed image-block.ts" precedent) `[FACT: E2 session-log]`. The 9 empty per-type stubs that map to integration types
  (`daily-summary.ts`, `task-checklist.ts`, `events-block.ts`, `habits-block.ts`, `timeline-block.ts`, `chart-block.ts`,
  `pomodoro-block.ts`, `entity-link.ts`, `backlink-panel.ts`) are RETIRED (0-byte, imported nowhere) — a MOD-* recreates
  `extensions/<type>-block.ts` when it builds the REAL inline body `[FACT: find … -empty = these 9]`. `tag-extension.ts`
  is LEFT UNTOUCHED — tags are not an `INTEGRATION_BLOCK_TYPE` (a separate feature) `[FACT: editor.ts:28-40]`.
  `classesBlock`/`milestoneBlock` need no file (data-derived; both are also among the 4 schema-less types — file-less AND
  config-less until their MOD-*).
- **BR-E5-7 · Boundary + Yjs deferral unchanged.** `@vida/editor` stays presentational: node-views import only
  `@tiptap/*` + `@vida/ui` + `@vida/types`; **NO `@vida/core`/`CapabilityRegistry`/app import** — feeding the real registry
  is MOD-notes #31 `[FACT: _index.md §4 boundary gate; capability/current-business-rules.md:26]`. No `yjs`/`y-prosemirror`
  (BR-2). No new runtime dep (ReactNodeViewRenderer ships in the installed `@tiptap/react`) `[FACT: package.json @tiptap/react ^3.30.0]`.

## 3. Contract — API & composition

### `<VidaEditor>` — NO public API change
No new prop. Integration node-views are a built-in of the editing surface. The imperative handle + `onChange(doc)` seam
are unchanged `[FACT: editor.tsx VidaEditorHandle]`.

### `extensions/integration-blocks.ts` (NEW) — the inline-render adapter
```ts
// An inline SLICE (not the full CapabilityDefinition) — #31 adapts CapabilityDefinition→InlineBlockDef.
interface InlineBlockDef { name: IntegrationBlockType; label: string; description: string;
                           configSchema: Record<string, { default: unknown }> }   // per-type attrs (from @vida/types)
function createIntegrationBlockNode(def: InlineBlockDef): Node       // name = def.name; addAttributes from def.configSchema
export const INTEGRATION_BLOCK_EXTENSIONS: readonly Node[]           // = INLINE_BLOCK_DEFS.map(createIntegrationBlockNode)
export const AVAILABLE_INTEGRATION_BLOCKS: ReadonlySet<IntegrationBlockType>  // = new Set(all 11) — THE single source
```
- `INLINE_BLOCK_DEFS` = `INTEGRATION_BLOCK_COMMANDS` joined to a per-type `configSchema` map (the 7 typed schemas;
  `{}` for the 4 pending — BR-E5-2). The `configSchema` map is the ONE spot that transcribes the `@vida/types` attr
  interfaces into runtime attr declarations (they are compile-time types — no runtime map exists) `[FACT: editor.ts
  interfaces are type-only]`. A test asserts the map's keys match each interface (drift guard).
- Each node: `{ name, group:'block', atom:true, selectable:true, draggable:true, addAttributes: () => fromConfigSchema(def),
  parseHTML:[{ tag:'div[data-type="integration-block"]', getAttrs:(el)=> (el as HTMLElement).dataset.blockType===name ? {} : false }],
  renderHTML:({node,HTMLAttributes})=>['div', mergeAttributes(HTMLAttributes,{'data-type':'integration-block','data-block-type':name})],
  addNodeView:()=>ReactNodeViewRenderer(IntegrationBlockPlaceholder) }` `[FACT: @tiptap/react node-view API]`.
- `IntegrationBlockPlaceholder` (co-located React node-view): `NodeViewWrapper` → Tamagui card, `contentEditable={false}`,
  `role="note"` + `aria-label`, label/description from the def.

### `slash-commands.ts` (E4 — MODIFIED)
- IMPORTS `AVAILABLE_INTEGRATION_BLOCKS` from `extensions/integration-blocks.ts`; `isBlockAvailable` reads that ONE set
  (replacing the local empty `new Set()` at line 170) `[FACT: slash-commands.ts:170-175]` — now true for all 11.
- `INTEGRATION_ITEMS` (line 178) gains a `run` inserting the node by type `[FACT: slash-commands.ts:178-187; BR-E5-5]`.

### `editor.tsx` (E1 — MODIFIED, 1 line)
Spread `...INTEGRATION_BLOCK_EXTENSIONS` after `...STANDARD_BLOCK_EXTENSIONS` `[FACT: editor.tsx:126-129]`.

### Node-view styling — Tamagui card; block rhythm in editor-styles
The card's VISUAL styling (bg/border/text) is Tamagui tokens (a real React tree, unlike E2's callout). The inter-block
RHYTHM (vertical margin between placeholders) is ONE injected rule in `internal/editor-styles.ts`
(`.vida-integration-block{margin:0.5em 0}`) — the same layer + em rhythm every other block gets (table/callout/image/hr),
since the `NodeViewWrapper` is a plain block div with no default margin (post-impl Visual-Gate fix).

## 4. States (§VIII applicable subset)
The integration block's M1.0 inline render state = the **placeholder / `empty`(unavailable)** terminal state (CB6/R5
per render target) `[FACT: ADR-008:142; capability-framework.md:127]`. Selection = the standard ProseMirror
node-selection ring (atom + `selectable`). `loading`/`error`/`success` arrive with the real body (the MOD-* re-home).
**Insertion is safe in M1.0:** the editor mounts in no app, so no placeholder can enter a persisted `pages.content` doc
yet (§1 NOT-app-mount); and BR-E5-2 preserves any config regardless.

## 5. Accessibility (§XIV)
- The node-view root carries an accessible name via `aria-label="<label> — available when its module ships"` on a
  `role="note"` (an inert informational aside — not `role="group"`, which implies grouped children this atom lacks)
  `[INTERP: §XIV requires a correct role + accessible name; §XIV names button/checkbox/… not `note`, but `note` is the
  correct role for an inert aside; _index.md BR-6]`.
- Atom + `contentEditable={false}`: the caret cannot enter the stub; arrows step OVER it as one unit (ProseMirror atom
  default) — no keyboard trap `[FACT: @tiptap atom semantics]`.
- No focusable descendants (no buttons/links) → nothing to tab into; selectable as a node, not a focus target. [INTERP]
- Contrast: `$colorText*` over `$colorSurfaceSecondary` inherits the DS-2 AA-checked pairs (no new values) `[FACT: BR-E5-4]`.

## 6. Acceptance
- [ ] `INTEGRATION_BLOCK_EXTENSIONS` registers a node for **every** `INTEGRATION_BLOCK_TYPE` value (all 11); schema-parity
      test `INTEGRATION_BLOCK_TYPE ⊆ editor.schema.nodes` (BR-E5-1).
- [ ] A `defaultValue` doc containing each of the 11 integration nodes renders WITHOUT throwing; each shows the placeholder
      card with the correct label (BR-E5-2/4, the graceful-degradation/terminal-state proof).
- [ ] **Config round-trips LOSSLESSLY for the 7 typed blocks (CB2):** a `dailySummary` node with `{date, sections}` →
      **`schema.nodeFromJSON(json).toJSON()`** returns them intact (the SCHEMA path — no editor view / node-view mount
      needed); likewise a representative `entityLink`/`chartBlock` (BR-E5-2).
- [ ] **Drift guard is COMPILE-TIME, not a runtime test (preflight fold A):** each type's `configSchema` entry
      `satisfies Record<keyof <T>BlockAttrs, { default: unknown }>` so `typecheck` fails if the map drifts from the
      `@vida/types` interface — interfaces are erased, so a runtime key-parity test is infeasible (BR-E5-2).
- [ ] **Boundary (the real failure mode):** a doc seeded with an UNDECLARED extra attr on a typed integration node (or
      any config on a schema-less type) LOADS WITHOUT THROWING (TipTap lenient-load degrades it), and a test documents
      that the out-of-schema key is NOT preserved (node degrades to empty + `console.warn`) — proving the boundary of the
      losslessness claim, not just its happy-path interior (BR-E5-2).
- [ ] The 4 schema-less blocks (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock`) render without throwing
      (config-less placeholder); documented as `[UNKNOWN: schema pending]` (BR-E5-2).
- [ ] `renderHTML` emits `div[data-type="integration-block"][data-block-type=<name>]`; `parseHTML` restores it; the
      per-node `getAttrs` discriminator prevents cross-parsing across the 11 (BR-E5-3, the E6 seam).
- [ ] All 11 slash entries `available:true`, selectable, inserting one adds the matching node (BR-E5-5). "No blocks" empty
      row still appears for a no-match query.
- [ ] Node-view a11y: `role="note"` + `aria-label`; caret steps over the atom; no keyboard trap (BR-E5-4/§XIV).
- [ ] The factory input is an inline-slice shape (`InlineBlockDef`) so MOD-notes #31 wires the real registry via a thin
      `CapabilityDefinition→InlineBlockDef` adapter, not a factory rewrite (BR-E5-1, the re-home seam).
- [ ] Boundary: `@vida/editor` still imports only `@vida/types` + `@tiptap/*` + `@vida/ui`; **no `@vida/core`/app import**;
      NO new dependency in `package.json` (BR-E5-7).
- [ ] The 9 stale integration stubs retired; `tag-extension.ts` untouched; no dangling import (BR-E5-6).
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck clean; boundary check clean; no raw
      hex. Version → **v0.5.0**.
- [ ] **Component Visual Gate PASS** (Storybook, both themes): "Integration blocks (placeholders)" story seeds a doc with
      all 11 → placeholder cards render in light + dark; the "Slash menu (live)" story shows the entries enabled.
- [ ] §XXIX currency: `docs/editor/current-spec.md` + `current-business-rules.md` + `block-registry.md` (0-byte → filled,
      grounded in ADR-008/CB1-CB2) + `extension-catalog.md` (+11 rows) + `packages/editor/src/CLAUDE.md`; umbrella §5 E5 →
      ✅ + a note that umbrella BR-3 should cite ADR-008 (currency follow-up).

## 7. Implementation Prompt — build steps (materialized post-preflight; the gate-2 IMPLEMENTATION-PLAN)
> Authored at PLAN; finalized after /preflight (gate-2). Order = defs → factory → view → wire → flip → test → docs.
1. **`extensions/integration-blocks.ts`** — `INLINE_BLOCK_DEFS` (join `INTEGRATION_BLOCK_COMMANDS` + the per-type
   `configSchema` map: 7 typed schemas from `@vida/types` each `satisfies Record<keyof …Attrs,{default}>`, `{}` for the 4
   pending) + `createIntegrationBlockNode` factory (declares config-schema attrs; per-node `getAttrs` discriminator) +
   `INTEGRATION_BLOCK_EXTENSIONS` + `AVAILABLE_INTEGRATION_BLOCKS`.
   - ⚠ **Object/array `default`s must be FRESH per `addAttributes` invocation** (`config:{}`, `sections:[]`) — a shared
     mutable default object is a TipTap footgun (every node instance would alias it). Return literals from a function,
     not a hoisted const (gate-2 impl note).
2. **`IntegrationBlockPlaceholder`** node-view (co-located) — `NodeViewWrapper` + Tamagui card, base tokens,
   `contentEditable={false}`, `role="note"` + `aria-label`.
3. **`editor.tsx`** — spread `...INTEGRATION_BLOCK_EXTENSIONS`.
4. **`slash-commands.ts`** — import the set; add `run`.
5. **Retire** the 9 stale stubs (keep `tag-extension.ts`).
6. **Tests** (host split — preflight fold B):
   - **SCHEMA path (raw `new Editor({extensions:[StarterKit, ...INTEGRATION_BLOCK_EXTENSIONS]})`, empty content — the E2
     introspection precedent):** schema-parity (11 ∈ `schema.nodes`); config round-trip via `schema.nodeFromJSON→toJSON`
     (7 typed); HTML render/parse + `getAttrs` discriminator; the undeclared-attr degrade boundary.
   - **VIEW path (`<VidaEditor>` via RTL `render()` + `waitFor(.ProseMirror)` — the E2 end-to-end precedent):** the
     placeholder node-view MOUNTS + shows the label (E5 is the FIRST React node-view — fold C: verify the
     ReactNodeViewRenderer portal flushes under jsdom; wrap in `act()`/`waitFor` if not synchronous).
   - **Unit:** availability flip (`isBlockAvailable` all true); slash `run` inserts the node; a11y attrs (`role=note`).
   - The `configSchema`↔interface guard is the compile-time `satisfies` (step 1), not a vitest assertion.
7. **Story** — "Integration blocks (placeholders)".
8. **§XXIX** — refresh the 5 doc surfaces + CLAUDE.md + umbrella (+ADR-008 BR-3 cite note); bump v0.5.0.

### Preflight folds (resolved into the plan above — /preflight 2026-08-14)
- **A · Drift-guard is compile-time `satisfies`, not a runtime test** — `@vida/types` interfaces are erased; no runtime
  attr-key list exists `[FACT: editor.ts has no runtime *Attrs const]`. Folded into acceptance + step 1/6.
- **B · Test-host split** — schema/JSON assertions use a raw `new Editor()` (no node-view mount); the node-view RENDER
  assertion needs `<VidaEditor>` RTL (ReactNodeViewRenderer requires the `<EditorContent>` portal host) `[FACT:
  standard-blocks.test.tsx:17 raw-Editor introspection + :106-120 <VidaEditor> end-to-end]`. Folded into step 6.
- **C · First React node-view in the editor** — E2 callout used injected CSS (no node-view); E4 popup is a ReactRenderer
  (isolation-rendered), not a node-view. Verify the portal flushes under jsdom at build; the E4 ReactRenderer working
  under jsdom is the positive signal `[FACT: slash-menu.test.tsx isolation render]`. No blocker — a build-time verify.
- **D · `getAttrs` returns `{}` on type-match = TYPE identity + JSON attrs get their `default`s** (fromJSON reads attrs
  directly, not via getAttrs). Per-attr HTML parse codec (for a `sections: string[]` → non-`[object Object]` HTML value)
  is only needed if E6 round-trips through HTML; E5's HTML contract needs only `data-block-type` → deferred to E6. [INTERP]
- **E · No new dep — confirmed** `ReactNodeViewRenderer`/`NodeViewWrapper`/`NodeViewContent` are exported by the installed
  `@tiptap/react@3.30.0` `[FACT: node_modules/.pnpm/@tiptap+react@3.30.0 dist exports]`. Boundary clean.

## 8. Deviations (§XXVIII) — recorded during implementation
- **`integration-blocks.ts` → `.tsx`** — the file carries the `IntegrationBlockPlaceholder` React node-view (JSX), so
  it is `.tsx` (E2's callout stayed `.ts` — injected CSS, no JSX). Imports resolve unchanged (no extension in the import).
- **Mutable attr defaults are FUNCTION defaults, not bare literals (post-impl critique fix).** The spec/plan said
  "fresh literals per entry" to avoid the shared-mutable-default footgun; a bare `[]`/`{}` literal in a module-level
  schema const is STILL one shared reference (TipTap copies `default` by reference → a measured cross-editor/global
  leak). Fixed to TipTap function defaults (`() => []`), which TipTap invokes per schema build (`@tiptap/core`
  buildAttributeSpec) → each editor owns its array. Locked by a cross-editor isolation test. Scalars stay plain values.
- **Block rhythm for the placeholder is one injected margin rule (Visual-Gate fix).** The Visual Gate found consecutive
  placeholders touching (the `NodeViewWrapper` is a plain block div with no default margin). Added
  `.vida-integration-block{margin:0.5em 0}` to `internal/editor-styles.ts` — the same layer + em rhythm every other
  block uses (table/callout/image/hr). The card's visual styling stays Tamagui; only the inter-block gap is in that layer.

## 9. Decisions (all grounded — surfaced for Approval 1)
- **D-1 · The block registry = the editor's `inline` render ADAPTER for ADR-008's ONE open capability registry — NOT a
  bespoke editor-local registry.** The definition home is AR-7's `capability_definitions` in `@vida/core`; `@vida/editor`
  is the `inline` renderer (ADR-008 §3.4). E5 builds a definition-SHAPED node factory; the M1.0 definition source is the
  interim closed enum (UI-3 owns the "BlockType union" re-home per `capability/current-business-rules.md:26`); MOD-notes
  #31 feeds real `CapabilityDefinition`s. A runtime `register()` inside the editor is NOT built (the registry already
  exists in `@vida/core`; the editor consumes it via #31). *(Supersedes the earlier "static array vs runtime map" framing,
  which missed ADR-008.)*
- **D-2 · Inline config = node attrs declared per `config_schema` (CB2) — lossless for the defined schema.** Each node
  declares its `@vida/types` attr interface as attrs; ProseMirror preserves declared attrs on both paths → an inline
  instance's config round-trips. *(Supersedes the earlier "no config attrs / not lossless / D-7 deferred hazard" —
  gate-1 correctly caught the drop, but the FIX per ADR-008 §data-model:122 is to declare the schema attrs, not defer.
  D-7 is DISSOLVED.)* The 4 schema-less types declare no config attrs until their MOD-* authors the schema `[UNKNOWN]`.
- **D-3 · Availability flips ON for all 11 at E5** (BR-E4-5 verified at gate-1). Safe: editor mounts in no M1.0 app, and
  D-2 preserves config regardless. MOD-* upgrades placeholder→real body.
- **D-4 · One `integration-blocks.ts`, retire the 9 stale stubs, keep `tag-extension.ts`.** The E2 precedent; 11
  data-derived nodes ≠ 11 files; tags aren't an integration type.
- **D-5 · No icon → no `lucide-react` dep** (carries E4's decision).
- **D-6 · No new ADR — E5 IMPLEMENTS ADR-008 (does not decide anything new).** It realizes the UI-3-homed re-home;
  the registry/render-target/config/terminal-state model is all ADR-008 + AR-7. New-feature Step 7 threshold not met.
- **D-7 · (DISSOLVED)** — the former "future-block attr-loss deferred hazard" is resolved by D-2 (declare config-schema
  attrs = CB2). It is NOT a deferred hazard; it was a spec gap now closed by grounding in ADR-008. *(Kept as a numbered
  entry so the gate-1 finding's resolution is traceable.)*

## 10. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-13 | ui-3-e5-block-registry | initial E5 spec authored at PLAN: 11 placeholder node-views + registry + availability flip + skeleton reconciliation; BR-E5-1..7. Baseline (`docs/editor/current-*`) verified drift-free. |
| 2026-08-13 | ui-3-e5-block-registry | **Gate-1 /critique REVISE → resolved** (independent adversarial critic): caught the "lossless `data` bag" claim as false (real attrs are named per-type), the `/notes` mis-cite, the `getAttrs` discriminator gotcha, the name drift; fixed all. Verified all line-cites + confirmed the fork resolutions. |
| 2026-08-13 | ui-3-e5-block-registry | **RE-GROUNDED in ADR-008 + AR-7 (Victor's doc-verify directive — "we already solved this in the docs").** The block registry is ADR-008's `inline` render surface (§3.4), whose editor-side re-home AR-7 explicitly deferred to UI-3 #29 (`capability/current-business-rules.md:26`). Rewrote §1/§2/§3/§9: config = node attrs per `config_schema` (CB2) → **D-7 DISSOLVED** (declare the 7 typed schemas → lossless; 4 pending are `[UNKNOWN]`); registry reframed as the inline-render adapter for AR-7's `CapabilityRegistry` (D-1); factory is definition-shaped for the MOD-notes #31 wiring; terminal-state framing (CB6). Needs a Gate-1 re-run on the re-grounded architecture. |
| 2026-08-13 | ui-3-e5-block-registry | **Gate-1 RE-RUN /critique REVISE → resolved** (fresh critic; confirmed the ADR-008 re-grounding FAITHFUL — all §3.4/data-model:122/CB2/`capability-business-rules:26` cites verbatim-verified). Fixed: BR-E5-2's mechanism claim ("undeclared attrs dropped, not errored") was WRONG — raw PM `Node.fromJSON`/`checkAttrs` THROWS `Unsupported attribute`; never-crash actually holds via TipTap's lenient content-load (neither `enableContentCheck`/`errorOnInvalidContent` set → catch+warn+empty), which is LOSSY → rewrote the mechanism + added the every-attr-needs-`default` invariant; added the boundary acceptance test (undeclared-attr degrade, not just happy-path); softened the overstated "#31 data-swap" → an accurate `CapabilityDefinition→InlineBlockDef` adapter; `role=note` cite → [INTERP]. |
| 2026-08-14 | ui-3-e5-block-registry | **IMPLEMENTED** (Approval 2). `@vida/editor` v0.5.0: `extensions/integration-blocks.tsx` (11 atom nodes + `IntegrationBlockPlaceholder` node-view + config schemas + availability set) · editor.tsx spread · slash-commands.ts flip+run · 9 stubs retired · +19 tests (121 total) · story · §XXIX docs. **Post-impl /critique → SHIP + 1 material fix**: mutable attr defaults were a shared reference (measured cross-editor leak) despite the "fresh literals" claim → FUNCTION defaults (`() => []`), locked by a cross-editor isolation test. typecheck 11/11 · editor 121/121 · build + storybook ✓ · boundary clean · no hex · no new dep · lint 0-err. |
| 2026-08-14 | ui-3-e5-block-registry | **Approval 1 granted** (Victor). **/preflight → PASSED + 5 folds** (A drift-guard is compile-time `satisfies` not a runtime test [my acceptance criterion was infeasible as written]; B test-host split schema-path vs `<VidaEditor>` RTL; C first React node-view — verify jsdom portal flush at build; D `getAttrs` `{}`=type-match, HTML per-attr codec deferred to E6; E no-new-dep confirmed — `@tiptap/react@3.30.0` exports the node-view API). Folded into acceptance + build step 6. Next: Gate-2 critique. |
| 2026-08-14 | ui-3-e5-block-registry | **Gate-2 /critique → SHIP** (fresh critic; line-verified all 8 gate-1/preflight fixes present + every `@vida/types` field-name cite accurate + full acceptance↔build-step coverage; no self-contradiction across the edits). Folded 1 impl note: object/array `default`s must be fresh-per-invocation (TipTap shared-mutable-default footgun). Spec APPROVED-TO-BUILD pending Approval 2. |
