# Slice map — XS-effect-rail (#32, LIF-170)

> Entity Delivery Flow §5 — the corrected plan. Every 🕳/⛔ from `reconciliation.md` → a scoped slice with its
> gate + plane tag. **Ratify mode** — retrofit onto the doc-fixed 4 legs (decomposition:43); this is the BUILD
> decomposition, not a re-plan of the legs. All slices `backend`. Each closes with a **per-slice blocking
> Verification Gate** (live-store smoke on `better-sqlite3` + migrations + Repository — the #31 precedent), and
> each is itself §XXVI double-gated before its code (spec → /critique → Approval 1 → /preflight → /critique →
> Approval 2 → implement). Planning skill: `victor:planning`.

## Slice inventory (build order)
| Slice | Covers (legs / recon rows) | Home | Depends on |
|-------|----------------------------|------|-----------|
| **S1 — Attachment resolver** | XCU-10 / S7 | `foundation/sessions/attachments.ts` | S5 table (built) |
| **S2 — Fire-time validation gate** | XCU-22 / E7 **+ C4** | `foundation/effects/` (gate) | #31 enforcer (built) |
| **S3 — Lifecycle engine + fire step** | XCU-09 / S6 + S8 (+ XCU-SP-30 subsumed) | `foundation/sessions/lifecycle.ts` | S1, S2 |

Order rationale: S1 and S2 are independent leaves (a target resolver; a gate predicate); S3 is the composition
that transitions state and fans out the gated fire. `dispatchConsequence` (economy) is the shape S3's fire loop
mirrors (reconciliation C3).

---

## S1 — Attachment resolver (XCU-10)
- **Build:** `foundation/sessions/attachments.ts` — `resolveTargets(db, sessionId, effectType): Promise<string[]>`.
  Reads `session_attachments` for the session (both `level: 'type' | 'instance'`), returns the `targetRef` set the
  fire step scopes each effect to. `[FACT: schema/foundation/sessions.ts:69-79]`.
- **Rules:** returns `entity_id`s (+ level metadata as needed); no write; `entity_type` already registry-validated
  at write-time (IR — not re-validated on read). A session with no attachments → the effect's own subject is the
  target (empty resolve is legal, not an error).
- **Verification Gate:** live-store — seed a session + type/instance attachments; assert `resolveTargets` returns
  the expected set; assert empty-attachment path.

## S2 — Fire-time validation gate (XCU-22)
> **CORRECTED (§XXVIII, 2026-09-17)** — the original "wire #31's `capability_grants` enforcer" is wrong for the
> session producer (no session `defId`); enforcement differs by trust tier (ADR-004 §3.2.5-C). See
> `sessions/PLAN-2026-09-17-s2-validation-gate.md` §0. C4 de-flagged: economy fires SHIPPED effects, enforced
> structurally not at runtime — not a current gap.
- **Build:** a **producer-agnostic**, pure predicate in `foundation/effects/gate.ts` —
  `assertEffectPermitted(ctx: {consentedSensitiveModules}, effectType, moduleClass?)`. Sensitive target
  (∈ `SENSITIVE_MODULE_CLASSES`, reused from `foundation/capability`) not in the consented set → throws
  `EffectConsentMissing`, **no write**. Projection short-circuits (IR-6); non-sensitive/undefined passes.
  `[FACT: ADR-004 §3.2.4:72, §3.2.5-C:116-121; capability/types.ts:97]`.
- **Caller supplies the tier-appropriate consented set:** session → `SessionTypeDef.permissions.sensitive_optins`;
  future ADR-010 capability → `grant.consented_sensitive_modules` (#116, not #32).
- **No retrofit of `economy.dispatchConsequence`** — shipped producer, structurally enforced (§3.2.5-C).
- **Rules:** IR-3 (only dynamic checkpoint — static subset already enforced at registration), IR-5 (`moduleClass`
  caller-supplied), IR-6 (projection skip). Trusted (shipped) session types bypass — S3 invokes S2 only for user
  types (needs the is_user_type signal — S3 prerequisite).
- **Verification Gate (unit, pure fn):** sensitive+unconsented → throws; sensitive+consented → passes;
  non-sensitive → passes; undefined class → passes; projection+sensitive → passes; `SENSITIVE_MODULE_CLASSES`
  re-export importable. (Live-store integration of the gate lands in S3.)

## S3 — Lifecycle engine + fire step (XCU-09; composes S1+S2)
- **Build:** `foundation/sessions/lifecycle.ts` — `transition(db, deviceId, sessionId, event, deps): Promise<...>`:
  1. load the `sessions` row + its `SessionTypeDef` via `SessionRegistry.get(sub_type)` `[FACT: sessions/registry.ts:119]`;
  2. find the declared `SessionTransition` matching `(status, event)`; none → typed `IllegalTransition` (**IR-2**, no write);
  3. resolve targets per declared effect (S1);
  4. fire each declared effect × target — gate (S2) then `rail.applyEffect` — as a **per-effect, no-outer-tx**
     loop (mirrors `dispatchConsequence`, **IR-1** replay-safe); projection effects are rail no-ops (IR-6);
  5. write the new `status` (+ `started_at`/`ended_at`) via the Repository (own tx + co-transactional sync enqueue).
- **DECISION (flag for S3 §XXVI gate-1) — status-write ordering.** Proposal: **fire first, commit status last**
  (status-write is the commit point). Rationale: effects are idempotent `[FACT: ADR-004:82-85]`, so a crash before
  the status-write self-heals on replay (re-run transition from the unchanged from-state; ledger dedupes the
  already-applied effects — `[FACT: ADR-004 §3.2.5-B.4:113]`). This avoids a "status changed but effects owed"
  pending-marker. **Open sub-question for the gate:** idempotency of a *re-acknowledged* transition (status already
  committed → a naive caller retry hits `IllegalTransition`) — decide whether `transition` is target-state
  idempotent or the caller owns retry semantics. Grounded in §3.2.3/§3.2.5; resolved at S3 gate-1, not here.
- **Rules:** IR-1, IR-2, IR-3, IR-4 (deterministic id via `deriveEffectEventId`), IR-6.
- **Verification Gate:** live-store — legal transition fires the declared effects (ledger rows present) + commits
  status; illegal `(status,event)` → `IllegalTransition`, status unchanged, 0 effects; **replay** the same
  transition → effects dedupe (`{applied:false}`), no double-count; a gate denial mid-fire → typed error, status
  not committed.

---

## Boundary (what #32 does NOT build — Ratify)
- **No per-module handlers** beyond the economy precedent — review→SM-2 / class→attendance / workout→volume are
  `XS-measurement-engine #46` + MOD-*. `[FACT: decomposition.md:46]`. The registry gains no new handlers here.
- **No scheduler / `planned_blocks`** wiring (XCU-11 is a different leg). `[FACT: sessions.ts:32]`.
- **No `derive()` hash** — stays build-phase-deferred; canonical string as-is (IR-4).

## Doc notes (no plan re-open)
- D2 — decomposition:43 omits the XS-capability build-edge; recorded, non-blocking (#31 merged).
- D3 — "empty registry seam" corrected: economy registers 2 handlers; #32 adds the producer + gate, not handlers.

## Currency (Step 8) — contexts this session will touch
`docs/core/effects/current-*` (gate + `dispatchConsequence` retrofit) and a new/updated
`docs/core/sessions/current-*` (lifecycle engine + attachment resolver) refresh at §XXIX, committed with the code.
