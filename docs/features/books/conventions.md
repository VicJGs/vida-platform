<!-- Conventions — features/books · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 -->

# Conventions — Books (level: Feature / own module)

## How to build here

- **The work is the anchor.** Annotations, quotes, plans, sessions, subjects — everything attaches to the
  BOOK (the work); only native positions and files live on assets (BK-2/BK-5). `[INTENT B2/B14]`
- **Positions are honest.** Show a mapped position only when the mapping is computed; otherwise native
  position + "not synced yet". Never approximate, never offer manual calibration as the primary path
  (BK-4). `[INTENT B4]`
- **Derive, don't store, progress.** Unified progress computes from asset positions under the conflict rule
  (BK-3/BK-8) — the live `books.progress` is a nullable override that derives (`NULL ⇒ derive`, M3), never a
  `NOT NULL DEFAULT 0` counter; pace-status computes from Education schedule data via the partition (BK-13). `[INTENT;
ADR-011 M3]`
- **Consent before any integration.** ISBN lookup = device-mediated public-reference (ADR-014 X1/X2/X3/X5); TTS,
  transcription, OCR = model calls split to ADR-015 (X11, `on_device`/`cloud` AI1, untrusted-page provenance AI5,
  `source=ai` AI6) — never AI4 agents; consent step first (the X4/AI1 gate), typed refusal path, manual fallback
  always callable (BK-14). `[INTENT B3/B8; ADR-014 X1/X2/X3/X5/X11; ADR-015 AI1/AI5]`
- **Tags for classification, pages for prose.** Publisher/genre/category = **`entity_tags`** (SP1, Books-scoped);
  summary/key-takeaways/notes = `pages` with their per-type UIs; never inline columns for either (retire inline
  `books.tags`/`genre`, BK-16). `[INTENT B11; ADR-006 SP1]`
- **Quotes are referenced, never copied.** The quote-embed block reads the stored quote; toggles checked at
  render (per-book overrides global, BK-7). `[INTENT B13]`
- **Sessions through the session entity.** All reading activity (manual, digital, audio, photo-assisted)
  logs a `reading_session` = a base `sessions` `sub_type='reading'` + the Books extension (`session_id`, S1) — never a
  standalone table, and never a `study_session` reuse (`reading` ≠ `study`; distinct sub-types, BK-10). `[INTENT
B10-confirm; ADR-004 S1]`
- **Plans reshape, never silently rewrite.** Missed quotas → recalculation + make-up proposal; unreachable
  targets → options surfaced (BK-11). `[INTENT B9]`
- **Ship defaults with every personalizable view; render sparse data gracefully.** TOC-only and copy-less
  books are first-class states (BK-17). `[INTENT B12]`

## Naming & layout

- ⚠ INTENDED enums: asset `format` {physical, pdf, epub, audiobook, braille, other} · annotation types
  {highlight, bookmark, quote} · plan `arrangement` {sequenced, parallel} · goal {manual, auto} ·
  mapping state {synced, pending, failed} · conflict rule {ask, source_of_truth, last_valid, photo_valid}.
  `[INTENT B2/B5/B15/B16]`
- FACT enums today: `format`(3 — to be superseded), `status`{want_to_read, reading, completed, dropped}.
  `[FACT: ADR-002 L2414-2417]`
- Docs home: `docs/features/books/` (own module — extracted from `learning/`).
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans 0/1, JSON as TEXT, dates `YYYY-MM-DD`,
  minutes for durations, soft delete on parents, `_sync_*`; enums = unions + CHECK + Zod. `[FACT: CLAUDE.md]`

## Local landmines / "never do"

- **Never** link books to subjects through metadata JSON — the v1 `metadata.linked_courses` failure;
  `book_subjects` junction only (BK-13). `[FACT: v1 BookDetailPage L89-92]`
- **Never** conflate TOC with syllabus — the v1 conflation this reframe undoes (BK-9). `[INTENT B8]`
- **Never** hand-set unified progress or keep a second position truth (BK-3/BK-8). `[INTENT]`
- **Never** guess a mapped position past an uncomputed mapping (BK-4). `[INTENT]`
- **Never** put notes/inter-links on highlights — they are deliberately light (BK-6). `[INTENT B13]`
- **Never** let the Study Planner (or anything else) write reading plans — consumers consume (BK-12). `[INTENT B6]`
- **Never** run an integration without the consent step, or remove its manual fallback (BK-14). `[INTENT]`
- **Never** discard a captured page photo silently — it stores encrypted (journal content) even when OCR
  fails (BK-10/B16b). `[INTENT]`
- **Never** read Education tables directly — the partition API only (§6, BK-13). `[FACT: core §6]`
- **Never** route lookup/OCR/TTS/transcription through the server, or fold the model call into the connector —
  lookup is device-mediated public-reference (X1/X2/X3), the model calls split to ADR-015 (X11, on_device/BYO-key
  AI1), never an AI4 agent (BK-14). `[INTENT; ADR-014 X1/X11; ADR-015 AI1]`

## Completion checklist

- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
