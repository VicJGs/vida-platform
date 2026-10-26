# Slice Map — Notes & Pages · RESCOPE (notes-rescope, LIF-245) · Re-scope Gate (Step 5)

> Entity Delivery Flow recovery variant, Step 5. Turns the DRY reconciliation ledger (`reconciliation.md`, 184 rows, `cd80a3d`)
> into a corrected, plane-tagged slice plan. Supersedes the ① build's slice-map (S1–S4, all shipped 2026-09-19 —
> `git show cd80a3d:docs/features/notes-and-pages/delivery/slice-map.md`). Yardstick: `interpretation.md` (Step 3 PASS) ·
> `envision.md` (EC-25…36 + EC-13 re-pin, approved) · fe-notes `envision.md` EC-1…24 + Re-pins.
>
> **Every slice** runs the §XXVI double gate (PLAN → `/critique` → Approval 1 → `/preflight` → `/critique` → Approval 2)
> before code, then its per-plane blocking gate:
> - **backend** → Verification Gate: Vitest (logic + failure paths) → typed-error assertions → live smoke on the real store.
> - **frontend** → Visual Gate: real browser, every state × light/dark × 375/768/1440, §XIV a11y sweep, the slice's EC MUSTs.
> - **shared** → both.
> Each slice also flips the tests its leg invalidates (B-66 · F-2), rewrites the stale headers it touches (B-55/56 · E-5),
> names every affected query key (N-1/F-7), and refreshes the `current-*` of every context it touches (§XXIX/F-8).

## Order and dependencies

```
R0 data safety ─┬─ R1 page frame ─┬─ R3 metadata + rename ─┐
                │                 ├─ R4 attachments        │
                │                 └─ R5 delete + Trash ─────┤
                ├─ R2 mode memory                           │
                ├─ R6 collection + views ───────────────────┤
                └─ R7 editor seams + [[ links ── R8 blocks as widgets ── R9 templates ── R10 live close
```
R0 first (data loss). R1 before R3/R4/R5 (the ⋯ action slot + SyncStatus placement). R7 before R8 (node-view injection).
R8 before R9 (templates carry live blocks). R6 before R9 (the "New from template" header entry). R10 last.

---

## R0 — Data safety  ·  SHARED
**Why first:** four ledger paths lose or corrupt user content today.
- Tagged content parse `parseContentResult → ok | absent | malformed` (impact A: keep `parseContent`'s null contract) +
  additive `contentStatus` on `NoteEntityData`; editor `enableContentCheck` + `onInvalidContent` prop; a lossy/unknown-node
  load → `editable={false}` + the EC-33 notice + "Export a copy" (`toMarkdown` of the raw content); never write.
  (B-50 · C-46 · C-47 · C-48 · B-51 · IR-R4)
- `writePageContent` shape guard; writes/creates against a deleted or unknown page rejected with a typed error (A-6 · A-7).
- `useNoteContent` exposes `flush()` / `cancel()`; flush on `pagehide` + `visibilitychange:hidden` (B-30 · E-1 · IR-R2).
- Full invalidation set on content write: page · list · `['journal',date]` · `['calendar','journal',from,today]` (B-52 · B-53 · N-1).
- Reaches Home (shared body) and fe-calendar (shared parser).
**ECs:** EC-33. **Gate:** Verification (incl. a live repro of B-53 + a malformed/unknown-node page on real OPFS) + Visual (the notice, Home + page).

## R1 — Page frame  ·  FRONTEND (+ shared gate fn)
- Page-surface editor gate keyed on `PAGE_TYPE` — new fn, entity gate unchanged (B-24 · IR-R5 · impact A) → EC-15.
- Untitled `*_note` label fallback (type label + parent name) for H1 + editor accname (E-3).
- Overview renderers mounted as components; remove the notes-owned journal Overview registration → edge journals-rescope
  (B-45 · B-46 · IR-R13 · EC-18a).
- `action` slot carried through `EntitySource`/`toEntityProps`; the ⋯ menu shell (B-27).
- `SyncStatus` "Saved on this device" beside ⋯, one live region; Home placement (B-49 · B-65 · IR-R15) → EC-34.
- Read-error Retry on page, collection and Home (E-2); shared mutation error toast utility (F-7); create failure toast (B-15).
- Shared type labels from `note-chrome` (B-60); full card accessible name (B-63).
**ECs:** EC-15 · EC-18/18f · EC-34 · EC-4 · EC-19. **Gate:** Visual (+ Verification for the gate fn).

## R2 — Mode memory  ·  SHARED
- `app_state` KV accessor (core) + `createAppStateEntityModeStore` (async read, seeded per-type default while loading;
  in-memory store kept as reference) (A-42 · A-43 · impact A).
- Per-type defaults table: `note` = tabbed/editor; `journal` → Home arrangement (journals-rescope); `*_note` → their RIDE
  owners (B-21 · B-22).
- **ADR-006 append** (per-instance mode memory: `app_state`, device-local by ADR-002 §5.0).
**ECs:** EC-5 · EC-4 · EC-19. **Gate:** Verification (persist → reload → same mode on real OPFS) + Visual.

## R3 — Metadata + rename  ·  SHARED
- `useMutation(updatePage)` for favorite · archive · icon · cover; archive keeps the open page reachable (B-36 · IR-R7).
- Icon domain = Lucide name; cover = image URL or attachment ref; validators tightened (A-4).
- Icon grid picker (lazy-loaded) + cover picker; header renders the chosen icon with type-icon fallback; rows/tiles carry
  icon + cover (B-37 · B-38 · B-39 · E-4 · G-1 — bundle check in this gate).
- Rename both ways: editable title seam in `@vida/ui` EntityView (Enter/blur saves, Esc reverts) + ⋯ "Rename" dialog;
  same mutation (B-26 · B-28 · F-5).
- Key set per mutation (B-54).
**ECs:** EC-7 · EC-25 · EC-29 · EC-22. **Gate:** shared.

## R4 — Attachments  ·  SHARED
- Live `['attachments',pageId]` query; remove (B-41).
- File input + drop zone → bytes → `addAttachment`; honest progress; size limit (typed error naming file + limit) (B-42 · A-23).
**ECs:** EC-8 · EC-30. **Gate:** shared (live: add → reload → listed).

## R5 — Delete, undo, OS-wide Trash  ·  SHARED
- ① `restorePage` (collision check → `JournalExistsError` / typed `*_note` conflict) · `listDeletedPages` · `deletePageForever`
  (NP-9 cascade, one tx; spaces rows via AR-6) · `emptyTrash`; re-delete is a no-op (A-10…A-16 · IR-R10/R11 · impact A).
- Cross-module **Trash provider registry** `{entityType, listDeleted, restore, purge}`; notes registers first; composed (A-14).
- ⋯ "Move to Trash" → settle pending flush (R0) → soft delete → toast with Undo; deleted-aware page banner + Restore
  (B-29 · B-30 · IR-R2/R3).
- **OS-wide Trash system surface:** shell global surface + route + icon + command-bar nav command, placed in the System
  panel list + the ≤375 overflow (strip icons unchanged, pending the fe-shell-scope re-pin); grouped by module; Restore · Delete forever · Empty Trash with danger confirms; states incl.
  partial provider failure; focus after removals (B-31 · B-33 · B-34 · F-1 · F-5 · F-6).
- Docs: IA global-surfaces row + surface-map row (B-32); **fe-shell-scope EC-4 re-pin** (see Approval).
- Purge timing (30-day enforcement) decided in this slice's PLAN.
**ECs:** EC-26 · EC-27 · EC-28. **Gate:** shared (live: delete → reload → restore → persists).

## R6 — Collection + saved views  ·  SHARED
- Compose `ViewsService` + `ViewProviderRegistry` + `ViewEngine`; register tasks' existing provider too; a pages
  ReadProvider (default `type='note'`, not archived; "Show archived" + tag predicates) (A-28 · A-30 · A-31 · A-18 · E-11).
- Idempotent global default notes view (XCU-06) (A-35); `resolved` from `ViewEngine.resolve`, sort applied (A-29 · B-5 · B-8).
- Layouts List · Gallery · Graph (drop calendar + its coercion) (B-1 · B-2); Filter/Sort/New view wired via
  `bindViewConfigWrites` (B-6 · B-7); "Show archived" header toggle (B-4); "New from template" header entry → R9 dialog (B-16).
- `degraded` passed through + a CollectionView degraded slot in `@vida/ui`; XCU-14 layout field declarations (gallery → cover,
  graph → links) (B-9 · A-32).
- Excerpt rule (derived client-side, hidden when empty) (B-10); local-day row dates (B-11, TZ-forced test); relative labels
  formatted at render with a tick (B-12); note-only DEV sample (B-57).
- Graph keeps the honest "being prepared" state (B-13 → HARD-3).
- Docs: views slice-map XCU-14 RATIFY append (E-7); surface-map:48 re-pinned to List · Gallery · Graph (E-9).
**ECs:** EC-1 · EC-2 · EC-3 · EC-35 · EC-12 (borrowed) · fe-codec-collection EC-2/5/6. **Gate:** shared.

## R7 — Editor seams + `[[` links  ·  SHARED
- `@vida/editor`: consumer-supplied suggestion seam (`[[`) + generalized combobox ARIA (C-1 · C-2); `wikiLink` inline atom
  (page + entity targets, label from target) in `@vida/types` + editor + serializers with markdown round-trip or a
  declared-lossy row (C-3 · C-15 · C-16 · F-3); node-view event/keyboard seam (F-4). Optional props only (impact B).
- Picker live: `resolveWikiLink` (escape · limit · archived policy · `*_note` labels) + entity candidates through a label
  seam (decided in PLAN: ReadProvider label vs SearchProvider) + page-able scope; grouped by type; "Create note '…'";
  discriminated pick → `page_links` / `entity_links` (C-4…C-10 · A-25 · A-33 · A-34).
- Doc ↔ link-row reconcile in ① on content write (set semantics) (C-5 · IR-R12).
- Hover/focus preview; deleted target state (C-12 · C-13 · C-14). Remove the `?picker` DEV overlay (B-58 · C-11).
**ECs:** EC-10 (re-pin) · EC-11 · EC-31 · EC-17. **Gate:** shared.

## R8 — Blocks as widgets + capability registry  ·  SHARED
- Capability registry + offered-set resolver composed; editor blocks + `/task` registered as shipped inline definitions;
  `resolveInlineForPage` (page's Spaces ∪ editor base); slash palette fed by the offered set (C-36 · C-37 · C-38 · C-39 ·
  A-39 · A-40 · A-41).
- Node-view renderer injection (`createIntegrationBlockExtensions(renderers?)`, constant = default) + the shared widget frame
  (header · 4 states · actions) (C-18 · C-19 · C-20).
- Real bodies here: `/summary` (SummaryBlock + "Open journal"; hook flipped to `buildDashboard`; config → `JournalSelection`;
  `date:null` = host journal date else local today) · `/entity-link` · `/backlink` · `/task` create-or-bind (`taskBlock {task_id}`;
  `createTask` → `getTaskNote`; tick → `completeTask`/`reopenTask`; "Open task page") (C-21…C-30 · A-44).
- Other module blocks: honest placeholders naming their owner + edges (C-31 · C-32 · C-34); `/class-notes` added as a placeholder
  (owner Learning) (C-35); `habit_logger` vs `habitsBlock` decided in PLAN (C-33); serializer copy for live blocks (C-49).
- Docs: extension-catalog Real-body column + `taskList`/`taskChecklist`/`/task` rows; edges added to the ② task files
  (F-10 · C-50); CAP-12 recorded (inline ✅ by construction; standalone placement stays with fe-spaces-page) (C-40).
**ECs:** EC-14 · EC-32 · EC-36 · EC-9 · EC-24. **Gate:** shared.

## R9 — Entity-based templates  ·  SHARED
- Compose `TemplatesService`; instantiate engine + `TemplateWriterRegistry` + the notes `pages` writer (fork, no
  `template_id`; unregistered entity type → partial-failure "seeds what it can") (A-36 · A-37 · C-43).
- Page capture (authored structure + live-block config, never accumulated content) (A-38 · C-45 · NP-12).
- "New from template" dialog grouped by entity type · Shipped/Yours · what it creates · "Use template" forks + opens the first;
  ⋯ "Save as template" (B-16 · B-17 · B-18 · C-41 · C-42 · C-44). Remove the `?templates` overlay.
- Docs: templates slice-map S3–S5 append (E-7); edges for module template writers (E-8); `capability-framework.md:239`
  row gains Projects + Notes pages (C-52); NP-12 page-doc rule fixed in business-rules.
**ECs:** EC-13 (re-pin) · EC-35. **Gate:** shared.

## R10 — Entity Live Close  ·  SHARED
- Retire dead seams (`CanvasEditor`, `page-binding`, 0-byte `tag-extension.ts`; keep the styles) (B-59 · E-6).
- ELC-7 live leg on real OPFS, one script: `/notes` · `/notes/$id` · Home · calendar · Trash — write → reload → reopen with no
  spurious write, malformed page read-only, delete → reload → restore; console clean (F-9).
- ELC-9: every EC this entity carries re-verified live (own + inherited CODEC ECs; `feel` ECs EC-16/17 verified here; borrowed
  ECs recorded against their owners) (Area D).
- ELC-8 currency for every context touched (F-8) + `docs/modules/notes/current-*` (E-9); notes/ layer CLAUDE.md.
- Edges confirmed on the receiving task files: journals-rescope (EC-18a, journal views, where a journal opens — E-10) ·
  fe-tasks / fe-projects (`*_note` Overviews, template writers, eager task page C-30) · fe-habits and the other ② units
  (block bodies) · HARD-3 · HARD-1 · DB-8.
**Gate:** ELC-1…9 + `/critique` SHIP.

---

## Coverage check
- Every ledger row maps to a slice (✅ rows need no work; borrowed rows are edges). Rows not named above: ✅ rows (A-1/2/3/5/8/9/
  17/20/21/22/24/26/27, B-13/14/19/20/23/25/35/40/43/44/47/61/64, C-14/20/29/47/51) and borrowed data legs (B-43 → HARD-3,
  B-19 → DB-8).
- Every structural EC maps to ≥1 slice: EC-1/2/3 R6 · EC-4/19 R1+R2 · EC-5 R2 · EC-7 R3 · EC-8 R4 · EC-9 R8 · EC-10/11 R7 ·
  EC-12 R6 (borrowed) · EC-13 R9 · EC-14 R8 · EC-15 R1 · EC-18/18f R1 · EC-22 R3 · EC-23/24 R10 re-verify · EC-25 R3 ·
  EC-26/27/28 R5 · EC-29 R3 · EC-30 R4 · EC-31 R7 · EC-32/36 R8 · EC-33 R0 · EC-34 R1 · EC-35 R6+R9 · `feel` EC-16/17 R10.
- Re-homed / borrowed: EC-18a → journals-rescope · EC-18b–e/20/21 → fe-tasks · fe-projects · EC-3/6 data → HARD-3 · EC-9 data →
  HARD-1 · EC-12 → DB-8.

## Approval (Re-scope Gate — blocking)
Requested from Victor:
1. The slice plan R0…R10 as above.
2. **fe-shell-scope re-pin** (consequence of the EC-27 OS-wide Trash pick; `docs/specs/foundation/fe-shell-scope/delivery/envision.md:23-24`).
   Proposed: **EC-4** — the System panel's labeled nav list = the 6 surfaces **+ Trash** (icon + label); **EC-3 unchanged** —
   the strip keeps its 6 icons at ≥768 and Search + overflow at ≤375 (Trash reachable from the overflow / System panel).
   Alternative: Trash also as a 7th strip icon at ≥768 (re-pins EC-3 too).
_Pending._
