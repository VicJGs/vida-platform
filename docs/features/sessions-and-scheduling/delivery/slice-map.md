<!-- Slice Map — features/sessions-and-scheduling · MOD-sessions ① (LIF-139) · Entity Delivery Flow §2/§8.
     Mode: RATIFY + detail — the ① surface is fixed by m1.1-delivery-plan.md:238-249; this records the slices,
     tags each plane, orders them by dependency, and attaches the per-slice Verification-Gate ledger. -->

# Slice Map — MOD-sessions ① (backend service `services/sessions`)

All slices are **backend**. The ② frontend slices (session/planner hub, `/pomodoro` widget-lens) belong to
`fe-sessions` and are out of scope here. Envision Gate N/A (pure backend — interpretation.md).

**Home:** `packages/core/src/services/sessions/` (NEW). Factory-object service (`createSessionsService`),
mirroring `foundation/spaces/service.ts` (D7). Each slice: PLAN ░g1░ → IMPL ░g2░ → BUILD → **Verification
Gate (blocking)** before the next slice. No batching, no "owed" gates.

**Verification Gate (every slice):** Vitest (logic + failure paths) → typed-error assertions → **live smoke on
the REAL data store with an UNLOCKED vault** (N1 — the write path exercises the encrypt/persist/content-hash
seam a mock hides) → PASS before the next slice.

| Slice | Plane | Surface (what it builds) | Tables | Depends on | Key rules |
|-------|-------|--------------------------|--------|------------|-----------|
| **S1 — Session CRUD + attach** | backend | `createSession`/`getSession`/`updateSession`/`softDelete`/`restore` over the spine + 1:1 extension write; `attach(session_id, entity_type, entity_id, level)` / `detach` / `resolveTargets` (read via #32) | `sessions`, `study_sessions`, `focus_sessions`, `session_attachments` | D1,D2,D4,D5 | BR-S1 (spine fields never re-stored in extension), IR-7 (attachments no `deleted_at`), IR-5 (typed validation) |
| **S2 — createSession + registry validation + completion wiring** | backend | runtime `sub_type`/`entity_type` validation against `SessionRegistry` on the write path; wire completion → `transition(deps, id, 'complete')` (the #32 engine) | `sessions`, `session_type_registry` | S1, D1,D2,D3 | **IR-1** (route through existing `transition()`, no second firing path), BR-3/BR-4 (registry containment), IR-5 |
| **S3 — Pomodoro focus runtime** | backend | `startFocus`/`pause`/`resume`/`complete`/`cancel`/`nextInterval` over `focus_sessions`; pause-exclusion + interruption capture + interval cadence; config resolution | `focus_sessions`, `sessions` (via S2 createSession) | S2, D6,D8 | **IR-3** (template→prefs→PD-3 defaults; mid-run change → next interval), **IR-4** (real focus = elapsed−paused; `was_interrupted`), IR-5 (illegal resume rejected) |
| **S4 — Availability** | backend | `setAvailability(day_of_week, window, preference)` / `addException(date, …)` CRUD | `study_availability`, `availability_exceptions` | S-none (only D4,D5) | SS-9 (Planner-owned input), BR-5c CHECKs (day 0..6, score 1..5), `reason` `[E]` seam |
| **S5 — Plan batch lifecycle endpoints** | backend | `approve`/`activate`/`recalc` batch state machine (draft→pending_approval→approved→active→completed→failed); `generatePlan` = **endpoint shell only** (no placement algorithm — G5 deferred) | `study_plan_batches`, `planned_blocks` | S1 | SS-8 (block↔session = intent↔reality; activate may `createSession`), `NoAvailability`/`NothingToSchedule` typed (never silent empty batch), `name` `[E]` |
| **S6 — session_templates CRUD** | backend | focus-preset CRUD (`create`/`update`/`delete`/`list`/`setDefault`) | `session_templates` | S-none (only D4,D5) | PD-3 (Sessions-owned focus presets), `name`/`description` `[E]`, `is_default` single-winner |
| **S7 — dueIn aggregator + analytics** | backend (shared primitive) | `dueIn(range): DueItem[]` = own `planned_blocks` ∪ live provider reads (empty provider registry seam); derived session analytics getters | `planned_blocks`, `sessions` (read) | S1, S5 | **IR-2** (shared platform primitive, general `DueItem` shape), **N5** (`ProviderUnavailable` degrades one lane), **IR-6** (analytics derived-on-read, never stored) |

## Order & rationale
`S1 → S2 → S3` is the critical chain (focus runtime needs `createSession`, which needs the spine write + registry
validation). `S4`, `S6` are independent CRUD (can run any time after the factory scaffold). `S5` needs `S1`
(batch→session bridge). `S7` is last (it reads blocks + the session log). Recommended build order:
**S1 · S2 · S3 · S4 · S6 · S5 · S7**.

## Deferrals (homed — NOT built in this issue)
- Effect HANDLERS + fire-time consent → #46 / MOD-* · `generatePlan()` placement algorithm → M1.2 design-pass ·
  Global Calendar render → M2 · `/pomodoro` widget + Focus Mode UI → `fe-sessions` / design-pass · `[E]`
  field encryption activation → M3/DB-5 (M1.0 `encryptedFields:[]` pass-through seam holds).

## Traceability
Every slice → its Verification-Gate row (above) → its rules (→ `business-rules.md` SS-*/`pomodoro/business-rules.md`
PD-*) → promoted to `current-*` at close (§XXIX). Seam consumed by `fe-sessions` + Journals → `seam-contract.md`.
