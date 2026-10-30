# S6 — Health engine (derived) (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S6 of 9. Legs: REL-22, REL-23, REL-24, REL-25, REL-47. The build-phase DESIGN-PASS
> (health formula — resolve-now, decomposition UNKNOWN homed to "MOD-relationships [F] spec"). Grounded in: RL-5,
> contract.md:25, the C1 guard (NOT a measurement), S2 derived stats, S3 events, the books `asOf` determinism seam.

## §1. Context

Relationship health (REL-22) is a **derived, closeness-weighted analytic** — recomputed on read, **never stored**,
and explicitly **NOT an ADR-011 measurement** (C1: contacts are framework-excluded reference data; no
`measurement_kind`/`binding_mode`/M5-advertise). Network health (REL-47) is the rollup of members' health. This slice
DESIGNS the formula (grounded + simple + documented); `asOf?` is the determinism seam (books precedent). Deps unchanged.

## §2. Business Rules (S6) — the formula

- **BR-RL-S6-1 (REL-22/23 — contact health)** — `getContactHealth(id, asOf?): ContactHealth`
  `= { band, score, factors, partial? }`. Guards a live contact (`ContactNotFoundError`).
  - **`new` (REL-23):** `interaction_count === 0` → `{ band:'new', score:null }` (no baseline — never "overdue").
  - **score (0-100, higher=healthier)**, from the S2 derived cache + recent sentiment:
    - `daysOverdue = next_contact_date != null ? max(0, daysBetween(next_contact_date, today)) : 0` (today = asOf ?? realToday).
    - `tracked = next_contact_date != null`.
    - `weight = closenessWeight(relationship_type, is_favorite)` — the **onion** (REL-25): inner tiers penalize neglect
      more. Derived from `relationship_type` + `is_favorite` (the fixed-enum alternative — `closeness_tier` is OPEN
      vocab, unweightable deterministically, so it stays a stored/display field, not a weight input at M1). Map:
      family/romantic 2.0 · mentor/mentee/friend 1.5 · colleague/professional 1.0 · acquaintance/other 0.75; `is_favorite` +0.5.
    - `recentSentiment` = mean of the last 5 interactions' sentiment (positive +1 · neutral 0 · negative −1); null if none rated.
    - `score = clamp(round(100 − daysOverdue*weight*1.5 + (recentSentiment ?? 0)*15), 0, 100)`.
  - **band:** `new` (count 0) · else if `!tracked` → `recentSentiment<0 ? 'at_risk' : 'healthy'` (sentiment-only) ·
    else `daysOverdue===0` → `recentSentiment!=null && recentSentiment<0 ? 'at_risk' : 'healthy'` ·
    `daysOverdue <= ceil(7/weight)` (grace, shorter for inner tiers) → `'at_risk'` · else `'overdue'`.
  - **`factors`** = `{ daysOverdue, tracked, closenessWeight, recentSentiment }` (transparency — why this band).
- **BR-RL-S6-2 (REL-24 — fail-loud flagged partial)** — if the compute degrades (a non-finite score, e.g. a
  malformed date) → `{ band:'new', score:null, partial:true }` (a flagged partial, never a wrong score as real). The
  normal path never sets `partial`.
- **BR-RL-S6-3 (REL-47 — network health rollup)** — `getNetworkHealth(networkId, asOf?): NetworkHealth`
  `= { band, score, memberCount, factors }`. Guards a live network (`NetworkNotFoundError`). Aggregates each member's
  `getContactHealth`: `score` = mean of members' non-null scores (null if none scored); `band` = the **worst**
  member band (overdue > at_risk > healthy > new); `factors` = per-band counts. `memberCount` = membership count.
- **BR-RL-S6-4 (C1 guard)** — NO `measurement_kind`/`binding_mode`; health is NOT advertised to the measurement
  source registry. A pure derived read.

## §3. Surface (S6)

```ts
getContactHealth(id: string, asOf?: string): Promise<ContactHealth>       // ContactNotFoundError
getNetworkHealth(networkId: string, asOf?: string): Promise<NetworkHealth>  // NetworkNotFoundError
```

- `HealthBand = 'new' | 'healthy' | 'at_risk' | 'overdue'`.
- `ContactHealth = { band: HealthBand; score: number | null; factors: HealthFactors; partial?: boolean }`;
  `HealthFactors = { daysOverdue: number; tracked: boolean; closenessWeight: number; recentSentiment: number | null }`.
- `NetworkHealth = { band: HealthBand; score: number | null; memberCount: number; factors: Record<HealthBand, number> }`.
- `asOf` = `YYYY-MM-DD` determinism seam (default realToday). No new validators (read-only).

## §4. Acceptance

- [ ] no interactions → `{band:'new', score:null}`.
- [ ] a recently-contacted, not-overdue contact → `healthy`; an overdue contact → `overdue`; within grace → `at_risk`.
- [ ] closeness weight: an inner-tier (family/favorite) contact scores LOWER than an acquaintance at the same daysOverdue (penalized more).
- [ ] negative recent sentiment pulls a non-overdue contact to `at_risk`; positive lifts score.
- [ ] untracked (no cadence) contact with interactions → `healthy` (or `at_risk` if negative sentiment), never `overdue`.
- [ ] getNetworkHealth: band = worst member; score = mean of scored members; memberCount + per-band factors correct; unknown network → NetworkNotFoundError.
- [ ] NO measurement_kind / no source-registry advertise (C1). tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt

1. **types.ts** — `HealthBand`, `ContactHealth`, `HealthFactors`, `NetworkHealth`; 2 methods.
2. **service.ts** — helpers: `todayISO()`, `daysBetweenISO(a,b)`, `closenessWeight(type,fav)`, `recentSentiment(contactId)`.
   `getContactHealth`: guard → count-0 new → compute daysOverdue/weight/sentiment → score (clamp) → band → factors;
   wrap the numeric compute so a non-finite score yields `{partial:true}`. `getNetworkHealth`: guard network →
   members → map getContactHealth → aggregate (mean score, worst band, counts).
3. **tests** — S6 describe block covering §4 (use `asOf` for determinism).
4. Verification Gate → independent g2 (design-pass — dispatch) → full-suite checkpoint → currency BR-RL-S6-\* → commit.

## Open calls (resolved, No-Guessing)

- **formula = designed here** (decomposition UNKNOWN homed to this [F] spec; resolve-now, [[build-phase-flags-mean-resolve-now-not-defer]]). Simple/interpretable/documented; tunable later.
- **closeness weight source = relationship_type + is_favorite** (REL-25 alternative) — `closeness_tier` is OPEN vocab, not deterministically weightable; stays a stored/display field. FACT-grounded.
- **NOT a measurement** (C1) — pure derived read, no registry advertise.
