# fe-shell — Envision Gate (Entity Delivery Flow ②, Step 1.5)

> **Status:** FIRED (interpretation §5-F4, §3.75 doc test) · greybox iterated to the OS language · **human (Victor)
> review PASSED + model LOCKED 2026-10-10.** The firing was the mechanical doc test; THIS gate was the blocking human
> review. Greybox (`packages/ui/src/__envision__/fe-shell-greybox.{tsx,stories.tsx}`) DELETED after the gate per the
> methodology. Screens archived: `/tmp/vg/shell-envision/`.

## The LOCKED model — the macOS/iPadOS inspector, dock⇄detach (M1–M7)
Grounded in `p6-organization-map.html §1 + :135` · `frontend-quality-bar/_index.md:103-110 §4.1` ·
`os-structure-baseline.md:79-80` · `design.md §IV/§V/§X`, refined through the Envision review with Victor.
Both "A" (inline) and "B" (overlay) ship — they are the **two placement states of one panel**, not a choice.

- **M1 — Dock ⇄ Float (per panel).** Each nav panel (**System** · **Modules**) is a toggle whose content can be
  **docked** or **floating**; the panel header carries the `▣ Dock | ⧉ Float` control.
- **M2 — Docked = inline (A).** A docked panel is **pinned flush in the frame**, **content sits beside it**, no scrim,
  no elevation — the calm grouped look.
- **M3 — Floating = overlay (B).** A floating panel is **toggled open and floats OVER full-bleed content** with a
  **scrim + Level-3 elevation**; content never loses width. (Victor's "cover the page on top with an effect.")
- **M4 — Rearrangeable to ANY edge.** Each panel independently docks/floats at **Left · Right · Top · Bottom**
  (the header edge picker `◧ ⬒ ◨ ⬓`); the two can dock together.
- **M5 — Content-fit.** A panel **sizes to its content** (2–3 col / 1–4 row); reaches the viewport **edge only when
  needed**. Vertical on L/R, horizontal on T/B.
- **M6 — Dismiss + focus + motion.** Floating: Esc / click-scrim / re-toggle closes; focus returns to the trigger
  (`OVERLAY_DISMISS`/`FOCUS_CONTRACT`). Dock/float + edge transitions animate **transform/opacity only** (B12);
  reduced-motion → instant.
- **M7 — ONE responsive model + reserved top strip.** The SAME component at 375/768/1440; content **1280-centered +
  gutters**; content-fit makes a floating panel a **near-full sheet** on mobile. The chrome **reserves a top strip**
  (persistent bar + any docked-panel header) that content/headers **inset below** — so controls never collide with
  content (the overflow fix caught at the gate).

## Leanings — ratified
- **L1** default = both panels **closed, content full-bleed** (toggle/pin to reveal). · **L2** scrim behind a
  **floating** panel only (never a docked one). · **L3** per-panel toggle (System · Modules), independently dock/float.
  · **L4** #14 ships the panels as **empty-but-functional containers + slots**; Bar 1 content (scope + 6 surfaces)→#15,
  Session HUD→#16, ⌘K command/search→#17. · **L5** placement (dock/float · edge) + open-state persist to
  `nav_preferences` via `ProviderRead`; **M1 stubs to the L1 default** (live hook deferred to first consumer).

## Anchored checkpoints (EC-n) — PINNED by Victor
`structural` = greybox-provable → MUST map to ≥1 slice + be a blocking Visual-Gate assertion. `feel` = defers to the live gate.

| EC | Checkpoint | Type |
|----|-----------|------|
| **EC-1** | **Dock ⇄ Float per panel** — each nav panel toggles between docked and floating; the header carries the `▣/⧉` control | `structural` |
| **EC-2** | **Docked = inline (A)** — flush in the frame, **content beside**, no scrim, no elevation | `structural` |
| **EC-3** | **Floating = overlay (B)** — floats over full-bleed content with **scrim + Level-3 elevation**; content keeps its width | `structural` |
| **EC-4** | **Rearrangeable to any edge** (Left·Right·Top·Bottom), each panel independently; the two can dock together; the edge/placement control is **contained — no overflow into content** | `structural` |
| **EC-5** | **Content-fit** — sizes to content (2–3 col / 1–4 row); edge only when needed; vertical on L/R, horizontal on T/B | `structural` |
| **EC-6** | **Dismiss + focus** — floating closes on Esc / click-scrim / re-toggle; focus returns to the trigger | `structural` |
| **EC-7** | **Reserved top strip** — the persistent bar + docked-panel headers inset so no control collides with content | `structural` |
| **EC-8** | **Overlay host** — ⌘K / modals mount centered over their **own** scrim at the overlay/modal z, above the panels; sheet on mobile | `structural` |
| **EC-9** | **One responsive model** — same component at 375/768/1440; content 1280-centered + gutters; content-fit → near-full sheet at 375; **no horizontal overflow** | `structural` |
| **EC-10** | **No shell-invented values** — every metric a DS token; **text AA full-matrix incl. warm-dark** (greybox min 4.52) | `structural` |
| **EC-11** | **Preset identity** — serif wordmark/title; accent flips per preset on active trigger/edge/item; dark elevation via the border | `feel` |
| **EC-12** | **Effect/motion** — dock/float + edge transitions animate transform/opacity only, reduced-motion→instant; the ⠿ grip reads as repositionable | `feel` |

## Gate journey (what the live greybox caught, now pinned)
The inline-column v1 and overlay-only v2 were both wrong; the review converged on the **dock⇄float inspector** (both A+B).
Findings folded: (1) **bottom edge was missing** → M4/EC-4 pin all four edges; (2) **cryptic top-bar glyphs** → real
`GLOBAL_SURFACES` as the #15 slot (icons = apps/web lucide); (3) **header control overflowed the panel into content** →
M7/EC-7 reserved strip + contained two-row control.

## Exit
Model LOCKED · EC-1…EC-12 pinned · greybox DELETED · `interpretation.md` synced to M1–M7 → **Step 2 Decomposition**
(`slice-map.md` + `seam-contract.md`) maps every `structural` EC (EC-1…EC-10) to ≥1 slice; EC-11/EC-12 `feel` defer to
the live per-slice Visual Gate.
