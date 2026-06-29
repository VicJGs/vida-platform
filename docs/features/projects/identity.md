<!-- Identity — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · @vida/types/project.ts · CLAUDE.md §2 · docs/intake/projects.md -->

# Identity — Projects  (level: Feature)

**What it is.** Structured project management with a real **four-level hierarchy — Project > Milestone >
Deliverable > Task** — plus a **vision/mission** layer, a confidential **document vault**, auto-rolled-up
**progress**, and a **dynamic, multi-type deliverable measurement** system that draws signals from across the OS
to give a deep picture of how a project is actually developing. `[FACT: CLAUDE.md §2; ADR-002 §5.4]`

**The desire behind it.** The user wants to **run real projects** — personal, professional, academic — and *see
how they're truly progressing*, not just a manual percent bar: money moved, content shipped, outreach done,
artifacts delivered. He wants the big picture pulled from the whole OS, his confidential project info protected
in a vault, and his goals/people/finances connected to the work — all on a zero-knowledge core. `[INTENT: Victor 2026-06-29]`

**Scope — full v1 + major expansions.** `[INTENT G1–G11]`
- Owns **3 tables today**: `projects`, `milestones` (nested), `project_documents`. `[FACT: ADR-002 §5.4]`
- **⚠ INTENDED `deliverables` table (G2)** — the real level between milestones and tasks, with a **multi-type
  measurement** backend (financial · task-statistics · third-party metrics · activity logs · solid artifacts, G4).
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
  `[INTENT G4,G6, governing principle]`
- **Not its own tag vocabulary.** Shared scoped tags (G11). `[INTENT G11]`

> **Governing principle (→ core constitution `[[../../core/business-rules]]`):** adding integrations never changes
> the zero-knowledge goal; external/AI integrations are **opt-in, user-owns-the-risk components wrapped in a tough
> protection layer**. Frames the two candidate ADRs (external ingestion · AI agentic-within). `[INTENT: Victor 2026-06-29]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
