# Envision — Notes & Pages · RESCOPE (notes-rescope, LIF-245)

> Entity Delivery Flow §3.75, recovery variant (Step 3.5). The entity already carries **EC-1…24** from fe-notes #27
> (`docs/specs/foundation/fe-notes-and-pages/delivery/envision.md`, incl. its 2026-10-26 Re-pins: EC-1, EC-10, EC-18a →
> journals-rescope). This gate envisions the **affordances the rescope adds** that no shipped surface answers, and pins them
> as **EC-25…** in the same set. Trigger test = YES (interpretation.md §5 carries: rename · Trash · attachment upload ·
> icon/cover pickers · `[[` token + hover preview · template entry · note Overview).

## Greybox
Throwaway harness (deleted after the gate): `apps/web/envision.html` + `apps/web/src/__envision__/{main,notes-greybox}.tsx` —
real `@vida/ui` primitives (CollectionView · EntityView · SyncStatus · HonestProgress · Menu · Popover · Dialog · toast) +
the shipped presentational notes views (renderNotesView · AttachmentsView · BacklinksView · SummaryView · TemplatePickerView ·
PreviewCard · NotesSearchView · CoverBanner) over fake data; controls for preset × light/dark × collection state × rename
style × page content. Deleted after approval; evidence: `envision-evidence/*.png`.
Screens: `/notes` collection (P-1) · note page tabbed Overview/Note + merged (P-2…P-6) · Trash (P-7) · malformed-content state.

## Anchored checkpoints
| EC | Screen / state | Assertion (the vision) | Type | Gate assertion |
|----|----------------|------------------------|------|----------------|
| EC-25 | note page · rename | **both** (Victor 2026-10-26): click the title to edit it in place (Enter/blur saves) **and** ⋯ menu → "Rename" opens a small dialog; both write the same title | structural | Visual-Gate MUST |
| EC-26 | note page · delete | ⋯ → "Move to Trash" (danger) → toast "Moved to Trash" with **Undo**; the page shows "This page is in Trash … 30 days" + Restore | structural + feel (undo) | MUST · live (feel) |
| EC-27 | Trash | **one OS-wide Trash** (Victor 2026-10-26) — a system surface in the shell, items grouped by source module (Notes is the first contributor; other modules join as they ship delete); each row: title · deleted-ago · days left · **Restore** (one click) · **Delete forever**; **Empty Trash**; both permanent actions ask first in a danger dialog that says it can't be undone | structural | MUST |
| EC-28 | Trash · restore conflict | restoring a journal whose date already has one shows an inline typed message; nothing is overwritten (NP-2) | structural | MUST |
| EC-29 | note Overview · metadata | "Change icon" = a Lucide icon grid (no emoji, EC-22); "Add/Change cover" = paste an image link · use an attachment · remove; Favorite / Archive reflect state (EC-7) | structural | MUST |
| EC-30 | note Overview · attachments | a drop zone + "choose files"; honest progress while adding; a too-large file gets a message naming the file and the limit | structural | MUST |
| EC-31 | editor · `[[` | an inline link token = type icon + underlined title; hover/focus shows the preview card (EC-11); the picker groups candidates by type (Notes · Tasks · Projects · People …) with an explicit "Create note '…'" (EC-10 re-pin) | structural + feel | MUST · live (feel) |
| EC-32 | editor · inline blocks | **every block is a widget inside the page** (Victor 2026-10-26; ADR-008 L15-19,66-80,142-143): a card with a header saying what it is, a live body with its own loading/empty/error/success, and actions (e.g. "Open project", "Open journal"); entity-backed blocks write only through the owning module's API. `/summary`, `/entity-link`, `/backlink` and `/task` have real bodies here; a block whose module can't serve it yet says so plainly — never a dead box | structural | MUST |
| EC-36 | editor · `/task` | `/task <text>` offers **"Create task '<text>'"** (creates the task — its task page comes with it, NOT-13) or **link an existing task**; either way the widget is a checkbox row bound to that task page, ticking it completes the task through Tasks (`completeTask`), and "Open task page" goes to it. Other entity blocks (`/habits`, `/milestone`, `/events`, `/classes`) follow the same create-or-bind widget pattern | structural + feel | MUST · live (feel) |
| EC-33 | note page · unreadable content | the editor is replaced by a read-only notice ("This page can't be opened for editing … nothing will be overwritten") + "Export a copy" | structural | MUST |
| EC-34 | note page · save status | one status, "Saved on this device", sits beside the ⋯ menu (SyncStatus); no second announcement | structural | MUST |
| EC-13 (re-pin) | templates | **templates are entity-based** (Victor 2026-10-26; ADR-009 L15-17,46-47 — a bundle seeds entities of any module): "New from template" lists templates grouped by entity type (Pages · Project · Task · Routine …), each marked Shipped or Yours with what it creates; "Use template" forks new items and opens the first; an entity type whose module can't create from templates yet seeds what it can and says what's pending (ADR-009 L108-110); "Save as template" keeps authored structure + live blocks, never accumulated content | structural | MUST |
| EC-35 | `/notes` header | New note · New from template (dialog → creates new items and opens the first) · Show archived; layouts List · Gallery · Graph (EC-1 re-pin) | structural | MUST |

Inherited and carried to the live close (ELC-9): EC-1 (re-pinned) · EC-3 · EC-4 · EC-5 · EC-6 · EC-7 · EC-8 · EC-9 · EC-10
(re-pinned) · EC-11 · EC-12 · EC-13 · EC-14 · EC-15 · EC-16 · EC-17 · EC-18/18f · EC-19 · EC-22 · EC-23 · EC-24; EC-18a →
journals-rescope; EC-18b–e/20/21 → fe-tasks · fe-projects.

## Grounded changes (Victor, 2026-10-26)
- **Graph:** the graph lands with **HARD-3 (LIF-114, M1.4, order #118)** for both the `/notes` Graph layout and the OS-wide
  `/graph` (`.claude/tasks/hard-3-graph-backlinks.md:2-12`; `reconstructed-structure.md:242`; `coverage-report.md:30,44,90`).
  notes-rescope (#62, M1.2.4) keeps Graph as a layout with the honest "being prepared" state (EC-3, BSE-24) and builds no
  graph data; it lights up when HARD-3 closes (`golive-replan/process.md:89-92`).
- **Templates are entity-based** → EC-13 re-pinned above. Ownership (Step 5): notes-rescope builds the instantiate/capture
  engine + the `pages` writer (`debt-plan.md:22`); each module registers its own create-from-template writer for its entity
  types (`docs/features/templates/delivery/interpretation.md:15-22,108-111`; XCU-05). `capability-framework.md:239` gains
  Projects + Notes pages on the "can be saved as a template" row.
- **Blocks are widgets; `/task` creates or binds** → EC-32 rewritten, EC-36 added. ADR-008 L145-146 leaves each block's
  interaction spec to build time — Victor's statement is that spec. Ownership of the `/task` (and `/habits`) body is a Step 5
  item: the extension catalog says "MOD-tasks" (closed, backend-only); Tasks + Habits services are already composed
  (`composition-root.ts:101-102`).

## Picks (Victor, 2026-10-26)
- **EC-25 rename:** both — inline title + ⋯ "Rename".
- **EC-27 Trash:** one OS-wide Trash. Consequence (carried to Step 4/5): a new **system surface** (shell entry + IA/surface-map
  row, `information-architecture.md:97-107` lists the global surfaces) and a cross-module **deleted-items read seam** each
  module contributes to; notes-rescope is its first consumer ("each engine is wired in the closing slice of its first
  consuming entity", `golive-replan/process.md:107-108`).

## Approval
**Greybox + checkpoints EC-25…EC-36 (incl. the EC-13 re-pin) APPROVED by Victor on 2026-10-26.** Reconciliation (Step 4)
follows. The greybox harness was deleted after the gate (method §3.75); screenshots kept in `envision-evidence/`
(an early capture `g-1440.png` predates the rename/Trash/template/widget revisions — the later shots show them).
