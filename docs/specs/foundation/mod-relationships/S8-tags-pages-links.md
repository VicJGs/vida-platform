# S8 — Tags + pages + links (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S8 of 9. Legs: REL-48, REL-49, REL-50. Composes the BUILT `foundation/spaces`
> (entity_tags/entity_links WRITE) + `services/notes` (pages). Grounded in: RL-10 (SP1/SP3), RL-1/G9 (pages),
> ADR-002 L3811 (contact = entity_links target), the purposes-S8 precedent, [[spaces-junctions-split-read-write-tagentity-blind-inserts]].

## §1. Context

Contact + network tags resolve to the shared **`entity_tags`** primitive (SP1, nestable `parent_tag_id` SP3) — NOT
an inline list; contact + network descriptions are **`pages`** rows (`entity_type` ∈ contact, network; G9). Both
`entity_type`s are **already seeded** in the shared `ENTITY_TYPES` registry (`_registry.ts:112-113`) → NO
`register()` needed; `SpacesService`/`NotesService` validate against it. **Deps GROW** (purposes-S8 precedent): S8
adds REQUIRED `spaces: SpacesService` + `notes: NotesService` (the test harness widens to supply them; S1–S7 tests
unaffected — they don't use them). M1.0 pass-through `[E]=[]`.

## §2. Business Rules (S8)

- **BR-RL-S8-1 (REL-48, tags)** — `tagContact(contactId, tagId)` / `untagContact(contactId, tagId)` /
  `tagNetwork(networkId, tagId)` / `untagNetwork(networkId, tagId)` delegate ALL tag WRITES to
  `spaces.tagEntity`/`spaces.untagEntity` (the read/write split — Spaces owns the junction). Relationships GUARDS the
  entity it owns (contact → `ContactNotFoundError`; network → `NetworkNotFoundError`); tag-id validation is Spaces'
  concern (relationships holds no tagRepo — delegate, don't re-implement). `tagEntity` is idempotent (SP1 BR-14).
- **BR-RL-S8-2 (REL-49, pages)** — `ensureContactNote(contactId)` / `ensureNetworkNote(networkId)` find-or-create a
  TITLED standalone note page (`type:'note'`, `entity_type:'contact'|'network'`, `title` = contact `first_name` /
  network `name`) — the purposes/projects `getProjectPage` mechanism (find existing note-page via
  `notes.getPagesForEntity` else `notes.createPage`), NOT `notes.ensureEntityNote` (which seeds `content`, not
  `title`). No new PAGE_TYPE; idempotent. Guards the owning entity (`ContactNotFoundError`/`NetworkNotFoundError`).
- **BR-RL-S8-3 (REL-50, entity_links) — RATIFY** — `contact` is a valid `entity_links` target (seeded registry +
  `spaces.createLink` validates it); the link is WRITTEN from the note/editor side (`spaces.createLink(pageId,
'contact', contactId)`), NOT a relationships-owned method. No new code — the capability already exists (documented).

## §3. Surface (S8)

```ts
tagContact(contactId: string, tagId: string): Promise<EntityTagRow>      // ContactNotFoundError
untagContact(contactId: string, tagId: string): Promise<void>           // ContactNotFoundError
tagNetwork(networkId: string, tagId: string): Promise<EntityTagRow>     // NetworkNotFoundError
untagNetwork(networkId: string, tagId: string): Promise<void>          // NetworkNotFoundError
ensureContactNote(contactId: string): Promise<PageRow>                 // ContactNotFoundError; find-or-create titled
ensureNetworkNote(networkId: string): Promise<PageRow>                 // NetworkNotFoundError
```

- Deps: `RelationshipsServiceDeps` grows → `{ db, deviceId, spaces: SpacesService, notes: NotesService }`.
- Return `EntityTagRow` (from Spaces) / `PageRow` (from Notes) — pass through.

## §4. Acceptance

- [ ] `tagContact` tags a contact (entity_type='contact'); idempotent (double-tag → one row); unknown contact → ContactNotFoundError; `untagContact` removes.
- [ ] `tagNetwork` tags a network; unknown network → NetworkNotFoundError.
- [ ] `ensureContactNote` creates a titled page (title=first_name, entity_type='contact') and is idempotent (second call returns the same page); unknown contact → ContactNotFoundError.
- [ ] `ensureNetworkNote` creates a titled page (title=network name); idempotent.
- [ ] tsc 0 · eslint 0 · live-store green (harness widened with real spaces+notes).

## §5. Implementation prompt

1. **types.ts** — grow `RelationshipsServiceDeps` (+spaces/notes); add 6 methods; import `EntityTagRow` (spaces),
   `PageRow` (notes schema), `SpacesService`, `NotesService`.
2. **service.ts** — destructure `spaces`/`notes` from deps. `tagContact` etc.: guard entity live → `spaces.tagEntity(tagId,
'contact'|'network', id)`. `ensureContactNote`/`ensureNetworkNote`: guard → resolve title → `notes.getPagesForEntity`
   find `type==='note'` else `notes.createPage({type:'note', title, entity_type, entity_id})` (purposes `ensureEntityNote`).
3. **tests harness** — widen `setup()`: build `createTaggableTypeRegistry` + `createSpacesService` + `createBacklinkResolver` +
   `createNotesService`, pass `spaces`/`notes` to `createRelationshipsService`. Add an S8 describe block covering §4.
4. Verification Gate → inline g2 → currency BR-RL-S8-\* → commit.

## Open calls (resolved, No-Guessing)

- **tag writes delegate to Spaces; guard only the owned entity** (read/write split; no tagRepo here) — [[spaces-junctions-split-read-write-tagentity-blind-inserts]].
- **ensureEntityNote = titled find-or-create** (projects/purposes mechanism), NOT `notes.ensureEntityNote` (content-seed). FACT (precedent).
- **REL-50 = RATIFY** (contact seeded as a link target; link written note-side) — no manufactured method.
