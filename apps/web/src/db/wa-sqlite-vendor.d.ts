// Ambient declaration for the wa-sqlite example VFS, which ships as JS with no
// type declaration (wa-sqlite's index.d.ts declares the other example modules
// but not AccessHandlePoolVFS). Only the surface AR-2 uses is declared here.
declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
  export class AccessHandlePoolVFS {
    /** @param directoryPath OPFS directory (segments split on '/') holding the pool. */
    constructor(directoryPath: string)
    /** Resolves once the pool has acquired its OPFS access handles. */
    isReady: Promise<void>
    /** Number of SQLite files currently persisted in the pool. */
    getSize(): number
    /** Release all OPFS access handles. */
    close(): Promise<void>
    readonly name: string
  }
}
