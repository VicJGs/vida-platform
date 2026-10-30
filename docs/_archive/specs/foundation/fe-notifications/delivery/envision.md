<!-- Entity Delivery Flow ② · Step 1.5 — Envision Gate · fe-notifications (LIF-192) -->

# fe-notifications ② — Envision Gate

> **Status: APPROVED (Victor, 2026-10-12).** The greybox was rendered live in the real app (Brave, real
> `@vida/ui` tokens/fonts) across presets × modes. Decision below. Greybox retained at Victor's request
> (`apps/web/src/__envision__/`) for continued exploration; removed before the PR / folded into the real views.

## Decision — a multi-lens notifications surface ("pick how your System speaks to you")

The baseline list was rejected as "too normal — not a Vida OS experience." The approved design: **one
notifications surface with a user-selectable LENS.** All three directions ship; the user chooses.

| Lens                                  | What it is                                                                                                                         | Vida grounding                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **The Margin** _(flagship / default)_ | A vertical time-spine with a living **now-line**; anticipations (not-yet-fired reminders) fade in above now, settled alerts below. | Derive-until-fire (`tick`/`dueIn`/`hard_deadline`, NF-3) made visible; reuses Timeline now-fulcrum; Journal day-model. |
| **Dispatches**                        | A calm daily **briefing** in the System's out-loud voice; narrative time-groups, serif prose.                                      | The contract's "out-loud voice"; CODEC editorial serif; privacy-intimate.                                              |
| **Constellation**                     | Attention as a **map of your life** — alerts orbit the life-areas they concern (the shipped NeuralGraph).                          | Entity-linking/backlinks; life-OS connective tissue.                                                                   |

**Lens choice is a user preference**, persisted **locally** at M1 (app-local UI state — NO new `@vida/core`/
Preferences schema field; sync-deferred like every other write). Default = **The Margin**.

## Checkpoints (EC-n) — structural = slice-coverage + Visual-Gate MUST · feel = live per-slice gate

| EC       | Type       | Checkpoint                                                                                                                                                                                   |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EC-1** | structural | Surface is ONE route at `/notifications` (shipped Bell nav link) with a **lens switcher**; lens choice persists locally, default = The Margin.                                               |
| **EC-2** | structural | **The Margin:** vertical time-spine; the **now-line** is the signature; anticipations render ABOVE now (derived, hollow/faded), settled BELOW (solid); entity chip + System voice per entry. |
| **EC-3** | structural | **Dispatches:** serif prose briefing grouped by narrative time (This morning / Earlier / Still ahead); first-person-System voice; whitespace-led.                                            |
| **EC-4** | structural | **Constellation:** life-area hubs with count badges + orbiting alert dots (the NeuralGraph); "you" at center; tap an area → its alerts.                                                      |
| **EC-5** | structural | Severity is quiet by default — only `error`/`warning` earn a warm marker; the other 4 types read through **shape + position, not hue alone**; AA both modes incl. warm/olive dark.           |
| **EC-6** | structural | **NOT-25 dangling subject** → quiet "no longer available" in every lens; the alert still appears, never a dead link, never a crash.                                                          |
| **EC-7** | structural | Each lens carries the full **8-state** set (loading · empty "you're all caught up" · calm error+Retry · populated) + lifecycle (mark read · mark all read · archive).                        |
| **EC-8** | structural | **Title/voice contrast on warm/olive dark** must pass AA — the serif display face must be preloaded + use the correct high-contrast token (the greybox's ghosted titles are the bug to fix). |
| **EC-9** | feel       | The surface reads **calm and intentional**, not a red-alert feed; lens switches + read/settle transitions are quiet; reduced-motion safe.                                                    |

## Build sequencing (into Decomposition)

Flagship-first, each lens its own gated slice: **switcher + shared data/content seam → The Margin → Dispatches
→ Constellation**, with NOT-25 + 8-state threaded through each. This ships value incrementally (the default
lens works after slice 2) while honoring "all three + user choice."

## Open pins folded into per-lens design (resolved, not deferred to browser)

- **Type filter** → The Margin groups temporally (no separate filter needed); Dispatches groups narratively;
  Constellation groups by life-area. Status (unread/read/archived) remains a cross-lens control.
- **Grouping** → each lens IS a grouping model (time / narrative / entity). Resolved by the lens itself.
- **Severity loudness** → EC-5: quiet by default, warm only for error/warning.
