# fe-settings — Envision Gate

> Entity Delivery Flow ② · Step 1.5. The gate FIRED (§3.75 = YES: a searchable settings index + a theme-preset
> switcher have no obvious UI answer from a shipped surface). Reviewer = **Victor (human, blocking)**.
> Greybox = a THROWAWAY Storybook story (`packages/ui/src/components/__envision-settings__.stories.tsx`, real
> @vida/ui primitives + fake data), rendered in Brave; **deleted after this gate**. Screenshots: `/tmp/vg-fe-settings-envision/`.
> Grounded in the OS System-archetype specimen `[FACT: p6-archetypes-design.html:297-304]` + `docs/features/preferences`.

## Greybox coverage (rendered + reviewed)

| Screen / state | Shot |
|---|---|
| Default (Appearance pane) | `Default__editorial-light__1440.png` · `…reader-dark…` · `…375` |
| Modules (show/hide + inline rename + Surfaces toggles) | `ModulesPane__editorial-light__1440.png` · `…reader-dark…` · `…375` |
| Search — matches / no-match | `SearchMatches…` · `SearchNoMatch…` |
| Loading / ReadError / Saved | `Loading…` · `ReadError…` · `Saved…` |

## Decisions taken at the gate

- **D-ENV-1 — Booleans use a NET-NEW `Switch` primitive (pill toggle), not Checkbox.** Victor's call (2026-10-12).
  The OS specimen shows pill toggles; @vida/ui ships none. → A net-new @vida/ui `Switch` is the FIRST slice, then used
  for every Settings boolean (reduce-motion, module show/hide, Feature Atlas, sync-log, notification channels). **EC-3.**

## ✅ GATE APPROVED — Victor, 2026-10-12. All 12 checkpoints pinned as-is; greybox deleted.

## Anchored checkpoints (EC-n)

> `structural` = greybox-provable → MUST map to ≥1 slice + a Visual-Gate MUST. `feel` = deferred to the live per-slice Visual Gate.

| EC | Checkpoint | Screen/state | Type |
|---|---|---|---|
| **EC-1** | Two-pane **System layout**: left category rail (Appearance·Locale·Notifications·Modules·Data·Account) + right pane (search on top → sectioned option rows). | Default | structural |
| **EC-2** | **Option-row pattern**: label (+ optional muted `$small` description) left · control right · hairline divider. | all panes | structural |
| **EC-3** | **`Switch` primitive** (pill toggle) is the boolean control everywhere. | new primitive · Appearance/Modules/Notifications | structural |
| **EC-4** | **All 7 controls present + wired**: theme-preset · mode · density · reduce-motion · home-arrangement (Appearance); module show/hide · inline rename · Feature Atlas · sync-log visibility (Modules/Surfaces). | Appearance + Modules | structural |
| **EC-5** | **Theme keystone — live apply**: changing preset/mode/density re-themes the WHOLE app instantly (the new app theme store feeds `UIProvider`, replacing the `THEME_DEFAULT` constant). | Appearance | structural (instant-ness = feel) |
| **EC-6** | **Searchable index**: one index drives both the search box (filter across all categories) AND the section grouping; no-match → calm `role=status` + hint. | Search | structural |
| **EC-7** | **Honest states**: loading skeleton · read-error → defaults read-only + "your data is safe on this device" · write → optimistic + "Saved on this device" + revert-on-error (no cloud language, M1). | Loading/ReadError/Saved | structural |
| **EC-8** | **Reachability (≥2 + escape hatch)**: Settings reached from the shell Bar-1 AND ⌘K; module-visibility can never hide the path back to Settings. | reachability | structural |
| **EC-9** | **Delegated sections**: Account/Security + Data import-export render as calm "a later release" placeholders (owners M3/M4), visually distinct from live controls. | Data/Account | structural |
| **EC-10** | **Responsive**: two-pane ≥768 → single column at 375 (nav above pane), no overflow. | 375 | structural |
| **EC-11** | **Editorial voice**: serif section titles · quiet muted descriptions · accent spent sparingly (nav tick + active control) · warm-dark readable (full-matrix AA). | all | feel |
| **EC-12** | **Inline rename feel**: pencil → inline edit with clear save/cancel; light, non-modal. | Modules | feel |

## Open design decisions the greybox made (Victor to confirm with the EC set)

1. **Nav-rail active style** = custom pressable row (3px accent left border + `$colorSurfaceSecondary` fill + 600 weight), mirroring `.i.on` + the list-view tick. No shipped nav primitive. (→ EC-1)
2. **375 responsive** = pure flexWrap stack (nav above pane), no drawer/horizontal strip. (→ EC-10)
3. **Inline rename** = pencil → Input swap; the greybox showed no explicit save/cancel — EC-12 asks for them.
4. **Search** = flat result list + per-row category eyebrow + count; no-match = EmptyState in `role=status`. (→ EC-6)
