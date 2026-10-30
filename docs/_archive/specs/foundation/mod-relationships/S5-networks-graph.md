# S5 — Networks + graph data-prep (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S5 of 9. Legs: REL-43, REL-44, REL-45, REL-46. Grounded in: `relationships.ts`
> (network_groups, network_group_contacts), RL-4 (many-to-many, membership-only edges), identity.md:19-22,
> decomposition REL-43…46. (Network HEALTH = REL-47 → S6; network notes/tags → S8.)

## §1. Context

Networks (G2) — a contact belongs to MANY networks (RL-4). `network_groups` (name `[E]`, is_active; no `deleted_at`,
is_active governs lifecycle) + `network_group_contacts` (synthetic-id junction, UNIQUE(network,contact)). S5 = the
network structure + the **neural-graph data-prep** (REL-46): a node/edge set for Sigma.js, membership edges only
(contact→network), **never contact↔contact** (RL-4). The Sigma RENDER is ② (P6). No JSON columns → `NetworkGroupRow`
directly. Deps unchanged.

## §2. Business Rules (S5)

- **BR-RL-S5-1 (REL-43)** — `createNetwork(input)` over `network_groups`; backfill `is_active:true`; re-read.
- **BR-RL-S5-2 (REL-44/45)** — `addToNetwork(networkId, contactId)` / `removeFromNetwork(networkId, contactId)` over
  `network_group_contacts`. `addToNetwork` guards a live network (`NetworkNotFoundError`) + a live contact
  (`ContactNotFoundError`); **idempotent** (UNIQUE(network,contact) — skip if the membership exists, REL-45). A
  contact may belong to many networks. `removeFromNetwork` guards the network; removes the junction row if present.
- **BR-RL-S5-3 (REL-46)** — `getNetworkGraph(): NetworkGraph` = `{ nodes, edges }`. `nodes` = every active network
  (`kind:'network'`, label=name) + every contact that is a member of ≥1 network (`kind:'contact'`, label=first_name);
  `edges` = one per membership (`source`=contact_id → `target`=network_group_id). **No contact↔contact edges** (RL-4).
  Member contact_ids are always live (softDeleteContact cascades their memberships, S1).
- **BR-RL-S5-4 (validation)** — `name` required (`[E]`, notNull).

## §3. Surface (S5)

```ts
createNetwork(input: CreateNetworkInput): Promise<NetworkGroupRow>        // (no JSON cols → raw row)
addToNetwork(networkId: string, contactId: string): Promise<void>        // NetworkNotFoundError + ContactNotFoundError; idempotent
removeFromNetwork(networkId: string, contactId: string): Promise<void>   // NetworkNotFoundError
getNetworkGraph(): Promise<NetworkGraph>                                  // membership node/edge set (Sigma-ready)
```

- `NetworkGraph = { nodes: GraphNode[]; edges: GraphEdge[] }`; `GraphNode = { id: string; kind: 'contact' | 'network';
label: string }`; `GraphEdge = { source: string; target: string }`.
- `CreateNetworkInput` Zod-inferred (`name` required). Error: `NetworkNotFoundError` (new).
- **Un-homed (noted, not invented):** `deleteNetwork` (REL-43/44/46 = create + add/remove + graph; networks removed by
  deactivation; a member's exit via removeFromNetwork or contact cascade). Network health = REL-47 (S6).

## §4. Acceptance

- [ ] createNetwork persists + backfills is_active; a contact joins MULTIPLE networks (RL-4).
- [ ] addToNetwork idempotent (dup → 1 junction row); guards unknown network (NetworkNotFoundError) + non-live contact (ContactNotFoundError).
- [ ] removeFromNetwork removes the membership; unknown network → NetworkNotFoundError.
- [ ] getNetworkGraph: nodes = networks + member contacts; edges = contact→network memberships; no contact↔contact edges; an isolated (member-less) network still appears as a node; a contact in 2 networks has 2 edges.
- [ ] tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt

1. **Validators** — `CreateNetworkSchema` (name required; is_active optional); `CreateNetworkInput`.
2. **types.ts** — `NetworkGraph`/`GraphNode`/`GraphEdge`; 4 methods; `NetworkNotFoundError`; import `NetworkGroupRow`.
3. **service.ts** — add `networkGroupsRepo` (networkGroupContactsRepo built S1). createNetwork (backfill+re-read);
   addToNetwork (guard network+contact, idempotent via existing-set); removeFromNetwork (guard, delete junction);
   getNetworkGraph (findAll networks + findAll junctions + member contacts → build nodes/edges).
4. **tests** — S5 describe block covering §4.
5. Verification Gate → inline g2 → currency BR-RL-S5-\* → commit.
