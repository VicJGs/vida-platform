# Spec: component:ui-2-platform-views · V6 — export-dialog

<!-- type: component (unit sub-spec of ui-2-platform-views) -->

Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md.

## 1. Identity

V6 `export-dialog` — the reusable **export UI**: a modal that picks an export format + emits the export intent. Composes
UI-1 `Dialog` + `Button`. Currently a 0-byte stub. NOT a data-view.

- **The cross-package boundary (the crux — same as V1's `ViewState`).** The **serialization** (TipTap JSON → Markdown/
  PDF/DOCX) lives in `@vida/core`/`@vida/editor`; `@vida/ui` depends on **only Tamagui + date-fns** (NOT `@vida/core`,
  NOT `@vida/types`). So export-dialog is **PRESENTATIONAL**: it renders the format choices + fires **`onExport(format)`**;
  the **app** (which imports the serializers) does the actual export + download. The dialog NEVER imports a serializer.
  `[FACT: packages/ui/package.json deps = Tamagui+date-fns; REPO.md serializers in @vida/editor; ADR-001:100-102]`
- **Format vocabulary.** `ExportFormat = 'md' | 'pdf' | 'docx'` — a **LOCAL union** (the V1 LV-3a precedent: structurally
  identical to `@vida/types` `EXPORT_FORMAT` [editor.ts:49], no cross-package edge; the canon→consumer consolidation
  stays the owed cleanup). `[FACT: @vida/types/src/editor.ts:49 EXPORT_FORMAT=['md','pdf','docx']]`
- **What it is NOT:** NOT the serializer/download (the app's, via `onExport`); NOT per-format options (page size, etc. —
  deferred, §6); NOT a nested Select (a hand-composed inline picker avoids the dialog-portal ⟷ dropdown-portal z-order
  tangle). NOT the export progress engine (the consumer drives `busy`/close).

## 2. Business Rules

- **ED-1 · Composes UI-1 `Dialog` (controlled).** `open` + `onOpenChange` pass to `Dialog` (modal, focus-trap,
  Esc/backdrop dismiss, `role="dialog"`+labelledby all inherited). `title` (default "Export"). ⚠ **The instructional
  copy** (`Export your ${entityLabel ?? 'content'} as:`) is passed as Dialog's **`description` prop** (→
  `aria-describedby`, dialog.tsx:294,301) — NOT as children (gate-2 #3: children get no describedby association).
  `children` = the radiogroup ONLY. `[FACT: dialog.tsx:35-48 open/onOpenChange/title/description/footer/dismissible]`
- **ED-2 · Format picker = a `role="radiogroup"` of the available formats.** `formats?: readonly ExportFormat[]`
  (default `['md','pdf','docx']`, in that order). Each is a `role="radio"` **div** (NOT a native `<input type=radio>` —
  the Menu `role="menuitem"` hand-roll model; so V6 owns ALL keyboard behavior) showing a label + extension (map:
  `md`→"Markdown" `.md` · `pdf`→"PDF" `.pdf` · `docx`→"Word" `.docx`). **WAI-ARIA APG radiogroup — the full key set:**
  **ROVING DOM FOCUS** (the Menu model, NOT Select's `aria-activedescendant`) — only the selected radio is `tabIndex=0`
  (rest `-1`); **↑/← and ↓/→ move focus AND selection together (wrap); Home/End → first/last (focus+select); Space
  selects the focused radio; click selects.** Focus and selection are COUPLED (moving selection moves DOM focus +
  roving tabIndex). Selected format = local state (seed = `defaultFormat` if in `formats`, else `formats[0]` — ED-2b).
  `[FACT: WAI-ARIA APG radiogroup; menu.tsx roving-DOM-focus precedent]`
- **ED-2b · Invariant: a valid checked+tabbable radio ALWAYS exists (gate-2 #4/#5).** Selection is `useState` (sticky,
  seeded `defaultFormat` if valid else `formats[0]`), but the **EFFECTIVE selection is DERIVED each render** —
  `const selected = formats.includes(selState) ? selState : formats[0]` — so a `formats` change that orphans the sticky
  state self-heals to `formats[0]` (no unrendered/un-tabbable selection). Dev-warn on `defaultFormat && !formats.includes(
defaultFormat)` (the card dev-guard precedent) AND on `formats.length === 0` (a degenerate empty picker — the Menu
  empty-items precedent). `[FACT: card.tsx / menu.tsx:185-188 dev-guards]`
- **ED-3 · Actions via Dialog's `footer` PROP (B1 — NOT children).** Dialog has a dedicated `footer?: ReactNode` prop
  (dialog.tsx:42 → a right-aligned `<footer>` that does NOT scroll with the body). Pass
  `footer={<><Button intent="secondary" onPress={()=>onOpenChange(false)}>Cancel</Button><Button intent="primary"
loading={busy} onPress={()=>onExport(selected)}>Export</Button></>}` — Cancel LEFT, Export RIGHT (the dialog.stories
  order + `secondary` cancel, M1). The dialog does NOT auto-close on Export (the consumer closes via `onOpenChange`
  after it resolves). `[FACT: dialog.tsx:42 footer prop; dialog.stories button order/intent; button.tsx loading]`
- **ED-4 · Busy state — reuse Button `loading` + remove radios from the trap (m5 + gate-2 #1).** `busy?: boolean`
  (app-set while exporting) → the **Export Button gets `loading={busy}`** (button.tsx renders the spinner, holds width,
  sets `aria-busy`, suppresses activation — no hand-rolled disabled+relabel); Cancel is `disabled` (native → out of the
  trap). ⚠ \*\*The radios are `role="radio"` DIVS (no native `disabled`), so busy must drop EVERY radio to `tabIndex=-1`
  - `aria-disabled`\*\* — merely dimming leaves the selected radio `tabIndex=0` and thus a focusable-but-inert member of
    Dialog's focus trap (`[tabindex]:not([tabindex="-1"])`, dialog.tsx:53), so a keyboard user could Tab onto a dead
    control mid-export. During busy the only trap focusable is Export (loading, still focusable). `aria-busy` on the body.
    `[FACT: button.tsx:139 loading; dialog.tsx:53 FOCUSABLE selector]`
- **ED-5 · A11y.** Dialog owns the modal a11y (trap/labelledby/Esc + describedby via `description`, ED-1). The radiogroup
  is labelled ("Format"); radios have accessible labels; Export/Cancel are labelled Buttons. **Focus-into lands on the
  selected radio because Dialog focuses `focusables[0]` — the FIRST focusable in DOM order (dialog.tsx:188) — and (a) the
  radiogroup is rendered BEFORE the footer (children precede the `footer` prop, dialog.tsx:307-311) AND (b) roving-tabindex
  makes the selected radio the only tabbable one in the group.** So the radiogroup MUST stay ahead of the footer and no
  radio may be `tabIndex=0` except the selected (m1). `[FACT: dialog.tsx:53,188,307-311]`
- **ED-6 · Tokens / no sub-theme / no new dep / no motion (BR-4/LV-3/LV-6).** Base tokens on unnamed hosts (selected
  radio `$colorBrandPrimary` accent/border, text `$colorTextPrimary`, muted ext `$colorTextMuted`); dimension via the
  token scale (DEF-U8-h). Reuses Dialog's motion; V6 adds none. `[FACT: themes.ts base keys; CLAUDE.md]`

## 3. Contract

```ts
export type ExportFormat = 'md' | 'pdf' | 'docx' // local (LV-3a); ≡ @vida/types EXPORT_FORMAT

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The export intent — the APP wires @vida/core/@vida/editor serialization + download. */
  onExport: (format: ExportFormat) => void
  /** Offered formats, in order. Default ['md','pdf','docx']. */
  formats?: readonly ExportFormat[]
  /** Initially-selected format. Default formats[0]. */
  defaultFormat?: ExportFormat
  /** Dialog title. Default 'Export'. */
  title?: string
  /** What's being exported, for the copy (e.g. 'journal entry' → "Export your journal entry as…"). */
  entityLabel?: string
  /** App-driven: disables actions + shows "Exporting…" while the export runs. */
  busy?: boolean
}
export function ExportDialog(props: ExportDialogProps): ReactElement // NOT generic; controlled via Dialog
```

- 8-state matrix (§VIII): default(open picker) · a format selected/hover/focus(radios) · busy(disabled + "Exporting…") ·
  disabled(n/a) · dark · responsive (the dialog panel scales; a narrow width stacks). Closed = renders nothing (Dialog).
- Sub-theme: none. Export from `index.ts`. `*.test.tsx` + `*.stories.tsx`.

## 4. Acceptance

- [ ] `ExportDialog` renders a `Dialog` (when `open`) with a title, a `role="radiogroup"` of the `formats` (label + ext),
      and Export + Cancel `Button`s.
- [ ] Radiogroup: roving tabindex, arrow-key selection (wrap), Space/click select; selected seeds to `defaultFormat ?? formats[0]`.
- [ ] Export fires `onExport(selectedFormat)`; Cancel fires `onOpenChange(false)`; the dialog does NOT self-close on Export.
- [ ] `busy` → Export `loading`; Cancel `disabled`; **every radio `tabIndex=-1` + `aria-disabled`** (out of the trap, gate-2 #1); body `aria-busy`.
- [ ] Actions render in Dialog's `<footer>` (the `footer` prop), NOT the scrolling body; the copy is Dialog's `description` (aria-describedby).
- [ ] A valid selection always exists: `defaultFormat∉formats` + `formats=[]` dev-warn; a formats-change orphaning the sticky selection self-heals to `formats[0]`.
- [ ] `formats` prop limits/reorders the options; dark mode; the modal a11y (trap/Esc/labelledby) works via Dialog.
- [ ] Storybook: open picker + a format selected + busy, both themes → **component Visual Gate PASS**.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 5. Implementation Prompt (ordered)

1. **Verify the Dialog API** first (`packages/ui/src/components/dialog.tsx`): exact prop names (`open`/`onOpenChange`/
   `title`/`description`/`dismissible`/children) — compose against the REAL contract, not assumed.
2. **Types** — `ExportFormat` local union; `ExportDialogProps`; plain function; a `FORMAT_META` map (label + ext).
3. **State** — `useState` sticky selection (seed guarded: `defaultFormat && formats.includes(defaultFormat) ?
defaultFormat : formats[0]`); **derive `const selected = formats.includes(selState) ? selState : formats[0]` each
   render** (self-heal, ED-2b); dev-warn on `defaultFormat∉formats` AND `formats.length===0`.
4. **Radiogroup** — `role="radiogroup"` + `aria-label="Format"`; each option a `role="radio"` **div** (`aria-checked`;
   roving `tabIndex` = `!busy && fmt===selected ? 0 : -1` [busy → ALL -1, gate-2 #1]; `aria-disabled={busy}`; `onClick`
   select, `onKeyDown` ↑↓←→ wrap + Home/End + Space — focus+selection COUPLED, the Menu roving-DOM-focus model; guarded
   when busy) showing label + muted ext; selected → `$colorBrandPrimary` border/accent.
5. **Compose Dialog** — `<Dialog open={open} onOpenChange={onOpenChange} title={title}` **`description={`Export your
   ${entityLabel ?? 'content'} as:`}`** (gate-2 #3 — NOT children) **`footer={<><Button intent="secondary"
disabled={busy} onPress={()=>onOpenChange(false)}>Cancel</Button><Button intent="primary" loading={busy}
onPress={()=>onExport(selected)}>Export</Button></>}`**`>` — children = the radiogroup ONLY. Verify the exact Dialog
   prop names against dialog.tsx first (§5.1).
6. **Tests** — renders when open (not when closed); radiogroup options = formats; roving + arrow/Home/End selection
   (wrap); Export fires onExport(selected) + does NOT close; Cancel closes; `busy` → Export `loading`/disabled + radios
   disabled; formats prop reorders/limits; `defaultFormat∉formats` dev-warn + fallback; the footer renders in the
   `<footer>` not the body; ref?.
7. **Story** — open with all formats; a controlled wrapper (open state + selection + a fake export toggling busy); both themes.
8. **Export** + CLAUDE.md paragraph.

## 6. Deferred (documented — NOT V6)

Per-format options (PDF page size/orientation, Markdown flavor) · the actual serializer/download (app/@vida/core) ·
multi-select / bulk export · export scope (range/filter) · a preview. **Export FAILURE surface (M3):** `onExport`
returns `void`; on failure the consumer surfaces it via **Toast** (UI-1, the platform's error primitive) + sets
`busy=false` while keeping the dialog open (does NOT call `onOpenChange(false)`) so the user can retry. An in-dialog
`error?` slot is deliberately NOT V6 (Toast is the shipped error surface).

## 7. Change Log

| Date       | Session                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-10 | ui-2-platform-views                       | V6 sub-spec authored at PLAN (presentational export modal: composes UI-1 Dialog+Button, radiogroup format picker, onExport intent; serialization is the app's — the V1 boundary again; local ExportFormat); gate-1 next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-08-10 | ui-2-platform-views                       | Rev 2 — gate-1 critique REVISE→fixed (foundational decisions all validated vs real dialog.tsx): **B1** (actions via Dialog's `footer` PROP, not children — Cancel-left/secondary · Export-right/primary per stories), **M1** (Cancel intent secondary), **M2** (full APG radiogroup keys: +Home/End, roving-DOM-focus [Menu model not Select's activedescendant], focus+selection coupled), **M3** (export-failure → Toast, documented in §6), **M4** (defaultFormat∉formats dev-warn+fallback; sticky selection stated), m1 (focus-into depends on roving-tabindex), m5 (reuse Button `loading` for busy — not hand-rolled)                                                                                                                                                                                            |
| 2026-08-10 | ui-2-platform-views                       | preflight PASSED (Dialog `footer`/`description`/`title`-required + Button `loading` verified in-file). Gate-2 critique **REVISE**→fixed (all 7 gate-1 fixes confirmed correct vs real APIs): **#1 blocker** — busy must drop radios (role=radio DIVS, no native disabled) to `tabIndex=-1`+aria-disabled or they stay in Dialog's trap; **#3** copy → Dialog's `description` prop (aria-describedby), not children; #4/#5 folded into ED-2b invariant (DERIVE effective selection each render + empty-formats dev-warn → self-heals orphan/empty); m1 (focus-into = focusables[0], radiogroup-before-footer ordering). **Approval 2 pending.**                                                                                                                                                                          |
| 2026-10-06 | fe-codec-controls-refinement P2 (LIF-231) | Radio-row aesthetic refinement, logic UNTOUCHED. **Hover state** on `Radio` (`hoverStyle:$colorSurfaceSecondary`, `disabled` cancels it — select.tsx:82 precedent) — closes a §VIII hover gap. **Selected accent moment = a left BAR, not a brand border:** removed `borderColor:brand` from `selected` (border stays neutral); an `aria-hidden` absolute 3px `AccentBar` (`.vida-export-accent`) renders when selected via the Toast precedent (`position:relative`+`overflow:hidden`, no layout shift). Bar + filled `Dot` = sole accent. Title/description = Dialog's (→ P3). §XXVI double-gate + preflight (R2→Toast-bar not borderLeft, no 2px shift) + Visual Gate PASS (3 presets × light/dark: hover bg change · bar flips per preset · AA 4.94–6.53 · axe 0 · 375 fit). tsc 0 · @vida/ui 412 tests · eslint 0. |
