// Injected CSS for the Input primitive — the two things a CORE styled(View,{render:'input'}) can't express as
// Tamagui style props, both delivered as the DOCUMENTED mechanism with REAL theme vars (probe-verified, they switch
// light｜dark; no hardcoded hex). Appended to document.head after Tamagui's sheet, so equal-specificity ties fall to
// us by source order. Idempotent, browser-only (mirrors interaction-styles.ts).
//
// 1) PLACEHOLDER color. `placeholderTextColor` is NOT consumed on a core render:'input' (React warns) — verified.
//    Tamagui emits our token as `--placeholder` (light neutral500 / dark neutral400), so `::placeholder` reads it.
//
// 2) FOCUS RING = `:focus-visible`, on the FRAME. The contract (input.md:37,55) + components §VIII:155 mandate
//    `:focus-visible` (keyboard focus, POINTER-SUPPRESSED) — NOT `:focus-within` (which rings on pointer-click and on
//    a focused trailing clear/reveal button). But the ring must sit on the frame, which is never itself focused
//    (focus lands on the inner <input>). So we apply the documented `:focus-visible` selector via
//    `.vida-input-frame:has(input:focus-visible)` — the §VIII pure-CSS pattern, lifted to the frame. Colors read the
//    real, switching theme vars `--colorFocusRing` / `--borderFocus` (probe-verified). Requires `:has()` (all modern
//    browsers ≥2023; Vida is a modern-only OPFS SPA).
//    ERROR PRECEDENCE: the border-focus rule is guarded `:not(.vida-input-invalid)` so a danger border always wins
//    over the focus border; the ring (outline) still shows on an invalid+focused field.

let injected = false

export function ensureInputStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-input', '')
  style.textContent = [
    // 1) placeholder — muted, theme-switching. opacity:1 defeats Firefox's default placeholder opacity.
    '.vida-input::placeholder{color:var(--placeholder);opacity:1}',
    // 2) focus-visible ring on the frame (2px, 2px offset — §VIII / input.md:37).
    '.vida-input-frame:has(input:focus-visible){outline:2px solid var(--colorFocusRing);outline-offset:2px}',
    // border → focus, EXCEPT when invalid (danger border wins; the ring still shows).
    '.vida-input-frame:not(.vida-input-invalid):has(input:focus-visible){border-color:var(--borderFocus)}',
  ].join('')
  document.head.appendChild(style)
}
