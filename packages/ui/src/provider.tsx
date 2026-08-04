// DS-4 — the @vida/ui theme provider + hook (the theme-switch MECHANISM; B14).
// The APP (UX-3/UI-4) owns the theme STATE (Zustand, AR-4), its persistence, and the toggle UI; it passes the
// resolved 'light'|'dark' value as <UIProvider theme={...}>. A store change re-renders UIProvider → `defaultTheme`
// re-roots the theme (no @tamagui/next-theme, no <Theme> wrapper for the global switch). §1.2 of the DS-4 spec.
import { TamaguiProvider, type TamaguiProviderProps } from '@tamagui/core'
import { config } from './tamagui.config'

/** Resolved theme values (colors/tokens) for the active theme. A vida-namespaced re-export of Tamagui's `useTheme`
 *  (NOT `@tamagui/next-theme`'s `useThemeSetting`, which owns light/dark/system STATE — that's the app's Zustand).
 *  A direct re-export (not a wrapper) so the inferred type stays nameable under declaration emit (avoids TS2742). */
export { useTheme as useVidaTheme } from '@tamagui/core'

export type ThemeName = 'light' | 'dark'

export interface UIProviderProps extends Omit<TamaguiProviderProps, 'config' | 'defaultTheme'> {
  /** Resolved active theme, owned by the app (Zustand). Defaults to light. */
  theme?: ThemeName
}

export function UIProvider({ theme = 'light', children, ...rest }: UIProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme={theme} {...rest}>
      {children}
    </TamaguiProvider>
  )
}
