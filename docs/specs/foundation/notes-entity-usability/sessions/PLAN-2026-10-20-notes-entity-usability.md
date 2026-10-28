# PLAN — notes-entity-usability (session: 2026-10-20-notes-entity-usability · language: English)

> Executive summary (HUMAN GATE 1). Approving this approves the **direction** (Approval 1).
> It completes the "a note you can open and write in, that persists" loop — the interaction + persistence
> legs that fe-notes (#27) deferred because the data plane did not yet exist. Now it does (`data-plane-wiring`,
> PR #148, merged today). No build detail here — that is the IMPLEMENTATION-PLAN (gate 2).

## 1. Context & demand

Notes went live for **read/list/create** when `data-plane-wiring` landed the composition root and the notes
go-live flipped the data hooks (PR #148/#149). Today the create-note path was fixed (`initVault` — libsodium
load, verified live in Brave: create + reload-persist). But when Victor used the OS he found notes still are
not **usable** in the everyday sense:

1. **Clicking a note does nothing** — it does not open the note's page. [FACT: `apps/web/src/notes/note-renderers.tsx:37,50` — `onPress={() => {}}` no-op on every list row + gallery tile].
2. **Creating a note does not open it** to write in — the list just gains a row. [FACT: `apps/web/src/notes/use-create-note.ts` — `onSuccess` only invalidates the list key].
3. **Writing in a note is not saved** — the editor opens and accepts typing, but edits are not persisted. [FACT: `apps/web/src/notes/note-editor-body.tsx:8-10` — "content persistence is DEFERRED (IR-7); the live `onChange → pages.content` wiring lands with the data plane"].

The IA contract says the collection is meant to drill into the entity page [FACT: `surface-map.md:43` — "Top view (Collection) → Entity page → blocks"], and the roadmap names persistence as the M1 goal that was blocked only by the (now-built) composition root [FACT: `MVP-PATH.md:14,59` — "cannot yet persist a note… no service composition root in apps/web, so notes/journal CRUD does not persist"].

**Why IR-7 was deferred (doc-grounded, now resolved):** a planned two-link deferral — #7 `fe-codec-canvas-editor` built `page-binding.ts` as a _pure convention + the EntityView editor slot, no live hook_, deferring the hook "to the first consumer (#27)" [FACT: `page-binding.ts:1-12`]; #27 `fe-notes` could not be that consumer because its data leg was a STUB ("live blocked by the worker-RPC Drizzle `values` seam + no composition root") [FACT: `.claude/tasks/fe-notes-and-pages.md:38`]. Both blockers are what `data-plane-wiring` built today. The **CRDT/Yjs sync-merge stays M4** (`Sync OFF → M4`) [FACT: `MVP-PATH.md:185`], but @vida/editor has **no Yjs dependency** [FACT: `packages/editor/package.json` — TipTap only], so M1 single-device local persistence needs none of it. "Content is CRDT, never LWW-patched" is a **forward-compat contract** (protect M4 merge), not an M1 blocker [FACT: `interpretation.md:159-161`].

## 2. What changes and why

**Value:** turn notes from a browsable shell into a usable tool — open a note, write, and have it still be there on reload. This is the first module to cross from "live data" to "actually usable," and it proves the pattern every later module's go-live will reuse.

**IN:**

- **S1 — Open the note.** Clicking a note row/tile navigates to its entity page (`/notes/$id`); creating a note navigates to the new note so you can start writing immediately.
- **S2 — Content persistence (IR-7).** A content-write seam in `@vida/core` (separate from the metadata `updatePage` patch, honoring the forward contract) + the apps/web binding hook (`onChange → serialize → persist`, debounced) so edits save locally and reload on open. Title edits persist via the existing metadata path. **Seam note [FACT]:** `note-editor-body.tsx:26` mounts `<VidaEditor chrome="bare">` **directly** (D-S2-1 — deliberately _not_ the `CanvasEditor`/`page-binding` path), and `VidaEditor` already exposes `onChange?: (doc: EditorDocument) => void` [FACT: `packages/editor/src/editor.tsx:29`] + `VidaEditorHandle.getDocument()`. So the real wire is `VidaEditor.onChange` in `note-editor-body`, **not** the `page-binding` change sink (that sink feeds the unused `CanvasEditor` path). Gate 2 targets `VidaEditor.onChange`.

**OUT (explicitly, documented):**

- CRDT/Yjs sync + multi-device merge (M4, `Sync OFF → M4`). The content-write seam is shaped so M4 evolves it without changing callers.
- Field-level encryption of `content` ([E] → M3; M1 pass-through) [FACT: `schema/notes.ts:47`].
- FTS5 search indexing of content (DB-8 / M1.4).
- Any home/other-surface go-lives (separate, owned completions).
- Nav links adding `/notes` to the top bar (an IA/shell concern, not this unit) — the surface stays reachable by route + from wherever it is already linked.
- **Configurable create/open behavior + open-in-a-new-tab** — net-new preference + an IA tab-workspace decision; **tracked in task `note-open-behavior-preference`** (flagged 2026-10-20, not deferred). This unit ships only the hardcoded create-and-open-in-place default.

**Why now:** the only thing that blocked it (composition root + worker write seam) landed today; leaving it would mean "you can make a note but not use it," which reads as broken.

**Sanctioned scope note (NOT a breach of the data-plane additive invariant):** S1/S2 edit `notes/*` done-task files (`note-renderers`, `use-create-note`, `note-entity`, `note-editor-body`, `use-note-entity`) + add one additive `@vida/core` method. This is the **owned module-completion** of fe-notes #27 — exactly the "per-module register + flip, done when Victor chooses" that `data-plane-wiring` defined as the opt-in step that DOES touch a done task [FACT: `IMPLEMENTATION-PLAN-2026-10-20-data-plane-wiring.md:13` — "the per-module go-live flips … each is a separate, explicit COMPLETION of that module … the only step that touches a done task, and it's owned + opt-in"]. The purely-additive invariant governed the _foundation_, not these completions.

**Slice independence:** S1 (nav legs) and S2 (IR-7) are **independently gated and independently shippable** — S1 can complete + merge before S2. This honors the docs' "IR-7 is its own future unit" [FACT: `data-plane-wiring.md:28`] inside one usability unit, and lets the trivial open-on-click win land without waiting on the heavier persistence slice.

## 3. Relevant business rules (functional)

- **BR-NEU-1 (open-on-click) [NEW]:** selecting a note in any collection layout opens its entity page. [INTERP of `surface-map.md:43` IA nesting].
- **BR-NEU-2 (create-opens) [DECIDED 2026-10-20 by Victor]:** creating a note navigates to the new note's page (open **in place**), ready to write — the M1 default. The **configurable** variant (create-and-open vs stay-on-list, and an **open-in-a-new-tab** mode, user-settable in Settings) is **net-new/undocumented** (no preference field in `user_preferences`; no in-app tab-workspace in the IA) and is **tracked as its own task `note-open-behavior-preference`** — explicitly NOT in this unit. This unit ships the hardcoded in-place default that task later makes configurable.
- **BR-NEU-3 (content persists locally) [NEW]:** editing a note's body and reopening it (or reloading) shows the saved content. Single-device, local; no sync. [FACT: `MVP-PATH.md:14` names this the M1 goal].
- **BR-NEU-4 (content write is NOT an LWW metadata patch) [FACT→enforced]:** `content` is written through a dedicated content path, never folded into the `updatePage` metadata whitelist, so the M4 CRDT merge is never clobbered. [FACT: `interpretation.md:159-161`; note the current `updatePageSchema` *includes* `content` — §5 Q1].
- **BR-NEU-5 (honest save-state) [NEW]:** the editor surfaces a truthful save state (saved | error) only — no fake "synced". [FACT: `page-binding.ts` `syncState?: 'saved' | 'error'` — "M1 honest"].
- **BR-RT-2/4 (unchanged):** reads re-read after a write (no optimistic); content reload uses the live `getPage` query already flipped in #149. [FACT: `use-note-entity.ts`].
- **IR-7 (unchanged, now being satisfied):** the canvas-editor binding owns the content write path; the hook was always the first-consumer's to supply. [FACT: `page-binding.ts:1-12`, `interpretation.md:159`].

## 4. Acceptance (functional)

- [ ] Clicking a note in List and Gallery opens that note's page.
- [ ] Clicking "New note" creates it **and** opens it, ready to type.
- [ ] Typing in a note, then reloading the page (or navigating away and back), shows the typed content.
- [ ] The note title can be edited and persists across reload.
- [ ] A truthful save indicator reflects saved / error (no fake synced state).
- [ ] Nothing regresses: list/create/read still work; existing notes tests + typecheck + lint stay green; verified live in Brave on the real OPFS worker (not just jsdom).
- [ ] `content` is persisted via its own write path, not via the `updatePage` metadata patch (BR-NEU-4).
- [ ] A freshly-created, empty-content note opens without error through the live `getPage` path (the real-row-but-blank-content edge).

## 5. Open questions / pending decisions

- **Q1 [DECISION, doc-leaning]:** the content-write seam shape in `@vida/core`. The contract (IR-7) says content is not an LWW patch, yet `updatePageSchema` currently _includes_ `content` [FACT: `validators/note.ts`]. Proposed, grounded resolution: add a dedicated `NotesService.writePageContent(id, content)` (M1 = local write to `pages.content`; M4 = CRDT entry point) and drop `content` from `updatePageSchema` to enforce BR-NEU-4. To be ratified at the IMPLEMENTATION-PLAN against the seam-contract. **Safety pre-check at gate 2:** confirm no existing `updatePage(...)` caller passes `content` before removing it from the schema (avoid a breaking change). [INTERP — resolve from `seam-contract.md` + `interpretation.md:159` at gate 2, not a free choice].
- **Q2 [INTERP]:** navigation mechanism for the renderers — pass an `onOpen(id)` from `notes-surface` (which can hold the router) down to `note-renderers`, vs. `useNavigate` inside the card. Resolve by the house pattern (how `/graph`, settings, etc. navigate) at gate 2. Not a blocker.
- **Q3 [INTERP]:** debounce/save cadence for `onChange → persist` (e.g., debounce ~500ms + on blur). Pick the simplest correct default at gate 2; `word_count` update is optional/when-free.
- No [UNKNOWN] blockers — every item above is resolvable from existing docs/code at gate 2.

## 6. Approval 1 (direction)

**APPROVED by Victor on 2026-10-20.** BR-NEU-2 decided = create-and-open in place (configurable/new-tab split to `note-open-behavior-preference`). The IMPLEMENTATION-PLAN (gate 2) is authored from this PLAN.
