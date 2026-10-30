# xs-views — Corrected Slice-Map (Entity Re-scope recovery, Step 5)

> The reconciliation ledger (Step 4) → scoped slices, each tagged by plane + carrying its gate. Approved
> before any code. **Single-plane (backend).** Ratify = no slice (already built + gated); one EXTEND slice.

## Ratified (no slice — built + AR-6-gated, currency-marked at close)

21 legs: XCU-01–04, 06 (seam), 07–20, 22, SP-34 (seams). See `reconciliation.md` §A/§D.

## Slice S1 — `ViewsService.cloneView` (BACKEND · extend · the only owed code)

**Leg:** XCU-05. **Plane:** backend → **Verification Gate** (functional + live-store smoke).

**Contract (doc-grounded — no invented params):**

```
cloneView(sourceId: string, targetSpaceId?: string | null): Promise<ViewRow>
```

- `targetSpaceId` is the ONLY documented variation on clone — the global↔Space redirect (ADR-007:50-51,
  intake spaces.md:72). Omitted → copy `source.space_id` (plain independent copy). **No `name` override** —
  rename-on-clone is nowhere in the docs (ADR-007 / intake say only "independent copy" + global↔Space); dropped.
- Read source via `getView(sourceId)` → absent throws `ViewNotFound` (reuse XCU-04). `[IR-1]`
- Create an **independent copy**: copy `name` + `layout` + `filter` + `grouping` + `sort` from the source row
  (filter/grouping/sort are stored TEXT `spaces.ts:122-124` → pass through as-is, do NOT re-parse/re-stringify);
  `space_id` = `targetSpaceId ?? source.space_id`. `[FACT: ADR-007:50-51; schema spaces.ts:117-124]`
- Fresh UUIDv7 + fresh `_sync_*`/`deleted_at` (create path mints them) — **no** source sync metadata, **no**
  `template_id`/back-link. `[IR-5, IR-1]`
- Does NOT touch `spaces.default_view_id`. `[IR-6]`
- Flows through the Repository → co-transactional `sync_queue` (create enqueues `operation:'insert'`). `[IR-2]`
- M1.0 empty-`[E]` pass-through inherited. `[IR-3]`

**Files:** `packages/core/src/foundation/views/service.ts` (add method to `ViewsService` iface + impl) ·
`spaces/__tests__/spaces.test.ts` (or a `views`-specific test) for the Verification Gate.

**Note — filter/grouping/sort handling (a real gotcha):** the source `ViewRow` holds these as **JSON strings**;
`createView`'s input expects **objects** (it stringifies). So `cloneView` must either (a) call the Repository's
`create` with the raw strings directly (bypassing `createView`'s stringify), or (b) `JSON.parse` then hand to
`createView`. Prefer (a) — a private `createRow(fields)` shared by `createView`+`cloneView` — to avoid a
parse→stringify round-trip that could reject malformed-but-stored JSON. Resolve in the slice's §5 spec.

**Acceptance / Verification Gate:**

1. clone of a global view (source `space_id=null`) with `targetSpaceId` → new row, `space_id` set, same name/layout/filter/grouping/sort, **new id**.
2. clone with no `targetSpaceId` → independent copy, same `space_id`+`name`, new id; mutating the clone does not touch the source (independence).
3. clone of an absent id → `ViewNotFound`.
4. clone enqueues a `sync_queue` insert (co-transactional) — asserted on the **live store** (better-sqlite3 + migration), not a mock.
5. clone does NOT set any `spaces.default_view_id`.
6. typecheck 0 · lint 0 · `@vida/core` suite green (+ new cases).

## Gate plan (Step 6)

S1 runs the §XXVI per-step gate: `/document-context` (spaces, baseline done) → slice §5 spec via `/documentation-component` → `/critique` (Approval 1) → `/preflight` → `/critique` (Approval 2) → implement → **Verification Gate** (live-store smoke). Then Step 7 `/critique` SHIP → Step 8 Currency (§XXIX) refresh `docs/core/spaces/current-*` with the cloneView delta.

## Re-scope Gate — APPROVAL REQUESTED

One backend slice (S1 `cloneView`). 21 legs ratify with no code. Approve to proceed to S1's spec + build.
