// ============================================================================
// Canvas ↔ CanvasView adapter — fe-codec-canvas-board S2 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a module/Space uses to drive
// @vida/ui's `CanvasView` for its two worked examples — Vision-board (GalleryView
// over dreams) and Calendar-grid (month CalendarView). This is the apps/web plane
// where @vida/types meets the presentational shell — the Tamagui-only boundary
// forbids this in @vida/ui (BR-2; the collection/dashboard/entity adapter precedent).
//
// SHIPS (buildable + tested NOW):
//  • `toCanvasHeader` — the frame header mapping; `title` = the USER-NAMED surface
//    (the saved-view / Space name), NEVER the month (EC-5/A — no duplication of the
//    renderer's own month header).
//  • `resolveMeasureProgress` — the MEASURE-DRIVEN progress descriptor (R9/R9a):
//    a board tile's bar style AND its label/units follow the entity's
//    `measurement_kind`; unmeasured → no bar. The reference convention every
//    measured board (fe-purposes et al.) follows — the production dream tile is
//    the owning module's `renderItem` (GV-1), this is the shared resolver.
//
// DOES NOT ship: a live data hook — no M1.2.1 canvas consumer is BUILT yet
// (fe-purposes' Dreams vision-board / fe-calendar #19 depend on this but ship
// later; grep clean). `useVisionBoard(spaceId)` / `useCalendar(spaceId)` (React
// Query → the saved view + dreams/dueIn + these pieces) are built at the FIRST
// consumer — the collection/dashboard adapter `ProviderRead` precedent. See ./CLAUDE.md.
// ============================================================================
import type { MeasurementKind } from '@vida/types'

/** A structural projection of a saved-view row (≡ the relevant fields) — the module feeds this (the `SavedViewLike`
 *  precedent; decoupled from sync-metadata). `name` is the USER-GIVEN surface name = the frame title (EC-5/A). */
export interface SavedViewLike {
  id: string
  name: string
}

/** The frame header a canvas surface passes to `CanvasView`. `title` is ALWAYS the user-named surface (never the month —
 *  the hosted CalendarView renders its own month header; EC-5/A). */
export interface CanvasHeader {
  eyebrow: string
  title: string
  meta?: string
}

/** Map a saved view (+ the archetype eyebrow + an optional meta line) → the `CanvasView` masthead header. PURE. */
export function toCanvasHeader(view: SavedViewLike, eyebrow: string, meta?: string): CanvasHeader {
  return { eyebrow, title: view.name, meta }
}

// ── measure-driven progress (R9/R9a) ─────────────────────────────────────────────────────────────────────
// A board can hold mixed pursuable entities across the OS (Tasks · Habits · Routines · Projects · Dreams · Health ·
// Finance; ADR-011). A tile's progress is NOT one fixed style — the bar style AND its label/units follow the entity's
// `measurement_kind` (quantitative · milestone · rate · qualitative) plus the unmeasured case. This discriminated union
// carries exactly the inputs each kind needs; `resolveMeasureProgress` maps it to a display descriptor.

/** The measure input for ONE board entity, discriminated by `measurement_kind` (null = unmeasured). */
export type MeasureProgress =
  | { kind: Extract<MeasurementKind, 'milestone'>; done: number; total: number }
  | { kind: Extract<MeasurementKind, 'quantitative'>; value: number; target: number; unit?: string }
  | { kind: Extract<MeasurementKind, 'rate'>; fraction: number } // already 0..1 (ADR-011 progress() normalized)
  | { kind: Extract<MeasurementKind, 'qualitative'>; state: string }
  | { kind: null } // unmeasured — no measurement_kind / null progress()

/** What a tile renders for progress — resolved from the measure. */
export interface ProgressDescriptor {
  /** Render a progress bar? false for `qualitative` (a state) and unmeasured (nothing). */
  showBar: boolean
  /** 0..1 fill, or null when there is no bar. */
  fraction: number | null
  /** The caption following the measure (R9a): "N of M steps" (milestone) · "X of Y" (quantitative) · "P%" (rate) ·
   *  the state (qualitative) · null (unmeasured). */
  label: string | null
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0)
const fmt = (n: number): string => n.toLocaleString('en-US')

/**
 * Resolve an entity's measure → its board-tile progress descriptor (R9/R9a). PURE + total (exhaustive over the union).
 * The LABEL is the sensible default for the kind; a consumer needing bespoke formatting (e.g. a currency prefix
 * "$4k of $10k") composes its own caption — this is the shared reference convention, not a formatter monopoly.
 */
export function resolveMeasureProgress(m: MeasureProgress): ProgressDescriptor {
  switch (m.kind) {
    case 'milestone': {
      const fraction = m.total > 0 ? clamp01(m.done / m.total) : 0
      return { showBar: true, fraction, label: `${m.done} of ${m.total} steps` }
    }
    case 'quantitative': {
      const fraction = m.target !== 0 ? clamp01(m.value / m.target) : 0
      const unit = m.unit ?? ''
      return { showBar: true, fraction, label: `${fmt(m.value)}${unit} of ${fmt(m.target)}${unit}` }
    }
    case 'rate':
      return { showBar: true, fraction: clamp01(m.fraction), label: `${Math.round(clamp01(m.fraction) * 100)}%` }
    case 'qualitative':
      return { showBar: false, fraction: null, label: m.state }
    case null:
      return { showBar: false, fraction: null, label: null }
  }
}

/** The pure, no-React half of the canvas convention (the create*Adapter precedent). */
export interface CanvasAdapter {
  toCanvasHeader: typeof toCanvasHeader
  resolveMeasureProgress: typeof resolveMeasureProgress
}

export function createCanvasAdapter(): CanvasAdapter {
  return { toCanvasHeader, resolveMeasureProgress }
}
