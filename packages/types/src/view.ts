// ============================================================================
// Saved Views — canonical enum tuple  (AR-6 · ADR-007)
//
// A saved view is filter × layout × grouping (ADR-007 §3.3, V3). Only the
// LAYOUT is a FIXED vocabulary → a hard SQL CHECK on `views.layout` + a
// z.enum validator in @vida/core (DB-9 / ADR-002 §2.3, C2 tuple-as-source:
// tuple ≡ union ≡ validator ≡ CHECK, enum-parity.test.ts).
//
// `filter`/`grouping`/`sort` are JSON-TEXT (open shapes, ADR-007 §3.3) — not
// enums; `entity_type` values inside a filter draw from the OPEN taggable-type
// registry (@vida/core `_registry.ts`), never a fixed tuple here.
// ============================================================================

/** The renderer a view selects — FIXED (ADR-007 §3.3, V3). `@vida/ui` view
 *  components (calendar/list/gallery/graph/timeline …) are the renderers a
 *  view *picks*; they are not the unit of "a view". */
export const VIEW_LAYOUT = ['list', 'table', 'board', 'gallery', 'calendar', 'graph', 'timeline'] as const
export type ViewLayout = (typeof VIEW_LAYOUT)[number]
