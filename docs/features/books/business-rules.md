<!-- Business Rules — features/books · /documentation Phase 2 · sources: ADR-002 §Books · learning.ts · CLAUDE.md §7 · docs/intake/books.md -->

# Business Rules — Books  (level: Feature / own module)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, + the extension-model
> principle. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **BK-1 — Encrypted content.** `books.title`/`author`/`isbn`/`review`/`cover_url`/`genre`/`tags` and
  `book_chapters.title` are `[E]`; enums, page numbers, positions, dates, counters are plaintext. All INTENDED
  entities follow the same split: annotation TEXT (quote text, bookmark labels, highlight spans' captured
  text), file references, and photo blobs `[E]`; structure plaintext. Digital files + page photos are
  client-encrypted attachments (R2 pipeline). `[FACT: ADR-002 L2411-2427, L2448; ADR-003 attachments]`
- **BK-2 — Book = the WORK; copies are assets (⚠ INTENDED).** A book exists independently of ownership
  (0..n per-format assets; TOC-only entries are first-class). Each asset carries its own **native position**
  (page · epub location · audio timestamp); physical/braille assets hold a manually-fed position. `[INTENT B2]`
- **BK-3 — Unified progress is derived (⚠ INTENDED).** Book-level progress derives from asset positions
  through the cross-format mapping under the conflict rule (BK-8) — never hand-set as a separate truth.
  ⚠ Supersedes the FACT columns `books.current_page`/`progress` (single-position model) — reconcile in the
  ADR-002 amendment. `[INTENT B2/B16; FACT: L2419-2420]`
- **BK-4 — Cross-format mapping is AUTOMATIC, and honest when absent (⚠ INTENDED).** Positions map between
  formats via transcription + TOC-anchor matching near the stopped point — **never manual calibration** (it
  would break Books as the sole tool). When the mapping is pending/failed/unavailable, the UI shows the
  **native position + an explicit "not synced yet" state** — a mapped position is NEVER guessed (fail loud).
  `[INTENT B4; Transform obligation 2]`
- **BK-5 — Annotations anchor to the WORK (⚠ INTENDED).** Bookmarks, highlights, and quotes are normalized via
  the mapping and visible from every asset ("a bookmark at audiobook min 52 appears on the mapped PDF page").
  Under an unsynced mapping they surface at native position with the BK-4 state. `[INTENT B14]`
- **BK-6 — Three annotation natures (⚠ INTENDED).** **Highlights** are deliberately light span markers in
  digital content — no notes, no inter-links. **Bookmarks** (position markers) and **quotes** (words that
  talked with the reader) take notes via the `pages` polymorphic pattern and inter-link with each other
  (bookmark↔quote). Quotes are stored per book. `[INTENT B5/B13]`
- **BK-7 — Quotes travel; toggles govern (⚠ INTENDED).** A personalizable **quote-embed** field exists across
  the whole Notes/Pages system; availability is toggleable globally and per book — **per-book overrides
  global** `[INTERP: Transform obligation 5]`. Embeds reference the stored quote (never copy it). `[INTENT B13]`
- **BK-8 — Position/progress clashes: ASK by default, RULE if set (⚠ INTENDED).** Any clash between sources
  (assets, photo capture) surfaces to the user in context; the user MAY preset a resolution rule — chosen
  source of truth · "last one valid" · "photo valid" — which then resolves automatically. `[INTENT B16a]`
- **BK-9 — TOC ≠ syllabus (⚠ INTENDED).** The TOC is a first-class Books feature, usable before owning any
  copy; entry = manual OR ISBN/metadata lookup (both deliverables). Syllabus/schedule belong to Education;
  they meet only through the partition (BK-13). Chapters stay a flat list `[INTERP: nested sections not
  requested]`. `[INTENT B8; FACT: book_chapters L2445-2469]`
- **BK-10 — Reading sessions are Books' own entity, mode-adaptive (⚠ INTENDED).** Never a `study_session`
  reuse. Manual (physical/braille): time, pages read, where the user stopped. Digital/audio: granular position
  + statistics. **Page-photo capture** (optional): the photo is processed for position AND **stored encrypted
  as a visual reading journal** — attached to the session and surfaced in the daily Journal. The Study Planner
  consumes sessions; Gamification/statistics read them. `[INTENT B10 + B10-confirm + B16b]`
- **BK-11 — Plans are adaptive and user-arranged (⚠ INTENDED).** A plan covers one or many books — the user
  chooses **sequenced** (A then B) or **parallel** (quota split). Goals are manual or **auto-calculated to a
  target** (a date · weekday · day-of-month). Missed day/week/month quotas trigger **recalculation** — the
  plan reshapes and proposes how to make up, never silently drops the target. Pre-Calendar, auto-goals =
  arithmetic over days-until-target; Calendar-slot reconciliation (slots preset in Routines) renders visibly
  stubbed. `[INTENT B9/B15; Transform obligation 4]`
- **BK-12 — Books owns reading plans; consumers consume (⚠ INTENDED).** The Study Planner plans study life at
  another altitude and CONSUMES Books' plans/deadlines/sessions — it never writes them. The Calendar entity
  reconciles; Books handles only its own end. `[INTENT B6]`
- **BK-13 — The Education partition is read-across, junction-linked (⚠ INTENDED, immature).** `book_subjects`
  (many-to-many) + the Books→Education API: Education reads books-per-subject + pace-status vs next
  class/assessment; Books reads `subject_schedules` + assessment dates to pace the student AHEAD. No direct
  cross-module table access (§6). `[INTENT B7]`
- **BK-14 — Books' governing principle (⚠ INTENDED).** The ZK core is untouched by integrations. TTS,
  transcription, ISBN/metadata lookup, and photo OCR are **opt-in**: the user is informed (consent step),
  the user owns the risk, the OS provides the safety net. Every integration has a manual fallback path.
  `[INTENT B3/B8; candidate constitution amendment — joins the Projects-surfaced extension-model principle]`
- **BK-15 — The Reader is core and in-app (⚠ INTENDED).** One surface, three modes (read · listen — including
  TTS-converted files · annotate live in all modes), on all 3 platforms; files never leave the encrypted
  store to be read. Auto-session tracking. `[INTENT B3/B12]`
- **BK-16 — Classification via tags, prose via pages (⚠ INTENDED).** Publisher/genre/category are shared
  scoped tags (grouping + visualization), not columns; summary + key-takeaways are notes elements with
  dedicated per-type UIs; skill/purpose links are owned by Skills/Purposes. The book row stays lean.
  ⚠ Supersedes FACT columns `books.genre`/`tags` — shared-tags migration in the amendment. `[INTENT B11]`
- **BK-17 — Defaults before personalization; sparse is normal.** Every view ships a default; TOC-only books,
  copy-less books, unsynced mappings, and empty shelves render gracefully and invite increments (anti-lost).
  `[INTENT B12]`
- **BK-18 — Local-first.** Every write (position, annotation, session, plan) succeeds locally first; sync is
  LWW per entity; files ride the attachment pipeline. `[FACT: LF-2; ADR-003]`

## Validation & edge cases
- FACT CHECKs today: `format`{physical,ebook,audiobook} · `status`{want_to_read,reading,completed,dropped} ·
  `rating` 1-5 · `progress` 0-100 · `UNIQUE(book_id, chapter_number)`. `[FACT: L2414-2423, L2468]`
  ⚠ `books.format` (single) is superseded by per-asset formats {physical, pdf, epub, audiobook, braille,
  other} — reconcile in the amendment; `ebook` splits into pdf/epub. `[INTENT B2]`
- Braille asset = physical-like manual position semantics. `[INTERP: Transform obligation 3]`
- A book with no assets: plannable (TOC/page-count basis), no Reader affordance — companion/manual only once
  a physical copy exists. `[INTERP B2/B12]`
- Deleting an asset never deletes work-level annotations; annotations made in a deleted asset's native
  format remain, surfaced via the mapping or flagged native. `[INTERP B14]`
- A quota edited mid-plan re-runs the same recalculation path as a missed quota. `[INTERP B11]`
- Lookup declined / offline → manual entry path is always available (BK-14). `[INTENT B8]`
- A photo the OCR can't read → position falls back to manual entry; the photo still stores (it is journal
  content in its own right). `[INTERP B10/B16b]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Reading Hub | skeleton | "nothing being read — add a book / start a plan" + CTA | typed read error, retry | strip + quotas + statistics + alerts |
| Bookshelf (gallery/list/table) | skeleton | "your shelf is empty" + Add Book CTA | typed error, retry | grouped/filtered shelf incl. TOC-only entries |
| Book Hub (any tab) | skeleton | tab-specific empty + CTA (e.g. "no quotes yet") | typed error, retry | tab content, sparse-graceful |
| Reader — read/listen | opening + decrypting file | asset has no file → "add a copy" | decrypt/render/playback error → typed, never silent | reading with live annotation + position indicator |
| Cross-format position | mapping… | **"not synced yet" + native position** (BK-4) | transcription failed → same state + retry via integration consent | mapped position shown, source labeled |
| Companion mode | — | fresh session (timer at 0) | photo OCR fail → manual entry fallback | session logged: time, pages, stop-point, photos |
| Add Book wizard | lookup querying | manual blank form | lookup error/declined consent → manual path stays open | book (+TOC) registered |
| Plan wizard / per-plan | computing distribution | "no plans — create one" | validation (target in past, zero quota) inline | plan live: distribution + projection |
| Quota recalculation | recomputing | — | cannot reach target by date → flagged proposal (extend date / raise quota), never silent | reshaped plan + make-up path |
| All Quotes library | skeleton | "no quotes captured yet" | typed error, retry | grouped, searchable, inter-links + embed locations |
| Conflict prompt (BK-8) | — | — | unresolved conflict blocks unified progress (flagged, not guessed) | resolved by answer or preset rule |

## Failure behavior (fail loud — constitution §5)
- A pending/failed mapping is a visible state, never an approximated position (BK-4). `[INTENT]`
- Unresolvable progress conflict → unified progress flags "conflicted" rather than showing either value as
  truth (BK-8). `[INTENT B16a]`
- Integration failures (TTS, transcription, lookup, OCR) surface typed errors + the manual fallback; they
  never silently degrade to a server-side path (BK-14). `[FACT: ZK-1]`
- File decrypt/R2 errors are typed; a broken file never renders as an empty book. `[INTERP; ADR-003]`
- Recalculation that cannot satisfy the target proposes options — it never silently rewrites the goal (BK-11).
  `[INTENT B9]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**The FACT base is 2 tables + types; the module is essentially INTENDED** (second-largest surface after
Education): `book_assets` · `book_bookmarks`/`book_highlights`/`book_quotes` · `reading_sessions` (+photo
attachments) · `reading_plans` (+plan↔books arrangement) · `book_subjects` · mapping/anchor data · quote-embed
editor block (Notes & Pages side) · `entity_links` new entity types · format + progress + tags reconciliations
on the FACT columns. Design passes required: **cross-format mapping** (transcription/TOC anchors) and the
**Books governing principle** (joins the extension-model constitution amendment). INTENDED-immature: Education
partition pacing · Calendar-slot reconciliation. Live invariants today: BK-1 (schema `[E]` split), BK-18,
`UNIQUE(book_id, chapter_number)`. `[FACT: ADR-002 L2409-2469; INTENT: intake]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
