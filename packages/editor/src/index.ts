// @vida/editor — the TipTap block editor (UI-3). E1 editor core · E2 standard blocks · E3 toolbar.
// (No hand-maintained version const — `package.json` is the single source of truth; the E2-era `EDITOR_VERSION`
//  drifted to 0.1.0 and was unconsumed, so E3 dropped it.)

// E1 — editor core.
export { VidaEditor, assertEditorDocument, type VidaEditorProps, type VidaEditorHandle } from './editor'

// E1 — the integration-block command type map (BR-E1-4; the enum→command surface E4's slash menu lists).
export { INTEGRATION_BLOCK_COMMANDS, INTEGRATION_BLOCK_COMMAND_COUNT } from './commands'

// B3 (MOD-notes) — the `[[` note-link picker's injected-config surface the app (note-detail) wires to the Notes service.
export type { WikiLinkConfig, WikiLinkCandidate } from './extensions/wiki-link'

// E6 — markdown serializers (custom TipTap-JSON ↔ Markdown, round-trip lossless; ADR-001 §8).
export { toMarkdown } from './serializers/to-markdown'
export { fromMarkdown } from './serializers/from-markdown'

// E7 — PDF serializer (@react-pdf/renderer, web/desktop; ADR-001:101). Emit-only, no round-trip.
export { toPdf } from './serializers/to-pdf'

// E8 — DOCX serializer (`docx`; ADR-001:102). Emit-only, no round-trip. The last serializer.
export { toDocx } from './serializers/to-docx'

// Re-export the shared editor document contract (owned by @vida/types; never redefined — BR-7).
export type {
  EditorDocument,
  EditorNode,
  EditorMark,
  SlashCommand,
  MarkdownSerializeOptions,
  MarkdownParseResult,
  PdfSerializeOptions,
  DocxSerializeOptions,
} from '@vida/types'
