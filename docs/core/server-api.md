# Core Contract — Server API (the public surface)

The CORE-level **Contract** aspect: the only interface the outside world (the client apps) touches.
Because Vida is zero-knowledge, this surface is deliberately tiny — the server is a **sync relay + auth +
billing**, never a data API. `[[business-rules]]` ZK-1, LF-1.

> ⚠ **Status: SCAFFOLD — not yet implemented.** `apps/server/src/routes/{auth,sync,billing}.ts` are
> **empty (0 lines)**; only `GET /` and `GET /health` exist (`apps/server/src/index.ts`). The contract
> below is the **intended surface harvested from ADR-001 §Auth and ADR-003**, NOT from running code.
> Fill this doc from the route handlers once they are implemented (No-Guessing: do not invent payloads).

---

## Surface (intended) `[FACT: ADR-001 §Auth; ADR-003; apps/server route files]`

| Area | Source of truth | Intended responsibility |
|------|-----------------|-------------------------|
| **Auth** (`routes/auth.ts`) | ADR-001 §Auth (SRP) | SRP register / login challenge-response. Server stores only salt + verifier — **never** a password or key (ZK-2). |
| **Sync** (`routes/sync.ts`) | ADR-003 | Encrypted blob push/pull over **WebSocket** (polling fallback). One blob per entity; blob index `(table, row_id → R2 key, version, lww_ts, device_id)`. Server treats payloads as **opaque** (ZK-1). |
| **Billing** (`routes/billing.ts`) | — (decide in spec) | Subscription/billing surface. Contract TBD — flag as open question when implemented. |
| **Health** | `index.ts` | `GET /` , `GET /health` — implemented. |

## Non-negotiables this surface must honor
- **ZK-1 / ZK-2** — server never sees plaintext, passwords, or keys. Sync payloads are opaque blobs; field
  names in blob headers are schema column names, not user content `[FACT: ADR-003 §4.1 note]`.
- **LF-1** — this is a relay, not a database; the client is the source of truth.
- **Attachments** flow through a **separate R2 pipeline**, not the blob channel `[FACT: ADR-003]`.

## Terminal states to specify when implemented
Auth: invalid-credentials · unknown-user · success. Sync: offline/unreachable (queue + retry) ·
version-conflict (LWW resolve) · success. Billing: TBD.

---

## Completion checklist
- [ ] Replace intended surface with actual endpoints once `routes/*.ts` are implemented
- [ ] Document request/response shapes from the Hono handlers (not from imagination)
- [ ] Confirm WebSocket vs polling transport and the blob-index schema against the running server
- [ ] Resolve the Billing contract (currently undefined)
