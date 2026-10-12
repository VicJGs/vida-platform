# PLAN — S8 · Templates picker/save

> fe-notes-and-pages (② unit #27) · slice S8 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ → Approval-2 → blocking Visual Gate). Grounded in
> `delivery/{slice-map,seam-contract,envision,interpretation}.md` + the aspect `notes-and-pages.md` (NOT-51/G7) +
> the ADR-009 templates substrate (`foundation/templates/` — shipped CRUD + unbuilt first-consumer-pull seams).

## 1. What S8 is (scope line)
The **templates picker/save UI** on the note page: a picker that (a) **lists** saved templates, (b) offers **Apply**
per template (instantiate a new page — the live-block fork), and (c) offers **Save current as template** (capture the
current page's live-block layout) — NOT-51 / EC-13. A CONSUMER slice over the ADR-009 templates substrate; honest-degraded
where the substrate's execution seams are unbuilt. Mirrors **S4** (picker UI + compose over injected deferred fns + a
`?…` DEV mount).

**The tier split (NOT-51, doc-mandated).** `[FACT: parts/notes-and-pages.md:65]` SPLIT: *service* = template **storage +
apply (instantiate)** → ①/`@vida/core`; *UI* = the **template picker/save** → ②/fe-notes (P6). So:
- **List** — `TemplatesService.listTemplates()` IS built (XS-templates #36) → consumable (stubbed in M1 for the same
  reason as every slice: no live apps/web composition root — S1-D2).
- **Apply (instantiate-fork)** — a `@vida/core` **first-consumer-pull seam, UNBUILT** (`foundation/templates/CLAUDE.md`:
  "`instantiate`-fork execution … XCU-05/11 … pulled by the first *module*"). ①/service-tier work, outside fe-notes' ②
  boundary → the Apply affordance is present, the action is a **deferred injected seam** (stubbed, honest). (F-S8-1)
- **Save current as template (capture)** — a `@vida/core` **first-consumer-pull seam, UNBUILT** (`captureFromSpace` +
  authored-vs-accumulated invariant, XCU-02/03/04/07). Service-tier → the Save affordance is present, the capture is a
  **deferred injected seam** (stubbed, honest). (F-S8-1)

**In scope (S8 — apps/web/src/notes/):**
- `use-templates(pageId)` — the DATA seam: `listTemplates` (stub + `?sample`), `apply(templateId)` + `saveCurrent()`
  (deferred instantiate/capture seams — stubbed no-op in M1). 4-state `loading|error|empty|populated`.
- `template-picker.tsx` — `TemplatePickerView` (state-as-prop, the PickerView/AttachmentsView split) + `TemplatePicker`
  hook shell. A named panel: a `role="list"` of templates (icon + name + **Apply** button) + a **Save current as
  template** action; the 4-state ladder.
- `note-entity.tsx` (edit) — a `?templates` DEV mount (mirrors `?picker`) rendering `<TemplatePicker pageId={page.id}/>`
  standalone for the blocking Visual Gate.

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII):**
- The **instantiate-fork EXECUTION** (`@vida/core` XCU-05/11) + **capture serializer** (`@vida/core` XCU-02/03/04/07) →
  first-consumer-pull service seams; building them is ①/`@vida/core` work, not fe-notes ②. Filed **F-S8-1**. (D-S8-2/3)
- Live `listTemplates` wiring (an apps/web composition root) → data plane (S1-D2) — stubbed.
- The **real invocation point** — a "New from template" / "Save as template" menu item in the note-page action menu
  (`EntityView.action` is not forwarded by the adapter — S6 ledger) or the collection `+` (onNewView stub) → deferred
  with the menu/composition wiring. M1 demonstrates the UI via `?templates` (the S4 `?picker` precedent). (D-S8-4)
- The **TemplateBundle serialization** / live-block re-aggregation (ADR-009 build-time per-member) → service-tier; the
  picker shows `name` only (`bundle` is opaque). (D-S8-5)
- `[E]` decryption of `name`/`bundle` → M3 pass-through; sample provides plaintext (D-S8-6).

## 2. Composition shape
```
note-entity.tsx (?templates DEV mount — mirrors ?picker)
└─ <TemplatePicker pageId={page.id} />            apps/web/src/notes/template-picker.tsx    [NET-NEW]
     ├─ use-templates(pageId)                      apps/web/src/notes/use-templates.ts       [NET-NEW]
     │     → { templates: TemplateItem[], state, apply, saveCurrent }
     │        listTemplates stub + ?sample; apply/saveCurrent = deferred injected seams (stubbed)
     └─ TemplatePickerView({ templates, state, onApply, onSaveCurrent })   (state-as-prop; the PickerView precedent)
          ├─ role="group" aria-label "Templates"
          ├─ loading → Muted busy · error → Muted role=status · empty → Muted + Save-current action
          └─ populated → role="list": per template [LayoutTemplate icon + name + Apply button] + Save-current action
```
`TemplatePickerView` is body-only (panel supplies the name). Reuses `note-chrome` atoms (`Icon`/`Row`), the local
`Muted` idiom, `@vida/ui` (none new), Lucide (EC-22). **No new `@vida/ui` primitive.**

## 3. Net-new units (files)
| File | Purpose | Notes |
|------|---------|-------|
| `apps/web/src/notes/use-templates.ts` | DATA seam — `{templates, state, apply, saveCurrent}` + `TemplateLike`/`TemplateItem`/`toTemplateItems` | `listTemplates` stub + `?sample`; structural `*Like` (TemplateRow not re-exported — the PageLike precedent); apply/saveCurrent deferred no-op |
| `apps/web/src/notes/template-picker.tsx` | `TemplatePickerView` (state-as-prop) + `TemplatePicker` (hook shell) | `role=list` rows + per-row Apply + Save-current action; 4-state |
| `apps/web/src/notes/note-entity.tsx` (edit) | `?templates` DEV mount (mirror `?picker`) | both overlays coexist cleanly |
| `apps/web/src/notes/template-picker.test.tsx` | view + hook tests | 4 states; Apply fires onApply(id); Save fires onSaveCurrent; a11y; EC-22 svg |

Reuses shipped: `@vida/core` `createTemplatesService`/`listTemplates` (the live target; stubbed in M1) · `note-chrome` ·
Lucide · Tamagui. **No separate pure `.ts`** — `toTemplateItems` is a 1-field projection (exported from the hook file for
a direct test), not worth a module (the S7 "don't manufacture a near-empty pure file" precedent; contrast `attachments.ts`
which also carried `formatBytes`).

## 4. Decisions — all DOC-RESOLVED / grounded
- **D-S8-1 — the templates LIST consumes `listTemplates`; structural `TemplateLike`.** `TemplatesService.listTemplates():
  Promise<TemplateRow[]>` is built `[FACT: foundation/templates/service.ts:44-46]`; `TemplateRow` is NOT re-exported from
  `@vida/core` (only `TemplatesService`/`createTemplatesService`/`TemplateNotFound`/`TemplateCaptureError` — `index.ts:133-139`),
  so `TemplateItem = {id, name}` is a structural projection over a `TemplateLike = {id, name}` (the `PageLike`/`NoteAttachmentLike`
  precedent). M1 stub (honest-empty + `?sample`); live swap = RQ over `listTemplates`, key `['templates']`, zero-sig.
- **D-S8-2 — Apply (instantiate-fork) is a DEFERRED `@vida/core` first-consumer-pull seam.** `foundation/templates/CLAUDE.md`
  lists `instantiate`-fork execution (XCU-05/11) as NOT built — a service-tier seam pulled by the first module. NOT-51 homes
  *apply* to the **service** `[FACT: parts/notes-and-pages.md:65 SPLIT]`, i.e. ①/`@vida/core`, outside fe-notes' ② boundary
  (slice-map §0). So the Apply affordance is present (EC-13) and calls an injected `apply(templateId)` that is **stubbed no-op**
  in M1 (the S4 `pick`/`create`, S6 `add`/`remove`, S7 search precedent) — never a dead affordance, never a crash. Filed **F-S8-1**.
- **D-S8-3 — Save current as template (capture) is a DEFERRED `@vida/core` first-consumer-pull seam.** `captureFromSpace`
  + the authored-vs-accumulated invariant (XCU-02/03/04/07) are NOT built (service-tier). `createTemplate(input)` CRUD exists,
  but capturing the current page's live-block layout into a `TemplateBundle` is the unbuilt serializer. The Save affordance is
  present (EC-13), the capture is a **stubbed injected seam** in M1. Filed **F-S8-1**.
- **D-S8-4 — mount via a `?templates` DEV gate (the `?picker` precedent); this is the HONEST choice, not an under-delivery
  (B1).** The real invocation (a note-page action-menu / collection `+` "New/Save template" item) is deferred with the
  menu/composition wiring (`EntityView.action` unforwarded by the adapter — S6 ledger; `onNewView` stub). M1 demonstrates the
  self-contained picker via `?templates` + `?sample`, exactly as S4 demonstrated the `[[` picker via `?picker`
  `[FACT: note-entity.tsx:28-36,124-136]`. **Why a DEV gate and NOT a visible production control (the contrast with S6):**
  S6's metadata controls are visible-but-stubbed because they **REFLECT state** (a favorited page shows the active star —
  not dead even with a no-op `updatePage`). S8's Apply/Save are **pure actions with no display-state** → a *visible*
  production button whose action no-ops would be a **dead affordance** (violates the "no dead affordance / honest" principle,
  the posture every slice holds). So gating the picker behind `?templates` until F-S8-1's execution seam lands is *more*
  honest than shipping a dead button; the affordance becomes reachable (a real menu item) when the seam + composition root arrive.
- **D-S8-5 — the picker shows `name` only; `bundle` is opaque.** `bundle` is an opaque serialized seed (ADR-009; one TEXT
  column) `[FACT: schema/foundation/templates.ts]`; the live-block re-aggregation + per-member serialization are build-time
  service concerns (ADR-009:112-115). The picker renders the template `name`; it never parses the bundle.
- **D-S8-6 — `[E]` fields are M1 pass-through.** `name`/`bundle` are `[E]` (M3 target); M1 = pass-through (empty active set);
  sample provides plaintext; degrade-never-crash on absent.
- **D-S8-7 — state ladder** (§VIII): `loading|error|empty|populated`; `empty` still offers Save-current (you can save a
  template before any exist); Apply/Save are fire-and-forget-stubbed (live: invalidate `['templates']` / navigate to the
  forked page). RQ key `['templates']` (prefix-safe).

## 5. Envision coverage — S8's EC Visual-Gate MUSTs
| EC | Requirement | S8 assertion |
|----|-------------|--------------|
| **EC-13** | **template picker + apply + save-current-as-template** (live-block layouts) | Visual Gate: the picker lists ≥2 templates (`?sample`); each row has an **Apply** affordance; a **Save current as template** affordance is present |
| **EC-22** | Lucide icons token-tinted | the template rows + Save action carry Lucide svg |
| EC-16/17 (feel) | editorial calm | live per-slice Visual Gate (full-matrix AA) |

## 6. Test plan
- `template-picker.test.tsx` (view): `loading`→aria-busy; `error`→role=status; `empty`→muted + Save action present;
  `populated`→a `role="list"` of templates (name + per-row Apply), Apply fires `onApply(id)`, Save fires `onSaveCurrent`;
  a11y (`role="group"` named · list/listitem · buttons keyboard-operable); EC-22 svg.
- `template-picker.test.tsx` (hook, `TemplatePicker`/`use-templates`): default empty; `?sample` → ≥2 `TemplateItem`s;
  `apply`/`saveCurrent` resolve (stubbed no-op) without throwing; `toTemplateItems` maps rows → `{id, name}` (drops bundle).
- Full `@vida/web` suite green.

## 7. Blocking Visual Gate (real browser, after g2)
Brave real app → onboarding → `/notes/1?sample&templates` (the `?picker` precedent URL shape). 3 presets × light/dark ×
375/768/1440:
- **EC-13:** the picker renders a list of ≥2 templates; each has an Apply affordance; a "Save current as template"
  affordance is present.
- **EC-22:** Lucide svg in the rows + Save action.
- Full-matrix **AA** on the template names + actions incl. warm-dark; `axe` 0; 0 overflow; MEASURED_OK + composite
  opacity; exclude WCAG-disabled controls (`/tmp/vg/s8-gate.mjs`, the S3–S7 harness).

## 8. Risks / findings
- **F-S8-1 — `@vida/core` template EXECUTION seams (NEW, filed S8):** the **instantiate-fork** (apply; XCU-05/11) and
  **capture serializer** (save-current; XCU-02/03/04/07) are `@vida/core`/①-tier **first-consumer-pull seams** (NOT built —
  `foundation/templates/CLAUDE.md`). S8 ships the fe-notes-owned picker/save UI + the affordances over **injected deferred
  fns**; when a module first pulls the seams (ADR-019 §3.5), fe-notes' `apply`/`saveCurrent` bind to them (zero-sig). This is
  a CROSS-TIER defer (service, not ui-3) — distinct from F-S4-1/F-S5-1 (ui-3 `@vida/editor`). Lands as a separate `@vida/core` change.
- **R1 — don't build the instantiate/capture logic in fe-notes.** The temptation is to serialize a bundle / fork a page in
  the UI; that is service-tier (ADR-009, NOT-51 SPLIT) and would violate the fe-notes ② boundary. Keep apply/save as injected
  deferred seams. Flag if the affordance pressures logic into the UI.
- **R2 — one picker, three affordances.** EC-13 is list + apply + save-current together; keep it ONE coherent panel (the
  greybox `light-templates`), not split across homes.

## 9. Performance budget (§XXII)
`toTemplateItems` is O(n) over a small list; apply/saveCurrent are stubbed no-ops. N/A-trivial for the stub; stated per §XXII.
