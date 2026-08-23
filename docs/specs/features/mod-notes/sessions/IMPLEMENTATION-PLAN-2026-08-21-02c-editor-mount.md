# IMPLEMENTATION-PLAN — mod-notes ②c (editor + autosave + `[[` picker)   (session: 2026-08-21-mod-notes-3 · language: TypeScript)
> Gate-2 build prompt. Derived from the approved PLAN (`PLAN-2026-08-21-02c-editor-mount.md`, Approval 1 2026-08-21).
> Self-sufficient: every step cites the PLAN rule (EM-*/WL-*) it satisfies + a verification. No-Guessing.

## 1. Contexto completo
- **Unit:** MOD-notes ② sub-unit **②c** = mount `@vida/editor` `VidaEditor` in the `note/$id` route + autosave to
  `pages.content` + editable title + the `[[` wiki-link picker (page-links firm; entity variant deferred to ②d). Crosses
  **`@vida/editor`** (new WikiLink surface + mark) and **`apps/web`** (mount + wiring). `[FACT: PLAN §1]`
- **Current state on disk:**
  - `apps/web/src/app/note-detail.tsx` — ②b placeholder (`usePage(id)`, a `PageHeading` styled `h1`, body text "The note
    editor mounts in MOD-notes ②c."). `[FACT: note-detail.tsx:1-31]`
  - `apps/web/src/app/notes/hooks.ts` — `usePage(id)` → `{data, state}` (`deriveTerminalState(q, d=>d==null)`);
    `useUpdatePage()` (patch `{content}`/`{title}`, invalidates page+lists+type); `useCreatePage()`;
    `useCreatePageLink()` (object `{sourcePageId,targetPageId,context?}`). `[FACT: hooks.ts:35-41,64,74-90,109-118]`
  - `apps/web/src/services/notes-service.ts` — `getNotesService()` (module singleton; `resolveWikiLink`/`createPage`/
    `createPageLink` available). `[FACT: ②a; current-spec.md]`
  - `apps/web/src/routes.tsx` — code-based router; `/note/$id` = ONE `lazyRouteComponent(() => import('./app/note-detail'))`,
    NO key, NO per-param remount. `[FACT: routes.tsx:70-74 (mirror of notesRoute:53-57)]`
  - `apps/web/src/lib/query-client.ts` — the exported module `queryClient` (staleTime 30 000). `[FACT: ②b; lib/query-client.ts]`
  - `packages/editor/src/editor.tsx` — `VidaEditor` uncontrolled (`defaultValue`/`onChange`/handle); `useEditor` extensions
    array = `[StarterKit, Placeholder, ...STANDARD_BLOCK_EXTENSIONS, ...INTEGRATION_BLOCK_EXTENSIONS, SlashCommand]`;
    `editorProps.attributes` = a `(state)=>({role, aria-multiline, ...name, ...slashComboboxAttrs(slashActive(state))})`
    FUNCTION (the single `role` writer). `[FACT: editor.tsx VidaEditorProps; useEditor extensions; attributes fn]`
  - `packages/editor/src/extensions/slash-command.ts` — the Suggestion precedent: `Extension.create({ addProseMirrorPlugins(){
    return [Suggestion({editor, pluginKey, char:'/', items:({query})=>[...], command:({editor,range,props})=>props.run?.(...),
    render:createRenderer})] } })` + `slashActive(state)` + `slashComboboxAttrs(active)`. `[FACT: slash-command.ts:90-118]`
  - `packages/editor/src/slash-menu.tsx` — the popup precedent (`forwardRef` `role=listbox` in `<Theme name="Menu">`,
    roving, imperative `onKeyDown` handle). `[FACT: slash-menu.tsx]`
  - `packages/editor/src/serializers/to-markdown.ts` — `MARK_ORDER = ['link','bold','italic','underline','strike']`;
    `wrapMark(inner, mark)` `switch` with `case 'link': return `[${inner}](${href})``. `[FACT: to-markdown.ts:38,45-62]`
  - `packages/editor/package.json` — NO `@vida/core` dep (must stay so). `[FACT: package.json]`
- **Decisions from the PLAN:** no split (②c = editor + picker); title in ②c; `wikiLink` is a **MARK**; picker is a
  Suggestion surface in `@vida/editor` with injected async data; page-links firm, entity variant → ②d.

## 2. Escopo de mudanças
**Files touched (IN):**
| Package | File | Op |
|---------|------|-----|
| @vida/editor | `src/extensions/wiki-link.ts` | NEW — the `wikiLink` Mark + the `WikiLink` Suggestion Extension |
| @vida/editor | `src/wiki-link-menu.tsx` | NEW — the picker popup (sibling of slash-menu.tsx) |
| @vida/editor | `src/editor.tsx` | EDIT — `wikiLink?` prop, register the extension (gated), host combobox ARIA merge |
| @vida/editor | `src/serializers/to-markdown.ts` | EDIT — `MARK_ORDER` + `wrapMark` `case 'wikiLink'` |
| @vida/editor | `src/index.ts` | EDIT — export `WikiLink` config/candidate types |
| @vida/editor | `src/extensions/wiki-link.test.ts` + `src/serializers/*wiki* round-trip` | NEW — tests |
| @vida/editor | `package.json` | EDIT — version bump |
| @vida/editor | `src/CLAUDE.md` | EDIT — document the WikiLink surface (§XXIX) |
| @vida/web | `src/app/note-detail.tsx` | REWRITE — the real editor surface (title + editor + save indicator + wiki wiring) |
| @vida/web | `src/app/notes/use-note-autosave.ts` | NEW — debounced/canonicalized/flush autosave hook |
| @vida/web | `src/app/note-detail.test.tsx` | NEW — jsdom tests |

**NÃO se faz (OUT — and why):**
| Not done | Why | Home |
|----------|-----|------|
| backlink/entity-link display panels · page metadata (favorite/archive/icon/cover) | ②d scope | current-spec.md:9 |
| FTS5 search UI | ②e scope | §9:197 |
| entity-link (`[[`→non-page) candidates in the picker | G6-tentative; deferred (Approval 1) | intake G6 |
| a NEW Zustand picker-open flag | the Suggestion plugin's own `active` state IS the ephemeral open-state (slash precedent); no app chrome observes it → adding one is unused state | structure-data.md:36 (satisfied by plugin state) `[INTERP]` |
| PDF/DOCX carrying the wiki target | declared lossy at M1.0 (image precedent) | WL-6 |
| field-level `[E]` · Yjs sync | M3/DB-5 · M4 | PLAN §1 NOT |

## 3. Mudanças exatas

### @vida/editor — the picker infrastructure (build FIRST; the app consumes it)

**C1 — `src/extensions/wiki-link.ts` (NEW): the `wikiLink` Mark.**
- **operation:** add a Tiptap `Mark.create({ name:'wikiLink' })`. Attrs `{ targetPageId: {default:null}, label: {default:null} }`.
  `inclusive:false` (typing after the link is not linked). `parseHTML` `a[data-wikilink]` → read `data-target-page-id`;
  `renderHTML` → `['a', { 'data-wikilink':'', 'data-target-page-id': attrs.targetPageId, class:'vida-wikilink' }, 0]`.
- **satisfies:** WL-2 (mark carries `targetPageId`), WL-6 (schema-registered so `assertEditorDocument` accepts it).
- **verify:** a unit test applies the mark and asserts `getJSON()` round-trips the `targetPageId` attr.

**C2 — `src/extensions/wiki-link.ts` (same file): the `WikiLink` Suggestion Extension + injected config.**
- **types (exported):** `interface WikiLinkCandidate { id:string; title:string; entityType?:string; entityId?:string }`
  (the `entityType?/entityId?` discriminant = the §5 forward-compat for the deferred entity variant);
  `interface WikiLinkConfig { query(text:string, signal:AbortSignal): Promise<WikiLinkCandidate[]>; onCreate(text:string):
  Promise<WikiLinkCandidate>; onSelect(candidate:WikiLinkCandidate): Promise<void> }`.
- **operation:** `Extension.create({ name:'wikiLink', addOptions(){ return { config: null as WikiLinkConfig|null } },
  addProseMirrorPlugins(){ const cfg=this.options.config; if(!cfg) return []; return [ Suggestion<WikiLinkCandidate|{__create:string}>({
  editor:this.editor, pluginKey: WikiSuggestionPluginKey, char:'[[', allowSpaces:true, startOfLine:false,
  allowedPrefixes: null, /* ⚠ PF#2 — the default [' '] SUPPRESSES mid-word `[[` (fails the prefix test); null = trigger anywhere */
  allow:({editor})=>!editor.isActive('codeBlock'), items: ({query, signal})=> cfg.query(query, signal), /* async + the
  plugin's OWN AbortSignal (3.30) — NO closure AbortController */ command: async ({editor,range,props})=> { try {
  const c = ('__create' in props) ? await cfg.onCreate(props.__create) : props; /* create-on-miss (WL-3) */
  await cfg.onSelect(c); /* WL-2b — page_links row FIRST (idempotent); rejects → catch, no mark */
  editor.chain().focus().deleteRange(range).insertContent({ type:'text', text:c.title, marks:[{ type:'wikiLink',
  attrs:{ targetPageId:c.id, label:c.title } }] }).run() /* ⚠ PF#3 — ATOMIC explicit-marks insert; NOT setMark→insert→unsetMark */
  } catch { /* popup error state; no mark, no partial */ } }, render: createWikiRenderer }) ] } })`.
  - **`char:'[['`:** `findSuggestionMatch` regex-escapes `char` → `\[\[` (query = `.slice(2)`), so the 2-char trigger works
    (WL-1). `range` covers `[[`+query; a user-typed trailing `]]` is EXCLUDED from `query` (regex stops at `]`) → **strip a
    trailing `]]` from the doc after insert, or the `command` deletes `range` only** — spec the strip so no literal `]]` is left (PF#2).
  - **create-on-miss** = the popup passes `{__create: query}` into `command` (the sentinel); else a `WikiLinkCandidate` (WL-3).
  - **loading/debounce:** the popup reads `props.loading` (suggestion 3.30 provides it); configure `debounce` + `minQueryLength:1`.
- **exports:** `WikiSuggestionPluginKey`, `wikiActive(state)`, `wikiComboboxAttrs(active)` (mirror slash's, for editor.tsx).
- **satisfies:** WL-1/2/2b/3/4/5. **verify:** tests — suggestion activates on `[[`; `command` on a candidate calls
  `onSelect` then applies the mark (spy); `onSelect` rejects → no mark; create path calls `onCreate`→`onSelect`.

**C3 — `src/wiki-link-menu.tsx` (NEW): the popup.** Mirror `slash-menu.tsx` — a `forwardRef` `role=listbox` in
`<Theme name="Menu">`, roving `aria-activedescendant`, imperative `onKeyDown` handle (↑/↓/Enter/Esc). Rows = candidates;
a persistent final row **"+ Create '<query>'"** (WL-3); states: loading (query in flight) · empty→Create-only ·
error ("Couldn't search — keep typing") · list. Token-only, no hex.
- **satisfies:** WL picker states (PLAN §2 picker row). **verify:** a render test per state (stub props, like `slash-menu.test.tsx`).

**C4 — `src/editor.tsx` (EDIT): thread the prop + register + ARIA.**
- **locate** `VidaEditorProps` interface → **add** `wikiLink?: WikiLinkConfig`.
- **locate** the `useEditor({ extensions:[ …, SlashCommand ] })` array → **append** `...(wikiLink ? [WikiLink.configure({
  config: wikiLink })] : [])`. (Gated: no config → no plugin, zero overhead for editors without a picker.)
- **locate** the `attributes = (state) => ({ role:'textbox', 'aria-multiline':'true', ...baseName,
  ...slashComboboxAttrs(slashActive(state)) })` → **merge** `...wikiComboboxAttrs(wikiActive(state))` (the SAME
  single-`role`-writer pattern — a plugin can't set host `role`; [[prosemirror-editorprops-attributes-beats-plugin]]).
- **satisfies:** WL-1 (mount), WL-4 (injected), a11y §XIV (combobox host). **verify:** `pnpm --filter @vida/editor typecheck`;
  a test mounting `<VidaEditor wikiLink={stub}/>` and asserting `[[` opens the popup (insertContent('[[') trips detection
  in jsdom per the slash-menu test precedent).

**C5 — `src/serializers/to-markdown.ts` (EDIT): EMIT the mark (one-directional; NOT an identity round-trip).**
- **locate** `const MARK_ORDER = ['link','bold','italic','underline','strike']` → **change** to
  `['link','wikiLink','bold','italic','underline','strike']` (wikiLink right after link).
- **locate** `wrapMark`'s `case 'link':` → **add before it** `case 'wikiLink': return `[[${inner}]]`` (emit the display
  label bracketed). ⚠ PF-bonus: unknown marks already fall to `wrapMark`'s `default: return inner` (to-markdown.ts:65) —
  there is **NO** line-19 "known-mark guard" (line 19 is `INLINE_ESCAPE`); do **NOT** edit line 19.
- **`from-markdown.ts`:** NO reconstruction — `parseInline` has no `[[…]]` rule and `targetPageId` isn't in markdown, so
  md→JSON reads `[[label]]` as literal text. ACCEPTED: markdown is a human/export view; the id lives in `pages.content`
  JSON (NP-7). **⇒ WL-6 is EMIT-ONLY — do NOT write a JSON→md→JSON identity test (it cannot pass).**
- **E7/E8:** NO change — PDF/DOCX fall through to the text branch → display text renders, target dropped (declared-lossy, image precedent).
- **satisfies:** WL-6 (corrected). **verify:** a test that `toMarkdown(doc-with-wikiLink)` emits `[[label]]` AND that a
  doc with a wikiLink mark survives `toMarkdown`→`fromMarkdown` WITHOUT THROWING (degrades to text). `serializers.test.ts`
  is fixture-keyed → stays green.

**C6 — `src/index.ts` (EDIT):** `export { WikiLink } from './extensions/wiki-link'` + `export type { WikiLinkConfig,
WikiLinkCandidate } from './extensions/wiki-link'`. **C7 — `package.json`** minor version bump. **C8 — `src/CLAUDE.md`**
add the WikiLink section (§XXIX, done at completion).

### @vida/web — mount + wiring (build SECOND; consumes @vida/editor)

**A1 — `src/app/notes/use-note-autosave.ts` (NEW).** `useNoteAutosave(pageId) → { onChange, status, flush }`.
- `useUpdatePage()` inside; a `useRef` debounce timer (≈600 ms).
- **mount-echo skip (⚠ PF#7 — a SKIP-ONCE FLAG, not string-equality):** `skipNextEcho = useRef(true)`, reset to `true`
  whenever `pageId` changes. VidaEditor's FIRST `onChange` after mount is the normalized-seed echo (BR-E1-2) — TipTap
  normalizes the seed so `getJSON()` need NOT string-equal the stored doc (esp. empty `null`→`{doc,[]}` vs the editor's
  `{doc,[paragraph]}`), so string-equality would phantom-save every fresh page. The hook consumes the flag on the first
  `onChange` and returns without saving; later calls are real edits.
- `onChange(doc)` → if `skipNextEcho.current` { `skipNextEcho.current=false`; return } else schedule the debounced
  `updatePage.mutate({id:pageId, patch:{content: JSON.stringify(doc)}})`.
- `status` = `'saved' | 'saving' | 'error'` derived from the mutation (EM-7).
- `flush()` + a cleanup `useEffect(() => () => flush(), [pageId])` fires any pending save on unmount / id-change (EM-10).
- **satisfies:** EM-3/EM-7/EM-10. **verify:** unit tests — a fresh empty page mounts → 0 mutate calls (echo skipped, no
  phantom save); an edit debounces to 1 call; flush on unmount fires the pending save; a `pageId` change re-arms the skip.

**A2 — `src/app/note-detail.tsx` (REWRITE).**
- `const { id } = useParams({from:'/note/$id'})`; `const { data:page, state } = usePage(id)`.
- **state switch (EM-9):** `loading` → a skeleton/"Loading…"; `empty` → a "Note not found" message (NOT an editor);
  `error` → an error message; `success` → the editor block.
- **success block:**
  - `const titleId = useId()` (⚠ PF#8 — stable id for the label relationship).
  - an **editable title** — the `@vida/ui` **`Input`** primitive (⚠ PF#5 — compose it, don't hand-roll; it ships `id`,
    `aria-label`, `defaultValue`, `onChangeText`, focus-ring, states): `<Input id={titleId} defaultValue={page.title ?? ''}
    aria-label="Page title" onBlur/onChangeText → useUpdatePage().mutate({id, patch:{title}})>` (EM-6). NOT an "h1-role
    input" (an `<input>` can't be a heading) — the `id`+`aria-label` satisfy EM-5's label target; a visual heading style is fine.
  - `const parsed = useMemo(() => safeParse(page.content), [id])` where **`safeParse` is inline** (⚠ PF#6 — no such util
    exists; `EMPTY_DOC` isn't exported from `@vida/editor`): `function safeParse(raw: string|null): EditorDocument { if
    (!raw) return { type:'doc', content:[] }; try { return assertEditorDocument(JSON.parse(raw)) } catch { return { type:
    'doc', content:[] } } }` (`assertEditorDocument` IS exported; inline the empty doc). (EM-4.)
  - `const autosave = useNoteAutosave(id)`.
  - `const wikiConfig = useMemo<WikiLinkConfig>(() => ({ query:(t,signal)=>getNotesService().resolveWikiLink(t).then(rows=>
    rows.map(r=>({id:r.id, title:r.title ?? 'Untitled'}))), onCreate:(t)=>getNotesService().createPage({type:'note',title:t})
    .then(p=>{ queryClient.invalidateQueries({queryKey:notesKeys.lists()}); queryClient.invalidateQueries({queryKey:notesKeys
    .type('note')}); return {id:p.id, title:p.title ?? t} }), onSelect:(c)=>getNotesService().createPageLink(id, c.id).then(()=>{
    queryClient.invalidateQueries({queryKey:notesKeys.backlinks()}); queryClient.invalidateQueries({queryKey:notesKeys.pageLinks()}) }) }), [id])`
    — the app-side compose; `getNotesService()`/`queryClient` used directly (outside React, the ②b command precedent).
    ⚠ #10: `onCreate` ALSO invalidates `lists()`+`type('note')` (a new note page was created → it must appear in `/notes`).
  - `<VidaEditor key={id} defaultValue={parsed} onChange={autosave.onChange} aria-labelledby={titleId} wikiLink={wikiConfig} />`
    — **`key={id}`** forces the remount+reseed on `$a`→`$b` (EM-2, the route won't).
  - a **save indicator** bound to `autosave.status` (EM-7).
- **satisfies:** EM-1/2/4/5/6/7/9 + WL wiring (2/2b/3). **verify:** jsdom tests below.

**A3 — `src/app/note-detail.test.tsx` (NEW).** Mock `usePage` per state; assert: loading→skeleton, empty→not-found (no
editor), error→message, success→editor; open-no-edit → 0 `updatePage`; an edit → 1 debounced save; title blur → updatePage
title; `$a`→`$b` reseeds (rerender with a new id/key → new content); the wiki `onSelect` orders link-then-mark (spy). Mirror
`useSchemaVersion.test.ts` + the ②b harness.

## 4. Regras de negócio (técnicas) — PROMOVE → current-business-rules.md
EM-1…EM-10 + WL-1…WL-6/WL-2b exactly as in the PLAN §2 (each cited there). New/technical framing:
- Autosave dedupe baseline is `JSON.stringify(parse(storedContent))` (canonical), not the raw stored string (EM-3).
- `key={id}` on `VidaEditor` is REQUIRED for per-page isolation (EM-2) — the route does not remount.
- The `[[` two-write is link-row-first (idempotent), mark-second, partial-failure-tolerant (WL-2b).
- `@vida/editor` gains a `wikiLink?` injected config; it imports NOTHING from `@vida/core` (WL-4).

## 5. Contrato / estrutura — PROMOVE → current-spec.md
- **`@vida/editor`:** `VidaEditor` gains `wikiLink?: WikiLinkConfig`; new exports `WikiLink`, `WikiLinkConfig`,
  `WikiLinkCandidate`; new `wikiLink` mark in the schema + E6 markdown (`[[label]]`), E7/E8 text-degrade.
- **`apps/web`:** `note-detail.tsx` = the note authoring surface (title + `VidaEditor` + save indicator + `[[` wiring);
  `use-note-autosave.ts` = the debounced/canonicalized/flush hook over `useUpdatePage`.

## 6. Aceitação & verificação
Mirror PLAN §4 (all rows), technically:
- [ ] `pnpm --filter @vida/editor typecheck && test && build` green (mark emit `[[label]]` + survive-without-throw, suggestion activate on `[[`, command order row→mark, create-on-miss sentinel, popup states).
- [ ] `pnpm --filter @vida/web typecheck && test && build` green (state switch, autosave echo/debounce/flush, title, two-page isolation, wiki select order).
- [ ] `grep -rn "#[0-9a-fA-F]\{3,6\}" apps/web/src/app/note-detail.tsx …` → zero hex (dark token-discipline).
- [ ] ESLint 0 both packages; `@vida/editor` imports no `@vida/core` (grep).
- [ ] `/component-audit` + `/critique` SHIP + quality-gate-components/-engineering/verification PASS.
- [ ] REAL-BROWSER VISUAL GATE (editor + picker, 375/768/1440; runnable locally via the `chrome-devtools` MCP (Brave)) — jsdom is the fast unit-level proof.
- [ ] §XXIX: `notes-and-pages` current-* + `@vida/editor` CLAUDE.md refreshed; `docs/modules/notes/` current-* born if absent (D6).

## 7. Gates cleared
- /critique (gate-1, PLAN):      REVISE→folded (+ picker delta REVISE→folded)  · 2026-08-21
- Aprovação 1 (direção):         Victor · 2026-08-21
- /preflight (gate-2):           BLOCKED→folded (title=@vida/ui `Input` · inline `safeParse`/no `EMPTY_DOC` export · md emit-only contract) · 2026-08-21
- /critique (gate-2, this IMPL): REVISE→folded (allowedPrefixes:null · atomic explicit-marks insert · skip-once echo not string-eq · emit-only serializer + fictional line-19 dropped · onCreate lists/type invalidation · props.loading/signal · useId) · 2026-08-21
- Aprovação 2 (liberado):        Victor · 2026-08-21
- IMPLEMENTED + /critique (post-impl): SHIP · 1 MATERIAL folded (error-surfacing: app onSelect/onCreate toast+re-throw) + NITs (stripWikiClose · debounce · title Enter · test opts) · 2026-08-21. ⚠ Visual Gate + /component-audit owed (runnable locally via the `chrome-devtools` MCP (Brave)).

## 8. Rollback / risco
- **Riskiest step:** C2 (the Suggestion `command` two-write + abort) — the async ordering. Checkpoint: land C1+C5 (mark +
  serializer, pure, tested) FIRST, then C2/C3 behind the gated `wikiLink` prop (an editor with no config is unaffected),
  then the app wiring. Each package builds/tests independently before the app consumes.
- **Rollback:** the `wikiLink` prop is additive + gated → reverting note-detail.tsx to the ②b placeholder + dropping the
  prop restores the prior state; the mark/serializer additions are inert without an editor that uses them.
