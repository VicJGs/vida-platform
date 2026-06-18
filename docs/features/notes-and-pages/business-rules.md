<!-- Business Rules — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · note.ts · docs/core/business-rules.md · intake -->

# Business Rules — Notes & Pages  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3 (client-side-only crypto, SRP, key hierarchy) and LF-1/2/3 (device is source of truth, local-first writes, all-or-explicitly-scoped offline). Every rule below complies with it.

## Invariants (what is ALWAYS / NEVER true)

- **NP-1 — No inline notes columns, ever.** All notes/annotations for any entity live in `pages` via the polymorphic `entity_type` + `entity_id` pattern; no table carries an inline `notes TEXT` column. `[FACT: ADR-002 L91; CLAUDE.md Conventions]`
- **NP-2 — One journal per calendar date.** `type='journal'` is unique per `journal_date` among non-deleted rows (partial unique index). `[FACT: ADR-002 L1309 idx_pages_journal_unique]`
- **NP-3 — Sensitive fields are encrypted client-side.** `[E]`: `pages.title`, `pages.content`, `pages.cover_image`, `pages.summary_config`, `page_links.context`, `entity_links.context`, `tags.name`, `note_attachments.{filename,encrypted_blob,thumbnail_blob}`. The server stores them only as opaque blobs (ZK-1). `[FACT: note.ts @encrypted tags; ADR-002 -- [E] marks]`
- **NP-4 — Editor content is a CRDT, not LWW.** `pages.content` is a TipTap/ProseMirror JSON document synced via **Yjs** per page (conflict-free offline merge); structured columns sync via LWW. `[FACT: note.ts L91; ADR-003 §editor content]`
- **NP-5 — Links are unique and id-based.** `page_links` is `UNIQUE(source_page_id, target_page_id)`; `entity_links` is `UNIQUE(page_id, entity_type, entity_id)`. No duplicate link rows. `[FACT: ADR-002 L1330, L1364]`
- **NP-6 — Entity links target a closed set of 33 types.** `entity_links.entity_type ∈` the 33-value `EntityLinkTarget` enum; anything else is rejected by the CHECK constraint. `[FACT: ADR-002 L1342-1351; note.ts EntityLinkTarget]`
- **NP-7 — Wiki-links resolve by page id, not text/slug.** `[[title]]` is resolved at link-creation time (via the picker) into a concrete `target_page_id`; the stored link survives renames and is immune to title collisions. `[FACT: ADR-002 page_links; INTENT G2]`
- **NP-8 — Entity notes auto-exist and are never blank.** `task_note`/`task_group_note`/`milestone_note`/`deliverable_note` are created with their parent entity; while unfilled, the page is seeded with a short summary **generated client-side, deterministically from the parent entity's own local fields** (title, type, status, dates). No server call; no plaintext leaves the device (inherits ZK-1). `[INTENT G4]`
- **NP-9 — Deletes are soft; relationships cascade.** Rows soft-delete via `deleted_at`. Hard-deleting a page cascades to `page_links`, `entity_links`, `page_tags`, `note_attachments` (`ON DELETE CASCADE`); `pomodoro_sessions.page_id` and `pages.parent_id` are `SET NULL`. `[FACT: ADR-002 FK clauses L1280, L1317-1318, L1341, L1390-1391, L1409, L1434]`

## Validation & edge cases
- `journal_date` is `YYYY-MM-DD` TEXT; required when `type='journal'`, otherwise NULL. `[FACT: ADR-002 L1283; note.ts L96]`
- `parent_id` self-references `pages` (deliverable_note → milestone_note hierarchy); `ON DELETE SET NULL` orphans rather than cascading. `[FACT: ADR-002 L1280]`
- A second journal for an existing date must be rejected at write time (maps to NP-2), surfaced as a typed conflict, not a silent overwrite. `[INTERP: NP-2 enforcement]`
- Tag names are unique and encrypted (`tags.name` UNIQUE + `[E]`) — dedupe happens on decrypted value client-side. `[FACT: ADR-002 L1375]`

## Terminal states (enumerated before build — the missing tail is where bugs live)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Page list / views | skeleton list | "no pages yet" + create CTA | typed read error, retry | rendered list/calendar/gallery/graph |
| Block editor | content decrypting | new blank page (or seeded note, NP-8) | decrypt/parse fail → read-only + flag | editable document, autosaved locally (LF-2) |
| Journal `/summary` | sections spinner | section with no data shows its own "nothing today" (NOT an error) | a failing source degrades that section, others render | aggregated sections rendered |
| `[[` wiki-link picker | querying titles | "no match — + Create '<text>'" (create-on-miss) | query error, keep typing | link inserted as `target_page_id` |
| Backlinks panel | querying links | "nothing links here yet" | query error | merged page_links + entity_links list |
| Neural graph | building graph | "no connections yet" | render fail → fallback to list | force-directed graph |
| FTS search | indexing/searching | "no results" | index-not-ready (pre-unlock) → typed state | ranked results |

## Failure behavior (fail loud — constitution §5)
- Every read/write returns typed errors; no catch swallows a foundation gap. `[FACT: core business-rules §5]`
- A `/summary` source that is unavailable degrades **that section only** to an explicit empty/error state — it never blanks the whole journal. `[INTENT G5; INTERP terminal-states]`
- Create-on-miss is explicit (the picker shows "+ Create …"); a typo never silently creates a stray page without the user choosing it. `[INTENT G2]`
- Writes always succeed locally first (LF-2); sync errors are surfaced asynchronously, never block editing. `[FACT: core business-rules LF-2]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
- **G5 — Summary section set.** `JournalSummaryConfig` in `note.ts` currently defines **5** toggles (`showHabits/showTasks/showStudySessions/showTransactions/showInteractions`). The full personalizable menu (Routines, Class schedule, Reminders, Events, Check-in, Goals/Targets, Pomodoro, Gamification) is **⚠ INTENDED**, not shipped — expanding the type is a build-phase change + candidate ADR. Rules NP-* above hold for the current 5; the extra sections are aspirational until the type lands. `[FACT: note.ts L75-81; INTENT G5]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits core constitution · [x] spec/code drift flagged
