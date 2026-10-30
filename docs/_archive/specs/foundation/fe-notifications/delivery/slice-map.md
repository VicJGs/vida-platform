<!-- Entity Delivery Flow ② · Step 2 — Decomposition Gate · fe-notifications (LIF-192) -->

# fe-notifications ② — Slice Map

> **Status: PROPOSED — pending Approval 1 (Decomposition Gate).** All slices are `frontend` (pure ② over the
> finished `mod-notifications` ①; no `@vida/core`/`@vida/types` change). Each slice closes with a blocking
> real-browser Visual Gate across 3 presets × light/dark (+ the EC-8 warm-dark contrast MUST). Covers the gated
> legs NOT-24 (inbox UI) + NOT-25 (dangling) as shaped by the approved Envision (3 user-selectable lenses).

## Shared seam (built in S1, consumed by every lens)

- `apps/web/src/notifications/` surface dir (mirrors `apps/web/src/notes/`).
- **`useNotifications`** — M1-default **honest-empty** + `?sample` DEV populate (the notes-surface precedent;
  no live `@vida/core` composition root yet). Returns inbox rows (`NotificationView[]`), derived 8-state, and
  the `unreadCounts()` badge. Live `NotificationsService.list/unreadCounts` swap documented + deferred. `[FACT: interpretation.md IR-1]`
- **`useNotificationLens`** — the selected lens (`margin | dispatches | constellation`), persisted **locally**
  (app-local UI state; NO new Preferences field); default `margin`. `[FACT: envision.md Decision]`
- **Content model** — a pure `toAttentionModel(rows, now)` that splits rows into `anticipated` (future
  `hard_deadline`, derived) vs `settled`, derives relative time, resolves severity marker + dangling (NOT-25),
  and exposes the System voice line. One model, three renderers. `[FACT: envision.md EC-2/EC-6]`
- Shared chrome: route mount at `/notifications`, title, derived unread badge, status control
  (unread/read/archived), `mark all read`, per-row lifecycle (`markRead`/`archive`) — writes **deferred-live**.

## Slices

### S1 — Foundation + The Margin (flagship, default lens) · EC-1·2·5·6·7·8·9

The shared seam above **+ the lens switcher** (default Margin) **+ The Margin renderer**: vertical time-spine,
the **now-line** signature, anticipations above (derived/hollow/faded), settled below (solid), entity chip +
System voice per row; severity quiet (warm only for error/warning); NOT-25 dangling state; full 8-state
(loading skeleton · empty "all caught up" · calm error+Retry · populated); lifecycle actions.
→ **Usable after S1:** the default notifications experience works end to end (honest-empty + `?sample`).
→ Visual Gate MUST include **EC-8**: serif display preloaded + AA title/voice contrast on warm/olive dark.

### S2 — Dispatches lens · EC-3·5·6·7·9

The briefing renderer over the same content model: serif prose, narrative time-groups (This morning / Earlier /
Still ahead), first-person-System voice; its own empty ("you're clear — here's the day ahead") + states;
reachable via the switcher. No new data; a second renderer of the S1 model.

### S3 — Constellation lens · EC-4·5·6·7·9

The map renderer: life-area hubs (grouped by `entity_type`→module) with count badges + orbiting alert dots over
the shipped **NeuralGraph** (`@vida/ui`), "you" at center, tap-area → its alerts; its own empty/loading/error;
reachable via the switcher. Resolves the WebGL concrete-color seam (the probe-span precedent,
[[webgl-canvas-color-needs-getcomputedstyle-probe-not-get-web]]) + reduced-motion gate.

## Coverage — every structural EC maps to ≥1 slice

| EC                                 | Slice(s)                                |
| ---------------------------------- | --------------------------------------- |
| EC-1 switcher + route + local pref | S1                                      |
| EC-2 The Margin                    | S1                                      |
| EC-3 Dispatches                    | S2                                      |
| EC-4 Constellation                 | S3                                      |
| EC-5 quiet severity (all 6 types)  | S1 · S2 · S3                            |
| EC-6 NOT-25 dangling               | S1 · S2 · S3                            |
| EC-7 8-state + lifecycle           | S1 (shared) · S2 · S3                   |
| EC-8 warm-dark contrast            | S1 (Visual-Gate MUST, re-checked S2/S3) |
| EC-9 calm/reduced-motion feel      | S1 · S2 · S3 (live gate)                |

## Explicitly NOT in scope

- Channel-matrix / notification-preference WRITES (drift; a Preferences-config concern — interpretation §0).
- Live `@vida/core` composition root (honest-empty + `?sample`; live swap = first-consumer, deferred).
- Digest/batching delivery (NF-15 → M2); real push/email/OS reach (M2).
