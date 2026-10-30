# PLAN — S10: Integration close-out + fan-out + Journal (BOO-40/41/42/43/45/47) — THE FINAL SLICE

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice **10 of 10** (completing ① → open the PR).
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §0 Documentation grounding (authority trace — the intent source for every S10 element)

> The aspect docs + the Part-1.2 rerun driver-tokens are the intent authority; they outrank the slice-map/seam-contract.

| S10 element                                                                                                                                                                                                                                 | Authoritative doc source (intent)                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`convertToSpeech(assetId, req)` → `OcrResult`** — PDF/EPUB → TTS, a scoped model call (X11→ADR-015 AI1/AI3), on_device/cloud, **not AI4**; consent-gated, typed refusal, manual fallback                                                  | **BOO-40** (`parts/books.md:50`) · **BK-14/BK-15** (`business-rules.md:69-79`) · rerun G-X11/G-AI1/AI3 (`books.md:55-56`) · C-AI4 (`books.md:72`)                                             |
| **`transcribeForMapping(assetId, req)` → `OcrResult`** — audiobook → text transcription feeding the BOO-12 TOC-anchor map; `source=ai` provenance (AI6)                                                                                     | **BOO-41** (`parts/books.md:51`) · BK-4 (`business-rules.md:23-27`) · rerun G-AI5/AI6 (`books.md:57-58`)                                                                                      |
| **OCR provenance + prompt-injection bounding + consent-first** (AI5/AI6) — the OCR'd page is untrusted-origin; derived rows carry `source=ai`; the consent step is first                                                                    | **BOO-42** (`parts/books.md:52`) · `conventions.md:15-18,56-58`                                                                                                                               |
| **`IntegrationConsentError`** — the BK-14 "governing principle": every integration (lookup/TTS/transcription/OCR) requires the consent step; on refusal → typed error + manual fallback stays callable; **never a silent server-side path** | **BOO-43** (`parts/books.md:53`) · **BK-14** (`business-rules.md:69-76`) · `contract.md` error cases ("Consent not granted → `IntegrationConsentError`")                                      |
| **`getPlansForConsumer()` → `ReadingPlan[]`** — Books EXPOSES plans/deadlines/sessions; Study Planner CONSUMES, never writes (BK-12 boundary invariant)                                                                                     | **BOO-45** (`parts/books.md:55`) · **BK-12** (`business-rules.md:62-64`) · `seam-contract.md:132,151`                                                                                         |
| **Local-first write invariant** (BK-18) — every write (position/annotation/session/plan) succeeds locally first; LWW per entity; files ride the attachment pipeline                                                                         | **BOO-47** (`parts/books.md:57`) · **BK-18** (`business-rules.md:88-89`) · `conventions.md:41-42`                                                                                             |
| **`effects?` measurement-only fan-out** on reading-session completion (composes BOO-26) — **C-E2: Books emits NO economy grant** (grants ride base-`sessions`); emit-only, dormant without a handler                                        | `slice-map.md:24` ("effects? fan-out (measurement-only, C-E2) … reading-session signal") · `interpretation.md:57` (BOO-26 guard) · rerun **C-E2** (`books.md:73`) · `seam-contract.md:28,154` |
| **`registerBooksJournal` + `getDayBooksDigest(date)`** — the Journal `/summary` PULL contribution composing BOO-30's `getTodayQuotas`                                                                                                       | **BOO-30** (`parts/books.md:40`, "Hub + Journal `/summary`") · `seam-contract.md:31,136,144` · the `registerKnowledgeJournal` precedent (`services/knowledge/journal.ts`)                     |

**Genuinely build-phase (resolved here, grounded):**

- **`IntegrationConsentError` = exported typed BK-14 vocabulary with NO M1 backend throw-site** (g1 B1 — the
  `PositionConflictPending` precedent, corrected from the PLAN's first lean). BK-14 names the consent gate, but at M1
  **no consent refusal is producible**: there is no consent store, the egress guard is fail-closed-by-construction
  (`egress/CLAUDE.md` "no consent adapter ⇒ deny"), and an `on_device` model call never egresses at all
  (`ai/types.ts:90-93`; `checkModelCall` JSDoc `:145-146` "on-device never egresses"). So the ONLY reachable deny
  reasons at M1 are the deny-safe `model_unavailable`/`on_device_unavailable` (`ai/types.ts:98-100`, both "M1 deny-safe
  default"). A `checkModelCall`-driven `throw IntegrationConsentError` would therefore be **dead code** (reachable only
  by a bespoke test stub) AND a **throw-through** — which the seam's own invariant forbids: "Every integration method
  returns a **deny-safe typed state** … **no throw-through**" (`seam-contract.md:153`). It would also break the
  module's ratified `PositionConflictPending` convention (`current-business-rules.md:248-254` / BR-BK-S8-6 — "exported
  typed vocabulary, **NO M1 backend throw-site**"; the two are listed together as typed vocabulary at
  `seam-contract.md:57`).
  **Resolution:** `convertToSpeech`/`transcribeForMapping` mirror the two in-module AI precedents verbatim-in-shape —
  `attachPhoto` (`service.ts:805-813`) + `assistCompoundSet` (`knowledge/service.ts:576-584`): no `ai?` ⇒
  `ai-unavailable`; else `try { askModel } catch { ai-unavailable }`. **No `checkModelCall` gate wired, no M1 throw.**
  `IntegrationConsentError` is EXPORTED (BOO-43 typed vocabulary; the manual fallback — `setChapters`/`updatePosition`
  — stays callable, BK-14); the real consent gate that throws it = M2 (the consent store the gate reads — see
  §Deferred). Zero-signature (`OcrResult` already carries only `ready`/`ai-unavailable`).
  `[FACT: seam-contract.md:57,153; current-business-rules.md:248-254; service.ts:805-813; knowledge/service.ts:576-584;
ai/types.ts:90-100,145-146; egress/CLAUDE.md]`

- **`effects?` fan-out emits `emit_measurement_signal` on reading-session completion (emit-only, dormant).**
  `slice-map.md:24` explicitly homes an "effects? fan-out (measurement-only)" + a "reading-session signal (composes
  BOO-26)." The fan-out fires at **`endSession`** (the completion transition), mirroring the knowledge S8 emit-only
  producer (`service.ts:195-211`): post-commit, failure-isolated, rail-idempotent, **dormant without a registered
  handler** (`if (!effects) return`; `if (!registry.resolve(effectType)) continue`). **Grain** = the base session id
  (exactly-once per completed reading session, ADR-004 §3.2.5:100 — not a bare transition). `targetRef` = the
  `book_id`. **C-E2 is a hard guard**: the ONLY effectType is `emit_measurement_signal` (a `keyed` measurement signal,
  `effects/types.ts:22`) — **never** `award_xp`/`grant_currency` (economy rides the base-`sessions` sub-type, rerun
  C-E2 `books.md:73`). The reading SessionTypeDef already declares `effects:[]` (so the base rail fires nothing for
  `reading`); this Books-side emit-only producer is the separate measurement fan-out, exactly the knowledge pattern.
  `[FACT: slice-map.md:24; seam-contract.md:28,154; knowledge/service.ts:114-211,668-672; effects/types.ts:22,38]`
  - **Pull-vs-push nuance (flagged for adversarial g1):** the reading _measure_ is `derived-pull`
    (`getReadingMeasureSource`, BOO-14). So a pushed `emit_measurement_signal` has no _named_ consumer at M1 (unlike
    knowledge's `review.recorded`, whose KNO-39 named measurement re-derive). The reconciliation: slice-map:24 names
    the fan-out directly, the signal is **emit-only + dormant** (we name NO consumer — the handler registers
    downstream at M2, the knowledge `object.created`-vs-`review.recorded` line), and it is C-E2-clean. This is the
    documented "measurement-only fan-out," not an invented consumer. _(Alternative considered + rejected: push nothing
    — but slice-map:24 explicitly homes a fan-out here, so push-nothing would UNDER-deliver the named leg.)_

- **`getPlansForConsumer()`** is a thin READ wrapper over the active plans (`plansRepo.findWhere(isNull(deleted_at))`
  → `toReadingPlan`), the BK-12 boundary made concrete: Books exposes a read-provider and NO write. (Distinct from
  `getTodayQuotas`, which is the _derived_ today-pace view; `getPlansForConsumer` is the raw plan list the Study
  Planner reads.) `[FACT: BOO-45 parts:55; BK-12; seam-contract.md:132,151]`

- **BOO-47 local-first** is a platform baseline already satisfied by every Books write (DB-6 Repository = local
  SQLite write-through; `sync_queue` co-transactional enqueue is the AR-9 seam). S10 **documents + asserts** the
  invariant (a currency BR + a test that a write persists locally with no network dependency) — it authors **no new
  write path** (the invariant is structural, `conventions.md:41-42`). `[FACT: BK-18; ADR-003 LWW]`

**Deferred (homed, NOT built here — each is the documentation's own deferral):**

- **Real TTS/transcription/OCR model pipelines** (the `on_device` runtime + cloud mediator + `source=ai` row
  authorship) — `ai?` is deny-safe at M1 (both ports absent ⇒ `ai-unavailable`); real reach = M2 (`parts:7`; `ai`
  CLAUDE.md "both ports absent at M1 = deny-safe"). The cross-format mapping algorithm BOO-41 feeds stays the S3
  `NotSyncedState` design pass.
- **The real consent store + mediator** (a persisted grant the gate reads) — M2 (`checkModelCall` deny-safe today).
- **The `effects?` measurement handler** (who consumes the signal) — registered downstream (dormant seam, M2), the
  knowledge/habits emit-only precedent.
- **Calendar reconciliation / P6 consent dialog / Reader TTS control** — forward-dep + the `fe-books` P6 track.

---

## §1 Context (ground truth)

- **Service**: `createBooksService` (`services/books/service.ts`; factory-object, no `this.`). **S1–S9 shipped**;
  @vida/core **1523/1523** green (`65384a9`). Branch `mod-books`.
- **Deps today** (`types.ts:53-93`): `{ db, deviceId }` + required `spaces`/`notes`/`sessions`/`sessionRegistry` +
  optional deny-safe `ingestion?`/`attachment?`/`preferences?`/`ai?`. S10 appends optional `effects?`.
- **Composed substrates (all BUILT + Done):** `foundation/ai` (`AiService`: `checkModelCall`/`askModel`, deny-safe —
  XS-ai #45) · `foundation/effects` (`EffectRail`/`EffectRegistry`, `applyEffect` idempotent — xs-effect-rail #32) ·
  `services/journals` (`JournalRegistry` + `JournalContribution`, `summary(date)` PULL — mod-journals #39).
- **Existing hooks S10 wires:** `endSession` (`service.ts:765` — the completion point for the fan-out) · `getTodayQuotas`
  (`service.ts:904` — the Journal digest source) · `attachPhoto` (`service.ts:784` — the `ai?` deny-safe precedent).
- **Env:** Node 24 via nvm (a stray non-24 `pnpm test` rebuilds better-sqlite3 to the wrong ABI).

---

## §2 Implementation plan

### 2.1 `types.ts` — deps, types, error

1. **`effects?` dep** (append to `BooksServiceDeps`) — `effects?: { rail: EffectRail; registry: EffectRegistry }`
   (import from `../../foundation/effects`; the knowledge inlined-shape precedent, `knowledge/types.ts:87`). Optional,
   deny-safe: absent ⇒ the whole fan-out is dormant (BK-fan-out off). Doc-comment: measurement-only (C-E2).
2. **`BooksDayDigest`** (service-layer type) — `{ pagesRead: number; sessionsLogged: number; onPace: number; behind: number }`
   (seam-contract.md:49). Feeds `registerBooksJournal`.
3. **`AiRequest`** — reuse `foundation/ai`'s exported `AiRequest` (the discriminated `cloud`/`on_device` union) for the
   `convertToSpeech`/`transcribeForMapping` signatures. No new local request type (cite-not-re-spec).
4. **`IntegrationConsentError`** (typed error) — `constructor(public readonly defId: string)`; `.name` stable; message
   "Integration consent not granted: <defId>; the manual fallback is available" (BK-14). **Exported typed vocabulary
   (BOO-43), NO M1 throw-site** (the `PositionConflictPending` precedent, g1 B1); the real throw = the M2 consent gate.
5. **`BooksService` interface** — append `convertToSpeech`, `transcribeForMapping`, `getPlansForConsumer`,
   `getDayBooksDigest` (JSDoc each with its BOO-id + the deny-safe/boundary note).
6. **`BOOKS_TTS_INTEGRATION_ID = 'books.tts'`** (+ reuse `BOOKS_OCR_INTEGRATION_ID` for transcription-as-OCR-class, OR
   add `BOOKS_TRANSCRIPTION_INTEGRATION_ID = 'books.transcription'`) — Books' own integration identity, the
   `BOOKS_ISBN_INTEGRATION_ID`/`BOOKS_OCR_INTEGRATION_ID` precedent (No-Guessing; inert at M1). _(g1: one id per model
   use — TTS and transcription are distinct X11 pipelines → two ids.)_

### 2.2 `service.ts` — methods + the fan-out

1. **Destructure `effects`** from deps (append to `service.ts:274`).
2. **`fanOutReadingCompletion(sessionId, bookId)`** (private closure, the knowledge `fanOut` precedent) —
   `if (!effects) return`; for `emit_measurement_signal`: `if (!effects.registry.resolve('emit_measurement_signal')) return`;
   `try { await effects.rail.applyEffect({ subjectNaturalKey: sessionId, transition: 'reading_session.completed',
effectType: 'emit_measurement_signal', targetRef: bookId }) } catch { /* post-commit, isolated */ }`.
3. **Hook it into `endSession`** — after the base `completeSession` + extension patch persist (post-commit), call
   `fanOutReadingCompletion(id, existing.book_id)`. Failure-isolated (the mutation stands). _(Only `endSession` fires
   it — `startSession` is not a completion; `openReader`'s auto-session is still in_progress.)_
4. **`convertToSpeech(assetId, req)`** — guard the asset (`BookAssetNotFoundError`); the deny-safe model-call helper
   (§2.3) → `OcrResult`. At M1 no `ai?` ⇒ `ai-unavailable`; a present-but-dormant `ai?` ⇒ `ai-unavailable` (askModel
   denies). **No `checkModelCall` gate / no M1 throw** (g1 B1).
5. **`transcribeForMapping(assetId, req)`** — same shape; distinct integration id. Returns `OcrResult`.
6. **`getPlansForConsumer()`** — `const rows = await plansRepo.findWhere(isNull(readingPlans.deleted_at));
return rows.map(toReadingPlan)` (BK-12 read-only; no write exposed).
7. **`getDayBooksDigest(date)`** — compose `getTodayQuotas(date)`: `pagesRead`/`sessionsLogged` from the day's
   reading sessions (count `reading_sessions` whose base session `ended_at` falls in the UTC-day, the knowledge
   `getDayKnowledgeDigest` window + `getStatistics` timing precedent); `onPace`/`behind` = tally `getTodayQuotas(date)`
   statuses. Returns `BooksDayDigest`. _(g1: the day-window keys off the base session `ended_at` — timing lives on the
   base, `service.ts:826-832` — so the digest needs the base-session read, like `getStatistics`.)_
8. **Add all four to the return object** (`service.ts:1158`).

### 2.3 The deny-safe model-call helper (BOO-40/41/42) — mirrors `attachPhoto`/`assistCompoundSet`

```
async function runModelCall(defId, req, assetId): Promise<OcrResult> {
  const asset = await assetsRepo.findById(assetId); if (!asset) throw new BookAssetNotFoundError(assetId)
  if (!ai) return { status: 'ai-unavailable', reason: 'no-ai' }            // dormant: no port
  try { const res = await ai.askModel(req); return { status: 'ready', position: res.content, source: 'ai' } }  // AI6 source=ai
  catch (err) { return { status: 'ai-unavailable', reason: err instanceof Error ? err.message : String(err) } } // AiDenied → deny-safe
}
```

_(g1 B1: NO `checkModelCall` gate, NO M1 throw — the `attachPhoto` `service.ts:805-813` + `assistCompoundSet`
`knowledge/service.ts:576-584` precedent. `IntegrationConsentError` is exported typed vocabulary; the real consent
gate that throws it = M2, when the consent store exists. `[FACT: seam-contract.md:153 "no throw-through"]`)_

### 2.4 `journal.ts` (NEW) — the Journal contribution

Mirror `services/knowledge/journal.ts` verbatim-in-shape:

- `DATA_POINTS` = `[{id:'pages_read',label:'Pages read'},{id:'sessions_logged',label:'Reading sessions'}]`.
- `createBooksJournalContribution(svc): JournalContribution` — `module:'books'`, `sectionKey:'summary'`,
  `async summary(date)`: `const d = await svc.getDayBooksDigest(date)`; `state = d.sessionsLogged + d.pagesRead > 0
? 'success' : 'empty'`; return the `SectionData` (reuse `TerminalState` BY TYPE, never `deriveTerminalState` — the
  knowledge precedent). _(`sectionKey:'summary'` per BOO-30 "Journal `/summary` block"; the registry dedups by
  `module`, so Books coexists with knowledge under 'summary'.)_
- `registerBooksJournal(registry, svc): void`.

### 2.5 `index.ts` barrel — add `export * from './journal'`.

---

## §3 Business rules to promote (§XXIX currency — `current-business-rules.md`, BR-BK-S10-\*)

- **BR-BK-S10-1 (BOO-40/41 — TTS/transcription deny-safe)** — both return `OcrResult`; no `ai?` ⇒ `ai-unavailable`;
  `source:'ai'` on a `ready` result (AI6). Manual fallback always callable.
- **BR-BK-S10-2 (BOO-42/43 — the consent gate)** — `IntegrationConsentError` is exported BK-14 typed vocabulary with
  **no M1 backend throw-site** (the `PositionConflictPending`/BR-BK-S8-6 precedent); TTS/transcription map every deny
  to the deny-safe `ai-unavailable` state (the `attachPhoto`/`assistCompoundSet` shape — no throw-through,
  `seam-contract.md:153`). Never a silent server path; the manual fallback stays callable. The real consent gate = M2.
- **BR-BK-S10-3 (BOO-45 / BK-12 — Study-Planner read-provider)** — `getPlansForConsumer` is read-only; no plan write
  is exposed to consumers.
- **BR-BK-S10-4 (BOO-26 / C-E2 — measurement-only fan-out)** — `endSession` emits `emit_measurement_signal` only
  (grain = session id, targetRef = book_id); dormant without `effects?`/a handler; NEVER an economy grant. **No named
  M1 consumer** (N1): the reading measure is `derived-pull` (BR-BK-S9-6), so — unlike knowledge's `review.recorded`
  (KNO-39 named re-derive) — this is a dormant seam-only signal (a handler registers downstream at M2), not a live
  measurement re-derive.
- **BR-BK-S10-5 (BOO-30 — Journal contribution)** — `registerBooksJournal` under `sectionKey:'summary'`; a no-activity
  day ⇒ `state:'empty'`, never a throw.
- **BR-BK-S10-6 (BOO-47 / BK-18 — local-first)** — every Books write persists locally first (no network dependency);
  LWW per entity via the sync seam.

## §4 Verification Gate (live-store Vitest, Node 24) — new tests

1. `convertToSpeech`/`transcribeForMapping` with **no `ai?`** ⇒ `ai-unavailable` (+ asset-guard throw).
2. deny-safe mapping (g1 B1 — no M1 throw): injected `ai?` stub, `askModel` throws `AiDenied(model_unavailable)` ⇒
   `{status:'ai-unavailable'}`; `askModel` resolves ⇒ `{status:'ready', source:'ai'}`. Assert `IntegrationConsentError`
   is **exported + constructible** (BOO-43 typed vocabulary) — NOT thrown by any M1 path.
3. `getPlansForConsumer` returns active plans only (soft-delete filtered); no write method leaks.
4. fan-out: **no `effects?`** ⇒ `endSession` succeeds, nothing fired (dormant); **`effects?` wired + a handler** ⇒
   exactly one `emit_measurement_signal` on completion (grain = session id); **no `award_xp`/`grant_currency`** ever
   (C-E2 assertion); a throwing handler does NOT fail `endSession` (isolation).
5. `getDayBooksDigest` over a day with sessions ⇒ correct `pagesRead`/`sessionsLogged`/`onPace`/`behind`; empty day ⇒ zeros.
6. `registerBooksJournal` → the registry `summary(date)` returns `state:'success'` on activity, `'empty'` on none.
7. local-first: a plan/session write persists + reads back with no network stub present (BR-BK-S10-6).

## §5 Gate ledger line (to fill)

| Slice | g1  | Verification Gate | code-review | SHIP | commit |
| ----- | --- | ----------------- | ----------- | ---- | ------ |
| S10   | —   | —                 | —           | —    | —      |

## §6 Done-when (completes ①)

tsc 0 · eslint 0 · gitleaks clean · books live-store green · full @vida/core green · §XXIX currency promoted
(BR-BK-S10-1..6) · all 48 BOO legs delivered → **open the PR for the whole `mod-books` ① backend track**.
