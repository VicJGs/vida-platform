// Note detail route — MOD-notes ② · B1 ENABLING STUB (LIF-131). B1's collection
// needs `/note/$id` to resolve (EC-4: a row opens the note), so B1 registers the
// route + this placeholder — exactly the AR-4→/notes stub pattern B1 itself just
// replaced. B2 replaces this with the real @vida/editor mount + collapsible rail +
// page-actions (slice-map.md:31). Default export = the lazy route component.
export default function NoteDetailRoute() {
  return <h2>Note</h2>
}
