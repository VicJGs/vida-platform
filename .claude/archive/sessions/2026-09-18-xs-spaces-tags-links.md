Date: 2026-09-18 — xs-spaces-tags-links #? (LIF-175) — M1.1.1 XS head — COMPLETE
Task: xs-spaces-tags-links · Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1, Decide-mode) · branch `xs-spaces-tags-links` → PR #40 → main (`1c0f42a`)
Goal: build the 4th M1.1.1 XS foundation head — the single leg XCU-SP-27, the tag/link unify⇄separate association-resolution SERVICE over the AR-6 substrate.

Accomplished:
  - **AssociationResolver** (`foundation/spaces/association-resolver.ts`) — `resolveAssociations(ref, mode)` over `entity_tags` + `entity_links`. `unified` → one homogeneous `Association[]` (each edge keeps `kind`, no blur/dedup — BR-4); `separate` → two typed relations. Reads via Repository (empty `[E]` set BR-13; `findWhere` decrypt seam for M3), explicit `isNull(deleted_at)`, registry-validated fail-loud. Factory-object, no `this.`. + barrel export + 7 tests (live better-sqlite3, migration 003).
  - **Ratify AR-6 substrate; build only the resolution service.** AR-6 (LIF-77) had explicitly deferred the resolution layer (`current-spec.md:34` "→ build-time"); this session IS that build-phase design-pass (the internals ADR-006 §"does NOT" L129-130 left open).
  - **§XXVI double-gate:** gate-1 `/critique` REVISE (B1 cosmetic-unified · B2 partiality) → fixed grounded → SHIP · Approval 1 · `/preflight` PASSED (closed the M3 decrypt-seam read-path guess) · gate-2 `/critique` SHIP · Approval 2. Per-slice Verification Gate 7/7. Post-impl `/critique` SHIP (folded `!`-comment + multi-tag stability test) · engineering gate PASS.
  - Currency §XXIX: `docs/core/spaces/current-{spec,business-rules}.md` refreshed — resolver in Services, deferral narrowed to the P6 surface, **BR-16** (behavioral resolution, not display flag) + **BR-17** (outgoing ⊕ AR-8). Spec set `docs/specs/foundation/xs-spaces-tags-links/`.
  - Green: `@vida/core` typecheck clean · eslint 0 · **886/886**. Commit `2f5ece7` → PR #40 → merged `1c0f42a`. LIF-175 → Done (tracker `--sync`). Unblocks 16 downstream MODs.

Decisions:
  - **unified is BEHAVIORAL, not cosmetic:** modes differ in relation structure (one homogeneous vs two heterogeneous), computed in the OS (ADR-006:90-92); reversibility is a storage property, NOT a reshape of `separate`. No dedup across kinds (BR-4).
  - **Outgoing-half scope, ⊕ AR-8:** inbound refs / neural-graph / traversal engine = AR-8 (`current-spec.md:33`, `spaces.ts:66`), never here. "traverse" in §3.3 is a mode-semantic, not a graph mandate. Cross-entity by-filter query = views (ADR-007).
  - **`TaggableRef` not `EntityRef`:** the barrel collided with `foundation/measurement`'s `EntityRef`; this head has no measurement dep (decomposition.md:48) → distinct name, spaces vocabulary, zero cross-foundation coupling ([[design-model-reuses-canon-by-type-not-runtime]] applies inversely — don't reuse without a grounded edge).
  - Two Victor drift-catches (both resolved against doc lines): the resolution semantics and the AR-8 boundary. Reinforces [[gate-the-approach-dont-ask-piecemeal-planning]] + [[decide-dont-ask-when-docs-give-the-answer]] — the design-pass is mine to ground+gate, not to ask.

Next session:
  - **FIRST ACTION:** next XS head via `tracker_sync --next` — peer heads **xs-views** (8 dependents, ADR-007 ratify — `ViewEngine`/`ViewsService` already built by AR-6, likely FULL/near-ratify) or **mod-journals** / **mod-preferences**. Verify each against its `current-*` / AR-6 build before sizing ratify-vs-extend. Env: Node 24 via nvm + corepack pnpm; per-issue branch → PR.
