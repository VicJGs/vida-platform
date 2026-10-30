# PLAN — mod-knowledge S8: Event fan-out + Journal contribution

> Entity Delivery Flow · Add Backend Component / Default · the LAST slice of ① (mod-knowledge #50, LIF-128).
> Legs: **KNO-38, KNO-39, KNO-40** (+ the `lab.concluded` domain event named alongside them, `decomposition.md:108`).
> Home: `packages/core/src/services/knowledge/` (service fan-out) + a new `packages/core/src/services/knowledge/journal.ts`.
> No schema, no new dep beyond an OPTIONAL `effects?: EffectsPort`, no `@vida/types` change.
> Governed by the No-Guessing Principle — every claim FACT / INTERPRETATION / UNKNOWN.
> **Gate-1 REVISE folded (2026-09-29):** grain (B1/B2), object.created routing (B4), §5 contradiction (B3), layer (S1),
> tz (S2) — all re-grounded in ADR-004 §3.2.5 / effects BR-1,2,6 / BR-KN-S7-5 / habits:79. See §Gate-1 status.

## §1. Context

S8 makes Knowledge an **emit-only producer**: its domain mutations fan out onto the effect rail (dormant until a
consumer registers a handler) and it registers a Journal contribution into the Journals-owned registry. This is the
identical close-out shape every module runs — habits S5 (`services/habits/service.ts:143-158` + `journal.ts`),
gamification S4 (`services/gamification/journal.ts`), finance S6 (`services/finance/journal.ts`). Knowledge owns no
handler and computes no downstream state; it only EMITS.

Two independent seams, **both fully dormant in M1** (no consumer registers a knowledge handler yet):

1. **Effect rail fan-out** (PUSH) — post-commit, failure-isolated, rail-idempotent emissions to the **keyed/additive**
   consumers (measurement, gamification).
2. **Journal contribution** (PULL) — `registerKnowledgeJournal(registry, svc)`, a standalone export wired at
   app-wiring; the daily dashboard *pull-aggregates* it at render (ADR-004 §3.2.5).

### The effect taxonomy is the spine of this slice (ADR-004 §3.2.5, lines 82-84)

| Class | Members | Rail behaviour | Convergence grain |
|---|---|---|---|
| **keyed** | `emit_measurement_signal`, `complete_habit_occurrence`, `contribute_purpose_metric` | ledger + handler, exactly-once | a UNIQUE **domain** key + `effect_event_id` |
| **additive** | `award_xp`, `log_time`, `grant_currency`, … | ledger + handler, exactly-once | `effect_event_id` is its **only** convergence key (no domain key) |
| **projection** | `surface_journal`, `surface_calendar` | **writes no row, no handler** — *pull-aggregated at render* | none |

`effect_event_id = derive(subject_natural_key ‖ transition ‖ effect_type)`; the ADR's own example is
`derive(habit_id ‖ date ‖ "award_xp")` (`ADR-004:100`). `[FACT: ADR-004 §3.2.5:82-84,100; effects/current-business-rules.md BR-1,2,6]`

### Interpretation headlines (the load-bearing S8 calls — confirm at Approval 1)

- **H1 — Domain event names ride `transition`, NEVER `effectType`.** `object.created`/`review.recorded`/
  `mastery.changed`/`lab.concluded` populate `EffectEvent.transition`; `effectType` MUST be a member of the FIXED
  12-member `EFFECT_TYPE` catalogue (`@vida/types/session.ts:85-100`), else `UnknownEffectType`
  (`effects/service.ts:33`). `[FACT: decomposition.md:107-111; effects/service.ts:31-33]`

- **H2 — Two mechanisms, split by consumer class.**
  - **PUSH (rail):** the **keyed/additive** consumers — measurement + gamification. Only `review.recorded` and
    `mastery.changed` have such consumers (KNO-39/40, below).
  - **PULL (journal registry):** the **projection** consumer — the daily dashboard. ADR-004 §3.2.5:84 states Journal
    is *pull-aggregated at render*; grep-confirmed all 3 precedents feed it via `registerXJournal`, none via a
    `surface_journal` rail push. So `object.created`/`lab.concluded` — whose only named consumer is the Journal —
    are realized by the **journal digest**, not a rail emission. `[FACT: ADR-004 §3.2.5:84; grep services/*/service.ts;
    habits/journal.ts; effects BR-6]`

- **H3 — The concrete `domain-event → effectType` map (grounded from the consumer intents at `parts/knowledge.md:53-55`
  + `contract.md:68-71`; the "e.g." at `decomposition.md:110` is illustrative → pinned here).**
  | Domain event (`transition`) | Emitted on | Mechanism | `effectType`(s) | Consumer intent (source) |
  |---|---|---|---|---|
  | `object.created` | `createObject`, `promoteToObject` | **PULL** (journal digest) | — *(no rail push)* | KNO-38 "journal/gamification consumers" → journal = pull (H2) `[FACT: ADR-004:84]` |
  | `review.recorded` | `recordReview` (service wrapper), **unconditional** | **PUSH** (rail) | `emit_measurement_signal` (keyed) · `award_xp` (additive) | KNO-39 "→ mastery re-derive → Gamification/Journal" `[FACT: parts:54; ADR-004:82-83]` |
  | `mastery.changed` | the re-derive OUTPUT that `review.recorded` triggers — **iff `ev.quality != null`** | **PUSH** (rail) | `emit_measurement_signal` (keyed) | KNO-40 "→ Education measurement source" `[FACT: parts:55; contract.md:70; BR-KN-S4-3]` |
  | `lab.concluded` | `promoteToObject` | **PULL** (journal digest, via the created object) | — *(no rail push)* | KNO-36/`decomposition.md:88` "→ new object" `[FACT]` |

  **Why object.created / lab.concluded emit NO rail effect (No-Guessing, grounded — not omission).** Their only named
  consumer is the Journal, which ADR-004 §3.2.5:84 defines as *pull-aggregated* (a `surface_journal` push "writes no
  row, no id, no ledger" — a vacuous no-op the journal never reads). No doc names a keyed/additive effect for them;
  inventing `award_xp` for cataloguing an object would be a guess (the platform rewards *completions/reviews*, not
  cataloguing). `intent-coverage.md:82` labels KNO-38 "effect fan-out" — satisfied by the **projection/pull class**
  (its journal-contribution row, `intent-coverage.md:83`), which IS a fan-out class per ADR-004 §3.2.5. The rail seam
  stays open (zero-signature-change) for a future gamification hook. `[FACT: ADR-004 §3.2.5:84; intent-coverage.md:82-83]`

- **H4 — The convergence grain is the `review_event.id`, NOT a bare transition (ADR-004 §3.2.5 + BR-2).** A habit
  awards XP once per (habit,date) → `derive(habit_id ‖ date ‖ …)`. A review is a distinct occurrence with its own
  UUIDv7 `review_event.id`, so `subjectNaturalKey = ev.id` (BR-2: the natural key is a UUIDv7 id). A user reviewing
  the same object twice → two distinct events → two `applied:true` emissions; a **retry of the SAME event** (same
  `ev.id`) → `applied:false` (the exactly-once/FC-10 replay guarantee). `mastery.changed` shares the grain (the same
  `ev.id` that moved the derived value). `transition` = the bare event name. `[FACT: ADR-004 §3.2.5:82-84,100;
  effects BR-1,2; corrects the gate-1 B1/B2 finding]`

- **H4b — `mastery.changed` is the re-derive OUTPUT, gated on a non-null quality (doc causal chain, not an
  unconditional twin).** `contract.md:70` reads *"`review.recorded` (→ mastery re-derive → …) · `mastery.changed`
  (→ Education measurement source)"* — a CHAIN: `review.recorded` triggers the re-derive (`deriveMastery`, KN-9 /
  `contract.md:34`), and `mastery.changed` is that re-derive's result. Per BR-KN-S4-3 the derive-on-read mastery moves
  ONLY on a non-null `quality` (latest-non-null basis; null never moves it, never coerced to 0, `engine.ts:266-267`).
  ∴ `mastery.changed` fires **iff `ev.quality != null`**; `review.recorded` fires unconditionally (a review WAS
  recorded regardless). A null-quality review would otherwise send Education a false "changed" it re-derives to no
  change. `[FACT: contract.md:70,34; business-rules.md KN-9:47-50; BR-KN-S4-3; engine.ts:266-267]`

- **H5 — `review.recorded` fires on THIS service's wrapper only; the flashcards drill deliberately fires nothing in
  M1.** `recordReview` is wrapped in the knowledge service (the `rollupMastery` precedent). The flashcards
  `completeReview` calls `review.recordReview` on the engine DIRECTLY and **"fires nothing in M1"** — that is shipped,
  documented intent (`BR-KN-S7-5`), not a gap: flashcards is emit-only (FC-6, no mastery/schedule). The engine stays a
  pure substrate (no `effects` dep). A flashcards-level fan-out is a later foundation-envelope-widening seam
  (`BR-KN-S7-4`). `[FACT: BR-KN-S7-5; flashcards/service.ts completeReview; decomposition.md:106]`

## §2. Business rules (S8-scoped, cited)

- **BR-KN-S8-1 — Emit-only, post-commit, failure-isolated.** Every emission runs AFTER the persisted mutation returns
  its row; each is wrapped so a handler throw is swallowed (the persisted write stands, LF-2). Knowledge computes no
  mastery/xp/schedule in the fan-out. `[FACT: habits/service.ts:154-158; decomposition.md:106]`
- **BR-KN-S8-2 — Dormant guard before the rail.** `if (!effects || !effects.registry.resolve(effectType)) return`
  precedes `rail.applyEffect` — a non-projection effect with no handler would otherwise throw `NoEffectHandler`
  (`effects/service.ts:39`). In M1 no handler is registered → the whole push fan-out is a no-op. `[FACT: habits/service.ts:145]`
- **BR-KN-S8-3 — Exactly-once grain = the `review_event.id` (H4).** `subjectNaturalKey = ev.id`, `transition ∈
  {review.recorded, mastery.changed}`, `targetRef = ev.object_id` (the affected object — the target dimension of the
  dedup key). Distinct reviews → distinct events fire; an identical replay of one event → `applied:false`. `[FACT:
  ADR-004 §3.2.5:82-84,100; effects/event-id.ts:25; effects BR-1,2]`
- **BR-KN-S8-4 — Push map (H3/H4b).** `review.recorded` (unconditional) → `[emit_measurement_signal, award_xp]`;
  `mastery.changed` (**iff `ev.quality != null`** — the re-derive output, contract.md:70 + BR-KN-S4-3) →
  `[emit_measurement_signal]`; `object.created`/`lab.concluded` → **no rail push** (journal-pull only). `[FACT: H3;
  H4b; parts:54-55; ADR-004 §3.2.5:84; contract.md:70]`
- **BR-KN-S8-5 — Journal contribution: one `summary`, dated digest, empty-safe.** `createKnowledgeJournalContribution`
  registers `module:'knowledge'`, `sectionKey:'summary'`; `summary(date)` reports the day's objects-created +
  reviews-recorded counts; a no-activity day returns `state:'empty'`, never a throw (per-section degrade is the
  dashboard's). Reuses the `TerminalState` canon BY TYPE (state from its own live read, not `deriveTerminalState`).
  No `dueIn` agenda (Knowledge's `getDue` is a study surface, not a daily-agenda primitive — summary-only, like
  habits/gamification). This PULL path is how `object.created`/`review.recorded`/`lab.concluded` reach the dashboard
  (H2). **`dataPoints`** = `[{id:'objects_created', label:'Objects added'}, {id:'reviews_recorded', label:'Reviews'}]`
  — a module advertises its own `DataPoint[]` (JR-4, the user's per-module recap selection), the
  `habits {due,done}` / `finance {net_worth,today_spending}` / `gamification {level,xp,achievements}` precedent.
  `[FACT: journals/types.ts:24-25,58-64; habits/journal.ts:15-18; finance/journal.ts:18-21; ADR-004 §3.2.5:84]`
- **BR-KN-S8-6 — Dated digest, UTC-day window (platform convention).** `getDayKnowledgeDigest(date)` counts
  `knowledge_objects` with `created_at ∈ [Date.parse(`${date}T00:00:00Z`), +DAY_MS)` (`deleted_at IS NULL`) +
  `review_events` with `reviewed_at` in the same window. `date` is the `YYYY-MM-DD` convention; the UTC-day basis
  mirrors `habits/service.ts:79` (`Date.parse(`${d}T00:00:00Z`)`) + `checkins/service.ts:104`. Per-user-tz day
  boundaries are a documented refinement (the gamification snapshot-tz precedent). `[FACT: habits/service.ts:79;
  checkins/service.ts:104; CLAUDE.md date convention; decomposition.md:112]`
- **BR-KN-S8-7 — Optional `effects` dep, mirror the checkins/habits `EffectsPort`.** `KnowledgeServiceDeps.effects?:
  EffectsPort` (`{rail: EffectRail, registry: EffectRegistry}`, from `../../foundation/effects`). Absent ⇒ no push
  fan-out (M1 default). `[FACT: checkins/types.ts:34-45; habits/types.ts:27-48]`

## §3. Contract (surface)

New/changed on `KnowledgeService` + a new module file. **No `@vida/types` change, no schema, no migration.**

```ts
// KnowledgeServiceDeps (types.ts) — ADD:
effects?: EffectsPort            // { rail: EffectRail, registry: EffectRegistry } — dormant PUSH fan-out; M1 absent

// service.ts — WRAP the bare engine reference (H5):
recordReview(input): Promise<ReviewEvent>   // engine.recordReview(input) → ev; then post-commit PUSH:
                                            //   fanOut(ev.id, 'review.recorded', ev.object_id, [emit_measurement_signal, award_xp])  // unconditional
                                            //   if (ev.quality != null) fanOut(ev.id, 'mastery.changed', ev.object_id, [emit_measurement_signal])  // H4b
                                            //   return ev

// createObject / promoteToObject — UNCHANGED signatures + NO rail call (object.created/lab.concluded = journal-pull, H3)

// NEW read (feeds the journal summary, BR-KN-S8-6):
getDayKnowledgeDigest(date: string): Promise<{ objectsCreated: number; reviewsRecorded: number }>

// NEW file services/knowledge/journal.ts (exported via the barrel):
createKnowledgeJournalContribution(svc: KnowledgeService): JournalContribution
registerKnowledgeJournal(registry: JournalRegistry, svc: KnowledgeService): void
```

Private helper: `fanOut(subjectNaturalKey, transition, targetRef, effectTypes: readonly EffectType[])` — loops the set,
each dormant-guarded (BR-KN-S8-2) + try/catch (BR-KN-S8-1) → `rail.applyEffect({subjectNaturalKey, transition,
effectType, targetRef})`. Constants: `REVIEW_RECORDED_EFFECTS = ['emit_measurement_signal','award_xp']`,
`MASTERY_CHANGED_EFFECTS = ['emit_measurement_signal']`; transitions `EVT_REVIEW_RECORDED='review.recorded'`,
`EVT_MASTERY_CHANGED='mastery.changed'`. No new typed errors (emit is failure-isolated, not throwing). `object.created`/
`lab.concluded` need no rail constants (pull-only).

## §4. Acceptance (Verification Gate — live-store, Node 24, better-sqlite3)

A slice is done only when these PASS on the REAL store (not fixtures):

1. **Push dormant no-op** — with `effects` absent, `recordReview` succeeds + persists the event unchanged (no throw). `[BR-KN-S8-2/7]`
2. **Push fires when handlers registered** — register spy `emit_measurement_signal` + `award_xp` handlers on a real
   `EffectRegistry`+`EffectRail`; one `recordReview` **(quality non-null)** → `review.recorded` drives BOTH effects +
   `mastery.changed` drives `emit_measurement_signal`, each `applied:true` once. (The null-quality case is #6b.)
   `[BR-KN-S8-1/3/4; H4b]`
3. **Distinct reviews each fire (the B1 fix)** — TWO `recordReview` calls on the same object → **two** `applied:true`
   `award_xp` emissions (distinct `ev.id` grain), NOT one. `[BR-KN-S8-3; H4]`
4. **Same-event replay dedups** — re-driving `applyEffect` for one `ev.id` → `applied:false`; the ledger holds one row
   per `(ev.id|transition|effectType|targetRef)`. `[BR-KN-S8-3]`
5. **Post-commit failure isolation** — a throwing handler does NOT roll back the persisted review event (it reads back). `[BR-KN-S8-1]`
6. **object.created / lab.concluded push NOTHING** — with `award_xp`/`emit_measurement_signal`/`surface_journal` spies
   registered, `createObject` + `promoteToObject` fire ZERO rail effects (pull-only, H3). `[BR-KN-S8-4; H3]`
6b. **null-quality review fires `review.recorded` but NOT `mastery.changed`** (H4b) — `recordReview({..., quality:
   undefined})` drives `review.recorded` (both effects) yet zero `mastery.changed` emissions; a non-null-quality
   review drives both. `[BR-KN-S8-4; H4b; BR-KN-S4-3]`
7. **Journal digest dated** — 2 objects + 1 review "today" (UTC), 1 object "yesterday" → `getDayKnowledgeDigest(today)`
   = `{objectsCreated:2, reviewsRecorded:1}`. `[BR-KN-S8-6]`
8. **Journal contribution shape + empty-safe** — `createKnowledgeJournalContribution(svc).summary(today)` →
   `state:'success'` + items; a no-activity day → `state:'empty'`, no throw. `registerKnowledgeJournal` places it under
   `module:'knowledge'`. `[BR-KN-S8-5]`
9. **Full suite green** — `@vida/core` all tests, `tsc --noEmit` 0, `eslint` 0, gitleaks clean.

## §5. Implementation prompt (build steps)

1. **types.ts** — add `effects?: EffectsPort` to `KnowledgeServiceDeps` (import `EffectsPort` shape from
   `../../foundation/effects`, mirror `checkins/types.ts:34-45`); add `getDayKnowledgeDigest` to the `KnowledgeService`
   interface.
2. **service.ts** — destructure `effects`; add the private `fanOut(subjectNaturalKey, transition, targetRef,
   effectTypes)` helper: `for (const t of effectTypes) { if (!effects || !effects.registry.resolve(t)) continue; try {
   await effects.rail.applyEffect({subjectNaturalKey, transition, effectType:t, targetRef}) } catch {} }`. Add the
   transition + effect-set constants.
3. **service.ts** — wrap `recordReview`: `const ev = await review.recordReview(input); await fanOut(ev.id,
   EVT_REVIEW_RECORDED, ev.object_id, REVIEW_RECORDED_EFFECTS); if (ev.quality != null) await fanOut(ev.id,
   EVT_MASTERY_CHANGED, ev.object_id, MASTERY_CHANGED_EFFECTS); return ev`. The `ev.quality != null` gate = H4b
   (mastery.changed is the re-derive output, `contract.md:70` + BR-KN-S4-3). Swap the returned `recordReview:
   review.recordReview` → the wrapper.
4. **service.ts** — `createObject`/`promoteToObject`: **no rail call** (object.created/lab.concluded are journal-pull,
   H3). They stay as-is functionally; the events are realized by the journal digest counting `created_at`.
5. **service.ts** — implement `getDayKnowledgeDigest(date)`: `const from = Date.parse(`${date}T00:00:00Z`); const to =
   from + DAY_MS;` count objects (`created_at >= from && < to`, `deleted_at` null) + review events (`reviewed_at` in
   range) via repo `findWhere` + explicit filters. **`DAY_MS` = a module-LOCAL `const DAY_MS = 86_400_000`** — the
   engine's `DAY_MS` (`review/engine.ts:54`) is module-private and there is no shared export (grep-verified); each
   consumer owns its own (`habits/service.ts:78` + `review/engine.ts:54` both do; finance/checkins inline the literal).
   `[FACT: habits/service.ts:78; foundation/review/engine.ts:54; no `export const DAY_MS` anywhere]`
6. **journal.ts (new)** — `createKnowledgeJournalContribution` + `registerKnowledgeJournal`, habits/finance shape;
   `summary(date)` → `getDayKnowledgeDigest`; `state = (objectsCreated + reviewsRecorded) > 0 ? 'success' : 'empty'`.
7. **index.ts** — export `createKnowledgeJournalContribution`, `registerKnowledgeJournal` (habits barrel precedent).
8. **tests** — the 9 acceptance checks in `services/knowledge/__tests__/knowledge-s8-events.test.ts`.
9. **tsc + eslint + full suite + gitleaks**; then §XXIX currency refresh + intent-coverage.md S8 rows → ✅ + commit on
   `mod-knowledge-rebuild`. After S8 → ① COMPLETE → PR the branch.

## Open items for the gate (confirm at Approval 1)
All three prior open items are now **doc-resolved** (no decision owed):
- **object.created / lab.concluded push nothing** — grounded in ADR-004 §3.2.5:84 (Journal = pull-aggregated) + No-Guessing (no named keyed/additive consumer). NOT a guess, NOT an omission.
- **Grain = `review_event.id`** — grounded in ADR-004 §3.2.5:82-84,100 + effects BR-2. The gate-1 B1/B2 bug is fixed.
- **Flashcards drill fires nothing** — shipped documented intent (BR-KN-S7-5), not a gap.
- **Digest UTC-day** — platform precedent (habits:79 / checkins:104); per-tz refinement noted.

## Gate-1 status
**REVISE → folded (2026-09-29).** Independent /critique returned REVISE (B1-B4 blocking, S1-S2 should-fix). All
re-grounded in the documentation per Victor's directive ("ground it in the documentation before approval"):
- **B1/B2 (grain drops repeat events)** → **fixed**: grain = `review_event.id` (ADR-004 §3.2.5:82-84,100 + effects BR-2). H4 + BR-KN-S8-3 + acceptance #3/#4.
- **B3 (§5 step-4 "emit but emit nothing" contradiction)** → **fixed**: object.created/lab.concluded make NO rail call — pull-only. §5 step 4 rewritten.
- **B4 (KNO-38 delivery)** → **grounded**: pull-aggregation (ADR-004 §3.2.5:84) IS the delivery; reconciled with intent-coverage.md:82-83. H2/H3.
- **S1 (fan-out layer)** → **grounded**: knowledge service wrapper; flashcards-direct fires nothing per BR-KN-S7-5 (documented). H5.
- **S2 (digest tz)** → **grounded**: UTC-day per habits:79/checkins:104. BR-KN-S8-6.
- **NIT (`DAY_MS` import)** → **grounded + folded**: `DAY_MS` is module-private in `review/engine.ts:54` with no shared
  export (grep-verified) → knowledge defines its own module-local `const DAY_MS = 86_400_000`, the `habits/service.ts:78`
  + `review/engine.ts:54` convention (finance/checkins inline the literal). §5 step 5 updated. Nothing left hanging.

**Re-critique: SHIP** (2026-09-29) — grain fix, pull/push split, and KNO-38/39/40 delivery all verified doc-grounded;
the sole NIT (DAY_MS) is now grounded. → **Approval 1 GRANTED (Victor, 2026-09-29).**

## Preflight + Gate-2 status
**Preflight BLOCKED → resolved (2026-09-30).** `/preflight` flagged **G1**: `mastery.changed` fired unconditionally,
contradicting the shipped mastery derivation. **Resolved by grounding, not by adding a gate** (Victor: "it is already
solved in there"): `contract.md:70` is a CAUSAL CHAIN — `mastery.changed` is the OUTPUT of the re-derive that
`review.recorded` triggers; BR-KN-S4-3 (`engine.ts:266-267`) proves the derive-on-read mastery moves only on a
non-null quality → `mastery.changed` fires **iff `ev.quality != null`**. Folded into H4b, BR-KN-S8-4, §3, §5 step 3,
acceptance #6b. Two preflight notes folded: DataPoint ids grounded (BR-KN-S8-5, JR-4 precedent); `targetRef=ev.object_id`
confirmed (ADR-004 target dimension). No assumption left open.

**Gate-2 re-critique: SHIP** (2026-09-30) — spec complete + internally consistent; G1 resolution propagated across
H4b/H3/BR-KN-S8-4/§3/§5/#6b; sole NIT (acceptance #2 quality-non-null) folded. → **Approval 2 GRANTED (Victor, 2026-09-30).**

## Implementation + review (2026-09-30)
Built S1's shape: `types.ts` (effects dep + `getDayKnowledgeDigest`), `service.ts` (fanOut + recordReview wrapper +
digest), `journal.ts` (new), `index.ts`. **Verification Gate PASS** — @vida/core **1433/1433** (+9 S8 live-store), tsc 0,
eslint 0, gitleaks clean. Independent code-review (2 finder angles + verify): correctness **clean (`[]`)**; the
`emit_measurement_signal` double-emit concern was **verified NOT redundant** (distinct transitions → distinct ledger
rows → two genuine signals). Two **§XXVIII deviations** from the approved §5, both behaviour-identical quality folds:
- **D1 — `EffectsPort` inlined, not a named export.** `checkins` already exports `EffectsPort` + the knowledge barrel is
  `export *` → a second named export collided at the core index (tsc caught). Inlined the `{rail, registry}` shape (the
  habits "EffectsPort not re-exported" precedent). BR-KN-S8-8.
- **D2 — digest uses `repository.count()` not `findWhere().length`** (code-review F1). `count` skips `decryptAll` on
  tallied rows + auto-applies the soft-delete filter (so the manual `isNull(deleted_at)` drops out). Behaviour identical
  (verified by acceptance #7). BR-KN-S8-6 updated.
Code-review F2/F3 (transition consts / two-set shape) reviewed + **kept as-is** (the consts document the load-bearing
H1 domain-name-vs-effectType distinction on purpose; a 2-event table-collapse isn't worth the churn). **① COMPLETE.**
