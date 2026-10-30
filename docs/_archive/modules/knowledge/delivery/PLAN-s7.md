# PLAN — mod-knowledge S7: Flashcards sub-service

> §XXVI gate-1 spec. Slice S7 of 8 (`decomposition.md:31,92-103`). Legs: **FC-01…12** (12).
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.
> Flashcards is the **reference implementation of ADR-005** (the Study-Method Service framework): a thin
> **content + interaction plugin** riding Knowledge's generic review engine. It owns ONLY the card content entity;
> scheduling / curves / review-log / mastery / grouping are the generic engine's — never re-implemented here.

## §1. Context

The `flashcards` table already ships in `022_knowledge` (`schema/knowledge.ts:136-151`) with its `@vida/types`
`Flashcard` interface authored at S1 — content-only (front/back/hint/explanation `[E]`, `card_type` FIXED CHECK,
`media` json<string[]>, `is_suspended`, `sort_order`). The three v2 tables (`flashcard_decks`, `flashcard_reviews`,
the SM-2 columns) are **retired** (ADR-005 §3.2). S7 is a **net-new service** at `packages/core/src/services/flashcards/`
(no existing dir) composing the shipped substrates: the review engine (S3/S4), Sessions, Spaces/Backlinks.

### Interpretation headlines (the load-bearing S7 calls — confirm at Approval 1)

**#1 — A card reviews a KNOWLEDGE OBJECT; the binding/schedule lives on that object, never on the card.** This is the
crux and it is doc-forced, not chosen:

- `METHOD_BINDING_TARGET_TYPE = area|subject|unit|topic|kind` (`@vida/types/knowledge.ts:86`) — **there is NO `card`/
  `flashcard` target level** (frozen at DB-4). ADR-005 §3.1.3: the user "binds it (`method_bindings`) to any knowledge
  object/container, choosing a curve." §3.2: grouping ("deck") = "a user-defined Knowledge object/container below a
  Topic." So a card CANNOT carry its own binding; its schedule comes from a binding on the knowledge object it reviews.
- Therefore a card **reviews a `knowledge_object`**, and the emitted `review_event` is keyed to **that object**
  (`recordReview({objectId: <reviewed knowledge_object id>})`), so the card's retention feeds the object's mastery
  (KN-10 / FC-6). `recordReview.objectId` is a no-FK ref (`BR-S4-1`) — it takes the object id. **The reviewed object is
  supplied EXPLICITLY per card by the caller** (`{cardId, objectId, quality}`) — NOT reverse-resolved from the card's
  `entity_links` (gate-1 B2): a card is a universal citizen with MANY links (provenance source FC-7, note/page links
  FC-8/FC-11), and `backlinks.getLinksFrom(cardId)` returns them undifferentiated with no "review-target" role, so
  reverse-resolution is ambiguous and unimplementable. The card→object `entity_link` still records **provenance**
  (FC-7, from `generateCards`), but the review TARGET is an explicit arg (mirrors `recordReview.objectId` already being
  explicit). `[FACT: knowledge.ts:86; ADR-005 §3.1.1; backlink-resolver.getLinksFrom (undifferentiated); review
recordReview objectId explicit no-FK]`
- **CardNotBound (FC-7)** = the supplied reviewed object has **no `method_binding`** (via `review.listBindings`) → the
  card is excluded from the due-queue (explicit, not a silent drop). `[FACT: knowledge.ts:86 (no card target); ADR-005
§3.1.3,§3.2; FC-2/FC-7; review.listBindings/dueIn (current-spec S4)]`
  > ⚠ The S7 recon initially asserted `method_bindings.target_type='flashcard'` — that value does **not** exist; this
  > headline is the corrected, enum-grounded model. Confirm the card→object review-target model at Approval 1.

**#2 — The drill is a `review` Session sub-type that flashcards REGISTERS with an EMPTY effect envelope (gate-1 B1
correction); XP/Journal is a deferred seam.** Only `focus` is shipped in the session registry
(`foundation/sessions/registry.ts:26-42`; memory [[sparse-foundation-seed-is-extension-seam-not-a-gap]] — owning
modules register their own sub-types, SS-5), so S7 registers a `review` sub-type. **But `SessionRegistry.register`
enforces (`registry.ts:94-100`): a type's declared `effects[]` ⊆ its own `permissions.allowed_effects` ⊆ the SHIPPED
envelope = `{attach_pomodoro, log_time}` (the union of `SHIPPED_SESSION_TYPES`, `registry.ts:78-79`).** A `review` type
declaring `surface_journal`/`award_xp` would throw `CapabilityEnvelopeExceeded` at wiring — those effects are outside
the shipped ceiling and no shipped type permits them. So S7 registers `review` with **`effects: []` +
`permissions: {allowed_effects: []}`** (envelope-legal: `∅ ⊆ shipped`) — the session is the run container; it fires
nothing on completion in M1. **XP/Journal-on-drill (`contract.md:33` "via review_session effects — ADR-004, not owned
here") is a documented forward seam** — it needs the sessions foundation to widen the shipped envelope (a foundation
change, out of S7 scope). The review-event emit is UNAFFECTED: it is a DIRECT `review.recordReview` engine write (NOT a
session `EffectType` — `recordReview` is a knowledge write, not one of the 12 `EFFECT_TYPE`s; `@vida/types/session.ts`).
The run: `startReview` creates a `review` session over due cards → `completeReview` emits one `review_event` per card
(direct `recordReview`) → `sessions.completeSession` (fires nothing in M1). `[FACT: sessions/registry.ts:26-42,78-79,
94-100; @vida/types/session.ts EFFECT_TYPE (no review verb); ADR-004; ADR-005 §3.1.2; SS-5]`

**#3 — FC-02 roles ride `config_schema`; there is no `roles` field.** `registerMethod({id, config_schema})` →
`review.registerMethod` builds the `kind='study_method'` capability with an EMPTY envelope (S3 precedent); the
`retention`+`gathering` roles are carried in `config_schema.roles` (the `CapabilityDefinition` has no dedicated roles
field — `capability/types.ts:18-27`). `[FACT: review/engine.ts registerMethod; capability/types.ts:18-27; FC-2]`

**#4 — Emit-only, and FC-10 durable-retry is a seam.** Flashcards NEVER computes mastery/schedule (FC-6 — enforces the
KNO-23 boundary; no mastery/curve writes). `review.recordReview` writes `review_events` + co-transactionally enqueues
`sync_queue` (already atomic). FC-10 "failed emit queued/retried/surfaced": in M1 a failed `recordReview` throws
`ReviewEmitFailed` (surfaced, never swallowed); the **durable offline retry is the sync engine (ADR-003 / M4)** — the
co-transactional enqueue IS the M1 guarantee, the retry loop is a documented forward seam, not built here.
**⚠ Decomposition drift (gate-1 B3):** `decomposition.md:102` + its seam table home FC-10 "via the effect rail +
offline queue" — but `review.recordReview` has NO `EffectRail` dep and never calls `applyEffect` (`review/types.ts`
`ReviewEngineDeps = {capability}` only; `engine.ts:220-230`). The effect rail fires only SESSION-COMPLETION effects
(deferred per headline #2), NOT the review-event emit. Per [[discontinued-impl-and-frozen-decomposition-are-reference-not-authority]]
the decomposition can itself be drift → FC-10 is **re-homed** to the direct-`recordReview` co-tx path (M1 durability =
`sync_queue`) + ADR-003/M4 retry. `[FACT: FC-6/FC-10; recordReview co-tx enqueue (repository.ts:261-289); review/types.ts
ReviewEngineDeps (no rail); decomposition.md:102 = drift; ADR-003 offline queue = M4]`

**#5 — `generateCards` creates + links; the source-extraction is caller-supplied (decoupled).** To keep flashcards from
importing the knowledge service (a service→service coupling), `generateCards({sourceRef, items:[{front, back, ...}]})`
takes the extracted card contents + the source ref, creates the cards, and links each to the source via
`spaces.createLink(cardId, sourceRef.entityType, sourceRef.entityId)` (FC-7 provenance). The live-object → card-content
extraction (reading a `definition` object's title/description, a book quote, a note) is a thin caller/orchestration
concern. `GenerateSourceUnreadable` surfaces a partial/failed gather; FC-8 — a later source delete leaves the
`entity_links` ref dangling, no-op loud (never resurrects, never errors the card). `[FACT: ADR-005 §3.1.4; FC-7/FC-8;
spaces.createLink]` (Confirm the decoupled shape vs a knowledge-reader dep at Approval 1.)

## §2. Business rules (S7-scoped, cited)

**Card content (FC-01/FC-05/FC-12):**

- **BR-S7-1** — `createCard/updateCard/getCard/listCards/deleteCard` over `flashcards`; `front`/`back` `[E]` notNull,
  `hint`/`explanation` `[E]` nullable, `media` = `json<string[]>` (serialize/parse at the boundary — the key_concepts
  precedent), `is_suspended` notNull default false (faithful-echo backfill), `sort_order` default 0, `softDelete:true`.
  `[FACT: schema/knowledge.ts:136-151; FC-1]`
- **BR-S7-2 (FC-05)** — card-type validation at author time: `card_type` ∈ CARD_TYPE (`z.enum` → `InvalidCardType` on
  miss); a `cloze` card's `front` MUST contain ≥1 cloze deletion mask (`{{…}}`) else `MalformedCloze`. (image_occlusion
  mask validation needs the media pipeline → M1 validates only the enum + cloze mask; occlusion-mask = seam.)
  `[FACT: CARD_TYPE (@vida/types); FC-5; contract.md error cases]`
- **BR-S7-3 (FC-12)** — lifecycle: `is_suspended` is the card flag (suspended = excluded from queues); `mastered` is a
  DERIVED Knowledge state, never a card column (FC-6/KN-10). `[FACT: FC-12; structure-data.md]`

**Registration (FC-02):**

- **BR-S7-4** — `registerFlashcards()` (call-once, wiring): (a) `review.registerMethod({id:FLASHCARDS_METHOD_ID,
config_schema:{roles:['retention','gathering']}})` (kind='study_method', empty envelope; dup → `DuplicateCapabilityId`
  from the capability registry); (b) register the `review` Session sub-type via the injected `SessionRegistry`
  (`owner_module:'flashcards'`, `effects:[]`, `permissions:{allowed_effects:[]}` — envelope-legal per headline #2; a
  minimal `lifecycle` scheduled→in_progress→completed; dup → `DuplicateSubType` from the SESSION registry — two
  registries, two dup errors). `registerFlashcards` guards BOTH. XP/Journal completion effects = deferred seam
  (foundation envelope widening). `[FACT: FC-2; ADR-005 §3.1.3; review.registerMethod; sessions/registry.ts:94-105
(envelope check + DuplicateSubType); capability/types.ts:53 (DuplicateCapabilityId); headline #2/#3]`

**Run (FC-03) + emit (FC-06):**

- **BR-S7-5** — `startReview(cardIds)` creates a `review` session (`sessions.createSession`, sub_type='review') over the
  supplied due cards; `completeReview(sessionId, outcomes:[{cardId, objectId, quality}])` emits **one `review_event` per
  card** via `review.recordReview({objectId, methodId:FLASHCARDS_METHOD_ID, quality})` (the reviewed `objectId` supplied
  explicitly, B2), then `sessions.completeSession(sessionId)` (fires nothing in M1 — empty envelope, headline #2).
  `[FACT: ADR-004; ADR-005 §3.1.2/5; FC-5; headline #1/#2]`
- **BR-S7-6 (FC-06)** — flashcards NEVER writes mastery/schedule/curve; it only emits `review_events`. No mastery/curve
  path exists in the service. `[FACT: FC-6; KNO-23]`
- **BR-S7-7 (FC-10)** — a failed `recordReview` throws `ReviewEmitFailed(cardId)` (surfaced, never swallowed); the
  co-transactional `sync_queue` enqueue is the M1 durability guarantee; the durable retry loop = ADR-003/M4 seam.
  `[FACT: FC-10; recordReview co-tx; ADR-003]`

**Due-queue (FC-07/FC-09):**

- **BR-S7-8** — flashcards does NOT own a scheduler; it reads Knowledge's provider. `dueCards(items:[{cardId,
objectId}], at?)` calls `review.dueIn(objectId, at)` per item (the reviewed object supplied explicitly, B2) — a card
  whose object has no binding is **CardNotBound** (excluded, explicit); a suspended card is excluded. `[FACT: FC-9/FC-7;
review.dueIn; headline #1]`

**Universal citizen (FC-11) + gather (FC-04/FC-08):**

- **BR-S7-9 (FC-11)** — `tagCard(cardId, tagId)` → `spaces.tagEntity(tagId,'flashcard',cardId)` (guard tag resolves —
  the S2 blind-insert guard); `linkCard(cardId, targetRef)` → `spaces.createLink(cardId, …)`; `listCardLinks(cardId)` →
  `backlinks.getLinksFrom(cardId)`. `flashcard` is pre-registered in ENTITY_TYPES (`_registry.ts:83`). `[FACT: FC-8/FC-11;
ADR-006 SP1; _registry.ts:83; [[spaces-junctions-split-read-write-tagentity-blind-inserts]]]`
- **BR-S7-10 (FC-04/FC-08)** — `generateCards({sourceRef, items})` creates cards + links each to `sourceRef` via
  `spaces.createLink`; `GenerateSourceUnreadable` on a failed gather (partial surfaced). A later source delete leaves the
  link dangling (FC-8, no-op loud). `[FACT: ADR-005 §3.1.4; FC-7/FC-8; headline #5]`

**Constitution:**

- **BR-S7-11** — typed errors only (`InvalidCardType`/`MalformedCloze`/`ReviewEmitFailed`/
  `GenerateSourceUnreadable`/`FlashcardNotFoundError`); **`CardNotBound` is an exclusion CONDITION, not a thrown error**
  (`contract.md:36` "not an error state" — `dueCards` drops unbound cards, still visible in browse; §XXVIII impl
  correction); optimistic revert (LF-2); M1.0 `encryptedFields:[]`
  ([E] front/back/hint/explanation → M3). `[FACT: contract.md error cases; FC constitution]`

## §3. Contract (surface)

**Home:** `packages/core/src/services/flashcards/` (net-new: `service.ts`, `types.ts`, `index.ts`, `__tests__/`).
Validators in `validators/knowledge.ts` (the module's shared validator file) or a new `validators/flashcards.ts` —
propose colocating in `validators/knowledge.ts` (flashcards is a knowledge sub-context).

**Deps (`FlashcardsServiceDeps`):**

```ts
db: DrizzleDb
deviceId: string
review: ReviewEngine // recordReview / dueIn / listBindings / registerMethod (S3/S4)
spaces: SpacesService // createLink / tagEntity (writes)
backlinks: BacklinkResolver // getLinksFrom (reads)
sessions: SessionsService // review-session run (create/complete)
sessionRegistry: SessionRegistry // register the 'review' sub-type (SS-5)
```

**Methods (`FlashcardsService`):**

```ts
registerFlashcards(): Promise<void>                       // FC-02 wiring: study_method capability + 'review' sub-type
createCard(input): Promise<Flashcard>                     // FC-01/05 (validated; media json boundary)
updateCard(id, patch): Promise<Flashcard>
getCard(id): Promise<Flashcard | null>
listCards(filter?): Promise<Flashcard[]>                  // soft-del filtered; by is_suspended/card_type
deleteCard(id): Promise<void>                             // soft delete
tagCard(cardId, tagId): Promise<EntityTagRow>            // FC-11
linkCard(cardId, targetRef, context?): Promise<EntityLinkRow> // FC-11 (incl. the reviewed knowledge_object)
listCardLinks(cardId): Promise<EntityLinkRow[]>          // FC-11
generateCards({sourceRef, items}): Promise<Flashcard[]> // FC-04/08 (create + link source; GenerateSourceUnreadable)
startReview(cardIds): Promise<Session>                    // FC-03 create 'review' session
completeReview(sessionId, outcomes: {cardId, objectId, quality}[]): Promise<ReviewEvent[]> // FC-03/06 one review_event/card (objectId explicit, B2) + complete session
dueCards(items: {cardId, objectId}[], at?): Promise<Flashcard[]> // FC-07/09 via review.dueIn(objectId) per item; unbound object → excluded (CardNotBound)
```

Result/error types (service-layer): `InvalidCardType`, `MalformedCloze`, `ReviewEmitFailed`,
`GenerateSourceUnreadable`, `FlashcardNotFoundError`. Validators: `CreateCardSchema`, `UpdateCardSchema`,
`GenerateCardsSchema`. Constant `FLASHCARDS_METHOD_ID='flashcards'`, `REVIEW_SESSION_SUB_TYPE='review'`.
**No schema, no new dep** (flashcards table + all substrates shipped). `@vida/types` `Flashcard` exists; service-layer
input types (`ReviewOutcome={cardId,objectId,quality}`, `CardSourceRef`) live in `services/flashcards/types.ts` (not
@vida/types — the MasterySource precedent). **Imports:** `Session` from `../sessions` / `services/sessions/types.ts`
(@vida/core — NOT @vida/types, N2); `ReviewEvent` from `@vida/types`; `EntityTagRow`/`EntityLinkRow` mirroring the
knowledge service import (`services/knowledge/service.ts:366,376,390`); `SessionRegistry` from `../../foundation/sessions`.

## §4. Acceptance (Verification Gate — live-store, Node 24)

1. Card CRUD + faithful echo + `media` JSON round-trip + soft-delete + `card_type` filter.
2. FC-05: `basic` ok; `cloze` without `{{…}}` → `MalformedCloze`; unknown type → `InvalidCardType`.
3. FC-02: `registerFlashcards` registers the study_method capability (`review.listMethods` shows it, `config_schema.roles`)
   - the `review` sub-type (a `review` session can be created).
4. FC-03/06: `startReview`→`completeReview` emits one `review_event` per card keyed to the card's reviewed object
   (`review.recordReview`), then completes the session; a card with no reviewed-object link → excluded/typed.
5. FC-07/09: `dueCards` — a card whose reviewed object has a binding + is due → included; an unbound object → excluded
   (CardNotBound); suspended card → excluded. (via real `review` engine + a bound object.)
6. FC-11: `tagCard`/`linkCard`/`listCardLinks` round-trip (real spaces/backlinks; `entity_type='flashcard'`); tag-guard.
7. FC-04/08: `generateCards` creates cards + links to source; source delete leaves a dangling link (card survives).
8. FC-10: a forced `recordReview` failure → `ReviewEmitFailed` (surfaced). sync_queue enqueue on card create.
   Gate: full `@vida/core` suite green (≥1413 + new), tsc 0, eslint 0, gitleaks clean. §XXIX currency.

## §5. Implementation prompt (build steps)

1. `validators/knowledge.ts` — `CreateCardSchema`/`UpdateCardSchema` (card_type enum; cloze-mask refine → MalformedCloze),
   `GenerateCardsSchema`.
2. `services/flashcards/types.ts` — `FlashcardsServiceDeps`, `FlashcardsService`, the 6 errors, service-layer input types,
   constants. Import `Flashcard`/`EntityTagRow`/`EntityLinkRow`/`ReviewEvent`/`Session` + substrate types.
3. `services/flashcards/service.ts` — factory-object (no `this.`); `flashcardsRepo` (softDelete, encryptedFields:[]);
   `toFlashcard` row view (`media` parse + `_sync_status` cast); the 13 methods per §2; register in the returned object.
4. `services/flashcards/index.ts` — barrel (`export * from './types'; export * from './service'`).
5. Tests — new `services/flashcards/__tests__/service.test.ts` (Node 24 live-store; wire review/spaces/backlinks/sessions/
   sessionRegistry per the knowledge harness recipe); the §4 suite.
6. §XXIX currency — new `docs/modules/flashcards/current-{spec,business-rules}.md` OR an S7 section under
   `docs/modules/knowledge/current-*` (propose the latter — flashcards is a knowledge sub-context). Commit together.

## Open items for the gate (confirm at Approval 1)

- **Headline #1** — the card→knowledge_object review-target model (binding on the object, not the card; enum-forced).
  **Gate-1 CONFIRMED correct + doc-forced** — the load-bearing interpretation holds; the reviewed `objectId` is now
  supplied explicitly per card (B2), not reverse-resolved.
- **Headline #5** — `generateCards` decoupled (caller-supplied content) vs a knowledge-reader dep. Gate-1: reasonable.
- **Headline #2** — the `review` sub-type registers with an EMPTY envelope (B1); XP/Journal-on-drill deferred.
- **Currency home** — flashcards S7 section under `docs/modules/knowledge/current-*` vs a new `docs/modules/flashcards/`
  (propose the former — flashcards is a knowledge sub-context).

## Gate-1 status

- **Verdict: REVISE → folded (2026-09-29).** Independent critic CONFIRMED headline #1 (card→object review model) as
  correct + doc-forced, headlines #3/#5 sound, all 12 legs homed (no phantom/double), `flashcard` pre-registered, home
  `services/flashcards/` sound. Folded 3 blockers + 2 NITs:
  - **B1 (would throw at wiring)** — `SessionRegistry.register` enforces declared effects ⊆ own envelope ⊆ the shipped
    ceiling `{attach_pomodoro, log_time}` (`registry.ts:78-79,94-100`); a `review` type declaring `surface_journal`/
    `award_xp` throws `CapabilityEnvelopeExceeded`. → register `review` with `effects:[]`/`allowed_effects:[]`
    (envelope-legal); XP/Journal-on-drill = deferred foundation-envelope seam. Headline #2 + BR-S7-4 rewritten.
  - **B2** — a card has MANY `entity_links` (provenance/notes/reviewed); `getLinksFrom` is undifferentiated → the
    reviewed object can't be reverse-resolved. → thread `objectId` explicitly per card (`completeReview` outcomes +
    `dueCards` items). Headline #1 mechanics + BR-S7-5/8 + §3 updated.
    - **B3** — `decomposition.md:102` homes FC-10 "via the effect rail"; `recordReview` has no rail dep → decomposition
      drift, FC-10 re-homed to the direct co-tx path + ADR-003/M4. Headline #4 flags it.
  - **N2** — `Session` imports from `@vida/core` sessions types, not `@vida/types`. **N4** — two registries → two dup
    errors (`DuplicateCapabilityId` + `DuplicateSubType`); `registerFlashcards` guards both.
- Confirmed-sound vs disk: `METHOD_BINDING_TARGET_TYPE` has no card level (`knowledge.ts:86`); `recordReview` objectId
  no-FK direct write (`engine.ts:220-230`); `flashcard` in ENTITY_TYPES (`_registry.ts:83`); schema cols 1:1 (`:136-151`).

## Preflight + Gate-2 status

- **Preflight PASSED (2026-09-29).** All substrate shapes + enum values resolve: `CreateSessionInput` requires
  `sub_type`+`scheduling_mode`(SCHEDULING_MODE=attended|planned|ad_hoc)+`status`(SESSION_STATUS); `startReview` passes
  `{sub_type:'review', scheduling_mode:'ad_hoc', status:'in_progress'}`, NO extension (extension is focus|study only →
  `review` returns `{session, extension:null}`) — the focus-session precedent (`sessions-service.test.ts:125-128`).
  `Session`/`SessionRegistry`/`createSessionRegistry` all export from `@vida/core`.
- **Gate-2: SHIP (2026-09-29).** Confirmation critic CONFIRMED all 3 folds correct + the run/registration path
  executable: (B1) `effects:[]`/`allowed_effects:[]` passes the containment check trivially, `review` registers, then
  `createSession('review')` resolves (must register first — `SessionTypeNotFound` otherwise); the 4-dim def
  (attachment_defaults/effects/lifecycle{scheduled→in_progress→completed}/permissions) is complete; XP/Journal defer is
  a genuine foundation-envelope seam, not a dropped behavior. (B2) explicit-objectId consistent across §1/§2/§3/§4;
  matches `RecordReviewSchema` + `dueIn`. (B3) `ReviewEngineDeps={capability}` only — no rail — so the decomposition-drift
  flag is right. N2/N4 correct. Folded the one NIT (method count 14→13). No new contradiction; all 12 legs homed.
