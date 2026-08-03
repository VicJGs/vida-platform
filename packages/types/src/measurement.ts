// Universal measurability (ADR-011) — shared enums.
// measurement_kind (HOW a thing is measured) is orthogonal to binding_mode (how it is fed).

/** §3.1 — the solid/abstract discriminator. */
export const MEASUREMENT_KIND = ['quantitative', 'milestone', 'rate', 'qualitative'] as const
export type MeasurementKind = (typeof MEASUREMENT_KIND)[number]

/** §3.5 — how a measurable is fed. */
export const BINDING_MODE = ['manual', 'derived-pull', 'event-trigger'] as const
export type BindingMode = (typeof BINDING_MODE)[number]
