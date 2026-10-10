# Envision — fe-codec-canvas-reader (#9, the Canvas: Reader shell)

> **Status: APPROVED (Victor, 2026-10-09).** The §3.75 Envision Gate FIRED (interpretation.md §Envision — a mechanical
> doc test, not a decision). Greybox built + rendered across the matrix; EC-1…EC-15 approved after one review round
> (Victor's 3 additions folded: real icons · summary + TOC · many annotations anchored book→chapter→page→line). The
> 4 open decisions resolved — **3 doc-fixed, 1 Victor's call** (below). Decomposition (Step 2) follows
> [FACT: entity-delivery-flow.md:129-132].

## Resolved decisions

1. **Book summary → a book-level Notes page** (`entity_type='book'`), per-type UI; **NO schema column** — doc-fixed:
   `conventions.md:20` ("never inline columns"), `contract.md:38`, `business-rules.md:81`, `_registry.ts:89`. The
   Reader consumes it via the Notes composition. _(Adding a `summary` column is doc-forbidden.)_
2. **Annotation anchor → display-resolve against the TOC + honest native position** — doc-fixed: `conventions.md:6-8`
   ("the work is the anchor · only native positions on assets · positions are honest"), `structure-data.md:73`
   ("mapping anchors point at [the TOC], never duplicate it"). The Reader RENDERS a resolved book→chapter→page→line
   (chapter derived from the TOC page-range); cross-format mapping stays the deferred design pass (BK-4). _(Structured
   `chapter_id`/`page`/`line` columns would violate "never duplicate the TOC" — out of scope + doc-contrary.)_
3. **Middle-dot → keep for genuine location breadcrumbs** (the rail's "Ch. 4 · p. 56 · line 12"), **plain-language
   header context** ("Chapter 4 of 10, page 56") — no repo rule exists (VoiceCopy lints only overclaims/dead-ends);
   resolved by the flow-session Envision precedent (header meta-strings dropped, location content kept). Applied.
4. **Accent → BOTH** (Victor's call): oxblood carries the live reading signal (progress · listen · current chapter ·
   current highlight) **AND** the annotation nature-markers — not concentrated. The mute-glyph variant is dropped.

## Greybox

A THROWAWAY composition mock (deleted after the gate) — the SHIPPED `@vida/ui` primitives (`Card`, `Button`,
`EmptyState`, `SyncStatus`, `HonestProgress`, `Text`/`View`) + fake data, envisioning the Reader whole. NOT the real
`CanvasReader` (it doesn't exist yet) — intent-fidelity (layout / affordance / state), not pixel-perfect. Inherits
the resolved shell patterns (semantic scale, title-hero header `gap:$16`, progress = a `HonestProgress` BAR, DIRECT
semantic tokens, degrade-never-crash) so it avoided flow-session's round-1 typography churn.

- **File:** `packages/ui/src/__envision__/canvas-reader.stories.tsx` (title `__envision__/CanvasReader (greybox)`).
- **Harness:** the @vida/ui Storybook Visual-Gate surface — preset × mode × density toolbar globals; 390/1440 viewport.
- **Concept:** *"the reading column with a living margin."* Text is the hero (one centered serif measure); annotations
  live in a margin rail aligned to the text (drops below the column at 375); listen is a slim persistent control.
- **Stories (screen × state):** `ReaderReading` (full canvas) · `SelectionActions` (the birth-an-annotation action
  set + the per-nature affordance contrast) · `MarginRail` (the 3 natures) · `ListenStates` (idle/playing/unavailable)
  · `ReaderStates` (loading · empty · access-unavailable · error · not-synced · photo-pending).
- **Screenshots:** `/tmp/vg/reader/` — Brave (Playwright/CDP), reader·light/dark + editorial·light + quietDesk·dark @1440,
  reader·light @390 reflow, selection/rail/listen/states. Attached at review.

**What the greybox resolved / confirmed:**
- **The living-margin layout reads** across all 3 presets — text-as-hero + the rail aligned beside it; the oxblood reader
  accent carries the progress bar, the listen button, the annotation glyphs, and the inline highlight mark.
- **IR-1 is a VISIBLE affordance rule, not just a backend throw:** the greybox shows a highlight with **no** link/add-note
  action next to a bookmark & quote that have both — exactly the thing the Visual Gate must later enforce.
- **The honest states all render** — loading skeleton · teaching empty (`EmptyState` "Nothing to read yet") ·
  access-unavailable **distinct from empty** (a physical copy) · calm muted error · not-synced position stated in the
  header (IR-3) · photo-saved-text-pending (IR-4, a `status="calm"` Card).
- **Listen degrades honestly** (IR-7): idle / playing-with-progress / **"Listening isn't available on this device"** — a
  calm state, never an error.

**Open refinements surfaced by the render (for the review — these become EC decisions, not build-phase guesses):**
1. **Context line uses a middle dot** ("Book Three · Chapter 4") and the listen label ("Text-to-speech · 0:00/12:40") —
   `frontend-design` flags the middle-dot meta-string as a generic tell. Options: keep the dot for a *location*
   breadcrumb (arguably legit), or plain language ("Chapter 4, Book Three").
2. **Accent is spent in ~4 places** (progress bar · listen button · rail nature-glyphs · inline highlight). The
   "boldness in one place" principle suggests concentrating it — e.g. mute the rail glyphs so the accent reads as
   *the current reading signal*. A pin-this call.
3. **Greybox stand-ins** (not real-build concerns): the "Selecting a passage — turn it into…" caption is a greybox
   label, not product copy; the real affordance is a selection popover.

**Round-2 (Victor review, folded):** real SVG play/pause icons (no emoji) · a Contents panel (book summary + a real
TOC, many chapters) · many annotations of each nature, grouped by chapter, each anchored book→chapter→page→line.

**Two SCHEMA decisions the round-2 additions surfaced (owed at the gate — No-Guessing, not build-phase guesses):**
- **A · Book summary has no column** (IR-9). Home it as (a) a **book-level Notes page** (`entity_type='book'`, the
  projects vision/mission precedent — zero schema change, this unit can consume it), or (b) a **`summary` column on
  `books`** (a backend schema amendment — separate DB unit). Greybox shows a summary; its source is this decision.
- **B · Annotation anchor is `book_id` + free-text `position` only** (IR-8); chapter is DERIVED from the TOC page-range,
  page/line live inside `position`. The Reader can **display** a resolved book→chapter→page→line (this unit, no schema
  change) — but **hard structured `chapter_id`/`page`/`line` columns** = a backend schema amendment (separate unit).
  Confirm scope: display-resolve now (frontend) vs structured anchoring (backend follow-up).

## Anchored checkpoints (PROPOSED — pin/edit at review)

| EC | Screen / state | Assertion (the vision) | Type | Slice(s) | Gate assertion |
|----|----------------|------------------------|------|----------|----------------|
| EC-1 | Reading canvas | the surface reads as **a reading column with a living margin** — text is the hero (one centered serif measure), annotations in a rail aligned to the text, listen a slim persistent control | structural | S-frame · S-rail | Visual-Gate MUST |
| EC-2 | Header | **title-hero**: serif `$display` title carries alone + ONE quiet context line + a **`HonestProgress` reading-% BAR** + `SyncStatus` + `⋯`; NO eyebrow, NO middle-dot meta-string | structural | S-frame | Visual-Gate MUST |
| EC-3 | Reading column | serif **measured** body (<80ch, generous leading); a **highlighted span** reads as a marked inline span within the text | structural | S-content | Visual-Gate MUST |
| EC-4 | Selection | selecting a passage offers **Highlight · Quote · Bookmark** (+ Listen-from-here) — the way an annotation is born | structural | S-selection | Visual-Gate MUST |
| EC-5 | Annotation affordances | **IR-1: a HIGHLIGHT shows NO link / add-note affordance**; a bookmark & a quote show both. The gate FAILS if a highlight renders a link/note action | structural | S-rail | Visual-Gate MUST |
| EC-6 | Margin rail | the **three natures are visually distinct** (highlight · bookmark · quote), each with its location; ordered chronologically | structural | S-rail | Visual-Gate MUST |
| EC-7 | Listen | **idle / playing / unavailable** states; unavailable reads as a **calm** "Listening isn't available on this device" — never an error (IR-7) | structural | S-listen | Visual-Gate MUST |
| EC-8 | Reader states | **loading** skeleton · **empty** teaching invitation · **access-unavailable distinct from empty** (physical copy) · **calm error** · **not-synced position** stated honestly (IR-3) · **photo-saved-text-pending** (IR-4) | structural | S-states | Visual-Gate MUST |
| EC-9 | 375 → 1440 | the margin rail **drops below** the reading column at 375; header + listen bar stack; **no 375 overflow**; content centered on desktop | structural | S-frame | Visual-Gate MUST |
| EC-10 | all · dark | dark is **designed** (not inverted); **preset accent flips** (editorial blue / reader oxblood / quietDesk olive) on the progress bar + listen + annotation markers; **full-matrix AA** | structural | S-frame | Visual-Gate MUST |
| EC-11 | all text | typography = the **semantic scale, NO arbitrary px**; serif `$display` title, consistent hierarchy (heading/body/small/caption); **accent (oxblood) carries BOTH the live reading signal (progress · listen · current chapter · current highlight) AND the annotation nature-markers** (Victor's call — not concentrated) | structural | S-frame · S-content · S-rail | Visual-Gate MUST |
| EC-12 | Annotate / listen | selecting → annotating feels **immediate + in-place** (not a buried form); listen starts without a jarring reload; reduced-motion respected | feel | S-selection · S-listen | live Visual Gate (feel) |
| EC-13 | Contents panel | a toggleable **Contents** panel: a book **summary** ("About") + a real **TOC** that scales to many chapters — chapter title + page range + completion ✓ + the **current chapter** marked; jump-to-chapter | structural | S-contents | Visual-Gate MUST |
| EC-14 | Annotation anchor | every annotation shows its **resolved location book→chapter→page→line**; the rail **scales to many** of each nature (grouped by chapter, with counts) | structural | S-rail | Visual-Gate MUST |
| EC-15 | Controls | listen + affordance controls use **real icons (inline SVG / icon set), never emoji** | structural | S-listen · S-selection | Visual-Gate MUST |

> Slice ids (S-frame · S-content · S-contents · S-rail · S-selection · S-listen · S-states) are PROPOSED names for Step-2
> decomposition — the coverage check maps every `structural` EC to ≥1 slice there.

## Approval

Greybox + checkpoints (EC-1…EC-15) **approved by Victor on 2026-10-09**, after one review round (his 3 additions
folded: real icons · summary + a real TOC · many annotations anchored book→chapter→page→line) + the 4 decisions
resolved (3 doc-fixed, accent = BOTH per Victor). (blocking — decomposition follows.) The greybox
`packages/ui/src/__envision__/canvas-reader.stories.tsx` is retired after the gate; the durable record = this file +
the `/tmp/vg/reader/` screenshots.
