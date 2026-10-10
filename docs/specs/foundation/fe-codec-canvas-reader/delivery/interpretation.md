# Interpretation — fe-codec-canvas-reader (CODEC · Canvas: Reader, unit #9, LIF-206)

> Entity Delivery Flow ② · Step 1 (make the implicit explicit before decomposing). No-Guessing: every
> claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]`. Baseline (Step 0) confirmed the
> `@vida/ui` layer doc + `docs/modules/books/current-*` + `docs/ui/token-pipeline/current-*` current.
>
> **The entity.** The CODEC **Canvas: Reader** — the long-form **read · listen · annotate** surface in
> `@vida/ui`. The 5th archetype shell after Collection #4 · Dashboard #5 · Entity #6 · Flow/Session #11.
> `[FACT: .claude/tasks/fe-codec-canvas-reader.md:12]`

---

## DEPENDENCIES — every upstream

| Upstream | What it gives the Reader | Cite |
|---|---|---|
| `@vida/ui` primitives | `Card` (content/annotation frames) · `Button` (affordances) · `Text`/`View` | `[FACT: packages/ui/src/components/flow-session-view.tsx:1-8]` |
| `@vida/ui` pattern-kit | `EmptyState` (teaching empty) · `SyncStatus`/`HonestProgress` (save + read progress) · `useReducedMotion` | `[FACT: packages/ui/src/CLAUDE.md "fe-codec-patterns"; hooks/use-reduced-motion.ts]` |
| `internal/data-view` | `ViewState` union + `warnMissingName` (per-region state + a11y-name guard) | `[FACT: packages/ui/src/components/flow-session-view.tsx:9]` |
| Theme / preset tokens | the **reader preset** (serif body, oxblood accent) = the editorial reading voice this canvas is the archetype consumer of | `[FACT: packages/ui/src/provider.tsx; CLAUDE.md "reader/quietDesk set"]` |
| Books reading domain (**CONSUMED, never imported** — @vida/ui is Tamagui-only) | `openReader(assetId) → ReaderContext {file, sessionId, position}` · `startSession`/`endSession` · `attachPhoto` · `listAnnotations(bookId)` (unions highlight/bookmark/quote) · `listQuotes` · `convertToSpeech` (TTS) · `transcribeForMapping` · `getStatistics` | `[FACT: packages/core/src/services/books/service.ts:875,764,800,821,687,703,1220,1224,854]` |
| `book_chapters` TOC (**CONSUMED**) | the flat TOC: `title` [E] · `chapter_number` · `start_page`/`end_page` · `is_completed`/`completed_at` · `sort_order` — the Reader's Contents panel + chapter navigation + the chapter-derivation source | `[FACT: packages/core/src/db/schema/books.ts:66-84; types learning.ts:449-458]` |
| `sessions` sub-type `reading` | the reading session the canvas opens against (base `sessions` + `reading_sessions` 1:1) | `[FACT: docs/modules/books/current-business-rules.md:157 (BR-BK-S6-2)]` |

**The seam is pre-declared by the backend.** `openReader` returns *only the access outcome*; its own comment
says **"The decrypted bytes stream to the P6 Reader chrome; the service face returns only the access outcome"**
and BR-BK-S6-6 names the deferred piece **"the read/listen/annotate chrome"** — i.e. this unit.
`[FACT: packages/core/src/services/books/service.ts:177; docs/modules/books/current-business-rules.md:174-177 (BR-BK-S6-6)]`

---

## NEEDS — preconditions to function

1. **No `@vida/core`/`@vida/types` import.** All types LOCAL (the `ViewState`-local precedent); the shell is
   **presentational, state-as-prop (BR-2)** — the app derives state + threads it, the shell **emits intents,
   never writes**. `[FACT: flow-session-view.tsx:18-21,74-77]`
2. **Non-generic → React-19 ref-as-prop, no `forwardRef`.** `[FACT: flow-session-view.tsx:21,185]`
3. **Content must arrive already decrypted + resolved.** The decrypt/auto-session/position orchestration is
   `openReader`'s (app-side); the shell receives the *resolved* content + position + sessionId as props. The
   shell renders the long-form body through a **slot** (format-agnostic — the `renderStage` precedent), it does
   not parse a book asset. `[FACT: service.ts:875-894]`
4. **`file` can be unavailable.** `ReaderContext.file` is `{status:'attachment-unavailable'}` for a physical
   book or an absent attachment port → the shell needs an **access-unavailable state** distinct from empty.
   `[FACT: service.ts:878-889]`
5. **Listen (TTS) may be unavailable.** `convertToSpeech`/`transcribeForMapping` are deny-safe `ai?` calls;
   absent/denied ⇒ `ai-unavailable` — a **normal state, not an error**. The listen affordance must degrade.
   `[FACT: service.ts:1196; docs/modules/books/current-business-rules.md:166-168 (BR-BK-S6-4)]`
6. **Reduced-motion** must gate any audio-scrub / page-turn / highlight animation (the codec primitive).
   `[FACT: packages/ui/src/hooks/use-reduced-motion.ts]`

---

## ORGANIZATION — OWNS vs CONSUMES vs DELEGATES

- **OWNS:** the reading-canvas layout (title-hero header · long-form content pane · annotation layer ·
  listen control · an annotations rail) · the per-region terminal states (loading/empty/error/**access-unavailable**)
  · the affordance intent emission (highlight · bookmark · quote · annotate-note · listen play/pause · end-session)
  · reduced-motion behaviour.
- **CONSUMES:** `@vida/ui` primitives + pattern-kit + theme (reader preset) tokens.
- **DELEGATES:** the long-form body itself → a consumer `renderContent` slot (format-agnostic) ·
  the actual reads/writes (`openReader`, annotation creation, TTS) → the app + Books service ·
  position mapping → `getMappedPosition` (M1 = always not-synced).

---

## IMPLICIT RULES — surfaced hidden invariants

- **IR-1 · Highlights are NEVER linkable.** A link/annotate-note affordance must be offered on **bookmarks &
  quotes only** — never a highlight (the service throws `AnnotationNotLinkableError`; the registry excludes
  `book_highlight` as a link target). The Reader UI must not render a "link"/"add note" action on a highlight.
  `[FACT: docs/modules/books/current-business-rules.md:98-102,112-118 (BR-BK-S4-1/5/6)]`
- **IR-2 · Three distinct annotation natures.** highlight (digital span, work-anchored) · bookmark
  (work-anchored position) · quote (first-class per book). `listAnnotations(bookId)` unions all three ordered by
  `created_at`; the annotations rail must distinguish them (different affordances per IR-1).
  `[FACT: current-business-rules.md:98-119 (BR-BK-S4-1..7)]`
- **IR-3 · Position is honestly not-synced cross-format at M1.** `getMappedPosition` **always** returns
  `{status:'not-synced'}`; `openReader` resolves only the asset's OWN position (synced-to-self or not-synced).
  The Reader must **render a not-synced position state honestly**, never fake a cross-format location.
  `[FACT: service.ts:589-599,890-894; current-business-rules.md:81-84 (BR-BK-S3-5)]`
- **IR-4 · Annotate-by-photo always keeps the photo.** `attachPhoto` stores the photo independently of OCR; an
  OCR failure never loses it. The photo-annotate affordance degrades to "photo saved, text pending".
  `[FACT: current-business-rules.md:166-168 (BR-BK-S6-4)]`
- **IR-5 · End-of-session emits a measurement signal.** The measurement/effect fan-out rides `endSession`
  (reading completion). The shell **emits an end-session intent**; the app fires the effect — the Reader renders
  no effect (ADR-004 backend; the flow-session precedent). `[FACT: service.ts:1199; flow-session-view.tsx:18-19]`
- **IR-6 · Title-hero header rhythm.** serif `$display` title carries alone (no eyebrow, no dot-meta) · ONE
  quiet `$small` muted context line · `gap:'$16'` title→meta · a quantity (reading %) is a **separate
  `HonestProgress` bar**, never crammed into the subtitle. `[FACT: flow-session-view.tsx:97,217-238; CLAUDE.md "fix-entity-view-header"]`
- **IR-7 · Listen ≠ audiobook playback.** M1 "listen" = **TTS of the decrypted text** (`convertToSpeech`), not
  a native audio-file player; audiobook-to-text is `transcribeForMapping` (mapping, deferred). The listen
  control is a TTS play/pause emitting intents, degrading on `ai-unavailable`. `[FACT: service.ts:1196,1220,1224]`
- **IR-8 · Annotation location = `book_id` + free-text `position`; chapter is DERIVED.** All three natures store
  only `book_id` (work anchor) + `position` (nullable TEXT, "page/location/timestamp, format-interpreted"); highlights
  also carry `asset_id`. There is **NO structured `chapter_id` / `page` / `line` column.** So the "book→chapter→page→line"
  anchor Victor wants is **rendered by the Reader by RESOLVING** `position` (page/CFI) against the `book_chapters`
  page-ranges (chapter) — not read from columns. ⚠ Hard structured line-level anchoring would be a **schema amendment
  (backend)**, out of this ② unit. `[FACT: schema/books.ts:96,108,126,140; service.ts:589 getMappedPosition]`
- **IR-9 · A book has NO `summary` column.** `books` has `title`/`author`/`isbn`/`status`/`total_pages`/`progress`/
  `rating`/`review`/`cover_url` — **no summary/description/synopsis.** A book "summary" therefore needs a home: a
  **book-level Notes page** (`entity_type='book'`, the projects vision/mission precedent — zero schema change, composes
  the Notes system Books already uses) OR a schema amendment. ⚠ Decision owed at the gate. `[FACT: schema/books.ts:43-62]`
- **IR-10 · N-per-nature.** Highlights, bookmarks, quotes are each many-per-book (own rows, `book_id`-indexed).
  The rail must scale — group by chapter, show counts — not assume a handful. `[FACT: schema/books.ts:102-144]`

---

## Envision §3.75 determination (for Step 1.5)

**Trigger test:** *"Is there a user affordance whose UI answer isn't already obvious from an existing shipped
surface?"* → **FIRE.** Multiple affordances have no shipped answer: *how does a user select a passage and turn
it into a highlight vs a quote? where does a bookmark land? how is the annotations rail laid out against the
text? what does the listen control look like, and how does it read as unavailable? how is a not-synced position
shown?* No shipped surface answers these (the view renderers are read-only lenses; flow-session is staged, not
long-form). This is a **novel interaction surface** → Envision greybox + human approval is required before
Decomposition. `[FACT: entity-delivery-flow.md:104-107]`
