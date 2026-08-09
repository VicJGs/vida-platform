# UI-1 — Consolidated DEF Register (deferrals & contract-gaps for the DS-5 pass)

<!-- type: reference -->
Compiled at UF (2026-08-09), the final consolidated gate for UI-1. Every DEF is a **deliberate, tracked
deferral** raised while implementing a DS-5 contract — NOT a bug and NOT a gap. Each is either (a) a missing
component token, (b) a contract-vs-standard inconsistency, (c) a deferred capability, or (d) an
already-resolved DS-wide fix. The per-unit spec (`uN-*.md §DEFs`) is the authoritative detail; this is the
index the **DS-5 contract owner** consumes for the next contract revision.

Legend: 🎟️ missing component token · 📄 contract/doc inconsistency · ⏭️ deferred capability · ✅ resolved DS-wide.

## A. Missing component tokens (🎟️ — add to `component.json` at the brand pass)
| DEF | Unit | Gap | Interim |
|-----|------|-----|---------|
| U3-b | Checkbox | no square-control **box-size** token | raw dp 16/20/24 (4pt-grid) |
| U4-d | Select | no `select.borderFocus` token (Input has `input.borderFocus`) | reuses a semantic focus var |
| U7-a | Menu | no `menu.itemTextDanger` token | danger reaches the raw `color.signal.danger` semantic |
| U8-c | Dialog | no **scrim** component token (contract §34 flags it) | `surface.inverse` semantic @ 0.5 opacity |
| U8-e | Dialog | no **dialog-size** token | provisional maxWidths (brand-pass value review) |
| U9-b | Popover | no `popover.arrow` token | arrow reuses `popover.background`/`border` |
| U10-c | Toast | no accent-border **width/placement** token | fixed 3px inline abs-positioned bar |

## B. Contract / standard inconsistencies (📄 — reconcile the contract text)
| DEF | Unit | Inconsistency |
|-----|------|---------------|
| U3-a | Checkbox | `checkbox.md` flat API vs `_index.md §VII` union — delivered the **authored flat API**; DS to reconcile the two docs. |
| U5-c | Card | flat `CardProps` vs the contract's "discriminated-union note" AND components §VII (which *mandates* the union) — a true contract-vs-standard conflict; DS to decide. |
| U5-d | Card | ARIA nesting — `role="button"` containing focusable `actions`/`footer`; delivered per contract (not a silent rewrite), flagged to verify. |
| U6-a | Tabs | contract should formalize the **panel API** (`Tabs.Panel` slot vs a `panels` prop) — UI-1 chose `Tabs.Panel`. |
| U7-d | Menu | contract silent on the menu's **accessible-name** source → Menu accepts `aria-label`/`aria-labelledby`. |
| U9-a | Popover | contract API names only `aria-label`; a `role=dialog` also accepts `aria-labelledby` (added — doc-sync). |
| U10-a | Toast | contract under-specifies the **region-mount component** → UI-1 adds `ToastProvider` (`limit`/`placement`). |
| U10-f | Toast | `onDismiss: () => void` is param-less → can't distinguish user-dismiss vs cap-eviction vs timeout; a `reason` arg would. |
| **UF-1** | Select | (UF components-gate) Select adds `aria-label`/`aria-labelledby`/`id` beyond the contract's `SelectProps` for the `role=listbox` name — same "contract silent on name source" flag as U7-d; DS to add it to `select.md`. |

## C. Deferred capabilities (⏭️ — out of UI-1 scope, future work)
| DEF | Unit | Deferred |
|-----|------|----------|
| U5-a | Card | a standalone `Skeleton` primitive (**superseded** by U5-f — loading is consumer-composed children). |
| U5-f · U6-c · U8-b · U9-c · U10-b | Card/Tabs/Dialog/Popover/Toast | **no `loading` prop** — loading is consumer-composed (skeleton/spinner as children + `aria-busy`; Toast = `duration:0` + spinner). Uniform across the set, each contract-authored. |
| U6-b | Tabs | no `keepMounted?` knob (only the active panel mounts) — add if state-preservation is needed. |
| U7-b | Menu | `menuitemcheckbox`/`menuitemradio` out of scope. |
| U7-c | Menu | submenus / nested menus out of scope. |
| U8-a | Dialog | no close-button (✕) slot — dismissal = Esc/backdrop or `footer` actions. |
| U8-d | Dialog | exit animation deferred (immediate unmount per the perf budget). |
| U8-f | Dialog | `dismissible={false}` makes Esc inert — a **deliberate** §XIV deviation (destructive-confirm), dev-warned. |
| U8-g | Dialog | body scroll-lock deferred (not in the contract's perf budget). |
| U9-d | Popover | logical tab-order after a portalled non-modal panel is body-relative (Radix-style focus-scope redirection out of scope). |
| U9-e | Popover | contract's `duration.fast` (150ms) is the *Micro* band; a content panel is the *Transition* band (motion.md §IX) — shipped verbatim, flagged for the DS motion pass. |
| U10-d | Toast | region `placement` is a provider prop, no per-toast position. |
| U10-e | Toast | cap policy (per-region, store-enforced, evict-oldest, default 3) is an implementation choice — contract pins neither N nor order. |

## D. Resolved DS-wide during UI-1 (✅ — no action; recorded for provenance)
| DEF | Fix |
|-----|-----|
| U4-e | `createFont` `lineHeight` **ratio→px** conversion at the Tamagui boundary (`tamagui.config.ts`); pipeline stays ratio-pure. Was clipping every primitive's text to a 1.5px line box. |
| U5-b | Card padding (and Button/Input/Select horizontal padding) use the `$space` **token scale**, not the inert `*.padding` sub-theme key. |
| U5-e | `shadow.ts` typed export (elevation box-shadow literals for injected component CSS). |
| U8-h | **Dimension props read the token scale, not the sub-theme key** — `borderRadius`/`space`/`size` resolve `$name` against the token scale (`$md`/`$lg`), theme consulted for COLOR props only. Was rendering 0px square corners on every primitive. |

## E. Repo-wide hygiene follow-up (NOT a DS DEF — its own task)
- **`tsconfig.base.json` lacks `noUncheckedIndexedAccess` (+ `noImplicitReturns`)** — engineering §XV mandates
  both. Flagged by the UF engineering gate. **Repo-wide** (affects core/web/server/types), so it is NOT folded
  into UI-1 — enabling it re-typechecks the whole monorepo and may surface errors elsewhere. Tracked as a
  standalone hygiene task (`tsconfig-strict-index-access`), to run under its own gate. The four in-scope UI-1
  `!` sites were given §XV justification comments at UF.
