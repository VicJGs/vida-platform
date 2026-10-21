# Unit: notes-entity-usability

> **Type:** feature (module completion) · **Status:** planning (gate 1) · **Session:** 2026-10-20-notes-entity-usability
> **Home-derivation:** completes `fe-notes-and-pages` (#27) interaction + IR-7 content persistence, now unblocked by
> `data-plane-wiring` (PR #148). First-consumer-pull: the data plane is the resolving condition both deferrals named.

## Identity
Make a note **usable**: open it (click a row / create-and-open) and **write in it with local persistence**. The
interaction legs (#27 stubbed as no-ops pre-data-plane) + the IR-7 editor-content write path (deferred to "the
first consumer" by `fe-codec-canvas-editor` #7's `page-binding.ts`). Single-device, local-only; CRDT/Yjs sync = M4.

## Slices
- **S1 — Open the note:** row/tile → `/notes/$id`; create → navigate to the new note.
- **S2 — Content persistence (IR-7):** `@vida/core` content-write seam (not an LWW metadata patch) + the apps/web
  binding hook (`onChange → serialize → persist`, debounced) wired into `note-editor-body`; reload via live `getPage`.

## Acceptance
See the PLAN's §4 (functional acceptance). DoD: open-on-click + create-opens + content persists across reload +
title persists + honest save-state + zero regression (notes tests/typecheck/lint green) + **verified live in Brave
on the real OPFS worker**.

## Gate files (the human gates — the deep content lives here, not in this index)
- Gate 1 (direction): [`sessions/PLAN-2026-10-20-notes-entity-usability.md`](sessions/PLAN-2026-10-20-notes-entity-usability.md)
- Gate 2 (build steps): `sessions/IMPLEMENTATION-PLAN-2026-10-20-notes-entity-usability.md` — authored after Approval 1.

## Key references
- `data-plane-wiring` (PR #148) — the enabling foundation · `fe-notes-and-pages/delivery/` (envision · interpretation IR-7 · seam-contract · slice-map)
- `apps/web/src/canvas-editor/page-binding.ts` (the deferred binding) · `apps/web/src/notes/{note-renderers,use-create-note,note-entity,note-editor-body,use-note-entity}.tsx`
- `MVP-PATH.md:14,59,185` (persistence = M1 goal; sync = M4) · `surface-map.md:43` (IA nesting)
