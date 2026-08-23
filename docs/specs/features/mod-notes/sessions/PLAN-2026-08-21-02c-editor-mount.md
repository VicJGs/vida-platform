# PLAN: mod-notes ② · unit 02c — the note editor + autosave + `[[` picker (gate-1 SPEC)
Status: implemented      <!-- draft → approved(1) → approved(2) → implemented -->
Approval 1: Victor, 2026-08-21 — direction approved. G6 resolved: page-link `[[` picker ships firmly in ②c; the entity-link (`[[`→non-page-entity) variant is DEFERRED to ②d, with the `Candidate` type shaped forward-compat now.
Unit: MOD-notes increment ② (LIF-131, M1.1), sub-unit **②c — the note-detail editor: mount + autosave + title + `[[` wiki-link picker**. Profile: add-frontend-component.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Session: 2026-08-21-mod-notes-3 (②a data plane + ②b collection surface done+committed `6b72613`/`21f5e3b`; ②c is the FIRST authoring surface).

<!--
  FORWARD spec — §1–§4 DESCRIPTION, §5 executable PROMPT citing §1–§4. Gate-1 (Approval-1) artifact.
  ②c is the doc-fixed unit "editor + `[[` picker" (current-spec.md:9 · §9 MOD-notes ② · task file). It mounts the
  M1.0-built @vida/editor (UI-3) in the note-detail route, persists content to pages.content via the ②a data plane,
  makes the title editable, and adds the `[[` wiki-link picker. ②d = backlink/entity-link panels + page metadata
  (favorite/archive/icon/cover); ②e = FTS5 search. NO split — the picker is IN ②c (Victor drift-catch 2026-08-21).
-->

## 1. Identity
The **note-detail authoring surface** in `apps/web`: mounting the M1.0-built `@vida/editor` `VidaEditor` (UI-3) inside
the `note/$id` route, persisting its document to `pages.content` through the ②a data plane, making the page title
editable, and adding the **`[[` wiki-link picker** (create-on-miss). It replaces ②b's placeholder body ("The note
editor mounts in MOD-notes ②c.") with the real editor. `[FACT: apps/web/src/app/note-detail.tsx (②b placeholder); current-spec.md:9 "②c editor + `[[` picker"; m1.1-delivery-plan.md §9 MOD-notes ②]`

**The doc-fixed shape.**
- **The editor is `@vida/editor`'s `VidaEditor`** — already built (E1 core · E2 standard blocks · E3 toolbar · E4 slash
  menu · E5 integration-block placeholders · E6–E8 serializers). ②c is its **FIRST `apps/web` consumer** (0 imports
  today) and mounts it; it authors no editor CORE internals. `[FACT: packages/editor/src/index.ts exports VidaEditor; grep @vida/editor apps/web/src → 0]`
- **Content lives in `pages.content`** — `text('content')`, `@encrypted [E]` (M1.0 empty-`[E]` pass-through), stored as
  a TipTap-JSON string. `UpdatePageInput` already includes `content` AND `title`; `useUpdatePage`'s comment reserves
  itself for "②c autosave". `[FACT: schema/notes.ts:44; services/notes/types.ts:27; validators/note.ts:52; app/notes/hooks.ts:74]`
- **`VidaEditor` is UNCONTROLLED** — `defaultValue?: EditorDocument` (seed once) + `onChange?(doc)` (emit on edit) +
  an imperative handle. Requires ONE of `aria-label`/`aria-labelledby`. The app owns persistence + dirty-checking (the
  `onChange` mount-echo must be deduped — BR-E1-2); programmatic resets go through the handle (BR-E1-1). `[FACT: editor.tsx VidaEditorProps/VidaEditorHandle/onUpdate "app owns persistence"; BR-E1-1/2]`
- **The `[[` picker = a picker + create-on-miss, stored by id** — typing `[[` opens an autocomplete over
  `resolveWikiLink(text)` candidates; selecting writes a `page_links` row by `target_page_id` (`createPageLink`); a
  no-match offers "+ Create '<text>'" → `createPage({type:'note',title})` then link. Never resolve by title at render
  (NP-7). `[FACT: intake G2:51-53; conventions.md:8; business-rules.md NP-7; current-business-rules.md:19-20 caller-composes create-on-miss]`
- **Title is editable in ②c** — it is NOT deferred page-metadata (that list is favorite/archive/icon/cover → ②d);
  the editor page owns the renameable title. `[FACT: §9 MOD-notes ② metadata = "(favorite/archive/icon/cover)" — title excluded; G1 full-scope]`

**What it is NOT.**
- **NOT backlink/entity-link display PANELS or page-metadata (favorite/archive/icon/cover)** → ②d. (②c's `[[` picker
  CREATES page-links; ②d DISPLAYS the backlink/entity-link panels.) `[FACT: current-spec.md:9 "②d panels"; §9 metadata→②d]`
- **NOT FTS5 search UI** → ②e (over the DB-8 seam). `[FACT: current-spec.md:9 "②e search"; §9:197]`
- **NOT the entity-link (`[[`→non-page entity) creation path as a FIRM contract** — G6 held entity-link UX **tentative**
  ("leave it open, may change at implementation"). ②c firmly ships the **page-link** `[[` picker (G2); listing non-page
  entities in the same picker is an OPTIONAL extension, deferrable to ②d if it complicates the mount. `[FACT: intake G6:66-69 TENTATIVE]`
- **NOT the 12 platform integration blocks' bodies** — E5 shipped them as **placeholder node-views**; live bodies ship
  with each owning module later. ②c mounts the editor that already registers them; it builds no block body. `[FACT: editor CLAUDE.md "placeholder node-view until its module body ships (BR-E5-1/4)"]`
- **NOT a Yjs/CRDT sync path** — `pages.content` is a plain TipTap-JSON column at M1.0; `y-prosemirror` is a deferred
  seam (BR-2, M4/AR-9b). ②c reads/writes JSON. `[FACT: editor CLAUDE.md:226]`
- **NOT field-level encryption** — M1.0 is pass-through (`encryptedFields: []`); content ships plaintext-in-SQLCipher
  until M3/DB-5. `[FACT: ② baseline #6; repository.ts:249-253]`
- **NOT an app dark-mode toggle / rendered dark pass** — app is light-only at M1.0, no theme store, no Storybook in
  apps/web (the ②b NC-6 constraint). Dark = token discipline; the editor chrome is already token-built. `[FACT: App.tsx:62-63,71; editor.tsx EditorFrame tokens; ②b NC-6]`

## 2. Business Rules (functional)
> Inherits the CORE constitution + BR-RT-* + the ①/②a data-plane rules + the `@vida/editor` BR-E1-* contract + notes NP-*. Every rule complies.

**Editor mount + autosave**
- **EM-1 — The editor edits exactly one page's body.** `note/$id` → `usePage(id)`; `VidaEditor` seeds from
  `page.content` and every edit persists to that page's `content`. `[FACT: app/note-detail.tsx usePage(id)]`
- **EM-2 — Seed once, uncontrolled — with an EXPLICIT remount key.** `page.content` (JSON string) is parsed to an
  `EditorDocument` and passed as `defaultValue` ONCE per page id; never re-seeded on its own `onChange`. **⚠ The
  `/note/$id` route does NOT remount on a param change — TanStack Router reuses the ONE component instance
  (`routes.tsx:70`, no key).** So the rewrite MUST wrap `VidaEditor` in `key={id}` INSIDE `note-detail.tsx` to force a
  clean remount + fresh seed on `$a`→`$b`; the route will not. Without it, page B shows page A's content. `[FACT: editor.tsx BR-E1-1 uncontrolled; routes.tsx:70 single instance, no per-param remount]`
- **EM-3 — Autosave is debounced, deduped (CANONICALIZED), non-optimistic.** `onChange(doc)` → serialize → debounce
  (≈600 ms idle) → `useUpdatePage({id, patch:{content}})`. The mount-echo is dropped by comparing the echo against a
  *canonical* baseline (the seed reserialized through the SAME `JSON.stringify(parse(page.content))` path — NOT the raw
  stored string, whose key-order may differ — or a first-echo-is-mount flag). Unchanged docs never write (BR-E1-2). No
  optimistic write — `useUpdatePage`'s `onSuccess` invalidation is the single refresh (BR-RT-4). `[FACT: hooks.ts useUpdatePage; editor.tsx BR-E1-2; BR-RT-4]` `[INTERP: canonicalize both sides; 600 ms tunable]`
- **EM-4 — Content is a well-formed `EditorDocument` or empty.** A null/blank/parse-failing `page.content` seeds the
  empty doc `{type:'doc',content:[]}`; a corrupt string never throws into render (parse-guarded → empty + dev warn). On
  write, `JSON.stringify(getDocument())`. `[FACT: editor.tsx EMPTY_DOC + assertEditorDocument; content nullable — schema/notes.ts:44 + validators/note.ts:52]`
- **EM-5 — The textbox has an accessible name.** ②c wires `VidaEditor`'s `aria-labelledby` to the title heading's `id`
  (the editor is "the body of <title>"). `[FACT: editor.tsx warnMissingName BR-6, §XIV; VidaEditorProps]`
- **EM-6 — The title is editable and saves on the same path.** The `<h1>` is an inline editable title persisting via
  `useUpdatePage({id, patch:{title}})` on blur/enter; empty → "Untitled". Doc-fixed as ②c scope (title excluded from
  the ②d metadata list). `[FACT: hooks.ts useUpdatePage title invalidation; validators/note.ts:52 updatePageSchema title; §9 metadata excludes title]`
- **EM-7 — Save status is observable.** A lightweight indicator reflects the mutation lifecycle (idle "Saved" · pending
  "Saving…" · error "Save failed — retry") — the autosave's loading/error affordance (§VIII). `[FACT: useUpdatePage isPending/isError/isSuccess; components.md §VIII]`
- **EM-8 — No business logic in the surface.** ②c maps `page.content`↔doc + title; all page rules (NP-*) are ①-owned;
  no derivation here beyond parse-guarding. `[FACT: current-business-rules.md ① rules]`
- **EM-9 — Read-gated; a MISSING id is `empty`, not `error`.** Until `usePage(id)` resolves, show the loading
  affordance (never a blank editable editor that autosaves over unloaded content). **A missing id → `state==='empty'`**
  (`getPage`→null → `deriveTerminalState(query, d=>d==null)` → `'empty'`, a *successful* null query) → render "note not
  found", NOT an editor; `error` (thrown) → a message; only `success` mounts `VidaEditor`. `[FACT: hooks.ts:40 usePage isEmpty=(d==null); services/notes/types.ts getPage→PageRow|null]`
- **EM-10 — Pending saves FLUSH on unmount / id change.** The autosave hook flushes any pending debounced save in its
  cleanup (unmount, `key={id}` remount, navigation) so type-then-navigate never drops the last edit (EM-7). `[FACT: EM-3 window]` `[INTERP: flush-on-cleanup required for the ≈600 ms window]`

**The `[[` wiki-link picker**
- **WL-1 — `[[` opens an autocomplete over page titles.** A new `WikiLink` **Suggestion surface** (sibling of the
  shipped `SlashCommand` `/` surface) queries `resolveWikiLink(text)` and lists candidate pages as the user types. The
  trigger is `char:'[['` — `@tiptap/suggestion`'s `findSuggestionMatch` regex-escapes it to `\[\[…` (a valid two-char
  trigger); the query excludes `]`/space and the user-typed closing `]]` is literal, so on selection the extension
  `deleteRange`s the `[[query` (+ any typed `]]`) before applying the link. `[FACT: intake G2:52; e4-slash-menu.md:31 "[[wiki-link]] … a separate suggestion surface" (homed to MOD-notes); @tiptap/suggestion findSuggestionMatch escapeForRegEx(char); slash-command.ts Suggestion precedent]`
- **WL-2 — Selection stores the link by `target_page_id`, in BOTH places.** Choosing a candidate (a) applies a
  `wikiLink` **MARK** — inline, wrapping the display text (the shipped `link` mark's shape, carrying `targetPageId`
  instead of `href`; NOT a block node) so `pages.content` round-trips the link by id, NOT title (NP-7); and (b) writes
  a `page_links` row via the hook `useCreatePageLink.mutate({sourcePageId: currentPageId, targetPageId})`. Content =
  render source; `page_links` = the queryable relation. `[FACT: NP-7; conventions.md:8; to-markdown.ts link-mark `[text](href)` precedent; hooks.ts:112 useCreatePageLink({sourcePageId,targetPageId})]`
- **WL-2b — The two writes are ordered link-row-FIRST, mark-SECOND, and tolerate partial failure.** Await
  `createPageLink` (idempotent — NP-5 revive) BEFORE applying the mark; if the row write rejects, no mark is applied
  and the picker shows its error state — content never renders a link with no backing `page_links` row. If the mark
  apply fails after the row, the row is a harmless idempotent orphan a retry reuses. `[FACT: service.ts:152-158 createPageLink idempotent; business-rules.md:31 query-error state]` `[INTERP: order + partial-failure tolerance closes the content↔relation divergence]`
- **WL-3 — Create-on-miss is explicit.** No candidate matches → the picker shows "+ Create '<typed text>'"; choosing it
  `createPage({type:'note', title:text})` then links to the new page. A typo never silently creates a page (NP-7 caller
  compose). `[FACT: intake G2:53; business-rules.md:31/39; current-business-rules.md:20]`
- **WL-4 — The editor must NOT depend on `@vida/core`; data is injected + ASYNC + abort-guarded.** The `WikiLink`
  extension takes its data via **injected callbacks** on a new `VidaEditor` prop (`wikiLink?: { query(text, signal):
  Promise<Candidate[]>, onCreate(text): Promise<Candidate> }`); the app wires those to `resolveWikiLink`/`createPage`.
  Unlike the shipped slash-menu (STATIC in-memory `items`), the picker uses `@tiptap/suggestion`'s **async `items`**
  (v3.30: `items:(props)=>Promise<I[]>` + `debounce` + `minQueryLength` + an `AbortSignal` in props) — fast-typing
  races MUST be abort-guarded (thread `signal` into `resolveWikiLink`, cancel stale) so a late response can't clobber
  the list. `@vida/editor` stays app-agnostic (`Candidate` = a plain injected type, no @vida/core import). `[FACT: packages/editor/package.json no @vida/core dep; @tiptap/suggestion@3.30 async items+signal+debounce; slash-command.ts injection precedent (sync)]`
- **WL-5 — Picker open-state is ephemeral Zustand.** The `[[`-picker open state lives in a Zustand slice, not
  persisted. `[FACT: structure-data.md:36 "Zustand owns … `[[`-picker open state"]`
- **WL-6 — the `wikiLink` MARK is EMIT-ONLY in markdown; PDF/DOCX degrade to text; JSON is the source of truth.** The
  mark registers in the editor schema (a `case` in E6 `MARK_ORDER`/`wrapMark`, mirroring `link`) so
  `getJSON()`/`assertEditorDocument` accept it and **E6 markdown emits `[[label]]`**. It is **NOT a JSON→md→JSON
  identity round-trip**: `from-markdown` has no `[[…]]` rule and `targetPageId` isn't in markdown, so md→JSON reads it
  as literal text — ACCEPTED (markdown is a human/export view; the id lives in `pages.content` JSON, NP-7). **E7 PDF +
  E8 DOCX degrade to the display TEXT** (target dropped — the image lossy-path). The E6/E7/E8 parity/round-trip tests
  are fixture-keyed (NOT live schema nodes), so adding the mark does NOT auto-break them; ②c adds an **emit + survive-
  without-throw** test (NOT an identity test). `[FACT: to-markdown.ts MARK_ORDER/wrapMark + link `[text](href)`; from-markdown.ts parseInline has no `[[]]` rule; serializers.test.ts fixture-keyed]` `[INTERP: mark reuses link machinery; emit-only + text-degrade is the M1.0 acceptable loss]`

**Terminal / visual states (the add-frontend-component §VIII set) — per surface:**
- **The note-detail route** (page load): loading ("Loading…") · **empty (a MISSING id → "note not found")** · error
  (thrown → message) · success (editor mounts). Driven by `usePage(id).state`. `[FACT: hooks.ts:40]`
- **The editor body** (`VidaEditor`): default · focus (the frame's focus-visible ring MUST render — §XIV) · **empty**
  (placeholder "Start writing…") · the E3 toolbar + E4 slash menu are the editor's own shipped states. `[FACT: editor.tsx Placeholder; components.md §VIII focus ring]`
- **Editable title**: default · hover · focus-visible · editing (input) · empty ("Untitled"). `[FACT: components.md §VIII]`
- **Save indicator**: idle "Saved" · pending "Saving…" · error "Save failed". `[FACT: EM-7]`
- **The `[[` picker popup**: default (candidate list) · empty/no-match (shows only "+ Create '<text>'") · loading
  (query in flight) · error (query failed — keep typing) · active/selected (highlighted candidate, roving keyboard);
  Escape closes; focus ring + APG combobox semantics (the slash-menu precedent). `[FACT: business-rules.md:31 state row; slash-menu.tsx roving/APG]`

## 3. Contract — DELEGATED to `/contract`
UI unit; the component API (the note-detail surface, the autosave hook, the `WikiLink` extension + its injected
`VidaEditor` prop, the picker popup) is specified via `/contract` at Step 2, not duplicated here. Scope crosses two
packages:
- **`apps/web`** (feature): `app/note-detail.tsx` (REWRITE ②b placeholder → title + `VidaEditor` + save indicator +
  picker wiring) · `app/notes/use-note-autosave.ts` (debounced/deduped/flush hook) · a Zustand picker slice (in
  `stores/notes-ui-store.ts`) · `app/note-detail.test.tsx`.
- **`@vida/editor`** (NEW, the picker's home per the SlashCommand precedent): `extensions/wiki-link.ts` (the `WikiLink`
  Suggestion surface with async `items`+`AbortSignal` + the `wikiLink` **MARK**) · `wiki-link-menu.tsx` (the popup,
  sibling of `slash-menu.tsx`) · a new async `wikiLink?` prop on `VidaEditor` (injected `query`/`onCreate`) · an E6
  serializer `case` for the mark (E7/E8 degrade to text, declared) · a targeted round-trip test. A real `@vida/editor`
  version bump — ②c is NOT purely app-level (the doc-fixed cost of keeping the picker in ②c).
Consumed unchanged: `usePage`/`useUpdatePage`/`useCreatePage`/`useCreatePageLink` (②a hooks) · `resolveWikiLink` (①) ·
`EditorDocument` (@vida/types) · the `/note/$id` route (②b). `[FACT: ②a hooks.ts; @vida/editor index.ts; routes.tsx]`

## 4. Acceptance (functional)
**Editor + autosave + title**
- [ ] `/note/$id` mounts a real `VidaEditor` seeded from `page.content`; ②b's placeholder line is gone. Standard blocks + the E3 toolbar + the E4 slash menu are live.
- [ ] Typing autosaves to `pages.content` (debounced): navigate away + back (or reload) → content persists. Opening a page and making NO edit issues ZERO `updatePage` calls (mount-echo deduped).
- [ ] The title is editable and renames the page (persists via `updatePage`); `/notes` reflects the new title after invalidation.
- [ ] Editor textbox has an accessible name (`aria-labelledby`→title) + a visible focus ring; keyboard reaches editor + toolbar.
- [ ] Page-load states off `usePage(id).state`: loading → skeleton; **empty (nonexistent `$id`) → "note not found"; error (thrown) → a message** (neither renders an editable editor — tested); success → editor.
- [ ] Save indicator shows idle "Saved" / pending "Saving…" / error "Save failed"; a failed save surfaces (no silent loss) and the doc stays in the editor.
- [ ] A corrupt/blank `page.content` seeds an empty editor without throwing.
- [ ] `/note/$a`→`/note/$b` seeds each correctly (the `key={id}` remount — no cross-page bleed).
- [ ] Type then IMMEDIATELY navigate away (within ≈600 ms) → the edit still persists (flush on unmount/id-change — EM-10). Tested.

**The `[[` picker**
- [ ] Typing `[[` opens the picker; it lists page-title candidates from `resolveWikiLink` as you type.
- [ ] Selecting a candidate writes a `page_links` row FIRST, then applies the `wikiLink` mark (by `target_page_id`); the link renders and survives a title rename of the target (id-stored, NP-7). If `createPageLink` rejects, NO mark is applied and the picker shows its error state (no content↔relation divergence — WL-2b).
- [ ] No-match shows "+ Create '<text>'"; choosing it creates a `note` page and links to it (create-on-miss, explicit — a typo alone never creates a page).
- [ ] Picker states: candidate list · no-match (Create-only) · loading (query in flight) · query-error (keep typing) · roving keyboard select · Escape closes; focus ring + combobox a11y. Fast typing is abort-guarded (a stale response never clobbers the list — WL-4).
- [ ] The `wikiLink` mark is accepted by `getJSON`→`assertEditorDocument`; **E6 markdown EMITS `[[label]]`** (emit-only — not an identity round-trip); a doc with the mark survives `toMarkdown`→`fromMarkdown` **without throwing** (degrades to text); **E7 PDF + E8 DOCX degrade to the display text**. Tested as emit + no-throw (NOT identity).
- [ ] `@vida/editor` stays free of any `@vida/core` import (picker data is injected via the `wikiLink` prop).

**Cross-cutting**
- [ ] **Responsive 375/768/1440:** editor frame, title, toolbar, and picker popup reflow; usable at 375 (toolbar wraps/scrolls; popup fits).
- [ ] **Dark-capable (token-discipline only):** zero hardcoded hex in the new files (grep clean). No rendered dark pass (app light-only, no Storybook) — stated, not skipped-silently.
- [ ] `pnpm --filter @vida/web typecheck` 0 · `--filter @vida/editor typecheck` 0 · both `test` green · both `build` ✓ · ESLint 0.
- [ ] `/component-audit` + `/critique` SHIP + quality-gate-components/-engineering/verification PASS.
- [ ] **REAL-BROWSER VISUAL GATE** — the surface (editor + picker) at 375/768/1440, covering ②b (collection) + ②c. Run locus: runnable locally via the `chrome-devtools` MCP (Brave); jsdom tests are the fast unit-level proof. `[FACT: e2e/CLAUDE.md]`
- [ ] §XXIX current-* refreshed: `notes-and-pages` built-slice gains ②c; `@vida/editor` CLAUDE.md gains the `WikiLink` surface; **D6 births `docs/modules/notes/` current-* if absent**.

## 5. Open questions / pending decisions
- **[RESOLVED — no split]** The ②c/②d boundary is doc-fixed: ②c = **editor + `[[` picker** (current-spec.md:9 · §9 · task file); panels→②d, search→②e. (A prior draft proposed carving the picker out — that was drift; corrected 2026-08-21 per Victor.) `[FACT: current-spec.md:9]`
- **[RESOLVED — title in ②c]** Title-rename is core editor-page scope; the ②d metadata list is favorite/archive/icon/cover only (title excluded). `[FACT: §9 MOD-notes ② metadata parenthetical]`
- **[OPEN — non-blocking, G6-tentative] entity-link listing in the `[[` picker.** G6 held the entity-link `[[` path tentative. Default: ship the **page-link** picker firmly in ②c; include non-page-entity candidates only if it does not complicate the mount, else defer the entity variant to ②d (panels). ⚠ The deferred variant re-enters THIS ②c picker (G6:67 lists entities "alongside pages" in the SAME picker), NOT ②d's panels — so ②c's `Candidate` type is shaped NOW with an optional `entityType`/`entityId` discriminant (cheap forward-compat) to avoid a later reshape. Confirm at Approval 1. `[FACT: intake G6:66-69 TENTATIVE; G6:67 "alongside pages"]`
- No blocking [UNKNOWN]s — every mechanism is grounded on-disk.

## 6. Doc-resolved points (NOT open decisions — fixed by a doc/precedent)
- **②c = editor + `[[` picker (no split); ②d = panels; ②e = search.** `[FACT: current-spec.md:9; §9; task file]`
- **Title editable in ②c** (metadata list excludes title). `[FACT: §9 metadata parenthetical; G1 full-scope]`
- **Editor = the shipped `VidaEditor`, mounted not built (core internals).** `[FACT: @vida/editor index.ts; §9]`
- **Content persists to `pages.content` via `useUpdatePage`.** `[FACT: schema/notes.ts:44; hooks.ts:74]`
- **`[[` = picker + create-on-miss, stored by `target_page_id` (NP-7); create-on-miss explicit.** `[FACT: G2; conventions.md:8; NP-7]`
- **The picker is a Suggestion surface in `@vida/editor` (sibling of SlashCommand), data injected via a prop** (editor has no @vida/core dep). `[FACT: e4-slash-menu.md:31; slash-command.ts; packages/editor/package.json]`
- **No CRDT / no `[E]` at M1.0; dark = capable-not-toggled.** `[FACT: editor CLAUDE.md:226; App.tsx:62-63; ②b NC-6]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-21 | 2026-08-21-mod-notes-3 | initial ②c PLAN — editor mount + autosave (pure apps/web). **[SUPERSEDED]** proposed carving the `[[` picker into a separate ②d + flagged 2 "decisions" (split; title placement). |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **Approval 2 (Victor)** → IMPLEMENTED §5. `@vida/editor` v0.9.0 (`wiki-link.ts` mark+Suggestion+`applyWikiSelection` · `wiki-link-menu.tsx` · `editor.tsx` prop+ARIA · `to-markdown` emit · barrel) + `apps/web` (`note-detail.tsx` rewrite · `use-note-autosave.ts` · editor added to deps). typecheck 0 both · `@vida/editor` 234 · `@vida/web` 218 · build ✓ both · lint clean. §XXIX current-* + editor CLAUDE.md refreshed. |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **post-impl /critique SHIP** (independent, vs the code) → 1 MATERIAL + NITs folded: **MAT-1** the fire-and-forget command swallowed a `createPageLink` failure → the app's injected `onSelect`/`onCreate` now toast + re-throw (error surfaced; mark still skipped — WL-2b). **NITs:** removed dead trailing-`]]` strip + `stripWikiClose(query)` for search/Create (a typed `[[Foo]]` had searched "Foo]]"); `debounce:150`; test serializer options; title Enter-commits. ⚠ real-browser Visual Gate + `/component-audit` still owed (runnable locally via the `chrome-devtools` MCP (Brave)). |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **gate-1 critique REVISE→folded** (independent critic; cite-sweep clean). BLOCKER — EM-9 missing-id is `empty` not `error` (fixed). MAT — `key={id}` must live in note-detail.tsx not the route (EM-2); autosave dedupe canonicalized (EM-3); flush-on-unmount (EM-10). NITs — EM-4/e4 cite repoints. |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **Victor drift-catch: "I already solved both in the documentation." → REWRITE.** The ②c/②d split was manufactured drift — `current-spec.md:9` fixes **②c = editor + `[[` picker** (no split); `§9` metadata excludes **title** → title is ②c. Folded the `[[` picker BACK into ②c (WL-1…WL-6: `WikiLink` Suggestion surface in `@vida/editor` per the SlashCommand precedent + injected `resolveWikiLink` prop · `wikiLink` node stored-by-id · create-on-miss · serializer round-trip · Zustand open-state) + title-rename (EM-6); removed both false "decisions". §3 now crosses `apps/web` + `@vida/editor`. Memory: don't manufacture a ②-unit split the docs already fix. ⚠ picker is NEW scope — needs a gate-1 delta critique before Approval 1. |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **Approval 1 (Victor)** — direction approved; G6 resolved (page-link picker firm in ②c; entity variant → ②d). Authored `IMPLEMENTATION-PLAN-2026-08-21-02c-editor-mount.md` (gate-2 build prompt). |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **gate-2 preflight+critique (IMPL-PLAN) BLOCKED/REVISE→folded** (independent, verified vs INSTALLED `@tiptap/suggestion@3.30.0`: async items+signal+debounce all present; app imports + `updatePageSchema` partials all resolve). Folded: title=@vida/ui `Input` (not a hand-rolled "h1-input"); inline `safeParse` (`EMPTY_DOC` not exported); `allowedPrefixes:null` (default suppresses mid-word `[[`); ATOMIC explicit-marks `insertContent` (not setMark→insert→unsetMark); **skip-once echo flag** not string-equality (TipTap normalizes the seed → phantom saves on empty pages); WL-6 **emit-only** markdown (from-markdown has no `[[]]` rule → no identity test); dropped the fictional "line-19 guard"; `onCreate` invalidates lists+type; use `props.loading`/`props.signal`; `useId()` for titleId. §4 acceptance + WL-6 reconciled. |
| 2026-08-21 | 2026-08-21-mod-notes-3 | **gate-1 DELTA critique (picker scope) REVISE→folded** (independent critic; picker citations all verified, feasibility confirmed on the shipped Suggestion infra). **MAT-1** — WL-2 two-write partial-failure unaddressed → WL-2b: link-row FIRST (idempotent), mark SECOND, tolerate partial fail (no content↔relation divergence). **MAT-2** — `wikiLink` re-specced NODE→**MARK** (inline, the `link`-mark shape carrying `targetPageId`); WL-6 now covers the full E6/E7/E8 suite with PDF/DOCX text-degradation DECLARED + notes the parity tests are fixed-enum-keyed (no auto-break). **NITs** — WL-4 async `items`+`AbortSignal`+debounce (race-guard); WL-1 `char:'[['` trigger reality + range-delete; WL-2 hook object-shape; §5 `Candidate` forward-compat discriminant (deferred entity variant re-enters this picker). §3 updated to mark + full-suite. |
