<!-- ui-ux/ux.md — Track B · §6 lens 3. Interaction states · a11y (§XIV) · responsive (§X) · motion (§IX) ·
     copy. This lens is the a11y/responsive checklist the S4 Visual Gate enforces. Born 2026-08-22 (recovery). -->

# UX — interaction · a11y · responsive · motion · copy

## Accessibility (§XIV) — the S4 a11y sweep checklist

| Surface | Requirement | Cite |
|---------|-------------|------|
| editor | `aria-labelledby` = the title `Input`'s id (EM-5 accessible name) | `note-detail.tsx:132-137` |
| title | `aria-label="Page title"` + label id | `note-detail.tsx:118-131` |
| `[[` picker | host `role=combobox` (`wikiComboboxAttrs`), popup `role=listbox` + `role=option`, `aria-activedescendant` tracks selection, roving ↑/↓, Enter selects, Esc/Tab close | `wiki-link.ts:114-118`; `wiki-link-menu.tsx:74-172` |
| `NoteCard` | interactive `Card` + `aria-label` on the card root | `note-card.tsx:27` |
| view-switcher | `role=group` "Notes view" + `aria-pressed` toggle buttons | `view-switcher.tsx:17-39` |
| save indicator | `role=status` (polite live region) | `current-business-rules.md` EM-7 |

Focus-visible ring (§VIII) inherited from the composed UI-1 primitives. WCAG AA contrast — token-driven.

## Responsive (§X) — 375 · 768 · 1440

- `/notes`: List/Gallery reflow via the UI-2 view spine; switcher stays reachable. Touch targets ≥ 44×44 at 375.
- `note/$id`: title + editor + status bar stack; editor fills the content region. Content max-width per shell.
- `[[` popup: positioned near the caret; must stay within viewport at 375.

*(Exact per-breakpoint layout is validated live in S4 — this lens states the requirement; the Visual Gate is the proof.)*

## Motion (§IX)

Minimal — the picker open/close + save-indicator transitions inherit UI-1/UI-2 motion tokens (duration/easing).
No bespoke animation in ②b/②c. Reduced-motion honored via the token layer. `[FACT: standards/motion.md §IX]`

## Copy

- empty `/notes`: "No notes yet" + a ⌘K creation hint.
- `note/$id`: not-found → "Note not found."; error → "Couldn't load this note."; save → "Saved" / "Saving…" /
  "Save failed".
- `[[` create row: "+ Create '\<query\>'".
`[FACT: index.tsx:66-77; note-detail.tsx; wiki-link-menu.tsx]`

## Dark (M1.0)

Token-only (zero hex) → dark-capable, but the app is **light-only** at M1.0 (no theme store) → the S4 "dark"
pass is a **token audit** (no rendered dark). `[FACT: current-spec.md:70; memory apps-web-is-the-first-vida-ui-consumer]`
