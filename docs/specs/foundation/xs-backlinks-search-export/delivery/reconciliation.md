# Reconciliation — xs-backlinks-search-export (#42)

> Entity Delivery Flow recovery variant · Step 4. Built-vs-docs ledger, cross-plane, swept item-by-item
> against `interpretation.md` (Interpretation Gate SHIP). Exit condition = a DRY pass (a full re-sweep
> surfacing zero new items). Buckets: ✅ aligned · ❌ wrong · 📄 undocumented · 🕳 gap · ⛔ ungated-owed.
>
> **Plane summary:** ① service = the whole issue. ② surface = **N/A** — every UI face is homed OUT to P6
> `fe-*` (search box, export dialog, Sigma render). No shared slices. Envision Gate SKIPPED (pure-backend).

## Ledger — the 10 owned legs (decomposition.md:41)

| Leg | Item | Plane | Bucket | Code ↔ doc evidence |
|-----|------|-------|--------|---------------------|
| BSE-01 | `createBacklinkResolver(db, deviceId)` factory | backend | ✅ aligned | `backlink-resolver.ts:32-40` ↔ `current-spec.md:16`; re-exported `packages/core/src/index.ts:133` |
| BSE-02 | `getBacklinksTo(entityType, entityId)` | backend | ✅ aligned | `.ts:46-54` ↔ `current-spec.md:18`; test `backlink-resolver.test.ts:78` |
| BSE-03 | `getLinksFrom(pageId)` | backend | ✅ aligned | `.ts:56-60` ↔ `current-spec.md:19`; test `:92` |
| BSE-04 | `resolveLink(pageId, entityType, entityId)` | backend | ✅ aligned | `.ts:62-72` ↔ `current-spec.md:20`; test `:154` |
| BSE-05 | BL-1 read-only invariant | backend | ✅ aligned | `.ts:3-6` (no write path) ↔ `current-business-rules.md:4-6` |
| BSE-06 | BL-2 soft-delete aware | backend | ✅ aligned | `.ts:42-44` ↔ `br.md:7-9`; tests `:106,116,129` |
| BSE-07 | BL-3 no registry gate on reads (unknown → `[]`) | backend | ✅ aligned | `.ts:13-15` ↔ `br.md:10-12`; test `:144` |
| BSE-08 | BL-4 composite identity (type AND id) | backend | ✅ aligned | `.ts:49-50,66-67` ↔ `br.md:12-13`; test `:169` |
| BSE-09 | BL-5 single live link (UNIQUE) | backend | ✅ aligned | `.ts:9,71` ↔ `br.md:14-15`; test `:154` |
| **BSE-25** | **R7 read-seam PATTERN invariant (INT-1)** | backend | **📄 undocumented** | Resolver EXEMPLIFIES R7 (read-only BL-1 + graceful-degrade BL-3) but the **named R7/INT-1 pattern is nowhere stated** in `docs/core/backlinks/*` or `services/search/*` (grep: 0 hits). Corpus source `corpus:56` · `capability-framework.md:66`. |

## Buckets rolled up
- **✅ aligned — 9** (BSE-01…09): the built + tested + documented resolver. Zero drift (baseline confirmed clean; Documentation-Gate claim A CONFIRMED).
- **📄 undocumented — 1** (BSE-25): the R7 read-seam pattern conformance is unstated → back-fill.
- **❌ wrong — 0.**
- **🕳 gap — 0** — no new engine is owed here; search/export/graph-prep are homed OUT (DB-8 · UI-3 · AR-8#2/Views) and page↔page → Notes. Per interpretation RULE #6, authoring a read-seam engine here would VIOLATE R7's own ownership rule.
- **⛔ ungated-owed — 0** — the resolver shipped through the AR-8 gate with 8 tests; no owed gate.

## R7 (BSE-25) — what "documented" requires
Interpretation RULE #6: leg 25's deliverable is **a documented invariant + (optionally) a thin conformance
assertion — not new engine code.** R7's two behavioural teeth are ALREADY covered by existing tests:
- read-only (never mutates) ← BL-1 (interface exposes only read methods, `.ts:23-30`)
- graceful-degrade on absent source (unknown → `[]`, never fabricated/throw) ← BL-3 test `:144`

So the back-fill = **name the pattern** (promote R7/INT-1 as a new business rule, e.g. `BL-7`, into
`current-business-rules.md` + a `current-spec.md` note) + **one thin conformance test** asserting the
resolver surface is read-only (an explicit R7 guard, mirroring the prior-XS ratify pattern of adding a
thin assertion). No production code changes.

## DRY pass
Second full re-sweep of all 10 legs + the resolver source + the barrel + tests + current-* surfaced
**zero new items**. Ledger is DRY. → Step 5 Re-scope Gate.

## Cross-checks (no silent drop)
- `@vida/core` export chain intact: `index.ts:133 export * from './services/search'` → `search/index.ts:3 export * from './backlink-resolver'`. ✅
- No consumers built yet (first-consumer-pull; dependents MOD-finance/knowledge/learning-education/tasks/health-core are all downstream, unbuilt) — so the ratify has no integration surface to reconcile. ✅
- Deferred legs (10–24) + cross-refs (26–27) confirmed homed OUT by P4 (SHIP: 0 unhomed) — not this issue's ledger.
