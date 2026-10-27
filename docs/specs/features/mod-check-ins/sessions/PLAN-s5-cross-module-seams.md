# PLAN — check-ins ① · S5 Cross-module seams (final slice)

Status: draft (gate-1 = this spec) · Session: 2026-09-19-mod-check-ins · Slice: S5 (legs CHE-16, CHE-17, CHE-15, CHE-28, CHE-25, CHE-29)
No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. The DEFERRED BOUNDARY (delivery-plan §9:261-265, parts §4a) is the spine — ① builds the emission POINTS + placeholders; the APPLY/aggregation is deferred.

## 1. Identity

Wire check-ins' cross-module seams: the Journal `entity_links` re-feed, the `grant_currency` emission point, and
the placeholder review aggregator. **All respect the deferred boundary** — ① provides the check-ins-side POINT;
the other side (Gamification apply · Journal consume · Purpose/Projects/Tasks aggregation) is built elsewhere.
**What it is NOT:** not the XP apply (→ M1.2 Gamification), not the reminder fire (→ M1.2 Notifications, CHE-24
out of the 28), not the full review aggregation (→ cross-module finalization), not the `/summary` consumption
(→ MOD-journals).

## 2. Business Rules

- **Optional collaborators (dormant-seam pattern).** `CheckInsServiceDeps` gains OPTIONAL `journal?` +
  `effects?`. Absent (M1.0 wiring, or a unit test) → the seam is a documented no-op; present (app / M1.2) → it
  fires. This keeps S1–S4 construction (`{db, deviceId}`) valid and makes the deferred apply fail-SAFE, not
  fail-loud. `[INTERP grounded in delivery-plan §9:261 "Deferred — HOMED → M1.2"; the notes narrow-dep precedent]`
- **CHE-16 — Journal day-page re-feed, link-don't-copy (CK-7).** On `createCheckIn`/`updateCheckIn`, IF `journal`
  is injected AND a journal `pages` row exists for the check-in's date, write an `entity_links` row
  (`entity_type='daily_check_in'`, the check-in id) to that page via the injected collaborator. Never copies
  content; never CREATES the journal page (that's notes' job — best-effort link when the page exists).
  Idempotent (the underlying `createLink` revives/no-ops a dup). `[FACT: parts CHE-16; conventions.md:17; notes getPageByJournalDate+createEntityLink]`
- **CHE-17 — `grant_currency` emission point (emit-only; apply DEFERRED → M1.2).** On `createCheckIn` (the
  completion event — "No S4", CHE-17), IF `effects` is injected AND a handler is registered for `grant_currency`
  (`registry.resolve` — M1.2 Gamification registers it), call `rail.applyEffect({subjectNaturalKey: id,
transition: 'completed', effectType: 'grant_currency', targetRef: id})`. **Guarded** (optional dep + handler
  check) so M1.0 (no handler) is a no-op, never a `NoEffectHandler` crash. Check-ins NEVER writes XP /
  `consequence_ledger` / `user_profile` (E2/E3 — Gamification applies). `[FACT: parts CHE-17; effects/service.ts:38-40 NoEffectHandler; session.ts:96 grant_currency; delivery-plan §9:261]`
- **CHE-15/28/25 — placeholder review (full aggregation DEFERRED).** `getReviewData(type)` returns a PLACEHOLDER
  `ReviewData` — a degraded shape (empty module sections + a `degraded:true`/`partial` flag → the ② "free
  reflection" fallback), NEVER a falsely-complete review (CK-6/§5). The real Purpose/Projects/Tasks aggregation +
  `target_reviews` contribution (CHE-25) are cross-wave, finalized when those modules document. M1.1 ships the
  placeholder only. `[FACT: parts CHE-15/25/28; delivery-plan §9:260,263-264; business-rules.md:66,73]`
- **CHE-29 — provide `/summary` data (consumption is journals-side).** Check-ins already PROVIDES the readable
  data via `getCheckIn`/`listCheckIns` (S2); the `summary(date)` contributor registration is MOD-journals' side.
  So CHE-29 is COVERED by the existing reads — named here for boundary completeness, no new ① method. `[FACT: parts CHE-29; delivery-plan §9:265]`
- **Hook ordering + failure semantics (IR-13 eventually-consistent).** The `refeedJournal`/`emitGrantCurrency`
  hooks run **AFTER** the DB create/update commits (they need the persisted id). A side-effect failure MUST NOT
  corrupt the persisted check-in — the check-in is the primary write; the link/emit are separate, **re-drivable**
  operations (IR-13: no-FK cross-entity writes are eventually-consistent + re-drive, not atomic). A genuine error
  propagates (fail-loud, never a silent swallow); the check-in already stands (no rollback). The emit fires
  **only on `createCheckIn`** (the completion event — "No S4", CHE-17); `updateCheckIn` **re-feeds only** (a
  content edit is not a re-completion → no double-emit). `[FACT: IR-13; parts CHE-17 "No S4"; conventions.md:17]`

## 3. Contract

```ts
// narrow injected collaborators — satisfiable by the real services, no heavy import coupling
interface JournalLinkPort {
  getPageByJournalDate(date: string): Promise<{ id: string } | null>
  createEntityLink(pageId: string, entityType: string, entityId: string, context?: string): Promise<unknown>
}
interface EffectsPort {
  rail: EffectRail
  registry: EffectRegistry
}
interface CheckInsServiceDeps {
  db: DrizzleDb
  deviceId: string
  journal?: JournalLinkPort
  effects?: EffectsPort
}

interface ReviewData {
  type: CheckInType
  sections: never[]
  degraded: true
  note: string
} // M1.1 placeholder
interface CheckInsService {
  // + S5
  getReviewData(type: CheckInType): Promise<ReviewData> // CHE-15/28
}
```

`JournalLinkPort` is a structural subset of `NotesService` (`getPageByJournalDate` + `createEntityLink`) — the
app injects the real notes service; a test injects a stub. `createCheckIn`/`updateCheckIn` gain the internal
re-feed + emit hooks (signatures unchanged).

## 4. Acceptance

- [ ] With no `journal`/`effects` deps (S1–S4 construction), createCheckIn/updateCheckIn behave exactly as before (no crash, no emit, no link).
- [ ] CHE-16: with a `journal` stub + an existing day page, createCheckIn writes an entity_link (daily_check_in → page); no page → no link (best-effort); updateCheckIn re-feeds; idempotent.
- [ ] CHE-17: with `effects` + a registered `grant_currency` handler, createCheckIn fires exactly one applyEffect; with the dep but NO handler → no-op (no throw); no XP/ledger/user_profile write ever.
- [ ] CHE-15: getReviewData returns the degraded placeholder (never falsely complete).
- [ ] tsc 0 · ESLint clean.
- [ ] **Verification Gate:** Vitest + live-store smoke (real day-page link write via a stub journal port; emit fires with a mock handler, no-ops without).

## 5. Implementation Prompt

1. `types.ts` — add `JournalLinkPort`, `EffectsPort`, `ReviewData`; extend `CheckInsServiceDeps` (optional deps) + `CheckInsService` (getReviewData).
2. `service.ts` — destructure `journal`/`effects`; add private `refeedJournal(checkIn)` (CHE-16) + `emitGrantCurrency(checkIn)` (CHE-17, guarded via `effects.registry.resolve('grant_currency')`) hooks. Call order: createCheckIn = create → `refeedJournal` → `emitGrantCurrency` (post-commit, §2 ordering); updateCheckIn = update → `refeedJournal` only (no emit). `getReviewData` returns the placeholder. Import `EffectRail`/`EffectRegistry`/`EffectEvent` types.
3. `index.ts` — export `ReviewData`, `JournalLinkPort`, `EffectsPort` types.
4. `__tests__` — add S5 cases (§4) with stub `journal` + mock `effects` (a registry with/without a grant_currency handler); assert no user_profile write.
5. `pnpm --filter @vida/core test` + `tsc --noEmit` → §4 done-check. Currency Rule: refresh current-spec (① COMPLETE).

## 6. Open UNKNOWNs

- [none blocking] — the deferred boundary is doc-fixed; the placeholder `ReviewData` shape is a minimal ①
  degraded stub (② owns the real presentation), grounded in "placeholder aggregation only (R1 deferred)".

## 7. Change Log

| Date       | Session                  | Change                                                                    |
| ---------- | ------------------------ | ------------------------------------------------------------------------- |
| 2026-09-19 | 2026-09-19-mod-check-ins | S5 PLAN draft (final slice — cross-module seams, deferred-boundary spine) |
