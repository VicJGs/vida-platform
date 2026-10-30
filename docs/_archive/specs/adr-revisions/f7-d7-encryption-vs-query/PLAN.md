# PLAN — F7/D7: encryption-vs-query trio (ADR-002)

- **Unit:** ADR revision + a small design-pass (doc-only; foundation profile; LITE gate + full §XXVI adversarial
  pass, per F1/F2/F3/F6 precedent). D7 is flagged in the report as *"a small design-pass — own mini-intake,"* so §6
  carries one genuine decision fork for Victor (the money-field E/P call); the other two legs are grounded recommendations.
- **Fix:** F7 (report §Unified Fix Menu L88) — resolve the three places where field-level (L2) encryption makes a
  column un-queryable yet the schema aggregates / indexes / full-text-searches it.
- **Decision:** D7 (report §The 7 decisions, L108).
- **Severity:** 🟡 correctness/accuracy — the promised features (financial charts, category filters, full-text search)
  cannot run as written; the schema contradicts the ADR's own P/E classification rule (L168).
- **Sources loaded (ground truth):** the report (throughline ④ L63 · F7 L88 · D7 L108) · ADR-002 §encryption model
  (L156-160 three-layer L1/L2/L3; **L157** L2 = libsodium `crypto_secretbox` XChaCha20-Poly1305, **random nonce**,
  base64 TEXT; **L160** E fields stay encrypted in-memory until explicit decrypt) · §P/E classification (**L168** P =
  "Queryable … Indexed … numeric aggregates needed for queries"; **L198** legend) · `accounts.current_balance -- [E]
  in cents` (L2021) · `transactions.amount -- [E] in cents` (L2050) + `category -- [E]` (L2052) + `idx_transactions_
  category ON category` (L2076) · the wider Finance E-numeric set (assets L2090-2092 · liabilities L2119-2122 ·
  investments L2152-2154 · income_streams L2181 · accounts credit_limit/interest_rate L2022-2023 — B1) ·
  `dreams.estimated_cost` (L1930 + L3317) · `contacts.first_name/last_name -- [E]` (L2209-2210) + `idx_contacts_name
  ON (first_name,last_name)` (L2247) · §5.19 FTS5 (`fts_pages` `content='pages'` L3656 + phantom `content_text` L3655
  + `title` L3654 also `[E]`; `fts_contacts` `content='contacts'` + phantom `notes`; "Rebuilt on DB unlock after
  decryption" L3648) · convention "no inline notes columns — all notes use `pages`" (CLAUDE.md) · **code:**
  `analytics.ts` + `search-service.ts` exist as **0-byte placeholder files** (no FTS/blind-index/aggregation logic
  built — so "zero code / packages diff = 0" is reachable).
- **Scope guard.** F7 **corrects the three erroneous descriptions in ADR-002's body** (a wrong FTS DDL, two
  non-functional indexes, a classification contradiction) — this is *fixing errors*, the same license F6 used to fix
  the "logical" label, **not** the ADR-002 consolidation (which stays **F4-body/D5**: adding the ~15 owed tables). F7
  **decides D7** and records the resolution; any **new** column (a blind-index side column) or the analytics/FTS
  *implementation* is **build-phase**, tracked in the owed-ledger. Zero code. F7 does **not** re-open the L2/L3
  encryption design itself (XChaCha20-Poly1305 stays); it only resolves *which fields are E vs P* where queryability
  demands it, and *how* the query features run given E.

---

## §1. Context — the trio (grounded, not paraphrased)

Throughline ④, verbatim (report L63):

> **Encryption-vs-query trio (ADR-002)**: encrypted-`INTEGER` money fields (`current_balance` L2011, `amount` L2040,
> `dreams.estimated_cost` L1920) can't be SQL-aggregated for the promised charts; indexes over randomized-nonce
> ciphertext (`idx_transactions_category` on `category -- [E]`, `idx_contacts_name`) can't function; FTS5
> external-content (`content='pages'`, L3646) indexes ciphertext (`pages.content -- [E]`) and references phantom
> columns (`content_text` L3645, `contacts.notes` L3665).

**The root cause (one, `[FACT]`).** L2 field-level encryption (ADR-002 L157) is libsodium `crypto_secretbox`
(XChaCha20-Poly1305) with a **random 24-byte nonce**, stored as base64 TEXT; encrypting the same plaintext twice
yields **different** ciphertext, and the field **stays encrypted in memory** until the app explicitly decrypts it for
rendering (L160). Authenticated encryption with a random nonce is, by design, **not** equality-comparable,
**not** orderable, **not** aggregatable, and **not** tokenizable. So any SQL that computes over an `-- [E]` column
operates on ciphertext. The ADR's **own** P/E rule already says so: **P** is the class that is *"Queryable with
`WHERE`/`ORDER BY`/`JOIN`. Indexed. …numeric aggregates needed for queries"* (L168); **E** is not. The trio is three
places where specific field markings / DDL **violate the ADR's own L168 rule**.

**Leg 1 — money aggregation (`[FACT]`; the defect spans the whole Finance domain — B1).** The report named three
fields, but **every aggregated numeric field in Finance is `-- [E]`**, so the defect is domain-wide, not three fields:
`transactions.amount` (L2050); `accounts.current_balance` (L2021), `credit_limit` (L2022), `interest_rate` (L2023);
`assets.purchase_price` (L2090), `current_value` (L2091), `depreciation_rate` (L2092); `liabilities.original_amount`
(L2119), `current_balance`, `interest_rate` (L2121), `monthly_payment` (L2122); `investments.quantity` (L2152, REAL),
`purchase_price` (L2153), `current_price` (L2154); `income_streams.amount` (L2181); `dreams.estimated_cost` (L1930 +
L3317). CLAUDE.md promises Assets/Liabilities/Investments/Income trackers **and** "Analytics charts" — net worth
(`SUM(current_value) − SUM(current_balance)`), portfolio value (`SUM(quantity × current_price)`), income totals — all
of which aggregate `-- [E]` fields. `SELECT SUM(amount) … GROUP BY category` over base64 ciphertext returns garbage.
Either these numbers are P (SQL aggregates) or they are E (aggregate only after in-memory decrypt) — the schema
currently claims E **and** implies SQL aggregation, across the entire domain.

**Leg 2 — indexes over ciphertext (`[FACT]`).** `idx_transactions_category ON transactions(category)` where
`category -- [E]` (L2052/L2076); `idx_contacts_name ON contacts(first_name, last_name)` where both are `-- [E]`
(L2209-2210/L2247). A B-tree over random-nonce ciphertext cannot serve equality (the probe value's ciphertext differs
every time), range, or sort — the index is dead weight and contradicts L168 ("Indexed" is a P property).

**Leg 3 — FTS5 external-content over ciphertext + phantom columns (`[FACT]`).** `fts_pages` (§5.19) declares
`content='pages'` (external-content mode → FTS reads the **base table's stored columns by name**) with a column
`content_text` — but `pages` has `content -- [E]` (ciphertext), and **`content_text` does not exist** on `pages`
(phantom). `fts_contacts` declares `content='contacts'` with a `notes` column — but `contacts` has **no `notes`
column** (phantom; notes live in `pages` per the no-inline-notes convention) and its `first_name/last_name/company`
are all `-- [E]`. Yet §5.19's own note says the FTS tables are *"Rebuilt on DB unlock after decryption"* (L3648) —
i.e. the **intent** is to index **decrypted plaintext**, which external-content-over-encrypted-columns directly
contradicts.

**Conclusion (`[DECISION]`, D7).** Resolve per the ADR's own L168 rule: a column can be **queryable** *or*
**field-encrypted-in-memory**, not both. For each leg, either move the field to P (accept the L2 defense-in-depth
loss, keep L1+L3) or keep it E and run the feature via **decrypt-in-memory** / a **blind index** / a
**plaintext-fed standalone FTS**. The money leg is a genuine privacy tradeoff → Victor's call (§6 D7-money).

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (obey the ADR's own P/E rule — L168).** No column may be marked `-- [E]` **and** be relied on for SQL
  `WHERE`/`ORDER BY`/aggregation/indexing/FTS. Every query feature resolves to one of: (a) the field is **P**
  (queryable; still protected by L1 SQLCipher + L3 blob), or (b) the field stays **E** and the feature runs via
  decrypt-in-memory / blind index / plaintext-fed FTS. After F7, no leg violates L168.
- **BR-2 (no false capability).** ADR-002 must not describe a feature the crypto forbids: no SQL aggregate over an E
  money field, no B-tree index over an E column, no external-content FTS over an E/absent column. Each is either
  corrected to a working mechanism or explicitly marked as running in-app-after-decrypt.
- **BR-3 (ZK posture preserved or the tradeoff stated).** Moving any field E→P **removes L2 defense-in-depth** for
  that field (readable in the SQLite file while the app is unlocked; L1 SQLCipher + L3 blob still apply). Any such
  move is **named as a deliberate tradeoff**, not silent. Fields kept E keep full L2 protection and pay the
  decrypt-in-memory cost. ZK-to-server (L3) is **never** affected by F7 — the sync blob stays fully encrypted
  regardless.
- **BR-4 (blind index = equality-only, leak stated; domain-separated key; and why not just P — R2/B2).** A blind
  index (`PRF_k(plaintext)` in a side column) and reclassifying the field to **P** are on the **same leak spectrum** —
  both let a **local-DB reader** group rows by that field; they differ only in whether the plaintext *value* is
  exposed (P) or only its *equality/frequency* (blind index). The doc must state the exact bound — **equality lookups
  only** (no range/sort), leaks equality/frequency to a local-DB reader — **and** argue the choice: keep the field
  **E + blind index** (not P) precisely when the value is sensitive enough that exposing it plaintext is unacceptable
  but equality-grouping is tolerable. **Key hygiene (B2):** the blind-index key is a **domain-separated subkey** of the
  vault material (keyed BLAKE2b `crypto_generichash` + a personalization label, per ADR-001:76-77's forward-flag) —
  **never** the Vault Key reused, and the primitive is BLAKE2b, not HMAC. (L3 already encrypts the whole row blob, so
  the **server** never sees the blind index regardless — the party its leak matters to is a local-DB reader.)
- **BR-5 (FTS = standalone, plaintext-fed; storage location is a stated fork — R1).** FTS5 tables are **not**
  external-content over encrypted base columns; they are **standalone (content-less) FTS5** tables populated from
  **decrypted plaintext** (matching L3648's existing intent). Phantom columns (`content_text`, `contacts.notes`) are
  fixed to the real decrypted sources (`pages` text; contact notes pulled from `pages`).
  **The decision the old note dodged (R1):** a standalone FTS5 index stores the indexed field's **plaintext tokens**,
  so full-text-searching an `-- [E]` field means its searchable plaintext must live *somewhere* while unlocked — a
  **weaker posture than the E field itself** (which stays libsodium-encrypted in memory, L160). This is the **search
  analogue of the money A1/A2 fork**, and F7 must state which of two mutually-exclusive designs applies (they are not
  both true at once):
  - **FTS-1 (persisted-in-SQLCipher):** the FTS tables live inside the L1 SQLCipher `.db`; their plaintext tokens are
    **single-protected** (SQLCipher-encrypted at rest, readable while unlocked), **persist** across lock, and need
    **no** rebuild. Simple; the documented cost is that FTS'd E-field text is one layer less protected than the field.
  - **FTS-2 (ephemeral, rebuilt-on-unlock):** the FTS tables live in a **separate in-memory / non-persisted** store,
    **built from decrypted plaintext on each unlock and torn down on lock**; pays a rebuild cost per unlock. This is
    the honest form of L3648's "rebuilt on unlock." **Bound stated honestly (B3 — no absolute "never to disk"
    overclaim):** FTS-2 keeps **no plaintext tokens in the app's *persistent* store** and tears the index down on
    lock — but two OS-level residual vectors remain and must be named: (i) **OS swap/paging** can page in-memory pages
    (WASM heap on web, native heap elsewhere) to disk — a residual shared by **any** decrypt-to-use operation,
    including A1's in-memory decrypted numbers; (ii) **SQLite temp-spill** (`SQLITE_TMPDIR`) during large FTS
    builds/sorts, mitigated by `PRAGMA temp_store = MEMORY`. So FTS-2's guarantee is "no persistent plaintext tokens
    in app storage + torn down on lock," not a literal "never touches disk."
  BR-5 is satisfied only if ADR-002 picks one explicitly and states the tradeoff (see §6 D7-fts).
- **BR-6 (scope: fix errors here; defer additions + impl).** F7 corrects the erroneous DDL/markings **in ADR-002's
  body** (this is error-correction, F6-license) and records D7. A **new** blind-index column is an **addition** →
  owed-ledger + build. The analytics decrypt-in-memory path and the FTS rebuild routine are **build-phase**
  (services named in CLAUDE.md, unbuilt). ADR-002's ~15-owed-table consolidation stays **F4-body/D5**. Zero code.
- **BR-7 (encryption design untouched).** F7 does not change L1/L2/L3 or the cipher; it only resolves field
  classification + query mechanism. XChaCha20-Poly1305, the Vault Key chain, and the sync-blob model are out of scope.

---

## §3. Design — the mechanism (`[DECISION]`, direction D7)

### Part A — Money aggregation (RATIFIED A1 — keep E, decrypt-in-memory; DOMAIN-WIDE — B1)
**Scope: all `-- [E]` numeric fields across the Finance domain** — `accounts` (current_balance/credit_limit/
interest_rate), `transactions` (amount), `assets` (purchase_price/current_value/depreciation_rate), `liabilities`
(original_amount/current_balance/interest_rate/monthly_payment), `investments` (quantity/purchase_price/current_price),
`income_streams` (amount), `dreams` (estimated_cost) — **not** the three fields the report happened to name.
**Implementation approach (preflight #2 + B1):** under A1 **every one stays E — none flip**. So rather than annotate
each field inline (noisy, ~16 fields, easy to miss one), the fix lands in **two central places** that generalize:
(1) the sharpened L168 E-row (Part D, which now names decrypt-in-memory aggregation as the mechanism for **any** E
numeric field), and (2) the Finance-analytics prose (accounts/transactions/assets/liabilities/investments/income +
net-worth/portfolio charts) reconciled to "aggregation is in-app after decrypt, **not** SQL `SUM`/`GROUP BY`." A grep
for E-numeric aggregation across the domain is the acceptance check. The record below keeps the fork for provenance:
- **A1 — keep money `E`, aggregate via decrypt-in-memory.** Charts load the relevant rows, decrypt `amount`/
  `current_balance`/`estimated_cost` in memory, and aggregate in the app (the `analytics` service). ADR-002 states
  the money fields stay E and that **financial aggregation is an in-app-after-decrypt operation, not SQL** (Chart.js
  receives already-decrypted, already-aggregated series). Preserves L2 defense-in-depth for the most sensitive
  numbers; pays a load+decrypt cost (tractable at single-user financial volumes). *Recommended — matches the
  ZK thesis.*
- **A2 — reclassify money as `P`.** Flip `current_balance`/`amount`/`estimated_cost` (+ the derived-forecast money
  fields) to P; SQL `SUM`/`GROUP BY` (and range filters, if ever indexed) work directly. Simplest, fastest charts.
  Cost: money amounts are readable in the on-disk SQLite file **while the app is unlocked** (L1 SQLCipher + L3 blob
  still protect at-rest / in-transit / server). A deliberate downgrade of L2 for financial figures.
- **Note (both options):** `current_balance` is (per the standing ADR-002 amendment) **ledger-derived** from
  `opening_balance` + transactions; under **A1** deriving it also requires decrypt-in-memory of `amount`, so the
  analytics service owns balance derivation either way.

Whichever wins, ADR-002's Finance-analytics description is reconciled to it (BR-2), and the P/E markings match L168.

### Part B — Indexes over E columns (recommend, not a fork)
- **Drop** `idx_transactions_category` and `idx_contacts_name` — they cannot function over random-nonce ciphertext
  (BR-2). Removing a non-functional index is pure correction.
- **Category filter (transactions) — the blind-index-vs-P choice, made explicit (R2):** category equality-grouping is
  needed (spend-by-category charts). `category → P` is the simplest fix, **but transaction categories can be
  genuinely sensitive** ("therapy", "gambling", "legal fees"), so exposing the plaintext value to a local-DB reader
  is worse than exposing only its equality. → **Keep `category` E and ADD a blind-index side column**
  `category_bidx TEXT` = `base64(PRF_k(lower(trim(category))))` + `idx_transactions_category_bidx` — equality-only,
  leak = category equality/frequency to a local-DB reader (BR-4). (New column → owed-ledger/build.)
  **Key derivation (B2 — respect ADR-001:77's forward-flag):** the blind index is the **first** feature to derive a
  *second* keyed primitive off the vault key material, which ADR-001:77 explicitly flagged ("if a future feature
  derives additional sub-keys … add per-purpose domain separation then"). So `k` is a **domain-separated subkey**, not
  the Vault Key reused — derived via the codebase's PRF, **keyed BLAKE2b** (`crypto_generichash`, per ADR-001:76 —
  *not* HMAC, which was a wrong primitive name), with a personalization label (e.g. `"vida/blind-index/category"`).
  Cross-ref ADR-001:77; the exact label/derivation is build-phase. If Victor judges category low-sensitivity,
  `category → P` is the coherent simpler alternative (D7-indexes fallback) and needs no key at all.
- **Contact name sort/search:** names are E and sorting/searching them is a **display concern** → handled by
  decrypt-in-memory sort or the standalone FTS (Part C), not a B-tree. **No** name blind index (names are sensitive;
  a name blind index would leak name equality — rejected by BR-4).

### Part C — FTS5 (now a stated fork — R1)
- Convert `fts_pages`, `fts_contacts`, `fts_tasks`, `fts_courses` (and any other §5.19 FTS table) from
  **external-content** (`content='<table>'`) to **standalone content-less FTS5** tables, populated from **decrypted
  plaintext** (BR-5). Drop `content=`/`content_rowid=`; keep an `id UNINDEXED` to map hits back to rows.
- Fix phantom columns: `fts_pages.content_text` ← the **decrypted** `pages.content`; `fts_contacts.notes` ← the
  contact's notes **pulled from `pages`** (the no-inline-notes convention), not a `contacts.notes` column. Tasks'
  `description` and other E text: fed decrypted.
- **Pick a storage design + state its tradeoff (R1 — this is the search analogue of the money fork):** because a
  standalone FTS index holds the field's plaintext tokens, ADR-002 must choose **FTS-1 (persisted in the SQLCipher
  DB** — single-protected tokens, no rebuild, simple) **or FTS-2 (ephemeral in-memory, rebuilt on unlock, torn down
  on lock** — preserves the E field's at-rest posture, pays a rebuild cost). §6 D7-fts carries the recommendation;
  the doc states whichever is chosen **and** the "FTS'd E-field text is one layer less protected while unlocked"
  consequence. It does **not** claim both persisted-and-rebuilt at once (the old note's contradiction).

### Part D — Sharpen the classification rule (it already exists at L168 — preflight #1)
The rule is **already present**: the P-row says "numeric aggregates needed for queries → P"; the E-row says E fields
"Cannot be queried with SQL. Decrypted in app memory. Searchable only via FTS5 (rebuilt on unlock)." The gap is that
the E-row names **only FTS** as the escape hatch. **Sharpen the E-row** to name all three mechanisms by which an E
field gets query features: **decrypt-in-memory aggregation** (money, A1) · an **equality-only blind index** (e.g.
`category`) · a **plaintext-fed standalone FTS-2** (rebuilt on unlock) — *never SQL over ciphertext*. This makes the
existing rule bind the whole trio without inventing a new principle.

### Part E — Owed-ledger + report (edit the *report*, not ADR-002's consolidation)
- Tick **F7** in the report resolution log with the D7 decision (incl. Victor's money call) + adversarial catches.
- Owed-ledger / build items (implementation, not doc): (1) the `category_bidx` blind-index column (if adopted) + its
  keyed-HMAC derivation; (2) the `analytics` **decrypt-in-memory aggregation** path (both A1 and A2 need an analytics
  service; A1 also needs the decrypt step); (3) the FTS build/rebuild routine (per the FTS-1/FTS-2 choice); (4)
  contact-notes-from-`pages` FTS feed. **Scope note (R3):** the money `[E]`↔`[P]` **marking** itself — under either
  A1 (annotate, stays E) or A2 (flip to P) — is **corrected in F7** (it is error-correction of an L168 violation, the
  same license under which F7 drops the dead index), **not** deferred to F4-body/D5. F4-body/D5 still owns the
  separate ~15-owed-**table** consolidation; F7 touches only the existing money fields' markings + the analytics prose.

---

## §4. Acceptance

- [ ] **Trio resolved against L168:** no ADR-002 column is `-- [E]` while also relied on for SQL aggregate/index/FTS;
      each leg lands on P **or** on decrypt-in-memory / blind-index / plaintext-fed-FTS.
- [ ] **Money — DOMAIN-WIDE (BR-2/BR-3 · B1):** A1 is stated as covering **every E numeric field across the Finance
      domain** (accounts/transactions/assets/liabilities/investments/income_streams/dreams), not just 3 fields —
      aggregation is in-app-after-decrypt, and no description (incl. net-worth/portfolio/income charts) implies SQL
      `SUM`/`GROUP BY` over an E money field.
- [ ] **Indexes (BR-2):** `idx_transactions_category` + `idx_contacts_name` are removed; for category, replaced by a
      documented equality-only **blind index** whose leak (BR-4) **and domain-separated keyed-BLAKE2b key** (per
      ADR-001:77, not raw Vault Key, not HMAC — B2) are stated; no B-tree over an E column remains.
- [ ] **FTS (BR-5 / R1 / B3):** §5.19 tables are standalone content-less FTS5 fed from decrypted plaintext; **no
      `content='<table>'` external-content over encrypted base columns**; phantom columns fixed (`content_text` ←
      decrypted `pages.content`; `fts_contacts.notes` ← notes from `pages`; `title` etc. E-text fed decrypted); ADR-002
      picks **one** storage design (FTS-1 persisted **xor** FTS-2 ephemeral-rebuilt) and states its **honestly-bounded**
      tradeoff — no persisted-**and**-rebuilt contradiction, and **no absolute "never touches disk"** (OS swap +
      temp-spill named; `PRAGMA temp_store=MEMORY`).
- [ ] **Classification rule (Part D):** the L168 area carries the binding principle so the trio can't recur.
- [ ] **BR-3 ZK:** every E→P move is named as a deliberate L2 tradeoff; L3 sync-blob encryption is untouched; no
      field's server-visibility changes.
- [ ] **BR-6/BR-7 scope:** ADR-002 encryption *design* (L1/L2/L3, cipher) untouched; new blind-index column +
      analytics/FTS impl are owed-ledger/build, not built; ADR-002 consolidation stays F4-body/D5; **zero code**
      (`packages/` diff = 0).
- [ ] **Report reconciled:** F7 ticked with D7 + money call + adversarial catches; the 4 build items recorded;
      F4-body/D5 cross-ref present.
- [ ] **Grep verify:** `grep -n "content='" docs/core/decisions/ADR-002-data-model.md` returns **no** external-content
      FTS; `grep -n "content_text\|contacts.notes\|idx_transactions_category\|idx_contacts_name"` shows each phantom/
      dead-index either gone or corrected; the money fields' `[E]`/`[P]` marking matches the D7-money decision.

---

## §5. Implementation prompt (after Approval 2)

Edit ADR-002, in order (exact edits finalized once D7-money is chosen at Approval 1):
1. **§P/E classification (~L168)** — add the Part D binding principle.
2. **Money fields** — per D7-money: A1 → annotate `current_balance`/`amount`/`estimated_cost` "E; aggregated in-app
   after decrypt (analytics service), never SQL SUM" + reconcile the Finance-analytics prose; A2 → flip the three
   (+ derived money fields) `[E]`→`[P]` in the DDL + P/E table + state the L2-downgrade tradeoff.
3. **Indexes** — drop `idx_transactions_category` (L2076) + `idx_contacts_name` (L2247); if category blind index
   adopted, note the `category_bidx` column + index as an owed build addition (not inline DDL — it's a new column,
   BR-6).
4. **§5.19 FTS5** — rewrite the FTS tables to standalone content-less form fed by decrypted plaintext; fix
   `content_text` + `fts_contacts.notes` phantoms; state the chosen storage design (FTS-2 ephemeral-rebuilt-on-unlock,
   per D7-fts) **and** the "FTS'd E-field text is one layer less protected while unlocked" tradeoff — not the old
   persisted-and-rebuilt contradiction.
5. **report** — tick F7 (D7 + money call + adversarial catches); record the 4 build items + F4-body/D5 cross-ref.
Then **Verify** (grep + read): acceptance greps pass; no external-content FTS or ciphertext index survives; money
markings match the decision; ADR-002 encryption design + `packages/` diff = 0.

---

## §6. Decisions (Approval 1 — pending Victor)

**One genuine crypto/privacy fork (money), two grounded recommendations. Laid out per your sign-off preference for
crypto/foundational calls.**

- **D7-money (the fork) — RECOMMEND A1 (keep E, decrypt-in-memory), but this is your call.**
  - **A1 — keep money `E`; aggregate after in-memory decrypt.** Preserves L2 defense-in-depth for the most sensitive
    figures a privacy-first user has (balances, amounts, dream costs) — they stay encrypted in the on-disk DB even
    while the app runs. Cost: charts load+decrypt rows and aggregate in JS (tractable for single-user finance; no
    SQL `SUM`). Best fit for the ZK thesis.
  - **A2 — reclassify money `P`.** SQL aggregation/indexes work directly; simplest, fastest. Cost: money amounts
    readable in the SQLite file while unlocked (L1+L3 still protect at-rest/in-transit/server). A real L2 downgrade
    for financial data.
  - My lean: **A1** — the whole product promise is that the device holds secrets even the running system minimizes
    exposure of; single-user data volumes make in-memory aggregation cheap. But if you want the simplest path and
    accept that an unlocked-app disk read could reveal balances, A2 is coherent. **Your decision.**
- **D7-indexes — RECOMMEND:** drop both ciphertext indexes; keep `category` **E + an equality-only blind index**
  (its values can be sensitive, so blind-index — leaking only equality to a local-DB reader — beats `category → P`,
  which would leak the value; R2). **Fallback:** if you judge category low-sensitivity, `category → P` is the coherent
  simpler choice. **No** name blind index (names too sensitive) — contact name sort/search goes through
  decrypt-in-memory / FTS.
- **D7-fts — RECOMMEND FTS-2 (ephemeral, rebuilt-on-unlock), with FTS-1 as the pragmatic alternative (R1).**
  Standalone content-less FTS5 fed from decrypted plaintext; fix the two phantom columns. The storage fork: **FTS-2**
  (in-memory, rebuilt on unlock, torn down on lock — **no persistent plaintext tokens in app storage**) **preserves
  the E fields' at-rest defense-in-depth**, which is why they were marked E in the first place; the cost is a rebuild
  per unlock (cheap at single-user volumes). Its guarantee is honestly bounded — **not** a literal "never touches
  disk" (OS swap + SQLite temp-spill are residual, mitigated by `PRAGMA temp_store=MEMORY`; B3). **FTS-1** (persisted
  inside SQLCipher) is simpler and needs no rebuild but leaves searchable plaintext single-protected on disk. My lean:
  **FTS-2** (consistent with keeping the fields E); if rebuild cost ever bites, FTS-1 is the fallback. Either way the
  doc states the chosen design + its honestly-bounded tradeoff — the old "encrypted-at-rest **and**
  rebuilt-each-unlock" phrasing (a contradiction) is replaced.
- **D7-scope — RECOMMEND (D5 boundary):** F7 corrects the erroneous DDL/markings in ADR-002 (error-correction,
  F6-license) + records D7; the new blind-index column + analytics/FTS implementation are build-phase (owed-ledger);
  ADR-002's owed-table consolidation stays F4-body/D5; zero code.

## §7. Status
- [x] Spec written (gate 1)
- [x] /critique run → **REVISE (R1/R2/R3)** → all fixed. **R1** = the FTS leg was internally contradictory
      (persisted-in-SQLCipher **and** rebuilt-each-unlock) and dodged the real fork → split into **FTS-1 (persisted)
      vs FTS-2 (ephemeral-rebuilt)**, named as the search analogue of the money fork with its tradeoff (D7-fts,
      recommend FTS-2); **R2** = indexes leg skipped the simpler `category→P` → blind-index-vs-P rationale made
      explicit (keep E + blind index because category values can be sensitive; P as fallback); **R3** = money-flip
      scope was self-contradictory (§6 said F7 corrects markings; Part E deferred A2 to F4-body) → resolved: the
      marking correction happens in F7 (error-correction license), F4-body/D5 keeps only the owed-**table**
      consolidation. Non-blocking tightenings folded (A2 "indexes" overstatement; BR-4 server-redundancy → local-DB
      reader; `current_balance` ledger-derived note).
- [x] Approval 1 — **RATIFIED by Victor 2026-07-17: A1 (money stays E, decrypt-in-memory) · FTS-2 (ephemeral,
      rebuilt-on-unlock) · category = E + blind index · D7-scope (correct markings in F7).** Consistent
      "keep-encrypted, pay-compute-cost" posture across all three legs.
- [x] /preflight → **PASSED** (4 assumptions; #1 L168 already carries the rule → Part D = sharpen the E-row, not a
      new principle; #2 `estimated_cost` ×2 DDL + 2 summary rows → A1 handled centrally via L168 + analytics prose,
      not inline per-field; #3/#4 non-blocking). Both folded in.
- [x] Independent adversarial critique (fresh refuter, given the source files + `vault.ts`/ADR-001) → **REVISE** →
      all closed. **Core survived** (trio confirmed against source — L2 = random-nonce `crypto_secretbox_easy`,
      genuinely un-queryable; L168 rule quoted verbatim; A1+FTS-2+blind-index coherent). Catches, all verified:
      - **B1** (real, important) — the money defect spans the **whole Finance domain** (~16 E numeric fields across
        accounts/transactions/assets/liabilities/investments/income_streams/dreams feeding net-worth/portfolio/income
        charts), not the 3 the report named → Part A + acceptance generalized domain-wide; the "covers all at once"
        claim now rests on the L168 rule + Finance-prose, not 3 fields.
      - **B2** (sharp, the citation-honesty catch) — my "HMAC_vaultsubkey" was **wrong on two counts**: the codebase
        PRF is **keyed BLAKE2b** (`crypto_generichash`, ADR-001:76), not HMAC (a training-data default); and ADR-001:77
        has an explicit **domain-separation forward-flag** the blind index is the first to trigger → key = a
        domain-separated labelled subkey, cross-ref'd, not the Vault Key reused.
      - **B3** (real overclaim) — FTS-2 "never writes plaintext to disk" is not guaranteeable (OS swap/paging +
        SQLite temp-spill) → downgraded to "no persistent plaintext tokens in app storage + torn down on lock,"
        residual vectors named + `PRAGMA temp_store=MEMORY`; kept honestly comparable to A1's in-memory decrypt.
      - **N1** `amount` L2049→L2050, `category` L2051→L2052 · **N2** `content_text` L3653→L3655 + `title` is also E ·
        **N3** `analytics.ts`/`search-service.ts` = 0-byte placeholders (not "unbuilt/named-only"). All fixed.
- [x] Approval 2 — **RATIFIED by Victor 2026-07-17** (B1 domain-wide scope + B2 domain-separated BLAKE2b blind-index
      key explicitly signed off; B3 honesty fix; no direction change; A1+FTS-2+blind-index intact).
- [x] **Implement + Verify — DONE 2026-07-17.** 3 docs edited: **ADR-002** (§P/E E-row sharpened = the binding rule
      [decrypt-in-memory · blind index · FTS-2]; domain-wide Finance sensitivity note [non-sensitive aggregates P vs
      sensitive money E+decrypt-in-memory]; dropped `idx_transactions_category` + `idx_contacts_name` with
      blind-index/decrypt-sort notes; §5.19 FTS5 rewritten to standalone content-less + FTS-2 + phantom fixes) ·
      **report** (F7 entry). **Verify caught 1 drift miss** (as F6 caught data-flow.md): `docs/core/architecture/
      security-model.md:390` mirrors the P/E table with the un-sharpened E-row → sharpened to match. **Verify PASS:**
      no live external-content FTS or un-sharpened E-row remains in docs/core; both dead indexes dropped; blind-index
      domain-separated key + FTS-2 honest-bound present; `packages/` diff = **0** (zero code). §XXIX N/A (foundation
      profile, ADRs *are* the durable docs). Build items (blind-index column + keyed-BLAKE2b · analytics
      decrypt-in-memory · FTS-2 rebuild · contact-notes-from-`pages`) → owed-ledger, F4-body/D5 + F10 cross-ref.
