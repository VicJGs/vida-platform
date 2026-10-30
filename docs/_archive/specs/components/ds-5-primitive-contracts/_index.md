# Spec: component:ds-5-primitive-contracts

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: in progress (2026-08-05 — 10 contracts + component.json full set; components-gate critique REVISE→4 fixed; @vida/ui 31/31, typecheck 0, tokens:build ✓, source-model guard ✓. **No token Visual Gate**: DS-5 introduces no new token VALUES — its component tokens are references into DS-2's already-gated semantic values; per frontend-visual-gate.md's render table DS-5 sits in the **Components/Storybook** row, deferred to its first-consumer unit **UI-1**. DS-5 ships on the normal §XXVI gate. In progress = unmerged (PR #6).) <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-05-ds-5-primitive-contracts.

<!-- FORWARD spec (document-first — design-system). Describes the 10 primitive contracts + the
     component-token set DS-5 firms. The per-primitive contracts are authored in Step 3. -->

## 0. Source model (direction — inherited from DS-2)

The frontend's source of truth is the **documented intent** (ADRs, specs, design.md), realized
**code-first**: the hand-authored `tokens/*.json` seed + coded artifacts are the authored source during
M1; the community-forkable **Figma file is built later** as a faithful reflection. This spec keeps its
component tokens + contracts aligned to design.md so "Figma-later" is a projection, not a reconciliation.
Pointer: `docs/specs/foundation/frontend-source-of-truth.md` (enforced by `pnpm check:frontend-source-model`).
`[MEM: frontend-source-of-truth-is-documented-intent]`

## 1. Identity

**DS-5 — Primitive contracts (component API standard)** (LIF-85) — M1.0 `#20`, Design System.
Depends: DS-4 (done). **Blocks UI-1** (`#27`, which _implements_ against this). [FACT: m1.0-delivery-plan.md:193]

**Deliverable = two coupled outputs, both DS-5's:**

1. **The API + visual-state contracts** for 10 primitives (authored, per `components §VII`+`§VIII`).
2. **The full component-token set** in `packages/ui/src/themes/tokens/component.json` — DS-2 deliberately
   left only DS-1's Button _proof_ and **assigned the full set to DS-5**. [FACT: ds-2 spec:54 "component
   tokens beyond DS-1's proof are firmed at DS-5"; :101 "full set = DS-5"]

**The intent model is three-layer** (design.md §II): components → **component tokens** → semantic →
primitive. So `intent="secondary|ghost"` does NOT resolve to a flat semantic token — it resolves through
a component token (e.g. `button.background.secondary → {color.surface.secondary}`). DS-5 firms those
component tokens; the semantic/primitive layers stay DS-2's. [FACT: design.md §II "button/background/
primary → {color/brand/primary}"; component.json currently = button.background.primary only]

**The 10 primitives** [FACT: task goal]: Button · Input · Select · Checkbox · Card · Dialog · Popover ·
Toast · Tabs · Menu.

### What it is NOT

- **NOT the implementation.** `/new-component`, real `.tsx`, Storybook = **UI-1** (`#27`). DS-5 authors
  contracts + component _tokens_, not component _code_. [FACT: delivery-plan:199 UI-1 "← DS-5"]
- **NOT the semantic or primitive token layers.** DS-5 adds **component** tokens only; each must reference
  an existing semantic token — a semantic token it needs that is genuinely absent is flagged to DS-2, not
  invented. (Current semantic set covers the 10's needs: surface{primary,secondary,inverse}, text{…},
  brand{primary,emphasis}, focus.ring, border.default, signal{success,danger} — [FACT: semantic.json].)
- **NOT the token pipeline / Figma steps** (scenario Steps 1–3) — DS-1→4.

## 2. Shared conventions — every contract obeys these

Grounded in `components.md`:

- **Semantic props, never visual** — `disabled`/`invalid`/`selected`/`loading`/`required`;
  `intent="primary|secondary|ghost|danger"`, `size="sm|md|lg"`. No `color=`/`style=`/layout-boolean.
  [FACT: components §VII]
- **Slots** (`leading`/`trailing`/`header`/`footer`/`actions`), never a position enum. [FACT: §VII]
- **TypeScript:** strict; zero `any`/`!`; discriminated unions for exclusive combos; exported
  `[ComponentName]Props`; forwardRef on every interactive primitive. [FACT: §VII]
- **8 visual states (all applicable):** default · hover · focus · active · disabled · loading · error ·
  **empty**. ⚠ task lists 7; `§VIII` mandates 8 (`empty`) — standard governs. Row = `State | Trigger |
Visual (exact) | Token used`, and **Token used cites a component token** (three-layer). [FACT: §VIII]
- **Contract shape (7 sections):** Intent · API · Visual States · Motion (+reduced-motion) · Accessibility
  (role/name/states/keyboard/SR) · Performance Budget · Acceptance. [FACT: ~/.claude/commands/contract.md]
- **Contrast rule (DS-2 hand-off):** filled-on-brand text uses `brand.emphasis` (brand.600), not
  brand.500 (white-on-brand.500 = 4.47, under AA 4.5). [FACT: ds-2 spec:169]
- **Motion B12:** every animation animates **only** `transform`/`opacity`/`clip-path` — never
  `background`/`color`/`border`/`shadow`/size. A fill change is an instant state swap; the animated feel is
  an overlay's opacity. Plus a `prefers-reduced-motion` instant alternative. [FACT: themes/CLAUDE.md B12]

### 2.1 Token layers (verbatim from the shipped surface — no invention) [FACT: themes/tokens/*.json]

- **Semantic (DS-2, referenced — these have a semantic→primitive layer):** `color.surface.{primary,
secondary,inverse}` · `color.text.{primary,muted,inverse}` · `color.brand.{primary,emphasis}` ·
  `color.focus.ring` · `color.border.default` · `color.signal.{success,danger}` ·
  `space.inset.{compact,default,loose,spacious}` · `radius.{control,card,pill}`. [FACT: semantic.json]
- **Primitive, consumed directly (NO semantic layer — cited straight in contracts by design):**
  `zIndex.{dropdown,overlay,modal,toast}` (a structural scale — there is no `zIndex` semantic alias; a
  panel references the primitive z-index directly, like a raw scale). Motion `duration.{instant,fast,
moderate,slow}` / `easing.{in,out,inOut,linear}` are **AUX** — routed to `createAnimations`, NOT a
  Tamagui token category and NOT part of the color/space/radius three-layer model (themes/CLAUDE.md B9/B11).
  So Motion Specs cite them from the primitive/motion layer, not via a component token. [FACT: primitive.json; themes/CLAUDE.md]
- **Component (DS-5 firms, full set):** each contract's `background`/`text`/`border`/etc. is a
  `component.<name>.*` token → a `{group.name}` ref into the **semantic** layer (design.md §II:
  component→semantic only). This three-layer rule applies to color/space/radius; z-index + motion are
  the two documented exceptions above. [FACT: component.json]

## 3. Build sequence (atomic → molecular → organism) [INTERP: victor:planning; components §VI]

1. **Atomic:** Button · Input · Checkbox 2. **Molecular:** Select · Card · Tabs · Menu
2. **Overlay/organism:** Dialog · Popover · Toast (each cites its `zIndex` token)
   Per primitive: author contract → firm its `component.json` tokens → `tokens:build` stays green → `/critique`.

## 4. Definition of Done

- 10 contract files under `docs/specs/components/ds-5-primitive-contracts/`, each complete on 7 sections +
  applicable 8 states, every visual cell citing a **component** token that resolves to a real semantic one.
- `component.json` firmed to the full set; `pnpm tokens:build` deterministic + green; `@vida/ui` tests +
  root typecheck green (component tokens flow through tokens.ts/themes.ts).
- No component `.tsx` (UI-1). No semantic/primitive token added (DS-2) unless a flagged genuine absence.
- Each contract `/critique`d; set passes `victor:quality-gate-components` + `quality-gate-design`;
  **Frontend Visual Gate** (like DS-2/3/4, since token output changes).
- `## 0. Source model` present (guard green). `[C]` currency + `[L]`; commit.

## 5. Process note (corrected)

NOT the pure-docs "lite" path — DS-5 changes `component.json` (token-pipeline output), so it carries a
real **build + Visual Gate** like DS-2/3/4. Still document-first: contract before its tokens.

## 6. Open questions

- **OQ-1 [RESOLVED via docs]:** the "missing secondary/ghost token" is **not a gap** — firming the full
  component-token set is DS-5's assigned job (ds-2:54/:101), resolved at the component-token layer
  (design.md §II). DS-5 authors `button.background.{secondary,ghost,danger}` etc. referencing semantic
  tokens; nothing fabricated at the semantic layer.
- **OQ-2:** one shared `_index.md` + one contract file per primitive. [INTERP: /contract is per-component]
- **OQ-3 [RESOLVED]:** process = document-first + build + Visual Gate (not lite), per §5.
