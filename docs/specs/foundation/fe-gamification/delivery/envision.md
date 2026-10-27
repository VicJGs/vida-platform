<!-- Envision Gate — fe-gamification (LIF-181) · Entity Delivery Flow ② Step 1.5 · APPROVED 2026-10-12 (Victor) -->
<!-- The human-pinned anchored checkpoints. structural = greybox-provable → decomposition coverage + a blocking
     Visual-Gate MUST; feel = deferred to the live per-slice Visual Gate. Reviewer = Victor (vision review). -->

# Envision — Gamification ("the System") ②

**Gate fired** (§3.75): the System hub composition + the rule-authoring flow are user affordances with no
obvious shipped answer. Greybox (throwaway `apps/web/src/__envision__/gamification.tsx`, deleted post-gate)
covered both registers × the 5 modes + the Flow. **APPROVED after 6 iterations** — each a doc-grounding
correction (invented quests, register=reward-framing-not-theming, Dreams=reward-target, single-dashboard→
multi-mode top view, emojis→icons, the overflow layout bug).

## Scope (doc-exact — the gate did not expand it)
A **multi-mode top view** (IA §4; `hasMultiModeTopView:true`, `hasStandalonePages:false`) over the module's
own data — **currencies · levels · achievements** — + a **rule-authoring Flow**. All list modes paginate
(50/page). `[FACT: view-intent-harvest.md:36; decomposition.md:105; information-architecture.md:84-90;
performance-strategy.md:413]`

## Pinned checkpoints

| EC | Screen / state | Checkpoint | Type |
|----|----------------|-----------|------|
| **EC-1** | theme (G0) | `game` GLOBAL preset = a token family (primitive ramps + `semantic.game(.dark).json` overlay + game fonts), **AA-verified light+dark**, token-pure, regenerated via the Style-Dictionary seed; extends `ThemePreset`/`THEME_PRESETS`/`ThemeName`/`resolveTheme` | structural |
| **EC-2** | theme (G0) | the game preset READS as a motivating manhwa-"System" — a token-system *sibling* to editorial/reader/quietDesk, not a clash | **feel** |
| **EC-3** | top view | **multi-mode switcher** — Overview · Currencies · Achievements · Rules · Activity; content lives in the modes (no routed detail pages) | structural |
| **EC-4** | Overview | level + title + XP-to-next (calm = number + honest bar · game = ring) + currency balances + recent achievements; `deriveLevel`/`getBalances`/`summary` | structural |
| **EC-5** | Currencies | ALL **user-defined** currencies **grouped by the 3 backing kinds** (real-money · measured-time · self-granted allowance); each shows current + 🔒 locked; **paginated 50/page**; `+ New currency`; 0..N safe | structural |
| **EC-6** | Achievements | ALL achievements by **category × tier** + progress toward locked; calm = list, game = trophy wall (medallions); **paginated** | structural |
| **EC-7** | Rules | ALL rules + enable/disable/delete; **paginated**; `+ New rule` → the Flow | structural |
| **EC-8** | Activity | the **consequence-ledger** history; **paginated** | structural |
| **EC-9** | Rule Flow | guided condition → reward → review/enable. Condition reads the **advertised measurement registry** (ADR-011 §3.6 — open set, **honest empty-seam state at M1**). Reward spans money · allowance · time and **may earmark a Dream** (GM-7) | structural |
| **EC-10** | framing | persona (deny-safe Preferences read) drives **reward COPY only** (Quests/Treasure/Loot ↔ Rules/Boxes/Reward), **never theming** (GM-16) | structural |
| **EC-11** | discipline | icons = **lucide/SVG, never emoji** (EC-15 house rule); **compose/read, don't rebuild** — Dreams(Purposes)/boxes(Finance) = reward targets, streaks(modules) = reads; quests/challenges = **Spaces**, INTENDED-later, OUT | structural |
| **EC-12** | all | all 8 interaction states + 375/768/1440 + **both presets × light/dark**; **no overflow / no overlap** (content-height containers — the greybox `Panel` flexBasis trap; the real build composes shipped `CollectionView`/`Card`) | structural |

## Re-pin — Victor, 2026-10-21 (golive-replan process.md §2.5 rule 3; recorded by preferences-rescope at its Re-scope Gate)
> "The thing is that game was not supposed to be a theme, check the documentation, it is supposed to be a module, with a
> currency and complementary system to help the user and gamify his life." (Victor)

**EC-1 + EC-2 (the `game` GLOBAL preset) are re-pinned as drift**, and so are the preset branches of EC-4 ("game = ring"),
EC-6 ("game = trophy wall") and EC-12 ("both presets"). The System is the gamification **module**: an incentive/consequence
engine with a multi-currency economy (`docs/features/gamification/identity.md:5-30`), never a visual theme. EC-10 stands:
persona drives reward **copy** only. **Correction owner: gamification-rescope** (remove the `game` token family / G0 from
`@vida/ui` + `THEME_PRESETS`, and re-express EC-4/EC-6/EC-12 without a preset branch). The register note below is superseded.

## Register note (the architecture, doc-resolved) — *superseded 2026-10-21, see Re-pin above*
`game` is a **global preset** applied via the Preferences/Onboarding theme picker (GM-16 — the System does NOT
own theming); persona → suggest-`game`-at-onboarding is **Onboarding's** hand-off, not this unit. The System
reads persona only for reward COPY (EC-10).

## Coverage → every `structural` EC maps to ≥1 slice (see slice-map.md)
EC-1/2 → G0 · EC-3 → S7 · EC-4 → S1 · EC-5 → S2 · EC-6 → S3 · EC-7 → S4 · EC-8 → S6 · EC-9 → S5 ·
EC-10 → S7 (framing read) · EC-11 → all (convention) · EC-12 → all (per-slice Visual Gate).
