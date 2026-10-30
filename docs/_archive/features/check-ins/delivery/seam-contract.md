# Seam Contract — check-ins ① → ② (the service API the UI consumes)

> Entity Delivery Flow · Step 2. The `@vida/core` `createCheckInsService()` surface `fe-check-ins` (②) binds to. Signatures are the DESIGNED interface (RATIFY from `parts/check-ins.md` contract cites); exact types finalized in each slice's per-slice spec. Factory-object shape (no `this.`), validating methods `async`.
> Session: 2026-09-19-mod-check-ins.

## Factory

```ts
createCheckInsService(deps: { repo, effectRail, links, clock }): CheckInsService
```

Mirrors `createPreferencesService`/`createJournalsService`. `encryptedFields: []` at M1.0 (CHE-30 pass-through).
`[INTERP — finalize the exact deps set in the S1/S2 per-slice spec against the sibling service constructors; `effectRail`/`links`/`clock` are the designed collaborators for CHE-17/CHE-16/streak-asOf, not doc-cited names.]`

## Entries (S2)

```ts
createCheckIn(input: CreateCheckInInput): Promise<DailyCheckIn>        // CHE-01 · throws DuplicateCheckInError on (date,type) collision
updateCheckIn(id: Id, patch: UpdateCheckInInput): Promise<DailyCheckIn> // CHE-02 · re-feeds Journal day-page link (S5)
getCheckIn(date: string, type: CheckInType): Promise<DailyCheckIn | null> // CHE-03
listCheckIns(range: { from: string; to: string }): Promise<DailyCheckIn[]> // CHE-04 · history/calendar
```

## Templates & questions (S3)

```ts
getActiveTemplate(type: CheckInType): Promise<CheckInTemplate>          // CHE-05 · default-first
createTemplate(input): Promise<CheckInTemplate>                          // CHE-06
updateTemplate(id, patch): Promise<CheckInTemplate>                      // CHE-07
addQuestion(templateId, q): Promise<CheckInTemplateQuestion>            // CHE-08 · throws on dup field_key
reorderQuestions(templateId, orderedFieldKeys: string[]): Promise<void> // CHE-09
removeQuestion(templateId, fieldKey: string): Promise<void>            // CHE-10
setSchedule(templateId, cfg: ScheduleConfig): Promise<CheckInTemplate>  // CHE-11 · config only
seedDefaultTemplates(): Promise<CheckInTemplate[]>                       // CHE-12 · one per 6 types
deleteTemplate(id: Id): Promise<void>                                    // CHE-22 · app-cascade: null entries' template_id, delete questions
```

## Derivations (S4)

```ts
getMoodEnergyTrend(range): Promise<TrendDataset>                         // CHE-13 · plaintext scales
computeCheckInStreak(asOf?: string): Promise<StreakResult>              // CHE-14 · derived, NO user_profile write
```

## Cross-module seams (S5)

```ts
getReviewData(type: ReviewType): Promise<ReviewData>                     // CHE-15/CHE-28 · PLACEHOLDER aggregation + degrade-to-free-reflection
// internal on create/update: writes entity_links day-page re-feed (CHE-16) + emits grant_currency(XP) via effectRail (CHE-17)
// provides summary(date) contribution data consumed by MOD-journals (CHE-29)
```

## Typed errors (CHE-27, fail-loud)

`DuplicateCheckInError` (CHE-01, FACT — named in contract.md:46) · `DuplicateFieldKeyError` (CHE-08) · `ScaleOutOfRangeError` (CHE-19) · `RequiredQuestionUnansweredError` (CHE-20) · partial-review flag (never a falsely-complete review, CHE-15/28).
`[INTERP — only DuplicateCheckInError is doc-named; the other error CLASS NAMES are designed placeholders, finalized in each slice's per-slice spec. The docs fix the BEHAVIOR (typed error on dup field_key / out-of-range / unanswered required), not the identifier.]`

## Boundary guards (② must not expect these from ①)

- No XP/`consequence_ledger` write (CHE-17 emit-only — Gamification applies).
- No `user_profile.check_in_streak*` write (CHE-14 derive-only).
- No reminder fire (CHE-24 → Notifications; ① persists config only).
- No tag surface (CHE-26 — links, not tags).
- Full cross-module review aggregation is a placeholder until Purpose/Projects/Tasks contracts finalize (CHE-15).
