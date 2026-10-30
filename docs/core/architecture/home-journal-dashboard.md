# Home = Journal Daily Dashboard — design model (UX-6)

Status: **model authored** (UX-6 / LIF-95, M1.0). Owning code: `apps/web/src/home/`. Intent source:
`docs/features/journals/{identity,contract}.md` + ADR-004. This documents the **experience design** of the daily
Journal Home; the rendering + aggregation engine are downstream (see §Downstream).

## What UX-6 is

The landing surface Victor opens every day — `/` renders the **Journal daily dashboard** inside the UI-4 shell
`<Outlet/>`. UX-6 is a **design model** (a typed declarative artifact + this doc), the same shape as its
experience-track siblings UX-3 (shell layout) / UX-4 (state conventions) / UX-5 (onboarding): it fixes the shape,
not the pixels. There is **no rendered component and no Visual Gate** — the rendered screen is Phase-1b, consuming
this model. `[FACT: delivery-plan:270 "design issue"; ui-4/_index.md:29]`

## The three sections (`section-model.ts` · BR-1)

The dashboard models exactly three sections, all placed in the shell `content` region:

| Section   | What it shows                                                                                    | Render hint   | Source                         |
| --------- | ------------------------------------------------------------------------------------------------ | ------------- | ------------------------------ |
| `summary` | Today's recap — what happened, aggregated across modules                                         | `data-view`   | `journals/identity.md:8`       |
| `agenda`  | What is due **today** (a single-day range, not the range Calendar — BR-5)                        | `list`        | `journals/identity.md:9,45-46` |
| `entry`   | The free-form markdown journal entry (Notes & Pages owns the editor; referenced as a mount seam) | `editor-seam` | `journals/identity.md:42-43`   |

`renderHint` names the _intended_ UI-1/UI-2 renderer as a string — it imports no component (design model). The
placement references the `ShellRegion` type from UX-3 (`shell/regions.ts`); the region is the shell's, the
placement is Home's.

## The contribution registry seam (`journal-contribution.ts` · BR-2)

Journals **names no module.** Each module registers a contribution
`{ module, section_key, dataPoints[], summary(date), dueIn(range) }`; the dashboard renders whatever is
registered, so a new module appears automatically. This mirrors ADR-004's registry pattern; the contract itself
is `journals/contract.md` `[INTENT]`. `registerJournalContribution` is a **signature-only reserved seam** — it
throws `JournalSeamNotActivated` until the engine (MOD-journals #33) fills it, following the AR-9
`SyncNotActivated` precedent. `[INTENT: journals/contract.md:12-18]`

## Terminal states — the degrade composition (`section-state.ts` · BR-3/BR-4)

Each section resolves to one of the **four `@vida/core` `TerminalState` literals** (`loading`/`empty`/`error`/
`success`) — reused by **type**, never redefined. UX-6 owns only the **composition**: `resolveDashboardStates`
maps each section's already-resolved state so **one failing section degrades alone and never blanks the others**
(`journalStillRenders` is true unless every section errored) — "never a blank journal."

UX-6 does **not** derive state: `deriveTerminalState` derives from a live React-Query result, of which a data-less
design model has none. That query→state derivation is the downstream engine's per-section job. The review-only
`InsufficientHistory` is a typed error case on the deferred review seam — **not** one of the dashboard render
states. `[FACT: journals/identity.md:51-54]`

## Personalization (`selection.ts` · BR-6)

Per module + granular, the user selects which `dataPoints` show. `resolveSelection(globalDefault, override)` is
pure — the per-journal override wins **per module**, and modules the override omits keep the global default (no
module is dropped). The persisted storage (`get/setSelection`) is a deferred seam → Preferences/MOD-journals.

## Downstream (fenced OUT of UX-6)

- **Aggregation engine** — `journal-service.ts` (`buildDashboard`/`captureSnapshot`/`getJournal`/`buildReview`) →
  **MOD-journals #33** (M1.1; "0 lines INTENDED"). `[FACT: journals/identity.md:15-16]`
- **Real module providers** — each module's `summary(date)`/`dueIn` → each **MOD-\*** (M1.1+).
- **The journal page** — the `pages` row, `/summary` block, TipTap entry + `[[links]]` → **Notes & Pages**.
- **The improvement lens** — snapshots + Wrapped-style temporal reviews → **design-pass / Wave 3-4**.
- **The rendered screen** — the React Home component + `/` route wiring → **Phase-1b** (consumes this model).
