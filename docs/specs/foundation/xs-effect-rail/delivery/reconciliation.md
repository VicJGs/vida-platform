# Reconciliation — XS-effect-rail (#32, LIF-170)

> Entity Delivery Flow §4 — the built-vs-docs ledger. Sweep is **single-plane (backend), two-substrate**
> (`foundation/effects` + `foundation/sessions`, with `foundation/economy` as the firing precedent).
> Buckets: ✅ aligned · ❌ wrong · 📄 undocumented · 🕳 gap (build) · ⛔ ungated-owed.
> Exit condition: a **dry pass** (a full sweep surfacing zero new items) — reached (§ Dry-pass below).
> Every row cites disk. Composes `/audit-existing` + `victor:impact-scan`.

## A · `foundation/effects` substrate (the rail — mostly built by AR-7)
| # | Item | Built? | Bucket | Evidence |
|---|------|--------|--------|----------|
| E1 | `applyEffect` guarded-write + idempotency primitive | yes | ✅ aligned | `service.ts:29-73` ≡ current-spec.md:18,21-24 |
| E2 | `applied_effects` composite-PK local-only ledger + migration 004 | yes | ✅ aligned | `schema/foundation/effects.ts:69-79`; `migrations/004_effects.ts` |
| E3 | `EffectRegistry` one-handler-per-type seam | yes | ✅ aligned | `registry.ts:19-30` (BR-4) |
| E4 | `deriveEffectEventId` canonical string (BR-2) | yes | ✅ aligned | `event-id.ts:20-26` |
| E5 | `EFFECT_CLASS_OF` exhaustive taxonomy (BR-5) | yes | ✅ aligned | `types.ts:20-33` |
| E6 | Projection = rail no-op (BR-6) | yes | ✅ aligned | `service.ts:36` |
| E7 | **Handler validation gate (XCU-22)** — fire-time envelope/consent/payload before write | **no** | **🕳 gap** | corpus xcut-sessions.md:33; no caller of `enforcer.checkAction` on any fire path (grep: 0 hits outside `foundation/capability`) |

## B · `foundation/sessions` substrate (contracts built by AR-5; runtime absent)
| # | Item | Built? | Bucket | Evidence |
|---|------|--------|--------|----------|
| S1 | `SessionTypeDef` 4-dimension contract + typed errors | yes | ✅ aligned | `sessions/types.ts:34-49,51-78` |
| S2 | `SessionRegistry` static validation (BR-3/BR-4/BR-1) | yes | ✅ aligned | `sessions/registry.ts:84-131`; tests `registry.test.ts:104-170` |
| S3 | `SHIPPED_SESSION_TYPES` (`focus` w/ real transitions) | yes | ✅ aligned | `sessions/registry.ts:26-42` |
| S4 | `sessions` base table + `SESSION_STATUS` enum | yes | ✅ aligned | `schema/foundation/sessions.ts:25-46`; `types/session.ts:58-67` |
| S5 | `session_attachments` polymorphic table (standalone) | yes | ✅ aligned | `schema/foundation/sessions.ts:69-79` (UNKNOWN-3 resolved) |
| S6 | **Lifecycle-transition ENGINE (XCU-09)** — validate `(status,event)` legal per def, apply status, run hooks | **no** | **🕳 gap** | declarations only: `sessions/types.ts:6,16-22`; `registry.ts:8` ("does NOT run the lifecycle engine") |
| S7 | **Attachment RESOLVER (XCU-10)** — read `session_attachments`, scope effects to targets | **no** | **🕳 gap** | table exists (S5); no resolver code (grep: 0) |
| S8 | **Fire step (transition → rail)** — build `EffectEvent` per declared effect × target, gate, `applyEffect` | **no** | **🕳 gap** | no producer wires a session transition to the rail (grep: only economy calls `applyEffect`) |

## C · `foundation/economy` — the firing PRECEDENT (built by AR-7 Inc 4)
| # | Item | Built? | Bucket | Evidence |
|---|------|--------|--------|----------|
| C1 | Effect handlers co-write via `createInTx(tx,…)` (handler-tx contract) | yes | ✅ aligned | `economy/handlers.ts:42-58` — the pattern #32's fire path composes |
| C2 | `registerEconomyEffects` populates the seam (grant/lock_currency) | yes | ✅ aligned | `economy/handlers.ts:67-70` — registry is **not** empty (interpretation note corrected below) |
| C3 | `dispatchConsequence(rail, effects)` — per-effect fan-out, **no outer tx** | yes | ✅ aligned | `economy/handlers.ts:74-78` — **confirms corrected IR-1** (replay-safe, not all-or-none) |
| C4 | `dispatchConsequence` fires **without a runtime gate** | yes | ✅ aligned (**⛔ RETRACTED §XXVIII 2026-09-17**) | `economy/handlers.ts:74-78` fires SHIPPED effects (grant/lock_currency); shipped producers are enforced **structurally** (CI guard), NOT at runtime — `[FACT: ADR-004 §3.2.5-C:116-121]`. Not a current gap; becomes one only when MOD-gamification wires *user-authored* rules (deferred). S2 does NOT retrofit it |

## D · Cross-cutting / doc corrections
| # | Item | Bucket | Evidence / action |
|---|------|--------|-------------------|
| D1 | #31 `CapabilityEnforcer` (`checkAction`/`assertPermitted`) — the gate's decision core | ✅ aligned (dep) | `capability/enforcer.ts:105-107,170-185`; merged to `main` |
| D2 | decomposition:43 lists XS-effect-rail build-deps `—`, omitting XS-capability | 📄 undocumented | doc inaccuracy; non-blocking (#31 merged). Note in slice-map, do not re-open the plan |
| D3 | interpretation.md said "registry stays an empty seam" | 📄 (self) | **corrected**: economy already registers 2 handlers (C2). #32 adds **no** handlers; it adds the PRODUCER (S6/S8) + the GATE (E7) |
| D4 | IR-1 all-or-none over-reach | ✅ already corrected | interpretation.md § IR-1 + § Firing model (ADR-004 §3.2.5-B.4) |

## Reconciliation summary
- **✅ aligned:** E1–E6, S1–S5, C1–C3, D1 — the rail, the session contracts, the economy firing precedent are all built and correct. #32 builds **on** them, retrofits **none**.
- **🕳 gaps (build):** **E7** (validation gate), **S6** (lifecycle engine), **S7** (attachment resolver), **S8** (fire step). These are the four net-new pieces.
- **⛔ ungated-owed:** **C4** — `dispatchConsequence` fires ungated today. Closing E7 must also cover this existing fire path, not only the new session fire path (else a gap persists).
- **📄 doc:** D2 (dep-edge), D3 (registry-empty claim) — corrected here; no plan re-open.
- **❌ wrong:** none. No built code diverges from the corpus.

## Dry-pass verification
Second full sweep of both substrate dirs + economy + all `applyEffect`/`transition`/`resolve*` call-sites
(grep across `packages/core/src`) surfaced **zero new items** beyond A–D. Every `foundation/effects`,
`foundation/sessions` source file is bucketed; the only rail consumer (`economy`) is bucketed. → **DRY.**

## Feeds Step 5 (Re-scope Gate → slice-map)
Four build slices, each with its gate + plane tag (all `backend`):
1. **S6 · lifecycle engine** (foundation/sessions)
2. **S7 · attachment resolver** (foundation/sessions)
3. **E7 · validation gate** (foundation/effects) — must cover **C4** (economy's existing ungated fire) too
4. **S8 · fire step** (foundation/sessions) — composes S6+S7+E7; mirrors `dispatchConsequence` shape (C3)
Ordering + the status-write/fire sequencing (interpretation § Open items) resolved at slice-map.
