// ============================================================================
// Templates substrate — service-local types + typed errors  (XS-templates #36 · ADR-009)
//
// S1 authors the instantiation RESULT (the seed-what-it-can / flag-the-rest
// split, XCU-11) and the typed errors. The bundle envelope + terminal-state
// tuple live in @vida/types (cross-package). Mirrors foundation/views/types.ts.
// ============================================================================

import type { InstantiationStatus } from '@vida/types'

/** A bundle member that could NOT be seeded during instantiate (XCU-11). The
 *  doc-grounded reason is a referenced capability not present on this device
 *  (ADR-009:108-110); `reason` is an OPEN string so S4 can add the M1.1
 *  write-seam case (no registered entity writer) without inventing a vocabulary
 *  at S1. */
export interface FlaggedMember {
  member: string
  reason: string
}

/** The result of instantiating a template bundle (XCU-11 per-member split).
 *  `status` is the declared terminal state; `seeded`/`flagged` name the member
 *  keys that were forked vs. degraded. S4 (instantiate) MAY extend this with a
 *  forked-root reference — a deferred S4 contract detail, not an S1 hole. */
export interface InstantiationResult {
  status: InstantiationStatus
  seeded: string[]
  flagged: FlaggedMember[]
}

// --- Typed errors ------------------------------------------------------------

/** No user-saved template row for the given id (mirrors ViewNotFound). */
export class TemplateNotFound extends Error {
  constructor(public readonly templateId: string) {
    super(`No template found for id '${templateId}'`)
    this.name = 'TemplateNotFound'
  }
}

/** The capture transform refused to serialize a Space into a bundle because a
 *  member could only be expressed by pointing at accumulated runtime data — not
 *  capturable (ADR-009:53-57, :73-83, the authored-vs-accumulated invariant, IR-4).
 *  Thrown as an async rejection by the S3 capture path. */
export class TemplateCaptureError extends Error {
  constructor(public readonly reason: string) {
    super(`Cannot capture template: ${reason}`)
    this.name = 'TemplateCaptureError'
  }
}
