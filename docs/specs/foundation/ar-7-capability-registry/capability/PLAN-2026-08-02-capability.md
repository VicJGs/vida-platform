# PLAN (§XXVI g1) — AR-7 Increment 2: the `capability` registry

> AR-7 ⊞4, increment 2 of 4 (`effects ✅ → capability → measurement → economy`). Profile: Add Backend Component.
> §2.1-gathered; every shape `[FACT: file:line]`. Shared grounding: `../baseline.md`. Rides increment 1 (`EFFECT_TYPE`).

## §1. Scope (structure + thin registry — the AR-5/AR-6 grain)

**Is (build-now):** the capability substrate STRUCTURE + a thin registry — `foundation/capability` +
`db/schema/foundation/capability.ts` + `migrations/005_capability.ts` + `@vida/types` enum. Covers ADR-008
(registry + block_instances) and ADR-010's decided TABLE (`capability_grants`) — the substrate the stub CLAUDE.md
assigns (ADR-008 + ADR-010).

**Is NOT (deferred, cited):**

- **Sandbox runtime · DSL · authoring UI · grant/consent/revoke UX** — ADR-010 §5 / §3.4 (per-platform build).
- **Grant enforce / re-grant-on-change / revoke RUNTIME** — ADR-010 §3.2 (the table stores the envelope; runtime enforcement is later).
- **Inline instances** — editor node attrs in the page Yjs doc, **no table** [FACT: ADR-008 §3.4:122].
- **Placement creation + palette resolution** (a standalone placement drawn-from `enabled_blocks` enforcement) — runtime, M1.1 editor/UI [FACT: ADR-008 §3.4:133-138].
- **Views-hosting-instances seam** — open build seam [FACT: ADR-008 §3.4:124]. **Per-Block visual spec** + **TipTap→inline re-home** — build-time [FACT: ADR-008:145-147]. **`editor.ts BlockType` union opening** — @vida/editor, later.

**Baseline (live floor):** `foundation/capability/` = CLAUDE.md stub only (grep clean); no `capability_definitions`/
`block_instances`/`capability_grants` table anywhere; next migration = **005**. **AR-6 already built
`space_enabled_blocks`** (migration 003) with `capability_def_id TEXT` (plain, no FK) → it references THIS registry
[FACT: spaces.ts:99-106]. Template = AR-5 `session_type_registry` (JSON-as-TEXT dims, `is_user_type`, shipped
in-memory + user persisted → Repository → sync_queue) [FACT: sessions.ts:53-66, sessions/registry.ts].

## §2. Business rules

- **BR-1 (definition registry).** The registry holds capability **definitions** (`id · kind · render_targets ·
bindings · effects · config_schema`); shipped defs are **code-registered** (in-memory), user defs **persisted** +
  synced. [FACT: ADR-008 §3.4:119-121]
- **BR-2 (render targets — CB2).** `render_targets` ⊆ `{inline, standalone}` (RENDER_TARGET, FIXED), declared per definition. [FACT: ADR-008 §3.4:121-124]
- **BR-3 (declared effects — CB4).** A definition's `effects[]` ⊆ `EFFECT_TYPE` (increment-1 canonical vocab); declaration only — the rail FIRING is deferred. [FACT: ADR-008 §3.3 CB4; framework §2]
- **BR-4 (terminal states — CB6).** Every definition declares all four `TERMINAL_STATE`
  (`loading·empty·error·success`) for each render target it supports; `register` checks all four are present per
  supported target. `TERMINAL_STATE` is a code-level tuple (not a DB column — parity with the effects increment's `EFFECT_CLASS`). [FACT: ADR-008:142-143]
- **BR-5 (strict subset — A4.5).** A **user-authored** definition's `effects ∪ bindings` are a **strict subset** of
  the **shipped-capability privilege union**; enforced at `register`. **Single-level by design:** unlike a
  SessionTypeDef (which carries a separate internal `permissions` dimension → AR-5's two-level check), a
  CapabilityDefinition's `effects`/`bindings` _are_ its declaration — the grant envelope is a separate
  `capability_grants` row authored at grant-time (deferred). So this is the correct capability analogue, not a
  dropped AR-5 level. [FACT: ADR-010 §3.3:95-96; contrast sessions/registry.ts:89-100]
- **BR-6 (identity — A5).** A user-authored definition **cannot register a shipped capability's id** — dup-id guard, typed throw. [FACT: ADR-010 §3.4:103-104]
- **BR-7 (block_instances).** A standalone placement = a `block_instances` row referenced by a Space, syncable
  (DATA-4, `_sync_*` + `deleted_at`); `config` with user literals is `[E]` (EN-2). Structure only — placement
  creation/resolution deferred. [FACT: ADR-008 §3.4:121-124]
- **BR-8 (capability_grants).** A grant records the exact envelope + `granted_envelope_hash` (the delta-check
  field), syncable. Structure only — enforce/re-grant deferred. [FACT: ADR-010 §3.2:65-71]

## §3. Contract (shapes — cited)

### 3.1 `@vida/types` enum + code-level tuple

- `RENDER_TARGET = ['inline', 'standalone'] as const` (+ `RenderTarget`) — the only new FIXED **@vida/types** enum. `kind` is **OPEN**
  vocab (registry-validated, no CHECK — like session `sub_type`; ADR-008 doesn't enumerate `kind`, it "carries study_method"). [FACT: ADR-008 §3.4:119-120]
- `TERMINAL_STATE = ['loading','empty','error','success'] as const` — **code-level in `foundation/capability/types.ts`**
  (not @vida/types, not a DB column; used only by BR-4's register-time completeness check — parity with `EFFECT_CLASS`). [FACT: ADR-008:142]

### 3.2 Tables — `db/schema/foundation/capability.ts` (migration 005; DDL hand-SQL)

- **`capability_definitions`** (syncable, `...baseColumns` like session_type_registry): `id · kind TEXT (OPEN) ·
render_targets TEXT(JSON) · bindings TEXT(JSON) · effects TEXT(JSON) · config_schema TEXT(JSON) ·
terminal_states TEXT(JSON) · is_user_type INTEGER · deleted_at`. Only `is_user_type=1` rows persist (shipped =
  in-memory, SS-4 precedent). JSON-as-TEXT (ADR-002 §2.5).
- **`block_instances`** (syncable): `id · capability_def_id TEXT (no FK) · space_id TEXT (no FK) · config TEXT [E] ·
deleted_at`. Standalone placements (BR-7).
- **`capability_grants`** (syncable): `id · capability_def_id TEXT · granted_bindings TEXT(JSON) · granted_effects
TEXT(JSON) · media_ok INTEGER · external_in_ok INTEGER · external_out_ok INTEGER · consented_sensitive_modules
TEXT(JSON) · granted_envelope_hash TEXT · deleted_at`. Exact field set per ADR-010 §3.2:66-67.
- No FK (base+extension separate sync blobs, live convention). `capability_def_id`/`space_id` = plain TEXT + index.

### 3.3 `CapabilityRegistry` — `foundation/capability/{types,registry}.ts`

- `CapabilityDefinition = { id, kind, render_targets: RenderTarget[], bindings: string[], effects: EffectType[], config_schema?, terminal_states: Record<RenderTarget, TerminalState[]>, is_user_type? }`.
- `SHIPPED_CAPABILITIES: CapabilityDefinition[]` — ≥1 complete shipped def with a **non-empty** `bindings`+`effects`
  envelope (e.g. a `habit_logger` that binds `['habit']` and emits `['complete_habit_occurrence','award_xp']`), so
  the shipped privilege union is non-empty and **BR-5 is a real check** (a pure-render `chart` with `bindings:[]`/
  `effects:[]` alone would make BR-5 degenerate and Acceptance §4.3 unable to fire). AR-5 `SHIPPED_SESSION_TYPES` precedent.
- `register(def)` — validates BR-2 (render_targets ⊆ RENDER_TARGET) · BR-3 (effects ⊆ EFFECT_TYPE) · BR-4 (terminal_states present per render target) · BR-5 (user bindings/effects ⊆ shipped union) · BR-6 (id not a shipped id + not already persisted); persists user defs via `createRepository(...)` → sync_queue. `get(id)` (shipped→persisted, else `CapabilityNotFound`). `list()`.
- Typed errors (`types.ts`): `InvalidRenderTarget · UnknownDeclaredEffect · MissingTerminalStates · CapabilityEnvelopeExceeded · DuplicateCapabilityId · CapabilityNotFound`.
- Barrels: `foundation/capability/index.ts`, `db/schema/index.ts`, `@vida/core`. `@vida/types` barrel += RENDER_TARGET. Zod validator for RENDER_TARGET in `core/validators` + enum-parity is **N/A** (render_target is JSON, not a scalar CHECK column — like session effects; no parity row).

## §4. Acceptance

1. 3 tables + migration 005 registered (runner version→5); root typecheck 10/10; `@vida/core` typecheck 0.
2. `RENDER_TARGET` C2 tuple in `@vida/types`; consumed by the registry validation.
3. Tests (`__tests__/capability.test.ts`): migration wiring (3 tables, version→5); register shipped + user def; BR-2/3/4 rejects (bad render target / unknown effect / missing terminal states → typed); BR-5 user-exceeds-shipped → `CapabilityEnvelopeExceeded`; BR-6 shipped-id / dup → `DuplicateCapabilityId`; user def persists + enqueues one sync_queue row (db-6 seam, AR-5/AR-6 precedent).
4. `@vida/core` suite green; existing suites unbroken (watch the version-assertion pattern — assert `>= n`).
5. No FK; `block_instances.config` is `[E]`; grants field-set exactly matches ADR-010 §3.2.
6. Every shape traces to a cited line; disclosed grain calls (below) accepted at Approval 1.

## §5. Implementation Prompt (→ IMPL-PLAN at gate 2)

Order: `@vida/types` RENDER_TARGET (+barrel) → `core/validators` render-target z.enum → `foundation/capability/types.ts`
→ `db/schema/foundation/capability.ts` (+schema barrel) → `migrations/005_capability.ts` (+runner) →
`foundation/capability/registry.ts` (+index barrel, +@vida/core) → `__tests__/capability.test.ts` → typecheck + tests.
Then §XXIX Currency → `docs/core/capability/current-*` + layer-doc.

## §6. Disclosed grain calls (accept at Approval 1)

- **capability_grants + block_instances built as STRUCTURE now**, though their runtime (grant enforce, placement
  create/resolve) is deferred — completes the substrate's tables per the "structure + thin registry" grain (AR-5/AR-6);
  both are decided/owed (ADR-008 §3.4, ADR-010 owed-ledger ✓). Alternative = defer the tables to their runtime's
  increment; rejected because `space_enabled_blocks.capability_def_id` already dangles at this registry and the tables are decided.
- **`kind` is OPEN** (no CHECK) — ADR-008 doesn't enumerate it.
- **No enforcement/sandbox** — the grant table stores the envelope; ADR-010's enforce/sandbox is explicitly its own later runtime pass (§5).
