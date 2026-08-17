---
Session 3 — 2026-08-16
Goal: UI-4 · S2 (nav chrome) — render MODULE_MAP/GLOBAL_SURFACES into the S1 shell frame (module dock + global bar + Spaces seam) on UI-1 primitives
Profile: New Feature (scenario Default, document-first)
---

## Accomplished
- **Step 0–2 (baseline · integration-check · security):** baseline current (S1 shipped the exact frame S2 fills);
  5 integration risks resolved from docs (TanStack Router type-safety → one `ShellRoute` widening; mobile drawer =
  focus-managed overlay composed in-app; ⌘K trigger→`commandBar.open()` seam; active-route via `useRouterState`;
  M1.0 auth-OFF fail-closed conditional dock). Security: no default-open surface.
- **§XXVI double-gate on `s2-nav-chrome.md`:** gate-1 **independent critique REVISE** — 3 blockers (B1 router `to`
  not `href` + confined `ShellRoute` widening; B2 skip empty groups — `platform-services` empty in M1.0; B3 S1 ships
  only the CLOSED drawer → S2 adds open-transform/scrim + `inert`-when-closed) + 4 material (2 miscites, `currentColor`
  bridge precedent, overflow-Menu `onSelect`, collapse-toggle a11y) → **Approval 1**. Preflight **PASSED (5 folds)**
  (collapse-toggle visibility, rail group aria-label, exact aria-current, icon tree-shaking, concrete cast) → gate-2
  clean → **Approval 2**.
- **Killed a manufactured "decision":** I first framed the icon library as a fork (`lucide-react` vs
  `@tamagui/lucide-icons`). Victor: "there isn't supposed to have any decisions." **ADR-001:113,239-240** already
  fixes `lucide-react` (web) — cite, don't deliberate. [[read-architecture-before-implementing]] updated.
- **Built S2** (8 files + app-shell rewire, all `apps/web/src/shell`, no new `@vida/ui` component): `nav-icons.ts` ·
  `feature-flags.ts` · `nav-link.tsx` (`createLink`-styled SPA anchor — full Tamagui token styling on a real `<a>`,
  the cast confined to one site; `shellNavigate` for imperative nav) · `module-dock.tsx` · `global-bar.tsx` ·
  `use-nav-drawer.ts` · `test-router.tsx` · app-shell.tsx (3 placeholders → real chrome). Empirically validated the
  `createLink`+cast approach in jsdom before building on it.
- **Visual Gate SHIP** — caught a real layout defect jsdom can't see: the dock renders all 14 modules, but S1's
  `minHeight:100vh` frame never BOUNDED the viewport + the dock had no scroll → bottom modules below the fold ("why
  are modules missing?"). Fix: root `height:100vh`+`overflow:hidden`; dock + content `overflowY:auto` (independent
  region scroll). Refines S1's fill-only frame to fill-AND-bound.
- Green: web typecheck · **115 tests** (+19) · lint 0-err · build ✓. `packages/ui` untouched (one-way boundary held).
- **Currency (§XXIX):** `apps/web/src/shell/CLAUDE.md` updated (the dir now hosts the UX-3 model AND the UI-4 chrome;
  scoped the data-only rules to the model files). IA.md/shell-layout.md verified current (S2 implements them faithfully).

## Decisions Made
- **Icon library = `lucide-react`** — NOT a decision: ADR-001-fixed (web). The icon MAP is rendering data.
- **NavLink = `createLink(TamaguiAnchor)`** — a real SPA `<a>` with token-driven Tamagui styling (focus ring/hover/
  active variants); the `to`→`ShellRoute` widening (unregistered routes → NotFound, BR-4) confined to `nav-link.tsx`;
  `href` forbidden (reload). Icon tint via `currentColor` off the anchor's `color` token (button.tsx:110 precedent).
- **Closed drawer = `inert`** (set imperatively in the hook; jsdom reflects `el.inert`) so its 15 links leave the tab order.
- **Bounded frame** (Visual-Gate finding): the shell is exactly the viewport; regions scroll independently.

## Open Questions
- App is light-only until a theme store lands (a later unit); dark reachable via the Visual-Gate `theme='dark'` flip.
- CI red repo-wide (known pnpm `action-setup@v4` infra conflict — not S2; no branch protection, merges unblocked).

## Next Session
First step: **S3 (command-bar overlay)** — the ⌘K launcher (input + command list + result list + `search-unavailable`)
mounting into the overlay host + the global keydown listener + router injection, off clean `main`, through the §XXVI
gate + Visual Gate. Context to reload: `docs/specs/features/ui-4-app-shell-components/{_index,s2-nav-chrome}.md`,
`docs/core/architecture/command-bar-and-search.md`, `apps/web/src/command-bar/*`, `apps/web/src/stores/command-bar-ui-store.ts`
(S2 already wires the trigger → `open()`; S3 renders what `isOpen` shows), memory [[apps-web-is-the-first-vida-ui-consumer]].
