# Slice-map — fe-codec-canvas-reader (#9, Canvas: Reader)

> Entity Delivery Flow ② · Step 2 (Decomposition Gate, **Decide-mode** — net-new shell; the backend is already
> shipped in `@vida/core` Books, so **every slice is `frontend`**). Each slice closes with a **blocking Visual Gate**
> (real browser, every state × light/dark × 375/768/1440 + a11y + its anchored EC MUSTs). No batching, no "owed."
> Pattern: the 5th archetype shell — presentational, state-as-prop (BR-2), LOCAL types (no `@vida/core` import),
> non-generic → React-19 ref-as-prop. Mirrors collection/dashboard/entity/flow-session.

## Slices (ordered)

| # | Slice | Plane | Home | Builds | EC MUSTs (Visual Gate) |
|---|-------|-------|------|--------|------------------------|
| **S1** | `CanvasReader` frame + reading column + states | frontend | `@vida/ui` | the shell skeleton: title-hero header (title · plain context · `HonestProgress` reading-% bar · `SyncStatus` slot · `⋯`) · the **living-margin layout** (Contents ∣ reading column ∣ rail — flexWrap, rail/panel stack at 375) · the **`renderContent` slot** (format-agnostic reading body) · the shell-owned terminal states (loading skeleton · teaching empty · calm error · **access-unavailable distinct from empty**) · the **not-synced position** line (IR-3) · region a11y (`warnMissingName`) | EC-1, EC-2, EC-3(column), EC-8, EC-9, EC-10, EC-11 |
| **S2** | Contents panel (summary + TOC) | frontend | `@vida/ui` | the toggleable **Contents** panel: a **summary** slot ("About") + a **TOC** that scales to many chapters (title · page ref · completion ✓ · **current chapter** marked) + `onJumpToChapter` intent | EC-13 |
| **S3** | Margin rail (annotations) | frontend | `@vida/ui` | the **living margin**: annotations **grouped by chapter**, N-per-nature, a count line, each row with a **resolved location** (Ch · page · line) + the **IR-1 affordance rule** (highlight → NO link/note; bookmark & quote → Add note + Link) + `onAddNote`/`onLinkAnnotation` intents | EC-5, EC-6, EC-14(display) |
| **S4** | Selection affordance | frontend | `@vida/ui` | the select-passage **action set** (Highlight · Quote · Bookmark · Listen-from-here) emitting intents + the **inline highlight mark** in the reading body | EC-4, EC-3(highlight mark) |
| **S5** | Listen control | frontend | `@vida/ui` | the slim persistent **listen bar**: idle / playing (`HonestProgress`) / **unavailable** (calm, IR-7) · **real SVG icons** (no emoji) · `onListenToggle` intent | EC-7, EC-15 |
| **S6** | apps/web Books↔Reader adapter | frontend | `apps/web` | **type + convention** (the sibling adapter precedent — collection S3 / dashboard S2 / entity S2): maps `ReaderContext`/`book`/`book_chapters`/`listAnnotations`/`convertToSpeech` → the `CanvasReader` props; **owns the display-resolve** (parse `position` + derive chapter from the TOC page-range → the EC-14 location) + **consumes the book summary Notes page**; binds intents to the service writes. Live `useReader` hook **deferred to the first consumer** (fe-books #36). | EC-14(resolve) — Verification Gate (not Visual: no new render) |

## Envision coverage check (every `structural` EC → ≥1 slice)

| EC | Assertion | Slice(s) |
|----|-----------|----------|
| EC-1 | living-margin layout | S1 (frame) + S2 + S3 |
| EC-2 | title-hero header | S1 |
| EC-3 | measured serif column + highlight mark | S1 (column) + S4 (mark) |
| EC-4 | selection action-set | S4 |
| EC-5 | IR-1 highlight has NO link/note | S3 |
| EC-6 | 3 distinct natures | S3 |
| EC-7 | listen states | S5 |
| EC-8 | honest terminal/access states | S1 |
| EC-9 | 375→1440 reflow | S1 (+ each region verified at 375) |
| EC-10 | designed dark + preset-accent flip + AA | every frontend slice's Visual Gate |
| EC-11 | semantic-scale type + accent on BOTH (signal + markers) | every slice |
| EC-13 | Contents panel (summary + TOC) | S2 |
| EC-14 | annotation anchor resolved + N-scale | S3 (display) + S6 (resolve) |
| EC-15 | real icons, not emoji | S5 (+ S4) |
| EC-12 | annotate/listen feel (feel-type) | live Visual Gate on S4/S5 (not a greybox MUST) |

**All 14 `structural` ECs map to ≥1 frontend slice. Coverage holds.** EC-12 is `feel` → deferred to the live per-slice
Visual Gate rows (S4/S5), never a greybox MUST.

## Per-slice gate ledger

| Slice | Gate | Status |
|-------|------|--------|
| S1 | Visual Gate (frame · states · 375 · dark × 3 presets · AA) | ✅ PASS (2026-10-09 — tsc 0 · eslint 0 · 9/9 · AA 0-fail incl warm-dark) |
| S2 | Visual Gate (TOC scale · completion · current · 375) | ✅ PASS (2026-10-09 — tsc 0 · eslint 0 · 16/16 · AA 0-fail incl warm-dark · 375 panel-stack + title word-wrap; Header flexWrap fix) |
| S3 | Visual Gate (IR-1 highlight-no-link · 3 natures · grouped · location · AA) | ⏳ |
| S4 | Visual Gate (action set · highlight mark · feel EC-12) | ⏳ |
| S5 | Visual Gate (3 listen states · SVG icons · feel EC-12) | ⏳ |
| S6 | Verification Gate (adapter unit tests · location-resolve · degrade-never-crash) | ⏳ |

## Notes
- **Backend = already shipped** (Books S1–S10). This unit consumes it; **no `@vida/core` change.** The two schema
  realities (summary = Notes page · anchor = display-resolve) are doc-fixed (envision.md §Resolved) — no DB amendment.
- **Boundary:** `@vida/ui` is Tamagui-only → S1–S5 hold LOCAL types; S6 (apps/web) is the only `@vida/core`↔UI crossing.
- **Deferred by design:** the live `useReader` data hook (first consumer fe-books #36); cross-format position mapping
  (BK-4 design pass); structured anchor columns (doc-contrary — would duplicate the TOC).
