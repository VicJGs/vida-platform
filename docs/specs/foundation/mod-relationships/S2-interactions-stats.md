# S2 — Interactions ledger + derived contact stats (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S2 of 9. Legs: REL-12…16, REL-19, REL-20, REL-21. Builds on S1. Grounded in:
> `relationships.ts` (interactions table + contacts stat columns), business-rules RL-3, decomposition REL-12…21,
> the books `addDaysISO` UTC-safe date precedent, the habits streak-recompute-from-ledger precedent.

## §1. Context
The `interactions` ledger (REL-12…16) + the **derived contact-stats engine** (REL-19/20/21): `contacts`'
`last_interaction_date`/`interaction_count`/`next_contact_date` are a **cache recomputed from the ledger** (RL-3),
never hand-maintained. Deps unchanged (`{db, deviceId}`). `interactions` has **no `deleted_at`** (a ledger —
hard-delete, HB-11/RT-17 precedent). No JSON columns → returns are raw `InteractionRow` (no view type needed; the
`[E]` summary/follow_up_notes/key_takeaways are plain text at M1.0 `[E]=[]`).

## §2. Business Rules (S2)
- **BR-RL-S2-1 (REL-12…16)** — `logInteraction(input)` · `updateInteraction(id, patch)` · `deleteInteraction(id)` ·
  `getTimeline(contactId)`. `log`/`update`/`delete` each **recompute the owning contact's stats** (BR-RL-S2-4).
  `deleteInteraction` = hard-delete (no `deleted_at`). `getTimeline` returns the contact's interactions ordered by
  `date` desc (then `created_at` desc as a stable tiebreak).
- **BR-RL-S2-2 (REL-12, guard)** — `logInteraction` for a missing/soft-deleted `contact_id` → `ContactNotFoundError`
  (soft-delete-aware `contactsRepo.findById` guard; an interaction never dangles off a non-live contact).
- **BR-RL-S2-3 (REL-13/14, guard)** — `updateInteraction`/`deleteInteraction` for an unknown interaction id →
  `InteractionNotFoundError` (read the row first — also yields its `contact_id` for the recompute).
- **BR-RL-S2-4 (REL-19/20/21 — the derivation, RL-3)** — `recomputeContactStats(contactId)` (pure over the ledger):
  - `interaction_count` = COUNT of the contact's interactions.
  - `last_interaction_date` = MAX `date` (ISO `YYYY-MM-DD` lexicographic = chronological); null if none.
  - `next_contact_date` = `last_interaction_date` + **cadence days**, where `cadenceDays =
    stay_in_touch_days ?? frequencyToDays(stay_in_touch_frequency)`; null if `last_interaction_date` null OR
    `cadenceDays` null (REL-21 — a contact with neither cadence set is **not tracked** for overdue → `next_contact_date`
    null). `frequencyToDays`: daily=1·weekly=7·biweekly=14·monthly=30·quarterly=90·yearly=365 (approximate day-counts;
    `stay_in_touch_days` is the exact override and takes precedence — the precision seam). UTC-safe `addDaysISO`
    (books precedent). Persists the 3 cols via `contactsRepo.update` (patch — `social_links` untouched).
  - After a delete that empties the ledger → `interaction_count:0`, `last_interaction_date:null`, `next_contact_date:null`.
- **BR-RL-S2-5 (REL-15/18, validation)** — `interaction_type`(8)/`sentiment`(3) validated via canonical Zod before
  write; bad enum → async rejection. `date` required `YYYY-MM-DD`. `duration_minutes`/`energy_given`/`energy_received`
  = int nullable; `summary`/`follow_up_notes`/`key_takeaways` = `[E]` text nullable.
- **BR-RL-S2-6** — health recompute (contract REL-12 "stats + health") is **S6** (the derived health engine); S2
  recomputes STATS only (the S6 hook composes these stats later). No forward dependency.

## §3. Surface (S2)
```ts
logInteraction(input: LogInteractionInput): Promise<InteractionRow>     // ContactNotFoundError if contact not live
updateInteraction(id: string, patch: UpdateInteractionInput): Promise<InteractionRow>  // InteractionNotFoundError
deleteInteraction(id: string): Promise<void>                            // InteractionNotFoundError
getTimeline(contactId: string): Promise<InteractionRow[]>               // date desc, created_at desc tiebreak
```
- `LogInteractionInput`/`UpdateInteractionInput` = Zod-inferred (`validators/relationship.ts`). `Create` requires
  `contact_id` + `date` (schema notNull); `interaction_type` optional (default `'in_person'`); rest optional. Update =
  partial, but `contact_id` is NOT patchable (an interaction never migrates contacts — omit from `UpdateInteractionSchema`).
- Errors: `InteractionNotFoundError` (new), `ContactNotFoundError` (reuse). `types.ts`.
- Private: `recomputeContactStats(contactId)`, `frequencyToDays(f)`, `addDaysISO(iso,n)` (service-local closures).

## §4. Acceptance
- [ ] `logInteraction` persists + recomputes: after 2 logs, `interaction_count=2`, `last_interaction_date`=the later date.
- [ ] `next_contact_date` = last + cadence: `stay_in_touch_days=10` → last+10; `stay_in_touch_frequency='weekly'` (no days) → last+7; days overrides frequency; neither set → null (REL-21).
- [ ] `updateInteraction` patches + recomputes (changing the latest `date` moves `last_interaction_date`/`next_contact_date`).
- [ ] `deleteInteraction` removes the row + recomputes; deleting the last interaction → count 0, dates null.
- [ ] `getTimeline` returns the contact's interactions, date-desc.
- [ ] `logInteraction` on a missing/soft-deleted contact → `ContactNotFoundError`; update/delete unknown id → `InteractionNotFoundError`.
- [ ] bad `interaction_type`/`sentiment` enum → validation rejection.
- [ ] tsc 0 · eslint 0 · live-store Verification (Node 22) green; full suite green (bar the infra flake).

## §5. Implementation prompt
1. **Validators** — add `CreateInteractionSchema` (contact_id, date required; interaction_type/sentiment/duration/
   summary/follow_up_needed/follow_up_date/follow_up_notes/energy_given/energy_received/key_takeaways optional) +
   `UpdateInteractionSchema` (partial, omit contact_id); inferred `LogInteractionInput`/`UpdateInteractionInput`.
2. **types.ts** — add the 4 methods to `RelationshipsService`; `InteractionNotFoundError`; import `InteractionRow`.
3. **service.ts** — `interactionsRepo` already built (S1 cascade). Add `recomputeContactStats` + `frequencyToDays` +
   `addDaysISO` closures. `logInteraction`: guard contact live → `interactionsRepo.create` (backfill `interaction_type`
   default `'in_person'` + `follow_up_needed:false` NN-defaults) → `recomputeContactStats(contact_id)` → **re-read**
   the created row (faithful, createContact precedent) → return. `updateInteraction`: read row (→ 404 + contact_id) →
   update → recompute → return (repo.update already re-reads). `deleteInteraction`: read row → `hardDelete` → recompute.
   `getTimeline`: `findWhere(eq(contact_id))` → sort date desc, created_at desc. `recomputeContactStats`:
   `contactsRepo.findById(contactId)` → **null ⇒ no-op** (defensive; a live interaction always has a live contact
   post-cascade) → compute count/max-date/next → `contactsRepo.update(contactId, {3 cols})`.
4. **tests** — extend `__tests__/service.test.ts`: cover every §4 bullet (a `describe('mod-relationships S2 …')`).
5. Verification Gate → g2 code-review → pre-ship /critique → §XXIX currency (append BR-RL-S2-*) → commit.

## Open calls (resolved, No-Guessing)
- **cadence precedence** — `stay_in_touch_days ?? frequencyToDays(frequency)` (days = exact override; schema has both
  columns, RL-3 "frequency/days"). FACT-grounded choice; approximate month/quarter/year day-counts documented.
- **getTimeline order** — date desc (contract "interaction timeline"); created_at desc tiebreak (deterministic).
- **health** — NOT S2 (S6); S2 recomputes stats only (BR-RL-S2-6).
