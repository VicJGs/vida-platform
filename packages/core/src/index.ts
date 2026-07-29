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
