<!-- ui-ux/_index.md — Entity UI/UX Build Flow (Track B) spec set · §6 lens 0.
     The PROPER FRONTEND SPEC: retroactive for the built ②b/②c, forward for the 🕳 ②d/②e. REFERENCES the aspect
     corpus + current-* + delivery/interpretation.md; never restates. Bookend: authored now (S3), refreshed at
     each track close (§XXIX). Born 2026-08-22 (recovery). This set is the yardstick S4's Visual Gate judges. -->

# Notes & Pages — UI/UX Spec Set (Track B · frontend)

**Entity:** Notes & Pages (MOD-notes ②, LIF-131, M1.1). **Home:** `apps/web/src/app/notes/`,
`apps/web/src/app/note-detail.tsx`, `packages/editor/src/extensions/wiki-link.ts`.
**Status:** ②b/②c BUILT (⛔ Visual Gate owed → S4); ②d/②e 🕳 gap (S7/S8).
**Yardstick basis:** `../identity.md` · `../structure-data.md` · `../business-rules.md` · `../current-spec.md`
(②a/②b/②c "BUILT" sections) · `../current-business-rules.md` (NC-*/EM-*/WL-*/DP-*) · `../delivery/interpretation.md`.
Never restates them.

## Scope

The rendered Notes experience over the ②a data plane (no HTTP): the `/notes` collection surface (②b), the
`note/$id` authoring surface + `[[` picker (②c), and — forward — the backlink/entity-link panels + page
metadata (②d) and FTS5 search (②e). Composes M1.0 `@vida/ui` (UI-1/UI-2) + `@vida/editor` (UI-3) + the UX-4
terminal-state canon. `[FACT: ../current-spec.md:58-101]`

## The five lenses (§6)

| Lens | File | Covers |
|------|------|--------|
| screens | `screens.md` | every view/route + its 8 states (§VIII) |
| screen-flow | `screen-flow.md` | CRUD navigation + per-operation state machine |
| ux | `ux.md` | interaction · a11y §XIV · responsive §X · motion §IX · copy |
| components-flow | `components-flow.md` | which `@vida/ui`/`@vida/editor` primitives compose into which feature components + data/props flow |
| slice-map | `slice-map.md` | ②b/②c/②d/②e sub-units + Visual-Gate ledger |

## Traceability spine (screen → flow → component → slice → gate)

| Screen | Flow | Component | Slice | Gate |
|--------|------|-----------|-------|------|
| `/notes` collection | browse · switch view · create (⌘K) | `NotesRoute` + `ListView`/`GalleryView`/`NeuralGraph` + `NoteCard` + `view-switcher` | ②b | ░Visual Gate░ **owed → S4** |
| `note/$id` editor | load · edit · autosave · rename | `NoteDetailRoute` + `NoteEditorSurface` + `VidaEditor` + `Input` | ②c | ░Visual Gate░ **owed → S4** |
| `[[` picker | trigger · query · select/create | `WikiLink` Suggestion + `WikiLinkMenu` | ②c | ░Visual Gate░ **owed → S4** |
| backlink/entity panels + metadata | view backlinks · toggle favorite/archive/icon/cover | (②d — to build) | ②d | ░Visual Gate░ (S7) |
| search | query · results · open | (②e — to build, over DB-8) | ②e | ░Visual Gate░ (S8, blocked DB-8) |

**Light-only at M1.0** — no theme store; "dark" is a token-capability audit, not a rendered pass. `[FACT:
memory apps-web-is-the-first-vida-ui-consumer; ../current-spec.md:70]`
