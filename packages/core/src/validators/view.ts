import { z } from 'zod'
import { VIEW_LAYOUT } from '@vida/types'

// Canonical validator for the saved-view layout enum (AR-6 · ADR-007).
// z.enum over the @vida/types tuple — the single source (DB-9). No cast, no spread.
export const ViewLayoutSchema = z.enum(VIEW_LAYOUT)
