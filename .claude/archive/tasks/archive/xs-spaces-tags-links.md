# Task: xs-spaces-tags-links
# Status: done
# Linear: LIF-175
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1 — Decide-mode for the net-new XCU-SP-27 association-resolution SERVICE, composing ratified AR-6 substrate; NOT Entity Re-scope — no wrong existing resolution code exists)
# Leg: xcut-spaces:XCU-SP-27 (the ONLY leg — decomposition.md:48). Tag/link unify⇄separate resolution layer. SPLIT: service=this head; UI(switch+surface)=P6/frontend. Substrate (tags·entity_tags·entity_links·TaggableTypeRegistry) = AR-6 LIF-77, already built.
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Spaces / tags / entity-links service (XCU-SP-27).

## Dependencies
- (none)

## Completed 2026-09-18 (1 session · PR #40 → merged 1c0f42a)
Built the XCU-SP-27 **AssociationResolver** — the tag/link unify⇄separate resolution SERVICE over `entity_tags` + `entity_links` (ADR-006 §3.3). `resolveAssociations(ref, mode)`: `unified` → one homogeneous `Association[]` (each edge keeps `kind`, no blur/dedup, BR-4); `separate` → two typed relations. A real OS-computed resolution, not a display flag.
- **Scope (grounded):** ratified AR-6 substrate; built only the resolution service. Outgoing half only (tags + outbound `page_id` links); inbound = AR-8 (complete space = this ⊕ AR-8). Stateless on `mode` (switch + surface = P6/Preferences+Spaces). Reads via Repository (empty `[E]` set BR-13, `findWhere` decrypt seam for M3), explicit `isNull(deleted_at)`, registry-validated fail-loud.
- **Two Victor drift-catches, both resolved against doc lines:** (1) unified must be a REAL behavioral resolution (relation-structure), not a cosmetic reshape of separate — dropped the round-trippable-concat framing; (2) no over-scope into AR-8 (inbound refs / neural-graph / traversal engine). Named `TaggableRef` (not `EntityRef`) to avoid coupling to `foundation/measurement`.
- **Gates:** §XXVI double-gate (`/critique` REVISE→SHIP + `/preflight` PASSED + gate-2 SHIP) → Approval 1/2 → per-slice Verification Gate (7 tests, live better-sqlite3 migration 003) → post-impl `/critique` SHIP + engineering gate PASS. Currency §XXIX: `docs/core/spaces/current-*` refreshed (BR-16 behavioral-resolution, BR-17 outgoing-⊕-AR-8).
- **Green:** `@vida/core` typecheck clean · eslint 0 · 886/886.
- **Files:** `foundation/spaces/{association-resolver.ts, index.ts, __tests__/association-resolver.test.ts}` · `docs/core/spaces/current-{spec,business-rules}.md` · spec set `docs/specs/foundation/xs-spaces-tags-links/`.
- **Lesson:** the design-pass latitude ADR-006 §"does NOT" leaves is MINE to ground + gate, not to ask piecemeal; "one association space" is a mode-semantic (one relation vs two), not a graph/traversal mandate (that's AR-8). Unblocks 16 downstream MODs.
