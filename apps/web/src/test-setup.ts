// UI-4 · S1 — vitest setup. apps/web is the first APP consumer of the `@vida/ui` BARREL (App.tsx imports
// UIProvider/ToastProvider; shell tests import them + `media`). The barrel eagerly evaluates every re-export —
// including `neural-graph → sigma`, whose module-level code reads static `WebGL(2)RenderingContext.*` GL enum
// constants as lookup-table keys. jsdom/node implement no WebGL, so those globals are undefined and the barrel
// import throws at load. In a real browser they exist (runtime is unaffected) — purely a test-env gap. We stub both
// contexts with a Proxy returning a UNIQUE number per property (the exact GL values are irrelevant; the app never
// renders sigma). Runs via `setupFiles` BEFORE the test module graph loads. Mirrors packages/editor/src/test-setup.ts
// (the prior barrel consumer); the WebGL half only — apps/web needs no ProseMirror layout stubs. [[first-runtime-consumer-surfaces-latent-barrel-defects]]
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

// Tamagui's useMedia (AppShell) touches window.matchMedia on mount; jsdom doesn't implement it. Any jsdom test that
// renders the shell needs it. The `__bp` override makes the resolved breakpoint deterministic regardless — this only
// keeps matchMedia from throwing. Guarded to the jsdom files (node-env test files have no `window`).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
