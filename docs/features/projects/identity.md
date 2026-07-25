<!-- Identity — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · @vida/types/project.ts · CLAUDE.md §2 · docs/intake/projects.md -->

# Identity — Projects  (level: Feature)

**What it is.** Structured project management with a real **four-level hierarchy — Project > Milestone >
Deliverable > Task** — plus a **vision/mission** layer, a confidential **document vault**, auto-rolled-up
**progress**, and a **dynamic deliverable measurement** system (per-deliverable `measurement_kind` ×
`binding_mode` under the **ADR-011** universal-measurability contract) that draws signals from across the OS
to give a deep picture of how a project is actually developing. `[FACT: CLAUDE.md §2; ADR-002 §5.4; INTENT: ADR-011 §3.1/§3.5]`

**The desire behind it.** The user wants to **run real projects** — personal, professional, academic — and *see
how they're truly progressing*, not just a manual percent bar: money moved, content shipped, outreach done,
artifacts delivered. He wants the big picture pulled from the whole OS, his confidential project info protected
in a vault, and his goals/people/finances connected to the work — all on a zero-knowledge core. `[INTENT: Victor 2026-06-29]`

**Scope — full v1 + major expansions.** `[INTENT G1–G11]`
- Owns **3 tables today**: `projects`, `milestones` (nested), `project_documents`. `[FACT: ADR-002 §5.4]`
- **⚠ INTENDED `deliverables` table (G2)** — the real level between milestones and tasks, an ADR-011 **pursuable**:
  each deliverable carries **`measurement_kind`** (M1) + **`binding_mode`** (M2); its source (financial account ·
  task statistics · third-party metric · activity log · artifact, G4) is bound via the **measurement-source seam
  (M5/R7)** — replacing the bespoke `measurement_type` enum. `[INTENT: ADR-011 §3.1/§3.5/§3.6]`
- **Vision + Mission as TipTap pages (G3)**; **document vault** for confidential/legal/knowledge files incl.
  large files via R2 (G6).
- **Flexible, user-chosen views (G1/G9):** Projects Dashboard · Projects Timeline · pinned project · milestone
  standalone (timeline widget + tabs) · **project-scoped Task standalone** · **deliverable standalone**
  (cross-module aggregation). Layout (timeline/board/Kanban/archived) is the user's choice.
- **Cross-module hub (G8):** habits, purposes, bucket-list, **Finance accounts**, **Relationships contacts with
  roles**, **project events**, Check-in reviews.

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules + constitution]`
- **Not the owner of tasks.** Tasks live in **Tasks**; a "project task" is a Tasks entity surfaced through a
  **dedicated Tasks→Projects API** with a project-scoped UI (G7). `[INTENT G7]`
- **Not the owner of goals/people/money.** Projects *links* purposes, contacts, accounts via junctions/
  integration points; those modules own the data (§6). `[INTENT G8]`
- **Not a generic file dump.** `project_documents` is a **secure vault** (confidential, encrypted), not casual
  attachments. `[INTENT G6]`
- **Not a breach of zero-knowledge.** External signals (Finance, third-party metrics) and AI are **opt-in
  extension components** under the governing principle: **ZK core + guarded, user-risk extension layer** (below).
  External-metric ingestion rides **ADR-014** (device-mediated, `external_in_ok`); agentic AI rides **ADR-015**
  (on_device/cloud, granted-envelope). `[INTENT G4,G6, governing principle; ADR-014/015]`
- **Not its own tag vocabulary.** Shared scoped tags via `entity_tags` (ADR-006 SP1, G11). `[INTENT G11]`
- **Not the owner of a "research/investigation" entity.** A research/investigation is a **`deliverable`
  (`measurement_kind='milestone'` + `binding_mode='manual'` — an artifact deliverable)** backed by a **Knowledge Lab
  investigation** (linked via `entity_links`) — the
  distinction is *explore vs execute*: Projects tracks the deliverable, **Knowledge** holds the open-ended
  exploration. No `investigations` table. `[INTENT: Victor 2026-07-15]`

> **Governing principle (→ core constitution `[[../../core/business-rules]]`):** adding integrations never changes
> the zero-knowledge goal; external/AI integrations are **opt-in, user-owns-the-risk components wrapped in a tough
> protection layer**. Realized by the ratified ADRs: external ingestion (**ADR-014**) · AI agentic-within
> (**ADR-015**). `[INTENT: Victor 2026-06-29; ADR-014/015]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
