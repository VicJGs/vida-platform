<!-- current-business-rules — features/sessions-and-scheduling · the ENFORCED rules (durable, §XXIX).
     business-rules.md (SS-1…SS-12) is the INTENDED authority; THIS records which invariants are actually
     ENFORCED in shipped code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Business Rules — Sessions & Scheduling (enforced slice)

AR-5 enforces the STRUCTURAL half of the Integration Contract. XS-effect-rail **#32** added the runtime lifecycle
engine + fire step (lifecycle legality + effect firing + no-double-count). Sensitive-consent stays handler-side
(deferred with per-module handlers, #46).

## ENFORCED now (AR-5)
- **BR-1 (SS-1) — one spine, unique sub_type.** `session_type_registry.sub_type` UNIQUE; `SessionRegistry.register`
  rejects a collision against BOTH the shipped map and persisted user rows with a typed `DuplicateSubType`
  BEFORE insert (never a raw SQLite UNIQUE error). `[FACT: registry.ts]`
- **BR-2 (SS-2) — `sub_type` ⟂ `purpose`.** Separate columns + separate enums; the legacy conflated
  `SCHEDULED_SESSION_TYPE` is NOT reused. `[FACT: sessions.ts, session.ts]`
- **BR-3 (SS-3) — 4 dimensions required.** `register` rejects a `SessionTypeDef` missing attachment_defaults /
  effects / lifecycle / permissions → `InvalidSessionTypeDef`. `[FACT: registry.ts]`
- **BR-4 (SS-6, static half) — capability containment.** `effects[] ⊆ permissions.allowed_effects ⊆ shipped
  envelope`; a violation → `CapabilityEnvelopeExceeded`. (sensitive_optins CONSENT is fire-time → deferred.)
  `[FACT: registry.ts]`
- **BR-5a — FIXED enums = hard SQL CHECK.** `scheduling_mode`, `status`, `level` carry SQL CHECKs; parity test
  asserts CHECK-set ≡ tuple. `[FACT: 002_sessions.ts, enum-parity.test.ts]`
- **BR-5b — EFFECT_TYPE = Zod-validated (no SQL CHECK).** Stored as JSON; covered by the enum validator test.
- **BR-6 — OPEN vocab.** `sub_type`/`purpose`/`entity_type` are free-TEXT (no CHECK) so SS-5 user-extensibility
  holds. (Their runtime registry-validation binds with the write path — deferred.)
- **BR-7 — spine is syncable.** `sessions` + registry + attachments carry `...baseColumns` (`_sync_*`);
  `key_learnings` `[E]`. User type-defs sync via the Repository; shipped defs are in-memory (SS-4, not synced).

## ENFORCED now (XS-effect-rail #32 · XCU-09/10 — `foundation/sessions/{attachments,lifecycle}.ts`)
- **BR-8 (SS-1/SS-8) — lifecycle legality.** `transition(sessionId, event)` fires only a `(status,event)` declared
  in the type's `lifecycle.transitions`; an illegal move → `InvalidTransition`, **no write**. Not target-state
  idempotent (a re-acked move throws). `[FACT: lifecycle.ts]`
- **BR-9 (SS-6 runtime) — no-double-count.** On completion each declared effect fires per resolved target via
  `applyEffect`, keyed `derive(target.entityId ‖ started_at-UTC-date ‖ effectType)` → the `applied_effects` ledger
  dedupes replays + cross-device re-origination (SS-6). Fallback subject = the session when unattached.
  `[FACT: lifecycle.ts fireCompletionEffects; effects/service.ts]`
- **BR-10 — fire-first, commit-status-last.** Effects fire before the status write (the commit point); a mid-fire
  crash self-heals on replay. `[FACT: lifecycle.ts; ADR-004 §3.2.5-B.4]`
- **BR-11 (XCU-10) — attachment resolution.** `resolveTargets` returns a session's attachments (both levels), the
  scope effects fire into. `[FACT: attachments.ts]`
- **BR-12 — structural canTouch only; consent handler-side.** The engine fires structurally-scoped effects (effect
  ∈ allowed_effects at registration; target ∈ attachments by construction); sensitive-consent is enforced by the
  consuming handler via the `assertEffectPermitted` seam (`foundation/effects/gate.ts`), NOT the engine
  (ADR-004 §3.2.5-A3 / BR-17 / IR-5 — no engine-side `moduleClass` inference). `[FACT: lifecycle.ts, effects/gate.ts]`

## NOT YET enforced (deferred — do not claim)
- Per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + fire-time sensitive-consent
  enforcement + consent-threading → #46 / MOD-*. The gate utility (`assertEffectPermitted`) ships; its callers do not.
- Non-completion firing + heterogeneous-attachment (habit+task) per-effect target disambiguation → with handlers.
- SS-7/SS-9/SS-10/SS-12 (aggregator, availability, signal-emit, read-time analytics) → scheduler pass (G5).
- Session/attachment WRITE paths (`attach()`, session CRUD) + their runtime `sub_type`/`entity_type` validation →
  with those write paths. `key_learnings` encryption (M1.0 `encryptedFields:[]` pass-through seam).

## Failure behaviour (fail loud) — enforced
Registry validation failures are typed hard rejections with no partial write (BR-3/BR-4/BR-1). DB CHECK/UNIQUE
violations surface, never swallowed.
