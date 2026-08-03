# Spec: component:ds-1-token-pipeline
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented      <!-- draft → approved → implemented -->  (LITE gate · built + gated + docs current · 2026-07-26)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Tamagui API verified against context7 /tamagui/tamagui (v1.141.5) AND the INSTALLED @tamagui/core@2.5.1
(`createTokens<T extends CreateTokens>(tokens)`, categories color/space/size/radius/zIndex; themes = plain
objects; no `createTheme`) — API-compatible across v1→v2 for DS-1's surface, 2026-07-26.
Sessions: 2026-07-26-ds-1-token-pipeline (§7).

<!--
  FORWARD spec (LITE gate — design-system document-first: §1·§2·§4 + §5 here; §3 delegated to /contract;
  single /critique, no two-approval loop). DS-1 = the pipeline PLUMBING only; token VALUES are DS-2.
  Revised after adversarial critique (REVISE → BL-1/BL-2/BL-3 fixed; Tamagui API re-verified via context7).
-->

## 1. Identity

**What it is.** DS-1 is the **token build pipeline** for `@vida/ui`: a [Style Dictionary](https://styledictionary.com)
configuration that reads a hand-authored, **three-layer** token source (primitive → semantic → component) and
emits, from that single source, the Tamagui token/theme inputs plus a CSS-variable view:

1. **Tamagui token/theme modules** — a `createTokens(...)` call (`tokens.ts`) + **plain `light`/`dark` theme
   objects** (`themes.ts`), the inputs DS-4's `createTamagui({ tokens, themes })` consumes. `createTokens` and the
   theme objects are the mandated universal token layer (ADR-001). `[FACT: ADR-001:111,114 — §9 Component Library=Tamagui + Theme=light/dark via Tamagui theme system]`
   `[FACT: context7 /tamagui/tamagui — createTokens({size,space,radius,zIndex,color}); themes are plain objects passed to createTamagui; NO createTheme export]`
2. **A CSS custom-properties file** (`variables.css`) named per design.md §XII (`color/surface/primary` →
   `--color-surface-primary`) — a *parallel format target off the same seed* for raw-CSS / documentation use.
   `[FACT: STANDARDS design.md §XII]`

Home: `packages/ui/src/themes/`. `[FACT: docs/roadmap/m1.0-delivery-plan.md §5 DS-1]`

**The three-layer → Tamagui projection (the non-trivial core — BL-2).** The design.md 3 layers do **not** map to
3 flat Tamagui token categories; they map onto Tamagui's own three constructs:
| Seed layer (design.md §II) | → Tamagui construct | Shape |
|---|---|---|
| **primitive** (raw scales: `color/blue/500`, `space/4`, `radius/md`) | `createTokens` categories | flat maps under `color`·`space`·`size`·`radius`·`zIndex`, each with a `true` default; accessed `$name` `[FACT: context7]` |
| **semantic** (`color/surface/primary`, `color/text/muted`) | base `light`/`dark` **theme objects** | flat semantic keys (`background`, `color`, `borderColor`…) whose values reference tokens `[FACT: context7 configuration.mdx]` |
| **component** (`button/background/primary`) | `light_<Comp>` / `dark_<Comp>` **sub-themes** | scoped theme objects referencing semantic/token values `[FACT: context7 — light_alert/dark_alert sub-theme naming]` |

**The desire.** One deterministic build so a token defined once propagates to every consumer with **no
hand-editing** and **no value referenced twice** — the three-layer indirection is never skipped.
`[FACT: design.md §II "three layers, always"]`

**What it is NOT.**
- NOT the token **values** — color/type/space/radius/shadow foundations are **DS-2**. DS-1 ships a *throwaway
  placeholder seed* (a few values per layer) solely to prove the build end-to-end. `[FACT: m1.0-delivery-plan §5 DS-2]`
- NOT the Figma wiring — at **DS-2** the real values are authored **code-first** in the seed; the community Figma
  file + MCP-scripter bridge come **later** (NOT Tokens Studio). `[DIRECTION: Victor 2026-08-03 — supersedes the
  original "Figma → Tokens Studio at DS-2" assumption]` `[FACT: /token-audit = 0 consumers → safe to defer Figma]`
- NOT the full Tamagui app config — `tamagui.config.ts` (`createTamagui`), the provider, and dark-mode wiring are
  **DS-4**. DS-1 produces the `tokens.ts`/`themes.ts` DS-4 *imports*. **No circular dep:** `createTokens(...)` and
  plain theme objects typecheck standalone from `@tamagui/core` **without** `createTamagui`. `[FACT: context7 — createTokens importable from @tamagui/core, returns typed tokens]` `[FACT: roadmap §5 — DS-1 dep = AR-1 only; DS-4 dep = DS-2,DS-3]`
- NOT a second authority for web CSS vars. Tamagui emits its own web CSS vars at DS-4; DS-1's `variables.css` is a
  *parallel view off the same seed* under the design.md naming — the two var-name systems are reconciled at DS-4,
  not here. `[INTERP: ADR-001:113 + BL-2]`

## 2. Business Rules

**Invariants (must always hold):**
- **B1 — Single source.** Every emitted value (Tamagui token, theme key, CSS var) traces to exactly one seed
  entry. No value authored twice. `[FACT: design.md §II]`
- **B2 — Three-layer indirection, never skipped.** A component token references a semantic token; a semantic
  token references a primitive; a primitive holds the raw value. No component/semantic entry points at a raw
  literal or skips a layer. The build **fails loud** (non-zero exit) on violation. `[FACT: design.md §II lines 55–79]`
- **B3 — Naming (scoped per target).** *CSS target:* a seed path `a/b/c` → CSS var `--a-b-c` (design.md §XII).
  *Tamagui target:* names follow Tamagui's schema via the §1 projection table (flat category tokens `$name`; theme
  keys; `light_<Comp>` sub-themes) — **not** the CSS-var name. The two targets intentionally differ in name shape;
  each is deterministic. `[FACT: design.md §XII]` `[FACT: context7 — Tamagui token/theme key schema]`
- **B4 — Determinism.** Same seed → byte-identical output per target. Style Dictionary's timestamped file header
  is disabled and object keys are sorted so re-builds don't diff on incidentals. `[INTERP: SD emits a dated auto-gen header by default]`
- **B5 — Generated, never hand-edited.** Every output file carries a "GENERATED — do not edit" banner; the seed
  is the only editable input. `[INTERP: from B1]`

**Validation / failure behavior (fail loud) —** a naming/reference mismatch here would propagate to every
downstream consumer, so it is caught at the pipeline root, not per-consumer:
- **dangling reference** (references a name that does not exist) → build errors, non-zero exit, names the offender.
  `[DECISION: fail-loud chosen; rationale = design-system scenario "Any error" triage — pipeline naming faults are STRUCTURAL, fix at root]`
- **layer-skip** (component→primitive, or a raw literal in a non-primitive layer) → build errors (B2).
- **empty seed layer** → build errors (each layer needs ≥1 token for DS-2 to extend).

**Terminal states of the build:**
- **success** — all targets written; exit 0.
- **dangling-ref / layer-skip / empty-layer error** — no partial output left behind; exit ≠ 0, cause named.

## 3. Contract
DS-1 is a build **pipeline**, not a visual component — so `/contract`'s props/visual-states/a11y/motion framework
does not apply. The contract here is the **data/format contract**: seed schema in → three format targets out.

### 3.1 Input — the JSON seed (Style Dictionary token files)
> **Erratum (2026-08-03):** the code blocks below draft `$value`/`$type`, but the **shipped** pipeline uses classic
> `value`/`type` (no `$`) — see `tokens/*.json` + `build-tokens.mjs:44` (`'value' in node`). Follow the live code.
Three files under `packages/ui/src/themes/tokens/`, one per layer. Style Dictionary token format
(`{ "$value": ..., "$type": ... }`; references as `{group.name}`):
```jsonc
// primitive.json — raw values only, NO references
{ "color": { "blue": { "500": { "$value": "#3B82F6", "$type": "color" } } },
  "space": { "4": { "$value": "16", "$type": "dimension" } },
  "radius": { "md": { "$value": "8", "$type": "dimension" } } }
// semantic.json — references PRIMITIVE only
{ "color": { "surface": { "primary": { "$value": "{color.blue.500}", "$type": "color" } } } }
// component.json — references SEMANTIC (or primitive) only, never a raw literal
{ "button": { "background": { "primary": { "$value": "{color.surface.primary}", "$type": "color" } } } }
```
**Contract rules:** primitive entries hold literals only; semantic/component entries hold a single `{ref}` (no
literals) → violation = B2 build error.

### 3.2 Output targets (custom Style Dictionary formats — no built-in Tamagui format exists)
| File | Format | Shape |
|------|--------|-------|
| `variables.css` | custom CSS | `:root { --color-blue-500: #3B82F6; --color-surface-primary: var(--color-blue-500); … }` — path `a/b/c`→`--a-b-c` (B3 CSS scope), GENERATED banner |
| `tokens.ts` | custom TS | `export const tokens = createTokens({ color: { blue500: '#3B82F6', true: … }, space: { 4: 16, true: … }, radius: { md: 8, true: … } })` — primitive layer → categories, each with a `true` default `[FACT: context7]` |
| `themes.ts` | custom TS | `export const light = { colorSurfacePrimary: tokens.color.blue500, … }; export const dark = { … }; export const light_Button = { background: light.colorSurfacePrimary, … }` — semantic→base themes, component→`light_<Comp>`/`dark_<Comp>` sub-themes `[FACT: context7]` |

### 3.3 Build interface
- **Invocation:** `pnpm --filter @vida/ui tokens:build` → `style-dictionary build --config sd.config.mjs` (or a JS entry).
- **Exit codes:** `0` success (all targets written) · non-zero on dangling-ref / layer-skip / empty-layer, cause named on stderr.
- **Re-exports:** `packages/ui/src/index.ts` re-exports `tokens`, `light`, `dark`, and any `light_<Comp>` from `./themes/`.
- **Types:** `tokens.ts`/`themes.ts` are pure data — typecheck under strict `tsc --noEmit` with only `@tamagui/core` present, no `createTamagui`/config. `[FACT: context7]`

## 4. Acceptance (testable DoD)
- [ ] `packages/ui/src/themes/` has a Style Dictionary config + a 3-layer JSON seed (primitive/semantic/component).
- [ ] `pnpm --filter @vida/ui tokens:build` (script in `packages/ui/package.json`) produces, from the seed:
  - [ ] `tokens.ts` — a `createTokens({...})` call covering the categories the seed uses, importable from `@vida/ui`;
  - [ ] `themes.ts` — plain `light`/`dark` (+ any `light_<Comp>`) theme objects referencing those tokens;
  - [ ] `variables.css` — custom-property names matching design.md §XII (`--color-surface-primary` form).
- [ ] **`tsc --noEmit` (strict) passes on `tokens.ts`/`themes.ts` WITHOUT any `tamagui.config.ts` present** (proves DS-1↔DS-4 is not circular). `[FACT: context7 — createTokens/theme objects typecheck standalone]`
- [ ] **B2 proven:** a layer-skipping token in a test fixture makes the build exit non-zero.
- [ ] **B1/B3 proven:** every emitted CSS var and Tamagui token/theme key traces to a seed entry (per the §1 projection).
- [ ] **B4 proven:** two consecutive builds yield byte-identical output per target (no dated header, sorted keys).
- [ ] Output files carry the GENERATED banner.
- [ ] Seed is hand-authored (no Figma dependency); the DS-2 handoff point (real values authored **code-first** in the seed; Figma-later via MCP scripter) is documented.
- [ ] `[C]` `current-spec.md` + `current-business-rules.md` created for the themes context; `[L]` layer-doc for `themes/`.

## 5. Implementation Prompt
<!-- Draft — firms up after /contract fills §3. Numbered, ordered; each step cites a §2/§3 rule / §1 fact. -->
1. **Add deps** to `packages/ui/package.json`: `style-dictionary` (devDep) + `@tamagui/core` (dep — for the
   `createTokens` type + tokens the theme objects reference). Add script `"tokens:build"`. `[FACT: pkg has neither]` — §1.
2. **Author the 3-layer seed** `packages/ui/src/themes/tokens/{primitive,semantic,component}.json` — minimal
   throwaway set proving each layer references only the layer below: e.g. primitive `color/blue/500`; semantic
   `color/surface/primary`→`{color.blue.500}`; component `button/background/primary`→`{color.surface.primary}`.
   Satisfies B1, B2. `[FACT: design.md §II example]`
3. **Style Dictionary config** `packages/ui/src/themes/sd.config.mjs`: register the seed; a name transform for the
   CSS `a/b/c → --a-b-c` target (B3 CSS scope); a **reference-integrity + layer check** that fails the build on
   dangling-ref / layer-skip / empty-layer (B2); disable the dated header and sort keys (B4). Satisfies B3, B4, terminal states.
4. **Custom format emitters** (there is no built-in Tamagui SD format — write formatters): emit
   (a) `variables.css` (design.md §XII names, GENERATED banner), (b) `tokens.ts` = a `createTokens({...})` call
   mapping the **primitive** layer into Tamagui categories (`color/space/size/radius/zIndex`, with `true` defaults),
   (c) `themes.ts` = plain `light`/`dark` objects from the **semantic** layer + `light_<Comp>`/`dark_<Comp>`
   sub-themes from the **component** layer, referencing the tokens. Re-export `tokens.ts`/`themes.ts` from
   `packages/ui/src/index.ts`. Satisfies §1 output + the §1 projection table. `[FACT: context7 — createTokens categories; plain theme objects; light_<Comp> sub-theme naming]`
5. **Fixture tests** (Vitest): layer-skip token → non-zero exit (B2); valid seed → byte-identical double build (B4);
   every emitted name traces to a seed entry (B1/B3); `tsc --noEmit` on `tokens.ts`/`themes.ts` with no
   `tamagui.config.ts` present (non-circular, §1 NOT-list). Satisfies §4.
6. **Done-check:** run every §4 checkbox.

## 6. Open UNKNOWNs / Decisions Needed
- [DEFERRED to DS-4 — not blocking DS-1] **Web CSS-var reconciliation.** DS-1's `variables.css` uses design.md §XII
  names; Tamagui emits its own web CSS vars from `createTamagui` at DS-4. DS-4 decides whether Tamagui's runtime
  var names are aliased to the design.md names or the two coexist by scope. Recorded so it's a deliberate DS-4
  decision, not a surprise. `[INTERP: ADR-001:113 + BL-2]`
- [RESOLVED] Token source = hand-authored JSON seed, **code-first** (real values at DS-2; community Figma file +
  MCP-scripter bridge later, NOT Tokens Studio). Output = Tamagui `tokens.ts`/`themes.ts` + `variables.css`.
  `[Victor 2026-07-26; direction refined 2026-08-03]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-26 | 2026-07-26-ds-1-token-pipeline | initial draft (stub — /task-new) |
| 2026-07-26 | 2026-07-26-ds-1-token-pipeline | forward spec filled: §1·§2·§4·§5 (§3 → /contract); source + output decisions |
| 2026-07-26 | 2026-07-26-ds-1-token-pipeline | REVISE fixes: BL-1 (createTheme→plain theme objects), BL-2 (3-layer→Tamagui tokens/themes/sub-themes projection; B3 scoped per target), BL-3 (fabricated design.md cite → [DECISION]); N-1 standalone-typecheck acceptance; N-2 SD header/sort determinism. Tamagui API verified via context7. |
