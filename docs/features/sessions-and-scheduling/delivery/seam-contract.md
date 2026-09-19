<!-- Seam Contract — features/sessions-and-scheduling · MOD-sessions ① (LIF-139) · Entity Delivery Flow §2.
     The service API the consumers feel: fe-sessions (② UI) + Journals (dueIn). INTENDED signatures — the
     authored spec-set (service/) details return shapes + validators per slice. Types live in @vida/types. -->

# Seam Contract — `services/sessions` (the API `fe-sessions` + Journals consume)

`createSessionsService({ db, deviceId, repository, registry, effects }) → SessionsService` — factory-object,
no `this.` (IR-8). All mutating methods are **async** (rejection, not sync throw — IR-8). All reads
decrypt-on-read; all writes encrypt-on-write + enqueue `sync_queue` via `Repository` (D5). Every method that
can fail returns a typed error from the taxonomy below — never a bare throw or silent no-op.

## Surface by slice

```ts
// S1 — Session CRUD + attach
createSession(input: CreateSessionInput): Promise<Session>            // validates sub_type/purpose/scheduling_mode
getSession(id: string): Promise<Session | null>                       // null = not found (not an error)
updateSession(id: string, patch: SessionPatch): Promise<Session>
softDeleteSession(id: string): Promise<void>
restoreSession(id: string): Promise<Session>
attach(sessionId: string, entityType: string, entityId: string, level: 'type' | 'instance'): Promise<Attachment>
detach(attachmentId: string): Promise<void>
resolveTargets(sessionId: string): Promise<ResolvedTarget[]>          // read via #32 attachments.ts

// S2 — createSession validation + completion wiring
// (createSession above gains runtime registry validation; completion is:)
completeSession(id: string): Promise<{ status: SessionStatus; fired: FiredEffect[] }>  // → #32 transition(id,'complete')
transitionSession(id: string, event: LifecycleEvent): Promise<{ status: SessionStatus; fired: FiredEffect[] }>

// S3 — Pomodoro focus runtime (thin, over the Session API — pomodoro/contract.md)
startFocus(input: { sessionId?: string; templateId?: string; attach?: AttachInput }): Promise<FocusTimer>
pauseFocus(timerId: string): Promise<FocusTimer>
resumeFocus(timerId: string): Promise<FocusTimer>
completeFocus(timerId: string): Promise<{ timer: FocusTimer; fired: FiredEffect[] }>
cancelFocus(timerId: string, opts?: { interruptionReason?: string }): Promise<FocusTimer>
nextInterval(timerId: string): Promise<FocusTimer>                    // focus→break→focus per cadence, honors auto_start_*

// S4 — Availability
setAvailability(input: AvailabilityInput): Promise<Availability>
addAvailabilityException(input: ExceptionInput): Promise<AvailabilityException>
listAvailability(): Promise<Availability[]>

// S5 — Plan batch lifecycle endpoints (NO placement algorithm)
generatePlan(scope: PlanScope, window: TimeWindow): Promise<PlanBatch>   // endpoint shell; algorithm deferred → may yield an empty/draft batch
approvePlan(batchId: string): Promise<PlanBatch>
activatePlan(batchId: string): Promise<PlanBatch>                        // SS-8: may createSession() per block
recalcPlan(batchId: string): Promise<PlanBatch>

// S6 — session_templates CRUD
createTemplate(input: TemplateInput): Promise<SessionTemplate>
updateTemplate(id: string, patch: TemplatePatch): Promise<SessionTemplate>
deleteTemplate(id: string): Promise<void>
listTemplates(): Promise<SessionTemplate[]>
setDefaultTemplate(id: string): Promise<void>                            // single-winner (unsets others)

// S7 — dueIn aggregator (SHARED PLATFORM PRIMITIVE — Journals + future Calendar) + analytics
dueIn(range: TimeRange): Promise<DueItem[]>                              // own planned_blocks ∪ live provider reads
registerDueProvider(provider: DueProvider): void                        // empty registry seam (N5)
getSessionAnalytics(range: TimeRange): Promise<SessionAnalytics>        // derived-on-read (IR-6), never stored
```

## Key shapes (canonical in `@vida/types`)
- `DueItem = { source_module: string; ref_id: string; label: string; est_minutes: number; urgency: number; hard_deadline?: number }` `[FACT: contract.md:33-35]`
- `FiredEffect = { effect_type: EffectType; target: ResolvedTarget; effect_event_id: string }` (from #32 rail)
- `FocusTimer` reflects `focus_sessions`: `{ session_id, type, status, completed_count, total_pause_seconds, was_interrupted, … }`

## Typed error taxonomy (fail-loud — contract.md:60-65 + pomodoro/contract.md:55-62)
`InvalidTransition(session, event)` · `AttachmentTargetMissing(entity)` · `PermissionDenied(type, effect, target)` ·
`ProviderUnavailable(module)` (degrades one `dueIn` lane) · `NoAvailability` / `NothingToSchedule` (plan) ·
`NoFocusSession` / `SessionMissing(id)` (focus runtime) · `InvalidSessionInput(field)` (validation, IR-5) ·
`DuplicateSubType` / `InvalidSessionTypeDef` (registry, from AR-5).

## Consumers
- **`fe-sessions` (② UI):** the whole surface — session list, availability grid, plan review/approve, templates, focus runtime driver.
- **Journals (`MOD-journals`):** `dueIn(today)` for the daily agenda (IR-2). MOD-journals is currently blocked on this.
- **Future Global Calendar (M2):** `dueIn(range)` full range + reads `planned_blocks`.
