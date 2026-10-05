<!-- PLAN · mod-notifications ① · S5 — Journal contribution + close-out → ① COMPLETE (#53, LIF-132) ·
     Entity Delivery Flow v1 · §XXVI gate 1 (the SPEC) · grounds: slice-map.md S5 · seam-contract.md ·
     business-rules.md (NF-10/NF-13) · the gamification/knowledge journal precedents · built seams @ 67b33f0 -->

# PLAN — S5 · Journal contribution + close-out → ① COMPLETE

> The final slice. Notifications registers ONE Journal `summary` contribution (unread/by-type recap — it
> CONSUMES `dueIn`, it is not an agenda provider), adds the `purgeExpired` retention sweep (NF-13), and
> guarantees NF-10 dangling-subject read-safety at ①. Pure service tier — **no new schema, no new dep**
> (reuses S1 `unreadCounts` + the DB-6 `repo.hardDelete`). Closes ①.

## §1 — Context (what exists, grounded)

- **S1 `unreadCounts(): UnreadCounts`** — derives `{ unread, error, warning, reminder }` from live rows
  (excludes read+archived). The journal recap reuses it (snapshot). `[FACT: service.ts unreadCounts]`
- **The Journal contribution shape** (ADR-004 §3.2.5 PULL): `createXJournalContribution(svc) →
  JournalContribution { module, sectionKey:'summary', dataPoints: readonly DataPoint[], summary(date):
  SectionData|Promise }` + `registerXJournal(registry, svc) → registry.register(create…(svc))`. `SectionData =
  { sectionKey, module, dataPoints, state: TerminalState, items }`; `state = 'success'` if any data else
  `'empty'` (reuse the `TerminalState` canon BY TYPE, not `deriveTerminalState`). `[FACT: services/journals/types.ts:25,43,58-63;
  services/gamification/journal.ts:30-68; services/knowledge/journal.ts:22-54]`
- **`JournalRegistry.register(contribution)`** — the register-helper pattern. `[FACT: gamification/journal.ts:66-68]`
- **DB-6 `repo.hardDelete(id)`** — permanently removes the row: snapshot → `tx.delete` → `enqueue('delete')`
  in ONE tx (so a purge SYNCS the deletion cross-device). `repo.delete` soft-or-hard-deletes; this repo is
  `softDelete:false` so `delete`≡`hardDelete`. `[FACT: db/repository.ts:206-210,467-479]`
- **NF-13 lifecycle** — read → archive → expire → **purge**: "a retention purge reclaims **long-archived**
  rows." `[FACT: business-rules.md:54-55,82]`
- **NF-10** — a notification whose subject entity was deleted: the row SURVIVES with a dangling `entity_id`;
  `action_url` → "no longer available" is the ② concern; ① guarantees the row survives (no FK, reads never
  join). `[FACT: business-rules.md:46,68-69]`

## §2 — Business Rules (candidate BR-NT-S5-*, promoted at §XXIX on ship)

- **BR-NT-S5-1 (one summary contribution / consumer-not-provider)** — notifications registers exactly ONE
  `JournalContribution { module:'notifications', sectionKey:'summary', dataPoints: DATA_POINTS }` with a
  `summary(date)` recap and **no `dueIn` agenda lane** (it CONSUMES `dueIn` in S4; it is not a daily-agenda
  provider — the gamification/knowledge summary-only precedent). `[slice-map S5; identity.md:32]`
- **BR-NT-S5-2 (summary recap = unread snapshot)** — `summary(date)` reuses `unreadCounts()` →
  `{ unread, error, warning, reminder }`; `state = 'success'` iff `unread > 0`, else `'empty'`; a no-data day
  returns a well-formed `empty` SectionData, NEVER a throw (the per-section degrade is the dashboard's). `date`
  is accepted for the contract; a per-day "received on `date`" delta is a documented refinement (the
  gamification snapshot precedent). `[FACT: service.ts unreadCounts; gamification/journal.ts:37-39]`
- **BR-NT-S5-3 (TerminalState by type)** — `state` reuses the `@vida/core` `TerminalState` canon BY TYPE
  (`'success'`/`'empty'`), not `deriveTerminalState`. `[FACT: foundation/capability/types; gamification/journal.ts:46]`
- **BR-NT-S5-4 (retention purge / NF-13)** — `purgeExpired(before)` hard-deletes **long-archived** rows
  (`is_archived = true AND archived_at ≤ before`) via `repo.hardDelete` (snapshots + enqueues a `'delete'` sync
  op), returns the count reclaimed. Only ARCHIVED rows are purged — an active (un-archived) row is never purged
  regardless of age; a NULL `archived_at` never matches (`lte` is not-true). `[FACT: business-rules.md:55; repository.ts:467-479]`
- **BR-NT-S5-5 (NF-10 dangling-subject survives)** — a notification whose `entity_type`/`entity_id` points at a
  deleted subject still lists and reads at ① (no FK, reads never join); `action_url` resolution is the ②
  concern. `[FACT: business-rules.md:46,68-69]`
- **BR-NT-S5-6 (① COMPLETE)** — the barrel exports `registerNotificationsJournal` alongside the service +
  `registerNotificationsEffects`; all 5 slices shipped. `[FACT: index.ts]`

## §3 — Interpretation (FACT / INTERP / UNKNOWN — No-Guessing)

- **[FACT]** the contribution lives in a new `services/notifications/journal.ts` (the file layout of every
  prior MOD: `gamification/journal.ts`, `knowledge/journal.ts`, `books/journal.ts`).
- **[FACT]** `DATA_POINTS = [{id:'unread',label:'Unread'}, {id:'error',label:'Alerts'}, {id:'warning',
  label:'Warnings'}, {id:'reminder',label:'Reminders'}]` — the JR-4 recap selection; `items:[{ unread, error,
  warning, reminder }]` (the single-object-array item shape of the precedents).
- **[INTERP]** snapshot vs per-day: `summary` reuses the CURRENT `unreadCounts()` (snapshot), consistent with
  the gamification snapshot precedent; a dated "received on `date`" digest is a refinement (would need a
  `created_at`-on-date query + TZ). The slice-map ratified "unread/by-type recap" = the snapshot.
- **[FACT]** `purgeExpired` keys on `archived_at` (the "long-archived" cutoff), NOT `created_at`/`expires_at`
  — NF-13 says the purge reclaims long-ARCHIVED rows. `[business-rules.md:55]`
- **[FACT]** NF-10 at ① needs NO code (reads never join a subject table); it is a guarantee + a test.

## §4 — Acceptance (live-store Verification Gate — real data store, Node 24)

1. **Summary recap (has data).** Seed unread rows (error/warning/reminder/info); the registered contribution's
   `summary(date)` ⇒ `state:'success'`, `items[0] = { unread, error, warning, reminder }` matching `unreadCounts`.
2. **Summary recap (empty).** No unread rows ⇒ `state:'empty'`, counts all 0, no throw.
3. **registerNotificationsJournal.** Registering into a real `JournalRegistry` makes the contribution resolvable
   (module `'notifications'`, sectionKey `'summary'`, `dataPoints` = DATA_POINTS).
4. **purgeExpired reclaims long-archived.** Seed an archived row with `archived_at` old + an archived row recent
   + an unread (active) row; `purgeExpired(cutoff)` ⇒ removes only the old-archived (returns 1); the recent
   archived + the active row remain. Assert the row is GONE (hard-deleted) and a `sync_queue` `'delete'` enqueued.
5. **purgeExpired never touches active rows.** An un-archived row, however old by `created_at`, is never purged.
6. **NF-10 dangling-subject.** A notification with `entity_type/entity_id` pointing at a non-existent subject
   still `list()`s (no crash, row survives).
7. Full green: `tsc --noEmit` 0 · `eslint` 0 · notifications suite (S1–S5) green · full `@vida/core` green.

## §5 — Implementation Prompt (strictly this; §XXVIII on any divergence)

1. **`services/notifications/journal.ts`** (new) — mirror `knowledge/journal.ts`:
   `const DATA_POINTS: readonly DataPoint[] = [unread, error, warning, reminder]`;
   `createNotificationsJournalContribution(svc): JournalContribution` with `module:'notifications'`,
   `sectionKey:'summary'`, `dataPoints: DATA_POINTS`, `async summary(date)`: `void date`; `const c = await
   svc.unreadCounts()`; `state = c.unread > 0 ? 'success' : 'empty'`; return `{ sectionKey:'summary',
   module:'notifications', dataPoints: DATA_POINTS, state, items:[{ unread:c.unread, error:c.error,
   warning:c.warning, reminder:c.reminder }] }`; `registerNotificationsJournal(registry, svc)` →
   `registry.register(createNotificationsJournalContribution(svc))`. Imports: `JournalContribution, SectionData,
   DataPoint, JournalRegistry` from `../journals`; `TerminalState` from `../../foundation/capability/types`.
2. **`service.ts`** — add `purgeExpired(before: number): Promise<number>`: `const rows = await
   repo.findWhere(and(eq(notifications.is_archived, true), lte(notifications.archived_at, before)) as SQL)`;
   `for (const r of rows) await repo.hardDelete(r.id)`; `return rows.length`. Add to the returned object.
3. **`types.ts`** — add `purgeExpired(before: number): Promise<number>` to `NotificationsService` (doc: retention
   sweep, NF-13).
4. **`index.ts`** — export `registerNotificationsJournal` from `./journal`.
5. **Tests** — add the S5 `describe` (§4.1–§4.6) + a `JournalRegistry` built via the real journals factory.
6. **§XXIX currency** — append `BR-NT-S5-1..6`; mark S5 shipped + **① COMPLETE** in `current-spec.md` +
   `current-business-rules.md`. Commit docs WITH code. Then open the PR `mod-notifications → main`.

## Out of scope (unchanged homing)
- `action_url` deep-link "no longer available" RESOLUTION UI → **② `fe-notifications` (LIF-192)**.
- Per-day "received on `date`" digest + TZ → refinement (snapshot at M1). Digest/batching → **M2** (NF-15).
- `[E]` encryption → **M3** (the `encryptedFields: []` dormant seam).
