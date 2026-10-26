<!-- Business Rules — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · ADR-003/006/008/009 · note.ts · docs/core/business-rules.md · intake · frontend-quality-bar -->
<!-- Restored 2026-10-26 (notes-rescope LIF-245, Documentation Gate) from eaf64f8^ and realigned. As-built invariants
     (cited to code) live in docs/modules/notes/current-business-rules.md; THIS doc is the intent the code is judged
     against. backend-intent NOT-* line cites refer to the eaf64f8^ text. -->

# Business Rules — Notes & Pages  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3 and LF-1/2/3 (device is source of truth,
> local-first writes). Every rule below complies with it.

## Invariants (what is ALWAYS / NEVER true)

- **NP-1 — No inline notes columns, ever.** All notes for any entity live in `pages` via `entity_type` + `entity_id`.
  `[FACT: ADR-002 L107; CLAUDE.md Conventions]`
- **NP-2 — One journal per calendar date** among non-deleted rows; a second journal for a date is a typed conflict
  (`JournalExistsError`), never an overwrite. The calendar date is the **user's local day**. `[FACT: ADR-002 L1335;
  migrations/033_notes.ts:71-73; INTENT: timezone = the user's location (settled)]`
- **NP-3 — Sensitive fields are encrypted client-side.** `[E]`: `pages.title`, `.content`, `.cover_image`,
  `.summary_config`, `page_links.context`, `note_attachments.{filename,encrypted_blob,thumbnail_blob}`. M1.0 is a
  pass-through (`encryptedFields:[]`); wiring = M3/DB-5. `[FACT: note.ts @encrypted; ADR-019 sequencing; current BR-11]`
- **NP-4 — Editor content is its own write path, merged as a CRDT at sync.** `pages.content` (TipTap JSON) is written
  only through the content path (`writePageContent`), never the LWW metadata patch. Multi-device merge = Yjs per page
  at M4; in M1 it is a local write. `[FACT: ADR-003 §editor content; IR-7; current BR-NEU-4]`
- **NP-5 — Links are unique and id-based.** `page_links UNIQUE(source,target)`; `entity_links UNIQUE(page_id,
  entity_type, entity_id)` (enforced by the AR-6 Spaces substrate). Re-linking is an idempotent no-op / revive.
  `[FACT: ADR-002 L1356, L1390; NOT-14/22]`
- **NP-6 — Entity links target a *registered* type** — the open ADR-006 taggable-type registry, validated in-service
  (`UnregisteredEntityTypeError`). `[INTENT: ADR-006 §3.2-3.3; FACT: NOT-20]`
- **NP-7 — Wiki-links resolve by page id, not text/slug.** `[[` opens a picker; selection binds a concrete
  `target_page_id`; links survive renames and title collisions. `[FACT: ADR-002 page_links; INTENT G2]`
- **NP-8 — Entity notes auto-exist and are never blank.** `*_note` pages are created with their parent entity, seeded
  deterministically client-side from the parent's own fields. `[INTENT G4; FACT: NOT-11..13]`
- **NP-9 — Deletes are soft and reversible; hard delete is explicit and app-layer.** A user delete soft-deletes
  (`deleted_at`) with **undo by default** (undo toast + Trash restore); a hard confirm exists only for the
  irreversible (emptying Trash). There are **no SQL FKs**: a hard delete is an app-layer cleanup the notes service
  orchestrates — `page_links`, `note_attachments`, the page's `entity_links` and `entity_tags` rows, and
  `parent_id → NULL` on children. Trash keeps a page **30 days**. `[FACT: frontend-quality-bar/_index.md:83 (P4);
  p4-trust-reversibility-specimen.html:120-157 (":123 kept 30 days"); NOT-39/41; migrations/033_notes.ts:14 (no REFERENCES)]`
  **RESOLVED (delivery/interpretation.md §5 #1):** the delete leg ships soft-delete + undo + a notes-scoped Trash (restore · delete forever ·
  Empty Trash behind a danger confirm) + the cascade. Open, homed: (ii) purge timing/mechanics — `[UNKNOWN — homed: the delete leg's slice PLAN]`.
- **NP-10 — Every page type is editor-capable.** On the page surface the editor gate keys on **page type**
  (`PAGE_TYPE`), not on the `ENTITY_TYPES` polymorphic-reference registry, which governs module-entity surfaces.
  `[FACT: debt-census.md:84-88; envision EC-15; surface-map.md:48]`
- **NP-11 — Renames are metadata edits.** A title change goes through the metadata patch (`updatePage`); links are
  unaffected (NP-7); no optimistic patching (invalidate + re-read). `[FACT: notes-entity-usability IMPLEMENTATION-PLAN:117;
  state-conventions.md:121-127]`
- **NP-12 — Templates are live layouts; capture never takes accumulated data.** A page template is a reusable layout
  that contains live blocks (today's view re-aggregates on open; a past day shows its snapshot, JR-6). `[INTENT G7;
  FACT: NOT-51]` Applying ADR-009 §3.4's authored-vs-accumulated capture line (L73-82, written for Space bundles) to a
  single page document is `[INTERP: G7 + ADR-009 §3.4 applied to a page]`; what counts as "authored" prose inside a
  page doc is `[UNKNOWN — homed: the templates S3–S5 RATIFY append (debt-plan.md:22), notes-rescope Step 5]`.

## Validation & edge cases
- `journal_date` is `YYYY-MM-DD` TEXT, required iff `type='journal'`. `[FACT: validators/note.ts:42-45]`
- `parent_id` self-references `pages` (deliverable_note → milestone_note); orphan → NULL on hard delete (NP-9).
- Tag names are `[E]` (ADR-006 §3.2); tag rules are owned by ADR-006 / Spaces, not here.
- `/notes` default view = `note` pages, not archived; Archived + Journal are filter predicates (journal views are
  Journals'/Home's, JR-1) — **RESOLVED (delivery/interpretation.md §5 #2)**; a delta vs as-built BR-7b / BR-SUR-1. The `show_archived` pref is
  Tasks-only (ADR-002 L3537-3539) — not the basis.

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Page collection | skeleton | "no pages yet" + create CTA | typed read error, retry | rendered list/calendar/gallery/graph; a layout missing a required field is **degraded** (declared, non-error) |
| Block editor | content loading | new blank page (or seeded note, NP-8) | parse fail → read-only + flag | editable; save-state honest (`saved`/`error` in M1, "saved on this device") |
| Journal `/summary` | sections loading | per-section "nothing today" (not an error) | failing source degrades that section only | aggregated sections |
| `[[` picker | querying titles | "no match — + Create '<text>'" | query error, keep typing | link inserted by `target_page_id` |
| Link preview | loading | title-only fallback (never a dead card) | — | title + type (EC-11); enrichment DEFERRED (XCU-BSE-12) |
| Backlinks panel | querying | "nothing links here yet" | query error | merged links grouped by source module |
| Neural graph | building | honest "being prepared" empty while AR-8 data-prep is deferred (EC-3) | never a crash (EC-3) | force-directed graph |
| Search | searching | "no results" | `search-unavailable` until indexed (DB-8) | ranked results |
| Delete | — | — | write error surfaced | moved to Trash + undo |

## Failure behavior (fail loud — constitution §5)
- Every read/write returns typed errors; no catch swallows a foundation gap.
- A `/summary` source that is unavailable degrades **that section only**. `[INTENT G5]`
- Create-on-miss is explicit ("+ Create …"); a typo never silently creates a page. `[INTENT G2]`
- Writes succeed locally first (LF-2); sync state is surfaced honestly — no fake "synced" before the sync engine (M4,
  `docs/roadmap/MVP-PATH.md:34`). `[FACT: frontend-quality-bar:81-84; decisions.md:289 (which still says "M3 forward
  seam" — stale vs MVP-PATH)]`

## ⚠ Flagged delta
- **G5 — Summary section set.** `JournalSummaryConfig` (note.ts:79) defines 5 toggles; the full personalizable menu is
  ⚠ INTENDED (M1.4). The section ENGINE + its providers are Journals/HARD-1, not N&P. `[FACT: note.ts:79; NOT-32/35]`

## ⚠ Intent ↔ as-built deltas (to be closed or re-pinned by notes-rescope — see docs/modules/notes/current-business-rules.md)
- M1 save-state = `saved` / `error`; code shows `saving | saved | error` (BR-NEU-5).
- Row dates = the user's local day; code slices UTC (`ymd`, BR-SUR-6).
- Mode memory persisted per instance with per-type defaults (EC-5); code = in-memory, global `tabbed` (BR-SUR-5).
- Editor parse failure → read-only + flag; code parses malformed content to `null` → a blank editor whose next edit
  would overwrite the stored document (BR-SUR-3) — **data-loss risk**.
- Every page type editor-capable (NP-10); code admits only `note` + `journal` (BR-SUR-4).
- Delete/rename (NP-9/NP-11) have no UI; no restore API exists (contract ⚠ INTENDED).

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] terminal states · [x] fail loud · [x] inherits core · [x] realigned (no-FK
  delete, editor gate, templates, honest sync) · [x] UNKNOWNs homed to named notes-rescope steps
