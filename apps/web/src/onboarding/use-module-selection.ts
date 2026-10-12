// fe-onboarding (LIF-216) · S2 — the module enable-set state + the deferred write SEAM (seam-contract Seam A).
// M1: the selection is real + in-memory; `commit` is a stubbed no-op — honest, it makes NO "saved" claim (EC-7), because
// M1.0 has no backing store. Live backing = M1.1 `nav_preferences`/feature-flags [FACT: apps/web/src/shell/feature-flags.ts:4];
// the ProviderRead-seam convention means the call sites don't change on the live swap (shell-prefs.ts precedent).
import { useCallback, useState } from 'react'
import { defaultModuleEnableSet } from './modules'

/** The enable-set write the user drives in Step 1 (seam-contract Seam A). */
export interface ModuleEnablementWrite {
  /** Set one module on/off (M1: in-memory only). */
  readonly setEnabled: (moduleKey: string, enabled: boolean) => void
  /** Flip one module (convenience over setEnabled). */
  readonly toggle: (moduleKey: string) => void
  /** Finalize the enable-set. M1 stub: resolves no-op; live = the nav_preferences/feature-flags write. */
  readonly commit: (enabled: Record<string, boolean>) => Promise<void>
}

export interface UseModuleSelection extends ModuleEnablementWrite {
  /** The current enable-set (module key → on). Starts at the default (all visible-dock ON). */
  readonly enabled: Record<string, boolean>
}

export function useModuleSelection(): UseModuleSelection {
  // Lazy init — the default set is derived once (all visible dock modules ON = today's dock-visibility).
  const [enabled, setEnabledState] = useState<Record<string, boolean>>(() => defaultModuleEnableSet())

  const setEnabled = useCallback((moduleKey: string, on: boolean) => {
    setEnabledState((prev) => ({ ...prev, [moduleKey]: on }))
  }, [])

  const toggle = useCallback((moduleKey: string) => {
    setEnabledState((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }))
  }, [])

  // M1 stub: no persistence yet, so resolve without claiming a save. Signature-stable for the live M1.1 swap.
  const commit = useCallback((_enabled: Record<string, boolean>) => Promise.resolve(), [])

  return { enabled, setEnabled, toggle, commit }
}
