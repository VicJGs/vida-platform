// ============================================================================
// Sync engine — module-local guard (AR-9 · ADR-003 §8, scaffold-only).
// Every reserved seam throws this until M4 (AR-9b) fills it. See docs/core/sync/.
// ============================================================================

/** Thrown by every AR-9 sync seam: scaffolded but inert until M4 (AR-9b). */
export class SyncNotActivated extends Error {
  constructor(seam: string) {
    super(`sync seam not activated until M4 (AR-9b): ${seam}`)
    this.name = 'SyncNotActivated'
  }
}
