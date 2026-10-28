<!-- Business rules — features/health/training · Phase 2 · sources: intake/health.md (9 Training DBs) + core/* +
     ADR-004 + v1 CR-005. Prefix: HT- (Health Training). -->

# Business Rules — Health: Training

Invariants for the Training pillar. Inherits all Core rules (HC-\*). Mostly `[INTENT]` (recovered domain, no v2 code).

- **HT-1 — Five-layer spine.** Catalog → Plan → Template → Instance → Log. A plan references catalog exercises; a
  template composes exercises into a session shape; an instance is a performed session; logs record actual sets. `[INTENT]`
- **HT-2 — A workout IS a Session.** A performed workout is a Sessions `workout` sub-type (ADR-004) with a
  Training-owned `workout_sessions` extension; Training never re-implements the session runtime/scheduler. `[FACT ADR-004; HC-13]`
- **HT-3 — Plan → assigned-today via the scheduler.** An Exercise Plan projects onto days through the scheduling
  engine (planned blocks / `dueIn()`), which the Global Calendar renders — Training does not duplicate scheduling. `[FACT dueIn]`
- **HT-4 — Set logging is planned-vs-actual.** Each assigned exercise records planned sets/reps/weight and actual
  sets/reps/weight + form quality + RPE; **volume = sets×reps×weight**, cardio = duration×intensity (CR-005). `[INTENT HL5; FACT CR-005]`
- **HT-5 — Performance feeds Core Metrics (per-lift, bilateral).** PRs, 1RM, max-reps, volume are emitted as **Health
  Metric values** (kind=performance-capacity, source=derived) — **per lift and per side** (left/right/bilateral, via
  the metric `side`) — not stored as Training-local KPIs. `[INTENT HC-1/HC-2/CI-2]`
- **HT-6 — Periodization is first-class.** A plan carries a progression model, deload frequency, and energy-system
  focus; these govern how assigned load advances week-to-week toward the plan's Health Goals. `[INTENT]`
- **HT-7 — Modality is a dimension.** Training focus / workout type / movement pattern / exercise category are
  enum/tag properties on the shared spine — never a table per modality. `[INTENT]`
- **HT-8 — Physical-Role-linked workouts.** When a workout serves a **Physical Role** (muay-thai, calisthenics), it
  uses that Role's session sub-types (class/sparring) and links its technique Knowledge; generic strength work needs
  no Role. A **Role generates/links the exercises** that build it (HT-13); the merge means one concept covers both
  "discipline" and "capacity." `[INTENT HC-9 merged / CI-4]`
- **HT-13 — A Role's program is medically-aware; manual is Core.** When a Physical Role generates its exercise set /
  plan, it **filters via the Medical Profile** (HC-16 — excludes/adjusts for injuries/limitations, advisory). The
  manual builder is the Core path; **LLM generation + curated-Role-library import** (locale-varying) are opt-in
  extensions ("a tool for your development, not your harm"). `[INTENT CI-4/R3; HC-16]`
- **HT-9 — Authoring triad.** A plan/template is built **by hand** (Core), **by AI** (`AI Generated`, opt-in), or
  **imported** from a library (extension-model) — the manual path is always sufficient. `[INTENT HL12; FACT Notion AI-Generated flag]`
- **HT-10 — Protocols by reference.** Testing/Recovery protocols are Knowledge (kind=`protocol`); a workout or test
  references one, never inlines it. `[INTENT HC-12]`
- **HT-11 — Provider seams.** Completed workouts → Journal (daily summary) + Gamification (streaks/PRs);
  scheduled workouts → Calendar/agenda; burn → the Core energy loop. `[INTENT reshape §C]`
- **HT-12 — Medical Profile filters, advisory.** Injuries/contraindications from the Core Medical Profile filter
  the exercise catalog & plans (using each exercise's **Risk Level** / "Supervision required"); overtraining
  signals raise Core **safety flags**. Filtering **advises** — excluded exercises are flagged with a reason, never
  forcibly removed (autonomy-with-clarity). `[INTENT HC-14/HC-16; FACT Notion Risk Level]`

## Terminal states

Catalog (empty=no exercises) · Plan (draft · active · deload-week · completed) · Workout instance (scheduled ·
in-progress · **paused** · completed · **skipped** · modified) · Set log (planned-only · logged · **failed-set**) ·
AI-generation (generating · **failed→manual fallback**).

## Completion checklist

- [x] rules + [FACT/INTENT] · [x] terminal states · [x] Core inheritance noted · [x] no `{{…}}`
