# Operation Flow — XS-capability enforcement services

> Full lifecycle + data-flow + txn boundaries + the per-action decision rule. ADR-010 §3.2-3.5 grounded.

## Decision flow — `checkAction(defId, action)` (S1)
```
resolve def (registry.get)
  ├─ not found                      → deny? NO — throw CapabilityNotFound (a real programming error, not a policy deny)
  ├─ is_user_type === false (shipped/trusted)  → ALLOW (bypass, §3.1)
  └─ user def:
       load grant (getGrant)
         ├─ null                    → DENY 'no_grant'                    (INV-1 fail-closed)
         ├─ !isEnvelopeCurrent      → DENY 'envelope_changed'           (INV-6 / IR-2)
         └─ match by action.type:
              'effect'       → effect ∈ grant.granted_effects            else 'not_in_envelope'
              'binding'      → entityType ∈ grant.granted_bindings       else 'not_in_envelope'
              'media'        → grant.media_ok === true                   else 'media_not_granted'
              'sensitive'    → moduleClass ∈ grant.consented_sensitive_modules else 'sensitive_consent_missing'
              'external_in'  → grant.external_in_ok                       else 'not_in_envelope'
                               (per-source LAYER classification = XS-ingestion #44 · not gated here)
              'external_out' → grant.external_out_ok                      else 'not_in_envelope'
                               (per-target consent + audit = XS-egress-guard #43 · not gated here)
              compositional  → if grant holds ANY sensitive-module consent AND (external_in_ok OR external_out_ok),
                               require the UNION: BOTH the sensitive consent AND the external consent present,
                               else 'compositional_exfiltration'          ← IR-1 / XCU-08 (grant-enforcement half)
```
> #31 gates the grant BOOLEAN + the compositional union only. Per-source/layer (#44) and per-target/audit (#43)
> are delegated seams the caller composes with — no per-source/target storage here `[FACT: xcut-ingestion-ai.md:14,19,21]`.
- `assertPermitted` = `checkAction` then `throw CapabilityDenied` on `!allowed`.
- **Read-only, no txn** — point lookups; no write on the enforcement path.

## Grant lifecycle flow (S2)
- **`grant(defId, envelope)`** — resolve def → assert `envelope ⊆ def.declaration` (else `GrantExceedsDeclaration`)
  → `hash = canonicalEnvelopeHash(def)` (the def's declared `{bindings, effects}`, ADR-008:119-121; symmetric with the
  drift check) → `Repository.create(capability_grants, {…envelope, granted_envelope_hash: hash})`. Grants repo wired
  `softDelete: true` (A1). Single `create` = one transaction with the co-transactional `sync_queue` enqueue
  `[FACT: repository.ts:191-195]`.
- **`revoke(defId)`** — find grant → `Repository.softDelete` (`deleted_at`) → syncs. Next decision reads null → deny.
- **Re-grant on change** — the user (or an imported template diff) edits the def; `isEnvelopeCurrent` now false;
  enforcement fails closed `envelope_changed`; the enable flow calls `grant` again with the new envelope (revoke+create).
  Subset validation runs BEFORE the revoke, so an invalid re-grant never destroys the existing valid grant.
- **Re-grant atomicity (N1) — fails safe.** `grant` = `revoke` then `create` in two transactions (not one); a crash
  between them leaves NO active grant → the cap fails closed (`no_grant`), the safe direction. Acceptable for
  single-user local-first; not a data-loss path (no user content, only a policy record).

## Offered-set flow (S3)
- **`resolveOfferedSet(spaceId, 'inline')`** — `registry.list()` → filter `render_targets.includes('inline')`. Union;
  no Space read (a page may belong to many Spaces → inline is non-restrictive) `[FACT: xcut-spaces.md:49]`.
- **`resolveOfferedSet(spaceId, 'standalone')`** — read `space_enabled_blocks WHERE space_id=? AND deleted_at IS NULL`
  → resolve each `capability_def_id` via registry → filter `render_targets.includes('standalone')`. Restrict.

## Data-flow summary
`validate → (read registry + grant/palette) → decide/persist → return`. Encryption seam touched only on `grant`
(Repository write); enforcement + resolver are read-only. No vault key on any path (INV-4).
