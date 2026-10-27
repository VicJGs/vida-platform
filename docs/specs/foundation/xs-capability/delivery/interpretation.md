# Interpretation — XS-capability (#31, LIF-169)

> Entity Delivery Flow §3 — the interpretation layer for the `foundation/capability` enforcement services.
> Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]` (No-Guessing Principle).
> Mode: **Ratify + detail** (§8) — P3 fixed the 4 legs — with a **recovery flavor** (AR-7 built the
> registry _structure_; this issue fills the _enforcement_ gap). Source of the split:
> `[FACT: docs/specs/foundation/backend-intent/decomposition.md:42]`.

## Scope in one line

Build the **platform-agnostic envelope-enforcement SERVICE tier** over the AR-7 `capability_grants` structure —
the _what_ of ADR-010 (`declare→grant→enforce`), consumed now by MOD-gamification/knowledge/health-training.
It does **not** run untrusted user code (the execution sandbox = `#116 CAP-authoring`).

## The 4 legs (P3-homed, all typed `service`)

- **XCU-SP-28** — open registry + declared render-targets. `[FACT: xcut-spaces.md:48]` — **already built by AR-7**
  (`CapabilityRegistry`, `[FACT: packages/core/src/foundation/capability/registry.ts:71]`); this issue _ratifies_ it
  and adds the read accessors the enforcement services need. → RECONCILE ✅ aligned.
- **XCU-SP-29** — `enabled_blocks` teeth-split: compute the **offered/allowed capability set per surface per Space**;
  `inline` = **union** (non-restrictive, a page may belong to many Spaces), `standalone` = **restrict** to the Space's
  palette. `[FACT: xcut-spaces.md:49]`. The UI add-menu is the frontend half (P6, deferred). → BUILD 🕳 (service half).
- **XCU-07** — **external grant-semantics enforcement** on the envelope: gate `external_in_ok` (per-source+layer) +
  `external_out_ok` (per-target) + data-scope; grants **revocable, fail-closed, re-consented on scope change**; no new
  column/table. `[FACT: xcut-ingestion-ai.md:21]`; `[FACT: ADR-010 §3.5:108-121]`. → BUILD 🕳.
- **XCU-SP-32** — the **declare→grant→enforce permission-envelope decision logic** (subset · attachment-scope ·
  sensitive-consent · no-double-count · fail-closed). `[FACT: xcut-spaces.md:52]`; `[FACT: ADR-010 §3.2-3.3:61-96]`.
  → BUILD 🕳. **NOT the execution sandbox** (§3.4, per-platform runtime) — that is `#116`.

## DEPENDENCIES (every upstream)

- **`capability_grants` table** (the 8-field ADR-010 envelope, structure-only today) — the row the enforcer reads.
  `[FACT: packages/core/src/db/schema/foundation/capability.ts:47]`.
- **`capability_definitions` + `CapabilityRegistry`** — resolves a def's _declared_ envelope + `is_user_type`.
  `[FACT: packages/core/src/foundation/capability/registry.ts:49-56]`.
- **`space_enabled_blocks`** (SP6 palette junction) — the offered-set resolver reads it for `standalone`.
  `[FACT: packages/core/src/db/schema/foundation/spaces.ts:101]`.
- **`Repository`** (`create`/`createInTx`/`findWhere`/`softDelete`) — grant persistence + co-transactional
  `sync_queue` enqueue. `[FACT: packages/core/src/db/repository.ts:186-195]`.
- **`EFFECT_TYPE` / `RENDER_TARGET`** vocab (`@vida/types`) — declared-effect / render-target checks.
  `[FACT: packages/core/src/foundation/capability/registry.ts:12]`.
- **ADR-014 external semantics** — per-source/per-target integration layer + data-scope + compositional-exfiltration
  gate. `[FACT: ADR-010:10 (Amended 2026-07-19)]`.

## NEEDS (preconditions to function)

- **Registry seeded + reachable** — `createCapabilityRegistry(db, deviceId)` before any enforcement call
  `[FACT: registry.ts:71]`; a shipped def resolves in-memory, a user def from the DB.
- **A grant row exists for a user def** before its actions are permitted — **no grant ⇒ fail closed** (deny), never
  default-allow `[FACT: ADR-010 §3.2:72-73]`.
- **`granted_envelope_hash` = a canonical hash of the def's DECLARATION** — the privilege parts of the ADR-008 6-part
  anatomy, `{bindings, effects}` `[FACT: ADR-008 §3.3:64-78]` + `[FACT: ADR-008:119-121]`. **Not** `render_targets`
  (CB2), `config_schema` (inputs), or `kind`/`id` (identity). External/media privilege is encoded in the declared
  `effects`/`bindings`, so it is already covered; the grant CONSENT booleans (`media_ok`/`external_*`/sensitive) are
  checked per-action at enforcement, **not hashed**. This keeps the grant-time hash and the drift-check hash SYMMETRIC
  (both over the def's declaration). **[IMPLICIT RULE IR-3 below.]**
- **A sensitive-class set** — `SENSITIVE_MODULE_CLASSES = {finance, health}`, transcribed from `[FACT: ADR-010
§3.3.4:90-91]` (medical = Health, HC-14). A code-level const (no schema change); the caller supplies the
  `moduleClass`, so no entity-type→module map is needed. Drives the sensitive-consent + compositional checks.
- **Shipped-vs-user discrimination** — only `is_user_type` defs are enforced; shipped/trusted bypass `[FACT: ADR-010
§3.1:56-58]`.
- **Vault key loaded** is NOT required by the enforcer itself (it reads plaintext envelope fields + a hash), but a
  grant _write_ goes through the Repository which computes a keyless content-hash — the MOD-notes bug class
  `[FACT: entity-delivery-flow.md:70-73]`. The live-store Verification Gate is the backstop.

## ORGANIZATION (owns / consumes / delegates)

- **OWNS:** the enforcement _decision_ services — `checkAction`/`assertPermitted` (envelope decision), grant lifecycle
  (`grant`/`revoke`/`isEnvelopeCurrent`), offered-set resolver — + the typed deny/error taxonomy + the canonical
  envelope-hash function.
- **CONSUMES:** the AR-7 registry + `capability_grants`/`space_enabled_blocks` schema + Repository.
- **DELEGATES:** effect _firing_ → `EffectRail` (`#32`, `[FACT: packages/core/src/foundation/effects/service.ts:25]`);
  no-double-count _idempotency_ → ADR-004 §3.2.5 write path `[FACT: ADR-010 §3.3:87-89]`; **per-source external-in
  LAYER classification** → **XS-ingestion `#44`** (XCU-02) `[FACT: xcut-ingestion-ai.md:14]`; **per-target egress
  mediation + consent + audit** → **XS-egress-guard `#43`** (XCU-06) `[FACT: xcut-ingestion-ai.md:19]` (this issue
  only _decides_ "does the grant BOOLEAN permit this reach?" + the compositional union, XCU-08 grant-enforcement
  half `[FACT: xcut-ingestion-ai.md:20-21]`); **untrusted-code execution sandbox + resource limits + authoring
  DSL/UI** → **`#116 CAP-authoring`** `[FACT: ADR-010 §3.4:98-104, §3.6:125]`; the UI add-menu/consent UX → P6
  frontend + design-pass `[FACT: ADR-010 §3:135-138]`.

## IMPLICIT RULES (surfaced hidden invariants)

- **IR-1 — Compositional exfiltration needs the UNION of consents.** A cap granted _both_ a sensitive binding _and_
  `external_out_ok` is a consented exfiltration channel; the enforcer must require **both** consents present, else fail
  closed — even though neither field alone says so. `[FACT: ADR-010 §3.5:117-121]`.
- **IR-2 — Sensitive reach never widens via a new attachment.** Attaching a user cap to an entity of a sensitive class
  not covered by the grant is an _envelope change_ → re-grant + fail closed, not a silent allow. `[FACT: ADR-010
§3.3:90-94]`.
- **IR-3 — The hash is the sole drift signal, over the DECLARATION `{bindings, effects}`.** Re-grant-on-change is
  detected _only_ by comparing `canonicalEnvelopeHash(def)` to the stored `granted_envelope_hash`; both hash the def's
  declaration (`{bindings, effects}`, ADR-008:119-121) so they are **symmetric** — a grant-time hash over grant
  booleans could never match a declaration re-hash and would permanently fail closed (the trap this fixes). The grant
  consent booleans are enforcement inputs, not drift inputs. Must be **canonical** (sorted) or a benign reorder
  mis-fires. The schema stores the field but names no algorithm — this issue fixes it. `[FACT: ADR-008:119-121]` +
  `[FACT: ADR-010 §3.2:68-79]` + `[FACT: capability.ts:58]`.
- **IR-4 — Fail-closed is the default return, not an exception path.** Every unknown/missing input (no grant, unknown
  effect, hash mismatch, missing consent) resolves to _deny_; "allow" is only ever an explicit positive match. This
  inverts the usual validate-then-throw shape. `[FACT: ADR-010 §3.2:72-73, §3.6:126-127]`.
- **IR-5 — Enforcement is the platform-agnostic _what_; the sandbox is the per-platform _how_.** This issue is the
  single cross-platform decision core; a device that cannot enforce must refuse to run (that refusal lives in `#116`).
  `[FACT: ADR-010 §3.6:123-127]`.
