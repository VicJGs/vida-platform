# FIX (diagnosis + plan) — Opening an empty note crashes the editor (assertEditorDocument rejects an empty doc)
Type: bug (CODE defect — full §XXVI double-gate per §XXIV). Discovered while verifying the vault-not-initialized fix.
Status: DIAGNOSED + CONFIRMED (2026-08-22) — classify ISOLATED; fix is a one-function normalization + TDD regression test.
Task: mod-notes (LIF-131) · increment ②c (@vida/editor mount) · branch `mod-notes-2a-data-plane`
Source-repo: /Users/victor/Documents/CODE/vida-platform

## 1. Defect + root cause (cited)
**Symptom.** Opening a freshly-created note (`/note/$id`) throws into the route error boundary:
`[VidaEditor] getJSON() did not return a doc-rooted EditorDocument` ("Something went wrong!"). Every NEW note
(created with `content: null`) crashes on open; a note with existing non-empty content opens fine.

**Reproduction (live, chrome-devtools/Brave):**
- ⌘K → "New note" → navigate to `/note/$id` → **crash**.
- `updatePage(id, {content: JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'hello'}]}]})})`
  then reload `/note/$id` → **renders fine** (toolbar + text + "Saved"). So the trigger is EMPTY content, not the route.

**Root cause (one sentence).** The crash is caused by **`assertEditorDocument` rejecting a valid EMPTY ProseMirror
document** — ProseMirror's `Node.toJSON()` omits the `content` key when a node has no children, so an empty doc
serializes to `{type:'doc'}` (no `content`), and `assertEditorDocument` (`editor.tsx:64-65`) throws unless `content`
is an array — NOT the note data, the seed, or the vault-init fix.

**The seed chain.** A new page stores `content: null` (`[FACT: getPagesByType → contentRaw: null]`).
`note-detail.tsx:27-34 safeParse(null)` returns `EMPTY_DOC = {type:'doc', content:[]}` → passed as `VidaEditor`
`defaultValue`. TipTap seeds an explicitly-empty doc; on mount the `onUpdate` echo (`editor.tsx:160`) calls
`assertEditorDocument(editor.getJSON())`, and `getJSON()` of the empty doc is `{type:'doc'}` → throw.

**Why 234 editor tests + 218 web tests missed it.** The editor tests seed either `undefined` (StarterKit's
`content:'block+'` schema then AUTO-FILLS a paragraph → `getJSON()` has `content` → passes) or a non-empty
`docOf(text)`. No test ever seeds an EXPLICITLY-empty `{type:'doc',content:[]}` — the exact shape `safeParse(null)`
produces for a brand-new note. Same class of first-use blind spot as the vault-init bug.

## 2. Facets
- **Symptom vs root cause:** the error says "getJSON did not return a doc-rooted EditorDocument"; the real cause is a
  too-strict runtime assert that treats a legitimately-empty doc (ProseMirror drops the empty `content` key) as invalid.
- **Affected sites (blast radius → ISOLATED):** `assertEditorDocument` is called at `editor.tsx:160` (onUpdate — the
  crash), `editor.tsx:182` (`getDocument` handle), and `note-detail.tsx:30` (`safeParse`). One function fix covers all.
- **Class:** ISOLATED — one function; fixing it exposes nothing else (the same note renders once content is non-empty).
- **Contract note:** `@vida/types` `EditorDocument.content: EditorNode[]` is REQUIRED (`editor.ts:167`), so the fix
  must RETURN a spec-valid doc — normalize the missing key to `content: []`, not merely skip the check.

## 3. Files involved
- `packages/editor/src/editor.tsx:60-75` — `assertEditorDocument` (the fix site).
- `packages/editor/src/editor.test.tsx` — add the empty-doc regression tests (unit + mount).
- (context, unchanged) `apps/web/src/app/note-detail.tsx:24-34` `safeParse`/`EMPTY_DOC`; `packages/types/src/editor.ts:165-173`.

## 4. The fix (approach)
Normalize a doc-rooted payload whose `content` is MISSING to an empty array (an empty doc IS a valid `EditorDocument`);
keep throwing only for a genuinely malformed payload (not doc-rooted, or `content` present-but-not-an-array, or a child
without a string `type`):
```ts
export function assertEditorDocument(json: unknown): EditorDocument {
  if (typeof json !== 'object' || json === null || (json as { type?: unknown }).type !== 'doc') {
    throw new Error('[VidaEditor] getJSON() did not return a doc-rooted EditorDocument')
  }
  // ProseMirror's Node.toJSON() omits `content` for an empty doc → treat as an empty document (spec: content is
  // a required array, so we normalize the absent key rather than reject a legitimately-empty doc).
  const content = (json as { content?: unknown }).content ?? []
  if (!Array.isArray(content)) {
    throw new Error('[VidaEditor] getJSON() did not return a doc-rooted EditorDocument')
  }
  for (const node of content) { /* …unchanged string-type child guard… */ }
  return { ...(json as object), content } as EditorDocument
}
```
TDD: add a unit test (`assertEditorDocument({type:'doc'})` → `{type:'doc',content:[]}`, currently throws) + a mount
test (`<VidaEditor defaultValue={{type:'doc',content:[]}}/>` mounts without crashing) — RED before, GREEN after.

## 5. Acceptance
- [ ] `assertEditorDocument({type:'doc'})` returns `{type:'doc', content:[]}` (was: throws). Unit test green.
- [ ] `<VidaEditor defaultValue={{type:'doc',content:[]}}/>` mounts (role=textbox) without hitting the error boundary.
- [ ] Live: ⌘K → "New note" → `/note/$id` mounts the editor (no "Something went wrong"); typing autosaves.
- [ ] `@vida/editor` typecheck 0 · full editor suite green · no boundary/dep change (still `@vida/core`-free).
- [ ] §XXIX: `packages/editor/src/CLAUDE.md` (E1 assertEditorDocument note) refreshed to state the empty-doc tolerance.
