// E8 (UI-3) — the DOCX serializer's print theme. THE ONE place raw color literals live in @vida/editor's serializer
// layer for DOCX (BR-E8-8a): `docx` styles via literal hex / shading / border option values — it has no CSS runtime and
// cannot read Tamagui theme vars (the react-pdf `pdf-theme.ts` parallel). The repo "no raw hex" grep-gate targets the
// Tamagui/CSS component surface; the DOCX engine's required literals are quarantined here. Print-neutral by design —
// brand fonts/palette are a deferred seam; the values are provisional (mirrors pdf-theme.ts).
// Spec: docs/specs/features/ui-3-vida-editor/e8-docx-serializer.md §5.
import { BorderStyle, ShadingType, type IBorderOptions, type IShadingAttributesProperties } from 'docx'
import type { CalloutVariant } from '../extensions/callout'

/** Print-neutral literals (provisional). `docx` colors are 6-digit hex WITHOUT a leading `#` (its wire format). */
export const DOCX_COLORS = {
  text: '1a1a1a',
  muted: '6b7280',
  border: 'd1d5db',
  codeBg: 'f3f4f6',
  link: '4f46e5',
} as const

/** Callout accent per variant — the {info,success,danger} set (EXACTLY E2's `CalloutVariant`, BR-E2-6). */
export const CALLOUT_ACCENT: Record<CalloutVariant, string> = {
  info: '4f46e5',
  success: '059669',
  danger: 'dc2626',
}

/** Callout tint (a light surface behind the accent border). */
export const CALLOUT_TINT: Record<CalloutVariant, string> = {
  info: 'eef2ff',
  success: 'ecfdf5',
  danger: 'fef2f2',
}

/** Built-in Word fonts — no font registration. Body = the document default; only the mono is named (for code). */
export const DOCX_FONTS = { mono: 'Courier New' } as const

/** Font sizes in HALF-POINTS (docx `TextRun.size` / heading run size). Body 11pt = 22; headings clamp level 1–6. */
export const BODY_HALF_PT = 22
export const HEADING_HALF_PT: Record<number, number> = { 1: 48, 2: 40, 3: 32, 4: 28, 5: 24, 6: 22 }

/** The `HeadingLevel` value per clamped level (docx `Paragraph.heading`). */
import { HeadingLevel } from 'docx'
export const HEADING_LEVEL: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}

// ── border / shading fragments (border `size` is in EIGHTHS of a point; indent in TWIPS, 1 inch = 1440) ───────────────
/** Horizontal rule = a paragraph bottom border. */
export const HR_BORDER: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: DOCX_COLORS.border }
/** Blockquote left rule + indent. */
export const BLOCKQUOTE_BORDER: IBorderOptions = { style: BorderStyle.SINGLE, size: 18, color: DOCX_COLORS.border }
export const BLOCKQUOTE_INDENT = 360 // 0.25"
/** Nested-list indent per level (twips). */
export const LIST_INDENT_PER_LEVEL = 360
/** Code block shading (a light surface behind the monospace run). */
export const CODE_SHADING: IShadingAttributesProperties = {
  type: ShadingType.CLEAR,
  fill: DOCX_COLORS.codeBg,
  color: 'auto',
}

/** Callout left border (accent) + tint shading, per variant. */
export function calloutBorder(variant: CalloutVariant): IBorderOptions {
  return { style: BorderStyle.SINGLE, size: 24, color: CALLOUT_ACCENT[variant] }
}
export function calloutShading(variant: CalloutVariant): IShadingAttributesProperties {
  return { type: ShadingType.CLEAR, fill: CALLOUT_TINT[variant], color: 'auto' }
}
