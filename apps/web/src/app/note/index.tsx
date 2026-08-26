// Note detail route — MOD-notes ② · B2 (LIF-131). Fills the B1 enabling stub with
// the real note-detail surface. Reads the `$id` param via getRouteApi (the
// decoupled-lazy-component pattern — does NOT import the route config into this
// chunk, preserving the lazy split; routes.tsx:70-74). Default export = the lazy
// route component.
import { getRouteApi } from '@tanstack/react-router'
import { NoteDetail } from './note-detail'

const route = getRouteApi('/note/$id')

export default function NoteDetailRoute() {
  const { id } = route.useParams()
  return <NoteDetail id={id} />
}
