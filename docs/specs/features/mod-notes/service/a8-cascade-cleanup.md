<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A8 (LAST backend slice) · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in the aspect docs (NP-9) + interpretation IR-1/IR-13 (gated) +
     the As-is FK cascade *side* semantics (structure-data:15) + the no-FK app-layer-cascade convention (8 DB-4 domains)
     + the AR-6/AR-8 seams + A1-A7. No-Guessing: every claim is [FACT: path:line].
     NOTE: A8 implements the DOCUMENTED app-layer cascade (IR-13 eventually-consistent + re-drive). It is NOT a
     transactional/atomic cascade and introduces NO *InTx surface — cross-entity atomicity is not the platform model
     (no-FK, per-entity-blob LWW sync). There is NO open decision here; IR-13 fixes the handling. -->
<!-- ground-truth docs referenced by bare filename below live at docs/features/notes-and-pages/ (+ delivery/) and docs/specs/features/mod-notes/ -->

# A8 — page-delete cascade cleanup (IR-13)  (MOD-notes ① · slice A8)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = **NP-9** (the cascade rule,
`business-rules.md:17`) + **IR-1** (service-driven, not DB) + **IR-13** (the gated *handling*: per-entity,
eventually-consistent, re-drive — `interpretation.md:98`) + the **As-is FK *side* semantics** (`structure-data.md:15`
— which FK side cascades) + the **no-FK app-layer-cascade convention** shared across 8 DB-4 domains (TK-4, RL-2,
PJ-9, RT-17, check-ins, gamification — `db-4-*/_index.md`) + the AR-6 write seams + AR-8 reads + A1-A7. `current-*`
are removed-① residue; §XXIX regenerates them at the A-track close.

## 1. Context & scope
A8 EXTENDS the existing `softDeletePage(id)` (`service.ts:109-111`, currently page-only) into the **documented
service-driven cascade** that soft-deletes the page's satellite rows. It adds no method (the seam-contract row is
`softDeletePage triggers the cascade`), no table, and **no new foundation surface**. It is the **last backend
slice** — after it the ①→② seam is frozen.

**In scope — the cascade set (NP-9 + the As-is FK *side* semantics):**
- `page_links` where P is **source OR target** (both FK sides cascade — page↔page) `[FACT: business-rules.md:17;
  structure-data.md:15]`.
- the page's **outgoing** `entity_links` — `page_id = P` side ONLY (the As-is FK is `entity_links.page_id CASCADE`;
  the target side does NOT cascade, so backlinks *into* P are left — they are other pages' links) `[FACT:
  structure-data.md:15]`. Cleaned via AR-6 `removeLink` (Notes DELEGATES entity-link writes to AR-6, IR-ORG).
- `entity_tags` **referencing** P — `entity_id = P` (NP-9's ADR-006 replacement of the retired `page_tags` cascade:
  *"cleanup of the universal `entity_tags` rows referencing the page by `entity_type`/`entity_id`"*; `entity_id` is a
  globally-unique UUIDv7, so `entity_id = P` uniquely selects P's tags, and each row carries its own `entity_type` for
  the `untagEntity` call) `[FACT: business-rules.md:17 [INTENT — ADR-006]]`. Cleaned via AR-6 `untagEntity`.
- `note_attachments` where `page_id = P` `[FACT: business-rules.md:17]`. Soft-deleted.
- the **page itself** — soft-deleted **last** (BR-A8-5).

**How it behaves — the DOCUMENTED handling (IR-13; NOT a decision):**
- **Service-driven, per-entity soft-deletes.** The schema has no FK; the service explicitly soft-deletes each satellite
  (IR-1). Each satellite is an independent row that syncs as its own LWW blob (ADR-003) — the cascade is **eventually
  consistent** across devices *by design*, not by compromise.
- **Re-drive on partial failure, fail-loud.** A satellite failure **propagates** (no swallow — the A7 lesson); because
  the page is soft-deleted **last**, a mid-cascade failure leaves the page **live and the whole op re-drivable**
  (calling `softDeletePage` again re-runs the cascade; every step is idempotent). This is IR-13's **re-drive** strategy
  `[FACT: interpretation.md:98 IR-13 "re-drive / … / accept eventual consistency"]`.

**Explicitly OUT (do NOT build — not the platform model):**
- **No transaction / no atomic cascade / no `*InTx` surface.** Cross-entity atomicity is NOT the platform's model —
  the atomicity unit is one entity + its `sync_queue` enqueue (each `create/update/delete` its own `db.transaction`,
  `repository.ts:351/405/469`); each entity is its own sync blob. IR-13 states the DB *"guarantees neither cascade
  (no FK) nor atomicity"* and the service *accepts eventual consistency + re-drive* `[FACT: interpretation.md:98]`.
  A8 does NOT add `Repository.updateInTx`/`deleteInTx` or AR-6 `*InTx`.
- **No `pages.parent_id` reparent** (no FK in the M1.1 schema; not in NP-9's cleanup set).
- **No backlinks-INTO-P cleanup** (the As-is FK cascades only the `page_id` side, `structure-data.md:15`).
- No pomodoro/`sessions` cleanup (ADR-004 re-homed `pomodoro_sessions`, keyed by `session_id`, not page-cascaded)
  `[FACT: business-rules.md:17 [ADR-004]]`.

**Pattern to mirror (same file):** the `livePageLinks`/`liveEntityTags`/`liveAttachments` closures (`service.ts:68-76`)
for the live-row enumeration; `pageLinkRepo.delete`/`noteAttachmentRepo.delete` for soft-delete; `deps.spaces.removeLink`/
`deps.spaces.untagEntity` (AR-6) + `deps.backlinks.getLinksFrom` (AR-8) — all already wired as `deps` (A5).

## 2. Business rules (invariants A8 must hold)
- **BR-A8-1 · The cascade is SERVICE-driven (IR-1), per-entity soft-deletes.** The schema has NO FK; `softDeletePage`
  explicitly cleans each satellite `[FACT: interpretation.md IR-1; business-rules.md:17]`. Every satellite delete is a
  **soft** delete (`deleted_at` + `sync_queue` `operation:'update'`, softDelete repos) `[FACT: repository.ts:457-461]`.
- **BR-A8-2 · `page_links` cascade = both directions, de-duplicated.** Enumerate `livePageLinks(eq(source,P))` ∪
  `livePageLinks(eq(target,P))`, soft-delete each by `id` via `pageLinkRepo.delete`. De-dup by `id` (a self-link
  source==target==P appears in both) `[FACT: structure-data.md:15; NP-5 UNIQUE]`.
- **BR-A8-3 · `entity_links` cascade = the page's outgoing links only, via AR-6.** `deps.backlinks.getLinksFrom(P)`
  → for each row `deps.spaces.removeLink(P, row.entity_type, row.entity_id)` (AR-6 owns entity-link writes — Notes
  delegates, does not reach into the table; `removeLink` is idempotent resolve-then-soft-delete) `[FACT:
  backlink-resolver.ts getLinksFrom; foundation/spaces/service.ts:182-192]`. `page_id` side only (`structure-data.md:15`).
- **BR-A8-4 · `entity_tags` cascade = rows referencing P by `entity_id`, via AR-6.** Enumerate
  `liveEntityTags(eq(entity_id, P))` (NOT `getTagsForEntity`, which needs an `entity_type`; `entity_id` uniquely
  selects P) → for each `deps.spaces.untagEntity(row.tag_id, row.entity_type, row.entity_id)` (AR-6 owns tag writes)
  `[FACT: business-rules.md:17 [INTENT — ADR-006]; foundation/spaces/service.ts:145-154]`.
- **BR-A8-5 · Page soft-deleted LAST; fail-loud; re-drive idempotent (IR-13).** Order: satellites (BR-A8-2→3→4 +
  attachments) **then** `pageRepo.delete(P)`. A satellite failure **propagates** (no try/catch), leaving the page
  **live and re-drivable**. Re-drive is idempotent — empirically: a soft-deleted row physically remains, so
  `repository.update`/`delete` re-stamp `deleted_at` (no `Row not found`, `repository.ts:409-412`); `removeLink`/
  `untagEntity` `.find(live)`→`undefined`→guarded no-op (`foundation/spaces/service.ts:182-192,145-155`); the `live*`
  enumerations return only remaining rows. This IS IR-13's documented handling `[FACT: interpretation.md:98 IR-13;
  IR-11 revive/no-op idempotence]`.
- **BR-A8-6 · `note_attachments` cascade.** `liveAttachments(eq(page_id, P))` → `noteAttachmentRepo.delete(a.id)`
  each (soft, NP-9) `[FACT: business-rules.md:17; service.ts:237-239 removeAttachment pattern]`.
- **BR-A8-7 · No signature change.** `softDeletePage(id): Promise<void>` unchanged (seam-contract frozen); only its
  body grows. No new typed error (a satellite failure surfaces the underlying repo/AR-6 error, fail-loud).

## 3. Contract (the surface — unchanged; body grows)
```ts
// services/notes/types.ts — NO change (softDeletePage already declared, A1):
//   softDeletePage(id: string): Promise<void>
// services/notes/service.ts — the body grows to the cascade (IR-13 per-entity, page-last, fail-loud, re-drivable):
async softDeletePage(id) {
  // IR-1/IR-13: service-driven per-entity cascade. Satellites first, page LAST, FAIL-LOUD (no swallow) → a mid-
  // cascade failure leaves a LIVE, re-drivable page. Eventually consistent (per-entity LWW blobs, ADR-003). NOT
  // transactional — cross-entity atomicity is not the platform model (no-FK; IR-13). No *InTx.
  // 1. page_links (both FK sides), de-duped by id
  const [outLinks, inLinks] = await Promise.all([
    livePageLinks(eq(pageLinks.source_page_id, id)),
    livePageLinks(eq(pageLinks.target_page_id, id)),
  ])
  const linkIds = new Set([...outLinks, ...inLinks].map((l) => l.id))
  for (const linkId of linkIds) await pageLinkRepo.delete(linkId)
  // 2. entity_links (page's outgoing; page_id side per the As-is FK) → AR-6 removeLink
  for (const el of await deps.backlinks.getLinksFrom(id)) {
    await deps.spaces.removeLink(id, el.entity_type, el.entity_id)
  }
  // 3. entity_tags referencing P (by entity_id; NP-9 ADR-006) → AR-6 untagEntity
  for (const et of await liveEntityTags(eq(entityTags.entity_id, id))) {
    await deps.spaces.untagEntity(et.tag_id, et.entity_type, et.entity_id)
  }
  // 4. note_attachments
  for (const a of await liveAttachments(eq(noteAttachments.page_id, id))) {
    await noteAttachmentRepo.delete(a.id)
  }
  // 5. the page itself — LAST (a partial failure above left a live, re-drivable page)
  await pageRepo.delete(id)
},
```
- No new imports (all tables/closures/`deps` already in `service.ts`). `②` consumer: **B2** page-actions
  (soft-delete confirm, EC-11) calls `softDeletePage` `[FACT: slice-map.md:31]`.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A8 — cascade cleanup')` (reuse A1 `setup()`; A5 exposes `spaces` for tag/link seeding).**
   ⚠ **Seed with a REGISTERED `entity_type`** (`'note'`/`'page'` — the default registry seeds page/note/journal/tag/
   space): `svc.tagEntity`/`svc.createEntityLink` run `assertRegistered` and throw at SEED time on an unregistered
   type `[FACT: foundation/spaces/service.ts assertRegistered]`.
   - **full cascade (live-DB smoke, N1):** page P seeded with a `page_links` P→Q + Q→P, an `entity_link` P→(note,X),
     an `entity_tag` on (note,P.id) via `spaces.tagEntity`, a `note_attachment` on P. `softDeletePage(P.id)` →
     `getPage(P.id)` null · `getPageLinksFrom(P)`/`getPageLinksTo(P)` empty · `getEntityLinksFrom(P)` empty ·
     `getTagsForEntity('note', P.id)` empty · `getAttachments(P)` empty.
   - **both link directions cleaned** (P→Q and R→P).
   - **self-link de-dup:** a P→P page_link cleaned exactly once (no double-delete error).
   - **backlinks INTO P survive** (target side does NOT cascade): an entity_link X→P (`page_id=X`, `entity_id=P`) is
     UNTOUCHED after `softDeletePage(P)`.
   - **idempotent re-drive (BR-A8-5):** a SECOND `softDeletePage(P.id)` does not throw.
   - **fail-loud partial-failure smoke (BR-A8-5 — the live-DB partial-failure case):** stub one satellite step
     (`spaces.untagEntity`) to reject → `softDeletePage(P)` **rejects**, `getPage(P)` is still **non-null** (page
     deleted last → survives), downstream steps didn't run; clear the stub → a re-drive **completes** the cascade
     (page null, tags/attachments empty). Directly proves fail-loud + page-survives + re-drivable.
   - **unrelated rows untouched:** a sibling page S with its own links/tags/attachments is intact.
   - Case 1 also asserts the **pre-state** (each satellite length 1 before the delete) so the post-delete emptiness
     is non-vacuous.
2. **Green bars:** `pnpm --filter @vida/core test` all green (A1-A7's 51 stay green) · root `typecheck` 0 · `eslint` 0.
   Run the crypto-heavy suite ALONE.
3. **§XXIX currency:** the A-track close (§XXIX for the whole notes context) runs after A8 — A8 is the last slice.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `services/notes/service.ts` — replace the `softDeletePage` body (`:109-111`) with the §3 cascade. No new import
   (all values/closures/`deps` already in scope). Keep the signature.
2. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A8` cases (reuse `setup()` + `spaces`; seed via
   `svc.createPageLink`/`svc.createEntityLink`/`svc.tagEntity`/`svc.addAttachment`).
3. Do NOT touch `current-*` (§XXIX at the A-track close). Do NOT add any `*InTx`/transaction. Do NOT reparent children.
   Do NOT clean backlinks-into-P.

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to escalate:
- **cascade set + which FK side cascades** → NP-9 (`business-rules.md:17`) + `structure-data.md:15`.
- **`entity_tags` by `entity_id`** → NP-9 ADR-006 ("referencing the page by entity_type/entity_id") + UUIDv7 uniqueness.
- **the handling (per-entity, eventually-consistent, re-drive, fail-loud, page-last)** → **IR-13** (gated) +
  the no-FK app-layer-cascade convention (8 DB-4 domains) + ADR-003 per-entity LWW sync.
- **NOT transactional / no `*InTx`** → the platform's atomicity unit is one-entity + enqueue (`repository.ts`), cross-
  entity atomicity is not the model (IR-13: DB guarantees neither cascade nor atomicity). *(Corrects a prior draft that
  framed A8 as a "best-effort vs `*InTx`" g1 decision — IR-13 already fixes the handling; there is no decision, and no
  `*InTx` foundation surface is warranted.)*
