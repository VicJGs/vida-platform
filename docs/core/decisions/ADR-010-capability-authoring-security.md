# ADR-010: User-authored capabilities run under a declare→grant→enforce permission envelope inside a no-ambient-authority sandbox

**Status:** Accepted *(foundation gate PASS + Victor sign-off, 2026-07-15)*
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (Personalization & Composability foundation). ADR 5 of 5 — the guard that makes [ADR-008](ADR-008-capability-block-registry.md) §3.5 user-*authored* capabilities safe. The ⭐ SP4 decision.
**Tags:** security · architecture · extensibility · zero-knowledge · personalization
**Builds on:** [ADR-004](ADR-004-session-framework.md) §3.2.4 / SS-6 (the permission envelope — scope-to-bindings, sensitive-consent, user-types get a strict subset) **+ §3.2.5** (the write-API contract + idempotency mechanism this ADR enforces; INT-2) · the **extension-model** constitution principle (ZK core unchanged; integrations opt-in, user-owns-risk, wrapped in a protection layer) · [ADR-008](ADR-008-capability-block-registry.md) (what runs) · [ADR-009](ADR-009-templates-fork-on-instantiate.md) (imported template capabilities are untrusted) · ZK-1, EN-1/EN-2, SU-1, INT-1
**Amends:** ADR-002 — adds a `capability_grants` record (the envelope the user granted a user-authored capability). No relaxation of any encryption or sync invariant.

---

## 1. Summary

User-authored capabilities (ADR-008 §3.5) are **untrusted code**, so they run under a **security model with two
layers**: a **permission envelope** (what a capability is *allowed* to touch) enforced inside a **sandbox** (a runtime
with **no ambient authority** — no direct DB, network, or filesystem; only a mediated capability API). The model is
**declare → grant → enforce**: a capability **declares** the bindings, effects, media, and external access it needs;
the user **grants** that envelope at install (least privilege); the sandbox **enforces** exactly the granted set and
nothing more. This generalizes ADR-004's session **Permissions** dimension (SS-6) beyond sessions and makes concrete
the **extension-model** principle: **zero-knowledge is never broken** (media encrypts; no ambient network; external
egress is declared, consented, and mediated), the blast radius is bounded to the granted envelope, and shipped
capabilities (trusted, ours) are the only ones outside the sandbox. The safety net bounds *blast radius*, not
*correctness* — a user Block runs "at your own risk." Stated honestly, there are **two distinct bounds**: (1) it
**cannot** cause the *server* to see plaintext — ZK-1, **unconditional** (§3.5); and (2) it **cannot** exceed its
granted envelope or exfiltrate *local* vault data **except** (a) through an explicit, user-consented egress grant
(§3.5 — the user owns that risk) or (b) via a **sandbox escape** (the §5 residual). So "cannot leak the vault" is
**absolute for the server invariant** and **sandbox-strong for the local vault** — bounded by the runtime, not
literally unconditional.

## 2. Context — what triggered this

SP4 put **user-authored capability Blocks in the vision**: the user gets the power to create his own capabilities
"at his own risk and accord," wrapped in "a safety net / security layer … the most secure possible." The intent and
the authoring *seam* are locked; the safe-authoring *surface* is a later design-pass — but the **security invariants
the runtime must enforce are decided now**, because ADR-008 opens the registry and nothing non-shipped may run until
this guard exists. `[FACT: docs/intake/spaces.md SP4 — "at their own risk … safety net and layer to let it be the
most secure possible"; L83-87]`

**Why a real security model, not a policy note.** A user-authored capability is untrusted code executing on the
device that holds the **decrypted vault**. Its threat surface:
- **Exfiltration** — read vault data it was not granted and send it out (the direct ZK-1 violation).
- **Privilege escalation** — touch entities or modules beyond its bindings.
- **Corruption** — write bad data, or double-count XP / habit-occurrences / measurements. *(The double-count half is bounded only because ADR-004 §3.2.5 supplies real idempotency — the sandbox stops a bypass, §3.2.5 stops a replay; both are needed.)*
- **Resource abuse** — hang or exhaust memory, degrading the local-first app (a local DoS).
- **Impersonation** — masquerade as a shipped, trusted capability.

The machinery to answer these **already exists** and is reused, not invented: ADR-004's permission envelope (SS-6)
and the extension-model principle. `[FACT: ADR-004 §3.2.4–§3.2.5; business-rules INT-2 + extension-model; task-file HIGH
constitution item]`

## 3. Decision

**3.1 Trust boundary.** **Shipped capabilities are trusted** (authored by us, fully configured, ADR-008 §3.5) and run
in-process. **Every non-shipped capability — user-authored *or* arriving inside an imported template (ADR-009) — is
untrusted** and runs under §3.2–§3.5. There is no third tier; there is no "review-and-promote-to-trusted" pipeline
(that would be a marketplace, which SU-1 / community-is-external forbids).

**3.2 declare → grant → enforce (least privilege).** The spine of the model.
- **Declare** — a capability's definition (ADR-008 anatomy) states exactly what it needs: which **entity types /
  bindings** it reads or writes, which **effects** it emits, whether it **captures media**, whether it **reaches
  external data** (in and/or out).
- **Grant** — at install/enable, the user is shown the declared envelope and **grants it** (or declines). The grant
  is recorded as a **`capability_grants`** row `{ capability_def_id · granted_bindings · granted_effects · media_ok ·
  external_in_ok · external_out_ok · consented_sensitive_modules · granted_envelope_hash }` (syncable per DATA-4;
  EN-2). Nothing is implicit. **`granted_envelope_hash`** is a hash of the exact declared envelope the user granted;
  the **Re-grant on change** check (below) compares the capability's *current* declaration against it, so any envelope
  change is detected and the capability fails closed until re-granted. This is the field the delta-check depends on —
  named here so it is not left implicit.
- **Enforce** — the sandbox permits **only** the granted set at runtime. A call outside the grant fails closed (denied
  + surfaced), never silently widens.
- **Revocable** — a grant is **never permanent**. The user can revoke it at any time (disable/uninstall); revocation
  **syncs** (§3.6) and the capability **stops running immediately** (fail closed on the next call).
- **Re-grant on change** — if a capability's **declared** envelope changes (the user edits his Block, or an imported
  template's capability differs from the granted one), the grant is **invalidated for the delta** and the capability
  **fails closed until the user re-grants** the new envelope. **Privilege never grows silently on edit or update** —
  a broader declaration always re-prompts.

**3.3 The permission envelope (ADR-004 SS-6, generalized).** Within the grant, a capability is bound by:
1. **Attachment-scoped** — it may read/write **only** entities it is explicitly bound/attached to (ADR-008 §3.3). No
   ambient vault access; there is no "read all pages" primitive for a user capability.
2. **Guarded-write only** — every write goes through a **documented module write API** (INT-2), never a direct table
   write; the API validates. A user capability inherits ADR-008's guarded-write discipline — the mechanism owned by
   **ADR-004 §3.2.5** (the single write path) — with **no exceptions**.
3. **No double-count** — one effect per event (one XP, one habit-occurrence, one measurement); enforced at the write
   API by **ADR-004 §3.2.5's idempotency** (deterministic `effect_event_id` + dedup ledger), as for sessions. *This
   is now a real mechanism, not an assertion — so the corruption bound below (§2) actually holds.*
4. **Sensitive-module consent** — effects touching a **sensitive class** (Finance, Health; **medical data is the
   most-sensitive**, Health HC-14) require **explicit, per-capability opt-in consent** captured in the grant; never
   default-on. Consent is bound to the classes named in the grant: if the capability is **later attached to an entity
   of a sensitive class not covered by the original grant**, that is an envelope change — it **re-prompts** (Re-grant
   on change, §3.2) and **fails closed** until consented. Sensitive reach never widens silently via a new attachment.
5. **Strict subset** — a user capability's envelope is a **strict subset** of what shipped capabilities may do; new
   privilege classes are added to shipped first and only exposed to user-authoring deliberately.

**3.4 The sandbox — no ambient authority.** User capability code executes in an **isolated runtime** with **no
direct access** to SQLite, the network, the filesystem, or other capabilities' state. Its **only** channel to the OS
is the **mediated capability API**, which applies §3.2–§3.3 on every call. The sandbox also enforces:
- **Resource limits** — CPU-time, memory, and wall-clock budgets; a runaway capability is **terminated** (the local
  app never hangs) — closing the resource-abuse threat.
- **Identity** — a user-authored capability is **visibly marked untrusted** in the UI and **cannot register a shipped
  capability's id** or claim trusted status — closing impersonation.

**3.5 Zero-knowledge is never broken (the hard invariants).**
- **Media** captured by any capability is stored **encrypted** (L2/L3 per EN-1/EN-2) — no plaintext blob path.
- **No ambient network.** The sandbox has **no** implicit network. Any external reach is a **declared, consented,
  mediated** call:
  - **external *in*** (pull public/third-party data) rides the **external-data ingestion** guard (opt-in,
    user-owns-risk);
  - **external *out*** (egress — data leaving the vault) is the **strictest** case (Health CI-6): explicit per-target
    consent, and the OS still never auto-transmits (SU-1). Egress is the one path that can leave the vault, so it is
    the most tightly gated grant.
- **ZK-1 holds unconditionally:** no envelope, grant, or capability can cause the *server* to see plaintext — the
  server remains a blob relay regardless of what the user authors.
- **Compositional exfiltration is a user-consented path, surfaced as one.** Neither a sensitive read nor external-out
  is dangerous alone; their **combination** is — a capability granted **both** is, by definition, a consented
  exfiltration channel. Because the risk is compositional, the grant must present the **combination conspicuously**
  and require the **union** of consents (sensitive-read consent **and** external-out consent, per target). The OS
  never silently permits the pair; within an explicit dual grant, the user owns the risk (§3.7).

**3.6 Uniform cross-platform enforcement.** The envelope + the invariants (§3.3, §3.5) are **platform-agnostic and
identical** on web, mobile, and desktop; a capability definition and its `capability_grants` **sync together**
(ADR-003) and enforce the same envelope everywhere. The **sandbox runtime is per-platform** (the *how*), but the
**guarantees are one** (the *what*). A device that cannot enforce the envelope must **refuse to run** the capability
(fail closed), never run it unguarded.

**3.7 User-owns-the-risk — what the safety net does and does not promise.** The OS guarantees a user capability
**cannot exceed its granted envelope and cannot break zero-knowledge**. It does **not** guarantee the capability is
bug-free, correct, or does what the user intended. The safety net bounds the **blast radius** (to the envelope), not
the **correctness** (the user's code is his own) — the direct analogue of Health HC-14's "the OS records/advises/
safety-nets, never gatekeeps," applied to authoring.

**What this decision does NOT do:** it does not pick the sandbox runtime technology (per-platform design-pass — e.g.
worker/isolate/embedded JS engine); it does not design the authoring language/DSL or the authoring UI (the
safe-authoring surface, deferred by SP4); it does not design the grant/consent UX. It **locks the invariants** any of
those must satisfy.

## 4. Options Considered

### Option A — declare→grant→enforce envelope inside a no-ambient-authority sandbox (CHOSEN)
- **Rationale:** the only model that lets untrusted code run on a decrypted vault without risking ZK; reuses ADR-004's
  envelope + the extension-model principle rather than inventing a scheme; least-privilege by construction; blast
  radius provably bounded to the grant; fails closed. Delivers SP4's "at your own risk + safety net."
- **Tradeoffs accepted:** a mediated capability API + sandbox runtime per platform is real engineering; user
  capabilities are less capable than shipped ones (a strict subset) by design; a per-platform runtime that can't
  enforce the envelope must refuse to run the capability.

### Option B — Trust user code; run it in-process with app privileges (REJECTED)
- **Why rejected:** untrusted code with ambient authority over the decrypted vault is an unbounded exfiltration path
  — a direct, catastrophic ZK-1 violation. Non-negotiable.

### Option C — No user-authoring; shipped capabilities only (REJECTED)
- **Why rejected:** abandons the SP4 vision (user-authored Blocks are explicitly *in*). The point is to let the user
  compose his own capabilities safely, not to forbid them.

### Option D — Central review/signing before a user capability may run (REJECTED)
- **Why rejected:** a review/approval/signing authority is a **marketplace** — it requires the OS to transmit and vet
  user artifacts, breaking SU-1 and the community-is-external principle. Safety comes from the **sandbox**, not from
  a gatekeeper. (Sharing stays out-of-OS via ADR-009 templates.)

## 5. Consequences

**Easier:**
- Users can author capabilities with a hard guarantee that a bad or malicious Block cannot leak the vault or exceed
  its grant — the safety net SP4 asked for.
- One security model covers user-authored Blocks **and** capabilities arriving in imported templates (ADR-009) —
  same untrusted tier, same sandbox.
- The envelope is the same object ADR-004 already defined for sessions — one permission concept across the OS.

**Harder:**
- A real sandbox runtime + a mediated capability API must be built per platform, with uniform guarantees — the
  heaviest single piece of the Spaces build.
- User capabilities are deliberately a strict subset of shipped ones; some things only shipped capabilities can do
  until a privilege is deliberately widened.
- Grant/consent UX must make the envelope legible without nagging (a build-time design problem), and must surface the
  compositional read+egress risk (§3.5) conspicuously.
- **Residual risk — sandbox escape.** "No ambient authority" is only as strong as the runtime that enforces it; a
  runtime vulnerability that escapes the sandbox is the residual risk the **per-platform runtime design-pass must
  minimize** (defense in depth: least-privilege host, a kept-current engine, no shared mutable state across
  capabilities). The guarantee is bounded by the runtime, not absolute — named here rather than implied away.

**Explicitly accepted tradeoffs:**
- Sandbox + mediation cost and a capability gap between user and shipped, in exchange for the only model where
  user-authored code and zero-knowledge coexist.

## 6. Review Date / trigger
Reconsider at the **safe-authoring surface design-pass** (when the authoring language + sandbox runtime are chosen)
and again at the **first external-egress grant** (Health CI-6) — egress is the sharpest test of §3.5. If a genuine
user need cannot be met within a strict-subset envelope, widen **shipped** capabilities first and only expose the new
privilege to authoring behind an explicit grant — never by loosening the sandbox.
