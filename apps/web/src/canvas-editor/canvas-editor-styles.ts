// fe-codec-canvas-editor (#7) · S2 — injected CSS for the notebook PAGE's writing presentation. A Tamagui
// styled(View) can't reach the inner `.ProseMirror` child selectors (block rhythm), so — like @vida/ui's
// editor-styles / the shell-panel-styles precedent — we deliver it as a scoped, idempotent, browser-only sheet.
//
// SCOPE: everything is under `.vida-canvas-editor-page` so it touches ONLY the editor hosted in THIS canvas —
// never other VidaEditor mounts (inline/compact). This is the HOST presentation layer (EC-11 writing feel):
// the writing font-SIZE + inter-block rhythm. Color + base line-height are S1's (editor-styles, EC-7) — NOT
// repeated here. Font-family rides the preset var (--vida-font-body), so the voice swaps with the theme.
let injected = false

export function ensureCanvasEditorStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-canvas-editor', '')
  style.textContent = [
    // Writing-grade body size + the preset serif voice (color + line-height come from @vida/editor S1).
    ".vida-canvas-editor-page .vida-editor-frame .ProseMirror{font-size:18px;font-family:var(--vida-font-body,'Spectral',Georgia,serif)}",
    // Inter-block rhythm — airy page spacing (Tamagui can't express `> *` child selectors).
    '.vida-canvas-editor-page .vida-editor-frame .ProseMirror>*{margin-top:0;margin-bottom:0.85em}',
    '.vida-canvas-editor-page .vida-editor-frame .ProseMirror>h2{margin-top:1.5em;font-size:1.4em}',
    '.vida-canvas-editor-page .vida-editor-frame .ProseMirror>h1{margin-top:1.5em;font-size:1.7em}',
  ].join('')
  document.head.appendChild(style)
}
