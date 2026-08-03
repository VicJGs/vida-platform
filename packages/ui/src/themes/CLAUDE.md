# packages/ui/src/themes — Token pipeline (DS-1)

The Style Dictionary → Tamagui + CSS-vars token pipeline. Turns the 3-layer JSON seed into the design system's
consumable outputs. Durable spec: `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md`.

## Files
- `tokens/{primitive,semantic,component}.json` — the **only editable input**. Three layers, strict indirection:
  primitive = literals · semantic → primitive · component → semantic. Classic Style Dictionary format
  (`{ "value", "type" }`, refs `{group.name}`).
- `build-tokens.mjs` — the build. Style Dictionary engine + custom `checkLayers` (enforces the 3-layer rule,
  fails loud) + 3 custom formats. Exported `checkLayers`/`validate`/`build`/`PipelineError` for the tests.
- `variables.css` · `tokens.ts` · `themes.ts` — **GENERATED — DO NOT EDIT.** Regenerate via `pnpm tokens:build`.
- `build-tokens.test.ts` — 13 fixtures (B2 fail-loud, B4 determinism, B1/B3 traceability, banners).

## Rules
- Never hand-edit a generated file — edit `tokens/*.json` and run `pnpm --filter @vida/ui tokens:build`.
- Never skip a layer (component→primitive) or put a raw literal in semantic/component — the build will fail (B2).
- Keep it deterministic: sort by path, no timestamps (B4). `pnpm build` runs `tokens:build` before `tsc`.
- **DS-1 = plumbing only.** Values are throwaway placeholders → DS-2 supplies real values + the Figma/Tokens Studio
  source. Tamagui app config (`createTamagui`) + CSS-var reconciliation = DS-4. Don't pull that work forward here.

## Verify
`pnpm --filter @vida/ui tokens:build && pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui test`
