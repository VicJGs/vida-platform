<!-- ui-ux/screens.md — Track B · §6 lens 1. Inventory of every view/route + its states (§VIII). This is the
     STATE MATRIX the S4 Visual Gate drives. Cited to the built files + current-*. Born 2026-08-22 (recovery). -->

# Screens — view/route inventory + state matrix

The §VIII visual-state set, per screen. **This table is the S4 Visual-Gate checklist** — every row × {light |
dark-token} × {375 · 768 · 1440}.

## `/notes` — collection (②b · `app/notes/index.tsx`)

| State | Rendering | Cite |
|-------|-----------|------|
| loading | terminal-state `loading` (from `usePagesByType('note')`) | `current-spec.md:60-62` |
| empty | "No notes yet" + ⌘K hint (NC-9) | `index.tsx:66-77` |
| success · List | `ListView` of `NoteCard` (default, NC-1/NC-2) | `index.tsx:38-47` |
| success · Gallery | `GalleryView` of `NoteCard` | `index.tsx:49-58` |
| success · Neural | `NeuralGraph` empty (graph-prep deferred, NC-5) | `index.tsx:60` |
| error | terminal-state `error` (from the hook, never re-derived, DP-7) | `current-business-rules.md:40` |
| view-switcher | List / Gallery / Graph toggle (`aria-pressed`) | `view-switcher.tsx` |

## `note/$id` — authoring surface (②c · `note-detail.tsx`)

| State | Rendering | Cite |
|-------|-----------|------|
| loading | "Loading…" | `note-detail.tsx` (EM-9) |
| **empty / not-found** | "Note not found." (a missing id is `empty`, NOT error — EM-9) | `current-business-rules.md:52-53` |
| error | "Couldn't load this note." | `note-detail.tsx` |
| success | `NoteEditorSurface key={id}` → title `Input` + `VidaEditor` + save indicator | `current-spec.md:76-81` |
| save indicator | `role=status`: Saved · Saving… · Save failed (EM-7) | `current-business-rules.md` EM-7 |
| title | editable `Input`, blur-commits (EM-6) | `note-detail.tsx:118-131` |

## `[[` picker — combobox popup (②c · `wiki-link-menu.tsx`)

| State | Rendering | Cite |
|-------|-----------|------|
| idle (closed) | no popup; `wikiComboboxAttrs` off | `wiki-link.ts:114-118` |
| loading | popup, loading row | `wiki-link-menu.tsx` |
| candidates | `role=listbox` of `role=option` rows (roving, `aria-activedescendant`) | `wiki-link-menu.tsx:74-172` |
| create-on-miss | "+ Create '\<query\>'" row (query non-empty) | `wiki-link-menu.tsx` (WL-3) |
| empty query | no create row | `wiki-link.ts:47-49` (stripWikiClose) |

## ②d — backlink/entity panels + page metadata (🕳 forward spec)

To build. Screens: a backlinks panel (list of inbound `page_links` + entity-links — see the U-1 merge decision),
an entity-link panel, page-metadata controls (favorite/archive/icon/cover). Each with the full §VIII state set.
`[FACT: ../current-spec.md:9; ../delivery/reconciliation.md #24]`

## ②e — search (🕳 forward spec, blocked on DB-8)

To build. Screens: a search input + results list + `search-unavailable` degrade (the DB-8 seam). `[FACT:
../delivery/reconciliation.md #25]`
