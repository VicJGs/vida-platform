// ============================================================================
// PreferencesService — error types (mod-preferences #37 · Slice 1)
// Mirrors the sessions/types.ts error-class pattern (LIF-139).
// ============================================================================

/**
 * Thrown by `setModuleVisibility` for a structurally-invalid module key (empty / non-string).
 * MEMBERSHIP is NOT validated here: no canonical module registry exists in @vida/types (D3) — the ② Settings
 * screen, which owns the module list, validates membership. `module_visibility` is an open JSON map (PR-7).
 */
export class InvalidModuleError extends Error {
  constructor(public readonly moduleKey: string) {
    super(`Invalid module key: ${JSON.stringify(moduleKey)}`)
    this.name = 'InvalidModuleError'
  }
}
