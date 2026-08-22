---
Session 5 — 2026-08-22
Goal: Enhance the UI/UX session flow (Victor's 7-step draft) into a durable, thoughtfully-shaped build
methodology; persist it so a fresh session can run it on the Notes entity without losing anything.
Profile: Add Frontend Component (default scenario) — but the WORK this session was methodology design, no code.
---

## Accomplished
- **Designed + persisted the `Entity Delivery Flow`** → `docs/specs/foundation/entity-delivery-flow/_index.md`
  (DESIGN status). An overlay on the canonical spine (§XXVI Per-Step Build Gate · §XXVII Session Path ·
  §XXIX Currency · §XXX espinha) — NOT a rewrite. Governed by the No-Guessing Principle.

## The design (what it is)
1. **Entity Front Matter (shared, ABOVE the ①/② fork)** — the reframe Victor asked for. The
   backend/frontend split was happening too late (each track planned in isolation, the seam implicit).
   Now: `INTAKE → BASELINE → INTERPRETATION → DECOMPOSITION ░GATE░`, emitting `slice-map.md`
   (slices tagged backend|frontend|shared) + `seam-contract.md` (the service API the UI consumes).
2. **Interpretation layer** (`delivery/interpretation.md`) — makes the implicit explicit before build:
   DEPENDENCIES · NEEDS · ORGANIZATION · IMPLICIT RULES, each `[FACT: path:line]`. Grounded: the
   `vault-not-initialized` bug was an implicit NEED (keyless `_sync_hash` needs libsodium, independent
   of `[E]`) no aspect doc stated — the NEEDS section is where that class gets caught pre-build.
3. **Backend track — "Entity Service Build Flow"** (shaped for its own nuances, not a UI mirror):
   5 lenses (`operations · operation-flow · invariants · contract · composition · slice-map`) + 3
   backend-only nuances (persistence/schema binding · concurrency & transactions · security/ZK) +
   a per-slice **Verification Gate** (Vitest + typed-error assertions + live-DB smoke on real data).
4. **Frontend track — "Entity UI/UX Build Flow"**: 5 lenses (`screens · screen-flow · ux ·
   components-flow · slice-map`) + a per-slice **blocking Visual Gate** (real browser, every state ×
   {light|dark} × {375·768·1440} + §XIV a11y + `/component-audit`). No batching, no "owed".
5. **Recovery variant — "Entity Re-scope Flow"** (for already-built/possibly-wrong entities = Notes now):
   `AUDIT/RECONCILIATION` (built vs interpretation, item by item, cross-checked code↔doc; buckets
   ✅aligned/❌wrong/📄undocumented/🕳gap/⛔ungated-owed; EXHAUSTIVE → exit on a dry pass) →
   `RE-SCOPE ░GATE░` → corrected slice-map → resume normal tracks. Artifact: `delivery/reconciliation.md`.
6. **Directory layout:** `docs/features/<entity>/{delivery,service,ui-ux}/` beside the existing aspect
   corpus (no duplication — tracks reference identity/structure-data/business-rules/contract/conventions).

## Decisions
- **Decomposition Gate = two modes**: *decide* (net-new) vs *ratify+detail* (doc-fixed). MOD-notes runs
  **ratify mode** — retrofit onto the doc-fixed ①/②a–②e, never re-decide it
  ([[dont-split-a-doc-fixed-increment-subunit]]).
- **Overlay, not rewrite** — every phase maps 1:1 onto §XXVI/§XXIX; bookends unchanged. So it can be
  adopted without breaking `/toolkit-check` or the espinha.
- **Persist as a project foundation doc first; codify into the toolkit AFTER proving it on Notes** —
  avoids baking an unvalidated process into every future project.
- **Open (confirm next session):** dir names (`delivery`/`service`/`ui-ux` vs `api-ux` etc.); ratify-mode
  retrofit for Notes.

## Housekeeping
- Updated `.claude/tasks/mod-notes.md` (Session History row + next-step pointer) and `TASKS.md`
  (In-Progress status → new approach). Session-log entry appended.
- No code changed this session. Branch `mod-notes-2a-data-plane` still holds ②a+②b (committed) + ②c +
  the two bug fixes (uncommitted) — unchanged.

## Next session (FRESH — run the methodology on Notes)
1. Reload `docs/specs/foundation/entity-delivery-flow/_index.md` (§7 recovery variant · §10 Notes
   application · §11 open items).
2. Confirm the 2 open decisions → produce the FIRST artifact:
   `docs/features/notes-and-pages/delivery/reconciliation.md` (exhaustive built-vs-docs sweep) →
   `baseline.md` + `interpretation.md` → re-scoped `slice-map.md`.
3. Run the owed **②b+②c real-browser Visual Gate** under the per-slice format (Brave / chrome-devtools
   MCP) → `/component-audit` → **commit ②c + both fixes + docs** in one commit (§XXIX).
4. Then ②d panels → ②e search. LIF-131 closes only after ②d + ②e + the Visual Gate.
5. ⚠ Node 22 for the jsdom vitest suites (`.nvmrc`=22; only v20.20.2 local → `nvm install 22`).
