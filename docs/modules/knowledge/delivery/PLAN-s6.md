# PLAN — mod-knowledge S6: Pages-notes + Compound sets + Lab + AI/search/ingestion seams

> §XXVI gate-1 spec. Slice S6 of 8 (`decomposition.md:30,83-90`). Legs: **KNO-28,31,32,33,34,35,36,37,43** (9).
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.
> **This slice authors no schema** — `compound_sets` + `knowledge_lab_entries` already ship in `022_knowledge`
> (`schema/knowledge.ts:108,124`) with their `@vida/types` interfaces authored at S1 (DB-11 reconcile). S6 adds
> **validators + service methods + service-layer result types + three composed substrate seams.**

## §1. Context

S1–S5 shipped the kind registry, object hierarchy, containers/references, link/tag cross-cut, the generic review
engine (methods/curves/bindings/due/record/derive/rollup), and the cross-module mastery source. **S6 is the "content
& reach" slice**: it gives a knowledge object its written note, ships the per-consumer compound-set builder, builds the
Knowledge Lab (hypothesis→conclusion→promoted object), and homes three forward/opt-in surfaces (AI-assist, FTS5
search, auto-population) as explicit deny-safe seams.

The two owned tables are shipped but service-less:

- `compound_sets` (`schema/knowledge.ts:108-121`): `consumer_module` (OPEN, notNull), `name` `[E]`, `spec` `[E]` JSON
  opaque blob, `is_default` (notNull default false), `deleted_at`. `@vida/types` `CompoundSet` (`knowledge.ts:161`).
- `knowledge_lab_entries` (`schema/knowledge.ts:124-133`): `hypothesis` `[E]` notNull, `data_refs` `json<string[]>()`,
  `conclusion` `[E]`, `promoted_object_id` (no-FK, nullable), `deleted_at`. `@vida/types` `KnowledgeLabEntry`
  (`knowledge.ts:173`).

Persistence follows the module norm: DB-6 `createRepository`, `encryptedFields:[]` (M1.0 pass-through — the `[E]`
fields land at M3/DB-5), `softDelete:true`; `create()` echoes the input row → serializers backfill notNull-defaults +
coalesce nullables (faithful echo, `repository-create-returns-input-row` seam). Both `spec` and `data_refs` hit the
**service-side serialize/parse boundary** ([[json-t-columns-need-service-serialize-in-m10]], the S1 `key_concepts`
precedent — `service.ts:76-96,193`), because the M1.0 repo does not auto-serialize non-encrypted values — though for
**different reasons** (N4): `data_refs` is a `json<string[]>()` column (the `$type` lie), while `spec` is a plain
`text()` column that happens to hold a JSON blob. Behaviour is identical (stringify on write, parse on read); the _cause_
differs. **M3 forward note (N3):** `spec` is `[E]`, so when field-encryption activates (M3/DB-5) the encrypt path will
serialize it — the M1 service-side `JSON.stringify` must NOT double-stringify then ("No M3 double-stringify",
[[json-t-columns-need-service-serialize-in-m10]]).

### Interpretation headlines (the resolved open questions)

**#1 — The knowledge note is keyed on `entity_type`, NOT a new `PageType`.** Every source states a knowledge note is
"a `pages` row of the knowledge **`entity_type`**" (`conventions.md:14-15`, `structure-data.md:44`, `contract.md:37-39`,
`business-rules.md` KN-5:30-33). `PAGE_TYPE` (`@vida/types/note.ts:23-31`: `journal|note|task_note|task_group_note|
milestone_note|deliverable_note`) has **no** knowledge member, and the docs never call for one — KN-5's distinguisher
is the `entity_type`, and `knowledge_object` is **pre-registered** in the taggable/pages registry
(`db/schema/_registry.ts:80`). So `openObjectNote(objectId)` = `notes.ensureEntityNote('note',
KNOWLEDGE_OBJECT_ENTITY_TYPE, objectId, seed)` (`services/notes/types.ts:68-73`) — reusing the generic `'note'`
PageType with the knowledge `entity_type` as the KN-5 distinguisher. **Adding a `knowledge_note` PAGE_TYPE would be an
unbacked cross-package `@vida/types` + enum-parity change the docs do not sanction** — the convention closes it
(`[[stale-source-plus-live-convention-is-fact-not-a-decision]]`; the note-render personalization is P6, keyed off
`entity_type`). `[FACT: conventions.md:14-15; structure-data.md:44; contract.md:37-39; note.ts:23-31; _registry.ts:80;
services/notes/types.ts:68-73 (ensureEntityNote idempotent)]`

**#2 — `notes` is a REQUIRED dep; `ai`/`ingestion` are OPTIONAL deny-safe deps.** `openObjectNote` is a core S6 verb
over the shipped `services/notes` substrate — not a dormant seam — so `notes: NotesService` joins `spaces`/`backlinks`/
`review` as a **required** dep (the S2/S3 mid-build required-dep precedent: each slice wired its substrate in the test
`setup()`; no app consumes the service in M1, only tests construct it). AI-assist (KNO-33) and auto-population (KNO-43)
are **opt-in, extension-model, M1-dormant** → `ai?: AiService` and `ingestion?: IngestionGuard` are **optional**,
default-absent, deny-safe when absent (the habits `effects?`/`associations?` + gamification `rail?`/`registry?`
optional-dormant-port precedent, `services/habits/types.ts:40-51`, `services/gamification/types.ts:30-37`). `[FACT:
services/knowledge/service.ts:110-112 (current deps); habits/gamification optional-port precedent; decomposition.md:87,90
(ai/ingestion = deny-safe); ai/service.ts:32-36 + ingestion/guard.ts:33-34 (M1 ports absent ⇒ deny)]`

**#3 — The three M1-dormant surfaces return TYPED "unavailable"/"refused" states, never silent fallback — but each
substrate's M1 behaviour differs and must be composed against its REAL branch logic (gate-1 B1/B2 correction).**

- **Search (KNO-37):** no FTS5 (`fts_knowledge` = DB-8, unbuilt, `structure-data.md:46`) → `{status:'search-unavailable'}`.
- **AI (KNO-33):** `assistCompoundSet` depends only on the injected `AiService.askModel` **contract**: `askModel`
  **throws `AiDenied`** (never returns a denial — `ai/service.ts:72,88`, `types.ts:132-142`), so the service catches it
  → `{status:'ai-unavailable', reason}`; the absent-`ai` default → `{status:'ai-unavailable'}` (no reason). M1
  deny-safety is a **property of the real `createAiService`** (both ports absent, `service.ts:35-36`) — but note the real
  factory is `createAiService(egressGuard: EgressGuard, ports?)` (`service.ts:32`, EgressGuard is a REQUIRED first arg),
  so S6's **test wires a throwing `AiService` stub**, NOT a real service (no `EgressGuard` construction is in S6 scope).
  `suggestion` maps from `AiResponse.content` (`ai/types.ts:72-74`).
- **Ingestion (KNO-43):** `checkIngestion` returns `IngestionDecision { permitted, reason?, disclosure? }`
  (`ingestion/guard.ts:48-81`, `types.ts:95-101`) — a `permitted` boolean, **NOT** a `{status}` shape; `autoPopulate`
  **maps** it: `!permitted → refused`, `permitted → parser-unavailable`. Critically, `checkIngestion` **does not touch
  the mediator** (that deny lives only in `fetchThroughMediator`, `guard.ts:117-122`, which `autoPopulate` does not
  call). A real guard permits only a **well-formed non-sensitive act with `external_in` granted** (`enforcer.ts:77-78`,
  `grant.external_in_ok`); an ungranted/sensitive/server-plaintext act trips a guard → `refused`. **S6 owns the
  MAPPING, not the guard's grant logic (that is xs-ingestion #44's tested territory)** — so the mapping tests inject
  **stub `IngestionGuard`s** (parity with the ai throwing-stub decision, B2): a stub returning `{permitted:true,
  disclosure}` → asserts `parser-unavailable` (the real M1 seam — no source parsers built, `decomposition.md:90`); a
  stub returning `{permitted:false, reason, disclosure}` → asserts `refused`.
  `[FACT: apps/web/src/shell/use-command-search.test.ts:16; decomposition.md:89,90; structure-data.md:46; ai/service.ts:
32,35-36,72,88; ai/types.ts:72-74; ingestion/guard.ts:48-81,117-122; ingestion/types.ts:77-82,95-101]`

**#4 — `promoteToObject` requires a CONCLUDED, un-promoted entry; the `lab.concluded` EVENT is S8, not S6.** KNO-36
promotes a concluded lab entry into a catalog `knowledge_object` and stamps `promoted_object_id`. The
`decomposition.md:88` "(emits `lab.concluded` → new object)" **event fan-out is S8** (`decomposition.md:32,108` — the
guarded post-commit producer; `lab.concluded` is a domain-event NAME populating `EffectEvent.transition`, not built
here). S6 builds the state transition (create object + stamp the FK); the emission is a documented forward seam. Guards:
promote rejects a not-yet-concluded entry (`conclusion == null`) and a re-promote (`promoted_object_id != null`).
`[FACT: contract.md:47-49; parts/knowledge.md:51 (KNO-36); decomposition.md:88 (event) vs :32,108 (S8 owns fan-out);
schema/knowledge.ts:130-131 (conclusion, promoted_object_id)]`

**#5 — `compound_sets.spec` is an opaque structured blob serialized at the service boundary.** `spec` = "rules +
methods + params" (`structure-data.md:42`, `contract.md:43-45`), stored `[E]` as an opaque JSON blob
(`schema/knowledge.ts:29,116`), typed `string | null` at rest (`@vida/types/knowledge.ts:167`). The builder accepts a
**structured** `spec: CompoundSetSpec` (`Record<string, unknown>` — the internals are the user's open rules, not
modeled here) and JSON.stringify's it to the column (the `key_concepts` json boundary); reads parse it back into the
service-layer view. No CHECK on `consumer_module` (OPEN vocab, [[open-vocab-columns-take-no-sql-check]]). `[FACT:
structure-data.md:42; contract.md:43-45; schema/knowledge.ts:29,112,116; @vida/types/knowledge.ts:161-169; service.ts:
76-96 (json boundary precedent)]`

## §2. Business rules (S6-scoped, cited)

**Pages-notes (KNO-28):**

- **BR-S6-1** — `openObjectNote(objectId)` guards the object exists (`KnowledgeObjectNotFoundError`) then delegates to
  `notes.ensureEntityNote('note', KNOWLEDGE_OBJECT_ENTITY_TYPE, objectId, {title})`; **idempotent** (returns the
  existing note or creates one — `ensureEntityNote` semantics). NEVER a `knowledge_notes` insert (retired, KN-5).
  `[FACT: contract.md:37-39; business-rules.md KN-5:30-33; services/notes/service.ts:159-177; headline #1]`
- **BR-S6-2** — the seed carries the object's `title`, which the notes service folds into the page **`content`** (an H1
  via `seedContent`), NOT the page `title` column — the note's editable title/render is P6 (KN-5). `[FACT:
services/notes/service.ts:41-45 (seedContent → content),171-176 (ensureEntityNote sets content, not title);
types.ts:40-45 (EntityNoteSeed); conventions.md:14-15]` (§XXVIII: live-gate correction — the plan first assumed
  `seed.title → page.title`; the shipped notes contract folds it into content.)

**Compound sets (KNO-31/32):**

- **BR-S6-3** — `buildCompoundSet(consumerModule, spec)` creates a `compound_sets` row (`is_default:false`), `spec`
  JSON-serialized at the boundary; `consumer_module` OPEN (no CHECK). `[FACT: contract.md:43-45; structure-data.md:42;
schema/knowledge.ts:108-121; headline #5]`
- **BR-S6-4** — `applyDefaultCompoundSet(consumerModule)` is **anti-lost + idempotent**: if a default set already
  exists for the consumer it is returned unchanged; else a default (`is_default:true`) is created so no user is forced
  to personalize (KN-11 / ED-15 family). `[FACT: business-rules.md KN-11:56-59; conventions.md:21-22; contract.md:43-45]`
- **BR-S6-5** — `listCompoundSets(consumerModule)` reads the consumer's live sets (soft-delete filtered), `spec` parsed
  on read. Companion. `[FACT: schema/knowledge.ts:120 (consumer index); repository findWhere soft-delete note]`

**AI-assist seam (KNO-33) — extension-model, deny-safe:**

- **BR-S6-6** — `assistCompoundSet(consumerModule, req)` composes the OPTIONAL `ai` dep against the `AiService.askModel`
  contract: if `ai` absent → `{status:'ai-unavailable'}` (no reason); else call `ai.askModel(req)` (the caller supplies
  the `AiRequest` carrying mode + consent/`userInitiation`), **catching the thrown `AiDenied`** (askModel throws, never
  returns a denial) → `{status:'ai-unavailable', reason: err.message}`; on success → `{status:'ready', suggestion:
response.content}`. **Opt-in** (caller wires `ai` + passes a request), **consent-gated** (the request carries the
  never-auto-transmit proof), **deny-safe** (the real `createAiService` denies with both ports absent — but S6 asserts
  this via a throwing stub, no `EgressGuard` in scope). Knowledge never auto-applies a suggestion and never holds a
  model key. `[FACT: contract.md:44-45; business-rules.md KN-11:58-59 (extension-model only); ai/types.ts:72-74,83-94,
144-151; ai/service.ts:32,35-36,72,88; decomposition.md:87; headline #2/#3]`

**Knowledge Lab (KNO-34/35/36):**

- **BR-S6-7** — `createLabEntry({hypothesis, dataRefs?})` creates a `knowledge_lab_entries` row; `hypothesis` `[E]`
  notNull (validator rejects empty); `data_refs` JSON-serialized at the boundary; `conclusion`/`promoted_object_id`
  null at birth. `[FACT: contract.md:47-49; schema/knowledge.ts:124-133; @vida/types/knowledge.ts:173-182]`
- **BR-S6-8** — `concludeLabEntry(id, conclusion)` sets `conclusion` `[E]`; guards the entry exists
  (`LabEntryNotFoundError`). Re-conclude is allowed (a conclusion may be revised — no immutability rule stated).
  `[FACT: contract.md:47-49; parts/knowledge.md:50]`
- **BR-S6-9** — `promoteToObject(entryId, {kindId, parentObjectId?})` requires a **concluded** (`conclusion != null` →
  else `LabEntryNotConcludedError`) **un-promoted** (`promoted_object_id == null` → else `LabEntryAlreadyPromotedError`)
  entry; creates a `knowledge_object` (via `createObject`: `title`=hypothesis, `description`=conclusion, `kind_id`,
  optional parent) then stamps `promoted_object_id` on the entry. The `lab.concluded` **event is S8** (headline #4).
  `[FACT: contract.md:47-49; parts/knowledge.md:51; decomposition.md:88 vs :32,108; service.ts:183-203 (createObject)]`
- **BR-S6-10** — `listLabEntries()` reads live entries (soft-delete filtered), `data_refs` parsed. Companion.

**Search seam (KNO-37) — DB-8 deferred:**

- **BR-S6-11** — `searchKnowledge(query)` returns `{status:'search-unavailable'}` (typed, loud); `fts_knowledge` FTS5 is
  DB-8 and unbuilt. Never a silent empty list. `[FACT: contract.md:51; structure-data.md:46; decomposition.md:89;
apps/web search-unavailable convention; headline #3]`

**Auto-population seam (KNO-43) — ingestion, opt-in device-side deny-safe:**

- **BR-S6-12** — `autoPopulate(act)` composes the OPTIONAL `ingestion` dep and **maps** `checkIngestion`'s
  `IngestionDecision` (a `permitted` boolean, not a `{status}` shape): if `ingestion` absent →
  `{status:'ingestion-unavailable'}`; else `const d = await ingestion.checkIngestion(act)` → `if (!d.permitted) return
{status:'refused', reason: d.reason, disclosure: d.disclosure}` (never downgrade); **else** (`d.permitted`) →
  `{status:'parser-unavailable'}` (source parsers are deferred, `decomposition.md:90`). With a real guard, a permit
  requires a **well-formed non-sensitive act AND an `external_in` grant** (`enforcer.ts:77-78`); an ungranted /
  server-plaintext / unconsented-sensitive act trips a `checkIngestion` guard → `refused`. S6 tests the MAPPING via stub
  guards (the guard's grant logic is #44's concern; parity with the ai stub). **Opt-in** (caller wires `ingestion` +
  passes the `IngestionAct` with consent), **device-side**,
  **deny-safe/refuse-not-downgrade**. `[FACT: business-rules.md:83 (K9 device-side opt-in); conventions.md:43-44;
parts/knowledge.md:58; ingestion/guard.ts:48-81 (checkIngestion, no mediator),117-122 (mediator only in fetch);
ingestion/types.ts:77-82,95-101; decomposition.md:90 (source parsers deferred); headline #3]`

**Constitution (all methods):**

- **BR-S6-13** — typed errors only; optimistic writes revert on failure (KNO-41, LF-2). No silent loss; a deny-safe
  seam surfaces its typed unavailable/refused state, it does not swallow. `[FACT: contract.md:73-76; parts/knowledge.md:56]`

## §3. Contract (surface additions)

**Deps (`KnowledgeServiceDeps` extends):**

```ts
notes: NotesService              // REQUIRED — openObjectNote (headline #2)
ai?: AiService                   // OPTIONAL deny-safe — assistCompoundSet (KNO-33)
ingestion?: IngestionGuard       // OPTIONAL deny-safe — autoPopulate (KNO-43)
```

**Methods (`KnowledgeService` extends):**

```ts
// Pages-notes (KNO-28)
openObjectNote(objectId): Promise<PageRow>                     // ensureEntityNote('note','knowledge_object',id,{title}); idempotent; guards object

// Compound sets (KNO-31/32)
buildCompoundSet(consumerModule, spec): Promise<CompoundSet>  // is_default:false; spec JSON boundary
applyDefaultCompoundSet(consumerModule): Promise<CompoundSet> // anti-lost idempotent default (is_default:true)
listCompoundSets(consumerModule): Promise<CompoundSet[]>      // companion read; spec parsed

// AI-assist (KNO-33) — extension-model, deny-safe
assistCompoundSet(consumerModule, req: AiRequest): Promise<AiAssistResult>

// Knowledge Lab (KNO-34/35/36)
createLabEntry({hypothesis, dataRefs?}): Promise<KnowledgeLabEntry>   // data_refs JSON boundary
concludeLabEntry(id, conclusion): Promise<KnowledgeLabEntry>         // guards exists
promoteToObject(entryId, {kindId, parentObjectId?}): Promise<KnowledgeObject> // concluded+un-promoted; stamps FK
listLabEntries(): Promise<KnowledgeLabEntry[]>                        // companion; data_refs parsed

// Search seam (KNO-37) — DB-8
searchKnowledge(query): Promise<KnowledgeSearchResult>               // {status:'search-unavailable'}

// Auto-population seam (KNO-43) — ingestion
autoPopulate(act: IngestionAct): Promise<AutoPopulateResult>        // deny-safe/refuse-not-downgrade
```

**Service-layer result types** (in `services/knowledge/types.ts`, NOT `@vida/types` — the `MasterySource` precedent):

```ts
type CompoundSetSpec = Record<string, unknown> // opaque structured blob (headline #5)
type AiAssistResult = { status: 'ready'; suggestion: string } | { status: 'ai-unavailable'; reason?: string }
type KnowledgeSearchResult = { status: 'search-unavailable' } // DB-8 seam (extends when FTS5 lands)
type AutoPopulateResult =
  | { status: 'refused'; reason: IngestionDenyReason; disclosure?: LeakDisclosure }
  | { status: 'parser-unavailable' }
  | { status: 'ingestion-unavailable' }
```

**New typed errors:** `LabEntryNotFoundError`, `LabEntryNotConcludedError`, `LabEntryAlreadyPromotedError`.

**New validators (`validators/knowledge.ts`):** `BuildCompoundSetSchema` ({consumer_module, spec, name?}),
`CreateLabEntrySchema` ({hypothesis (min 1), data_refs?}), `ConcludeLabEntrySchema` ({conclusion (min 1)}),
`PromoteToObjectSchema` ({kind_id, parent_object_id?}).

**No `@vida/types` change** — `CompoundSet`/`KnowledgeLabEntry` interfaces + `PageRow` already exist. **No schema, no
new dep** (notes/ai/ingestion are all shipped substrates).

## §4. Acceptance (Verification Gate — live-store, Node 24)

Functional, live-store (`better-sqlite3`), added to `services/knowledge/__tests__`:

1. **openObjectNote** — creates a `pages` row (`entity_type='knowledge_object'`, `type='note'`, `entity_id=objectId`,
   the object title folded into `content` as an H1 — NOT the title column, per the notes contract); **idempotent** (2nd
   call returns the same page id); guards a bogus object → `KnowledgeObjectNotFoundError`. (via a real `createNotesService`)
2. **buildCompoundSet** — row persists; `spec` round-trips (structured object in → parsed object out, not a string);
   `consumer_module` free-form. **applyDefaultCompoundSet** — first call creates an `is_default:true` set; second call
   returns the SAME set (idempotent, no duplicate). **listCompoundSets** — consumer-scoped, soft-delete filtered.
3. **assistCompoundSet** — with **no `ai` dep** → `{status:'ai-unavailable'}`; with an `ai` that throws `AiDenied` →
   `{status:'ai-unavailable', reason}` (the M1 deny-safe path); no auto-apply.
4. **Lab** — `createLabEntry` persists (hypothesis + `data_refs` JSON round-trip); `concludeLabEntry` sets conclusion +
   guards missing → `LabEntryNotFoundError`; `promoteToObject` on a concluded entry creates an object (title=hypothesis,
   description=conclusion) + stamps `promoted_object_id`; promote on an **un-concluded** entry →
   `LabEntryNotConcludedError`; promote on an **already-promoted** entry → `LabEntryAlreadyPromotedError`. `listLabEntries`
   soft-delete filtered.
5. **searchKnowledge** — any query → `{status:'search-unavailable'}` (never throws, never empty-list).
6. **autoPopulate** (mapping tests via stub `IngestionGuard`s — S6 owns the mapping, not the guard's grant logic) —
   with **no `ingestion` dep** → `{status:'ingestion-unavailable'}`; with a stub `checkIngestion` returning
   `{permitted:true, disclosure}` → `{status:'parser-unavailable'}` (the real M1 seam — no parsers built); with a stub
   returning `{permitted:false, reason:'server_proxy_refused', disclosure}` → `{status:'refused', reason, disclosure}`.
   (Do NOT assert a mediator-absence deny — `checkIngestion` never calls the mediator; a real guard's permit is
   grant-gated, which is xs-ingestion #44's tested territory, not S6's.)
7. **sync_queue** — a create (compound set / lab entry) co-transactionally enqueues (repository UPSERT).

Gate: full `@vida/core` suite green (≥ 1392 + new), `pnpm typecheck` 0, `pnpm lint` 0, `gitleaks` clean. §XXIX
currency (`current-spec.md` + `current-business-rules.md` S6 sections) before commit.

## §5. Implementation prompt (build steps)

1. **`@vida/types`** — none (interfaces exist). Confirm `CompoundSet`/`KnowledgeLabEntry`/`PageRow` imports.
2. **`validators/knowledge.ts`** — add `BuildCompoundSetSchema`, `CreateLabEntrySchema`, `ConcludeLabEntrySchema`,
   `PromoteToObjectSchema` (Zod; min-length on `[E]` free-text; `data_refs`/`spec` as structured inputs).
3. **`services/knowledge/types.ts`** — extend `KnowledgeServiceDeps` (`notes` required; `ai?`/`ingestion?` optional);
   add `CompoundSetSpec`, `AiAssistResult`, `KnowledgeSearchResult`, `AutoPopulateResult`, the 3 lab errors; extend the
   `KnowledgeService` interface with the 10 methods; import `NotesService`/`AiService`/`AiRequest`/`AiResponse`/
   `IngestionGuard`/`IngestionAct`/`IngestionDecision`/`IngestionDenyReason`/`LeakDisclosure` (type-only from their
   substrate barrels) + `PageRow` **type-only from `../../db/schema/notes`** (NOT the `services/notes` barrel — it is
   `typeof pages.$inferSelect`, not re-exported there). Add `toCompoundSet`/`toLabEntry` row
   views (the `_sync_status` union cast + JSON parse — `[[drizzle-row-not-assignable-to-vida-types-interface]]`).
4. **`services/knowledge/service.ts`** — destructure `notes, ai, ingestion`; add `compoundSetsRepo`/`labEntriesRepo`
   (`softDelete:true`, `encryptedFields:[]`); implement the 10 methods per §2. JSON serialize/parse `spec` + `data_refs`
   at the boundary (one cast each, commented — the `key_concepts` precedent). Register all methods in the returned object.
5. **Tests** — extend `services/knowledge/__tests__/service.test.ts` `setup()` to wire a real `createNotesService`
   (+ its `registry`/`spaces`/`backlinks`), plus opt-in `ai`/`ingestion` stubs for the deny-safe assertions; add the §4
   suite. Run under Node 24.
6. **§XXIX currency** — promote §2/§3 into `current-spec.md` + `current-business-rules.md` (S6 sections), commit together.

## Gate-1 status

- **Verdict: REVISE → folded (2026-09-29).** Independent critic confirmed all 5 headlines doc-grounded + SHIP-quality,
  clean 9-leg partition (0 unhomed/double/phantom), and the search/AI seams faithful. Folded 3 blockers + 2 NITs:
  - **B1** — `autoPopulate` was mis-composed against a phantom `checkIngestion` return shape + a mediator-deny that
    never fires. Re-grounded in `guard.ts:48-81`: `checkIngestion` returns `IngestionDecision{permitted,…}` (service
    maps it) and does NOT touch the mediator → M1 permitted-act lands on `parser-unavailable` (the real seam);
    `refused` only on a tripped guard. Headline #3 + BR-S6-12 + acceptance #6 rewritten.
  - **B2** — `askModel` THROWS `AiDenied` (not a returned denial); `createAiService(egressGuard,…)` needs an EgressGuard,
    so S6 asserts deny-safety via a throwing stub; `suggestion = AiResponse.content`. BR-S6-6 + headline #3 corrected.
  - **B3** — `PageRow` is `typeof pages.$inferSelect` (`db/schema/notes.ts:110`), not re-exported from the notes barrel →
    import type-only from `../../db/schema/notes`. §5 step 3 corrected.
  - **N3/N4** — §1 now distinguishes the `data_refs` (`json<T>()`) vs `spec` (plain `text()`) boundaries + the M3
    no-double-stringify forward note. (N1/N2 were already correctly specified.)
- Confirmed-sound (verified vs disk): `ensureEntityNote(pageType,entityType,entityId,seed)`, `knowledge_object`
  pre-registered (`_registry.ts:80`, with `:78-79` explicitly stating knowledge_note = an existing page type, KN-5),
  co-transactional `sync_queue` UPSERT (`repository.ts:261-289`), `lab.concluded` event homed to S8.

## Preflight + Gate-2 status

- **Preflight PASSED (2026-09-29).** All composed APIs/imports resolve: `NotesService`/`NotesServiceDeps`/
  `EntityNoteSeed` from `../notes`; `AiService`/`AiRequest`/`AiResponse` + `IngestionGuard`/`IngestionAct`/
  `IngestionDecision`/`IngestionDenyReason`/`LeakDisclosure` from the substrate barrels (`* from './types'`); `PageRow`
  from `../../db/schema/notes`; `createTaggableTypeRegistry` already in the test setup (`service.test.ts:21`).
- **Gate-2: SHIP-but-one → folded (2026-09-29).** Independent confirmation critic CONFIRMED all three B1/B2/B3 folds
  correct against disk, unions/errors/validators/methods internally consistent. One blocking executability defect:
  acceptance #6's "permitted-act" happy path is **grant-gated** — a real `checkIngestion` returns
  `external_in_not_granted` (`enforcer.ts:77-78`, `grant.external_in_ok`) unless the def is granted, so the test as
  written would land on `refused`, not `parser-unavailable`. **Fold:** the `autoPopulate` mapping tests inject **stub
  `IngestionGuard`s** (parity with the confirmed ai throwing-stub, B2) — S6 tests its own MAPPING (`permitted→
parser-unavailable`, `!permitted→refused`), the guard's grant logic is xs-ingestion #44's tested territory. Headline #3,
  BR-S6-12, acceptance #6 updated + the "(with `external_in` granted)" qualifier added (the NIT that seeded the gap).
