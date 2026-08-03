# foundation/capability — Current Business Rules

> Durable invariants for the capability registry (AR-7 Increment 2). Promoted from
> `docs/specs/foundation/ar-7-capability-registry/capability/` at §XXIX. Owning ADRs: ADR-008 (CB1–6) + ADR-010 (A2/A5).
> Kept current with `packages/core/src/foundation/capability/`.

- **BR-1 (definition registry).** The registry holds capability **definitions** (`id · kind · render_targets ·
  bindings · effects · config_schema · terminal_states`); shipped defs are **code-registered** (in-memory), user defs
  **persisted** + synced. The semantic `id` is the `def_id` UNIQUE business key (the row PK is a generated UUIDv7 —
  `repository.create()` always generates it; mirrors `session_type_registry.sub_type`). [ADR-008 §3.4]
- **BR-2 (render targets — CB2).** `render_targets` ⊆ `{inline, standalone}` (`RENDER_TARGET`, FIXED); else `InvalidRenderTarget`.
- **BR-3 (declared effects — CB4).** `effects[]` ⊆ `EFFECT_TYPE` (increment-1 vocab); declaration only — firing deferred; else `UnknownDeclaredEffect`.
- **BR-4 (terminal states — CB6).** Every supported render target declares all four `TERMINAL_STATE`
  (`loading·empty·error·success`); else `MissingTerminalStates`.
- **BR-5 (strict subset — A4.5).** A user def's `effects ∪ bindings` ⊆ the **shipped privilege union**; else
  `CapabilityPrivilegeExceeded`. Single-level (a def has no separate internal envelope — the grant envelope is a
  separate `capability_grants` row, deferred). [ADR-010 §3.3:95-96]
- **BR-6 (identity — A5).** A def's `id` is unique across shipped + persisted; a shipped id or a duplicate → `DuplicateCapabilityId`. [ADR-010 §3.4]
- **BR-7 (block_instances).** Standalone placements = syncable rows (DATA-4); `config` with user literals is `[E]`
  (EN-2). **Structure only** this increment — no placement-creation service (→ MOD-notes/UI-3). [ADR-008 §3.4]
- **BR-8 (capability_grants).** The declare→grant envelope table (exact 8 fields per ADR-010 §3.2 +
  `granted_envelope_hash`), syncable. **Structure only** — enforce/re-grant/sandbox runtime deferred (→ `#85 CAP-authoring`). [ADR-010 §3.2]

## Deferred (not in this increment — all homed, DF-12)
Sandbox · DSL · authoring UI · grant enforce/re-grant/revoke → `#85 CAP-authoring`. Registry runtime (block placement ·
inline instances · TipTap re-home · BlockType union · per-Block visual) → MOD-notes `#31` / UI-3 `#29`.
`capability_grants` external-semantics → P3-boundary `#71` (M2). Views-hosting seam → ADR-008 §6 conditional.
