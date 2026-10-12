// fe-onboarding (LIF-216) · S4 — the guided-setup app-mount: the overlay that RUNS the flow. Lifts the module + theme
// selections to the flow level (so they persist across steps — S2/S3 shipped the pure pickers + hook shells; this is
// where they're wired), maps each `pick` step to its picker body, drives the LIVE theme preview through the app-owned
// `onPreview` lever, and COMMITS both on finish (M1 stubs = no-op). Renders OVER the app at the onboarding boot seam.
import { useModuleSelection } from './use-module-selection'
import { getDockModuleGroups } from './modules'
import { ModulePickerView } from './module-picker'
import { useThemeSelection } from './use-theme-selection'
import { ThemePickerView } from './theme-picker'
import { GuidedSetup } from './guided-setup'
import { type GuidedSetupStep } from './guided-setup-steps'
import { type ThemePreset, type ThemeMode } from '@vida/ui'

export interface GuidedSetupTakeoverProps {
  /** The PROVIDER's active mode — the swatch bands preview in it (g2 S3 NIT-3: pass the live selection.mode). */
  mode: ThemeMode
  /** The app's current preset — the theme picker reflects it as selected. */
  initialPreset: ThemePreset
  /** The app-owned selection lever — selecting a preset live-previews it across the whole app. */
  onPreview: (preset: ThemePreset) => void
  /** Finish/skip the flow — return to the app. */
  onClose: () => void
}

export function GuidedSetupTakeover({ mode, initialPreset, onPreview, onClose }: GuidedSetupTakeoverProps) {
  const modules = useModuleSelection()
  const theme = useThemeSelection({ initial: initialPreset, onPreview })

  const renderStepBody = (step: GuidedSetupStep) => {
    if (step.id === 'modules')
      return <ModulePickerView groups={getDockModuleGroups()} enabled={modules.enabled} onToggle={modules.toggle} />
    if (step.id === 'theme')
      return <ThemePickerView selected={theme.selected} mode={mode} onSelect={theme.preview} />
    return null
  }

  // Finalize: commit both enable-sets (M1 stubs resolve no-op), then leave. GuidedSetup's own re-entrancy guard + a
  // retryable error cover a rejecting commit; on success the parent unmounts this overlay.
  const onComplete = async () => {
    await modules.commit(modules.enabled)
    await theme.commit(theme.selected)
    onClose()
  }

  return <GuidedSetup onComplete={onComplete} renderStepBody={renderStepBody} />
}

export default GuidedSetupTakeover
