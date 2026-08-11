// E1 (UI-3) — vitest setup. @vida/editor tests import `{ UIProvider }` from the @vida/ui BARREL (the real app
// consumer path), which eagerly evaluates every re-export — including `neural-graph → sigma`, whose module-level code
// reads static `WebGL(2)RenderingContext.*` GL enum constants (used as object keys in lookup tables). jsdom implements
// no WebGL, so those globals are undefined and the barrel import throws. In a real browser they exist (apps/web is
// unaffected) — purely a jsdom gap. We stub both contexts with a Proxy that returns a UNIQUE number per property, so
// any GL constant sigma reads resolves to a distinct key (their exact values are irrelevant — the editor never renders
// sigma). Runs before the test module graph loads (vitest setupFiles), so the globals exist before @vida/ui → sigma
// is imported. (@vida/ui's own graph test mocks sigma instead of loading it.)
function makeGLContextStub(): unknown {
  let next = 1
  const cache = new Map<PropertyKey, number>()
  return new Proxy(function () {} as object, {
    get(_target, prop) {
      let v = cache.get(prop)
      if (v === undefined) {
        v = next++
        cache.set(prop, v)
      }
      return v
    },
  })
}

const g = globalThis as Record<string, unknown>
for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
  if (g[name] === undefined) g[name] = makeGLContextStub()
}

// jsdom has no layout engine, so after a real edit ProseMirror's `scrollToSelection → coordsAtPos → singleRect`
// calls `Range.getClientRects()`, which jsdom doesn't implement → an uncaught "not a function" throws AFTER the test
// asserted (all assertions still pass). Provide empty-layout stubs so scrollToSelection cleanly no-ops. Assign on
// Range unconditionally (the gap); on Element/Text only if missing (don't clobber jsdom's real impls).
const zeroRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) })
const emptyRectList = () => Object.assign([], { item: () => null })
type LayoutProto = { getClientRects?: unknown; getBoundingClientRect?: unknown }
if (typeof Range !== 'undefined') {
  const p = Range.prototype as unknown as LayoutProto
  p.getClientRects = emptyRectList
  p.getBoundingClientRect = zeroRect
}
for (const Ctor of [globalThis.Element, globalThis.Text]) {
  const p = Ctor?.prototype as unknown as LayoutProto | undefined
  if (p && typeof p.getClientRects !== 'function') p.getClientRects = emptyRectList
  if (p && typeof p.getBoundingClientRect !== 'function') p.getBoundingClientRect = zeroRect
}

// jsdom implements no hit-testing, so ProseMirror's pointer path (mousedown → posAtCoords) calls
// document.elementFromPoint / caret*FromPoint, which don't exist → uncaught throw. Null-returning stubs let
// posAtCoords fall back cleanly (the caret just stays put; the edit path is unaffected).
const doc = globalThis.document as unknown as Record<string, unknown> | undefined
if (doc) {
  if (typeof doc['elementFromPoint'] !== 'function') doc['elementFromPoint'] = () => null
  if (typeof doc['caretRangeFromPoint'] !== 'function') doc['caretRangeFromPoint'] = () => null
  if (typeof doc['caretPositionFromPoint'] !== 'function') doc['caretPositionFromPoint'] = () => null
}
