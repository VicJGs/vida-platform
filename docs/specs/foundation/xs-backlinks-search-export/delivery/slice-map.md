# Slice-map — xs-backlinks-search-export (#42)

> Entity Delivery Flow recovery variant · Step 5 (Re-scope Gate). The reconciliation ledger → a corrected,
> tagged slice plan. Each ❌/📄/🕳/⛔ becomes a slice with its plane + gate. **Approved before any code.**
>
> **Verdict:** this issue is a **RATIFY + one documentation back-fill**. 9 legs certified aligned (no code);
> 1 leg (R7/BSE-25) needs a doc back-fill + a thin conformance test. No new engine (all deferred engines
> homed OUT). Mirrors `xs-measurement` (full ratify) / `xs-views` (ratify + 1 thin extend).

## Ratified (no slice — certified aligned by Step 4)
- **BSE-01…09** — the built backlink resolver: `createBacklinkResolver` + `getBacklinksTo`/`getLinksFrom`/
  `resolveLink` + BL-1..BL-5, all shipped (AR-8), exported from `@vida/core`, 8 tests green. **RATIFIED.**

## Slices

### S1 — R7/INT-1 read-seam conformance back-fill  ·  plane: backend  ·  leg: BSE-25
**Why:** the resolver exemplifies the R7 read-seam pattern (read-only + graceful-degrade) but the named
pattern is undocumented (reconciliation: 📄). Deliverable = a documented invariant + a thin conformance
assertion — **no production code** (interpretation RULE #6; authoring an engine here would violate R7).

**Build steps (§5 for this slice):**
1. `docs/core/backlinks/current-business-rules.md` — add **BL-7 (R7 read-seam conformance, INT-1)**: the
   `BacklinkResolver` is a documented read API other modules pull through — never a direct cross-module table
   read and never a materialized cross-module index; it is read-only (BL-1) and degrades gracefully on an
   absent source (unknown type → `[]`, BL-3), never fabricating a value. Cite `capability-framework.md:66`
   (R7) + `corpus:56`. Satisfies BSE-25.
2. `docs/core/backlinks/current-spec.md` — add a one-line "R7 read-seam" note under Scope/Contract pointing
   at BL-7, so the pattern conformance is visible in the spec too.
3. `packages/core/src/services/search/__tests__/backlink-resolver.test.ts` — add one thin **R7 conformance
   test**: assert the constructed `BacklinkResolver` surface is read-only — it exposes exactly
   `{ getBacklinksTo, getLinksFrom, resolveLink }` and no mutation method (an explicit guard that the read
   seam never grows a write path, enforcing BL-1/BL-7 structurally). Mirrors the prior-XS thin-ratify test.

**Verification Gate (blocking):**
- `vitest run` the resolver suite → **9 tests green** (8 existing + 1 new conformance).
- Full `@vida/core` suite green (baseline 1039 → 1040).
- `tsc` 0 errors · `eslint` 0 errors.
- Live-store smoke: N/A beyond the suite — the read path is vault-free (interpretation NEEDS) and the
  existing tests already drive the real wa-sqlite/repository path via AR-6's write seam.

## §XXIX Currency (Step 8)
- `docs/core/backlinks/current-spec.md` + `current-business-rules.md` refreshed IN this slice (they ARE the
  back-fill target) → already current at close; promote nothing further.
- `packages/core/src/services/search/CLAUDE.md` — optional one-line note that the resolver is the R7 read-seam
  exemplar (BSE-25 ratified). Non-blocking.

## Scope fence (what this issue does NOT touch)
FTS5/search (DB-8) · export serializers (UI-3 `@vida/editor`) · neural-graph data-prep (AR-8#2/Views) ·
page↔page links + merged panel (Notes ②) · any UI face (P6 `fe-*`) · the R7 concrete engines
`summary`/`dueIn`/`measure`/ViewProviderRegistry (Journals/Sessions/Measurement/Views).
