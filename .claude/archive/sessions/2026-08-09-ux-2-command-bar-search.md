# Session: 2026-08-09 — ux-2-command-bar-search

Task initialized. Goal: design the command bar + global search interaction model (⌘K launcher over
`command_bar_history` + search-as-you-type over FTS5), defined over the UX-1 nav model — implemented as
shell components (UI-4) later.

## Context at open
- Head selected by the `#`-order rule (`reconstructed-structure.md:79`, `#22`, ← UX-1 ✅). `--next` said
  UX-3 (#23) by dependent-count → overridden ([[doc-order-authoritative-over-next-heuristic]]).
- Profile: Generic Session → scenario `default` (single-path, document-first build).
- Promoted the pre-existing stub task (LIF-91, M1/M1.0) to in-progress; scaffolded the forward-spec stub at
  `docs/specs/foundation/ux-2-command-bar-search/` (sibling to UX-1's foundation home).

## Step 0 — in progress
- [x] Task link (task file promoted, spec stub, indexes, TASKS.md, session file)
- [ ] document-context BASELINE — current-* ground truth for the contexts UX-2 touches
  (UX-1 nav model · `command_bar_history` / Preferences · FTS5 / DB-8 seam · UI-4 shell). Starting from scratch.

## Next step
Author the baseline (§XXVI.1a) → then PLAN via /documentation-component → critique → preflight (Per-Step Build Gate).
