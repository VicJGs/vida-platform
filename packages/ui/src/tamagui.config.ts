// DS-4 — the Tamagui configuration for @vida/ui.
// COMPOSES the GENERATED token outputs (DS-1→DS-3); authors NO token values (B13).
//   tokens  ← themes/tokens.ts (createTokens)
//   themes  ← themes/themes.ts (light/dark + light_/dark_<Comp>) — dark is a first-class switchable Theme (B14)
//   fonts   ← themes/fonts.ts   → createFont (role-keyed size/lineHeight + `true` default, §1.1-D)
//   animations ← themes/motion.ts → createAnimations (CSS driver — ADR-001 §9 "CSS variables on web" + "no extra
//     dependency"; reanimated is the NATIVE driver per ADR-001:258, wired when mobile is built) (B15)
// The theme-switch MECHANISM + provider live in ./provider.tsx; the toggle UI + persistence are app-shell (UX-3/UI-4).
import { createFont, createTamagui } from '@tamagui/core'
import { createAnimations } from '@tamagui/animations-css'
import { tokens } from './themes/tokens'
import { light, dark, light_Button, dark_Button, light_Input, dark_Input } from './themes/themes'
import { fonts as f } from './themes/fonts'
import { motion } from './themes/motion'

// Two families over ONE shared role-keyed scale (they differ by `family`, not by scale). `true` = the default face
// so an unstyled <Text> resolves a size/lineHeight (fonts.ts keys by role, not $1..$n — §1.1-D / B13).
const sizeScale = { ...f.fontSize, true: f.fontSize.body }
const lineScale = { ...f.lineHeight, true: f.lineHeight.body }
const weightScale = { ...f.fontWeight, true: f.fontWeight.regular }
const trackScale = { ...f.letterSpacing, true: f.letterSpacing.normal }

const bodyFont = createFont({
  family: f.fontFamily.body,
  size: sizeScale,
  lineHeight: lineScale,
  weight: weightScale,
  letterSpacing: trackScale,
})
const displayFont = createFont({
  family: f.fontFamily.display,
  size: sizeScale,
  lineHeight: lineScale,
  weight: weightScale,
  letterSpacing: trackScale,
})

// CSS driver (ADR-001 §9 "CSS variables on web" + "no extra dependency" — no react-native-web). Its config is the
// CSS transition string `'<easing> <duration>'`, so it consumes motion.ts's duration AND easing LOSSLESSLY. Named
// presets pair a duration band with ease-out (motion.md §IX: entrances + state-change use ease-out); `instant` = 0ms.
// Semantic enter/exit refinements (ease-in for exits) are applied per-component via enterStyle/exitStyle (DS-5/UI-*).
const animations = createAnimations({
  instant: `${motion.easing.linear} ${motion.duration.instant}ms`,
  fast: `${motion.easing.out} ${motion.duration.fast}ms`,
  moderate: `${motion.easing.out} ${motion.duration.moderate}ms`,
  slow: `${motion.easing.out} ${motion.duration.slow}ms`,
})

export const config = createTamagui({
  tokens,
  themes: { light, dark, light_Button, dark_Button, light_Input, dark_Input },
  fonts: { body: bodyFont, display: displayFont },
  animations,
  // Vite SPA (non-SSR). addThemeClassName default is already 'html' (theme class on <html> for CSS-var styling).
  settings: { disableSSR: true, addThemeClassName: 'html' },
})

export type VidaConfig = typeof config

export default config
