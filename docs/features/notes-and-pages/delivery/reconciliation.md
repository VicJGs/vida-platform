<!-- delivery/reconciliation.md — Entity Delivery Flow · Phase AUDIT/RECONCILIATION (recovery variant, Step 4).
     The built-vs-docs ledger. CROSS-PLANE: sweeps ① service + ② surface, each item cross-checked code↔doc and
     tagged {backend|frontend|shared}, bucketed ✅/❌/📄/🕳/⛔. Exit = a DRY pass (zero new items). Feeds the
     ░Re-scope Gate░ (Step 5) → slice-map.md. Born 2026-08-22. Yardstick = Documentation-Gate-PASSED corpus. -->

# Reconciliation — Notes & Pages (built-vs-docs, cross-plane)

**Mode:** ratify (the ①/②a–②e split is doc-fixed — retrofit, never re-decide). **Yardstick:** the corpus that
cleared the ░Documentation Gate░ + `interpretation.md` that cleared the ░Interpretation Gate░. **Method:**
`/audit-existing` + `victor:impact-scan` over the exhaustive built-code inventory (Explore sweep, 2026-08-22).

## Buckets
✅ aligned (built · matches docs · gated) · ❌ wrong (built · diverges → fix) · 📄 undocumented (code, no/stale
doc → back-fill) · 🕳 gap (documented, not built → scope+build) · ⛔ ungated-owed (built · a required gate never
ran → run it). 🟡 = orthogonal state flag (uncommitted) layered on a bucket.

## The ledger

| # | Item | Plane | Bucket | Evidence | Action |
|---|------|-------|--------|----------|--------|
| **① BACKEND** ||||||
| 1 | `NotesService` (23 methods: pages CRUD·page-links·resolveWikiLink·ensureEntityNote·attachments·facades·tag-reads) | backend | ✅ aligned | `service.ts`; `current-spec.md:14-37`; ① MERGED through a §XXVI double-gate + post-impl SHIP | none — re-read confirms match |
| 2 | validators `createPageSchema`/`updatePageSchema` (`.strict()`, type≡validator) | backend | ✅ aligned | `validators/note.ts`; `current-spec.md:30-33` | none |
| 3 | typed errors `JournalExistsError`/`UnregisteredEntityTypeError` | backend | ✅ aligned | `types.ts:108-120`; `current-business-rules.md:11-18` | none |
| 4 | Row-type barrel `PageRow`/`PageLinkRow`/`NoteAttachmentRow` | backend | ✅ aligned | `packages/core/src/index.ts:135-141` | none |
| 5 | `getBacklinks` = entity-links only; G6 page+entity **merge** unbuilt | backend | 🕳 gap (tentative) | `backlink-resolver.ts:11` "M1.0: entity_links only"; `contract.md:15` "merged"; interpretation U-1 | scope the merge as a ②d decision — do NOT mark the entity-only ship ❌ |
| **②a DATA PLANE** ||||||
| 6 | worker `values` op + client `driver.values` RPC (positional, IR-7) | shared | ✅ aligned | `worker.ts:98-105`, `client.ts:156`; committed `6b72613`; ②a double-gate | none |
| 7 | `getDb()` + **DP-8 whole-txn mutex** (IR-6) | shared | ✅ aligned | `drizzle.ts:35-61`; `current-business-rules.md:38`; wire-order test | none |
| 8 | device-id (`app_state` UUIDv7, never synced, fail-loud pre-boot) | shared | ✅ aligned | `device-id.ts`; `current-business-rules.md:36`; Interp-Gate verified ordering sound | none |
| 9 | boot chain (`initVault()` ∥ open, then device-id; render-gated) | shared | ✅ aligned · 🟡 uncommitted | `boot.ts:58-59`; `App.tsx:54` gates render (Interp-Gate verified) | commit (bundled w/ vault fix, #17) |
| 10 | `getNotesService()` accessor (dep graph, memoized) | shared | ✅ aligned | `notes-service.ts:29-38`; committed | none |
| 11 | React-Query hooks (reads+mutations+invalidation matrix, DP-6/7) | shared | ✅ aligned | `hooks.ts`; committed; ②a double-gate | none |
| **②b `/notes` SURFACE** ||||||
| 12 | `/notes` route: multi-mode List/Gallery/Neural (`usePagesByType('note')`) | frontend | ✅ built · **⛔ ungated-owed** | `app/notes/index.tsx`; committed `21f5e3b`; **Visual Gate never ran** | run ②b Visual Gate |
| 13 | `NoteCard` · `view-switcher` (Zustand `activeNotesView`) | frontend | ✅ built · **⛔ ungated-owed** | `note-card.tsx`, `view-switcher.tsx`; committed | run in the ②b Visual Gate |
| 14 | command-bar "New note" (⌘K · dynamic import · manual invalidate IR-4) | frontend | ✅ built · **⛔ ungated-owed** · 🟡 uncommitted (commands.ts fix) | `commands.ts:20-42`; `current-spec.md:67-69` | Visual Gate + commit |
| **②c EDITOR SURFACE** ||||||
| 15 | note editor mount + editable title + save indicator (EM-2/4/6/7/9) | frontend | ✅ built · **⛔ ungated-owed** · 🟡 uncommitted | `note-detail.tsx`; `current-business-rules.md:45-54` | run ②c Visual Gate + commit |
| 16 | autosave hook (debounce · skip-echo IR-5 · flush-on-unmount EM-10) | frontend | ✅ built · **⛔ ungated-owed** · 🟡 uncommitted | `use-note-autosave.ts`; `current-business-rules.md:47-54` | Visual Gate (behavioral) + commit |
| 17 | `@vida/editor` `wikiLink` mark + `[[` Suggestion + popup + emit-only md (WL-2b/4/6, IR-8) | frontend (editor) | ✅ built · **⛔ ungated-owed** · 🟡 uncommitted | `extensions/wiki-link.ts`, `wiki-link-menu.tsx`, `to-markdown.ts`; `@vida/editor` v0.9.0 | Visual Gate (picker states) + commit |
| **SHARED / CROSS-PLANE** ||||||
| 18 | fix `vault-not-initialized-on-boot` (initVault at boot; keyless-hash NEED #1) | shared | ✅ built · live-verified · 🟡 uncommitted | `docs/specs/fixes/vault-not-initialized-on-boot`; Brave `after-fix-*.png` | commit with the Visual Gate result |
| 19 | fix `editor-empty-doc-assert-crash` (normalize `{type:'doc'}`→content:[]) | shared (editor) | ✅ built · live-verified · 🟡 uncommitted | `docs/specs/fixes/editor-empty-doc-assert-crash`; Brave png | commit |
| 20 | **`core-vault-init-on-db-open`** — hoist `initVault()` into `@vida/core` DB-open (so mobile/desktop don't re-hit NEED #1) | **backend** | 🕳 gap (homed) | `.claude/tasks/core-vault-init-on-db-open.md`; interpretation "cross-plane tension" | **backend slice → ░Verification Gate░** (the row a UI-only sweep strands) |
| 21 | stale migration-count comments ("001/002/003") — `ALL_MIGRATIONS` runs 001–032 | shared | 📄 stale doc | `worker.ts:23`; `apps/web/src/db/CLAUDE.md`; `packages/core/src/db/CLAUDE.md`; `runner.ts:60-90` (Interp-Gate Nit 1) | fix the 3 comments (not a runtime defect — `pages` IS migrated) |
| **DOCUMENTATION (front matter + tracks)** ||||||
| 22 | `delivery/` front matter (baseline·interpretation·reconciliation·slice-map) | shared | 📄 → being authored | this recovery run | finish slice-map (Step 5) |
| 23 | `service/` (5-lens backend set) + `ui-ux/` (5-lens frontend set) | shared | 📄 undocumented → **AUTHOR** | methodology §5/§6; not authored | **Author both** — the bookend proper spec never made at first (Victor, Re-scope Gate). The lens-sets are per-entity deliverables (beginning + end, like document-context); `current-*` records the shipped slice, it does NOT substitute for the full spec. Each gets its ░Documentation Gate (spec-set)░. `[FACT: memory entity-lens-specs-are-bookend-deliverables]` |
| **DOC-GATE / GAPS** ||||||
| 24 | ②d — backlink/entity-link panels + page metadata (favorite/archive/icon/cover) | frontend | 🕳 gap | `current-spec.md:9`; task `## Progress` ②d | scope as a tagged slice (absorbs #5 G6 merge decision) |
| 25 | ②e — FTS5 search UI (over the DB-8 seam) | frontend | 🕳 gap | `current-spec.md:9`; DB-8 seam | scope as a tagged slice (blocked on DB-8) |
| 26 | `task_group_note` 6th page type present in `PageType` | backend | ✅ aligned (resolved) | `types/note.ts:13-20` (Interp-Gate verified all 6) — Doc-Gate nit N3/U-2 closed | none |

## Bucket tally (exhaustive sweep)

- ✅ **aligned:** 1–4, 6–11, 26 (13 items) — the merged/gated backend + committed/gated data plane. **Nothing wrong.**
- ❌ **wrong:** **0** — the entity was built through §XXVI gates; the only wrong claim was in the *docs* (macOS
  line), already killed at the Documentation Gate. Honest empty bucket.
- 📄 **undocumented/stale:** 21 (stale migration comments), 22 (front matter — in progress), 23 (track lens-sets → **AUTHOR** as S2/S3, the bookend proper spec — Victor).
- 🕳 **gap:** 5 (G6 merge → ②d), 20 (**backend** vault-hoist), 24 (②d), 25 (②e).
- ⛔ **ungated-owed:** 12–17 — the ②b + ②c surface, built but the **real-browser Visual Gate never ran**. THE core debt.
- 🟡 **uncommitted** (layered): 9, 14, 15, 16, 17, 18, 19 — ②c + both bug fixes + the two ②a/②b fix touches.

## Dry-pass assertion

The sweep covered every plane × layer of `baseline.md §1` (① service ×4 · ②a data ×6 · ②b ×3 · ②c ×3 · shared
fixes ×2 · backend hoist · docs ×2 · gaps ×2 · the resolved nit) — a second pass over the inventory + the
interpretation surfaced **zero new items**. Exit condition met: **DRY**. Nothing left behind.

**Routing (feeds Step 5):** every ⛔/🕳/📄/🟡 becomes a scoped, **tagged** slice in `slice-map.md` — frontend
slices → ░Visual Gate░, backend/shared → ░Verification Gate░, doc-only → a plain edit. The single biggest lever:
one combined **②b+②c real-browser Visual Gate** clears ⛔ 12–17 at once and unblocks the 🟡 commit of ②c + fixes.
