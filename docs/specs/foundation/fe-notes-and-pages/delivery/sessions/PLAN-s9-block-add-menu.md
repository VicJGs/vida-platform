# PLAN — S9 · Block add-menu / slash-menu (RATIFY / consume-verify)

> fe-notes-and-pages (② unit #27) · slice S9 (FINAL — the unit PR opens here) · Linear LIF-191 · branch
> `fe-notes-and-pages` (Node 24). **Approval-1 artifact** (ratify-mode: PLAN → ░g1░ → Approval 1 → consume-verify
> Visual Gate → close-out). Grounded in `delivery/{slice-map,seam-contract,envision,interpretation}.md` + the aspect
> `xcut-capability.md` (CAP-12/13) + the SHIPPED `@vida/editor` E1–E8 (`packages/editor/src/`).

## 1. What S9 is (scope line) — a RATIFY / consume-verify slice, NOT a new UI
S9 homes **CAP-12/13 (the editor/page block-placement add-menu/slash-menu)** — EC-14. The grep-the-capability result:
**the capability palette is already SHIPPED in `@vida/editor` (E4) and CONSUMED on the note page; both CAP services are
deferred; there is no editor seam to feed.** So S9 is **RATIFY (0 new fe-notes app code) + a consume-verify** (the
[[grep-the-capability-before-building-a-codec-primitive]] case — a decomposition "primitive" is a capability, not
auto-code), plus the whole-unit PR close-out. Over-building a fe-notes palette would **re-author the editor** —
forbidden by NOT-52.

**The facts (why RATIFY, all FACT-cited):**
- `@vida/editor` E4 ships the full `/` slash-menu palette: `SLASH_MENU_ITEMS` = 11 standard blocks (usable) + 11
  integration blocks (`available` flipped by E5) + `filterSlashItems`, rendered by `slash-menu.tsx` (a WAI-ARIA
  `role="listbox"` combobox) via `extensions/slash-command.ts` (`@tiptap/suggestion`) `[FACT: slash-commands.ts:40-216;
  packages/editor/src/CLAUDE.md "Shipped (E4)"/"(E5)"]`. It is a built-in of `<VidaEditor>`, inert until `/` is typed.
- The note page mounts an **editable** `<VidaEditor chrome="bare">` `[FACT: note-editor-body.tsx:26]` → typing `/`
  offers the palette (basic + platform blocks). **EC-14 is structurally MET by the consumed editor.**
- **Both CAP services are DEFERRED:** CAP-13 per-surface palette compute (offered/allowed teeth-split) → UI-3 `#29`;
  CAP-12 `block_instances` standalone-placement service → MOD-notes `#31` `[FACT: xcut-capability.md:42-43;
  seam-contract.md:22,32; interpretation.md:104,124]`.
- `VidaEditorProps` exposes **no** per-surface-palette / offered-set / placement prop (`defaultValue`/`onChange`/
  `editable`/`toolbar`/`chrome`/`aria-label` only) `[FACT: editor.tsx:25-32]` → fe-notes **cannot** feed CAP-13/CAP-12
  today; a `resolveBlockPalette` with no consumer would be a speculative seam (over-engineering — the
  [[grep-the-capability-before-building-a-codec-primitive]] "no M1 consumer" rule).
- NOT-52 / interpretation DELEGATES: platform-block TipTap extensions + placement/palette compute are NOT re-authored
  in fe-notes `[FACT: notes-and-pages.md:66; interpretation.md:124]`.

**In scope (S9):**
- **CONSUME-VERIFY EC-14** — the note-page `<VidaEditor>` offers the capability palette (type `/` → the listbox of
  basic + platform blocks). Blocking Visual Gate.
- **CONSUME-VERIFY EC-24** — Quote (blockquote) · Task-list · Table render correctly in the note-page editor (the
  on-branch `@vida/editor` `editor-styles.ts` fix: taskList checkbox-alignment + the previously-unstyled blockquote →
  tokened left bar + muted italic) `[FACT: git diff main editor-styles.ts]`.
- **Formalize the on-branch EC-24 ui-3 fix** as `docs/specs/fixes/editor-blocks-quote-tasklist/` (the parking-lot item)
  + **re-run the `@vida/editor` suite** so the ui-3 change is green before the PR.
- **Document CAP-12/13 as deferred** (F-S9-1) — the permanent homing record.
- **The FINAL PR close-out** (S1–S9): split the `@vida/editor` EC-24 change into a **SEPARATE ui-3 commit/PR** (NOT
  bundled into fe-notes' apps/web PR — the parking-lot mandate); open the fe-notes PR for the apps/web unit.

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII):**
- A **fe-notes palette/add-menu UI** — the editor owns it (E4); re-authoring violates NOT-52. (RATIFY, not build.)
- **CAP-13 per-surface palette compute** (offered/allowed teeth-split; union-inline / restrict-standalone) → UI-3 `#29`
  (+ a future `VidaEditor` offered-set seam to feed it). No speculative `resolveBlockPalette` (no M1 consumer).
- **CAP-12 standalone `block_instances` placement** service + the standalone add-menu → MOD-notes `#31`. (The Space-level
  add-menu is SP-29 → `fe-shell-integration-wiring`, NOT fe-notes — `[FACT: slice-map.md:32; interpretation.md:181-185]`.)
- Integration-block **REAL bodies** (the E5 placeholders) → MOD-* / #31 (F-S4-1/F-S5-1 family).

## 2. Composition shape
No net-new fe-notes module. The realized surface is the already-wired note-page editor:
```
note-entity.tsx → EntityView (editor facet) → note-editor-body.tsx → <VidaEditor chrome="bare" editable>
    └─ E4 slash-menu (type `/`) → the capability palette (SLASH_MENU_ITEMS: 11 standard + 11 integration)   [CONSUMED]
    └─ E2/E5 blocks: blockquote · taskList · table render per editor-styles.ts (EC-24)                        [CONSUMED]
CAP-13 per-surface offered-set compute → UI-3 #29   (no VidaEditor seam yet)                                  [DEFERRED]
CAP-12 block_instances standalone placement → #31                                                             [DEFERRED]
```

## 3. Net-new units (files)
| File | Purpose | Notes |
|------|---------|-------|
| `docs/specs/fixes/editor-blocks-quote-tasklist/_index.md` | formalize the on-branch `@vida/editor` EC-24 fix (ui-3) | the parking-lot deliverable; the change is a SEPARATE ui-3 commit/PR |
| `apps/web/src/notes/use-note-entity.ts` (edit — DEV sample only) | enrich the `?sample` `sampleDoc` with a **blockquote + taskList + table** so the EC-24 consume-verify can assert they render in-app | behind the `?sample` DEV gate (dead-code in prod); a gate FIXTURE, not product UI — **RATIFY still holds** for the palette / CAP-12/13 (no fe-notes palette UI is authored) |
| (no other apps/web code) | — | the palette is the consumed editor (E4); CAP-12/13 deferred, no seam to wire |

## 4. Decisions — all DOC-RESOLVED / grounded
- **D-S9-1 — S9 is RATIFY, not a build.** The capability palette ships in `@vida/editor` E4 + is consumed by the
  note-page editor (EC-14 met); CAP-12/13 compute+placement are deferred (#29/#31) with no `VidaEditor` seam to feed →
  fe-notes writes **no product UI**; it CONSUME-VERIFIES + records the deferred homing. Re-authoring the palette = NOT-52
  violation. (The fe-codec-patterns S2 / canvas-graph-route RATIFY precedent.) The ONLY apps/web edit is a DEV-sample
  enrichment (the `?sample` `sampleDoc` gains a blockquote/taskList/table) to make the EC-24 consume-verify deterministic —
  a gate fixture behind the DEV gate, not a palette/add-menu UI.
- **D-S9-2 — EC-14 is verified on the REAL editor, by driving `/`.** The Visual Gate types `/` in the note-page editor
  and asserts the palette listbox appears with standard + integration blocks (the consume-verify, EC-24-note "at S9").
- **D-S9-3 — EC-24 (editor blocks) is a ui-3 change, consumed + verified here.** The on-branch `editor-styles.ts`
  (blockquote + taskList) is formalized as a fixes-doc and lands as a **separate `@vida/editor` commit/PR**, NOT bundled
  into fe-notes' apps/web PR `[FACT: task parking-lot; git status M editor-styles.ts]`. Consume-verify: Quote/Task-list/
  Table render correctly in the note-page editor.
- **D-S9-4 — CAP-13 ≠ SP-29.** fe-notes = the editor/page block placement (CAP-12/13); the **Space** standalone add-menu
  (SP-29) rides `fe-shell-integration-wiring`, NOT fe-notes `[FACT: slice-map.md:32; interpretation.md:181-185]`.
- **D-S9-5 — no speculative palette seam.** A `resolveBlockPalette(surface)` would have no M1 consumer (the editor slash
  menu doesn't accept an injected offered-set) → not built (the ProviderRead "type+convention only with a consumer" rule).

## 5. Envision coverage — S9's EC Visual-Gate MUSTs
| EC | Requirement | S9 assertion (consume-verify) |
|----|-------------|-------------------------------|
| **EC-14** | the editor offers the **capability palette** (basic + platform blocks) — page/editor surface | Visual Gate: type `/` in the note-page editor → the `role="listbox"` palette shows standard + integration-block options |
| **EC-24** | Quote · Task-list · Table render correctly (ui-3 dependency, consumed here) | Visual Gate: a doc with a blockquote (tokened left bar + muted italic), a task-list (aligned checkbox), a table (tokened) renders correctly |
| **EC-22** | Lucide icons token-tinted | the palette rows / editor chrome carry Lucide glyphs (E4 title-rows; verify no emoji) |
| EC-16/17 (feel) | editorial calm | live Visual Gate (full-matrix AA) |

## 6. Verify plan (ratify — no new unit tests; consume-verify + existing suites)
- `@vida/editor` suite green (the EC-24 `editor-styles.ts` change) — re-run before the PR.
- Full `@vida/web` suite green — the `?sample` `sampleDoc` enrichment may cascade into `note-entity.test.tsx`/
  `use-note-entity.test.ts` if they assert the sample content shape (the S5/S6 literal-cascade precedent); fix the literal
  if so. Regression check otherwise.
- No net-new fe-notes tests (RATIFY — nothing new to unit-test; the consume-verify is the Visual Gate).

## 7. Blocking Visual Gate (consume-verify, real browser)
Brave real app → onboarding → `/notes/1?sample` (the note page, editor facet). 3 presets × light/dark × 375/768/1440:
- **EC-14:** type `/` in the editor → the palette `role="listbox"` appears with ≥ several standard blocks + integration
  blocks (e.g. Text/Heading/Quote/Table + Summary/Tasks/…); filter by typing narrows it. (The `/`-trigger assertion.)
- **EC-24 (N1 — SEED via `?sample`, don't drive `/`):** the enriched `?sample` `sampleDoc` (blockquote + task-list +
  table) renders in the note-page editor; verify each renders correctly (blockquote = tokened left bar + muted italic, not
  a bare indent; task-list = checkbox vertically aligned to the first text line; table = tokened borders). Seeding via the
  DEV sample (not driving the `@tiptap/suggestion` popup) keeps the EC-24 render-check deterministic; the `/`-typing path is
  reserved for EC-14. The sample enrichment is a DEV/gate fixture (dead-code in prod), not a fe-notes palette UI — RATIFY holds.
- **EC-22:** no emoji in the palette/editor; glyphs are Lucide.
- Full-matrix **AA** on the palette rows + block text incl. warm-dark; `axe` 0; 0 overflow (`/tmp/vg/s9-gate.mjs`).

## 8. Risks / findings
- **F-S9-1 — CAP-12/13 execution seams (NEW, filed S9):** the per-surface palette compute (CAP-13 → UI-3 `#29`) and the
  `block_instances` standalone-placement service (CAP-12 → MOD-notes `#31`) are deferred; a future `VidaEditor` offered-set
  seam is also needed to feed CAP-13 into the slash menu. fe-notes consumes the editor's non-restrictive base palette in
  M1 (the inline union — exactly CAP-13's inline rule). A cross-tier defer (service + a future editor prop).
- **R1 — do NOT re-author the palette (NOT-52).** The temptation on a "build the add-menu" slice is to render a fe-notes
  palette; that re-implements E4 + the registry. RATIFY: consume + verify. Flag if a reviewer pushes to build one.
- **R2 — the PR must SPLIT the ui-3 change.** The `@vida/editor` EC-24 `editor-styles.ts` fix lands as a SEPARATE ui-3
  commit/PR; the fe-notes PR is apps/web-only `[FACT: task parking-lot]`. Mixing them couples two review surfaces.

## 9. Close-out (the unit PR — after the gate)
1. Formalize `docs/specs/fixes/editor-blocks-quote-tasklist/` (the EC-24 ui-3 fix) + re-run `@vida/editor` tests.
2. **Commit the `@vida/editor` EC-24 change separately** (ui-3 scope).
3. **Commit the fe-notes apps/web unit** (S1–S9 — all prior slices were uncommitted; the PR opens here) + the delivery docs.
4. Open the fe-notes PR; §XXIX currency (task + TASKS.md + F-S9-1); CI green bar the known pre-existing reds.
