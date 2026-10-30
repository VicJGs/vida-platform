<!-- Intake — Bucket List (Wave 3, exec #6) · documentation-blueprint Step 1
     Sources harvested:
       CURRENT (v2): ADR-002 bucket_list_items L1025-1040 (P/E) + L3292-3327 (schema) + L1152 (mostly-E) +
                     entity_links target L3812 + entity_type L1351; packages/types/src/bucket-list.ts (0 lines).
       OVERLAP: ADR-002 dreams table L1911-1933 (Purposes domain); purposes L452.
       LEGACY (v1): life-os entities.ts BucketListItem L1875-1899 (+ notes field, is_completed);
                    features/bucket-list/* — rich UI: List·Board·Timeline·Gallery·Hero·Stats·ItemCard·Form +
                    Detail·Archived pages + onboarding BucketListSetupStep.
       INTENT: CLAUDE.md §9 "Items linked to purposes and projects with steps, cost, location";
               docs/intake/purposes-and-goals.md PG8 (the Dream↔Bucket boundary, deferred to be drawn HERE).
     STATUS: ✅ RESOLVED 2026-07-15 (Victor) → **DISSOLVED into Spaces** (worked-example, à la Languages/Duties).
             Bucket List is NOT a module — it is a **Space**: a saved, tagged View ("things I want to do before I
             die") with progress + a vision-board Gallery to envision them. This ALSO resolves BL1/PG8: the items
             ARE **Dreams** (one aspiration entity, owned by Purposes & Goals #8); `bucket_list_items` collapses
             into `dreams` (which absorbs the execution/progress/imagery fields); no separate table, no boundary to
             draw. Intent threaded → intake/spaces.md (bucket-list worked-example) + intake/purposes-and-goals.md
             (Dreams absorbs; PG8 resolved). Off the module list; empty stubs deleted. Gaps BL2/BL6/BL7 fold into
             the Spaces/Purposes design; BL5/BL8 fold into Dreams' contract. Confirmed by Victor before threading. -->

# Bucket List — Intake & Gap Map

## 0. One-line

The **someday / aspiration** ledger — life-goals a user wants to achieve ("visit Japan", "run a marathon"),
each with a category, a status from _dream_ → _completed_, optional steps, cost, location, images, and links
up to the **Purpose** it serves and the **Project** it may become.

---

## 1. What v2 ships today `[FACT]`

**Owned artifact — 0 logic (greenfield).** `packages/types/src/bucket-list.ts` is **empty** (`wc -l = 0`).
Only the schema is real.

**Schema — `bucket_list_items`** (ADR-002 §5.14; **mostly-encrypted** — one of the 5 majority-E tables `[FACT L1152]`):

| Column                                            | P/E   | Notes                                                                                               |
| ------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| `id`, sync cols                                   | P     | UUIDv7 + `_sync_*`                                                                                  |
| `title`, `description`                            | **E** | user content                                                                                        |
| `category`                                        | P     | CHECK(10): travel·adventure·career·creative·education·financial·health·relationship·spiritual·other |
| `status`                                          | P     | CHECK(5): **dream**·planned·in_progress·completed·abandoned                                         |
| `priority`                                        | P     | CHECK(5): critical·high·medium·low·none                                                             |
| `target_date`, `completed_date`                   | P     | `YYYY-MM-DD`                                                                                        |
| `estimated_cost`                                  | **E** | cents                                                                                               |
| `location`                                        | **E** |                                                                                                     |
| `image_url`, `cover_image_url`, `inspiration_url` | **E** | imagery                                                                                             |
| `tags`                                            | **E** | JSON array                                                                                          |
| `progress_percentage`                             | P     | 0–100                                                                                               |
| `steps`                                           | **E** | JSON `[{id, text, completed}]` — a lightweight inline checklist                                     |
| `purpose_id` → purposes (SET NULL)                | P     | the meaning it serves                                                                               |
| `project_id` → projects (SET NULL)                | P     | the project it became                                                                               |

**Cross-links:** `entity_links` targets include `bucket_list_item` (notes attach); `entity_type` enum lists it.
`[FACT: L3812, L1351]`

## 2. What v1 had (the "desire") `[FACT: life-os]`

- **Entity** — same shape as v2 **plus** a `notes` free-text field + explicit `is_completed` boolean.
  `[FACT: entities.ts L1875-1899]`
- **A full UI family** — `BucketListList · Board · Timeline · Gallery · Hero · Stats · ItemCard · Form` +
  `BucketListPage · DetailPage · ArchivedPage` + an **onboarding** `BucketListSetupStep`. The Gallery + Hero +
  imagery fields signal a **vision-board / inspirational** character, not a dry list. `[FACT: features/bucket-list/*]`

## 3. The overlap that must be resolved — `dreams` vs `bucket_list_items` `[FACT]`

Two tables describe nearly the same thing:

|                         | `bucket_list_items` (this context)                                           | `dreams` (Purposes & Goals domain) |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| title / description [E] | ✓                                                                            | ✓                                  |
| estimated_cost [E]      | ✓                                                                            | ✓                                  |
| purpose_id FK           | ✓                                                                            | ✓                                  |
| taxonomy                | `category` (10)                                                              | `domain` (8)                       |
| time                    | `target_date` / `completed_date`                                             | `target_age`                       |
| execution               | `status`(incl **'dream'**)·`priority`·`steps`·`progress`·`project_id`·images | — (none)                           |

`bucket_list_items.status` **already includes `'dream'`**, while `dreams` is a **separate, simpler table** in
the Purposes domain. This is a genuine redundancy the boundary must settle. `[FACT: ADR-002 bucket L3292, dreams L1911]`

---

## 4. GAP MAP — needs Victor's intent (No-Guessing: unresolved = UNKNOWN)

### ⭐ BL1 / PG8 — the Dream ↔ Bucket ↔ Purpose boundary (MUST draw now)

Your Purposes intake deferred this **to here** ("prevents documenting Bucket List against a moving target").
The question, three-way:

- **Purpose** = the long-range _meaning_ (the why; the capstone meaning-spine). _(documented at #8)_
- **Dream** = ? — a pure, plan-less aspiration under a Purpose (`dreams` table), OR just a Bucket item in
  `status='dream'`?
- **Bucket List item** = an _actionable_ someday-goal (steps, progress, deadline, can become a Project).

Options for the redundancy:

- **(A) Collapse `dreams` into `bucket_list_items`** — a "Dream" is a Bucket item with `status='dream'` (no
  steps/plan yet); retire the `dreams` table. Simplest; the status enum already anticipates it.
- **(B) Keep both, distinct line** — `dreams` = aspirational, Purpose-scoped, no execution machinery
  (age-horizon, vision); Bucket = actionable, with steps/progress/project promotion. A Dream _promotes_ to a
  Bucket item when the user commits.
- **(C) Bucket List dissolves** — items are a _kind_ of Dream/Purpose/Project (composition, à la Languages/
  Pomodoro). _Weaker — Bucket has a distinct rich table + emotional/vision-board character unlike Purpose/Project._

**Recommendation: (A) or (B).** This is your call — and it also decides whether Purposes (#8) still documents a
`dreams` table or points here. `[decision drives both contexts]`

### BL2 — Vision board: restore it? ⚠ INTENDED

v1 had a Gallery/Hero + imagery; PG8 asks about `vision_board_images[]` + visualization notes + achievement
tracking. Is Bucket List a **visual, inspirational board** (imagery first-class, a Gallery/vision-board view),
or a plain prioritized list? The `image_url`/`cover_image_url`/`inspiration_url` fields already lean visual.

### BL3 — altitude: own entity, or composition?

Given the pattern of this effort (mature core → compositions), confirm Bucket List **is** its own lightweight
entity (its distinct rich, mostly-E table + aspirational character argue yes) rather than a saved View over
Purposes/Projects. _(Ties to BL1-C.)_

### BL4 — the `steps` model (the composition probe)

v2 stores `steps` as inline JSON `[{id,text,completed}]`. But the OS now has **Tasks**, **Projects**, and
**Milestones**. Are a bucket item's steps: (a) a lightweight inline checklist (as v2), (b) real **Tasks**
linked to the item, or (c) the moment steps get serious, the item **promotes to a Project** (the `project_id`
FK already exists)? i.e. is "Bucket item → Project" the intended graduation path?

### BL5 — integration & effects (via which seams?)

Confirm the intended links: **Purpose** (`purpose_id` — contributes to a purpose's progress?) · **Project**
(`project_id` — promotion) · **Notes** (`entity_links` — an item's notes page) · **Journals** (a completed
item surfaces in the daily/recap feed?) · **Gamification** (completing a bucket item awards XP / is an
achievement? — Wave 4, stub) · **Sessions** (does an item ever schedule work, or is that the Project's job?).

### BL6 — views (⚠ INTENDED, views-pass)

Which of v1's List·Board·Timeline·Gallery·Hero·Stats + Detail + Archived are in the vision? (Deferred to the
per-module build-time views pass, but capture the intent.)

### BL7 — taxonomy & extensibility

Keep `category`(10) + `status`(5) + `priority`(5) as shipped enums? User-extensible categories (via Spaces
tags/presets, #7)? `dream→planned→in_progress→completed→abandoned` — is that the intended lifecycle?

### BL8 — completion & "life progress"

Does completing bucket items feed a **life-progress / recap** surface (Journals Review engine already lists
"improvement vs … dreams"), a Purpose's rollup, or Gamification? What is a _completed_ Bucket List worth in
the OS's meaning plane?

---

## 5. Non-gaps (already answered by code/docs — do NOT re-ask)

- Encryption class → mostly-E (title/description/cost/location/images/tags/steps all `[E]`). `[FACT: L1152, L3292]`
- FKs → `purpose_id` + `project_id`, both `ON DELETE SET NULL` (unlinking never deletes the item). `[FACT]`
- Notes → an item's notes are a `pages`/`entity_links` row (`bucket_list_item`), Notes-owned. `[FACT: L3812]`
- Sync → LWW, one encrypted blob per item. `[FACT: ADR-003]`
- Monetary → `estimated_cost` INTEGER cents. `[FACT: conventions]`
  </content>
