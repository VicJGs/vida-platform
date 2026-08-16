# Session: 2026-08-16 — ui-4-app-shell-components

Task initialized. Goal: compose the web app-shell chrome (module dock/sidebar · top-bar · command-bar host ·
content `<Outlet/>` · modal/overlay host) in `apps/web/src`, rendering+wiring the UX-2/UX-3/UX-5 models on
UI-1 primitives. Starting from the Aug-1 planned stub (superseded).

## Head verification (this session, before opening the task)
Per Victor's steer — verified the next issue from the authoritative docs, not memory/TASKS.md:
- Walked `reconstructed-structure.md` `#` order against **git-confirmed** done-status (glyphs lag by design).
- First not-done · non-stream · all-blockers-done · not sub-wave-gated issue = **UI-4 (#30)**.
- UX-6 (#26) excluded by the `-d needs -c` sub-wave gate (renders in this shell → needs UI-4).
- Doc `#`-order + sub-wave gate + `tracker --next` all converge on UI-4. Profile = new-feature (delivery-plan row).
- Side-catch: UX-2 (#22) was shipped (PR #9 `299f452`) but omitted from the Completed index + left unarchived →
  fixed (ticked checklist, `git mv` to archive, backfilled `_index.md` row) so the `#`-walk is readable again.

## Next step
Run the New Feature loop: Step 0 document-context BASELINE (current-* of the contexts to touch) → PLAN via
/documentation-component (author spec §2–§6) → critique → preflight → Per-Step Build Gate (§XXVI).
