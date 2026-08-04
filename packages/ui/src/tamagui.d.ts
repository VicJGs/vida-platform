// Registers the Vida Tamagui config so `$token`/theme/font names are typed for @vida/ui components + apps (B16).
// Ambient (.d.ts, not emitted) → keeps the `typeof config` augmentation OUT of the value module's declaration,
// avoiding the self-reference cycle that TS2742/TS7022 hit under `declaration: true`.
import type { VidaConfig } from './tamagui.config'
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends VidaConfig {}
}
