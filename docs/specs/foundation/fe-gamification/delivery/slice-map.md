<!-- Slice Map — fe-gamification (LIF-181) · Entity Delivery Flow ② Step 2 · Decomposition Gate -->
<!-- Decide-mode (net-new ② decomposition). Reads: interpretation.md (intent) + envision.md (pinned EC) +
     the shared ①↔② seam-contract (docs/features/gamification/delivery/seam-contract.md — the consumed API). -->

# Slice Map — fe-gamification ② ("the System" surface)

**Seam consumed:** `createGamificationService(deps): GamificationService` — the SHIPPED ① surface
(`docs/features/gamification/delivery/seam-contract.md`): currencies/balances · levels/profile · rules ·
achievements · journal `summary`. The ② holds **no business logic** — it renders those shapes + calls ops.

**Data-plane (inherited from fe-notes):** live hooks are **type+shape-correct against the seam, data STUBBED**
this unit; the live swap is one binding at the first composition root (worker-RPC Drizzle seam). Each slice
states its stub; no faked DB. `[FACT: TASKS.md fe-notes S1 D2]`

**Track split.** G0 = `@vida/ui` (design-system). S1–S5 = `apps/web` (frontend surfaces). No backend slice
(① is done). Each frontend slice ends in a **blocking real-browser Visual Gate** (both presets × light/dark ×
375/768/1440 + 8 states + no-overflow — EC-12).

---

## Slices (build order; each runs its per-slice gate before the next)

### G0 · Game GLOBAL preset — `@vida/ui` design-system — **EC-1, EC-2**
- **Owns:** a new `game` token family — primitive ramps (`gameNeutral.*`/`gameAccent.*` in the SD seed) +
  `semantic.game.json` + `semantic.game.dark.json` overlays + `game` fonts (display/body/chrome). Regenerate
  `themes.ts`/`tokens.ts`; extend `ThemePreset` → `'game'`, `THEME_PRESETS`, `ThemeName`, `resolveTheme`.
- **Invariants:** token-pure (no hard-coded palette, §design); **AA-verified light+dark** (full matrix).
- **Gate:** @vida/ui Visual Gate (the preset × light/dark on the shipped primitives — AA + font swap + accent).
- **NOT this slice:** the Settings/Onboarding picker wiring (Preferences-owned; persona→suggest = Onboarding).

### S1 · Multi-mode shell + Overview + wiring — `apps/web` — **EC-3, EC-4, EC-10**
- **Owns:** `apps/web/src/gamification/` — the `/gamification` lazy route (dock `feature_gamification` gate =
  thin, fe-shell-owned seam) + the **multi-mode top-view switcher** (Overview·Currencies·Achievements·Rules·
  Activity; `role="tablist"`/mode state) + the **Overview mode** over `DashboardView` (level+XP hero,
  balances, recent achievements) + the **deny-safe Preferences `persona` read** → reward-copy framing (EC-10;
  absent/`null` ⇒ neutral).
- **Stub:** `useGamification()` overview hook = type-correct, data stubbed.
- **Gate:** Visual Gate — switcher + Overview, both presets, 8-state, no-overflow.

### S2 · Currencies mode — `apps/web` — **EC-5**
- **Owns:** the Currencies mode over `CollectionView` (paginated 50/page) — ALL user-defined currencies
  **grouped by the 3 backing kinds**, each current + 🔒 locked + ledger snippet; `+ New currency` entry point.
- **Generic:** renders 0..N arbitrary currencies; backing-kind grouping is the stable taxonomy.
- **Gate:** Visual Gate — grouped list + pager + empty/loading/error, both presets.

### S3 · Achievements mode — `apps/web` — **EC-6**
- **Owns:** the Achievements mode over `CollectionView` (paginated) — ALL achievements by **category × tier** +
  progress toward locked; **calm = list · game = trophy wall** (lucide `Medal`, tier-ringed).
- **Gate:** Visual Gate — list + trophy wall, tier color ≥3:1, both presets.

### S4 · Rules mode + Rule-authoring Flow — `apps/web` — **EC-7, EC-9**
- **Owns:** the Rules mode over `CollectionView` (paginated) — ALL rules + enable/disable/delete + `+ New rule`
  → the **Rule-authoring Flow** over `FlowSessionView` (condition → reward → review/enable). Condition reads
  the **advertised measurement registry** (ADR-011 §3.6 — open; honest empty-seam state); reward spans
  money·allowance·time and **may earmark a Dream** (GM-7 — the Dream is a Purposes read, a reward target).
- **Stub:** the measurement-registry read + rule mutations = type-correct, stubbed.
- **Gate:** Visual Gate — rules list + the flow (both presets), empty-seam condition state honest.

### S5 · Activity mode — `apps/web` — **EC-8** — ✅ BUILT
- **Owns:** the Activity mode over `CollectionView` (paginated) — the consequence-ledger history (earn/lock/
  spend/distribute across modules, timestamped).
- **Gate:** Visual Gate — paginated ledger, both presets.
- **Built:** `use-activity.ts` + `activity-mode.tsx` + `activity.test.tsx` + surface wire-in (PLAN-S5-activity.md).
  Flat reverse-chron list, 50/page; label-led direction (no ± — balance.ts grounded); absolute `Intl` date-time
  (year only out-of-year); read-only honest `empty` (no "add" promise, g2 #1). Data STUBBED (IR-G1); honest default
  = empty. **F-S5-1:** enriched ledger-history read = unbuilt ①-tier first-consumer-pull seam (no `@vida/core`
  change; live swap documented in `use-activity.ts`). tsc 0 · eslint 0 · gamification 31/31 · @vida/web 546/546 ·
  Visual Gate PASS (editorial/game × L/D, AA 4.88–6.53, 0 overflow, empty+populated). **Completes the unit → PR.**

---

## Ownership discipline (EC-11 — enforced across all slices)
- **Compose/read, never rebuild:** Dreams = Purposes (reward target in S4 only); storage boxes = Finance;
  streaks = module reads. **quests/challenges = Spaces, INTENDED-later → OUT of every slice** (GM-17).
- **Icons:** lucide/SVG, never emoji.
- **The System renders ITS data** (currencies·levels·achievements·rules·ledger) + reads others via seams.

## Dependencies between slices
G0 (preset) lands first so every surface Visual Gate can assert both presets. S1 (shell) frames the modes →
S2·S3·S4·S5 each add a mode (independent, any order after S1). S4's flow opens from its rules list.
