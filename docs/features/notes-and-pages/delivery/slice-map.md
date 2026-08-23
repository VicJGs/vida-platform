<!-- delivery/slice-map.md — Entity Delivery Flow · Phase RE-SCOPE GATE (recovery variant, Step 5).
     The corrected, TAGGED plan derived from reconciliation.md. Every ⛔/🕳/📄/🟡 → a scoped slice with its
     plane tag AND its gate. Approved (Re-scope Gate) before any further code. Step 6 resumes BY TAG:
     frontend→Visual Gate · backend/shared→Verification Gate · doc-only→plain edit. Born 2026-08-22.
     Rev 2 (2026-08-22): D1 corrected — the service/ + ui-ux/ 5-lens spec sets are AUTHORED (S2/S3), the
     bookend proper spec never made at first (Victor). See memory entity-lens-specs-are-bookend-deliverables. -->

# Slice map — Notes & Pages (corrected, tagged · recovery output)

**Mode:** ratify (doc-fixed ①/②a–②e; retrofit not re-decide). **Source:** `reconciliation.md` dry-pass ledger.
**Gate legend:** ░Visual Gate░ = real browser (Brave/chrome-devtools MCP), every state × {light|dark*} ×
{375·768·1440} + §XIV a11y + `/component-audit` + `victor:quality-gate-components`/`-engineering` +
`victor:verification`, screenshots as evidence. ░Verification Gate░ = Vitest + typed-error assertions + live-DB
smoke on the real store. ░Documentation Gate (spec-set)░ = `/critique` the authored lens-set: complete ·
coherent · No-Guessing-clean · references (never restates) the aspect corpus + current-*. *(app is light-only at
M1.0 — "dark" = token-capable audit, not a rendered pass — `[FACT: memory apps-web-is-the-first-vida-ui-consumer]`.)*

## The bookend spec sets (why S2/S3 exist)

The `service/` + `ui-ux/` 5-lens sets are **per-entity bookend deliverables** — authored at the BEGINNING (the
forward spec each track builds/gates against) and refreshed at the END (§XXIX currency), exactly like
`/document-context`, **so nothing is lost**. `current-spec.md`/`current-business-rules.md` record the *shipped
slice*; they do NOT substitute for the full spec. In THIS recovery, authoring them now **identifies and presents
the full proper spec that was never made at first** for the already-built ①/②b/②c, and serves as the forward
spec for the still-🕳 ②d/②e. `[FACT: entity-delivery-flow/_index.md §5,§6; memory entity-lens-specs-are-bookend-deliverables]`

## Ordered slices

### S1 · Fix stale migration-count comments — `shared` · **plain edit** (no gate)
- **What:** `worker.ts:23`, `apps/web/src/db/CLAUDE.md`, `packages/core/src/db/CLAUDE.md` say migrate applies
  "001/002/003"; `ALL_MIGRATIONS` runs 001–032 (`runner.ts:60-90`). Not a runtime defect (`pages` IS migrated)
  — a misleading comment. Ledger #21.
- **Done when:** 3 comments corrected; `pnpm typecheck` 0. No behavioral change → no gate.

### S2 · Author the `service/` 5-lens backend spec set — `backend/shared` · ░Documentation Gate (spec-set)░
- **What:** ledger #23 (backend half). The retroactive proper spec for the built ① `NotesService`, authored per
  §5 — `_index.md` (scope + traceability) · `operations.md` (the 23-method surface + typed-error set) ·
  `operation-flow.md` (CRUD lifecycle · idempotence paths · txn boundaries/DP-8 · persistence & schema binding ·
  ZK/keyless-hash) · `invariants.md` (references `business-rules.md`, does not restate) · `contract.md` (the DX
  contract: Row returns · validator schemas · `[E]` set · sync) · `composition.md` (dep graph → AR-6/AR-8/repo) ·
  `slice-map.md` (backend sub-units + Verification-Gate ledger). **References** the aspect corpus + `current-*`,
  never restates. Grounds against `interpretation.md` (NEEDS/IMPLICIT-RULES already surfaced).
- **Gate:** ░Documentation Gate (spec-set)░ — `/critique` the set before S6 builds against it.
- **Done when:** the 7 files exist, cited-to-file, gate PASS.

### S3 · Author the `ui-ux/` 5-lens frontend spec set — `frontend` · ░Documentation Gate (spec-set)░
- **What:** ledger #23 (frontend half). The retroactive proper spec for the built ②b/②c AND the forward spec for
  🕳 ②d/②e, authored per §6 — `_index.md` (scope + screen→flow→component→slice→gate) · `screens.md` (every
  view/route + its 8 states, §VIII: `/notes`, `note/$id`, the `[[` picker, ②d panels, ②e search) ·
  `screen-flow.md` (CRUD navigation + per-op state machine) · `ux.md` (interaction · a11y §XIV · responsive §X ·
  motion §IX · copy) · `components-flow.md` (which `@vida/ui`/`@vida/editor` primitives compose into which
  feature components + data/props flow) · `slice-map.md` (②b/②c/②d/②e sub-units + Visual-Gate ledger).
  **References** the aspect corpus + `current-*`, never restates.
- **Gate:** ░Documentation Gate (spec-set)░ — `/critique`. **This set is the yardstick S4's Visual Gate judges
  ②b/②c against** — so it precedes S4.
- **Done when:** the 6 files exist, cited-to-file, gate PASS.

### S4 · The owed ②b + ②c real-browser Visual Gate — `frontend` · ░Visual Gate░ — 🔍 **DRIVE COMPLETE · awaiting Victor's review** (2026-08-22)
- **Drive result:** clean in Brave (chrome-devtools MCP) — full state matrix × {375·768·1440}, a11y swept, console
  clean (1 benign info log), both bug fixes live-confirmed, evidence screenshots captured + presented to Victor.
  **No ②b/②c findings** (a command-bar observation was doc-checked → the two-mode typing→search is UX-2-owned
  intended behavior, not a ②b defect — `command-bar-and-search.md §2`). **The gate is PASS only on Victor's
  review-approval of the evidence** (the mandatory human step); that approval gates S5. Full record in
  `../ui-ux/slice-map.md` S4.
- **What:** the CORE runtime debt. One combined gate clears ⛔ ledger #12–#17, judged against S3's `ui-ux/` spec.
  - **Screens/states:** `/notes` (empty · loading · success-list · success-gallery · neural-empty · error) ×
    switcher; `note/$id` (loading · **not-found/empty** · error · success-editor); the `[[` picker (idle ·
    loading · candidates · "+ Create" · empty-query); the save indicator (Saved · Saving… · Save failed).
  - **Responsive:** 375 · 768 · 1440. **Dark:** token audit. **a11y §XIV:** editor `aria-labelledby`, picker
    combobox ARIA + roving keys + Esc, card `aria-label`, switcher `group`.
  - `/component-audit` → `victor:quality-gate-components` → `-engineering` → `victor:verification`.
- **Preconditions:** Vite dev (Node 20 — the Node-22 caveat is jsdom-only). Live create→edit→autosave already
  verified post the two fixes. Capture screenshots into the fix specs.
- **Done when:** every state PASS across breakpoints; a11y clean; audit clean; screenshots captured. No "owed."

### S5 · Commit ②c + both bug fixes + all docs — `shared` · commit (gated by S4 PASS)
- **What:** ledger 🟡 #9/#14/#15/#16/#17/#18/#19 — the uncommitted ②c surface + the two live-verified bug fixes,
  on `mod-notes-2a-data-plane`. §XXIX: refreshed `current-*` + the `delivery/` front matter + the new `service/`
  + `ui-ux/` sets ship WITH the code.
- **Done when:** tree clean for the set; commit cites LIF-131 + both fix bug-units; `git show --stat` verified
  (memory [[dont-stage-commit-while-sync-in-flight]]).

### S6 · `core-vault-init-on-db-open` — `backend` · ░Verification Gate░ (blocking)
- **What:** ledger #20 — hoist `initVault()`/libsodium-readiness into `@vida/core`'s DB-open path so every
  platform has crypto ready before any repository write (else mobile/desktop re-hit the vault crash). **The
  cross-plane row a UI-only recovery would strand.** Built + gated against S2's `service/` spec. Homed task
  `.claude/tasks/core-vault-init-on-db-open.md`.
- **Gate:** ░Verification Gate░ — Vitest (a write path exercises `hashContent()`) + live-DB smoke;
  `/task-switch core-vault-init-on-db-open` (add-backend-component) is the isolation fallback. Own §XXVI gate.
- **Order:** after S5 (independent of the Notes surface; can be a separate session).

### S7 · ②d — backlink/entity-link panels + page metadata — `frontend` · ░Visual Gate░ (blocking)
- **What:** ledger #24 (🕳) — panels + page metadata (favorite/archive/icon/cover). **Absorbs ledger #5 / U-1:**
  build the G6 page+entity **merge** in `getBacklinks` or keep entity-only? Resolve at ②d's PLAN gate. The
  G6-tentative entity-link `[[` variant re-enters the ②c picker (Candidate already forward-compat). Spec'd in
  S3's `ui-ux/` set; build → g1 → g2 → implement → ░Visual Gate░. Own §XXVI gate.
- **Order:** after S5. Independent of S6.

### S8 · ②e — FTS5 search UI — `frontend` · ░Visual Gate░ (blocking) · **blocked on DB-8**
- **What:** ledger #25 (🕳) — search UI over the DB-8 FTS5 seam (currently stubs `search-unavailable`). Surface
  is spec'd in S3's `ui-ux/` set; the engine is DB-8. Scoped so it is not "left behind"; not startable until DB-8.
- **Order:** LAST.

## End-of-track currency (the "end" bookend)

Per §XXIX, at each track close the lens-sets are **refreshed** against what actually shipped: S2's `service/` set
after S6; S3's `ui-ux/` set after S4 (②b/②c) and again after S7 (②d) / S8 (②e). Authoring (beginning) +
refresh (end) = nothing lost.

## Slice → gate → plane ledger (the re-scoped path)

| Slice | Plane | Gate | Clears (ledger #) | Blocks on |
|-------|-------|------|-------------------|-----------|
| S1 | shared | plain edit | 21 | — |
| S2 | backend/shared | ░Documentation Gate (spec-set)░ | 23 (backend half) | — |
| S3 | frontend | ░Documentation Gate (spec-set)░ | 23 (frontend half) | — |
| S4 | frontend | ░Visual Gate░ | 12–17 (⛔) | S3 (yardstick) + Vite dev + Brave |
| S5 | shared | commit (S4 PASS) | 9,14,15,16,17,18,19 (🟡) | S4 |
| S6 | backend | ░Verification Gate░ | 20 (🕳 homed) | S2 (yardstick) + S5 (soft) |
| S7 | frontend | ░Visual Gate░ | 24 + 5/U-1 (🕳) | S3 + S5 |
| S8 | frontend | ░Visual Gate░ | 25 (🕳) | S3 + DB-8 |

**Nothing left behind:** every ⛔/🕳/📄/🟡 in `reconciliation.md` maps to a slice above (no deferrals — the
lens-sets are now authored, not scoped out). Each slice clears its OWN gate before the next.

## Re-scope Gate — APPROVED (2026-08-22)

Approved. S1 (comments) · S2 (`service/` set) · S3 (`ui-ux/` set) built + spec-set-gated. Then **S4 (Visual Gate)
was DRIVEN and FAILED at Victor's review** — see Rev 3.

---

## Rev 3 — S4 Visual Gate FAILED → the 7-findings re-scope (2026-08-22/23)

**Victor's Visual-Gate review of ②b/②c caught 7 findings my automated drive missed** (the review is the gate):
F1 no delete · F2 no on-page create button · F3 NoteCard text flush to the border · F4 graph shows no note nodes ·
F5 editor is a boxed rectangle not a notebook · F6 `/` menu arrows don't visibly move selection · F7 toolbar inside
the frame not above.

**Two drift corrections (grounded in `m1.1-delivery-plan.md:151-156`, the authoritative "② UI NOW"):**
1. F1 delete + F4 graph-nodes were NOT doc-deferred — my own `ui-ux/screen-flow.md` invented the delete deferral;
   graph node-rendering is ②-buildable (only the cross-entity data-prep is AR-8). **Build now.**
2. **②d panels + ②e search are NOT "later slices" — they're in §9's "② UI NOW"**, part of THIS issue (LIF-131).
   Also caught: §9 lists **List/Calendar/Gallery/Neural** — the **Calendar view was never built**.
   ⇒ genuinely deferred (doc-grounded): saved-view *selection* · `/summary` menu (M1.4) · cross-entity graph
   data-prep (AR-8) · FTS5 *engine* (DB-8). Everything else is now.

**The re-scoped build slices** (editor first, then Notes — Victor's call; editor changes go in `@vida/editor`/`@vida/ui`):

| Slice | Plane | What | Status |
|-------|-------|------|--------|
| **E1** | @vida/editor | notebook presentation (F5): `frame:'plain'` default (seamless), borderless 24px title, centered 720 column, caret focus | ✅ done + live-verified |
| **E2** | @vida/editor | toolbar above (F7): sticky top bar via a new `header` slot (toolbar→title→content) | ✅ done + live-verified |
| **E3** | @vida/editor | slash-nav (F6): `scrollIntoView` the selected option (same on the `[[` menu) | ✅ done + live-verified |
| **N1** | @vida/ui | NoteCard containment (F3): fixed the **Card `padding`-variant name collision** (0 inset on every card → 12px) | ✅ done + live-verified |
| **N2** | apps/web | on-page "New note" button (F2, header + empty state) | ✅ done + live-verified |
| **N3** | apps/web | delete affordance (F1): confirm Dialog → `softDeletePage` → back to /notes | ✅ done + live-verified |
| **N4** | apps/web | **Calendar view** (the missed §9 view): `CalendarView` bucketing notes by `created_at` + month nav | ✅ done + live-verified |
| **N5** | apps/web | Neural note-nodes (F4): feed pages + `page_links` to `NeuralGraph` | ⬜ **NEXT (fresh session)** |
| **N6** | apps/web | backlink/entity-link panels (②d) | ⬜ pending |
| **N7** | apps/web | page metadata: favorite/archive/icon/cover (②d) | ⬜ pending |
| **N8** | apps/web | FTS5 search UI over the DB-8 seam (②e, degrades) | ⬜ pending (surface now; engine=DB-8) |

**This session's close-out (WIP checkpoint commit):** E1–E3 + N1–N4 + the earlier ②c editor + 2 bug fixes +
recovery front matter + `service/`/`ui-ux/` sets committed on `mod-notes-2a-data-plane`. typecheck 0 across
`@vida/editor`/`@vida/ui`/`@vida/web`; live-verified in Brave (create→edit→autosave→`[[`→delete→views).

**OWED before LIF-131 closes (next session):** N5–N8 → the **consolidated real-browser Visual Gate**
(every state × {375·768·1440} + §XIV a11y + `/component-audit`) → **Victor's review** → §XXIX currency refresh →
S6 `core-vault-init-on-db-open` (backend, Verification Gate). ⚠ `@vida/editor`/`@vida/ui` jsdom tests need **Node 22**
(local is 20) — run in CI or after `nvm install 22` (the `frame`/`header`/slash-scroll/Card-`pad` changes need test
updates).
