export { APP_NAME } from '@vida/types'

// Encryption — vault primitives
export {
  initVault,
  deriveMasterKey,
  deriveVaultKey,
  generateSalt,
  generateAccountKey,
  formatAccountKey,
  parseAccountKey,
  createKeyChain,
  unlockKeyChain,
  encryptField,
  decryptField,
  encryptBytes,
  decryptBytes,
  hashContent,
  zeroKey,
} from './encryption/vault'

// Encryption — key management
export {
  getVaultStatus,
  onVaultStatusChange,
  isUnlocked,
  unlock,
  lock,
  getVaultKey,
  markDbUnlocked,
  markFtsReady,
  prepareKeyRotation,
  commitKeyRotation,
  startAutoLockTimer,
  resetAutoLockTimer,
  clearAutoLockTimer,
} from './encryption/key-management'

// Encryption — SRP auth
export {
  createRegistration,
  generateLoginEphemeral,
  createChallengeRequest,
  deriveClientSession,
  createVerifyRequest,
  verifyServerProof,
  startLogin,
  completeLogin,
} from './encryption/srp'

export type {
  SrpRegistrationResult,
  SrpClientEphemeral,
  SrpClientSession,
  SrpLoginState,
} from './encryption/srp'

// Validators — Zod schemas for @vida/types enums
export * from './validators'

// Database — schema & adapter
export * as schema from './db/schema'

export {
  DEFAULT_SQLCIPHER_CONFIG,
  createDrizzleProxy,
  getSchemaVersion,
  setSchemaVersion,
  runMigrations,
  configureSqlCipher,
  configureConnection,
  verifyCipherKey,
  initializeConnection,
} from './db/adapter'

export type {
  DrizzleDb,
  RawQueryResult,
  Migration,
  SqliteDriver,
  DatabaseAdapter,
  DatabaseConfig,
} from './db/adapter'

// Database — migration runner
export {
  migrate,
  currentVersion,
  needsMigration,
  LATEST_VERSION,
  listMigrations,
} from './db/migrations/runner'

// Database — generic repository
export {
  createRepository,
  buildEncryptionSchema,
  uuidv7,
  uuidv4,
  packEncrypted,
  unpackEncrypted,
  encryptRow,
  decryptRow,
} from './db/repository'

export type {
  CreateInput,
  UpdateInput,
  RepositoryConfig,
  Repository,
} from './db/repository'

// Foundation substrate — Sessions base (AR-5 · ADR-004)
export * from './foundation/sessions'

// Foundation substrate — Spaces base (AR-6 · ADR-006/007)
export * from './foundation/spaces'
export * from './foundation/views'

// Foundation substrate — the effect rail (AR-7 Increment 1 · ADR-004 §3.2.5 / F1)
export * from './foundation/effects'

// Foundation substrate — the capability registry (AR-7 Increment 2 · ADR-008 + ADR-010)
export * from './foundation/capability'

// Foundation substrate — the measurability engine (AR-7 Increment 3 · ADR-011)
export * from './foundation/measurement'

// Foundation substrate — the points economy (AR-7 Increment 4 · ADR-012)
export * from './foundation/economy'

// Service — backlink / entity-link resolver (AR-8 Increment 1 · reads AR-6 entity_links)
export * from './services/search'

// Service — Notes & Pages module (MOD-notes ① · LIF-131 · M1.1): pages/page_links/
// note_attachments CRUD + wiki-resolve + NP-8 seed; delegates entity-link/tag to AR-6/AR-8
export * from './services/notes'
// The public Drizzle Row types the NotesService returns — consumed by app-layer
// callers (MOD-notes ②b NoteCard, journals JR-1). The service barrel only `import type`s
// these, so they need an explicit re-export to be reachable from `@vida/core` (B1).
export type { PageRow, PageLinkRow, NoteAttachmentRow } from './db/schema/notes'

// Sync — AR-9 engine scaffolding (no-flush): reserved seams inert until M4 (AR-9b · ADR-003 §8)
export * from './sync'
