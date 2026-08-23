<!-- delivery/baseline.md — Entity Delivery Flow · Phase 1 (BASELINE), recovery variant.
     One consolidated map of Notes & Pages across BOTH planes (service + data + UI), from docs AND the built
     code. Organizes; asserts nothing to gate (§4.5). Feeds the ░Documentation Gate░ (Step 1). Born 2026-08-22. -->

# Baseline — Notes & Pages (recovery variant, ratify mode)

**Scope.** MOD-notes (LIF-131, M1.1 hub). ①/②a–②e split is **doc-fixed** (`current-spec.md:9`,
`m1.1-delivery-plan.md §9`) → **ratify mode**: this baseline records what exists, it does not re-decide.
Branch: `mod-notes-2a-data-plane` (unpushed). No-Guessing: every row cited or flagged `UNKNOWN`.

## 1. Plane map — what Notes is, across both planes

| Plane | Layer | Home | Status |
|-------|-------|------|--------|
| ① backend | `NotesService` (pages/links/attachments/tag-reads + AR-6/AR-8 facades) | `packages/core/src/services/notes/{service,types,index}.ts` | BUILT + MERGED (`①`) |
| ① backend | validators (`createPageSchema`/`updatePageSchema`) | `packages/core/src/validators/note.ts` | BUILT + MERGED |
| ① backend | Row-type barrel (`PageRow`/`PageLinkRow`/`NoteAttachmentRow`) | `packages/core/src/index.ts:135-141` | BUILT + MERGED |
| ②a data | worker `values` op + client `driver.values` RPC | `apps/web/src/db/worker.ts:98-105`, `client.ts:156` | BUILT + committed (`6b72613`) |
| ②a data | `getDb()` + DP-8 whole-txn mutex | `apps/web/src/db/drizzle.ts:35-61` | BUILT + committed |
| ②a data | device-id (`app_state` UUIDv7, never synced) | `apps/web/src/db/device-id.ts` | BUILT + committed |
| ②a data | boot (`initVault()` + open + device-id) | `apps/web/src/db/boot.ts:58-59` | BUILT; **fix uncommitted** |
| ②a data | `getNotesService()` accessor | `apps/web/src/services/notes-service.ts:29-38` | BUILT + committed |
| ②a data | React-Query hooks (reads + mutations + invalidation matrix) | `apps/web/src/app/notes/hooks.ts` | BUILT + committed |
| ②b surface | `/notes` route (List/Gallery/Neural multi-mode) | `apps/web/src/app/notes/index.tsx` | BUILT + committed (`21f5e3b`) |
| ②b surface | `NoteCard`, `view-switcher`, `commands.ts` (⌘K "New note") | `apps/web/src/app/notes/{note-card,view-switcher,commands}.tsx/.ts` | BUILT; commands.ts **fix uncommitted** |
| ②c surface | note editor mount + title + save indicator | `apps/web/src/app/note-detail.tsx` | BUILT; **uncommitted** |
| ②c surface | autosave hook (debounce · skip-echo · flush-on-unmount) | `apps/web/src/app/notes/use-note-autosave.ts` | BUILT; **uncommitted (new file)** |
| ②c editor | `wikiLink` mark + Suggestion + popup + emit-only markdown | `packages/editor/src/extensions/wiki-link.ts`, `wiki-link-menu.tsx`, `serializers/to-markdown.ts`, `editor.tsx` | BUILT; **uncommitted** (`@vida/editor` v0.9.0) |
| ②d surface | backlink/entity-link panels + page metadata | — | 🕳 NOT built |
| ②e surface | FTS5 search UI (over DB-8 seam) | — | 🕳 NOT built |

## 2. The seam (①→②) — the service API the UI consumes

`createNotesService(db, deviceId, { spaces, backlinks, registry }) → NotesService`, returns Drizzle **Rows**.
23 methods: pages CRUD (6 types) · page-links (idempotent) · `resolveWikiLink` · `ensureEntityNote` (NP-8) ·
attachments · entity-link/tag facades (→ AR-6 write / AR-8 read) · entity_tags reads.
Consumed in the browser via `getNotesService()` over `getDb()` (worker RPC, **no HTTP**) — `notes-service.ts`.
`[FACT: current-spec.md:14-37, service.ts]`

## 3. Documentation corpus state (the yardstick the sweep will judge against)

| Doc | Date | Role |
|-----|------|------|
| `identity.md` · `structure-data.md` · `business-rules.md` · `contract.md` · `conventions.md` | Jul 25 (design) | INTENDED authority (stable) |
| `current-spec.md` | Aug 21 | SHIPPED-slice record (①·②a·②b·②c) |
| `current-business-rules.md` | Aug 22 | ENFORCED-rules record (NP-*, DP-*, EM-*, WL-*) |

**Candidate Documentation-Gate finding (flagged, not yet judged):** `current-spec.md:101,118` +
`current-business-rules.md:74` state *"real-browser Visual Gate + /component-audit owed (CI/macOS-13+); this
host is macOS 12."* TASKS.md:9 records that macOS-12/CI-only framing as a **purged hallucination** — the Visual
Gate runs **locally in Brave** (the vault + empty-doc bugs were verified live there via chrome-devtools MCP,
2026-08-22). The docs still carry the retracted claim → **stale yardstick**. Route to Step 1.
`[FACT: current-spec.md:101,118; current-business-rules.md:74; TASKS.md:9; docs/specs/fixes/*/after-fix-*.png]`

> **RESOLVED at ░Documentation Gate░ (Step 1, 2026-08-22).** Independent critic verdict REVISE → 2 blockers:
> **B1** the stale macOS/CI Visual-Gate claim (this finding) and **B2** the Node-22 re-run caveat missing from
> current-*. Both folded: current-spec.md + current-business-rules.md now state the Visual Gate runs locally in
> Brave + carry the Node-22 caveat. Nit N1 (stale Status dates) also fixed. Gate now **PASS** — the corpus is a
> trustworthy yardstick. Nits N2/N3 carried into the reconciliation sweep (§ below) as spot-checks.

## 4. Uncommitted surface (git working tree — the "left behind" risk this recovery pays down)

- **Modified, uncommitted:** `note-detail.tsx` · `notes/commands.ts` · `db/boot.ts` · `db/CLAUDE.md` ·
  `packages/editor/src/{editor,index,serializers/to-markdown}.ts` + `editor.test.tsx` · both current-* docs ·
  `apps/web/package.json` + `packages/editor/package.json` + `pnpm-lock.yaml`.
- **New, untracked:** `use-note-autosave.ts` · `note-detail.test.tsx` · `use-note-autosave.test.ts` ·
  `db/boot.test.ts` · `extensions/wiki-link.ts` + `.test.ts` · `wiki-link-menu.tsx` ·
  `.claude/tasks/core-vault-init-on-db-open.md` · 3 `docs/specs/fixes/*` dirs · 2 session logs · 3 `sessions/*` PLANs.
- ⇒ **②c code + both bug fixes are entirely uncommitted**; they bundle with the owed Visual Gate result.
  `[FACT: git status --short]`

## 5. Two shipped bug fixes (both uncommitted, both documented)

1. **`vault-not-initialized-on-boot`** — `apps/web` never called `initVault()`; every repository WRITE computes a
   keyless `_sync_hash` via `hashContent()` → `assertReady()` needs libsodium WASM loaded, independent of `[E]`.
   Fix: `boot.ts:58` `Promise.all([initVault(), open])` + `commands.ts:34` error-log + `boot.test.ts`.
   Verified live in Brave. `[FACT: docs/specs/fixes/vault-not-initialized-on-boot/_index.md]`
2. **`editor-empty-doc-assert-crash`** — ProseMirror omits `content` on an empty doc → `{type:'doc'}`;
   `assertEditorDocument` rejected it. Fix: normalize missing `content`→`[]` in `editor.tsx` + tests + dist.
   Verified live. `[FACT: docs/specs/fixes/editor-empty-doc-assert-crash/_index.md]`

## 6. Spun-out backend work (the cross-plane row the old single-plane recovery would strand)

- **`core-vault-init-on-db-open`** (`.claude/tasks/core-vault-init-on-db-open.md`, PLANNED) — hoist
  `initVault()`/libsodium-readiness into `@vida/core`'s DB-open path so every platform gets crypto ready before
  any repository write (mobile/desktop would else hit the same bug). **A backend slice** — routes to the
  Verification Gate, not the Visual Gate. `[FACT: TASKS.md:11]`

## 7. Verification-environment fact (carry into every gate)

Node 22 is required for the jsdom Vitest suites (`.nvmrc`=22; only v20.20.2 installed locally → jsdom/undici
load error). `nvm install 22` to run them. Vite dev + the real-browser Visual Gate run fine on 20.
`[FACT: TASKS.md:9]`

## 8. What this baseline asserts

Nothing to *gate* here (baseline only organizes — §4.5). It hands the ░Documentation Gate░ (Step 1): the corpus
above + §3's flagged stale-yardstick candidate. Downstream, the interpretation layer (Step 2) reads the
now-trusted corpus + the built code to surface implicit deps/needs; the reconciliation (Step 4) sweeps §1's
plane map row-by-row, tagged {backend|frontend|shared}.
