<!-- Last updated: 2026-10-27 by /session-end -->
| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| *(add rows as endpoints are built)* | | | | | |

## @vida/core service surfaces (local-first — not HTTP)

### `services/preferences` — `createPreferencesService({ db, deviceId })` (mod-preferences #37, LIF-133)
Config provider over the DB-4 #2 schema; plaintext (`encryptedFields: []`).
| Method | Purpose | Returns |
|--------|---------|---------|
| `getMergedPreferences()` | user config, row overlaid on DEFAULTS (never `undefined`, no persist) | `MergedPreferences` |
| `updatePreferences(patch)` | validated partial merge; create-on-first-write singleton | `MergedPreferences` |
| `getModuleVisibility()` / `setModuleVisibility(key, visible)` | nav module show/hide map (PR-7) | `Record<string,boolean>` / `void` |
| `getNavPreferences()` / `updateNavPreferences(patch)` | dock + mobile-nav config singleton | `MergedNavPreferences` |
| `recordCommand(key, label, category?)` | Cmd+K upsert-by-key (PR-6) | `void` |
| `pinCommand(key, pinned)` | set pin; no-op on unrecorded key | `void` |
| `getCommandHistory()` | pinned-then-frecency list | `CommandBarHistoryRow[]` |

## @vida/core — NotesService (mod-notes-and-pages ①, LIF-131)
`createNotesService({db, deviceId, spaces, backlinks, registry}): NotesService` — the Notes & Pages hub service (factory-object, no `this.`). Surface: pages CRUD (`createPage`/`getPage`/`updatePage`/`softDeletePage`/`getPageByJournalDate`/`getPagesByType`/`getPagesForEntity`/`listPages`) · `ensureEntityNote` + attachments (`addAttachment`/`getAttachments`/`removeAttachment`) · page-links (`createPageLink` idempotent+revive/`removePageLink`/`getPageLinksFrom`/`getPageLinksTo`/`resolveWikiLink`) · entity-link facade (`createEntityLink`/`removeEntityLink`→AR-6, `getEntityLinksFrom`/`getBacklinks`→AR-8) · entity-tag reads (`getTagsForEntity`/`getEntitiesByTag`). Errors: `JournalExistsError`, `UnregisteredEntityTypeError`. Spec: `docs/specs/features/mod-notes-and-pages/`; currency: `docs/modules/notes/current-*`.

## @vida/core — KnowledgeService (mod-knowledge ①, LIF-128) — S1–S4/8
`createKnowledgeService({ db, deviceId, spaces, backlinks, review }): KnowledgeService` — factory-object, no `this.`; composes `SpacesService` (link/tag writes) + `BacklinkResolver` (link reads) + the `foundation/review` engine (`review`, D1). Persistence: DB-6 repos, `encryptedFields:[]` (M1.0), `softDelete:true` on objects/kinds/containers/references.
| Group | Methods |
|-------|---------|
| S1 kinds | `seedDefaultKinds` · `createKind` · `listKinds` |
| S1 objects | `createObject` · `updateObject` · `getObject` · `listObjects` · `deleteObject` (cycle-safe `parent_object_id`; `mastery_level` derived, unsettable) |
| S2 containers | `createContainer` · `listContainers` · `deleteContainer` (Module⊃Area⊃Subject; membership via entity_tags, KN-7) |
| S2 references | `addReference` · `listReferences` · `removeReference` (first-class, replaces resource_urls) |
| S2 links | `linkObject` · `unlinkObject` · `listLinks` (entity_links via spaces/backlinks; never resource_type) |
| S2 tags | `tagMembership` · `untagMembership` · `listMemberships` (scoped entity_tags) |
| S3 methods | `listMethods` · `registerMethod` (capability `kind='study_method'` partition) |
| S3 curves | `listCurves` · `defineCurve` · `removeCurve` (review_curves; SM-2 preset seed = later) |
| S3 bindings | `bindMethod` · `listBindings` · `unbindMethod` (method_bindings, no-FK) · `resolveDefaultMethod(kindId)` (2-tier) |
| S4 review ② | `recordReview` (append-only review_events, no mastery write) · `getDue`/`dueIn` (due-queue) · `deriveMastery` (0–100 or null, derive-on-read via measurement.normalize) · `rollupMastery` (up parent_object_id via measurement.rollup) |
Errors: `ObjectKindNotFoundError` · `InvalidParentRefError` · `HierarchyCycleError` · `KnowledgeObjectNotFoundError` · `KnowledgeContainerNotFoundError` · `ReferenceNotFoundError` · (engine) `ReviewCurveNotFoundError` · `MethodBindingNotFoundError` · (delegated) `UnknownEntityType` · `TagNotFound` · `DuplicateCapabilityId`. Engine home: `foundation/review` (`createReviewEngine(db, deviceId, {capability})`). Spec/currency: `docs/modules/knowledge/current-{spec,business-rules}.md`. Not yet built: S5–S8.

## @vida/core — BooksService (mod-books ①, LIF-117) — COMPLETE (S1–S10, all 48 BOO legs)
`createBooksService({ db, deviceId, spaces, notes, sessions, sessionRegistry, ingestion?, attachment?, preferences?, ai?, effects? }): BooksService` — the reading-Universe service tier over DB-4 `023_books` (10 tables); factory-object, no `this.`. Required from S4/S6: `spaces`/`notes`/`sessions`/`sessionRegistry`. Deny-safe M2 ports: `ingestion?`/`attachment?`/`preferences?`/`ai?`/`effects?` (zero-signature swap). Persistence: DB-6 repos, `encryptedFields:[]` (M1.0); derive-on-read SSOT (progress/quota/pace/stats). `registerBooksJournal(registry, svc)` (module fn) = the Journal `/summary` PULL. Merged PR #70 (`4c73145`).
| Group | Methods |
|-------|---------|
| S1 works | `createBook` · `updateBook` · `softDeleteBook` · `getBook`→`BookView` · `listBooks(filter?)` · `getCapabilities`→`{plannable,readable}` (progress never settable, BR-BK-2; TOC-only first-class) |
| S2 chapters/TOC | `setChapters` (declarative upsert by `chapter_number`; dup → `ChapterUniqueViolation`) · `markChapterComplete` · `lookupBook`→`LookupResult` (deny-safe `ingestion?`) · `revokeLookupGrant` (X9) |
| S3 assets/positions | `addAsset`→`{asset,file:AttachmentRef}` (deny-safe `attachment?`; present-reject ⇒ `AssetFileError`) · `updatePosition` (SSOT) · `removeAsset` (annotations survive) · `getMappedPosition`→`MappedPosition` (BK-4 `not-synced`, never guessed) |
| S4 annotations | `addBookmark` · `addHighlight` (no notes/links, BK-6) · `addQuote` · `linkAnnotations` (`AnnotationNotLinkableError` on a highlight) · `openAnnotationNote` · `listAnnotations` · `listQuotes` |
| S5 quote-embed | `getEmbeddableQuotes({bookId?})` (per-book>global via deny-safe `preferences?`; `QuoteEmbedDisabledError` on scoped-off) |
| S6 sessions/Reader | `registerBooks` (the `reading` sub-type, `effects:[]`/C-E2) · `startSession` · `endSession` · `attachPhoto` (photo always stores; OCR via `ai?`) · `getStatistics` · `openReader`→`ReaderContext` |
| S7 plans/quota | `createPlan` (atomic; no measurement axes, C-M1) · `getTodayQuotas` · `recordQuotaProgress` · `recalculate` (`TargetUnreachableProposal` behind pace) · `getProjection` |
| S8 progress/conflict | `getUnifiedProgress`→`number\|'conflicted'\|null` (derive-on-read) · `getConflicts` (derived queue, no table) · `resolveConflict` (preset rule via `preferences?`, absent⇒no-op) |
| S9 Education/measure/tags | `scopeTag` · `linkSubject`/`unlinkSubject`/`listBooksForSubject` (`book_subjects`) · `getPaceStatus`→deny-safe `null` (Education `#52` unbuilt) · `getReadingMeasureSource` (method, KNO-25) |
| S10 integrations/fan-out/Journal | `convertToSpeech`/`transcribeForMapping`→`OcrResult` (deny-safe `ai?`; Books stamps own `defId`; no M1 consent throw) · `getPlansForConsumer` (BK-12 read-provider) · `getDayBooksDigest` + `registerBooksJournal` (Journal `/summary`) · `effects?` measurement-only fan-out on `endSession` (`emit_measurement_signal` only, C-E2) |
Errors: `BookNotFoundError` · `ChapterUniqueViolation` · `ChapterNotFoundError` · `BookAssetNotFoundError` · `AssetFileError` · `AnnotationNotFoundError` · `AnnotationNotLinkableError` · `QuoteEmbedDisabledError` · `ReadingSessionNotFoundError` · `ReadingPlanNotFoundError` · `TargetUnreachableProposal` · `PositionConflictPending` (exported, no M1 throw-site) · `IntegrationConsentError` (exported BK-14 vocabulary, no M1 throw-site). Identity: `BOOK_ENTITY_TYPE='book'` · `BOOKS_ISBN_INTEGRATION_ID` · `BOOKS_OCR_INTEGRATION_ID` · `BOOKS_TTS_INTEGRATION_ID` · `BOOKS_TRANSCRIPTION_INTEGRATION_ID` (all Books-owned, inert at M1). Spec/currency: `docs/modules/books/current-{spec,business-rules}.md`. ② `fe-books` (LIF-188) = P6.

## @vida/core — TasksService (mod-tasks ①, LIF-142) — COMPLETE (S1–S9) · PR #145 (`e1fc356`)
`createTasksService({ db, deviceId, effects?, sessions?, providers?, spaces?, notes?, views? }): TasksService` — over DB-4 `015_tasks` (`tasks` · `task_time_logs`); factory-object, no `this.`; deps after S1 optional + fail-loud (`TimerNotWiredError`, `TasksDepNotWiredError`). Durable docs: `docs/modules/tasks/current-{spec,business-rules}.md` (BR-TK-S1..S9).
| Slice | Surface |
|---|---|
| S1 CRUD | `createTask` · `updateTask` · `softDeleteTask` (app-layer cascade) · `getTask` · `listTasks(filter)` (status·priority·parent·project·completed·due_before·kind·**open**) |
| S2 sub-tasks | `addSubtask` (single level) · `getSubtasks` · `getRollup` (M4, derived) |
| S3 completion | `completeTask` / `reopenTask` + deny-safe fan-out `[award_xp, contribute_purpose_metric, emit_measurement_signal]` |
| S4 timer | `startTimer` / `stopTimer` (`'work'` session sub-type) · `getActualMinutes` · `registerTasksTimer(deps)` |
| S5 obligations | `setRecurrence` (obligation-only) + regen on complete (RRULE via `ical.js`; null-due anchor = UTC day) |
| S6 measurability | `getTaskProgress` (pursuable `progress()`, derived on read) |
| S7 aggregation | `getAggregatedTasks({by})` over the shared `ViewProviderRegistry`, per-group degradation |
| S8 tags/notes/views | `tagTask`/`untagTask`/`getTaskTags` · `getTaskNote` · `saveView`/`listViews` · `TASK_VIEW_PRESETS` · `createTasksReadProvider`/`registerTasksReadProvider` |
| S9 journal/due | `getDayTasksSummary(date)` (cross-module-integration §2 set) · `getDueReminders(range)` (SS-7 lane) · `utcDay` · `registerTasksJournal` / `registerTasksDueProvider` · `TaskViewConfig`/`TaskViewConfigSchema` |
Errors: `TaskNotFoundError` · `MultipleParentError` · `SubtaskNestingError` · `TimerAlreadyRunningError` · `TimerNotFoundError` · `TimerNotWiredError` · `RecurrenceNotAllowedError` · `RecurrenceRegenError` · `TasksDepNotWiredError` · `TaskViewNotFoundError`.


## @vida/core — RoutinesService (mod-routines ①, LIF-138) — COMPLETE (S1–S9 + S2c/S5c) · PR #162 (`d2bc57a`)
`createRoutinesService({ db, deviceId, clock?, registry, tasks, sessions, sessionRegistry, spaces, notes, habits?, prefs?, effects? }): RoutinesService` — over migration 018 (`routines` · `routine_step` · `routine_completions`); factory-object, no `this.`; per-step serialized drives. Durable docs: `docs/modules/routines/current-{spec,business-rules}.md` (BR-RT-*); delivery `docs/features/routines/delivery/`.
| Slice | Surface |
|---|---|
| S1/S2c CRUD | `createRoutine` · `updateRoutine` · `archiveRoutine` · `getRoutine` · `listRoutines` · `setLifecycle` · `addStep` (check-off ⇒ a Task) · `updateStep` · `removeStep` · `listSteps` · `reorderSteps` |
| S2/S3 ledger | `completeStep` · `runStep` (drive the entity first: task `work` session · obligation `completeTask` · habit tick · focus · any registered session sub-type) · `skipStep` · `planSkipDates` · `editCompletion` · `deleteCompletion` · `listCompletions` |
| S4/S5 judge | `evaluateRoutine` (the user's policy, `policy_source`) · `getStreak` · `getAnalytics` · `progress` (day-grain RRULE allowlist) |
| S6 reschedule | `rescheduleStep(stepId, {date, slot})` → an SS-8 `planned_blocks` intent; the acceptance-window write guard |
| S7 effects | routine-level `award_xp` + `contribute_purpose_metric` on the write that reaches policy-done · `contributeToPurposeMetrics` |
| S8 tags/notes/links | `tagRoutine`/`untagRoutine`/`getRoutineTags` + step twins · `getRoutineNote`/`getStepNote` · `linkPage`/`unlinkPage` |
| S9 providers | `dueIn(range)` · `getDueReminders(range)` (SS-7 lane + closed-block drop) · `summary(date)` (Journal) · `registerRoutinesJournal` / `registerRoutinesDueProvider` (shipped, not called — fe-routines wires them) |
Errors: `RoutineNotFoundError` · `StepNotFoundError` · `CompletionNotFoundError` · `InvalidRecurrenceRuleError` · `EntityUnavailableError` · `InvalidRoutinePolicyError` · `OutsideAcceptanceWindowError` · `NotMissedOccurrenceError` · `InvalidRescheduleSlotError` · `RoutineContributionError`. Sessions additions (S6, R1): `planBlock` · `updatePlannedBlock` · `softDeletePlannedBlock` · `listPlannedBlocksForTarget`; `dueIn` lists pending block intent only.
