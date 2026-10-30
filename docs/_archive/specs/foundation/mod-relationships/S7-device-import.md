# S7 — Device import (deny-safe X1/X8) (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S7 of 9. Legs: REL-07…11. Grounded in: RL-11, contract.md:14, ADR-014 X1/X8,
> `foundation/ingestion` (built #44 — finance-shaped reconcile; device mediator deny-safe at M1), the finance-S5 /
> books-S10 deny-safe-port precedent.

## §1. Context

Importing phone contacts is **X1 device-mediated** (RL-11): the device parses/normalizes/encrypts on-device; a
server-plaintext path is **refused, not downgraded** (ZK-1); the merge uses **X8 `import_staging`** (match against
existing → per-row status → **commit on user confirm** → never a silent overwrite). The `foundation/ingestion`
substrate's reconcile (`autoMatch`/`StagedRow`) is **finance-shaped** (`amountCents`), so contacts get a
**contact-specific natural-key matcher** here; the substrate's STRUCTURE (per-row status, commit-on-confirm) is
honored. **M1 build = the pure staging/commit pipeline + a deny-safe device port**; the real device bridge, the
durable `import_staging` store, and the full ingestion-guard grant (X2/X5 via enforcer/egress) = **M2** (there is no
fetch to guard until the device bridge lands). Deps unchanged (the device port is a METHOD param, not a service dep).

## §2. Business Rules (S7)

- **BR-RL-S7-1 (REL-07/10/11, X1)** — `importDeviceContacts(device?)`: **deny-safe** — an ABSENT device port ⇒
  `ContactsPermissionError` (no device/permission; no partial silent import, REL-10). A PRESENT port supplies
  on-device-parsed `RawContact[]` (the device already did the ZK-safe parse/normalize/encrypt — a server-plaintext
  path never exists in this shape, X1 refuse-not-downgrade is inherent, REL-11). Returns a **staging result** — it
  does NOT auto-commit (commit-on-confirm, X8).
- **BR-RL-S7-2 (REL-08, X8 — the reconcile matcher)** — `stageContacts(incoming, existing)` (pure): per row →
  `parse_error` (no `first_name`) · `matched` (natural key: a case-folded `email` OR `phone` OR exact
  `first_name`+`last_name` equals an existing live contact → `matchId`) · `new`. Dedup by natural key; never a
  silent overwrite.
- **BR-RL-S7-3 (REL-08, commit-on-confirm)** — `commitContactImport(staged)`: writes `new` rows as contacts
  (`createContact` from the raw fields) → `created`; `matched` rows are **skipped** (the existing contact is never
  overwritten — the user merges manually, a P6/M2 concern) → `matched`; `parse_error`/already-handled → `skipped`.
  Returns `{ created, matched, skipped }`. The caller passes the user-reviewed staging (commit-on-confirm).
- **BR-RL-S7-4 (REL-09, X2/X5 — deferred M2)** — the connector-layer classification (X2) + the `external_in_ok`
  grant enforcement (X5, via `foundation/ingestion`'s `createIngestionGuard`) wire at **M2** when the device bridge
  lands; at M1 the device port's PRESENCE is the opt-in proxy (absent ⇒ refused). Documented, not invented.

## §3. Surface (S7)

```ts
importDeviceContacts(device?: DeviceContactsPort): Promise<ContactImportResult>   // ContactsPermissionError if absent
commitContactImport(staged: StagedContact[]): Promise<ContactCommitResult>        // commit-on-confirm; no overwrite
```

- `RawContact = { sourceRowId: string; first_name: string; last_name?/email?/phone?/company? : string | null }`.
- `ImportRowStatus = 'new' | 'matched' | 'parse_error'`; `StagedContact = { sourceRowId, raw, status, matchId?, error? }`.
- `ContactImportResult = { staged: StagedContact[] }`; `ContactCommitResult = { created: string[]; matched: string[]; skipped: string[] }`.
- `DeviceContactsPort = { readContacts(): Promise<RawContact[]> }` (the deny-safe seam; M2 supplies the real device bridge).
- Error: `ContactsPermissionError` (new). `stageContacts` exported (pure, testable).

## §4. Acceptance

- [ ] `importDeviceContacts()` with no port → `ContactsPermissionError`.
- [ ] with a port: a row matching an existing contact's email → `matched` (matchId); a new row → `new`; a row with no first_name → `parse_error`.
- [ ] phone match + exact-name match also mark `matched`; case-insensitive email match.
- [ ] `commitContactImport`: `new` rows become contacts (readable via getContact/listContacts); `matched` rows are NOT written (existing contact unchanged — no overwrite); result partitions created/matched/skipped.
- [ ] a soft-deleted existing contact does NOT match (findAll active only).
- [ ] tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt

1. **types.ts** — `RawContact`, `ImportRowStatus`, `StagedContact`, `ContactImportResult`, `ContactCommitResult`,
   `DeviceContactsPort`; 2 methods; `ContactsPermissionError`.
2. **service.ts** — `stageContacts(incoming, existing)` pure closure (natural-key match, case-fold email). Methods:
   `importDeviceContacts(device?)` (deny-safe → ContactsPermissionError; else readContacts → stageContacts over
   `contactsRepo.findAll()` → `{staged}`); `commitContactImport(staged)` (new → createContact via the S1 path;
   matched/parse_error skipped; partition the result). Reuse the S1 `createContact` closure (hoist if needed).
3. **tests** — S7 describe block covering §4 (a stub `DeviceContactsPort` returning fixture rows).
4. Verification Gate → inline g2 → currency BR-RL-S7-\* → commit.

## Open calls (resolved, No-Guessing)

- **M1 = pure pipeline + deny-safe port; device bridge/store/grant = M2** ([[XS security services share a deny-safe-port build shape]]). The finance-shaped `foundation/ingestion` reconcile doesn't fit contacts → a contact natural-key matcher here (honors the substrate's status/commit-on-confirm structure).
- **matched rows never overwritten** (X8 "never a silent overwrite") — commit writes only `new`; merge is a P6/M2 concern.
