# Spec: U10 — Toast (UI-1 primitive 10/10, 3rd/last overlay)
<!-- type: component -->
Status: IMPLEMENTED (2026-08-09) — Visual Gate PASS (Victor, both themes). Implements `ds-5-primitive-contracts/toast.md`.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Task: ui-1-vida-ui-primitives (LIF-86, M1.0 #27, Design System). Session: 2026-08-09.

---

## 1. Identity & Intent

**Toast** — **transient, non-blocking** feedback about the result of an async action. Auto-dismisses;
**never steals focus**. [FACT: toast.md:4-6]

- **NOT a persistent inline message** (→ `Alert`, not in UI-1): a toast auto-dismisses. [FACT: toast.md:5]
- **NOT a blocking decision** (→ `Dialog`, U8): a toast never traps focus or scrims. [FACT: toast.md:5-6]
- It is the **10th and final primitive**, 3rd of 3 overlays. It is the **only imperative primitive**: the
  consumer calls `toast(options)` — there is no `<Toast>` element the consumer renders per-message. [FACT:
  toast.md:20 "Imperative surface: toast(options) → id; toast.dismiss(id)"]

**The architectural distinction that drives everything below.** U1–U9 are declarative — the consumer renders
the element and React owns its lifecycle. Toast is imperative and callable from **outside the React tree** (an
async `catch`, a store action, a non-component module). Bridging a non-React call site to a React-rendered
portal region is the whole design problem; §3 is mostly about that bridge. [INTERP: toast.md:20 + the imperative
signature]

## 2. API Contract

### 2.1 The imperative surface  [FACT: toast.md:9-21]
```ts
export type ToastIntent = 'info' | 'success' | 'danger'
export interface ToastOptions {
  title: React.ReactNode
  description?: React.ReactNode
  intent?: ToastIntent          // default 'info'
  /** ms before auto-dismiss; 0 = sticky (requires manual dismiss). Default 5000. */
  duration?: number
  action?: { label: string; onPress: () => void }  // one optional action
  onDismiss?: () => void
}
export interface ToastHandle {
  (options: ToastOptions): string        // returns the toast id
  dismiss: (id: string) => void
}
export const toast: ToastHandle          // the singleton — Object.assign(fn, { dismiss })
```
- `toast(options)` returns a string **id** (used for `toast.dismiss(id)` and as the React `key`). [FACT: toast.md:20]
- `toast.dismiss(id)` removes a toast programmatically (e.g. resolving a sticky loading toast). [FACT: toast.md:20]

### 2.2 The region-mount component (a NECESSARY structural addition — DEF-U10-a)
The contract says the element "renders in a portal region" [FACT: toast.md:20] but **does not name the component
that mounts that region**. One is architecturally required: the region must render **inside the app's React
tree** (under `UIProvider`) so it inherits the Tamagui theme + `<Theme name="Toast">` scope — a detached React
root would not. [INTERP: the theme-context constraint; the Dialog/Popover portals all re-wrap `<Theme>` because
the portal detaches the sub-theme, CLAUDE.md:63-64]

```ts
export interface ToastProviderProps {
  /** max simultaneously VISIBLE toasts PER region; on overflow the oldest is evicted. Default 3. */
  limit?: number
  /** stack corner. Default 'bottom'. (No position in ToastOptions — the region owns placement.) */
  placement?: 'top' | 'bottom'
}
export function ToastProvider(props: ToastProviderProps): JSX.Element
```
Mounted **once** near the app root (UX-3/UI-4's job to place it). Named `ToastProvider` to match the repo's
`UIProvider` idiom [FACT: index.ts:12] — though it provides a *render region* backed by the external store, not a
React context. **DEF-U10-a**: the contract under-specifies this mount component; naming + `limit`/`placement`
props are a disclosed structural addition, flagged for the DS. [INTERP]

**[F1 — preflight fold] SINGLE-PROVIDER invariant.** The store is a **module singleton**, so **two** mounted
`ToastProvider`s would each subscribe and **render every toast twice**. Exactly one provider is mounted app-wide
(the react-hot-toast/sonner single-`<Toaster>` model). The provider **dev-warns** if a second instance mounts (a
module-level mounted-count guard, the Menu missing-name dev-warn precedent, menu.tsx:181-184). Tests/stories each
mount ONE provider and unmount it (§3.2 harness note). [INTERP: module-singleton store consequence]

## 3. Mechanism — the imperative→React bridge

### 3.1 The external store (`internal/toast-store.ts`, net-new — the core seam)
A module-level store, subscribed via **`useSyncExternalStore`** (React 19 built-in, zero-dep — `@vida/ui` has no
zustand; deps are Tamagui-only [FACT: packages/ui/package.json]). This is the react-hot-toast / sonner pattern.
[INTERP: the standard imperative-toast bridge]

```ts
type ToastPhase = 'entering' | 'exiting'   // [M5] no explicit 'visible' — the enter keyframe settles + holds
interface ToastRecord extends ToastOptions { id: string; phase: ToastPhase }

let records: ToastRecord[] = []                 // the snapshot (stable ref between emits)
const listeners = new Set<() => void>()
let counter = 0                                 // id source — a monotonic counter, NOT UUIDv7
                                                //   (ephemeral UI state, never persisted/synced) [FACT: conventions — UUIDv7 is for DB PKs]

function emit() { records = [...records]; listeners.forEach(l => l()) }   // new ref each change → useSyncExternalStore re-renders
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getSnapshot() { return records }        // SAME ref when unchanged → no infinite loop
export function getServerSnapshot() { return records }  // no-op for a non-SSR SPA; retained for API-completeness

export function addToast(opts: ToastOptions): string { /* push {id, phase:'entering', ...}; emit; return id */ }
export function dismissToast(id: string): void { /* IDEMPOTENT → §3.4 exit orchestration */ }

export const toast: ToastHandle = Object.assign(addToast, { dismiss: dismissToast }) as ToastHandle  // [m1]
```
- **Snapshot stability** [FACT: React `useSyncExternalStore` contract]: `getSnapshot` must return the *same
  reference* when nothing changed, or React loops. So `records` is reassigned **only** in `emit()`; reads return
  the current ref untouched.
- **`getServerSnapshot`** [M6] is a **no-op belt-and-suspenders** — `useSyncExternalStore` only calls it during
  SSR/hydration, which never happens in this non-SSR SPA; it returns the same `records` ref (no hydration
  mismatch). Retained for API-completeness, NOT because the app is SSR. [FACT: app is a non-SSR SPA, CLAUDE.md]
- **`toast` singleton typing** [m1]: `Object.assign(addToast, { dismiss })` yields `typeof addToast & { dismiss }`;
  the single `as ToastHandle` cast narrows it to the callable interface. This is the **one justified cast** — NOT
  an `any`/`!` violation (§10 / engineering §XV); documented inline.
- **`id` source** [m2]: a module-level monotonic `counter` (not UUIDv7 — this is ephemeral UI state, never
  persisted/synced [FACT: conventions — UUIDv7 is for DB PKs]). Monotonic ⇒ collision-free even across a provider
  remount / StrictMode double-invoke.
- **Cap — STORE-ENFORCED, evict-oldest (was OQ-2; M2 + M3; gate-2 M2/M3 reconcile):** the cap is enforced in the
  **store on `addToast`**, NOT by a render-time slice (a `.slice(-limit)` at render would drop the oldest the same
  commit it starts exiting, so its exit animation could never play — the gate-2 contradiction). Instead: `limit`
  (default 3) applies **per region** (danger→assertive, else→polite — independent budgets, so a `danger` toast is
  **never starved** by an info/success burst, M2). On `addToast`, after inserting, count the new toast's region's
  records **whose `phase !== 'exiting'`**; if that exceeds `limit`, **evict the region's OLDEST non-exiting
  record** by routing it through `dismissToast` (→ normal exit animation, then hard-remove). The **provider
  renders EVERY record** (`entering` and `exiting`) — no slice (§3.2); exiting toasts are **cap-exempt by
  construction** (the count is non-exiting only), so the evicted one slides out while the new one slides in (a
  brief `limit + exiting` on screen — correct). **Invariant: non-exiting records per region ≤ `limit`.** This is
  the sonner/react-hot-toast reducer model — newest-visible, evicting the oldest (FIFO/queue was wrong for
  transient feedback: the newest result is the most relevant). `log()` the cap once at provider mount. [FACT:
  toast.md:52 "max N visible (older ones collapse/queue) — log() the cap"]
  - **No "queued" state (gate-2):** because overflow **evicts** rather than queues, every record in the store is
    rendered — no in-store-but-unrendered backlog, so no invisible record can tick (the original B1 "queued
    timer" concern is dissolved). The remaining B1 fix is purely the **timer effect deps** (§3.4).
  - **Eviction `onDismiss` (gate-2 B2):** an evicted toast routes through the same `dismissToast`, so its
    `onDismiss` fires — **identically to a user dismiss**. The contract's `onDismiss: () => void` is **param-less**,
    so it **cannot distinguish eviction from dismissal** [FACT: toast.md:18]. Chosen deliberately (sonner fires
    `onDismiss` on eviction too); flagged **DEF-U10-f** — a `reason: 'user'|'timeout'|'evicted'` arg would let a
    consumer tell them apart, but the contract has none, so UI-1 ships the param-less callback verbatim.

### 3.2 `ToastProvider` (the region — `toast.tsx`)
- `const records = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
- Renders a **portal to `document.body`** (react-dom `createPortal`, the Select/Menu/Popover precedent
  [FACT: CLAUDE.md:24-27]) re-wrapped in **`<Theme name="Toast">`** so `light_/dark_Toast` crosses the portal.
- **[F4 — preflight fold] Region geometry (disclosed defaults, verified at Visual Gate)**: `placement:'bottom'`
  (default) → the region is `position:fixed`, bottom inset `$16`, **horizontally centered**; `top` → top inset
  `$16`. Each toast `maxWidth` ~360 (min ~320); vertical stack gap `$8`. `pointer-events` on the region wrapper is
  `none` with each toast `auto`, so the region doesn't block clicks in its empty margins (the non-modal
  requirement — a toast must not eat background clicks). [INTERP: contract has no position/size tokens → sensible
  defaults; DEF-U10-c/d]
- **TWO persistently-mounted live regions** (the a11y core, §6) inside the portal, positioned `fixed` at the
  `placement` corner (`bottom` default), `zIndex.toast` (1400) [FACT: tokens.ts:9]:
  - **polite region** — `role="status"` `aria-live="polite"` `aria-atomic="false"`: renders records with
    `intent !== 'danger'` (info · success). [FACT: toast.md:46]
  - **assertive region** — `role="alert"` `aria-live="assertive"`: renders `intent === 'danger'` records.
    [FACT: toast.md:46,31]
  - Both wrappers are **always in the DOM even when empty** — a live region must pre-exist for the SR to
    announce an inserted child. [FACT: §XIV live regions; toast.md:46] [B: the mount-on-first-toast trap]
- **Renders EVERY record (no slice — gate-2 M2)**: partition `records` by intent (danger → assertive, else →
  polite) and render **all** of each region's records (both `entering` and `exiting`). The per-region cap is
  maintained by the **store** (§3.1 evict-oldest), so the non-exiting count is already ≤ `limit`; the provider
  does no slicing, which lets an evicted/dismissed toast play its exit animation. `pointer-events:none` is on the
  geometry wrapper **and** on both `role` region wrappers (so an empty stretched live-region div never eats
  background clicks, m1); each `ToastItem` is `pointer-events:auto`.
- **F6 region shortcut (gate-2 M1 — global newest)**: a `document` `keydown` for `F6` that **`preventDefault`s**
  and moves focus into the **single most-recently-added VISIBLE toast across BOTH regions** (compare by the
  monotonic id/insertion order — NOT a per-region newest; an info + a danger on screen resolve to whichever was
  added last). The provider tracks ONE ref to that node (§3.3/F3). A **global reveal shortcut** — correctly
  `document`-scoped, unlike Esc which is item-local (§3.3/§6, B2). [FACT: toast.md:47]
- Each visible record → a `<ToastItem key={record.id} record={record} />`.
- **[F3 — preflight fold + gate-2 M1] F6 target resolution**: the provider keeps ONE ref to the **globally newest
  visible toast node** (the max-id record across both regions — NOT per-region); F6 → `getFocusable(node)[0]?.focus()`,
  else `node.focus()` (the toast container carries `tabIndex={-1}` as the fallback). Reuse Dialog's
  `getFocusable`/`FOCUSABLE`. [FACT: dialog.tsx:52-57]
- **[F5 — preflight fold] Harness**: each **story/test mounts its OWN `ToastProvider`** + a trigger `<Button>`
  that calls `toast()` (isolation — respects the F1 single-provider invariant per canvas); `toast-styles.ts`
  injects its `<style>` once on module import (the internal-styles precedent, CLAUDE.md:94-105).
- **[F6 — preflight fold] Atomic announcement**: the region is `aria-atomic="false"` — when a toast mounts, the
  **inserted toast subtree** (title + description) IS the changed node, so it is announced in full; no per-toast
  `aria-atomic` is needed. [FACT: §XIV live regions]

### 3.3 `ToastItem` (internal to `toast.tsx`) — one toast
- **Layout**: a surface panel (`toast.background`, `toast.text`), `borderRadius:'$lg'` via the **token scale**
  (radius.card — NOT the inert `$radius` sub-theme key, DEF-U8-h) [FACT: CLAUDE.md:123-130], `overflow:'hidden'`
  so the accent clips to the corner, title (+ optional description), an optional **action button**
  (`action.label`/`onPress`), and a **dismiss button** (✕, `aria-label="Dismiss"`). Action + dismiss are **real
  focusable `<button>`s** [FACT: toast.md:47].
- **Left accent** [M4]: an **absolutely-positioned 3px bar** (`position:'absolute'`, `left/top/bottom:0`,
  `width:3`, `backgroundColor` = the intent accent), the FIRST child — NOT `borderLeftWidth:3` on the panel (which
  would mix a 3px left edge with the 1px `$border` elsewhere and fight the rounded corner). The panel's
  `overflow:'hidden'` clips the bar to `$lg`. The 3px width is a fixed inline value — no `toast.accent*` **width**
  token exists (DEF-U10-c), the U9 arrow inline-dimension precedent (CLAUDE.md:85-89). [FACT: toast.md:26]
- **Intent accent** = a **value dimension** (like Menu danger), keyed off `record.intent`:
  info → `$accentInfo` (`{color.brand.primary}`), success → `$accentSuccess` (`{color.signal.success}`), danger
  → `$accentDanger` (`{color.signal.danger}`) — all resolved from `light_/dark_Toast`. [FACT: toast.md:35;
  themes.ts:36-37]
- **[F2 — preflight fold] Action semantics**: pressing the **action button** fires `action.onPress` and does
  **NOT** auto-dismiss the toast — the consumer dismisses via the returned id (or `onDismiss`) if they want (the
  toast is transient and will auto-dismiss on its own timer regardless). Only the **dismiss** button (and Esc /
  timer) removes it. [INTERP: toast.md:17 "one optional action" is silent on dismissal → the non-dismissing norm]
- **Auto-dismiss timer** (§3.4) with **pause on hover AND focus-within** [FACT: toast.md:49].
- **Esc** [B2] → an **`onKeyDown` on the `ToastItem` root** (NOT a `document` listener): when `e.key === 'Escape'`,
  dismiss THIS toast and **`e.stopPropagation()`** — matching the Dialog/Popover panel-`onKeyDown`+stopPropagation
  precedent [FACT: dialog.tsx:229-234; popover.tsx:334-338] so an Esc inside a toast floating over an open
  Dialog/Popover does NOT leak to the overlay behind it. The item inherently "knows it's focused" because the
  keydown only reaches it when the event target is inside it (no separate focus-tracking needed). [FACT: toast.md:47]
- **Enter/exit motion** via the injected `toast-styles.ts` keyed on `data-phase` (§5).

### 3.4 Timer + exit orchestration (net-new — no prior primitive auto-closes on a timer)
- **Timer** (in `ToastItem`, runs ONLY while mounted): if `duration === 0` → sticky, no timer [FACT: toast.md:15].
  Else a **remaining-time** timer armed for `duration ?? 5000` [FACT: toast.md:15 default 5000].
- **⚠ Timer effect deps — the gate-2 B1 fix (critical):** `ToastItem` re-renders on **every** store `emit()` (any
  add/dismiss anywhere → `useSyncExternalStore` → provider re-renders → all items re-render). So the arming effect
  **MUST dep on `[id, duration]` ONLY** (both stable for a given toast) — NOT on `record` (a naive `[record]`
  would re-arm on unrelated sibling emits and a busy screen's toasts would **never** auto-dismiss). Pause/resume
  are **imperative via refs** (`timerRef`, `remainingRef`, `startedAtRef`) mutated **inside the hover/focus event
  handlers** — never by re-running the arming effect. **Pause** = `clearTimeout` + `remainingRef -=
  now − startedAt`; **resume** = `startedAt = now; setTimeout(dismiss, remainingRef)`. Pause on `onMouseEnter` +
  focus-in (`onFocus`, bubbles = focus-within); resume on `onMouseLeave` + focus-out (`onBlur` whose
  `relatedTarget` is outside the toast). [FACT: toast.md:27,49] Timer cleared on unmount [FACT: toast.md:52].
- **Exit orchestration** — `dismissToast(id)` is **IDEMPOTENT (M1)**: if the record is already `exiting` or already
  gone, **early-return** (no second `setTimeout`, no second `onDismiss`). Otherwise: set `phase='exiting'` +
  `emit()` (the item applies the exit motion), schedule the **hard removal** from `records` after `duration.fast`
  (the exit duration) [FACT: toast.md:41]. On hard removal, fire `record.onDismiss?.()` **exactly once** [FACT:
  toast.md:18]. All four removal paths (timer expiry, dismiss button, `toast.dismiss(id)`, Esc) funnel through
  this one idempotent function ⇒ `onDismiss` fires once regardless of path or double-call. Reduced-motion: the
  CSS makes the exit visually instant; the ~150ms DOM linger is harmless (still announced, still removed).
  [INTERP: single removal choke-point; motion is CSS's job]
- **Enter** [M5 — commit to ONE mechanism]: a **pure CSS mount-keyframe** (the Dialog `dialog-styles.ts`
  precedent, CLAUDE.md:102) — the item mounts already at `phase='entering'` and the `[data-phase="entering"]`
  keyframe plays the slide-in; **no rAF phase-flip is needed for enter**. `phase` transitions `entering`→`exiting`
  only on dismiss (there is no explicit `visible` flip — the enter keyframe settles and holds). This avoids the
  two-mechanism ambiguity the critique flagged. Reduced-motion `@media` makes enter instant (§5).

### 3.5 Reuse map
- `assignRef` / `composeHandlers` / the `FOCUSABLE` selector + `getFocusable` — copy-per-file (module-level,
  pure), as Menu/Dialog/Popover each do (no shared util extracted in UI-1). [FACT: menu.tsx:116-132;
  dialog.tsx:52-57]
- `createPortal` to body + `<Theme name="Toast">` re-wrap — the Select/Menu/Popover portal precedent. [FACT:
  CLAUDE.md:24-27,63]
- `useReducedMotion` — not needed at the shell (motion is CSS `@media`), but the store's exit-delay is constant;
  reduced-motion is handled entirely in `toast-styles.ts` `@media`. [FACT: use-reduced-motion.ts; §5]
- **NOT reused**: no positioning/flip engine (Toast is corner-anchored `fixed`, not trigger-anchored — no
  Menu/Popover refine), no focus trap (Dialog), no focus-into (Popover — Toast explicitly does NOT move focus).

## 4. Visual States  [FACT: toast.md:23-33 · components §VIII]
| State | Applies | Visual | Token |
|-------|---------|--------|-------|
| **default** | shown | surface panel, intent left-accent border, title/description, `radius`, stacked at corner | `$background` · `$text` · `$accentInfo\|$accentSuccess\|$accentDanger` · `zIndex.toast` [FACT: toast.md:26] |
| **hover** | pointer over toast | **timer pauses**; slight elevation (overlay opacity) | overlay opacity [FACT: toast.md:27] |
| **focus** | Tab/F6 to action or dismiss | 2px ring on the **focusable control** (not the toast body) | `color.focus.ring` [FACT: toast.md:28] |
| **active** | action/dismiss pressed | press feedback on that control | overlay opacity [FACT: toast.md:29] |
| **error** | `intent="danger"` | danger accent + `role="alert"`/`aria-live="assertive"` | `$accentDanger` [FACT: toast.md:31] |
| **loading** | async in-progress | **consumer-composed** — `toast({ duration:0, description:<Spinner/> })` (sticky + spinner); dismiss via the returned id on resolve | — [INTERP: no `loading` field in `ToastOptions` → the U5/U6/U8/U9 precedent; `aria-busy` unsettable → DEF-U10-b] |
| **empty** | — | **N/A** — a toast is created with content [FACT: toast.md:32] | — |
| **disabled** | — | **N/A** — a toast is not a persistent control [FACT: toast.md:33] | — |

**No `loading`/`aria-busy` prop, no `toast.update`** — the API surface is `toast()`/`toast.dismiss()` only
[FACT: toast.md:20]. Loading is composed (sticky + spinner in `description`, dismissed via id). **DEF-U10-b**
flags the `aria-busy` gap. Consistent with every prior loading deferral. [FACT: CLAUDE.md DEF-U5-f/U6-c/U8-b/U9-c]

## 5. Motion (B12)  [FACT: toast.md:37-42]
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| enter | `duration.moderate` (250ms) | `easing.out` | `opacity` 0→1 + `transform: translateY/X` slide from the stack edge |
| exit | `duration.fast` (150ms) | `easing.in` | `opacity` 1→0 + `transform` slide out |

- Slide direction = from the `placement` edge: `bottom` region → enter from `translateY(+n)`, `top` → from
  `translateY(−n)`. [INTERP: toast.md:40 "slide from edge"]
- Injected `internal/toast-styles.ts` reading `motion.ts`, keyed on `[data-phase]`: **`entering` = a mount
  keyframe** (the Dialog precedent — plays on mount, settles, holds; no rAF phase-flip, M5) · **`exiting` = the
  exit transition** (opacity+transform out over `duration.fast`). Mirrors `dialog-styles.ts`/`popover-styles.ts`.
  Animated properties = `transform`/`opacity` ONLY [FACT: motion.md:40-58].
- **Reduced-motion**: `@media (prefers-reduced-motion: reduce)` → instant appear/disappear; **the message is
  still conveyed via `aria-live`** (B12(a) — communicate state another way). [FACT: toast.md:42; motion.md:60-77]

## 6. Accessibility  [FACT: toast.md:44-49 — the contract quotes engineering §XIV verbatim]
- **Live regions (the core)**: `role="status"`+`aria-live="polite"` for info/success; `role="alert"`+
  `aria-live="assertive"` for danger. Both regions **pre-exist in the DOM** (persistently mounted) so an inserted
  toast is announced. [FACT: toast.md:46; §XIV]
- **Focus is NEVER moved to the toast on appear** — it would interrupt the user's task. [FACT: toast.md:44,48]
- **Keyboard reach**: `F6` (a `document` keydown that `preventDefault`s) moves focus into the toast region (APG);
  action + dismiss are real `<button>`s; **Esc dismisses the focused toast** via an **item-local `onKeyDown` +
  `stopPropagation`** (NOT a document listener — so it can't leak to an overlay behind the toast; the
  Dialog/Popover precedent, B2). [FACT: toast.md:47; dialog.tsx:229-234; popover.tsx:334-338]
- **Auto-dismiss pauses on hover AND keyboard focus** within the toast [FACT: toast.md:49] — so a keyboard user
  reaching a toast is not raced by the timer.
- Dismiss button has an accessible name (`aria-label="Dismiss"`); the action button's name is `action.label`.
  [INTERP: §XIV names]

## 7. Performance  [FACT: toast.md:51-52]
- Portal region; **max `limit` visible per region** (default 3), overflow evicts the oldest (store-enforced);
  `log()` the cap at provider mount.
- **One transform per toast** (no per-frame work — no anchor to follow); **all timers cleared on unmount**
  (the timer effect's cleanup + the store's exit-removal both clear). [FACT: toast.md:52]

## 8. Business Rules (the invariants the critique attacks)
- **BR-1** `toast(options) → id` and `toast.dismiss(id)` are the ONLY imperative surface; both are callable from
  outside React via the module-level external store. [FACT: toast.md:20]
- **BR-2** The store snapshot ref is stable between changes (reassigned only in `emit`) — `useSyncExternalStore`
  requires it or it infinite-loops. [FACT: React contract]
- **BR-3** Two live regions, **both persistently mounted even when empty**: `status`/`polite` (info·success),
  `alert`/`assertive` (danger). A toast renders into the region for its intent. [FACT: toast.md:46; §XIV]
- **BR-4** **Focus is never moved to a toast on appear.** F6 opts in; Esc dismisses the focused toast. [FACT:
  toast.md:44,47,48]
- **BR-5** Auto-dismiss default 5000ms; `duration:0` = sticky (no timer); the timer is **owned by `ToastItem`**;
  its arming effect deps on **`[id, duration]` only** so a sibling store-emit re-render does NOT reset it (gate-2
  B1); pause/resume are imperative via refs in the hover/focus handlers; it **pauses on hover AND focus-within**,
  resumes on leave/blur-out; cleared on unmount. [FACT: toast.md:15,49,52]
- **BR-6** Cap = `limit` (default 3) **per region**, **enforced in the store on `add`** by evicting the region's
  oldest non-exiting record (NOT a render slice — so the evicted toast plays its exit; gate-2 M2). Per-region ⇒
  danger never starved (M2); evict-oldest ⇒ newest-visible (M3). Invariant: non-exiting per region ≤ `limit`;
  the provider renders every record. `log()` the cap at provider mount. [FACT: toast.md:52]
- **BR-7** Intent accent is a VALUE dimension (info→`$accentInfo`, success→`$accentSuccess`, danger→
  `$accentDanger`); danger additionally ⇒ `alert`/`assertive`. [FACT: toast.md:31,35]
- **BR-8** `borderRadius:'$lg'` via the token scale (the `$radius` sub-theme key is inert for dimensions,
  DEF-U8-h). `zIndex.toast` (1400 — top of the stack). [FACT: CLAUDE.md:123-130; tokens.ts:9]
- **BR-9** Motion: enter `moderate`/`out`, exit `fast`/`in`, `opacity`+`transform` only; reduced-motion instant
  but **still announced via `aria-live`**. [FACT: toast.md:37-42; motion.md]
- **BR-10** No `loading`/`aria-busy` prop, no `toast.update` — loading is composed (sticky + spinner in
  `description`). [FACT: toast.md:20 API]
- **BR-11** `dismissToast` is **IDEMPOTENT** (early-returns if the record is already `exiting`/gone) — so
  `onDismiss` fires **exactly once** across all four removal paths (timer expiry, dismiss button, `toast.dismiss(id)`,
  Esc) even under a double-call (M1). [FACT: toast.md:18]
- **BR-12** Exactly **one `ToastProvider`** app-wide (module-singleton store); a 2nd instance dev-warns (F1).
- **BR-13** Pressing `action` fires `action.onPress` and does **NOT** dismiss the toast; only dismiss/Esc/timer
  remove it (F2). [INTERP: toast.md:17]

## 9. Acceptance Criteria  [FACT: toast.md:54-58 + the state/a11y rows]
- [ ] `toast(opts)→id` + `toast.dismiss(id)` work from a non-component module (jsdom: call `toast()` outside a
      component, assert the provider renders it).
- [ ] `status`/`polite` (info·success) vs `alert`/`assertive` (danger); both regions present when empty; **focus
      not moved** on appear. [FACT: toast.md:55]
- [ ] Auto-dismiss default 5s; **pauses on hover AND focus**; `duration:0` = sticky; action + dismiss focusable;
      **Esc dismisses the focused toast** (item-local, `stopPropagation`); F6 enters the region. [FACT: toast.md:56,47,49]
- [ ] **Sibling emit does not reset a live timer** (gate-2 B1): fake timers — add toast A, advance 3s, add toast B,
      advance 2s → A auto-dismisses at its original 5s (B did not re-arm A's timer). [B1]
- [ ] **Cap evicts oldest, store-enforced** (M2): with `limit=3`, adding a 4th toast to a region evicts that
      region's oldest (its `onDismiss` fires); the evicted toast plays its exit (not hard-cut). [gate-2 M2]
- [ ] **Per-region cap** (M2): 3 info toasts + 1 danger → the danger renders in the assertive region (not starved,
      not evicted by the info budget); newest-visible within each region (M3).
- [ ] **F6 targets the globally newest visible toast** across both regions (gate-2 M1): info then danger → F6
      focuses into the danger (last added).
- [ ] **`dismissToast` idempotent** (M1): `toast.dismiss(id)` called twice → `onDismiss` fires once.
- [ ] **Action does not dismiss** (F2): pressing `action` fires `onPress`, toast stays; only dismiss/Esc/timer remove it.
- [ ] **Single-provider dev-warn** (F1): a 2nd `ToastProvider` mount emits a dev-warn (jsdom: spy `console.warn`).
- [ ] Applicable states rendered; empty/disabled justified N/A; loading composed; reduced-motion still announces
      via `aria-live`. [FACT: toast.md:57]
- [ ] `zIndex.toast` (top); `toast.*` tokens (`$background`/`$text`/`$accent*`) resolve under `<Theme name="Toast">`
      across the portal, both themes. [FACT: toast.md:58]
- [ ] Visible cap = `limit` (default 3) per region, overflow evicts oldest, cap `log()`'d; `onDismiss` fires once on removal.
- [ ] `toast` singleton, `ToastProvider`, `ToastOptions`, `ToastIntent`, `ToastHandle`, `ToastProviderProps`
      exported; strict TS (zero `any`/`!` unjustified).
- [ ] Stories cover the applicable states × light｜dark (incl. the two live-region intents + sticky/loading + an
      action). jsdom tests (**`vi.useFakeTimers()` for ALL timer assertions** — M7): imperative add/dismiss,
      intent→region routing, timer pause on hover/focus, duration:0 sticky, sibling-emit-no-reset, Esc-dismiss +
      stopPropagation, focus-not-moved, per-region cap, onDismiss-once-under-double-dismiss.
      **jsdom limits**: motion (enter/exit slide), real geometry, `matchMedia` reduced-motion, and true SR
      announcement are **Visual-Gate/Brave** claims (the U6–U9 precedent); jsdom covers logic + roles + focus.
- [ ] Visual Gate PASS measured in real Brave (both themes): enter/exit slide, stacking, pause-on-hover, accent
      per intent, corner placement, reduced-motion instant.

## 10. Files
- `packages/ui/src/internal/toast-store.ts` (new — the external store + `toast` singleton)
- `packages/ui/src/components/toast.tsx` (new — `ToastProvider` + internal `ToastItem`; re-exports `toast`)
- `packages/ui/src/components/toast.stories.tsx` (new — the Visual-Gate surface; stories trigger `toast()` via a button)
- `packages/ui/src/components/toast.test.tsx` (new — jsdom)
- `packages/ui/src/internal/toast-styles.ts` (new — injected enter/exit motion reading `motion.ts`; reduced-motion `@media`)
- `packages/ui/src/index.ts` (barrel: `toast`, `ToastProvider`, `ToastIntent`, `ToastOptions`, `ToastHandle`, `ToastProviderProps`)
- `tamagui.config.ts` — **register `light_/dark_Toast`** in the `createTamagui` `themes` map (+ import). Emission
  in `themes.ts` (DS-5) is necessary but NOT sufficient — the `ThemeName` type + `<Theme name="Toast">` runtime
  scope resolve from the config's `themes`. The per-primitive registration every prior U did. [FACT: the U9
  correction, u9-popover.md:223-226]
- `packages/ui/src/CLAUDE.md` — §XXIX currency refresh (Toast paragraph + the store/live-region rules + test count)

## 11. Deferrals / DEFs to flag for DS
- **DEF-U10-a** the contract under-specifies the **region-mount component**; UI-1 adds `ToastProvider`
  (`limit`/`placement`) as a necessary structural piece. Naming + props are a disclosed addition.
- **DEF-U10-b** the loading state names `aria-busy` but the API has no `loading` prop / no `toast.update` →
  loading is consumer-composed (sticky + spinner); `aria-busy` unsettable. Flag for DS (a `toast.loading()`/
  `toast.update()` surface would resolve it).
- **DEF-U10-c** no `toast.*` accent-border **width/placement** token — the left-accent is a fixed 3px inline;
  reuses `toast.accent*` for color only.
- **DEF-U10-d** region `placement` (`top`/`bottom`) is a provider prop, not per-toast; no per-toast position
  (the contract's `ToastOptions` has none). Disclosed.
- **DEF-U10-e** `limit`/cap policy (per-region, store-enforced, evict-oldest, default 3) is an implementation
  choice — the contract says "max N visible (older ones collapse/queue)" without pinning N or the eviction order.
  See OQ-2.
- **DEF-U10-f** the contract's `onDismiss: () => void` is **param-less**, so it cannot distinguish a *user
  dismiss* from a *cap eviction* from a *timeout* — all three fire it identically. A `reason` arg would resolve
  it. Shipped verbatim; flagged for the DS. [gate-2 B2]

## 12. Resolved by the docs / disclosed assumptions (NOT forks to escalate)
- **OQ-1 [RESOLVED — architecture]** The imperative→React bridge = a module-level **external store** +
  `useSyncExternalStore` (zero-dep; `@vida/ui` has no zustand). This is forced by the imperative signature +
  the theme-context constraint (the region must render under `UIProvider`). Not a fork — the standard pattern.
- **OQ-2 [RESOLVED — gate-1 + gate-2 critique]** Cap = **per-region, store-enforced, evict-oldest**, default
  `limit=3` (gate-1: FIFO/shared was wrong — M2/M3; gate-2: a render-slice contradicts the exit animation, so the
  cap is enforced in the **store on `add`** by evicting the oldest non-exiting record, and the provider renders
  every record). The contract [toast.md:52] pins neither N nor order → `3`/per-region/evict-oldest is the reasoned
  choice (DEF-U10-e); eviction fires `onDismiss` (DEF-U10-f). §3.1/§3.2.
- **OQ-3 [DISCLOSED assumption]** `ToastProvider` name + single-mount model (like `UIProvider`). The contract
  names no mount component (DEF-U10-a); the `Toaster` name (react-hot-toast/sonner) is the alternative — chose
  `ToastProvider` for repo-idiom consistency.

## 13. Build Result (2026-08-09 — IMPLEMENTED, Visual Gate PASS)
Shipped exactly per §1–§12. Files: `internal/toast-store.ts` (external store + `toast` singleton + test-only
`resetToastStore`), `components/toast.tsx` (`ToastProvider` + internal `ToastItem`), `internal/toast-styles.ts`,
`toast.stories.tsx`, `toast.test.tsx` (**16 jsdom**, `vi.useFakeTimers` for the timer paths), barrel, `light_/dark_Toast`
registered in `tamagui.config.ts`.

**§XXVI double-gate:** Gate-1 independent critique REVISE (2 blockers [B1 queued-timer, B2 Esc/F6 document-leak] + 7
material + 4 minor) → fixed → Approval 1. `/preflight` PASSED + 6 folds (F1 single-provider, F2 action-no-dismiss, F3
F6 target, F4 geometry, F5 harness, F6 atomic). Gate-2 critique REVISE (confirmed all gate-1/preflight fixes landed;
caught 2 NEW gaps the edits opened: **B1 timer effect deps** under store-emit re-render, **M2 `.slice(-limit)` vs
exit-animation contradiction**) → resolved by moving the cap to the **store (evict-oldest)**, which also dissolved the
"queued" state → Approval 2.

**Verification:** typecheck 2/2 · @vida/ui **219/219** (+16) · build + build-storybook ✓ · root 10/10.
**Visual Gate measured in real Brave** (Playwright; both themes): radius **12px** (DEF-U8-h avoided), theme crosses the
portal (light `#fff` / dark `rgb(15,23,42)`; title `$text` + muted desc shift), accents distinct+correct (info
`rgb(99,102,241)` · success `rgb(16,185,129)` · danger `rgb(239,68,68)`, dark shifts too), zIndex **1400**, regions
status/polite + alert/assertive, enter `vida-toast-in` / reduced-motion `none`, **B12 clean** (stylesheet touches only
opacity/transform), placement top/bottom 16px, viewport `pointer-events:none`, dismiss = real focusable `<button>`.
DEFs flagged for DS: U10-a…f.
