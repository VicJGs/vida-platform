# IMPLEMENTATION-PLAN — S8 · Templates picker/save

> fe-notes-and-pages (② unit #27) · slice S8 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3; divergence → §XXVIII. Every contract line
> FACT-grounded. Pairs with `PLAN-s8-templates.md`.

## 1. Grounding ledger

| Claim                                                                                                                                                                | Source                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `TemplatesService.listTemplates(): Promise<TemplateRow[]>` built (soft-delete filtered)                                                                              | foundation/templates/service.ts:44-46                      |
| `TemplateRow = { ...baseColumns(id,…), name, bundle, deleted_at }` — `id`/`name` are the display fields                                                              | schema/foundation/templates.ts:17-26                       |
| `TemplateRow` is NOT re-exported from `@vida/core` (only `TemplatesService`/`createTemplatesService`/`TemplateNotFound`/`TemplateCaptureError`) → structural `*Like` | packages/core/src/index.ts:133-139                         |
| apply (instantiate-fork, XCU-05/11) + capture (`captureFromSpace`, XCU-02/03/04/07) are UNBUILT first-consumer-pull seams (service-tier)                             | foundation/templates/CLAUDE.md "FIRST-CONSUMER-PULL SEAMS" |
| NOT-51 SPLIT: service = storage + apply; UI = picker/save (P6)                                                                                                       | parts/notes-and-pages.md:65                                |
| `?picker` DEV-mount precedent (NODE_ENV-guarded, `URLSearchParams.has`) + the overlay mount shape                                                                    | note-entity.tsx:28-36,124-136                              |
| view/hook split + `?sample` stub + local `Muted` + `AddButton`/`PressIcon` (role=button, Enter/Space, focus ring)                                                    | attachments-list.tsx:20-84; use-attachments.ts:28-45       |
| M1 no live composition root → honest-empty + `?sample`; `[E]` pass-through                                                                                           | use-attachments.ts:28-34; NOT-38                           |

## 2. Contracts (exact signatures)

### 2a. `apps/web/src/notes/use-templates.ts` (NET-NEW — data seam; includes the trivial projection, no separate pure file)

```ts
export interface TemplateLike {
  id: string
  name: string
} // structural over TemplateRow (not re-exported)
export interface TemplateItem {
  id: string
  name: string
}
export function toTemplateItems(rows: readonly TemplateLike[]): TemplateItem[] // 1:1 {id,name} (drops bundle)

export type TemplatesState = 'loading' | 'error' | 'empty' | 'populated'
export interface TemplatesResult {
  templates: readonly TemplateItem[]
  state: TemplatesState
  apply: (templateId: string) => Promise<void> // deferred instantiate-fork seam (F-S8-1) — no-op in M1
  saveCurrent: () => Promise<void> // deferred capture seam (F-S8-1) — no-op in M1
}
export function useTemplates(pageId: string): TemplatesResult
```

M1 default `{templates: [], state: 'empty'}`; `?sample` (the `devSampleActive` guard) → ≥2 `TemplateItem`s
(e.g. "Daily journal", "Meeting notes"). `pageId` `_`-prefixed in the stub (live: `saveCurrent` captures page `pageId`;
`apply` INSTANTIATES a NEW fork → does NOT use `pageId`, N1). `apply`/`saveCurrent` no-op M1 (`_templateId`-prefixed).
Live swap: RQ over `createTemplatesService(...).listTemplates()`, key `['templates']`; `apply`→the instantiate seam +
navigate to the fork; `saveCurrent`→capture→`createTemplate` + invalidate `['templates']`.

### 2b. `apps/web/src/notes/template-picker.tsx` (NET-NEW — presentational split + hook shell)

```ts
export function TemplatePickerView(props: {
  templates: readonly TemplateItem[]
  state: TemplatesState
  onApply: (id: string) => void
  onSaveCurrent: () => void
}): JSX.Element
export function TemplatePicker({ pageId }: { pageId: string }): JSX.Element // useTemplates shell
```

`TemplatePicker` = `const t = useTemplates(pageId); return <TemplatePickerView templates={t.templates} state={t.state}
onApply={t.apply} onSaveCurrent={t.saveCurrent} />`.

`TemplatePickerView` body — a `role="group" aria-label="Templates"` panel (bordered surface, the PickerView frame):

- `loading` → `<Muted busy>Loading…</Muted>`
- `error` → `<Muted role="status">Couldn’t load templates.</Muted>`
- `empty` → `<View gap><Muted>No templates yet.</Muted><SaveCurrentButton/></View>`
- `populated` → `<View gap><View role="list">{rows}</View><SaveCurrentButton/></View>`
  - row = `<Row role="listitem">` : `<Icon icon={LayoutTemplate}/>` + `<Text flex={1} $body>{name}</Text>` +
    `<ApplyButton onApply={() => onApply(t.id)}/>` (a `role="button"` labeled "Apply", `aria-label={`Apply ${name}`}`,
    Enter/Space, focus ring — the attachments `PressIcon`/`AddButton` idiom).
  - `SaveCurrentButton` = a `role="button"` "Save current as template" (`FilePlus` Lucide icon, keyboard-operable).

Local `Muted` (the attachments-list idiom). Direct semantic tokens; `note-chrome` `Icon`/`Row` (EC-22). No new primitive.

### 2c. `apps/web/src/notes/note-entity.tsx` (edit — add the `?templates` DEV mount alongside `?picker`)

Add `devTemplatesActive()` (mirror `devPickerActive`, keys on `?templates`). Restructure the tail so both overlays coexist:

```tsx
const view = <EntityView {...props} />
const showPicker = devPickerActive()
const showTemplates = devTemplatesActive()
if (!showPicker && !showTemplates) return view
return (
  <>
    {view}
    {showPicker && (<View position="absolute" top={88} right={24} zIndex={1000} gap="$12"><WikiLinkPicker …/><PreviewCard …/></View>)}
    {showTemplates && (<View position="absolute" top={88} left={24} zIndex={1000}><TemplatePicker pageId={page.id} /></View>)}
  </>
)
```

(The gate URL `?sample&templates` shows only the templates overlay; `left:24` avoids the `?picker` top-right slot.)

## 3. Build steps (strict order; TDD per unit)

- [ ] **B1** — `use-templates.ts` (§2a) + `template-picker.test.tsx` HOOK cases: default empty; `?sample`→≥2 items;
      `toTemplateItems` maps `{id,name}` (drops bundle); `apply('x')`/`saveCurrent()` resolve without throwing (stubbed).
- [ ] **B2** — `template-picker.tsx` (§2b) + `template-picker.test.tsx` VIEW cases: 4 states; `populated`→`role=list`
      of named rows each with an Apply button that fires `onApply(id)`; Save action fires `onSaveCurrent`; `empty` still shows
      Save; a11y (`role="group"` named · list/listitem · buttons keyboard-operable via Enter/Space); EC-22 Lucide svg.
- [ ] **B3** — edit `note-entity.tsx` (§2c): `devTemplatesActive()` + the dual-overlay tail.
- [ ] **B4** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green.
- [ ] **B5** — blocking **Visual Gate** (PLAN §7): Brave real app → onboarding → `/notes/1?sample&templates`; 3 presets ×
      L/D × {375,768,1440}; EC-13 (picker lists ≥2 templates; per-row Apply; Save-current present), EC-22, AA full-matrix incl.
      warm-dark, axe 0, no overflow, MEASURED_OK + composite opacity, exclude WCAG-disabled controls. Harness `/tmp/vg/s8-gate.mjs`.

## 4. Acceptance (DoD — §XXII)

- [ ] the templates picker renders a list of saved templates (names), each with an **Apply** affordance — EC-13.
- [ ] a **Save current as template** affordance is present (incl. in the `empty` state) — EC-13.
- [ ] `apply`/`saveCurrent` call injected **deferred** seams (stubbed no-op in M1) — never a crash, never a dead affordance
      (gated behind `?templates` per D-S8-4); the instantiate-fork + capture EXECUTION is homed to F-S8-1 (`@vida/core`).
- [ ] 4 states (§VIII); `TemplatePickerView` unit-tested as props; the picker shows `name` only (`bundle` opaque, D-S8-5).
- [ ] TS strict (0 any/non-null/suppression); structural `TemplateLike`; `[E]` degrade-never-crash.
- [ ] tsc 0 · eslint 0 · full suite green · Visual Gate PASS.
- [ ] §XXIX currency: task slice-log + build-step + TASKS.md + **F-S8-1 filed in the parking lot**.

## 5. Out of scope (no pull-forward — §XXVIII)

The instantiate-fork EXECUTION (`@vida/core` XCU-05/11) + capture serializer (`@vida/core` XCU-02/03/04/07) · live
`listTemplates` wiring (composition root) · the real menu invocation (note-page action-menu / collection `+`) · bundle
serialization / live-block re-aggregation (service-tier) · `[E]` decryption · an icon/preview per template beyond name+icon.
