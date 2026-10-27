# foundation/ingestion — Current Business Rules

> Durable invariants for the device-mediated ingestion-guard service (XS-ingestion #44). Promoted from
> `docs/specs/foundation/xs-ingestion/` at §XXIX. Owning ADR: ADR-014 §3.1–§3.8.
> Kept current with `packages/core/src/foundation/ingestion/`.

- **IN-1 (device-mediated; refuse, don't downgrade).** A fetch that could only work by the server reading
  plaintext denies `server_proxy_refused` — checked BEFORE the grant, never silently downgraded; our server is
  never a fetch proxy. [ADR-014:40 §3.1; capability-framework.md:195 (X1)] (IR-1)
- **IN-2 (boolean necessary, not sufficient; opt-in = the grant).** `external_in_ok=true` (decided by #31) is
  required first; a non-granted integration is off by default → `external_in_not_granted`. The grant's existence
  IS the opt-in state — there is no separate `not_opt_in` reason. [ADR-014:74 §3.6; capability-framework.md:199 (X5)] (IR-9)
- **IN-3 (ingress can carry egress).** An act whose `dataScope.sensitiveModules` is non-empty routes its outbound
  fetch through the egress guard #43 (`checkEgress`/`assertFetchEgress`) → `sensitive_egress_unconsented` on deny;
  a non-sensitive fetch is NOT over-gated (governed by the boolean only). Never re-implemented here — delegated.
  [ADR-014:42 §3.1; capability-framework.md:200 (X6)] (IR-2)
- **IN-4 (never auto-transmit on the egress leg).** A sensitive-read fetch requires a `UserInitiationProof`; its
  absence is the egress deny, surfaced as `sensitive_egress_unconsented`. [ADR-014:64; ADR-015:58 §3.4a] (IR-2)
- **IN-5 (three layers by owner, honestly disclosed).** `classifyLayer` classes a connector `native |
public-reference | user-managed` (by owner, not mechanism; temporal); `buildDisclosure` returns the ADR-014:56-60
  matrix verbatim (who-sees · what-leaks · server-posture) — disclosed, not pretended away. An unknown layer fails
  loud (`UnknownIngestionLayer`). [ADR-014:44-60; capability-framework.md:196 (X2)] (IR-3/IR-5)
- **IN-6 (fetch the whole set, never the subset).** `fetchWholeSet` refuses a `subset` request
  (`scoped_refresh_refused`) — a scoped refresh re-leaks the category. The whole set is queried from a local copy.
  [ADR-014:48 §3.2; capability-framework.md:197 (X3)] (IR-4)
- **IN-7 (verify before trust; fail closed).** A bundled/mirrored dataset is verified for provenance + signature +
  version before use; an unsigned/poisoned dataset denies `unverified_dataset`. The M1 verifier fails closed
  (returns false). [ADR-014:129 §5; capability-framework.md:197 (X3)] (XCU-05)
- **IN-8 (reconcile via staging; user is final authority; parse errors fail loud; commit is idempotent).**
  `autoMatch` matches by date±/amount± tolerance and never touches a `parse_error` row; `commitStaged` commits
  only confirmed non-error rows and skips already-committed ids — the durable idempotent WRITE is the ADR-004
  §3.2.5 rail's (delegated). [ADR-014:72 §3.5; ADR-004 §3.2.5] (IR-6)
- **IN-9 (add-only feeds dedup, never delete).** `dedupeFeed` marks a duplicate `(feedId, uid)` as `isIgnored`
  and keeps the row — history preserved. [ADR-014:72 §3.5; capability-framework.md:202 (X8)] (IR-7)
- **IN-10 (the mediator holds the token; the sandbox never sees it).** `fetchThroughMediator` asserts the guard,
  then delegates to the mediator port which injects `connection_config`; the capability never receives a
  credential. M1 has no mediator → `mediator_unavailable` (deny-safe). [ADR-014:68 §3.4; capability-framework.md:201 (X7)] (IR-8)
- **IN-11 (revocation stops the future, keeps the past).** `revokeIntegration` retires the grant via
  `enforcer.revoke` (fail-closed thereafter); it reaches only the grant, never a data row — already-ingested rows
  are keep-ingested by construction. [ADR-014:70 §3.4; capability-framework.md:203 (X9)] (IR-10)
- **IN-12 (layers are tiers of one normalized contract).** The registry keys on a stable integration-identity +
  normalization contract; `registerNativeAdapter` upgrades an existing identity to `native` while keeping the same
  identity + contract — a Layer-3→Layer-1 upgrade is a connector migration, not a data migration. A user-managed
  connector must be `credentialCustody:'mediator'` (else `credential_not_mediated`). [ADR-014:78 §3.8;
  capability-framework.md:204 (X10)] (IR-11)
- **IN-13 (no credentials, no network, no store at M1).** The guard/engines decide, normalize, and register; they
  hold no token, make no network call, and the M1 ports are deny-safe (mediator absent, fetch refused, verifier
  false, staging in-memory, registries in-memory). The durable stores + real reach are M2. When persisted, the
  M2 `import_staging` + `connection_config` rows are field-encrypted `[E]` (they describe vault-bound data).
  [ADR-014:9,86,125-133 §5; xcut-ingestion-ai.md:5; ADR-002 L2] (IR-12)
