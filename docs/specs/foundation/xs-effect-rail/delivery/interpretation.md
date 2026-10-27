# Interpretation — XS-effect-rail (#32, LIF-170)

> Entity Delivery Flow §3 — the interpretation layer for the effect-firing runtime that rides the
> `foundation/effects` rail and the `foundation/sessions` contracts.
> Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]` (No-Guessing Principle).
> Mode: **Ratify + detail** (§8) with a **recovery flavor** — AR-5 shipped the session _contracts_, AR-7
> shipped the _rail structure_, #31 shipped the _envelope enforcer_; this issue builds the _runtime_ that
> makes them fire. Source of the split: `[FACT: docs/specs/foundation/backend-intent/decomposition.md:43]`
> (`XS-effect-rail | XS | 4 | — | — | xcut-sessions:XCU-09 XCU-10 XCU-22 xcut-spaces:XCU-SP-30`).

## Scope in one line

Build the **exactly-once effect-FIRING runtime**: the session lifecycle-transition **engine** (XCU-09) that,
on a legal transition, resolves attachments (XCU-10) and fires the type's declared effects through the AR-7
rail, each guarded at fire-time by a handler **validation gate** (XCU-22) that consults #31's envelope enforcer.
It does **NOT** build per-module handlers (review→SM-2 / class→attendance / workout→volume) — those are
`XS-measurement-engine #46` + the MOD-\* issues `[FACT: decomposition.md:46]`. The registry stays an empty seam.

## The 4 legs (P3-homed, all typed `service`)

- **XCU-09** — **Session lifecycle state machine**: `scheduled|planned → in_progress → completed|skipped|
missed|rescheduled`; enforce per-type legal transitions declared in the type def; run per-type hooks on
  transition. `[FACT: xcut-sessions.md:20]`. Engine flagged "deferred (AR-7/later)" — that later is **now**
  (this issue): `[FACT: packages/core/src/foundation/sessions/types.ts:6]`, `[FACT: sessions/registry.ts:8]`,
  `[FACT: docs/core/effects/current-business-rules.md:33]`. → **BUILD 🕳** (engine; declarations exist).
- **XCU-10** — **Session attachment resolution**: polymorphic links (`session_attachments`, type + instance
  level); fired effects are scoped to these attachments. `[FACT: xcut-sessions.md:21]`. Table already built,
  standalone polymorphic (no delegation to `entity_links`): `[FACT: packages/core/src/db/schema/foundation/
sessions.ts:69-79]`. → **BUILD 🕳** (resolver; table exists). **UNKNOWN-3 resolved** at schema level (§ below).
- **XCU-22** — **Handler validation gate**: each handler validates caller scope/binding + permission envelope
  (§3.2.4 consent) + payload before any write; failure ⇒ hard rejection, no partial write; Finance/Health
  effects require explicit opt-in consent at fire-time. `[FACT: xcut-sessions.md:33]`. Consent was "deferred
  with the effect rail (AR-7)": `[FACT: sessions/registry.ts:92-93]`. → **BUILD 🕳** (fire-time gate over #31).
- **XCU-SP-30** — **Effect-firing rail (R1/R2)** forward-pointer; "homed in the effect-rail register (see
  xcut-sessions), recorded here as the Spaces-tier forward pointer." `[FACT: xcut-spaces.md:50]`. → **SUBSUMED**
  by XCU-09/22 (no distinct surface).

## DEPENDENCIES (every upstream, all already built)

- **`applyEffect`** — the exactly-once guarded-write primitive the engine fires into.
  `createEffectRail(db, registry).applyEffect(event): Promise<{applied:boolean}>`
  `[FACT: packages/core/src/foundation/effects/service.ts:29]`. Idempotency key = `(effect_event_id,
effect_type, target_ref)` `[FACT: effects/service.ts:44-56]`; projection = rail no-op `[FACT: service.ts:36]`.
- **`EffectEvent`** — the fire payload: `{ subjectNaturalKey, transition, effectType, targetRef, payload? }`
  `[FACT: effects/types.ts:37-43]`. `targetRef` is the producer-supplied dedup dimension known at derive time.
- **`EffectRegistry`** — one-handler-per-type seam; ships empty; `resolve` returns `undefined` when unregistered
  `[FACT: effects/registry.ts:19-30]`. `applyEffect` throws `NoEffectHandler` before any write if absent
  `[FACT: effects/service.ts:38-40]`.
- **`SessionTypeDef`** — the 4-dimension contract the engine reads: `lifecycle.{transitions,hooks}` (dim3),
  `effects[]` (dim2), `attachment_defaults` (dim1), `permissions` (dim4). `[FACT: sessions/types.ts:34-49]`.
  `SessionTransition = {from, to, event}` `[FACT: sessions/types.ts:18-22]`.
- **`SessionRegistry.get(subType)`** — resolves a session's type def (shipped ∪ persisted user).
  `[FACT: sessions/registry.ts:119-125]`. `SHIPPED_SESSION_TYPES` has `focus` with real transitions
  `[FACT: sessions/registry.ts:26-42]`.
- **`sessions` table** — the row whose `status` the engine transitions: `status` (SESSION_STATUS, CHECK),
  `sub_type` (OPEN), `started_at`/`ended_at`. `[FACT: sessions.ts:25-46]`. `SESSION_STATUS` = the 7 states
  `[FACT: packages/types/src/session.ts:58-67]`.
- **`session_attachments` table** — `{session_id, entity_type (registry-validated), entity_id, level:
type|instance}` `[FACT: sessions.ts:69-79]`.
- **#31 `CapabilityEnforcer`** — the fire-time gate's decision core: `checkAction(defId, action)` /
  `assertPermitted(defId, action)` `[FACT: packages/core/src/foundation/capability/enforcer.ts:105-107,170-185]`.
  `CapabilityAction` includes `{type:'effect', effect}` + `{type:'sensitive', moduleClass}`
  `[FACT: capability/types.ts:104-110]`; `DenyReason` includes `sensitive_consent_missing` +
  `compositional_exfiltration` `[FACT: capability/types.ts:112-118]`. **Dep-edge gap:** decomposition:43 lists
  build-deps `—`; #31 is merged so the enforcer is available — `[INTERPRETATION]` the edge is a decomposition
  omission, not a real blocker.
- **`Repository` (`createInTx` / tx-scoped writes)** — a handler that persists must co-write through the active
  tx. `[FACT: packages/core/src/db/repository.ts]` (the `createInTx` path #31 used for co-transactional writes).

## NEEDS (what #32 must add that does not exist)

- **A lifecycle-transition engine** — `transition(sessionId, event)`: load the session + its type def, find the
  declared `SessionTransition` matching `(status, event)`, reject illegal moves (typed error, no write), apply
  the new `status` (+ `started_at`/`ended_at` side-effects), then fire. `[INTERPRETATION from xcut-sessions.md:20
  - sessions/types.ts:18-22]`.
- **An attachment resolver** — `resolveTargets(sessionId, effectType)`: read `session_attachments` for the
  session, produce the per-effect `targetRef` set (type-level defaults ∪ instance-level). `[INTERPRETATION from
xcut-sessions.md:21 + sessions.ts:69-79]`.
- **A fire step** — for each declared effect × resolved target: build the `EffectEvent`, run the validation gate,
  then `applyEffect`. All firing for one transition co-transactional (one legal transition = one atomic fan-out).
  `[INTERPRETATION from effects/service.ts:44 + xcut-sessions.md:33 "no partial write"]`.
- **The handler validation gate (XCU-22)** — a fire-time predicate that, given the session's owner capability +
  the effect + the target's module class, calls `enforcer.assertPermitted(defId, action)` with the `effect`
  action and (for sensitive targets) the `sensitive` action. `[INTERPRETATION from xcut-sessions.md:33 +
capability/types.ts:104-110]`.

## ORGANIZATION (where code lands — two substrates)

- `foundation/sessions/` — the lifecycle engine (XCU-09) + attachment resolver (XCU-10). New: `lifecycle.ts`
  (or `engine.ts`) + `attachments.ts`. `[FACT: xcut-sessions.md:20-21 home column = "foundation/sessions"]`.
- `foundation/effects/` — the handler validation gate (XCU-22) as a fire-time guard composed into the rail's
  dispatch path (or a wrapper the engine applies before `applyEffect`). `[FACT: xcut-sessions.md:33 home =
"foundation/effects + per-module handlers"]`.
- **Two-substrate span** — despite the task name "xs-effect-rail", 3 of 4 legs are `foundation/sessions`.
  Correct per decomposition:43; the write surface is broader than the name. `[INTERPRETATION]`.

## IMPLICIT RULES (surfaced from the corpus — candidates for slice invariants)

- **IR-1 — The fan-out is replay-safe, NOT all-or-none.** A legal transition fires its declared effects as a
  sequence of _independently_ idempotent applies — each effect owns its own `applyEffect` tx + ledger row; a
  mid-fan-out failure leaves earlier effects applied and is recovered by **replay** (re-firing dedupes via the
  ledger), not by rolling back the transition. "No partial write" is scoped to a **single handler**, not the
  whole transition. `[FACT: ADR-004 §3.2.5-A(3):94 + §3.2.5-B.4:113 "ledger defends replay" + effects/
service.ts:44 (per-effect tx)]`. (Corrected from an earlier all-or-none over-reach — see § UNKNOWN below.)
- **IR-2 — Illegal transition is a hard, write-free rejection.** `(status, event)` not in the type's declared
  `transitions` ⇒ typed error before any DB mutation (mirrors AR-5's fail-loud, never-silent-partial).
  `[INTERPRETATION from sessions/types.ts:51 + xcut-sessions.md:20]`.
- **IR-3 — Fire-time is the ONLY consent checkpoint.** The static half (declared ⊆ envelope ⊆ shipped) is
  already enforced at registration `[FACT: sessions/registry.ts:89-100]`; the DYNAMIC half (grant present,
  envelope current, sensitive consent) is #32's gate via the enforcer. No double-checking the static half.
  `[FACT: sessions/current-business-rules.md:18 + capability/enforcer.ts:170-181]`.
- **IR-4 — Deterministic identity is unchanged.** The engine passes `(subjectNaturalKey, transition, effectType)`
  to `deriveEffectEventId`; a replay of the same transition on the same/other device converges (BR-2). The
  `derive()` hash stays build-phase-deferred; #32 uses the canonical string as-is. `[FACT: effects/event-id.ts:20-26]`.
- **IR-5 — Sensitivity is caller-supplied, not inferred.** The gate must be told the target's `moduleClass`
  (Finance/Health); it is never derived from the binding. `[FACT: capability/types.ts:101-103 (INV-9)]`.
- **IR-6 — Projection effects skip the gate + the handler.** `surface_journal`/`surface_calendar` are rail
  no-ops; the engine must not require a handler or a grant for them. `[FACT: effects/service.ts:36 + effects/
current-business-rules.md:21]`.

## UNKNOWN-3 — attachment-vs-entity_links overlap (RESOLVED)

decomposition:85 flagged whether `session_attachments` (XCU-10) is a distinct table or delegates to the
`entity_links` substrate, "resolution owner = P1 notes-and-pages / entity-links sweep + §4c dedup at P3."
**Resolved at the schema layer:** DB-4 built `session_attachments` as its own standalone polymorphic table
(`entity_type`/`entity_id`/`level`, no FK, registry-validated) `[FACT: sessions.ts:69-79]`. XCU-10's phrase
"entity-links _style_" `[FACT: xcut-sessions.md:21]` denotes the polymorphic _pattern_, not delegation. → The
resolver is sessions-owned, reads `session_attachments` directly. No open blocker.

## Firing model (RESOLVED against ADR-004 §3.2.5 — was a false UNKNOWN)

Earlier draft flagged the fan-out "atomicity mechanism" as UNKNOWN. It is **not** open — ADR-004 §3.2.5 owns it:

- **No outer transaction wraps the fan-out.** Each `applyEffect` owns its own `db.transaction`
  `[FACT: effects/service.ts:44]`; handlers must never nest one `[FACT: effects/types.ts:48-53]`. Wrapping N
  effects in one tx would fight the per-effect idempotency the taxonomy is built on `[FACT: ADR-004:82-85]`.
- **Recovery is replay, not rollback** `[FACT: ADR-004 §3.2.5-B.4:113]`. The engine's fire step
  (`fire(session, transition)`) is re-entrant: a replay re-derives each `effect_event_id` and the ledger dedupes
  already-applied effects `[FACT: effects/service.ts:44-56]`.

## Open items for the Interpretation Gate (Step 3)

- `[INTERPRETATION → slice-map detail, not a blocker]` **Status-write vs fire ordering.** ADR-004 §3.2.3 runs
  hooks "on transition"; natural order = write the new `status` first, then fire (a re-entrant fire step makes a
  post-status-write crash replay-recoverable). The exact ordering + where the status write lives (sessions
  service vs engine) is a Step-5 slice-map decision, grounded in §3.2.3 — not an open design fork.
- `[FACT — carried to XCU-22 slice]` The gate needs the target's `moduleClass` supplied by the caller
  (IR-5); the engine must thread it from the attachment/effect metadata, since it is never inferred
  `[FACT: capability/types.ts:101-103]`.
