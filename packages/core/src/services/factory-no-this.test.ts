// ============================================================================
// Factory-object services never use `this` (IR-8).
//
// A @vida/core service is `createXService(db, …) → { …methods }`, an object literal, not a class. `this` binds
// only in the `svc.method()` call form, so an intra-service `this.other()` throws the moment a consumer
// destructures the surface (`const { createPage } = svc` — how the React Query hooks consume it). Unit tests
// that call `svc.method()` never see it. Intra-service calls go through closure functions inside the factory.
//
// The scan covers services/ and foundation/ source (tests excluded) and allows `this` only inside a class body
// (the typed Error subclasses set `this.name`, `this.reason`, …).
// ============================================================================

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const SRC = join(__dirname, '..')
const ROOTS = ['services', 'foundation'].map((d) => join(SRC, d))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(p)
    return /\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') ? [p] : []
  })
}

function thisOutsideClass(file: string): string[] {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const hits: string[] = []
  const visit = (node: ts.Node, inClass: boolean): void => {
    if (node.kind === ts.SyntaxKind.ThisKeyword && !inClass) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
      hits.push(`${relative(SRC, file)}:${line + 1}`)
    }
    const nowInClass = inClass || ts.isClassDeclaration(node) || ts.isClassExpression(node)
    ts.forEachChild(node, (child) => visit(child, nowInClass))
  }
  visit(sf, false)
  return hits
}

describe('factory-object services (IR-8)', () => {
  it('no `this` outside a class body in services/ or foundation/', () => {
    const files = ROOTS.flatMap(sourceFiles)
    expect(files.length).toBeGreaterThan(50)
    expect(files.flatMap(thisOutsideClass)).toEqual([])
  })
})
