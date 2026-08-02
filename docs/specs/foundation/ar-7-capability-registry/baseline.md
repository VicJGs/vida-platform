# AR-7 — Step-0 BASELINE (No-Guessing ground truth)

> The persisted input the PLAN gate (§XXVI) draws from. Every shape is `[FACT: file:line]`, `[INTERPRETATION]`,
> or `[UNKNOWN]`. Gathered 2026-08-02 from the live floor + ADR-004/008/010/011/012 + capability-framework §2/§3/§6.

## 1. Live floor (what exists today)

- `packages/core/src/foundation/{capability,measurement,economy,effects}/` — **CLAUDE.md stubs only, zero code.** [FACT: `find` sweep 2026-08-02]
- Schema floor stops at `foundation/{app-state,sessions,spaces,sync-queue}.ts`. **No** capability/measurement/economy/effects DDL. [FACT: db/schema/foundation/]
- Migrations registered: `001` sync_queue · `002` sessions · `003` spaces. **Next = `004`.** [FACT: db/CLAUDE.md · migrations/runner.ts]
- **Template pattern** (AR-5/AR-6): per-substrate `types.ts` + `registry.ts`/`service.ts` + `db/schema/foundation/<x>.ts` (Drizzle query-mirror) + hand-SQL `migrations/00N_<x>.ts` + `__tests__/`. Enums as `as const` C2 tuples in `@vida/types` + `z.enum` validators in `@vida/core`. [FACT: sessions.ts, spaces.ts, sessions/registry.ts]
- No hard cross-table FKs (base+extension are separate sync blobs, applied out of order) — `text` id + index, integrity at app/sync layer. [FACT: sessions.ts:15-18]
- Repository is table-agnostic (encrypt-on-write/decrypt-on-read); user rows persist via `createRepository(...)` → co-transactional sync_queue enqueue. [FACT: db/CLAUDE.md · sessions/registry.ts:81]
- **AR-5 explicitly deferred the effect rail to AR-7:** "ships structure + a thin registry ONLY; the effect-firing rail, the transition engine, and the scheduler are AR-7 / later." [FACT: sessions.ts:6-8 · sessions/registry.ts:8 · registry.ts:92-93 "sensitive_optins CONSENT ... deferred with the effect rail, AR-7"]

## 2. The four sub-substrates + their internal DAG

| Sub | ADR / framework | Owns (build-now, structure grain) | Rides |
|-----|-----------------|-----------------------------------|-------|
| **effects** | framework §2 (R1 R2) = ADR-004 §3.2.5 (spec-owner) | deterministic `effect_event_id`=`derive(subject_natural_key ‖ transition ‖ effect_type)`; `applied_effects` dedup ledger keyed `(effect_event_id, effect_type, target_ref)`; UNIQUE `effect_event_id` on output rows; write-API handler registry (effect-type → 1 handler); effect taxonomy classes (keyed/additive/projection/intra-realm) | — (base) |
| **capability** | ADR-008 CB1–CB6 + ADR-010 A2 A5 | open capability-definition registry (`id·kind·render-targets·bindings·effects·config`); `block_instances` (standalone placements, `_sync_*`+`deleted_at`); space `enabled_blocks` junction (menu vs placements); `capability_grants` row-structure + envelope-hash; CB6 terminal states | effects (CB4), spaces (AR-6, done) |
| **measurement** | ADR-011 M1–M7 | `measurement_kind`{quantitative·milestone·rate·qualitative} + `binding_mode`{manual·derived-pull·event-trigger}; NULL⇒derive override slot; fractal rollup `Σ(child×w)/Σw`, w NULL⇒equal; DAG guard on bindings | effects (event-trigger fires `emit_measurement_signal`/`contribute_purpose_metric` — keyed) |
| **economy** | ADR-012 E2–E4 | `currencies`{`backing_kind`{real-money·self-granted·measured-time}·unit·icon·pool cfg}; `consequence_ledger`{currency_id·amount±·kind{earn,lock,spend,distribute}·entity_type·entity_id·`effect_event_id` UNIQUE·at}; 4 Additive effects `grant_currency`·`lock_currency`·`move_money`·`surface_notification`; rule→consequence coordinator (condition = an ADR-011 binding) | effects (all 4 Additive) + measurement (conditions) |

**Internal build order (forced by "rides"):** `effects` → `{capability, measurement}` → `economy`. [INTERPRETATION from the ride-edges above]

## 3. Layering law (no parallel rails)

- ADR-004 §3.2.5 is the **single owner** of guarded-write + idempotency; ADR-008/010/011/012 inherit **by reference, never re-assert**. [FACT: ADR-004 §3.2.5 L74-76 · ADR-011 §3.8 L72 · ADR-012 §3.11 L90]
- Effects compose orthogonally: one consequence may fire measurement + economy + other-module effects in the same §3.2.5 transaction, each converging on its own deterministic key. [FACT: ADR-012 §3.1 L21]

## 4. Deferred — NOT AR-7 (cite-bounded)

- **Sandbox runtime / DSL / authoring UI / grant-consent UX** → per-platform build + ADR-010. [FACT: ADR-010 §5 L135-138]
- **User-authored capability definitions**; TipTap→registered-inline re-home; per-Block visual specs; views-hosting-instances seam. [FACT: ADR-008 §5 L145-147 · §3.4 L125-126]
- **`contributions` exact DDL** → Purpose-domain / MOD-purposes structure-data doc (not a universal primitive). [FACT: ADR-011 §3.8 L73]
- **Per-kind normalization curves, qualitative ladder UI, `derive()` hash, measurement-source registry runtime** → build-phase. [FACT: ADR-011 §3.8 L76]
- **Ledger exact columns/indexes finalization, `rules` table shape, currency-curve cfg, achievement reconcile runtime, `store` overlay** → build-phase. [FACT: ADR-012 §3.11 L97]
- **`move_money` Finance handler** → Finance-owned, INTENDED not-yet-built (`finance-service.ts` is 0-logic). [FACT: ADR-012 §3.6 L74]
- Consumer capstones **MOD-purposes** (purposes/targets/metrics) + **MOD-gamification** (XP/achievements/currencies surface, `services/gamification/`) build ON this substrate. [FACT: reconstructed-structure.md rows 46-47]

## 5. Known gaps to close in PLAN

- [UNKNOWN] Exact enumerated predicates for **M1–M7** and **E2–E4** live in capability-framework **§3** (not the ADR bodies); must be read line-by-line when scoping measurement/economy. [FACT: agents read ADR bodies; framework §3 is the enumerator]
- [UNKNOWN] Whether AR-6's existing `spaces` table already carries an `enabled_blocks` column or AR-7 adds it (migration 003 vs 004). Grep `spaces.ts` in PLAN.
- [UNKNOWN] `effect_event_id` `derive()` is spec'd as deterministic but its hash impl is build-phase — decide the minimal structural commitment (column + UNIQUE) vs the algorithm.

## 6. Dependencies (all satisfied)
Blocked-by AR-5 (LIF-107 ✅) · AR-6 (LIF-77 ✅) · DB-6 (LIF-68 ✅) · DB-9 (LIF-106 ✅). Unblocks MOD-purposes, MOD-gamification, HARD-2.
