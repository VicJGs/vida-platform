# IMPLEMENTATION-PLAN — DB-9 · Canonical enums + Zod validators   (session: 2026-07-28-db-9-enums-zod)
> Gate 2 (Human Gate 2). The technical HOW — ordered build steps. Direction + business rules = the PLAN (Approval 1 ✅).
> Executed by `victor:execute-plan-code`. No-Guessing: [FACT]/[INTERP]/[UNKNOWN].
> Locked (Approval 1): **(A) comprehensive · (C2) tuple-as-source in `@vida/types` · (ii) assert-only** (no `sqlEnumCheck`).

## A. Files touched
| File | Action | Why |
|------|--------|-----|
| `packages/core/package.json` | edit | add `zod` runtime dep (first in repo) — validators need it |
| `packages/types/src/common.ts` | edit | 5 shared enums → tuple + derived type (`Status·Priority·Frequency·LifeDomain·NotificationType`) |
| `packages/types/src/sync.ts` | edit | `SyncStatus·SyncOperation·SyncQueueStatus` → tuples (these become the canonical source the schema imports) |
| `packages/types/src/{finance,task,note,habit,routine,project,relationship,learning,knowledge,editor,api,encryption}.ts` + `entities/user.ts` | edit | each domain's string-literal enums → tuple + derived type (inventory in §B2) |
| `packages/types/src/CLAUDE.md` | edit | line 6 identity: document that the package now owns canonical enum **tuples** (runtime string arrays, still no `zod`) |
| `packages/core/src/validators/*.ts` (one per domain file) + `validators/index.ts` | **new** | `export const <Type>Schema = z.enum(<TUPLE>)` per enum, importing the tuple from `@vida/types` |
| `packages/core/src/index.ts` | edit | re-export `./validators` (canonical validators become part of the `@vida/core` public surface) |
| `packages/core/src/db/schema/foundation/sync-queue.ts` | edit | drop local `OPERATIONS`/`STATUSES` (`satisfies`, subset-only); import canonical `SYNC_OPERATION`/`SYNC_QUEUE_STATUS` tuples |
| `packages/core/src/validators/enum-parity.test.ts` | **new** | SQL-level parity: live-table CHECK set ≡ tuple (fixture-driven) + deliberate-drift negative |
| `packages/core/src/validators/enums.test.ts` | **new** | each `z.enum` accepts all members / rejects a non-member (§XIX both directions) |
| `packages/core/src/db/migrations/001_sync_queue.ts` | **verify only** | CHECK values already equal the tuples — add to parity fixture; **no DDL change** |
| `packages/core/src/db/schema/_registry.ts` | **leave as-is** | `ENTITY_TYPES` is a DB-side seed registry (appended per-feature), not a `@vida/types` domain enum — OUT of DB-9 |

## B. Build order (type-first — `victor:planning`)

**B1 — add `zod`.** Add `zod@^4.4.3` to `packages/core/package.json` deps; `pnpm install`. **VERIFIED (2026-07-28, npm +
context7):** current zod = **4.4.3**; `z.enum`'s signature is `<const T extends readonly string[]>` and the docs
*prescribe* `const V = [...] as const; z.enum(V)` — so a `readonly`/`as const` tuple is accepted **directly, no cast**.
`[FACT: npm view zod version = 4.4.3; z.enum readonly support verified]` (No `enumOf` cast helper is needed at 4.x — it
was a fallback for pre-3.23 zod only; omit it. The anti-spread rule stands: never `z.enum([...TUPLE])` — spreading widens
to `string[]` and loses the literals.)

**B2 — `@vida/types`: union → tuple-as-source (C2), every categorical string-literal enum.** For each enum
`export type X = 'a' | 'b' | …` becomes:
```ts
export const X_CONST = ['a', 'b', …] as const          // SCREAMING_SNAKE of the type name
export type X = (typeof X_CONST)[number]                 // derived — identical union, name + assignability preserved
```
Naming rule: tuple const = **SCREAMING_SNAKE_CASE of the type name** (`Status`→`STATUS`, `AccountType`→`ACCOUNT_TYPE`,
`TaskDifficulty`→`TASK_DIFFICULTY`, `EntityLinkTarget`→`ENTITY_LINK_TARGET`). Type and value namespaces are separate and
casing differs → **no collision**. Type names are already unique across the `export *` barrel `[FACT: types/index.ts]`,
so the derived consts are unique too. **Selection rule (No-Guessing):** convert **only** ≥2-member string-literal
categorical unions; **skip** aliases (`Id=string`), numeric/object/discriminated unions, and generic aliases. When a
union's members are non-literal, leave it untouched and note it.
Inventory (from the 2026-07-28 baseline — the executor confirms each is categorical before converting):
- **common.ts:** Status, Priority, Frequency, LifeDomain, NotificationType `[FACT: common.ts:32-79]`
- **sync.ts:** SyncStatus, SyncOperation, SyncQueueStatus `[FACT: sync.ts:12-82]` — do these FIRST (schema depends on them, B4)
- **finance.ts:** AccountType, TransactionType, AssetType, LiabilityType, InvestmentType, IncomeType, WorkType
- **task.ts:** TaskDifficulty  · **habit.ts:** HabitType, HabitFrequency, HabitTimeOfDay
- **routine.ts:** RoutineActionType, RoutineTimeOfDay, RoutineRecurrenceFrequency
- **project.ts:** ProjectScope, ProjectComplexity, TargetType, CalculationMethod, BucketListCategory, BucketListStatus
- **relationship.ts:** RelationshipType, InteractionType, Sentiment, ContactEventType
- **learning.ts:** CourseType, CourseStatus, BookFormat, BookStatus, MasteryLevel, SkillResourceType, StudySessionResourceType, LanguageProficiency, LanguageStatus, LearningPhase, LanguageSkillType, PracticeActivityType, VocabularyMastery, RecordingType, WeeklyTopic, BaseWordCategory
- **knowledge.ts:** StudyTopicStatus, TopicDifficulty, FlashcardResourceType, PresetBlock, StudyPlanBatchStatus, ScheduledSessionType, ScheduledSessionStatus, ScheduledResourceType
- **note.ts:** PageType, EntityLinkTarget (36), PomodoroType, PomodoroStatus, PomodoroEntityType
- **editor.ts:** StandardBlockType, IntegrationBlockType, ExportFormat, DailySummarySectionType, ChartType, SlashCommandCategory
- **api.ts:** DevicePlatform  · **encryption.ts:** FieldClassification (`FIELD_CLASSIFICATION`, `encryption.ts:92`), VaultState (`VAULT_STATE`, `encryption.ts:159` — note `key-management.ts:17` uses it as a value-typed annotation, harmless) · **entities/user.ts:** Persona, AchievementCategory, AchievementTier, CheckInType, CheckInScheduleType, CheckInPreferredTime, CheckInQuestionFieldType, Theme, TimeFormat, DockPosition, DockSize
> **~83 enums in scope** (88 `export type` unions − 5 non-categorical: the `string`/`number` aliases + the composed
> `BlockType = StandardBlockType | IntegrationBlockType`, which stays as-is). If any listed name proves non-categorical
> or renamed at build time, record it in Route History and skip — do not force.

**B3 — `@vida/core/src/validators/`: the canonical Zod layer.** One file per `@vida/types` domain file (`common.ts`,
`sync.ts`, `finance.ts`, …), each:
```ts
import { STATUS, PRIORITY, … } from '@vida/types'
import { z } from 'zod'
export const StatusSchema = z.enum(STATUS)            // <Type>Schema, PascalCase, discoverable next to the type
```
`validators/index.ts` barrels them; `packages/core/src/index.ts` adds `export * from './validators'` (verified
collision-free — no `validators/` path exists and index uses named exports + one `export * as schema`
`[FACT: core/src/index.ts]`). `z.enum(TUPLE)` takes the `as const` tuple directly (B1) — **no cast helper**. No literals
are re-declared here — every schema is built from its `@vida/types` tuple (BR-DB9-1). `[FACT: ADR-002:72 validators live
in packages/core]`

**B4 — dedup the schema tuples (upgrade to exhaustive parity).** In `db/schema/foundation/sync-queue.ts`, delete the
local `const OPERATIONS = […] as const satisfies readonly SyncOperation[]` and `STATUSES` `[FACT: sync-queue.ts:20-21]`;
import the canonical `SYNC_OPERATION` / `SYNC_QUEUE_STATUS` tuples from `@vida/types` and feed them to `enumText()`.
Net: one source, and the tuple is now **=** the union (was ⊆ under `satisfies`). No column-shape change.

**B5 — parity + validator tests.**
- `enum-parity.test.ts` (SQL-level, better-sqlite3 harness — copy the working `createBetterSqlite3Driver` + `migrate`
  pattern that already exists in `db/tests/repository.test.ts` / `apps/web/src/db/web-adapter.test.ts` `[FACT: both
  contain it; sqlite_master returns CHECK text verbatim — verified]`): build the driver, `migrate(driver)` to create
  `sync_queue`, read `SELECT sql FROM sqlite_master WHERE name='sync_queue'`, extract each `CHECK (<col> IN ('…','…'))`
  set with a regex, and assert it **equals** the tuple. **⚠ Guard against false-PASS:** first assert the extractor
  produced a **non-empty** match for every fixture column (a regex that matches nothing must FAIL, not silently
  compare `[]==[]`). **Fixture scope = `@vida/types`-sourced enums only** = `[{table:'sync_queue', column:'operation',
  tuple: SYNC_OPERATION}, {table:'sync_queue', column:'status', tuple: SYNC_QUEUE_STATUS}]`. (`ENTITY_TYPES` in
  `_registry.ts` is a core-side seed registry, deliberately **not** in this fixture.) **Documented convention:** each
  future DB-4 slice appends its `(table,column,tuple)` row here — explicit, not auto-discovered (no enum→table registry
  exists `[FACT: only ALL_MIGRATIONS + ENTITY_TYPES today]`).
- **Deliberate-drift negative:** feed the comparator a synthetic CHECK set with one extra / one missing member and assert
  it **fails** — proves the guard actually catches drift (BR-DB9-1).
- `enums.test.ts`: for a representative spread across domains (incl. the 36-wide `EntityLinkTarget` and a shared enum),
  assert `Schema.parse(member)` succeeds for every member and `Schema.safeParse('__nope__').success === false` (§XIX
  both directions — BR-DB9-4).

**B6 — docs.** Update `packages/types/src/CLAUDE.md:6` from "No runtime code (only `APP_NAME`…)" to state the package now
also exports **canonical enum tuples** (plain `as const` string arrays; still **zero `zod`, zero deps**) as the single
source for each enum's union/validator/CHECK — the disclosed C2 identity change. `[FACT: types/CLAUDE.md:6]`

**B7 — verify (⚠ rebuild `@vida/types` dist FIRST).** `@vida/types` is consumed via its built `dist/` — there is **no
`@vida/* → src` path mapping** and `pnpm --filter <pkg> <script>` does **not** trigger turbo's `^build`, so a raw
per-filter typecheck/test would resolve core's new tuple imports against the **stale union-only dist** → false-green or
spurious-fail on the very step that proves non-breaking. `[FACT: types/package.json exports→dist; tsconfig.base.json no
paths; turbo.json typecheck.dependsOn ^build only at turbo level]` Sequence:
1. `pnpm --filter @vida/types build` (emit fresh dist after B2) — **mandatory before any core step**.
2. `pnpm --filter @vida/core typecheck` → `pnpm --filter @vida/core test`.
3. **`pnpm typecheck` + `pnpm test` at root** (these carry `^build` via turbo, so they rebuild deps automatically) —
   the authoritative pass, with **ZERO consumer edits** = the load-bearing proof that C2 is non-breaking (BR-DB9-2).
If any consumer breaks, STOP → §XXVIII (the non-breaking assumption failed for that case).

## C. Risks / watch-items
- **[RESOLVED] `z.enum` + `readonly` tuple.** zod 4.4.3 accepts `as const` tuples directly (B1, verified). No cast, no
  spread. Closed.
- **[RISK — MF-1] dist staleness.** Per-filter `@vida/core` steps resolve `@vida/types` via stale `dist/`. Mitigated by
  B7.1 (`pnpm --filter @vida/types build` first) + the root `pnpm typecheck`/`pnpm test` authoritative pass. If a core
  step errors on a missing tuple export, the dist wasn't rebuilt — rebuild, don't chase a phantom.
- **[RISK] volume × mechanical.** ~83 enums across 14 files. The risk is a typo'd/omitted member, not architecture —
  which is exactly why the derived type (`typeof T[number]`) + `pnpm typecheck` catch any member that drifts from a
  consumer's expectation, and the parity test catches any that drift from a CHECK. Convert file-by-file, typecheck between.
- **[RISK] const/type name collision.** None expected (separate namespaces + casing), but if a file already exports a
  value named like the SCREAMING_SNAKE const, rename per Route History — do not shadow.
- **[BOUNDARY] per-domain CHECK migrations = DB-4**; full row/request Zod schemas = other units; runtime validation
  wiring into the repository = consumer choice. DB-9 ships the canonical **sets + validators + parity test** only.

## D. Approval 2
`/preflight` → **PASSED**: every layer specified (dep, tuple refactor, validators, dedup, parity, docs, verify); the
sole `[UNKNOWN]` (zod readonly) is now **resolved by /verify** (zod 4.4.3, no cast) — no guessing remains. 2nd
independent `/critique` on this impl-plan → **REVISE → all fixed**: **MF-1** dist-staleness (B7 now rebuilds `@vida/types`
first + root pass is authoritative), **MF-2** missing `FieldClassification`/`VaultState` enums (added to B2; count → ~83),
**N-1** dead cast helper (dropped), **N-2** parity false-PASS (B5 non-empty-match guard added), **N-3** fixture scope
(clarified `@vida/types`-sourced only). Critique confirmed 8 load-bearing claims survived — incl. non-breaking identity
(all consumers `import type`), the `enumText` readonly-tuple contract, and `sqlite_master` CHECK-verbatim.
**✅ Approval 2 GRANTED (Victor, 2026-07-28).** `victor:execute-plan-code` works B1→B7; verify between steps; report
before commit.
