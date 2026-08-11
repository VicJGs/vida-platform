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
  ].join('')
  document.head.appendChild(style)
}
