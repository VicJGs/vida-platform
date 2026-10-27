# Traceability — every surface/unit ← its intent source (G3 output)

> **Status:** G3, 2026-10-01. Maps each codec unit + surface (from `decomposition.md`) back to the **intent that
> requires it** — a P1–P6 decision, an ADR, a module doc, a Quality-Bar section, or a G2 discovery. Proves **no
> orphans** (every surface is wanted) and **no un-homed intent** (every decision has a surface). G4 (coverage) extends
> this into the ≥2-reachable-paths set-cover. Legend for _surfaced-by_: **DOC** = documented pre-replan · **P#** =
> captured in that phase · **REF** = Victor refinement · **G2** = discovered by the audit.

## 1. Codec units (Tier 0) ← intent

| Unit                                                               | Intent source                                                                          | Surfaced-by |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------- |
| View-mode renderers (7)                                            | ADR-007 (view layouts) · Tasks 12-layout identity · P6/F3 (the renderer)               | DOC + P6    |
| Collection shell                                                   | ADR-007 · surface-map §4.4                                                             | DOC         |
| Dashboard shell                                                    | UX-6 (Home) · Finance/Health/Projects dashboards                                       | DOC         |
| Entity shell + **Layout/Editor facet** (merged/tabbed)             | P6/F3 + REF (editor-is-a-facet) · `pages` polymorphic (ADR-002) · ADR-006 SP2 registry | P6 + REF    |
| Canvas shell (Editor·Graph·Reader·Vision-board·Calendar)           | P6/F3 (Canvas) · ADR-001 (Sigma/TipTap) · Books Reader · Skills/Neural graphs          | P6 + DOC    |
| Flow/Session shell                                                 | P2/P3 + REF (sessions) · ADR-004                                                       | P-/REF      |
| System shell                                                       | UX-2 (⌘K) · Preferences/Notifications                                                  | DOC         |
| Pattern-kit: EmptyState                                            | P5/E2 (teaching-invitation) · bar §2.1                                                 | P5          |
| Pattern-kit: SyncStatus/HonestProgress                             | P4 · ADR-003                                                                           | P4          |
| Pattern-kit: ReducedMotion                                         | bar §2.7 · STANDARDS motion §IX                                                        | DOC         |
| Pattern-kit: ThemeProvider (3 presets × density)                   | P1 (themeable identity + density)                                                      | P1          |
| Pattern-kit: VoiceCopy (voice + honesty)                           | P6/F1-F2 · onboarding copy-honesty                                                     | P6          |
| Pattern-kit: ReachabilityRegistry (≥2 paths)                       | P5/E1 · bar §2.4                                                                       | P5          |
| Pattern-kit: ProviderRead                                          | ADR-007 provider pattern · INT-1                                                       | DOC         |
| 8-state machine                                                    | command-bar-and-search §5 · bar §2.6                                                   | DOC         |
| SavedView · Capability · Template · block registry · Spaces engine | ADR-007 · ADR-008 · ADR-009 · editor.ts · ADR-006                                      | DOC         |

## 2. Shell + cross-cutting surfaces (Tier 1) ← intent

| Surface                                         | Intent source                                                 | Surfaced-by |
| ----------------------------------------------- | ------------------------------------------------------------- | ----------- |
| Bar 1 + Bar 2 (positionable content-fit panels) | REF (positionable panels) · shell-layout.md · nav_preferences | REF         |
| **Space-scope selector** (global scope, + None) | REF (Spaces = a scope, not a strip) · ADR-006                 | REF         |
| Session HUD (region 6)                          | REF (persistent timer follows you) · ADR-004                  | REF         |
| Home (4-region + arrangement toggle)            | P3 (the day) · UX-6 · Victor's 4 regions                      | P3          |
| Global Calendar (cross-module)                  | DOC (UX-1) · G2 (cross-module composition surfaced)           | DOC+G2      |
| Spaces page                                     | REF · ADR-006 (nav-addressable)                               | REF+G2      |
| Sync & Activity Log `/sync`                     | P4 (Sync & Activity Log)                                      | P4+G2       |
| Feature Atlas `/features`                       | P5 (Victor's addition)                                        | P5+G2       |
| Session runtime page                            | REF (deliverable-per-stage) · ADR-004                         | REF+G2      |
| Settings net-new controls                       | P1–P6 (the user-controlled surfaces) · P5/E3                  | P-+G2       |

## 3. Per-module surfaces (Tier 2) ← intent (grouped)

| Module        | Surfaces                                                                                                           | Intent source                        | Surfaced-by |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------- |
| Notes         | Collection+Graph · Note Entity (Editor-led) · /summary                                                             | notes-and-pages docs · ADR-002 pages | DOC         |
| Journals      | = Home · Wrapped reviews                                                                                           | UX-6 · journals docs                 | DOC         |
| Tasks         | 12-layout Collection · Task Entity (facets) · All-Tasks                                                            | tasks docs · P6/F3 facets            | DOC+P6      |
| Habits        | Dash+Collection · per-habit Entity (analytics)                                                                     | habits docs                          | DOC         |
| Projects      | Dash+Collection · project Entity · milestone/deliverable                                                           | projects docs · P-C component spec   | DOC         |
| Routines      | Collection · routine Entity · **run-flow**                                                                         | routines docs · G2 (run-flow)        | DOC+G2      |
| Learning      | hub Collection · subject Entity · **Grading builder** · **Assessment rollups**                                     | learning docs · G2                   | DOC+G2      |
| Books         | Bookshelf · Book Hub · **Reader** · Plans/Quotes · wizards                                                         | books docs                           | DOC         |
| Knowledge     | Catalog · Lab · Topic · Flashcards · **card-gen** · **compound-set** · **FTS**                                     | knowledge/flashcards docs · G2       | DOC+G2      |
| Skills        | **landing** · Skill Entity · Skill Graph · Def Library                                                             | skills docs · G2 (landing)           | DOC+G2      |
| Sessions      | Agenda · Availability · runtime · HUD · Pomodoro · **config** · templates                                          | sessions docs · ADR-004 · G2         | DOC+G2      |
| Purposes      | dashboards · Purpose/Target/**Value**/**Dream** · **Dreams board** · **Contributions graph** · **Reviews**         | purposes docs · G2                   | DOC+G2      |
| Health        | metrics Dash · goals/exams/roles/experiments · **Monitoring** · **Medical** · Training · Nutrition                 | health docs · G2                     | DOC+G2      |
| Finance       | Dash (switch) · account Entity · All-\* Collections · Chart · **Store tree** · **Commitments** · **Import wizard** | finance docs · ADR-012 · G2          | DOC+G2      |
| Relationships | Dash⇄Graph⇄Contacts · contact Entity (**health band**) · **Network** · **Reminders** · All-Events                  | relationships docs · G2              | DOC+G2      |
| Gamification  | System Dash · **rule-authoring**                                                                                   | gamification docs · G2               | DOC+G2      |
| Notifications | inbox · **channel-matrix**                                                                                         | notifications docs · G2              | DOC+G2      |
| Check-ins     | entry Flow · history/trends · **Journal widget**                                                                   | check-ins docs · G2                  | DOC+G2      |

## 4. Orphan / coverage check

**No orphan surfaces** — every surface in §2–3 traces to ≥1 intent source above. The **G2-discovered** surfaces
(marked +G2) are the ones a per-module plan would have dropped; they now each carry an intent home (a P-phase decision,
a Victor refinement, or an ADR seam the audit surfaced).

**No un-homed intent** — each P1–P6 decision has a surface or codec unit realising it:

- P1 identity → ThemeProvider + the 3 presets (codec); P2 motion → ReducedMotion + the transition pref; P3 the day →
  Home 4-region + arrangement toggle; P4 trust → SyncStatus + `/sync` + undo/Trash; P5 discover/own → EmptyState +
  ReachabilityRegistry + Feature Atlas + the 3-grain personalization (Settings); P6 voice → VoiceCopy + the archetype
  catalog + en/pt-BR.

**Owed ADR amendments** (intent that extends the docs — flagged, not orphaned): Spaces-as-scope (ADR-006/shell-layout) ·
net-new preference fields (ADR-002 §5.17) · Session HUD region 6 (shell-layout) · stages+deliverables on entities (ADR-004) ·
the ~module schema amendments (§6.4). Each is a _surfaced_ intent with a _named_ home, pending the build-phase ADR edit.

## 5. Feeds G4

G4 extends §2–3 into the **≥2-reachable-paths set-cover**: for every _capability_ (not just surface), prove ≥2
independent reach paths (dock · ⌘K · contextual/`[[link]]` · Space · cross-module) over this traceability set; any
1-path capability fails the coverage gate.
