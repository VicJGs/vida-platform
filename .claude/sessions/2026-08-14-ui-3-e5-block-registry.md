---
Session 1 — 2026-08-14
Goal: Build UI-3 / E5 (the block-registry seam + placeholder node-views) through the §XXVI gate, ship + PR + merge.
Profile: New Feature (scenario Default)
Task: ui-3-vida-editor (LIF-88, #29)
---

## Accomplished
- **E5 SHIPPED + MERGED** — `@vida/editor` v0.4.0 → **v0.5.0** (PR #19 `3b3197d`). The editor-side **`inline` render
  surface for the ADR-008 capability registry** — the "TipTap re-home" AR-7 deferred to UI-3 #29
  (`docs/core/capability/current-business-rules.md:26`).
- `packages/editor/src/extensions/integration-blocks.tsx` (NEW) — `createIntegrationBlockNode` factory → 11 atom
  `Node`s (one per `INTEGRATION_BLOCK_TYPE`) over `INLINE_BLOCK_DEFS`; config as node attrs per `config_schema` (CB2;
  7 typed `satisfies`-guarded, 4 schema-pending, `rendered:false` JSON-only) + `IntegrationBlockPlaceholder` — the
  FIRST React node-view (`ReactNodeViewRenderer` + Tamagui card, CB6 terminal state) + `AVAILABLE_INTEGRATION_BLOCKS`.
- `editor.tsx` spread the extensions; `slash-commands.ts` flipped availability ON + added a `run` (closed the E4 seam);
  retired the 9 stale per-type stub files (`tag-extension.ts` kept); one injected block-rhythm margin.
- Full §XXVI gate: baseline (drift-free) → spec → gate-1 REVISE → **re-grounded in ADR-008** (Victor's steer) →
  gate-1 re-run REVISE → Approval 1 → preflight PASS +5 folds → gate-2 SHIP → Approval 2 → implement → post-impl SHIP
  +1 material fix → **Visual Gate PASS** (both themes, after a block-spacing fix).
- §XXIX currency: `docs/editor/{current-spec,current-business-rules,block-registry,extension-catalog}.md` + CLAUDE.md
  + umbrella §5 E5 ✅ (+ADR-008 BR-3 cite). Green: typecheck 11/11 · editor **121/121** · build+storybook ✓ · boundary
  clean · no hex · no new dep · lint 0-err.
- Merged to main (#19), re-verified green; tracker docs reconciled to merged-state (#20); `tracker --sync` to Linear.

## Decisions Made
- **E5 = the ADR-008 `inline` render adapter, NOT a bespoke editor registry** — AR-7 owns the registry; the editor is
  its renderer; MOD-notes #31 wires it. (Victor's doc-verify steer; the first spec had re-invented it.)
- **Config = node attrs per `config_schema` (CB2)** — declare the `@vida/types` schemas; the "D-7 attr-preservation
  hazard" was a hand-wave that ADR-008/CB2 already answered.
- **Availability flipped ON** for all 11 (BR-E4-5); **mutable attr defaults are FUNCTION defaults** (post-impl leak fix).
- No new ADR (E5 implements ADR-008); no new dep; boundary unchanged.

## Open Questions
- The **4 schema-less integration types** (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock`) have no
  `@vida/types` config-schema interface yet — `[UNKNOWN: schema pending]`, authored by each type's MOD-* alongside its
  real body. Not E5's to resolve.
- The **HTML per-attr codec** for integration config attrs (a `string[]` → non-`[object Object]` HTML value) is
  deferred to **E6** — only needed if E6's markdown serializer round-trips through HTML rather than JSON.
- CI is red repo-wide from the known **pnpm `action-setup@v4` version conflict** (a filed hygiene task) — every job
  dies at setup before running code; local verification is the source of truth (green). Unchanged from prior sessions.

## Next Session
First step: **Start E6 (markdown serializers, `to` + `from`)** — cut `ui-3-e6-*` off clean `main` (ready now, #19
merged) through the §XXVI gate. ONE unit (round-trip co-designed): lossless over `STANDARD_BLOCK_TYPE`; `warnings` for
lossy; integration blocks per `integration_block_handling` (`comment|skip|placeholder`); the deferred HTML-codec
question lands here. Then E7 PDF (`@react-pdf/renderer`) → E8 DOCX (`docx`) → UI-4 (#30).
Context to reload: `docs/specs/features/ui-3-vida-editor/_index.md` (umbrella §5 sequence) · `docs/editor/current-*`
(ground truth) · `packages/types/src/editor.ts` (`MarkdownSerializeOptions`/`MarkdownParseResult`, EXPORT_FORMAT) ·
`packages/editor/src/extensions/{standard-blocks,integration-blocks,callout}.tsx` (the nodes E6 serializes).
