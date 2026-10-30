<!-- Identity — features/gamification · /documentation Phase 2 · sources: ADR-002 §5.15 · user.ts · CLAUDE.md §9 · ../life-os (v1) -->

# Identity — Gamification ("the System") (level: Feature — behavioral incentive engine)

**What it is.** The OS's **behavioral incentive & consequence engine** — a personal _"System"_ (in the manhwa/novel
sense: level up real life) that turns goals and habits into a game with **real stakes**. It is the **motivation /
consequence** plane — the partner to Purposes' **meaning / direction** plane (Purposes = _where I'm going_; the System =
_the engine that pulls me there_). Optional-but-transformative; opt-in (`feature_gamification`). `[FACT: CLAUDE.md §9;
user.ts L199]` `[INTENT: RESOLUTION GG1 — Victor]`

**The desire behind it.** Victor (and many kids, and people trying to turn their life around) never had the scaffolding
that makes **organization · the pleasure of hard work · earned reward** legible and felt. The System supplies it: the
user sets **rules** — _do the thing → reward · slip → penalty_ — with **real** consequences. Crucially, the reward must
**not require wealth**: alongside real money, the currencies are **self-granted life-allowances** — a vacation day, a
cheat meal, hours to play — things everyone can grant or withhold from themselves. Money is one currency; **time and
leisure are the great equalizer** (the Premack principle, systematised). `[INTENT: RESOLUTION §B — Victor]`

**Scope — the System (NOT the 4-table v2 floor).** `[INTENT: RESOLUTION]`

- **Rule → consequence:** a rule = an **ADR-011 binding** (event-trigger · derived-pull, acyclic) firing **typed
  effects** on the ADR-004 rail — `grant_currency` · `lock_currency`/`move_money` · `surface_notification`. `[INTENT §A]`
- **Multi-currency economy:** many resource-currencies at once, each `backing_kind` = `real-money` (→ Storage/Finance) ·
  `self-granted allowance` · `measured-time`. Four **derived** quantities per currency (to-distribute · earned · locked
  · current). `[INTENT §B]`
- **Storage boxes:** a **Finance-owned** nestable composition layer over accounts/investments/assets; rewards route
  money into a box → fund **Dreams**. `[INTENT §C]`
- **Achievements** = predicates over measured state (the ADR-011 seam) + the event stream; **user-authored rules /
  achievements** run as headless automations under the ADR-010 sandbox. `[INTENT §A/GG6]`

**What it is NOT.** `[INTENT; FACT: docs/features/*; ADRs]`

- **Not the meaning plane.** Direction/why is **Purposes**; the System is motivation/consequence. Two planes, one goal.
  `[INTENT GG1]`
- **Not a new engine.** Rules ride **ADR-011 bindings**; consequences ride the **ADR-004 §3.2.5 effect rail** (typed,
  idempotent, single write path). It invents no event bus. `[FACT: ADR-004 §3.2.5; ADR-011]`
- **Not the owner of streaks or signals.** Streaks are **module-owned** (Habits/Routines/Check-ins); behavioral signals
  are read via the **measurement-source seam** — the System stores none of them. `[FACT: HB-2, RT-7, CK-11; ADR-011 §3.6]`
- **Not Finance.** Money lives in Finance; the System **consumes** the Storage layer and moves money **only** through
  Finance's guarded handler. The OS is the user's ledger truth — a money-move is a real entry, **not** a bank API call.
  `[FACT: INT-2; finance.ts transfer]`
- **Not an ADR-008 capability/Block.** Capabilities are render-targeted; a rule is **headless background automation**
  (it reuses the ADR-010 envelope, not the render model). `[FACT: ADR-008 §3.2 render-targets]`
- **Not the persona / onboarding owner.** Persona weighting + module guidance + templates are **Preferences/Onboarding +
  Spaces**; the System at most reads persona for framing. `[INTENT GG9]`
- **Not required, and not wealth-gated.** Nothing depends on it (opt-in); it runs on self-granted time/leisure when there
  is no money. `[INTENT GG1/§B]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` remaining · [x] System identity + two-plane + inclusivity stated
