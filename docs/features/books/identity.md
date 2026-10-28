<!-- Identity — features/books · /documentation Phase 2 · sources: ADR-002 §Books · learning.ts · CLAUDE.md §7 · docs/intake/books.md -->

# Identity — Books (level: Feature / own module)

**What it is.** The OS's **reading Universe**: one module that consolidates the entire reading life — the
**plan** (what to read, at what pace, by when) and the **experience** (reading/listening inside the platform,
across every format: physical · pdf · epub · audiobook · braille · other) — plus everything captured along the
way: highlights, bookmarks, quotes, notes, photos, sessions, statistics. A **partition of its Universe serves
Learning** through the Books↔Education API (the Tasks↔Projects / Tasks↔Education pattern).
`[INTENT: reframe 2026-07-03; FACT: ADR-002 L2409-2469 (the 2-table base)]`

**The desire behind it.** Reading today is scattered — the plan in one place, the PDF in another app, the
audiobook in a third, notes nowhere. v1's Books "was the worst version ever — not even solid on the points it
was supposed to deliver." The user wants **one safe, distraction-free companion** that is the _sole tool_ he
needs: helping him truly learn **and enjoy** reading — plan a book (or several), read it in whatever format he
owns, switch formats without losing his place, capture what talked to him, keep pace with flexible quotas that
reshape when life happens, and — as a student — stay **ahead** of classes and assessments.
`[INTENT: Victor 2026-07-03, verbatim-derived]`

**Scope — a deliberate v2 reframe (module extraction).** `[INTENT: B1–B16]`

- **FACT base (2 tables today):** `books` + `book_chapters`. `[FACT: ADR-002 L2409-2469; schema.ts L641-674]`
- **⚠ INTENDED model:** book = the **WORK**; per-format **assets/copies** (0..n — a book can exist with none,
  as a wish + TOC) each with native position; **unified progress** at work level via automatic cross-format
  mapping (transcription + TOC anchors — never manual calibration).
- **Annotations** anchor to the WORK, visible from every format: highlights (deliberately light) · bookmarks ·
  quotes (first-class, per book, embeddable in any note platform-wide).
- **Reading sessions** (a base `sessions` `sub_type='reading'` + a Books-owned 1:1 extension keyed `session_id`,
  ADR-004 S1 — mode-adaptive capture rides the extension, the shared timer/scheduling rides the base) + **page-photo
  capture** for physical books — the photos form a **visual reading journal** feeding the daily Journal.
- **Adaptive Quota Planner:** goals manual or auto-calculated to a target date (date · weekday · day-of-month);
  quotas over free time; **recalculates on missed quotas**; single- or multi-book plans (sequenced | parallel,
  user-arranged). The Books end of the Calendar-entity reconciliation _(forward dep)_.
- **In-app Reader:** one surface, three modes — read (pdf/epub) · listen (audiobook + TTS-converted) ·
  annotate live — plus the **physical companion mode** (timer, page entry, photo, quota ring).
- **Education partition (⚠ immature):** `book_subjects` + pace-vs-schedule/assessments, so the student paces
  ahead of classes.

**What it is NOT.** `[INTENT: intake Transform obligation 1]`

- **Not a Learning sub-extension.** A standalone module; Learning consumes a partition (B1).
- **Not the syllabus.** The v1 conflation is undone: syllabus/schedule belong to **Education**; the TOC belongs
  to Books (B8). They meet only through the partition.
- **Not the Study Planner.** The Study Planner plans _study life_ from the whole subject intake at another
  altitude; Books owns _reading_ plans. The Planner consumes, never owns (B6).
- **Not a store or social/community reading app.** No purchases, no feeds, no sharing; the ISBN/metadata lookup
  is a governed convenience (a device-mediated **public-reference** fetch of the Books ISBN dataset — ADR-014
  X1/X2/X3 under `external_in_ok`), not a marketplace (B8/B11).
- **Not a server-side pipeline.** Files are client-encrypted (R2 blobs); TTS/transcription/lookup/OCR run under
  Books' governing principle — each model call splits to ADR-015 (X11), runs `on_device`/`cloud` (AI1), and bounds
  the untrusted OCR'd page's provenance (AI5); opt-in, user owns the risk, OS provides the safety net (B3). **Not an
  AI4 agent** (scoped model calls, not a tool-envelope). `[FACT: ZK-1; ADR-014 X11; ADR-015 AI1/AI5]`
- **Not rigid.** A book with zero copies, a TOC-only entry, a physical-only reader — every state is first-class
  and renders gracefully (anti-lost). `[INTENT B12]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
