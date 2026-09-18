# PLAN — S2 Fire-time validation gate (XS-effect-rail #32 · XCU-22)

> §XXVI gate-1 SPEC for slice S2. Home: `packages/core/src/foundation/effects/` (producer-agnostic gate).
> Plane: backend. No-Guessing: every claim `[FACT: path:line]` / `[INTERPRETATION]`.

## §0 — DEVIATION from the approved slice-map (§XXVIII, surfaced)
The slice-map said S2 would "call `enforcer.assertPermitted(ownerDefId, …)`" — i.e. wire **#31's
`capability_grants` enforcer**. That is **wrong for the session fire path** and is corrected here, grounded in
authority:
- ADR-004 §3.2.5-**C**: the write-API contract binds **all** producers *identically*, but **enforcement differs
  by trust tier**. `[FACT: ADR-004 §3.2.5-C:116-121]`. The #31 enforcer is the **ADR-010 user-capability** tier
  (reads `capability_grants` by a capability `defId`). A **session** has no `capability_grants` row — its envelope
  is `SessionTypeDef.permissions` `[FACT: sessions/types.ts:24-30]`, and the fire-time piece deferred at
  `[FACT: sessions/registry.ts:92-93]` is exactly the `sensitive_optins` consent check.
- Consequence for ⛔ C4 (reconciliation): `economy.dispatchConsequence` fires **shipped** effects
  (grant/lock_currency) `[FACT: economy/handlers.ts:61-62]`; shipped producers are enforced *structurally* (CI
  guard), **not** by a runtime gate `[FACT: ADR-004 §3.2.5-C:117-121]`. → **C4 is NOT a current gap**; it becomes
  one only when MOD-gamification wires *user-authored* rules (deferred). S2 therefore does **not** retrofit
  `dispatchConsequence`. Reconciliation + slice-map updated to match.

## §1 — Context
When the S3 lifecycle engine fires a **user-created** session type's declared effects, effects that target a
**sensitive module** (Finance/Health) require explicit opt-in consent **at fire time** — the one dynamic check
the static registration pass deliberately skips `[FACT: sessions/registry.ts:92-93; sessions/current-business-rules.md:18]`.
S2 builds that gate as a **producer-agnostic** predicate (honoring §3.2.5-C's uniform contract): it takes the
producer's *consented-sensitive set* + the effect + the target's module class, and rejects an unconsented
sensitive fire before any write.

### XCU-22 coverage map (the leg names a triple — where each part lives)
XCU-22 = "validates caller **scope/binding** + permission **envelope (consent)** + **payload**". S2 builds the
consent leg; the other two are covered elsewhere and are NOT orphaned:
- **scope/binding → structural.** S1 resolves targets *from* `session_attachments`; S3 fires one event per
  resolved target — so a fire is in-scope by construction, never an out-of-scope target to reject.
  `[FACT: attachments.ts resolveTargets; slice-map S3]`.
- **payload → per-handler** (the existing single-write-path pattern): a handler validates its own payload before
  writing, e.g. `economy/handlers.ts:43-44` (`safeParse` → `MalformedConsequencePayload`). #32 adds no handlers
  (Ratify), so payload validation is the handler contract, not the generic gate. `[FACT: economy/handlers.ts:43-44;
  ADR-004 §3.2.5-A(3):94]`.
- **consent → THIS slice** (BR-S2-1..7).

## §2 — Business rules
- **BR-S2-1 — Sensitive-consent gate.** For a fired effect whose target `moduleClass` is sensitive
  (∈ `SENSITIVE_MODULE_CLASSES`), the fire is permitted **iff** `moduleClass ∈ consentedSensitiveModules`; else a
  typed rejection with **no write** (before `applyEffect`). `[FACT: ADR-004 §3.2.4:72; capability/types.ts:97]`.
- **BR-S2-2 — Non-sensitive → pass.** A non-sensitive `moduleClass` (or none supplied) needs no consent gate.
  `[FACT: enforcer.ts:72-73 precedent]`.
- **BR-S2-3 — Sensitivity is caller-supplied, never inferred** (IR-5). The gate is told the `moduleClass`; it
  never derives it from the effect or binding. `[FACT: capability/types.ts:101-103 (INV-9 / BR-17)]`.
- **BR-S2-4 — Projection effects skip the gate** (IR-6). A `projection`-class effect writes nothing and needs no
  consent. `[FACT: effects/types.ts:20-33 EFFECT_CLASS_OF; effects/service.ts:36]`.
- **BR-S2-5 — Static subset is NOT re-checked** (IR-3). `effects[] ⊆ allowed_effects` is enforced at registration
  `[FACT: sessions/registry.ts:89-100]`; the gate adds only the dynamic consent layer.
- **BR-S2-6 — Trusted producers bypass.** A shipped (non-user) session type fires without the gate — trust is
  structural (§3.2.5-C). The engine (S3) decides bypass by `is_user_type`; S2 is only invoked for user types.
  `[FACT: ADR-004 §3.2.5-C:117-121; sessions/registry.ts:26-42 shipped roster]`.
  > **⚠ S3 PREREQUISITE (tracked, not an S2 blocker).** `SessionTypeDef` carries no `is_user_type` and
  > `registry.get()` flattens shipped ∪ user (`rowToDef` drops it — `[FACT: sessions/registry.ts:119-125]`). S2 is
  > a pure predicate the caller invokes-or-not, so this is unblocked here — but **S3 must establish the
  > shipped-vs-user signal** (e.g. a `registry.isUserType(subType)` accessor, or surface `is_user_type` on the
  > returned def) for the bypass rule to be buildable. Recorded in the S3 spec's deps.
- **BR-S2-7 — Single source of sensitivity.** Reuse `SENSITIVE_MODULE_CLASSES` from `foundation/capability` — do
  NOT re-declare `['finance','health']`. Requires exporting it from the capability barrel (additive).
  `[FACT: capability/types.ts:97; index.ts (not yet exported)]`.

## §3 — Contract
```ts
// foundation/capability/index.ts — additive export (single source of the sensitivity taxonomy)
export { SENSITIVE_MODULE_CLASSES, type SensitiveModuleClass } from './types'

// foundation/effects/gate.ts — producer-agnostic fire-time gate
import type { EffectType } from '@vida/types'
export class EffectConsentMissing extends Error { /* effectType, moduleClass */ }

export interface FireGateContext {
  /** the producer's consented sensitive-module set (session: permissions.sensitive_optins;
   *  future ADR-010 capability: grant.consented_sensitive_modules) */
  consentedSensitiveModules: string[]
}
/** Throws EffectConsentMissing iff the effect targets a sensitive module not in the consented set.
 *  Projection effects and non-sensitive targets pass. Pure (no db). */
export function assertEffectPermitted(
  ctx: FireGateContext,
  effectType: EffectType,
  moduleClass: string | undefined,
): void
```
- **Pure, synchronous, no db** — the gate is a decision over data the caller already holds (the type def is loaded
  once by the engine). Contrast S1 (a read). `[INTERPRETATION: keeps IR-1 fan-out cheap]`.
- Reuses `EFFECT_CLASS_OF` to detect projection (BR-S2-4) and `SENSITIVE_MODULE_CLASSES` for sensitivity.

## §4 — Acceptance (unit — pure fn, no live store needed; a live-store integration lands in S3)
- A1: sensitive target (`'finance'`) NOT in consented set → throws `EffectConsentMissing`.
- A2: sensitive target IN consented set → passes.
- A3: non-sensitive target (`'gamification'`) → passes regardless of consent.
- A4: `moduleClass` undefined → passes.
- A5: projection effect (`surface_journal`) with a sensitive class → passes (BR-S2-4 short-circuits).
- A6: `SENSITIVE_MODULE_CLASSES` importable from `@vida/core` capability barrel; `tsc` 0 · suite green · lint clean.

## §5 — Implementation prompt (gate-2 fills the IMPLEMENTATION-PLAN)
1. Add the barrel export of `SENSITIVE_MODULE_CLASSES` + `SensitiveModuleClass` to `foundation/capability/index.ts`.
2. Add `foundation/effects/gate.ts` — `EffectConsentMissing`, `FireGateContext`, `assertEffectPermitted`
   (projection short-circuit → sensitive check → consent membership).
3. Export from `foundation/effects/index.ts`.
4. Test `__tests__/gate.test.ts` — A1–A5 (pure); A6 checks the re-export.
5. `tsc`, lint, run suite.

## Boundary
S2 does NOT: read the db, load the session type (the engine passes the consented set), fire effects, retrofit
`economy.dispatchConsequence` (§0), or touch `capability_grants` / #31's enforcer (that is the #116 capability
producer, not #32). Attachment SCOPE is structural (S1 resolves, S3 fires per target) — not a gate rejection.
