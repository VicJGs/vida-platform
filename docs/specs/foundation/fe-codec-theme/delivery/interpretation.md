# fe-codec-theme — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-213 · ② Frontend CODEC #1 · `ThemeProvider` pattern-kit primitive (decomposition.md §1.3).
> **Scope:** web, M1.0. EXTENDs `ds-2` (token pipeline) + `ds-4` (`tamagui.config.ts`/`provider.tsx`).
> **Method:** process.md §6 Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen ds-2/ds-4
> contracts + the G1 Quality Bar (P1 Identity) + the P1 identity specimen. No guessing — open gaps go to Victor (Step 2)
> or the Envision Gate (Step 1.5) before any code.

---

## 0. What this unit is

The reusable `ThemeProvider` codec every surface inherits: **N theme presets × mode × density**, with **no hard-coded
palette anywhere** and **swappable token families incl. font-family** [FACT: decomposition.md:38 §1.3; frontend-quality-bar/_index.md:63 P1].
It ships the **engine + presets + state contract** — not the switcher UI (that is Settings, a later unit).

Captured P1 intent (the feel, ✓ locked) [FACT: p1-identity-specimen.html:297-300]:
- Metaphor = book / living journal · Voice = **editorial** · **Light primary** · **Density adaptive**.
- **Three user-chosen presets**, default **The Editorial + calm density** [FACT: frontend-quality-bar/_index.md:63-66 P1]:
  - **A — The Reader** — Fraunces + Newsreader · warm ivory · oxblood accent · most book-like [FACT: p1-identity-specimen.html:174-175].
  - **B — The Editorial** *(default)* — Spectral headlines + Inter chrome · cool paper · ink-blue accent [FACT: p1-identity-specimen.html:201-202].
  - **C — The Quiet Desk** — Source Serif 4 + IBM Plex Sans · warm gray · olive accent · most calm [FACT: p1-identity-specimen.html:237-238].

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **ds-2 token pipeline** — 3-layer JSON (`primitive → semantic → component`), Style Dictionary → generated
  `tokens.ts`/`themes.ts`/`fonts.ts`/`motion.ts`/`shadow.ts`/`variables.css`. **The JSON is the only editable input;
  generated files are DO-NOT-EDIT** [FACT: packages/ui/src/themes/CLAUDE.md:21,32]. Dark = `semantic.dark.json` overlay
  loaded by filename [FACT: themes/CLAUDE.md:11]. 4pt-grid on `space.*` fail-loud (B8) [FACT: themes/CLAUDE.md:36].
- **ds-4 tamagui config** — `createTamagui({ themes: {light, dark, + 20 light_/dark_<Comp>}, fonts: {body, display}, animations, media })`
  [FACT: packages/ui/src/tamagui.config.ts:93-124]. Two `createFont` families over ONE shared role-keyed scale
  [FACT: tamagui.config.ts:39-80]. Ratio→px line-height conversion happens at this boundary (DEF-U4-e) [FACT: tamagui.config.ts:44-50].
- **ds-4 provider** — `UIProvider` passes resolved `theme` as Tamagui `defaultTheme`; `ThemeName = 'light' | 'dark'`;
  **app owns theme STATE (Zustand, AR-4) — but it does not exist yet** [FACT: packages/ui/src/provider.tsx:1-4,13-26].
- **App wiring** — `apps/web/src/App.tsx` hardcodes `<UIProvider theme="light">`; no theme store anywhere in `apps/web`
  [FACT: apps/web/src/App.tsx:71; grep: no themeStore in apps/web/src].
- **user_preferences** — the persistence target; theme-preset = net-new field, density → extend existing
  `compact_mode`/`font_size` (ADR-002 §5.17) [FACT: frontend-quality-bar/_index.md:87-90 P5].
- **Palette/fonts today = provisional placeholder** (indigo/slate/emerald + Space Grotesk/Inter) — explicitly NOT brand;
  "a brand pass swaps VALUES only + re-runs the Visual Gate" [FACT: themes/CLAUDE.md:50].

Current semantic surface (the swap boundary) [FACT: themes/tokens/semantic.json]: `color.{surface,text,brand,focus,border,signal}`
· `space.inset.{compact,default,loose,spacious}` · `radius.{control,card,pill}`.

## 2. NEEDS (what unit #1 must deliver)

1. A **preset axis** — N (=3) swappable token families, each = {palette + accent + display/body font-family}; the current
   single family becomes one preset (or is replaced).
2. A **density axis** — user-controlled, orthogonal to preset/mode; swaps spacing (`space.inset`) and the type ramp.
3. **mode** — light + dark, preserved from ds-4 (light primary).
4. A **typed state contract** `{preset, mode, density}` + a resolution function the provider consumes, + a persistence seam
   (`user_preferences`), with honest cold-start defaults (Editorial + calm + light).
5. A **font-loading strategy** for the N-family system (~5 families, live type-ramp swap, a font budget) [FACT: frontend-quality-bar/_index.md:56 §2.8].
6. **No hard-coded palette** preserved; all preset values flow through the token layers.

## 3. ORGANIZATION (where it slots)

```
tokens/*.json (per-preset families + density scale)   ← ds-2, the editable input
      → build-tokens.mjs                              ← ds-2 emitter (may need a preset loop)
      → themes.ts / fonts.ts (generated)
            → tamagui.config.ts (createTamagui themes × N, createFont × families)   ← ds-4
                  → provider.tsx (resolve {preset,mode,density} → Tamagui theme + font)   ← this unit's core
                        → theme state (store + persistence seam)   ← this unit (scope TBD, Gap Q1)
                              → App.tsx (<UIProvider ...> fed by state)   ← this unit rewires
                                    → every surface inherits   ← codec payoff
      (switcher UI = Settings, a LATER unit — OUT of scope)
```

## 4. IMPLICIT RULES (caught here, not in the browser)

- Never hand-edit a generated file — edit `tokens/*.json` + `pnpm --filter @vida/ui tokens:build` [FACT: themes/CLAUDE.md:32].
- Semantic/component layers hold refs only, never literals; no semantic↔primitive path collision (SD deep-merge drops children) [FACT: themes/CLAUDE.md:33-35].
- `space.*` integer ×4 (B8); deterministic build, no timestamps (B4) [FACT: themes/CLAUDE.md:36,49].
- Theme/density swap must honour `prefers-reduced-motion` (instant, no animated palette) and animate only transform/opacity (B12) [FACT: themes/CLAUDE.md:44-48; frontend-quality-bar/_index.md:53 §2.7].
- Consume frozen ds-2/ds-4 contracts; if a contract looks wrong, STOP — do not patch the frontend around it [FACT: process.md:113].
- Copy/claims honesty: no ZK-sync claims in M1 (not relevant to tokens, but the Settings seam must not overclaim) [FACT: frontend-quality-bar/_index.md:43 §2.2].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts the P1 decision this codec exists to implement
- **W1** `ThemeName = 'light' | 'dark'` + single-family `createTamagui` **cannot express preset × density** — the core P1
  requirement (3 swappable families incl. font-family) has no representation [provider.tsx:13; tamagui.config.ts:93-124 vs quality-bar P1].
- **W2** `apps/web` hardcodes `theme="light"` with **no user-control path** — contradicts "the user controls their own
  surfaces" and "light **primary**" (dark must be reachable) [App.tsx:71 vs quality-bar/_index.md:142 §4.6, 64 P1].
- **W3** Placeholder type (Space Grotesk/Inter) + palette **contradict every preset's type pairing** (Fraunces/Spectral/
  Source Serif 4…) — provisional by design, this unit is where the N-family arch lands [themes/CLAUDE.md:50 vs specimen:174-238].

### MISSING — the bar requires it, nothing exists
- **M1** **No density axis** — `space.inset` exists but is not wired to a calm/dense mode; no type-ramp density [semantic.json:24-31 vs quality-bar P1 "density user-controlled"].
- **M2** **No theme STATE API / persistence** — the provider promises "app owns state (Zustand)" but it does not exist; the codec needs a typed contract even if the UI is later [provider.tsx:1-4].
- **M3** **No font-loading strategy** — no @font-face/self-host/swap/budget for the N-family system [quality-bar/_index.md:56 §2.8].
- **M4** **No defined swap transition** — reduced-motion is handled for component animation but theme/density switch behaviour is undefined [quality-bar §2.7].
- **M5** **No `user_preferences` reconcile** — theme_preset (net-new) / density (extend `compact_mode`/`font_size`) not wired [quality-bar/_index.md:87-90 P5].

### OVERFLOWING — past this unit's job
- **O1** The theme/density **switcher UI** → Settings (later unit), not this codec [decomposition.md:71 §3; task Goal].
- **O2** **"Adaptive density" (auto-by-context / per-view)** is a P2/P3 vision explicitly flagged open — ship the
  **user-controlled** density mechanism only; defer adaptive-by-context [specimen:288-290].
- **O3** **Per-preset component sub-themes (20 × 3 = 60)** is likely over-engineering if presets differ only by
  palette+font over a shared semantic contract — resolve the sub-theme strategy at decomposition [specimen:162 "differ only in type pairing, paper warmth, accent"].

---

## 6. RESOLVED BY DOCS (stated as FACT — no decision owed to Victor)

**Preset / feel:**
- **R1 Preset token boundary** = color (palette + paper warmth + accent) + type (display/body family) **only** — NOT
  radius/shadow/density ("differ **only** in type pairing, paper warmth, and accent") [FACT: specimen:162].
- **R2 Default** = The Editorial + calm density + light [FACT: quality-bar/_index.md:64-66].
- **R3 Density affects both** spacing and type size (maps to `compact_mode` + `font_size`) [FACT: quality-bar/_index.md:88].
- **R4 Switcher UI is out** (Settings) [FACT: decomposition.md:71].

**Architecture (the four I wrongly raised as gaps — all doc-fixed):**
- **R5 State scope** — the codec ships the **provider MECHANISM + typed contract only**. **Theme state = app Zustand
  (AR-4)**; its **persistence** (theme-preset = net-new `user_preferences` field) + the **toggle UI** are the app's
  (Settings/UX-3/UI-4), not this codec. The provider takes the resolved `{preset, mode, density}` as props, exactly as
  it takes `theme` today [FACT: docs/ui/token-pipeline/current-spec.md:89 "[RESOLVED — DS-4]… state = app Zustand";
  current-business-rules.md:76; packages/ui/src/provider.tsx:1-4; quality-bar/_index.md:87 P5].
  → So **W2's fix** (the hardcoded `theme="light"`) is: the codec makes the provider *capable*; App feeds the resolved
  default (Editorial/calm/light) through the new contract; the live store + switch arrive with Settings. Not a #1 gap.
- **R6 Fonts** — **real fonts, self-hosted, with a font-loading budget** (N swappable families incl. font-family; the
  six named faces: Fraunces/Newsreader · Spectral/Inter · Source Serif 4/IBM Plex Sans) [FACT: quality-bar/_index.md:56
  §2.8, 63 P1; specimen:175,202,238]. *(Victor-confirmed.)*
- **R7 Dark matrix** = **preset × {light, dark}** for all three — dark is a first-class switchable theme (B14) and
  presets are families; light is primary [FACT: tamagui.config.ts:6 B14; themes/CLAUDE.md:11 dark overlay;
  quality-bar/_index.md:63 P1]. *(Victor-confirmed.)*
- **R8 Density levels** = **2 (calm / dense)**, the `compact_mode` boolean; type size via `font_size` (OPEN vocab,
  app-validated, no CHECK); adaptive-by-context deferred (O2) [FACT: ADR-002:3524-3525; specimen:268,288 "two airs";
  db-4-preferences PLAN:23].

## 7. NO OPEN GAPS — proceed to decomposition

All architecture is doc-fixed (§6); the feel is already gated (§8). Nothing is owed to Victor. → Step 2 Decomposition.

## 8. Envision Gate (Step 1.5) — SATISFIED by the gated P1 record (no re-run)

The design-led feel for this codec was **already captured and gated** at the frontend-replan G1:
- **The greybox equivalent exists** = `frontend-replan/p1-identity-specimen.html` (the P1 identity specimen, "the visual
  record of the bar") [FACT: quality-bar/_index.md header; frontend-replan.md:47-51].
- **Victor approved it** = P1 RESOLVED 2026-10-01 + G1 SHIP [FACT: frontend-replan.md:47-55, 207-208].
- **Dark is not a feel decision** — it is the mechanical B7 `semantic.dark.json` overlay applied per preset; "dark now
  inherits the overlay by construction" [FACT: decisions.md:240,287; semantic.dark.json; frontend-replan.md:51 "light primary (all presets daylight/paper)"].

→ Re-greyboxing would redo gated work. The per-slice **Visual Gate (Step 8/§6.4)** still verifies the *rendered* result
(presets × modes × densities) against the P1 specimen — that is verification, not a new feel gate.
