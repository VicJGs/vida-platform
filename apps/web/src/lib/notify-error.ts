// ============================================================================
// notifyError — the ONE mutation-error surface (notes-rescope R1, F-7 / BR-R1-7).
// A failure is never silent: one danger toast NAMING THE ACTION ("Couldn’t create the note"). The error itself goes to
// the console — class names like `PageNotFoundError: …` are diagnostics, not user copy (IMPLEMENTATION-PLAN-R1 R-1).
// Danger toasts route through the assertive live region (`@vida/ui` toast-store). Every new `useMutation` calls this
// from its `onError` (R3 rename · R4 attachments · R5 delete …).
// ============================================================================
import { toast } from '@vida/ui'

/** @param action the verb phrase completing "Couldn’t …", e.g. `'create the note'`. */
export function notifyError(action: string, error: unknown): void {
  console.error(`[${action} failed]`, error)
  toast({ intent: 'danger', title: `Couldn’t ${action}` })
}
