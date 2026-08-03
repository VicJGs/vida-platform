// Capability registry (ADR-008) — shared enums.
// The capability `kind` is OPEN (registry-validated, no CHECK); only render targets are FIXED.

/** CB2 — a capability declares which render target(s) it supports (one or both). */
export const RENDER_TARGET = ['inline', 'standalone'] as const
export type RenderTarget = (typeof RENDER_TARGET)[number]
