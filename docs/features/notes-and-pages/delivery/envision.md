<!-- Entity Delivery Flow · Step 1.875 (ENVISION GATE) · Notes & Pages · base flow (§3), §4.75.
     A THROWAWAY greybox rendered the whole entity's SHAPE from the real @vida/ui + fake data, BEFORE slicing,
     so the human pins the vision checkpoints the downstream gates are judged against (taste as a LEADING contract,
     not a trailing veto). Reviewer = the HUMAN, blocking. Fires because "how does a user link two notes?" had no
     obvious shipped answer. Checkpoints pinned from Victor's review (12 points), routing critique-verified FAITHFUL. -->

# Envision — Notes & Pages

**Status: ✅ APPROVED by Victor 2026-08-23 (blocking gate CLOSED). Greybox (REV 2) matched the vision; throwaway code deleted; screenshots kept as the record. → Step 2 Decomposition (Ratify mode).**

## Greybox
- **Where:** throwaway Vite entry `apps/web/envision.html` → `apps/web/src/__envision__/{main,notes}.tsx` (real `@vida/ui` + fake data; **deleted after the gate**). Live at `http://localhost:5173/envision.html`.
- **Verified:** renders in a real browser, **zero console errors**; every screen × 4 terminal states × the core affordances (create · edit · delete · link · navigate · empty · error).
- **Screenshots:** REV 1 deck (19) at `delivery/envision-shots/deck/`; **REV 2 deck (14)** at `delivery/envision-shots/r2/` — REV 2 renders the 12 pinned points (ADR-007 view system: List/Table/Board-Kanban/Gallery/Calendar/Neural + filter/sort/per-page/nest/Configure; split `[[` vs `/entity-link`; real-editor feel; collapsible rail; create-with-tags; empty create-CTA).
- **URL-addressable:** `?view=list|table|gallery|board|calendar|neural` · `?state=…` · `?note=<id>` · `?rail=0` · `?picker=note|entity&pickerq=<text>` · `?dialog=create|delete|export`.

## The documented `[[` link flow (Victor point 12 — grounded in the docs)
Two DISTINCT mechanisms the greybox conflated (split them in ②):
- **`[[` wiki-link = page → page** (`page_links`): type `[[` → `@tiptap/suggestion` picker → `resolveWikiLink(text)` candidates → select resolves to `target_page_id` **at creation time** (stored by id → survives rename, immune to title collisions, NP-7); no-match → **create-on-miss** stub `note` (explicit, never silent); UNIQUE(source,target) idempotent (NP-5); reverse shows in Backlinks (`idx_page_links_target`, an ① net-new read). `[FACT: conventions.md:8,22; business-rules.md NP-5/7; contract.md:16]`
- **`/entity-link` = page → any registered entity** (`entity_links`, via the editor block): write → AR-6, read → AR-8. Separate from `[[`. `getBacklinks` merges both only at READ (G6). `[FACT: contract.md:14-15; baseline §1.2/§2.3]`

## Pinned checkpoints — MOD-notes ② (structural → Decomposition coverage + ② Visual-Gate MUSTs)
| EC | Screen / state | Assertion (the vision) | Type | Slice(s) |
|----|----------------|------------------------|------|----------|
| EC-1 | `/notes` · Neural | note nodes + page-link edges = two notes **visibly connected**; node-click opens | `structural` | N-graph · N-link |
| EC-2 | note detail | "link two notes" answered in-note via the **`[[` wiki flow** (page_links), kept DISTINCT from `/entity-link`; Link + Links-out + Backlinks | `structural` | N-detail · N-link |
| EC-3 | `[[` picker | search-by-title · **resolve-by-id** (survives rename) · **create-on-miss** · never silent | `structural` | N-link-picker |
| EC-4 | collection | the **4 hard-coded baseline renderers** (List/Gallery/Calendar/Neural) + New Note + row open/delete, one surface | `structural` | N-collection |
| EC-5 | terminal states | every view renders loading/empty/error/populated **distinctly**; **empty carries a create-CTA**; journal `/summary` **degrades per-section**, never blanks | `structural` | N-collection · N-journal-summary |
| EC-6 | note page (pt 10) | mounts the **real `@vida/editor`** — blank-page, per-row, `/` slash **or** text-wrap; NP-8 seeded note non-blank | `structural` | N-editor-mount |
| EC-7 | note detail (pt 11) | the detail is a **collapsible right rail** the user can open/close | `structural` | N-detail |
| EC-8 | New Note (pt 9) | can **set tags** on create — delegates the write to AR-6, composes the Spaces entity-tag picker | `structural` | N-create · (← MOD-spaces picker) |
| EC-9 | collection (pt 5 baseline) | built-in **favorite/archive/tag filters** + a favorites-only filter — ① **builds** `listPages({favorite,archived,tag})` (doc-fixed signature; columns ship, code is ①'s) | `structural` | N-collection · ①-filter |
| EC-10 | link action (pt 7 feel) | linking **feels immediate + undoable** (optimistic + toast; graph/backlinks update live) | `feel` | N-link (live VG) |
| EC-11 | delete | delete is **soft, confirm-gated, reversible-feeling** | `feel` | N-detail (live VG) |

## Vision ROUTED OUT — the configurable-view system = ADR-007 `views` (MOD-spaces ②, NOT MOD-notes ②)
Doc-fixed (§9 MOD-notes ② "renderers **hard-coded** … selection deferred" · §9 MOD-spaces ② "saved-views **builder + selector** … feeding the layout renderers" · ADR-007 §3). Pinned as vision, decomposed under **MOD-spaces**, cross-referenced here so nothing is lost:
| Victor point | ADR-007 mechanism | Home |
|--------------|-------------------|------|
| 1 — create/edit/clone views, tag filters | `views` = filter(tags/types/predicates) × layout × grouping | MOD-spaces ② builder/selector |
| 2 — List columns | `table` layout | MOD-spaces ② + layout design-pass |
| 3 — Calendar weekly/monthly/yearly + type colors | `calendar` layout config + tag `color` | MOD-spaces ② + design-pass + AR-6 color |
| 4 — Gallery columns; **Kanban** w/ tag columns | `board` layout (Kanban = board group-by-tag) + `gallery` | MOD-spaces ② (board is an enumerated ADR-007 layout) |
| 5 — favorites as a space / saved filter | a `views` row filtered to favorite (or a Space) | MOD-spaces ② (baseline toggle stays in EC-9) |
| 6 — sort by created | grouping/**sort** keys | MOD-spaces ② |
| 7 — Neural under the same view model | `graph` layout | MOD-spaces ② |
| 8 — Neural grouping + tag-coloring config | grouping + tag `color` (AR-6; substrate already built) | MOD-spaces ② + AR-6 color |

## NEW INTENT — beyond current docs → HOMED to the Spaces Views design-pass (§9 L234; not a new track)
Genuinely absent from ADR-007 (verified: no pagination / no persisted manual order / no per-type nested inner-collection):
- **Per-page pagination** (points 2, 4) — a layout-config detail → Spaces Views design-pass.
- **Nest notes by type with an inner collection view** (point 4) — novel nested-view → Spaces Views design-pass.
- **Manual ordering** (point 6) — needs a persisted order column; `notes.ts` has none and the schema froze at DB-4 close → an **ADR-002 amendment / DB-11**, surfaced in the Views design-pass. Not MOD-notes ②.

## Approval
✅ **APPROVED — Victor, 2026-08-23** (blocking gate closed). Greybox REV 2 + the pinned/routed checkpoint set approved.
The throwaway greybox code (`apps/web/envision.html` + `apps/web/src/__envision__/`) is **deleted** per §4.75; the
screenshot decks (`envision-shots/deck/` REV 1, `envision-shots/r2/` REV 2) are retained as the greybox record.
→ **Step 2 · Decomposition (Ratify mode):** map every MOD-notes-② `structural` EC to ≥1 slice; record the Spaces/new-intent items as cross-references; include the cascade-atomicity item (N8/IR-13).
