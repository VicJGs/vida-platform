# Re-run PLAN — preferences (Part 1.2, Tier 2 — gate-surfaced late add)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** 🟢 PLAN — CRITIQUE-CLEAN (independent adversarial critic, fresh subagent → **SHIP**, 0 blocking; every ADR cite VERIFIED against source + the live `user_profile` schema; PR-1 confirmed sound — the 4 routed families are plaintext at `schema.ts:1173/1176/1186/1188`, `focus_areas[E]`+PII correctly excluded; no scope leak, no over-reach, completeness full). Non-blocking Note 1 folded → guard **C-E-fields** (exclude `focus_areas[E]`/`life_stage`/`timezone`/`skipped_modules` from the E9 receipt). **Awaiting Victor LITE-gate approval → implement.** NOT yet applied.
**Date:** 2026-07-25 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2 → surfaced by the **Part-1 EXIT gate**).
**Context:** `docs/features/preferences/` (5 aspect files: identity, structure-data, business-rules, contract, conventions — all mtime 2026-06-22, **pre-campaign**).
**Verdict (sweep vs. reality):** sweep row 24 = **aligned (soft E9 fill)** — **WRONG against the live doc.** The Part-1 EXIT gate (independent critic, cluster-3) re-scored it **stale-by-omission**: the "soft fill" was never performed, the doc predates the whole campaign, and it names **zero** substrate tokens. Corrected driver set: **012 (E9), 013 (N6/N7), 014 (Layer-3 user-managed)**.
**Grounded in:** `staleness-sweep.md` (row 24) + the Part-1-exit critic finding, `capability-framework.md` §2 (R3/R4/R6) + §3 ADR-012 (E9) / ADR-013 (N6/N7) / ADR-014 (X-family, esp. Layer 3) + §4 applies-to + §5, all 5 current aspect docs, and the mandating ADR text (ADR-012 §3.10 L85-86/L127/L138; ADR-013 §3.2 L51 / §3.4 L59 / §5 L74; ADR-014 §3.2 L50 / §5 L132).
**No-Guessing:** every forward token below is one the framework/ADR actually names (line-cited). The As-is floor (3 live tables `user_preferences`/`nav_preferences`/`command_bar_history`, `quiet_hours_*`, per-module push toggles) is a live FACT (ADR-002 §5.17). Storage shape of the migrated columns, the `active_modules`↔`module_visibility` merge, and the ADR-002 amendment are `[DEFERRED — build phase / ADR-002 §5.20]`, never decided here. Code/directory homes = `[DEFERRED — Part 2]`.

---

## §1. Context — why this re-run, and the true shape (the gate's late catch)

Preferences is the platform's **configuration provider** and **owner of the Settings screen** — 3 owned tables, all plaintext config (PR-1), consumed platform-wide, depends on almost nothing (out-degree ≈ 0). It is the **receiving end of three foundation amendments authored *after* it was written**, and it received none of them:

1. **ADR-012 §3.10 (E9) — the `user_profile` single-writer split.** ADR-012 explicitly routes `persona`/`motivation_style`/`active_modules`/`onboarding_*` **→ Preferences** ("**which owes a receiving amendment**", L86). Its sibling owners already documented their half: gamification **GM-12** (`business-rules.md:72`, `structure-data.md:44`, `identity.md:41`) and check-ins **CK-11** both hand these fields to Preferences. Preferences **claims none of them** — a live single-writer contradiction-by-omission (two owners point at a third that stays silent).
2. **ADR-013 §3.4 (N6) — the channel-matrix collapse.** ADR-013 §5 L74: "channel/quiet-hours config is **Preferences'** (§5.17)." The v1 four-channel matrix (`in_app|email|push|sms`) collapses to **in-app · push · email — no SMS** (L59). The doc owns per-module push toggles + channel config but never enumerates the matrix or names the `sms` drop.
3. **ADR-013 §3.2 (N7) — quiet-hours pre-applied at registration.** L51: the dispatcher **pre-applies Preferences quiet-hours at schedule registration** (shift/suppress), and a quiet-hours change triggers a **reschedule** — because a pre-scheduled OS alert fires with the dispatcher not running. The doc stores `quiet_hours_*` as bare `HH:MM` As-is facts (`business-rules.md:21`) with no N7 mechanism.
4. **ADR-014 §3.2 (Layer 3) — the user-managed integration surface.** L50/L132: "a **Preferences** integration surface (webhooks + external-API management, Notion-style) with Vida **cookbooks**" — the user-managed ingestion layer is **Preferences-owned**. The doc names no integration surface at all.

**The true shape:** preferences is a **pure gap / owed-amendment re-run** — **no wrong-model forward tokens to retire** (it names no retired token; it is simply *silent*). Every edit is an additive `[INTENT]` amendment naming a contract the ADR already decided, plus the R6 two-tier framing (As-is floor = the live 3-table config; `[INTENT]` = the four substrate amendments). This is the sessions-and-scheduling gap pattern, not a projects/habits wrong-model retirement.

| Cap | Framework token (owning ADR) | Present today? | Fix shape |
|---|---|---|---|
| **E9** `user_profile` single-writer split | Preferences owns `persona`·`motivation_style`·`active_modules`·`onboarding_*`; System keeps per-currency total+level; `check_in_streak*`→Check-ins; **PII stays in `user_profile` ⚠** (ADR-012 §3.10) | **GAP** — 0 tokens; owed amendment never landed | **gap-add** — name Preferences the single-writer owner of the 4 field-families, migrated off overloaded `user_profile` |
| **N6** channel matrix (no SMS) | channels enumerate `in_app`(full)·`push`(wake-only)·`email`(generic) — **no `sms`** (ADR-013 §3.4) | **GAP** — has push toggles, never enumerates the matrix or the `sms` drop | **gap-add** — enumerate the 3-channel matrix, name `sms` dropped |
| **N7** quiet-hours pre-applied | `quiet_hours_*` consumed **at registration** (shift/suppress), reschedule-on-change (ADR-013 §3.2) | **GAP** — stores `quiet_hours_*`, no N7 mechanism | **gap-add** — name the registration-time pre-apply + reschedule-on-change contract |
| **X (Layer 3)** user-managed integration surface | Preferences owns the self-service webhooks + external-API mgmt + cookbooks layer (ADR-014 §3.2) | **GAP** — no integration surface named | **gap-add** — name the Layer-3 surface Preferences owns (delegating the mediated mechanism) |
| **R6** two-tier + named ADRs | As-is (FACT floor) / `[INTENT]` split + the ADRs it is subject to | **PARTIAL** — has ⚠ INTENDED additions but names only 002/001/003; missing 012/013/014 | **light** — add 012/013/014 to the subject-ADR set; frame the amendments As-is→[INTENT] |

---

## §2. What changes — four owed amendments + guards (name the contract, don't re-spec)

### Primary A — E9: receive the `user_profile` single-writer split (driver 012 §3.10)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-E9 | **Preferences = single-writer owner of `persona` · `motivation_style` · `active_modules` · `onboarding_*`** | These 4 field-families migrate **off the overloaded `user_profile`** (As-is FACT: `user_profile` overloaded across 3 owners, ADR-002 L3366-3396) and land Preferences-owned, plaintext config (PR-1 holds — ADR-012 marks none `[E]`). The receiving amendment ADR-012 says Preferences "owes." | ADR-012 §3.10 (E9); GM-12 | identity (owns-list) · structure-data (owned columns + `user_profile` split note) · business-rules (new PR invariant) · contract (read surface) · conventions |
| C-PII | **PII does NOT migrate here** | `display_name`/`avatar_url`/`birth_date` **STAY in `user_profile` ⚠** — no account/identity entity exists to receive them (ADR-012 §3.10). Preferences receives config only, never PII. | ADR-012 §3.10 (PII-stays) | identity (what-it-is-NOT) · conventions (landmine) |
| C-E-fields | **Migrate ONLY the four ADR-named plaintext families — NOT the sibling `[E]` fields** | The live `user_profile` (`schema.ts:1173-1189`) also carries `focus_areas /* E */`, `life_stage`, `timezone`, `skipped_modules` — ADR-012 §3.10 routes **none** of these to Preferences. `focus_areas` is **`[E]`**; sweeping it in under a loose "onboarding config → Preferences" read would drag an encrypted column into a plaintext-only context and break PR-1. Landmine: the E9 receipt is **exactly** `persona`/`motivation_style`/`active_modules`/`onboarding_*` (all plaintext, schema-confirmed) — `focus_areas[E]`/`life_stage`/`timezone`/`skipped_modules` are NOT part of it. | ADR-012 §3.10 (routes only the 4); `schema.ts:1175` `focus_areas /* E */` | conventions (landmine) · business-rules (PR-10 bound) |
| C-modules | **`active_modules` ≠ nav `module_visibility` ≠ `feature_gamification`** | Name the distinction: `active_modules` = the persona/onboarding-driven enabled-module set (E9, off `user_profile`); `module_visibility` = nav show/hide (PR-7, ⚠ INTENDED); `feature_gamification` = logic enable (PR-7). Whether they merge into one store = **`[DEFERRED — build phase]`**. | ADR-012 E9; PR-7 | structure-data (⚠ block) · business-rules (PR-7 extend) |

### Primary B — N6 + N7: the notification config Preferences owns (driver 013)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-N6 | **channel matrix = `in_app` · `push` · `email`, no `sms`** | Reframe the per-channel config to the ADR-013 collapsed matrix: `in_app`(full) · `push`(wake-only) · `email`(generic nudge). **`sms` is DROPPED** (un-encryptable, carrier-visible; v1 `NotificationChannel` had it). Per-module push toggles (As-is) ride the `push` channel. | ADR-013 §3.4 (N6); §5 L74 (Preferences owns channel config) | structure-data (channel config) · business-rules (new PR) · contract (Notifications consumer) · conventions (landmine) |
| G-N7 | **quiet-hours pre-applied at registration + reschedule-on-change** | Name the N7 contract: Preferences owns `quiet_hours_*` (As-is FACT); the Notifications dispatcher **pre-applies them at schedule registration** (a reminder inside quiet hours is scheduled shifted/suppressed), NOT enforced live at fire; a **change to the quiet-hours preference triggers a reschedule** of affected reminders. Mechanism is Notifications' (cite-not-re-spec); Preferences is the config source. | ADR-013 §3.2 (N7) L51 | business-rules (validation/edge — extend the existing `quiet_hours` line) · contract (Notifications consumer) · conventions |

### Primary C — X (Layer 3): the user-managed integration surface (driver 014 §3.2)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-X3 | **Preferences owns the Layer-3 user-managed integration surface** | Name the surface: a **self-service integration layer** (webhooks + external-API management, Notion-style) + Vida **cookbooks**, where the user wires their own connectors at their own risk. This is ADR-014's Layer 3 (native · public-reference · **user-managed**), Preferences-owned. | ADR-014 §3.2 (Layer 3) L50/L132 | identity (owns-list + what-it-is) · structure-data (surface, tables `[DEFERRED]`) · business-rules (new PR) · contract (exposed/delegated surface) · conventions |
| C-mediation | **Preferences owns the *management surface*, NOT the mediated mechanism** | The device-mediated fetch/parse/encrypt/egress + credential custody are **ADR-014's guard**, not Preferences'. Credentials live in ADR-014's encrypted `connection_config` under **OS-mediator custody** (never a plaintext preferences column) — so **PR-1 HOLDS**; each user connector = an ADR-010 sandboxed capability. Delegated exactly like Account/Data (PR-8 pattern). | ADR-014 §3.4 (mediator custody); ADR-010 sandbox | contract (delegation) · conventions (landmine) |
| C-AI | **This is NOT the AI-config surface** | identity.md:26 "Not an AI-config surface" **STAYS correct** — AI config = ADR-015 `ai_connections`, a **separate** surface (X11: LLM calls split to ADR-015). The Layer-3 integration surface is data-ingestion, not model-config. Do not conflate. | ADR-014 X11 / ADR-015 AI2 | identity (what-it-is-NOT — refine, keep) · conventions |

### Secondary — R6 framing + light substrate touch

| # | Finding | Fix | Cite |
|---|---|---|---|
| R6 | subject-ADR set names only 002/001/003 | Add **012 (E9) · 013 (N6/N7) · 014 (Layer-3)** to the ADRs-subject-to set; frame the 4 amendments As-is (live 3-table config) → `[INTENT]` (substrate receipt). | framework §2 R6 |
| S-mod | `identity.md:19` "each of the 17 modules" — the frozen pre-substrate count (the token the arch-doc sweep flagged) | Light touch: drop the hard-coded "17" → "each module" (module set is not a frozen count). Do NOT introduce spaces/ADR-006 scope here (out of driver set). | staleness-sweep arch findings; framework §4 (no fixed count) |

---

## §3. Aspects touched (all 5) + acceptance

**identity.md** — add to the owns-list: E9 config families (`persona`/`motivation_style`/`active_modules`/`onboarding_*`) + the Layer-3 integration surface; refine "what it is NOT" (PII stays in `user_profile`; still not the AI-config surface — now cite ADR-015 vs the ADR-014 integration surface it DOES own); drop the "17" count.
**structure-data.md** — add the E9 owned columns (migrated off `user_profile`, split note) to the ⚠ INTENDED block; enumerate the N6 channel matrix; name the Layer-3 surface (tables/shape `[DEFERRED — build]`); add 012/013/014 to the ADR set.
**business-rules.md** — new invariants: **PR-10** (Preferences is single-writer owner of the E9 config families; PII stays in `user_profile`); **PR-11** (channel matrix = in_app·push·email, no sms; N6); extend the `quiet_hours` validation line with the N7 registration/reschedule contract; **PR-12** (owns the Layer-3 management surface, delegates the mediated guard — PR-8 sibling).
**contract.md** — expose the E9 config reads/writes; add Notifications as consumer of the channel matrix + quiet-hours; add the Layer-3 integration-management surface (delegating mediated fetch/egress + `connection_config` custody to ADR-014).
**conventions.md** — landmines: never migrate PII into preferences; never store connector credentials in a plaintext preferences column (mediator custody); never add `sms`; never conflate the Layer-3 integration surface with the AI-config surface; `active_modules`/`module_visibility`/`feature_gamification` stay conceptually distinct.

### §4. Acceptance predicates (grep-checkable, post-implementation)
- [ ] **E9**: `persona` · `motivation_style` · `active_modules` · `onboarding_*` named Preferences-owned; `user_profile` split cited; **PII (`display_name`/`avatar_url`/`birth_date`) named as STAYING in `user_profile`**; ADR-012 §3.10 cited. Consistent with gamification GM-12 + check-ins CK-11 (same field routing).
- [ ] **N6**: `in_app` · `push` · `email` matrix enumerated; `sms` named as **dropped**; ADR-013 §3.4 cited.
- [ ] **N7**: quiet-hours **pre-applied at registration** + **reschedule-on-change** named; ADR-013 §3.2 cited.
- [ ] **X-Layer3**: user-managed integration surface (webhooks + external-API + cookbooks) named Preferences-owned; ADR-014 §3.2 cited; `connection_config` custody **delegated** (not a plaintext preferences column).
- [ ] **R6**: As-is/`[INTENT]` split holds; subject-ADRs include 012/013/014.
- [ ] **Guards**: PR-1 plaintext held (no new `[E]` preferences column); PII not migrated; AI-config-surface distinction held (ADR-015 vs ADR-014); no `sms`.

### §5. Boundary + scope guards (do NOT over-apply)
- **Cite conceptual homes, not code homes** — E9/N6/N7/Layer-3 substrates are owned by ADR-012/013/014; Preferences receives/renders. Code/directory homes = `[DEFERRED — Part 2]`.
- **No schema authoring** — the migrated columns, the `active_modules`↔`module_visibility` merge, the channel-config shape, and the integration-surface tables are `[DEFERRED — build / ADR-002 §5.20]`.
- **Don't touch the crypto/plaintext boundary** — preferences tables stay plaintext (PR-1); the only `[E]` in orbit is ADR-014's mediator-held `connection_config`, which is NOT a preferences column.
- **No M*/S*/economy-feeder tokens** — Preferences is not pursuable, runs no sessions, grants no currency; it is a config provider + the receiving end of E9/N6/N7 + the Layer-3 host. Do not manufacture measurability/session/feeder contracts.
