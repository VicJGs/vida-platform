// Notes route — MOD-notes ② · B1 (LIF-131). Replaces the AR-4 `<h2>` placeholder
// with the real collection surface. Default export = the route component consumed
// by `lazyRouteComponent` in routes.tsx (still its own async chunk).
import { NotesCollection } from './notes-collection'

export default function NotesRoute() {
  return <NotesCollection />
}
