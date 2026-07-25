# Re-run PLAN — relationships (Part 1.2, Tier 1)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** ✅ IMPLEMENTED (2026-07-24) — LITE gate passed (critique **SHIP / 0 blocking** → Victor approved incl. the X* membership-by-rule call); edits landed across **all 5** aspect docs; §4 acceptance verified mechanically (grep): `entity_tags` + `parent_tag_id` in all 5 (SP1/SP3); N1/N2 three-tier delivery + content-free payload across all 5 (013); X1/X8 device-mediated + `import_staging` (014); **M\* only in exclusion/negative context** (C1 primary guard — no `measurement_kind`/`binding_mode` forward); **no `grant_currency`/E2** (C2, grep clean); `social_links` kept as FACT typed JSON (C4). Second consecutive critique-clean unit. Boundary held (Notifications/Spaces/ingestion substrates cited-not-re-spec'd; networks schema-0; code homes + ADR-002 amendment `[DEFERRED — build]`).

**Prior status (retained):** Independent adversarial critic (fresh code-aware subagent) → **SHIP / 0 blocking** — the X* applies-to over-reach risk was disclosed in-PLAN and adjudicated correct (membership by the framework's governing *rule* §4 "the rules, not a hand-list", not the example-list); the M* exclusion guard C1 verified against M1's "Excluded: contacts" clause. 2 non-blocking notes folded (N1 X8 merge-branch clarity, N3 schema = the harder floor for C6), N2 (N7 attribution) endorsed.
**Date:** 2026-07-24 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/relationships/` (5 aspect files: identity, structure-data, business-rules, contract, conventions).
**Verdict (sweep):** **stale** (row 22) — drivers **006, 014, 013** (the first **notification-primary** unit).
**Grounded in:** `staleness-sweep.md` (row 22 + Part 1.2 Tier-1 forward-facing order), `capability-framework.md` §2 (R3/R4/R6/R7) + §3 ADR-006 (SP1/SP3) / ADR-014 (X1/X2/X5/X8) / ADR-013 (N1/N2/N7) + §4 applies-to + §5, all 5 current aspect docs, **and the live schema** (`packages/core/src/db/schema.ts` — 6 relationships tables, grepped this session).
**No-Guessing:** every forward token below is one the framework/ADR actually names (cited); no invented tokens. Every retired **live** token is a FACT (schema line cited) recorded in the As-is floor and retired in `[INTENT]` (R6 two-tier). Code/directory homes + the Notifications/Spaces/ingestion write contracts + the networks/health design passes + the ADR-002 amendment are `[DEFERRED — Part 2 / build phase]`, never decided here.

---

## §1. Context — why this re-run, and the true stale shape

Relationships is the platform's **personal CRM** — a **Wave-1 independent domain**, the **PII-heaviest module** (every identifying field `[E]`), with **6 live tables** (`contacts`, `contact_events`, `interactions`, `contact_reminders`, `reminder_groups`, `reminder_group_contacts`), a derived interaction-stats/health model, a rich three-mechanism reminder system, and (schema-0, `[INTENT]`) networks + a Sigma.js neural graph. It predates ADR-006 (tags), ADR-014 (ingestion), and ADR-013 (notification delivery). Sweep verdict is **stale**: it carries an **inline flat-tag design** (`contacts.tags` JSON, no `entity_tags`/`parent_tag_id`) as its live model, and — as a heavy reminder + import module — names **none** of the N* delivery or X* ingestion tokens.

**The R6 fact that shapes this unit (a live-schema floor):** relationships **HAS a live v2 schema** (grepped: `contacts:535` with inline `tags` `[E]` `:548` + inline `social_links` `[E]` `:549`, `contact_events:559`, `interactions:572`, `contact_reminders:588`, `reminder_groups:599`, `reminder_group_contacts:609`). So the tag retirement rides a **real As-is FACT floor** (like habits/finance/tasks). `network_groups`/`network_group_contacts` are **schema-0** (`[INTENT]` G2 — not live). There is **no `page_tags`** anywhere in relationships (it uses inline tags, not page-tags — so the SP1 fix is a pure *inline*-retirement, not a `page_tags` forward-correction).

**Ground-truth refinement (the sweep scored only structure-data; this PLAN reads all 5 aspects + the schema):** the reframe is a **one-retirement + two-gap-add mixed case** — cleanly additive on the two heaviest drivers (N*/X* are *naming* gaps where the doc's discipline is already directionally correct), with one live-FACT tag retirement:

| Cap | Framework token (owning ADR) | Present today? | Fix shape |
|---|---|---|---|
| **SP1** inline `contacts.tags` → `entity_tags` | `entity_tags` (`tag_id, entity_type, entity_id`) is the tag primitive; retired per-module inline tags (ADR-006 §3.2) | **WRONG-MODEL (live FACT)** — inline `contacts.tags` `[E]` JSON `schema.ts:548`; the doc says "shared, scoped tags" (RL-10, identity L34, structure-data L61, contract L30, conventions L26) but names **neither** `entity_tags` nor the token | **retire in `[INTENT]`** → `entity_tags`; inline `contacts.tags` recorded in As-is floor, retired (R6 two-tier); Relationships registers `entity_type='contact'` (and `'network'` when networks land) |
| **SP3** nestable tags `parent_tag_id` | tag row carries `parent_tag_id` (`#a/b`) (ADR-006 §3.2) | **GAP** — the doc's "scope (module vs universal)" gesture (RL-10) is NOT `parent_tag_id`; nesting is unnamed | **gap-add** — name `parent_tag_id` (SP3) as the shared vocabulary's nesting; the "scope/universal" refinement is a Notes-&-Pages/Spaces concern (cite-not-decide) |
| **N1** three-tier delivery | each notification classified `in-app` · `local-scheduled` (from the `dueIn` seam) · `wake-signal` (ADR-013 §3.1); Notifications is the dispatcher | **GAP** — the reminder system (RL-6 three mechanisms, `getDueReminders`) produces nudges but names **no** ADR-013 delivery model | **gap-add** — name the reminder/"overdue to reach out" nudge as a notification riding the **N1** three-tier model (a "reach out" nudge = `local-scheduled` from `dueIn`); Notifications-owned |
| **N2** content-free wake payload | off-device push carries **no** `title`/`message`/`entity_type`/`entity_id`; device composes locally (ADR-013 §3.3) | **GAP (ZK-critical here)** — RL-1 encrypts PII + RL-7 "never auto-sends", but the push-payload ZK contract is unnamed | **gap-add** — name **N2**: a relationship reminder's PII (contact name) is **never** in an off-device push; the device composes it locally after sync/decrypt — the PII-heaviest use of N2 on the platform |
| **X1** device-mediated ingestion | device fetches→parses→encrypts→writes vault; a **server-plaintext fetch is refused, not downgraded** (ADR-014 §3.1) | **GAP (directionally verbatim)** — RL-11 "import is device-side only" + business-rules L76 "refused, not downgraded" **IS X1** in spirit, but names no ADR-014 token | **gap-add (naming)** — name **X1**: device contact import is device-mediated; the "refused not downgraded" rule is X1's. *Applies-to nuance flagged in §2/C-guards.* |
| **X8** reconcile-on-import | merge imports use `import_staging` (parsed rows + per-row status), auto-match, commit on user confirm; dedup by natural key (ADR-014 §3.5) | **GAP (verbatim)** — the "Device import → matched + merged, no dupes / per-row flags" terminal state (business-rules L69) **IS X8** but names no token | **gap-add (naming)** — name **X8** `import_staging` as the contact-import reconcile mechanism; commit-on-confirm, never silent overwrite |

**Fix shape:** relationships is a **live-FACT-floor mixed case, lightly additive** — **one live-FACT retirement** (SP1 inline `contacts.tags` → `entity_tags`, R6 two-tier; + SP3 nesting) + **two naming gap-adds where the discipline is already correct** (N* reminder-delivery — the 013 driver, PII-critical; X* device-import — the 014 driver, RL-11 already X1-verbatim). **No M\*** (contacts are framework-**excluded** reference data; relationship health is a *derived* analytic, not a pursuable — the load-bearing guard C1). **No 012/E\*** (interaction-streak→Gamification is flagged `[INTENT]` but 012 is **not** a sweep driver — C2). **No 007/V1** (views not a driver — C7).

---

## §2. What changes — one retirement + N*/X* naming gap-adds + guards

### Primary A — retire the live-FACT inline tag design (R6 two-tier; driver 006)

| # | Cap | Retire (As-is FACT floor) → add (`[INTENT]`) | Owning ADR (cite; DDL deferred) | Aspect(s) |
|---|---|---|---|---|
| G-SP1 | **inline `contacts.tags` → `entity_tags`** | As-is FACT: inline `contacts.tags` `[E]` JSON (`schema.ts:548`). `[INTENT]`: retire → the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`, SP1); Relationships is a **consumer**, registers `entity_type='contact'` (and `'network'` when networks land) in the open taggable-type registry (SP2). Resolve the doc's vague "shared, scoped tags" → **decided: `entity_tags`** (the "universal-vs-module scope" refinement stays a Notes-&-Pages/Spaces concern, cited) | ADR-006 §3.2 (SP1/SP2) | identity (L34) · structure-data (L9/L61) · business-rules (RL-10) · contract (L30) · conventions (L26/L45) |
| G-SP3 | **nestable tags `parent_tag_id`** | `[INTENT]`: the shared vocabulary supports nesting via **`parent_tag_id`** (`#a/b`, SP3); the doc's "scope (module vs universal)" gesture is reconciled to the tag-family (nesting = SP3; the scope refinement is Notes-&-Pages-owned, cite-not-decide) | ADR-006 §3.2 (SP3) | structure-data (L61) · business-rules (RL-10) · conventions (L26) |

### Primary B — name the reminder→notification delivery contract (driver 013 — the heaviest, PII-critical)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-N1 | **reminders ride the three-tier delivery** | the three reminder mechanisms (RL-6: stay-in-touch "overdue" cadence · `contact_reminders` · `reminder_groups` batch nudge) each produce a **notification** classified by ADR-013 **N1** — `in-app` (always, local encrypted row) · `local-scheduled` (native, from the **`dueIn`** seam — a "reach out before it goes cold" nudge is the canonical local-scheduled case) · `wake-signal` (cross-device). **Notifications is the dispatcher** (Relationships is a producer — cite-not-re-spec). The `getDueReminders(range)` API feeds the `dueIn` read seam (R7) | ADR-013 §3.1 (N1); R7 (§2) | identity (L11/L28) · business-rules (RL-6/RL-7) · contract (L20/L39) · conventions (L18) |
| G-N2 | **content-free wake payload (ZK-critical)** | name **N2**: a relationship reminder's off-device push carries **no** `title`/`message`/`entity_type`/`entity_id` — **no contact PII ever leaves in a push**; the device syncs, decrypts, and composes the nudge locally. This is the platform's **most PII-sensitive** use of N2; it reinforces (does not replace) RL-1 (`[E]` PII) + RL-7 ("never auto-sends") | ADR-013 §3.3 (N2) | business-rules (RL-1/RL-7) · conventions (landmine) |
| G-N7 | **quiet-hours pre-applied** (light) | note reminder scheduling honors **N7** (quiet-hours applied at registration — Preferences-owned); a "reach out" nudge respects quiet hours | ADR-013 §3.2 (N7) | conventions (light) |

### Primary C — name the device-import ingestion contract (driver 014 — RL-11 already X1-verbatim)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-X1 | **device-mediated contact import** | name **X1**: `importDeviceContacts()` is device-mediated — the device parses/normalizes on-device, encrypts (R3), writes vault rows; **a server-plaintext path is refused, not downgraded**. RL-11 + business-rules L76 **are X1** — name the token. *Applies-to nuance: the framework's X1 example-list doesn't enumerate Relationships, but its membership **rule** ("ingests external data") selects it — device contact import is ingestion; flagged in C-guards.* | ADR-014 §3.1 (X1) | business-rules (RL-11) · contract (L14) · conventions (L22) |
| G-X8 | **reconcile-on-import via `import_staging`** | name **X8**: the "matched + merged, no dupes / per-row flags" import (business-rules L69 terminal state) uses **`import_staging`** (parsed rows + per-row match status), auto-matches, **commits on user confirm** (never a silent overwrite), dedups by natural key. Contact import is the ADR-014 §3.5 **merge branch** (dedup *against existing contacts*), NOT an add-only feed like ICS — hence it uses `import_staging` rather than the add-only `feed_id,uid` path | ADR-014 §3.5 (X8) | business-rules (import terminal state) · contract (L14) · conventions (L22) |
| G-X2/X5 | **layer + grant (light)** | note the contact-import connector is classified by **X2** (a `native` device-source, or `user-managed` for a Google-Contacts-style feed) and gated by the ADR-010 **`external_in_ok`** grant (**X5**, no new columns) | ADR-014 §3.2 (X2) / §3.4 (X5) | contract (L14) · conventions (light) |

### Secondary — flagged guards surfaced by grounding (flag, don't silently skip)

| # | Finding | Fix | Cite | Scope guard |
|---|---|---|---|---|
| C1 | **No M\* — contacts are framework-EXCLUDED reference data.** M1 applies-to explicitly excludes "reference data (contacts, notes, links)". "Relationship health" (RL-5) is a **derived, closeness-weighted analytic**, not a pursuable measure; it is also **not an M5 source** (relationships isn't in the M5 applies-to = Finance/Habits/Health/Projects). | **Do NOT add `measurement_kind`/`binding_mode`/M3-nullable/M5.** Relationship health stays a derived internal analytic (RL-5, recomputed, never stored as truth); do not make it "measurable." **The load-bearing guard.** | framework §3 M1 (excluded: contacts); M5 applies-to; RL-5 | **scope guard (primary)** — health is derived, not an M-pursuable |
| C2 | **012 is NOT a sweep driver.** RL-9/G12 "interaction streaks feed Gamification" is flagged `[INTENT]`; the sweep drivers are 006/013/014 only. | **Do NOT add E2 `grant_currency`.** Keep the streak→Gamification edge as the existing `[INTENT]` mention (Gamification-owned); do not manufacture an economy-feeder contract this pass. | sweep row 22 (drivers 006/013/014, no 012); RL-9 | **scope guard** — no economy contract |
| C3 | **inline `contacts.tags` is a live FACT** (`schema.ts:548`) — the As-is floor `[INTENT]` retires (R6 two-tier). | Record inline `contacts.tags` `[E]` JSON in the As-is floor; retire → `entity_tags`. | ADR-002 §5.9; ADR-006 SP1; `schema.ts:548` | **R6 discipline** — floor kept, not overwritten |
| C4 | **inline `contacts.social_links` is a live FACT and is NOT a tag concern** (`schema.ts:549`, typed JSON {linkedin, twitter, instagram, whatsapp}). | **Keep `social_links` untouched.** It is structured typed JSON (RL-1 `[E]`), not tags — do NOT retire it to `entity_tags`. | ADR-002 §5.9; `schema.ts:549`; relationship.ts L42-47 | **scope guard** — don't over-retire non-tag inline JSON |
| C5 | **The derived stats/health caches are already aligned.** `last_interaction_date`/`interaction_count`/`next_contact_date` (RL-3) + health (RL-5) are "derived from the ledger, never stored as truth." No stored `progress` column exists. | **No M3 nullable-override edit** (and no M\* at all — C1). Leave the derived-recompute framing (RL-3/RL-5) intact — it is already the correct pattern. | ADR-011 M3 (anti-signal absent); RL-3/RL-5 | **scope guard** — don't touch derived caches |
| C6 | **`network_groups`/`network_group_contacts` are schema-0** (`[INTENT]` G2, not in `schema.ts` — grep-confirmed absent). The neural graph rides network membership + `entity_links`. | **Keep networks as `[INTENT]`** (not a live floor); the graph's code home + the networks DDL are `[DEFERRED — build]`. `entity_tags` registers `entity_type='network'` only when networks land. | `schema.ts` (6 live tables, the hard floor) + ADR-002 §5.9; identity L17; boundary rule | **boundary guard** — no structural call on networks |
| C7 | **No 007/V1.** The "Views (G1)" framing (Dashboard/Graph/grouped) — 007 is **not** a sweep driver for relationships (unlike tasks). | **Do NOT reframe views to the `views` primitive this pass.** Leave the view/graph framing as-is; the Sigma.js neural graph is a rendering, not a `views`-row concern here. | sweep row 22 (no 007); tasks-PLAN C8 (007 is a dedicated pass) | **scope guard** — no V1 reframe |

**Scope guards (do NOT over-apply):**
- **R6 two-tier is REAL but narrow.** Only **SP1** touches the live floor (inline `contacts.tags` `:548`) → recorded, retired. The N*/X*/SP3 additions are `[INTENT]` naming gap-adds (no floor to preserve — the doc has no ADR-013/014 tokens today). `social_links` (`:549`) is a live FACT that **stays** (C4). Networks are schema-0 (C6).
- **Conceptual home + owning ADR only.** Every new token (`entity_tags`, `parent_tag_id`, the N1/N2 delivery model, `dueIn`, `import_staging`, `external_in_ok`) is cited to its ADR; **which package/table it physically lives in is `[DEFERRED — Part 2]`.**
- **Cite-not-re-spec the owned substrates.** `entity_tags`/registry/`parent_tag_id` = Spaces-owned (notes-and-pages re-run, done); the three-tier delivery + wake-relay + `push_token` registry = **Notifications/ADR-003-owned** (aligned, sweep row 23); `import_staging` + the X-grant = ADR-014-governed. Relationships names the contracts it rides/produces-into, does not author them.
- **No M\*** (C1 — the primary guard), **no E\*/012** (C2), **no 007/V1** (C7). **No schema-level reconciliation** — the ADR-002 amendment (networks, closeness_tier, restored G8 fields, `entity_tags` migration) → build phase (ADR-016).

---

## §3. Per-aspect edit map (all 5 aspects touched)

**`identity.md`**
- **G-SP1** — L34 ("Not its own tag vocabulary … shared system — but scoped … a refinement Notes & Pages owns"): **decide it** — the shared primitive is **`entity_tags`** (SP1, `entity_type='contact'`); inline `contacts.tags` is the As-is, retired; the "scope/universal" refinement stays Notes-&-Pages-owned (cite). `[INTENT G10; ADR-006 SP1]`
- **G-N1** — L11 ("get nudged to reach out before a relationship goes cold") + L28 ("Not the calendar/agenda … creates reminders"): the nudge is a **notification** riding the ADR-013 **N1** three-tier model (local-scheduled from `dueIn`); Notifications is the dispatcher. `[INTENT G1; ADR-013 N1]`

**`structure-data.md`** (the As-is floor + the ⚠ INTENDED block land here)
- **Keep the As-is floor** (L5–19): the 6 live tables, inline `contacts.tags` + `social_links` JSON, denormalized stats — recorded as FACT (they exist in `schema.ts`; C3/C4/C5). Keep networks as schema-0 `[INTENT]` (C6).
- **G-SP1** — the `contacts` row (L9 "tags") + single-source (L61 "Tags resolve to the shared (scoped) vocabulary … not inline"): retire inline `contacts.tags` (`schema.ts:548`) → **`entity_tags`** (SP1); register `entity_type='contact'` (SP2). `[INTENT G10; ADR-006 SP1/SP2]`
- **G-SP3** — L61: name **`parent_tag_id`** (SP3) as the vocabulary's nesting; reconcile the "scope" gesture (nesting = SP3; universal/module scope = N&P-owned). `[INTENT; ADR-006 SP3]`
- **C4 guard** — L18 (`social_links` typed JSON): **keep** — structured JSON, not tags; do not retire to `entity_tags`. `[FACT: relationship.ts L42-47]`
- **ADRs block** (L63–66): extend the R6 named-ADR set → +006/013/014 (beyond As-is 002/001/003); the INTENDED additions + `entity_tags` migration converge into the ADR-002 amendment `[DEFERRED — build]`.

**`business-rules.md`**
- **G-SP1/G-SP3** — RL-10 ("Shared, scoped tags"): retire inline `contacts.tags` → **`entity_tags`** (SP1) with `parent_tag_id` nesting (SP3); the scope refinement is N&P-owned. `[INTENT G10; ADR-006 SP1/SP3]`
- **G-N1** — RL-6 (three reminder mechanisms): each mechanism produces a notification riding the ADR-013 **N1** three-tier model (the "overdue to reach out" / due-reminder = `local-scheduled` from the `dueIn` seam, R7); Notifications-owned. `[INTENT G6; ADR-013 N1; R7]`
- **G-N2** — RL-7 ("never auto-sends") + RL-1 (encrypted PII): add **N2** — a reminder's off-device push carries **no PII** (`title`/`message`/`entity_type`/`entity_id` absent); the device composes locally. The platform's most PII-critical N2 use; reinforces RL-1/RL-7. `[INTENT G11; ADR-013 N2; ZK-1]`
- **G-X1/G-X8** — RL-11 ("device import is device-side only") + the failure L76 ("refused, not downgraded") + the Device-import terminal state L69 ("matched + merged, no dupes / per-row flags"): name **X1** (device-mediated, refused-not-downgraded — RL-11 **is** X1) + **X8** (`import_staging` reconcile-on-import, commit-on-confirm). `[INTENT G7; ADR-014 X1/X8]`
- **C1 guard** — RL-5 (relationship health): **keep derived** — health is NOT an M-pursuable (contacts are framework-excluded reference data); do not add `measurement_kind`/`binding_mode`. Leave "derived, closeness-weighted, never stored as truth." `[FACT/INTENT — M\* exclusion noted]`
- ⚠ Flagged-delta block (L78–89): add the `entity_tags` migration + name the ADR-013/014 contracts as `[INTENT]`; the live-invariant list (RL-1, RL-2, RL-3, RL-6 a/b/c, RL-8, RL-12) stays FACT.

**`contract.md`**
- **G-N1** — L20 (`getDueReminders(range)` "consumed by the Calendar") + L39 (Consumed-by Calendar/Journal): the due-reminder feed is the **`dueIn`** read seam (R7) that ADR-013 **N1** `local-scheduled` notifications read; Notifications dispatches. `[INTENT; ADR-013 N1; R7]`
- **G-X1/G-X8** — L14 (`importDeviceContacts()`): name **X1** (device-mediated) + **X8** (`import_staging` match→merge→commit-on-confirm) + **X2/X5** (layer + `external_in_ok` grant, light). `[INTENT G7; ADR-014 X1/X8/X2/X5]`
- **G-SP1** — L30 ("Shared (scoped) tag system"): decided → **`entity_tags`** (`entity_type='contact'`, SP1); the scope refinement is N&P-owned. `[INTENT G10; ADR-006 SP1]`
- **C2 guard** — L41 (Consumed-by Gamification, interaction streaks): **keep as-is** `[INTENT]` (012 not a driver; no E2 added).
- **C1 guard** — L25 (`getContactHealth` derived): keep derived (no M\*).

**`conventions.md`**
- **G-SP1/G-SP3** — L26 ("Tags via the shared, scoped system") + L45 landmine ("Never reintroduce an inline per-contact tag list"): **keep the anti-inline landmine** (it's correct); name the primitive **`entity_tags`** (SP1) + `parent_tag_id` nesting (SP3); the scope refinement is N&P-owned. `[INTENT G10; ADR-006 SP1/SP3]`
- **G-N1/G-N2** — L18 ("Reminders are created here, viewed on the Calendar") + L20 ("Group reminders never auto-send"): the reminder produces a notification riding ADR-013 **N1** (three-tier, `local-scheduled` from `dueIn`); a new landmine — **never put contact PII in an off-device push** (**N2** content-free wake payload; the device composes locally). `[INTENT; ADR-013 N1/N2]`
- **G-X1/G-X8** — L22 ("Import is device-side"): name **X1** (device-mediated, refused-not-downgraded) + **X8** (`import_staging` reconcile, commit-on-confirm); keep the "never a server-readable plaintext path" landmine (it's X1). `[INTENT G7; ADR-014 X1/X8]`
- **C1 guard** — L11–13 (health computed): keep derived/closeness-weighted, never persisted; **no `measurement_kind`** (contacts are reference data, not pursuable). `[INTENT G4; M\* exclusion]`
- **N7** (light) — reminder scheduling honors quiet-hours (Preferences/Notifications-owned). `[INTENT; ADR-013 N7]`

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **SP1** — `entity_tags` named as the tag primitive across aspects; inline `contacts.tags` (live `schema.ts:548`) recorded in As-is floor and retired; `entity_type='contact'` (SP2 open registry) named; the vague "shared, scoped tags" resolved to `entity_tags`. No forward inline-tag-as-model claim.
- [ ] **SP3** — `parent_tag_id` named as the shared vocabulary's nesting; the "scope (module vs universal)" gesture reconciled (nesting = SP3; universal/module scope = Notes-&-Pages-owned, cited).
- [ ] **N1** — the three reminder mechanisms (RL-6) named as notification producers riding the ADR-013 three-tier delivery (`in-app`/`local-scheduled` from `dueIn`/`wake-signal`); Notifications named as the dispatcher (cite-not-re-spec); `getDueReminders` = the `dueIn` seam (R7).
- [ ] **N2** — the content-free wake payload named (no contact PII — `title`/`message`/`entity_type`/`entity_id` — in an off-device push; device composes locally); tied to RL-1/RL-7 as the platform's most PII-critical N2 use.
- [ ] **X1** — device contact import named as device-mediated (RL-11 = X1); the "refused, not downgraded" rule named as X1's; the applies-to-list nuance flagged (relationships qualifies by the membership rule, not the example list).
- [ ] **X8** — the import reconcile named as `import_staging` (match→merge→commit-on-confirm, per-row status, never silent overwrite); X2/X5 (layer + `external_in_ok`) cited light.
- [ ] **C1 guard (primary)** — no `measurement_kind`/`binding_mode`/M3-nullable/M5 added; relationship health kept as a derived, closeness-weighted analytic (contacts are framework-excluded reference data).
- [ ] **C2 guard** — no E2/`grant_currency` added (012 not a driver); the streak→Gamification edge kept as the existing `[INTENT]`.
- [ ] **C3 guard** — inline `contacts.tags` recorded as As-is FACT, not pretended-migrated.
- [ ] **C4 guard** — inline `contacts.social_links` (live `schema.ts:549`, typed JSON) kept untouched, not retired to `entity_tags`.
- [ ] **C5 guard** — the derived stats/health caches (RL-3/RL-5) left as derived-from-ledger; no stored-truth or M3 edit.
- [ ] **C6 guard** — `network_groups`/`network_group_contacts` kept as schema-0 `[INTENT]`; networks DDL + graph code home `[DEFERRED — build]`.
- [ ] **C7 guard** — no 007/V1 reframe (views not a driver); the Sigma.js graph framing left as-is.
- [ ] **Boundary rule** — every code/directory home + the Notifications/Spaces/ingestion write contracts + the networks/health design passes + the ADR-002 amendment is `[DEFERRED — Part 2 / build]`; only conceptual ADR homes asserted.
- [ ] **R6** — the As-is (live FACT floor: 6 tables + inline `tags`/`social_links` + derived caches) / `[INTENT]` split intact; named-ADR set extended to 002/001/003 + 006/013/014.
- [ ] **Rails** — `[E]` on all PII preserved (R3/RL-1); `_sync_*`/soft-delete/CASCADE intact (R4/RL-2); notifications produced via N1 (not a direct server-readable path), imports via X1 (device-mediated), reads via R7 (`dueIn`).
- [ ] **No new anti-signal** introduced; **no structural call made**; no schema-level reconciliation attempted.
- [ ] **No contradiction** with any ADR 001–017, nor with neighbors (Spaces owns `entity_tags`/`parent_tag_id`/registry; Notifications+ADR-003 own the three-tier delivery/wake-relay/`push_token`; ADR-014 owns `import_staging`/the X-grant; Gamification owns any streak economy).

---

## §5. Out of scope (explicit)

- **The three-tier delivery mechanism** — `wake-relay`, `push_token`/`push_platform` registry, the channel matrix, quiet-hours engine are **Notifications + ADR-003-owned** (aligned, sweep row 23); this unit names Relationships as a *producer* riding N1/N2, does not author the dispatcher.
- **The `entity_tags` primitive + registry + `parent_tag_id`** — **Spaces-owned** (notes-and-pages re-run, done); this unit names Relationships as a *consumer* (`entity_type='contact'`/`'network'`), does not author the tag DDL. The "universal-vs-module tag scope" refinement is a Notes-&-Pages concern (RL-10), cited-not-decided.
- **The ingestion substrate** — `import_staging`, the X-layer classification, the `external_in_ok` grant are **ADR-014-governed**; this unit names the contract the contact-import rides, does not re-spec ADR-014.
- **Networks + neural graph** — `network_groups`/`network_group_contacts` (schema-0), the closeness tier, the Sigma.js graph code home → build phase; this unit keeps them `[INTENT]` and does not decide their structure (C6).
- **Relationship-health design** — the health formula, closeness-tier definition, and banding are a build-phase call; this unit keeps health a **derived** analytic and explicitly does **not** make it an M-measurable (C1).
- **Gamification / interaction streaks (012)** — not a sweep driver (C2); the streak→Gamification edge stays the existing `[INTENT]` mention, untouched.
- **Views / 007** — not a driver (C7); no `views`-primitive reframe this pass.
- **The restored/INTENDED fields + ADR-002 amendment** — `how_we_met`, energy fields, snooze/priority, `closeness_tier`, networks, event-anchored group reminders → a candidate ADR-002 amendment (named, not designed).
- **Code/directory homes + schema reconciliation** — final DDL, table counts, the ADR-002 amendment authoring → build phase (ADR-016).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-24 | Initial PLAN drafted from the ground read (sweep row 22 + framework §2 R3/R4/R6/R7 + §3 ADR-006 SP1/SP3 / ADR-014 X1/X2/X5/X8 / ADR-013 N1/N2/N7 + §4 applies-to + §5, all 5 aspect docs, **and the live schema** — 6 relationships tables, inline `contacts.tags:548` + `social_links:549`). Ground-truth: relationships HAS a live v2 schema (real As-is floor); `network_groups` is schema-0 `[INTENT]`; no `page_tags` (inline-tags only). The first **notification-primary** unit: **one live-FACT retirement** (SP1 inline `contacts.tags` → `entity_tags` + SP3 `parent_tag_id`, R6 two-tier) + **two naming gap-adds where the discipline is already directionally correct** (N* reminder-delivery — the 013 driver, PII-critical N2; X* device-import — the 014 driver, RL-11 = X1 verbatim). Seven guards: **C1 (primary) no M\*** — contacts are framework-excluded reference data, health is derived-not-measurable; C2 no E2/012 (not a driver); C3 inline `contacts.tags` = As-is floor; C4 `social_links` kept (not a tag concern); C5 derived caches kept; C6 networks schema-0; C7 no 007/V1. X* applies-to nuance flagged (relationships qualifies by the membership rule, not the framework's example-list). Presented for the LITE gate. |
| 2026-07-24 | Independent adversarial critique (fresh code-aware subagent) → **SHIP / 0 blocking** — second consecutive clean unit. The critic verified all 8 schema-line cites, `network_group*`/`entity_tags` schema-0 (grep absent), no `page_tags` in the relationships block (535-615 clean), sweep row 22 drivers (006/013/014, no 012), and every framework/ADR/aspect cite. **The primary hunted risk — X* applies-to over-reach — adjudicated DEFENSIBLE:** Relationships is absent from both X1's example-list (framework:195) and the §4 "Ingests external data" row (:245), but the framework §4 (:229) sanctions membership-by-rule verbatim ("the rules, not a hand-list… as new contexts appear") and ADR-014 §3.1 makes device-mediated ingestion universal — device contact import IS ingestion; the PLAN disclosed the nuance rather than hiding it. **M* exclusion (C1) verified correct** against M1's "Excluded: reference data (contacts…)" clause + M5 applies-to (no Relationships); grep confirmed every M*/E* token sits only inside a guard/negation. C4 `social_links` = typed JSON `{linkedin,twitter,instagram,whatsapp}` (relationship.ts L42-47, verbatim) → keep-untouched correct. No blocking findings. 3 non-blocking notes: N1 (X8 = the merge branch, dedup-against-existing, not add-only ICS — folded into G-X8), N2 (N7 §3.2 attribution correct — no change), N3 (schema is the harder floor for C6 — folded). N1+N3 folded. Ready for Victor's LITE-gate approval. |
