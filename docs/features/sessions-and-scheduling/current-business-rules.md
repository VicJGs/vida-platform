<!-- current-business-rules — features/sessions-and-scheduling · the ENFORCED rules (durable, §XXIX).
     business-rules.md (SS-1…SS-12) is the INTENDED authority; THIS records which invariants are actually
     ENFORCED in shipped code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Business Rules — Sessions & Scheduling (enforced slice)

AR-5 enforces the STRUCTURAL half of the Integration Contract. Runtime invariants (effect no-double-count,
lifecycle legality, consent) are DEFERRED with their engines (AR-7 / later).

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

## NOT YET enforced (deferred — do not claim)
- SS-6 runtime no-double-count (`effect_event_id` + `applied_effects`) → AR-7. AR-5 enforces only the static
  envelope subset.
- SS-1/SS-8 lifecycle transition legality (the `transition()` engine) → later; only the enum + declarations ship.
- SS-7/SS-9/SS-10/SS-12 (aggregator, availability, signal-emit, read-time analytics) → scheduler pass (G5).
- Runtime `sub_type`/`entity_type` validation on session/attachment WRITES → with those write paths.

## Failure behaviour (fail loud) — enforced
Registry validation failures are typed hard rejections with no partial write (BR-3/BR-4/BR-1). DB CHECK/UNIQUE
violations surface, never swallowed.
