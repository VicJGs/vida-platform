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

// Foundation substrate — the generic review engine (ADR-005 · mod-knowledge #50 ① S3)
export * from './foundation/review'

// Foundation substrate — the egress guard (XS-egress-guard #43 · ADR-014 §3.3 · XCU-06/08)
export * from './foundation/egress'

// Foundation substrate — the ingestion guard (XS-ingestion #44 · ADR-014 §3.1-3.8 · XCU-01…05,09…16)
export * from './foundation/ingestion'

// Foundation substrate — the AI-application service tier (XS-ai #45 · ADR-015 §3.1-3.8 · XCU-17…27)
export * from './foundation/ai'

// Foundation substrate — the ZK notification delivery engine (XS-notifications-delivery #46 · ADR-013 · XCU-01…12,14-18)
export * from './foundation/notifications'

// Foundation substrate — the measurability engine (AR-7 Increment 3 · ADR-011)
export * from './foundation/measurement'

// Foundation substrate — the points economy (AR-7 Increment 4 · ADR-012)
export * from './foundation/economy'

// Service — backlink / entity-link resolver (AR-8 Increment 1 · reads AR-6 entity_links)
export * from './services/search'

// Service — Sessions & Scheduling (MOD-sessions ① · LIF-139 · S1 CRUD + attach)
export * from './services/sessions'

// Service — Preferences (mod-preferences #37 · LIF-133 · Slice 1: user_preferences config provider)
export * from './services/preferences'

// Service — Journals (mod-journals #39 · LIF-127 · Slice 1: contribution registry + types + typed errors)
export * from './services/journals'

// Service — Notes & Pages (mod-notes-and-pages #35 · LIF-131 · S1: pages-core service tier)
export * from './services/notes'

// Service — Check-ins (mod-check-ins #41 · LIF-119 · S2: entry CRUD service tier)
export * from './services/checkins'

// Service — Finance (mod-finance #47 · LIF-122 · S1: entity CRUD service tier)
export * from './services/finance'

// Service — Gamification (mod-gamification #48 · LIF-124 · S1: currency surface + level + clamp)
export * from './services/gamification'

// Service — Habits (mod-habits #49 · LIF-125 · S1: definition CRUD + @vida/types reconcile)
export * from './services/habits'

// Service — Knowledge (mod-knowledge #50 · LIF-128 · S1: kinds + objects + hierarchy + @vida/types reconcile)
export * from './services/knowledge'

// Service — Flashcards (mod-knowledge #50 · LIF-128 · S7: the ADR-005 study-method sub-service over Knowledge's engine)
export * from './services/flashcards'

// Service — Books (mod-books #51 · LIF-117 · S1: Works CRUD + reframe over DB-4 023_books)
export * from './services/books'

// Service — Notifications (mod-notifications #53 · LIF-132 · S1: inbox reads + lifecycle over DB-4 032_notifications)
export * from './services/notifications'

// Sync — AR-9 engine scaffolding (no-flush): reserved seams inert until M4 (AR-9b · ADR-003 §8)
export * from './sync'
