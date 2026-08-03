# Token Pipeline — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/ui` → `packages/ui/src/themes/`. Built by DS-1 (LIF-81), 2026-07-26. Companion:
> `current-spec.md`. Sources: ADR-001 (Tamagui + Style Dictionary), STANDARDS design.md §II/§XII,
> `docs/specs/components/ds-1-token-pipeline/_index.md`. **No-Guessing:** `[FACT: src]` / `[INTENT]` (owed).

## Invariants the pipeline upholds
1. **[FACT] B1 — Single source.** Every emitted value (CSS var, Tamagui token, theme key) traces to exactly one
   seed entry; no value authored twice; no duplicate path across layers. `[design.md §II; build-tokens.mjs checkLayers]`
2. **[FACT] B2 — Three-layer indirection, never skipped.** primitive = literal; semantic references primitive only;
   component references semantic only. A raw literal in a non-primitive layer, a layer-skip, a dangling reference,
   or an empty layer **fails the build loud** (non-zero exit, cause named). `[design.md §II lines 55–79; checkLayers; proven live]`
3. **[FACT] B3 — Naming, scoped per target.** CSS target: seed path `a/b/c` → `--a-b-c` (design.md §XII). Tamagui
   target: Tamagui's schema (flat category tokens accessed `$name`; theme keys; `light_<Comp>` sub-themes) — NOT the
   CSS-var name. The two targets differ in name shape by design; each is deterministic. `[design.md §XII; @tamagui/core]`
4. **[FACT] B4 — Determinism.** Same seed → byte-identical output per target (tokens sorted by path; no dated header).
   `[build-tokens.mjs; vitest "second build is byte-identical"]`
5. **[FACT] B5 — Generated, never hand-edited.** Every output carries a "GENERATED — DO NOT EDIT" banner; the seed
   is the only editable input. `[build-tokens.mjs BANNER/CSS_BANNER]`

## Rules established by DS-1 (IMPLEMENTED 2026-07-26)
- **[NEW]** design.md §II three-layer architecture is now **enforced mechanically** by the build (B2), not by review
  convention — a layer-skip cannot ship. This is the design-gate "three-layer" item passing *by construction*.
- **[NEW]** design.md §XII CSS-var naming is **enforced** by the CSS formatter (`--<path-with-dashes>`).
- **[NEW]** DS-1 ⊥ DS-4: the Tamagui token/theme modules typecheck **standalone** (no `tamagui.config.ts`), so the
  pipeline is not circularly dependent on the app config DS-4 builds. `[FACT: typecheck green]`

## Boundaries (what DS-1 does NOT own — owed downstream)
- **[INTENT: DS-2]** The token **values** and the Figma Variables → Tokens Studio source. DS-1's seed is throwaway.
- **[INTENT: DS-4]** `tamagui.config.ts` (`createTamagui`), provider, dark-mode wiring, and the CSS-var
  reconciliation (whether Tamagui's own web vars are aliased to the design.md `variables.css` names or coexist by scope).
- **[INTENT: DS-2 hardening]** Dimension CSS vars carrying units (`px`) — DS-1 emits raw numbers to match Tamagui.
