// services/purposes — types (mod-purposes-and-goals #55 · LIF-136 ①)
//
// The measurability capstone: Values → Purposes → Targets spine + metrics/dreams/contributions/reviews,
// composing the built foundation/measurement engine (ADR-011; Purpose = rollup APEX + consumer, NOT owner).
// Deps GROW per slice (notifications/projects precedent): S1 = { db, deviceId }; later slices widen
// (S5 measurementSources?, S7 sessions, S8 spaces/notes/registry, S9 journal, effects?).
// Return types are Drizzle Row types at M1 ([[drizzle-row-not-assignable-to-vida-types-interface]]); the
// @vida/types interface reconcile is DB-11 (mirror-only, S1).

import type { DrizzleDb } from '../../db/adapter'
import type {
  CreateValueInput,
  UpdateValueInput,
  CreatePurposeInput,
  UpdatePurposeInput,
  CreateTargetInput,
  UpdateTargetInput,
} from '../../validators/purpose'
import type { ValueRow } from '../../db/schema/foundation/purpose'
import type { PurposeRow, TargetRow } from '../../db/schema/purposes'

export interface PurposesServiceDeps {
  db: DrizzleDb
  deviceId: string
}

export interface PurposesService {
  // ---- S1: spine CRUD (values · purposes · targets) -------------------------
  createValue(input: CreateValueInput): Promise<ValueRow>
  updateValue(id: string, patch: UpdateValueInput): Promise<ValueRow>
  archiveValue(id: string): Promise<void>
  getValue(id: string): Promise<ValueRow | null>
  listValues(): Promise<ValueRow[]>

  createPurpose(input: CreatePurposeInput): Promise<PurposeRow>
  updatePurpose(id: string, patch: UpdatePurposeInput): Promise<PurposeRow>
  archivePurpose(id: string): Promise<void>
  getPurpose(id: string): Promise<PurposeRow | null>
  listPurposes(): Promise<PurposeRow[]>

  createTarget(input: CreateTargetInput): Promise<TargetRow>
  updateTarget(id: string, patch: UpdateTargetInput): Promise<TargetRow>
  archiveTarget(id: string): Promise<void>
  getTarget(id: string): Promise<TargetRow | null>
  /** Active targets; optionally scoped to one purpose (nullable purpose_id ⇒ standalone targets, PG-9). */
  listTargets(purposeId?: string): Promise<TargetRow[]>
}

// --- typed errors (contract.md:49-57) ---------------------------------------
export class ValueNotFoundError extends Error {
  constructor(id: string) {
    super(`Value not found: ${id}`)
    this.name = 'ValueNotFoundError'
  }
}
export class PurposeNotFoundError extends Error {
  constructor(id: string) {
    super(`Purpose not found: ${id}`)
    this.name = 'PurposeNotFoundError'
  }
}
export class TargetNotFoundError extends Error {
  constructor(id: string) {
    super(`Target not found: ${id}`)
    this.name = 'TargetNotFoundError'
  }
}
