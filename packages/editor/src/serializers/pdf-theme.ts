// E7 (UI-3) — the PDF serializer's print theme. THE ONE place raw color literals live in @vida/editor's serializer
// layer (BR-E7-8a): @react-pdf/renderer has NO CSS runtime — it cannot read Tamagui theme vars / `--color*` (those
// resolve only in a browser DOM), so its styles MUST be literal values. The repo "no raw hex" grep-gate targets the
// Tamagui/CSS component surface; the PDF engine's required literals are quarantined here (the DS-token-source-file
// precedent). Print-neutral by design — brand fonts/palette are a deferred seam (BR-E7-1); the values are provisional.
// Spec: docs/specs/features/ui-3-vida-editor/e7-pdf-serializer.md §5.
import { StyleSheet } from '@react-pdf/renderer'
import type { CalloutVariant } from '../extensions/callout'

/** Print-neutral literals (provisional — brand palette deferred with brand fonts, BR-E7-1). */
export const PDF_COLORS = {
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#d1d5db',
  codeBg: '#f3f4f6',
  link: '#4f46e5',
} as const

/** Callout accent per variant — the {info,success,danger} set (EXACTLY E2's `CalloutVariant`, BR-E2-6). */
export const CALLOUT_ACCENT: Record<CalloutVariant, string> = {
  info: '#4f46e5',
  success: '#059669',
  danger: '#dc2626',
}

/** Callout tint (a light surface behind the accent border). */
export const CALLOUT_TINT: Record<CalloutVariant, string> = {
  info: '#eef2ff',
  success: '#ecfdf5',
  danger: '#fef2f2',
}

/** Built-in @react-pdf standard fonts (no `Font.register` — BR-E7-1). */
export const PDF_FONTS = { body: 'Helvetica', bold: 'Helvetica-Bold', mono: 'Courier' } as const

/** Body + per-heading-level font sizes (pt). Level is clamped 1–6 upstream. */
export const BODY_SIZE = 11
export const HEADING_SIZE: Record<number, number> = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 }

/** Static block styles. Dynamic per-variant/per-level bits are applied inline in to-pdf.tsx. */
export const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    fontFamily: PDF_FONTS.body,
    fontSize: BODY_SIZE,
    color: PDF_COLORS.text,
    lineHeight: 1.5,
  },
  block: { marginBottom: 8 },
  heading: { fontFamily: PDF_FONTS.bold, marginBottom: 8, marginTop: 4 },
  listRow: { flexDirection: 'row' },
  listMarker: { width: 22 },
  listContent: { flex: 1 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.border,
    paddingLeft: 10,
    marginBottom: 8,
    color: PDF_COLORS.muted,
  },
  codeBlock: {
    fontFamily: PDF_FONTS.mono,
    fontSize: 10,
    backgroundColor: PDF_COLORS.codeBg,
    padding: 8,
    marginBottom: 8,
  },
  codeLine: { fontFamily: PDF_FONTS.mono, fontSize: 10 },
  hr: { borderTopWidth: 1, borderTopColor: PDF_COLORS.border, marginVertical: 10 },
  image: { marginBottom: 8, maxWidth: '100%' },
  table: { marginBottom: 8, borderWidth: 1, borderColor: PDF_COLORS.border },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, borderWidth: 1, borderColor: PDF_COLORS.border, padding: 4 },
  callout: { borderLeftWidth: 3, padding: 10, marginBottom: 8 },
  placeholder: {
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    backgroundColor: PDF_COLORS.codeBg,
    padding: 10,
    marginBottom: 8,
  },
  placeholderLabel: { fontFamily: PDF_FONTS.bold },
  placeholderHint: { color: PDF_COLORS.muted, fontSize: 9 },
  header: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, paddingBottom: 8 },
  headerTitle: { fontFamily: PDF_FONTS.bold, fontSize: 20, marginBottom: 4 },
  headerMeta: { color: PDF_COLORS.muted, fontSize: 9 },
})
