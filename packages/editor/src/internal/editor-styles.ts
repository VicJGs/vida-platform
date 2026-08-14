// E1 (UI-3) — injected CSS for <VidaEditor>. The focusable element is the inner ProseMirror contenteditable
// (`.ProseMirror`), which a Tamagui styled frame can't reach as style props — so, like @vida/ui's input-styles.ts,
// we deliver these as the DOCUMENTED mechanism with REAL, theme-switching vars (no hardcoded hex). Appended to
// document.head after Tamagui's sheet so equal-specificity ties fall to us by source order. Idempotent, browser-only.
//
// 1) FOCUS RING = `:focus-visible`, applied to the FRAME (components §VIII:155 — keyboard focus, pointer-suppressed).
//    The frame is never itself focused (focus lands on `.ProseMirror`), so we lift the ring to the frame via
//    `.vida-editor-frame:has(.ProseMirror:focus-visible)` — the §VIII pure-CSS pattern (the input.tsx precedent).
//    Colour reads the base semantic var `--colorFocusRing` (emitted globally, probe-verified switching light｜dark).
// 2) PLACEHOLDER. @tiptap/extension-placeholder marks the empty node `.is-editor-empty` + `data-placeholder`, but
//    ships NO CSS — the consumer renders it via `::before`. Colour reads `--colorTextMuted` (a BASE semantic token,
//    emitted on every theme) — NOT `--placeholder`, which is a SUB-THEME-only var (light_Input.placeholder) absent
//    on the editor's unnamed frame (the "cite tokens from emitted output" lesson).
// 3) The ProseMirror host drops its native contenteditable outline (the ring is on the frame) and gets sane wrapping
//    + a min body height so the empty editor is clickable. `[contenteditable="false"]` (editable=false) → default cursor.
//
// E5 (integration blocks) — ONE rule: block RHYTHM (vertical margin) for the placeholder node-view wrapper, matching
// the em-based spacing every other block gets here. The card's own visual styling is Tamagui tokens (BR-E5-4); only
// the inter-block gap lives in this layer, same as table/callout/image/hr.
//
// E2 (standard blocks) — chrome for taskList / table / callout / image / codeBlock / divider (BR-E2-7). Same rules:
// COLORS are Tamagui theme vars only (no raw hex/rgb); subtle tints are derived FROM a token via `color-mix(… ,
// transparent)`, never a hardcoded colour. No motion is added (B12-trivially clean). Raw px dims follow the E1
// precedent (dimensions aren't tokenised in this injected layer; only colours are).
//   ⚠ Accents use BASE semantic vars — `--colorBrandPrimary` (info), `--colorSignalSuccess` (success),
//   `--colorSignalDanger` (danger) — the same vars the `_Toast` sub-theme's `accent*` keys ALIAS. We must NOT use
//   `--accentInfo/--accentSuccess/--accentDanger`: those exist ONLY inside the `.t_*_Toast` sub-theme scope and
//   resolve to NOTHING on the editor's unnamed base-scope frame (the E1 `--placeholder` trap again — "cite tokens
//   from emitted output"). BR-E2-6's 3 variants map to these 3 base vars (no `warn`).

let injected = false

export function ensureEditorStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-editor', '')
  style.textContent = [
    // 3) editable host — no native outline, wrap long content, clickable empty body.
    '.vida-editor-frame .ProseMirror{outline:none;white-space:pre-wrap;word-break:break-word;min-height:1.5em}',
    '.vida-editor-frame .ProseMirror[contenteditable="false"]{cursor:default}',
    // 1) focus-visible ring on the frame (2px, 2px offset — §VIII).
    '.vida-editor-frame:has(.ProseMirror:focus-visible){outline:2px solid var(--colorFocusRing);outline-offset:2px}',
    // 2) placeholder — muted, theme-switching. opacity:1 defeats Firefox's default placeholder opacity.
    '.vida-editor-frame .ProseMirror p.is-editor-empty:first-child::before{' +
      'color:var(--colorTextMuted);content:attr(data-placeholder);float:left;height:0;pointer-events:none;opacity:1}',

    // ── E2 standard blocks ──────────────────────────────────────────────────────────────────────
    // taskList — unstyled list turned into a checkbox column; native checkbox tinted with the info accent.
    '.vida-editor-frame ul[data-type="taskList"]{list-style:none;margin-left:0;padding-left:0}',
    '.vida-editor-frame ul[data-type="taskList"] li{display:flex;align-items:flex-start;gap:0.5em}',
    '.vida-editor-frame ul[data-type="taskList"] li>label{margin-top:0.15em;user-select:none}',
    '.vida-editor-frame ul[data-type="taskList"] li>div{flex:1 1 auto}',
    '.vida-editor-frame ul[data-type="taskList"] input[type="checkbox"]{accent-color:var(--colorBrandPrimary);cursor:pointer}',
    // table — collapsed borders from the border token; header fill from surface-secondary; selected-cell tint.
    '.vida-editor-frame table{border-collapse:collapse;table-layout:fixed;width:100%;margin:0.5em 0}',
    '.vida-editor-frame table td,.vida-editor-frame table th{' +
      'border:1px solid var(--colorBorderDefault);padding:0.375em 0.5em;vertical-align:top;min-width:3em}',
    '.vida-editor-frame table th{background:var(--colorSurfaceSecondary);font-weight:600;text-align:left}',
    '.vida-editor-frame table .selectedCell{background:color-mix(in srgb,var(--colorBrandPrimary) 12%,transparent)}',
    // image — fit the frame; selected node ring in the info accent.
    '.vida-editor-frame .ProseMirror img{max-width:100%;height:auto;display:block;margin:0.25em 0}',
    '.vida-editor-frame .ProseMirror img.ProseMirror-selectednode{outline:2px solid var(--colorBrandPrimary);outline-offset:2px}',
    // callout — left accent bar + subtle same-accent tint; variant swaps the accent token (info default).
    '.vida-editor-frame .vida-callout{' +
      'border-left:3px solid var(--colorBrandPrimary);background:color-mix(in srgb,var(--colorBrandPrimary) 8%,transparent);' +
      'border-radius:6px;padding:0.5em 0.75em;margin:0.5em 0}',
    '.vida-editor-frame .vida-callout[data-variant="success"]{' +
      'border-left-color:var(--colorSignalSuccess);background:color-mix(in srgb,var(--colorSignalSuccess) 8%,transparent)}',
    '.vida-editor-frame .vida-callout[data-variant="danger"]{' +
      'border-left-color:var(--colorSignalDanger);background:color-mix(in srgb,var(--colorSignalDanger) 8%,transparent)}',
    // codeBlock (StarterKit, BR-E2-8 style-only) + divider — themed from surface/border tokens.
    '.vida-editor-frame .ProseMirror pre{' +
      'background:var(--colorSurfaceSecondary);border-radius:6px;padding:0.6em 0.8em;overflow-x:auto;white-space:pre}',
    '.vida-editor-frame .ProseMirror pre code{' +
      'background:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.9em}',
    '.vida-editor-frame .ProseMirror hr{border:none;border-top:1px solid var(--colorBorderDefault);margin:0.75em 0}',

    // ── E5 integration blocks ───────────────────────────────────────────────────────────────────
    // Block RHYTHM only (the same em-based spacing table/callout/image/hr get here) — the card's own visual styling
    // (bg/border/text) is Tamagui tokens inside the node-view (BR-E5-4). Without this the NodeViewWrapper (a plain
    // block div, no default margin) makes consecutive placeholders touch top-and-bottom. Matches the callout rhythm.
    '.vida-editor-frame .vida-integration-block{margin:0.5em 0}',
  ].join('')
  document.head.appendChild(style)
}
