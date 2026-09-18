<!-- Service spec-set — features/sessions-and-scheduling · MOD-sessions ① (LIF-139) · Entity Delivery Flow §4.
     Backend "Entity Service Build Flow". REFERENCES the aspect docs + delivery/ front matter — never restates.
     The operation surface + typed errors live in delivery/seam-contract.md; this indexes the spec-set, the
     3 backend-only nuances, and the operation→slice→invariant→gate traceability. -->

# Service Spec-Set — `services/sessions` (backend track)

**Home:** `packages/core/src/services/sessions/`. Factory-object service `createSessionsService(...)`, mirroring
`foundation/spaces/service.ts` (D7). One `createRepository(db, table, cfg)` per table; every mutation → repo →
co-transactional `sync_queue` enqueue. M1.0 `encryptedFields: []` pass-through (BR-13).

**Spec-set (per EDF §4):** operations + typed errors → `delivery/seam-contract.md` (not restated). Per-slice
forward specs → `service/S<n>-*.md` (the g1/g2 objects). Slices + gate ledger → `delivery/slice-map.md`.

## The 3 backend-only nuances (apply to every slice)

1. **Persistence & schema binding.** Each table gets its own repo with the right `softDelete` flag:
   - `sessions`, `study_availability`, `availability_exceptions`, `study_plan_batches`, `session_templates`,
     `planned_blocks` → **`softDelete: true`** (they carry `deleted_at`).
   - `study_sessions`, `focus_sessions`, `session_attachments` → **`softDelete: false`** — they use
     `...baseColumns` with **no `deleted_at`** (B2′/IR-7 — the base session owns lifecycle). `detach` = **hard
     delete**; `attach` = findWhere-key → no-op-or-create (no revive path, unlike the spaces junctions);
     soft-deleting a session touches the **spine only** (the extension goes unreachable via `getSession`).
   - `planned_blocks` carries its own `deleted_at` → `softDelete: true`.
2. **Concurrency & transactions.** A session spine + its 1:1 extension (`focus_sessions`/`study_sessions`) are
   **one logical create** → use `Repository.createInTx(tx, …)` inside a single `db.transaction` so a crash never
   leaves a spine without its extension (or vice-versa). Completion (S2) already uses the #32 fire-first/
   commit-last ordering — ① must not open a competing transaction around it.
3. **Security / zero-knowledge.** All writes need an **unlocked vault** (N1) — even zero-`[E]` tables, because
   the repo computes a keyless content-hash. `[E]` fields (`key_learnings`, `availability_exceptions.reason`,
   `study_plan_batches.name`, `session_templates.name`/`description`) stay in the `encryptedFields: []`
   pass-through seam for M1.0; the write path must not special-case them (M3/DB-5 flips the set).

## Traceability (operation → slice → invariant → gate)

| Operation(s) | Slice | Enforces | Verification-Gate focus |
|--------------|-------|----------|-------------------------|
| `createSession`/`get`/`update`/`softDelete`/`restore`, `attach`/`detach`/`resolveTargets` | S1 | BR-S1, IR-5, IR-7, nuance-1/2/3 | live create+attach on unlocked vault; extension atomicity; attach idempotency + hard-detach |
| `createSession`(validation), `completeSession`/`transitionSession` | S2 | IR-1, BR-3/BR-4, BR-8..BR-12 (#32) | completion routes through `transition()`; no second firing path; registry rejection typed |
| `startFocus`/`pause`/`resume`/`complete`/`cancel`/`nextInterval` | S3 | IR-3, IR-4, IR-5 (illegal resume) | real-focus = elapsed−paused; interruption capture; config precedence |
| `setAvailability`/`addException`/`listAvailability` | S4 | SS-9, BR-5c ranges | CHECK violations surface typed |
| `generatePlan`(shell)/`approve`/`activate`/`recalc` | S5 | SS-8, typed empty-plan | batch state machine; activate→createSession bridge |
| template CRUD + `setDefault` | S6 | PD-3, single-default | `is_default` single-winner |
| `dueIn`/`registerDueProvider`/`getSessionAnalytics` | S7 | IR-2, IR-6, N5 | provider-absent degrades; analytics derived, no stored table |

Composition: `createSessionsService({ db, deviceId, repository-factory, registry, effects })` — depends on the
AR-5 `SessionRegistry` (D1), the #32 lifecycle/effects (D2/D3), db-6 `Repository` (D5). No sibling MOD service
exists yet (first real `services/*` build).
