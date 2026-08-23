<!-- ui-ux/slice-map.md — Track B · §6 lens 5. Ordered frontend sub-units + per-slice Visual-Gate ledger.
     Mirrors the delivery/slice-map frontend slices. Born 2026-08-22 (recovery). -->

# Frontend slice map — Notes & Pages (Track B)

Visual Gate = real browser (Brave/chrome-devtools MCP), every state × {light | dark-token} × {375·768·1440} +
§XIV a11y + `/component-audit` + `victor:quality-gate-components`/`-engineering` + `victor:verification`,
screenshots as evidence → PASS before the next. **No batching, no "owed."** `[FACT: entity-delivery-flow/_index.md §6]`

| Slice | Scope | Status | Visual Gate |
|-------|-------|--------|-------------|
| ②b `/notes` collection | route · List/Gallery/Neural · switcher · NoteCard · ⌘K create | ✅ BUILT + committed | **⛔ OWED → S4** (jsdom render tests are the unit-level proof; the real-browser gate never ran) |
| ②c editor + autosave + `[[` picker | `note/$id` mount · title · save indicator · autosave · wiki picker | ✅ BUILT · uncommitted | **⛔ OWED → S4** (combined with ②b; live create→edit→autosave verified post the 2 fixes) |
| ②d panels + metadata | backlink/entity-link panels · favorite/archive/icon/cover · G6 merge decision (U-1) | 🕳 gap | ░Visual Gate░ (S7) — own §XXVI gate |
| ②e search | FTS5 search UI over the DB-8 seam | 🕳 gap · blocked DB-8 | ░Visual Gate░ (S8) — after DB-8 |

## S4 — the owed combined ②b+②c Visual Gate (the core debt) — 🔍 **DRIVE COMPLETE · awaiting Victor's review** (2026-08-22, Brave/chrome-devtools MCP)

Drives the full `screens.md` state matrix. Preconditions met: Vite dev on Node 20; live in Brave. **The Visual
Gate is not PASS until Victor reviews the captured evidence and approves** — the drive + self-check below is the
input to that review, not the verdict.

**Drive result (clean).** States driven × breakpoints, console clean throughout (one benign `[info]` toast-cap log):
- **1440:** `/notes` empty · ⌘K command list + "New note" create · **editor mounts on a fresh empty-doc note**
  (empty-doc fix live) · **createPage/createPageLink writes succeed** (vault fix live) · autosave "Saved" ·
  `[[` picker (open → query → "+ Create" create-on-miss → WL-2b two-write → `wikiLink` mark applied with real
  `targetPageId`) · success-list (2 cards) · Gallery · Graph "No connections yet." (NC-5) · not-found "Note not
  found." (EM-9).
- **375:** List full-width cards + dock→hamburger + global-bar condensed (Search + More) · editor toolbar wraps.
- **768:** List + dock rail mode + full global bar.
- **a11y:** picker combobox/listbox/option ARIA (host flips `role=combobox aria-expanded` on `[[`) · `role=status`
  save indicator · named toolbar buttons + disabled states · editor `aria-labelledby` title · switcher
  `aria-pressed` · NoteCard buttons w/ `aria-label`.

**Evidence:** `docs/specs/fixes/{vault-not-initialized-on-boot,editor-empty-doc-assert-crash}/visual-gate-*.png`
(empty · list 1440/375/768 · gallery · editor-mounts · wiki-picker-open · editor-375).

**No ②b/②c findings.** (A live observation — typing "New note" in ⌘K hits the DB-8 search stub rather than
filtering to the command — was checked against the owning doc and is **not a finding**: the command bar's
two-mode model is UX-2-owned (`docs/core/architecture/command-bar-and-search.md §2:20-27` — empty query =
Command mode / ranked list; non-empty = Search mode; M1.0 search = `search-unavailable` stub). The ②b empty-state
hint correctly points to the ⌘K Command-mode create affordance; it does not promise typing. No ②b copy change.
`[FACT: command-bar-and-search.md §2; memory visual-gate-cross-unit-finding-check-owning-doc]`)
- **INFO:** one benign `[vida/ui] Toast: max 3 visible per region` info log (the UI-1 toast cap, not an error).

⇒ On Victor's review-approval, **S4 clears ⛔ ledger #12–#17** and unblocks S5 (commit ②c + both fixes).
`[FACT: ../delivery/slice-map.md S4]`

## Currency (end bookend)

After S4 (②b/②c), S7 (②d), S8 (②e) each land, refresh this `ui-ux/` set + `../current-*` against what shipped
(§XXIX). Authoring (now) + refresh (each track close) = nothing lost.
