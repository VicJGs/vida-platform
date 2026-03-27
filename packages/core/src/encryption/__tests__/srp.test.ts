import { describe, it, expect } from 'vitest'
import * as srpServer from 'secure-remote-password/server'
import {
  createRegistration,
  generateLoginEphemeral,
  deriveClientSession,
  verifyServerProof,
  startLogin,
  completeLogin,
} from '../srp'

// ---------------------------------------------------------------------------
// These tests simulate the full client ↔ server SRP handshake.
// The server side uses `secure-remote-password/server` to verify correctness.
// In production, the server runs on Hono (Cloudflare Workers).
// ---------------------------------------------------------------------------

const TEST_EMAIL = 'user@vida.app'
const TEST_PASSWORD = 'correct-horse-battery-staple'

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe('createRegistration', () => {
  it('generates salt and verifier', () => {
    const { request, privateKey } = createRegistration(TEST_EMAIL, TEST_PASSWORD)

    expect(request.email).toBe(TEST_EMAIL)
    expect(typeof request.salt).toBe('string')
    expect(request.salt.length).toBeGreaterThan(0)
    expect(typeof request.verifier).toBe('string')
    expect(request.verifier.length).toBeGreaterThan(0)
    expect(typeof privateKey).toBe('string')
  })

  it('same credentials produce different salts (randomized)', () => {
    const a = createRegistration(TEST_EMAIL, TEST_PASSWORD)
    const b = createRegistration(TEST_EMAIL, TEST_PASSWORD)
    expect(a.request.salt).not.toBe(b.request.salt)
  })
})

// ---------------------------------------------------------------------------
// Full handshake — registration + login
// ---------------------------------------------------------------------------

describe('full SRP handshake', () => {
  // Simulate server-side storage
  let serverSalt: string
  let serverVerifier: string

  it('registration → server stores salt + verifier', () => {
    const { request } = createRegistration(TEST_EMAIL, TEST_PASSWORD)
    serverSalt = request.salt
    serverVerifier = request.verifier
    expect(serverSalt).toBeDefined()
    expect(serverVerifier).toBeDefined()
  })

  it('login succeeds with correct password (step by step)', () => {
    // --- Client step 1: generate ephemeral ---
    const clientEphemeral = generateLoginEphemeral()
    expect(clientEphemeral.public).toBeDefined()
    expect(clientEphemeral.secret).toBeDefined()

    // --- Server step 2: generate server ephemeral ---
    const serverEphemeral = srpServer.generateEphemeral(serverVerifier)

    // --- Client step 3: derive session ---
    const clientSession = deriveClientSession(
      TEST_EMAIL,
      TEST_PASSWORD,
      clientEphemeral,
      serverSalt,
      serverEphemeral.public,
    )
    expect(clientSession.key).toBeDefined()
    expect(clientSession.proof).toBeDefined()

    // --- Server step 4: verify client proof ---
    const serverSession = srpServer.deriveSession(
      serverEphemeral.secret,
      clientEphemeral.public,
      serverSalt,
      TEST_EMAIL,
      serverVerifier,
      clientSession.proof,
    )
    expect(serverSession.key).toBe(clientSession.key) // shared session key

    // --- Client step 5: verify server proof ---
    expect(() => {
      verifyServerProof(
        clientEphemeral.public,
        clientSession,
        serverSession.proof,
      )
    }).not.toThrow()
  })

  it('login fails with wrong password', () => {
    const clientEphemeral = generateLoginEphemeral()
    const serverEphemeral = srpServer.generateEphemeral(serverVerifier)

    // Wrong password → client computes wrong proof
    const clientSession = deriveClientSession(
      TEST_EMAIL,
      'wrong-password',
      clientEphemeral,
      serverSalt,
      serverEphemeral.public,
    )

    // Server rejects wrong proof
    expect(() => {
      srpServer.deriveSession(
        serverEphemeral.secret,
        clientEphemeral.public,
        serverSalt,
        TEST_EMAIL,
        serverVerifier,
        clientSession.proof,
      )
    }).toThrow()
  })

  it('client rejects forged server proof', () => {
    const clientEphemeral = generateLoginEphemeral()
    const serverEphemeral = srpServer.generateEphemeral(serverVerifier)

    const clientSession = deriveClientSession(
      TEST_EMAIL,
      TEST_PASSWORD,
      clientEphemeral,
      serverSalt,
      serverEphemeral.public,
    )

    // Verify with correct proof first to confirm the session is valid
    const serverSession = srpServer.deriveSession(
      serverEphemeral.secret,
      clientEphemeral.public,
      serverSalt,
      TEST_EMAIL,
      serverVerifier,
      clientSession.proof,
    )
    expect(serverSession.proof).toBeDefined()

    // Now try with a forged proof
    expect(() => {
      verifyServerProof(
        clientEphemeral.public,
        clientSession,
        'forged-server-proof-0000000000000000000000000000000000',
      )
    }).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Convenience helpers — startLogin / completeLogin
// ---------------------------------------------------------------------------

describe('startLogin / completeLogin', () => {
  it('full flow using convenience helpers', () => {
    // Registration
    const { request } = createRegistration(TEST_EMAIL, TEST_PASSWORD)

    // --- Client: start login ---
    const { state, challengeRequest } = startLogin(TEST_EMAIL)
    expect(challengeRequest.email).toBe(TEST_EMAIL)
    expect(challengeRequest.client_public).toBe(state.ephemeral.public)
    expect(state.session).toBeNull()

    // --- Server: process challenge ---
    const serverEphemeral = srpServer.generateEphemeral(request.verifier)

    // --- Client: complete login ---
    const { verifyRequest, session } = completeLogin(
      state,
      TEST_PASSWORD,
      request.salt,
      serverEphemeral.public,
    )
    expect(verifyRequest.email).toBe(TEST_EMAIL)
    expect(verifyRequest.client_proof).toBe(session.proof)
    expect(state.session).toBe(session) // state is mutated

    // --- Server: verify ---
    const serverSession = srpServer.deriveSession(
      serverEphemeral.secret,
      state.ephemeral.public,
      request.salt,
      TEST_EMAIL,
      request.verifier,
      session.proof,
    )

    // --- Client: verify server ---
    expect(() => {
      verifyServerProof(state.ephemeral.public, session, serverSession.proof)
    }).not.toThrow()

    // Both sides have the same session key
    expect(session.key).toBe(serverSession.key)
  })
})

// ---------------------------------------------------------------------------
// Session key properties
// ---------------------------------------------------------------------------

describe('session key properties', () => {
  it('session key is a long hex string', () => {
    const { request } = createRegistration(TEST_EMAIL, TEST_PASSWORD)
    const clientEphemeral = generateLoginEphemeral()
    const serverEphemeral = srpServer.generateEphemeral(request.verifier)

    const clientSession = deriveClientSession(
      TEST_EMAIL,
      TEST_PASSWORD,
      clientEphemeral,
      request.salt,
      serverEphemeral.public,
    )

    expect(clientSession.key).toMatch(/^[0-9a-f]+$/)
    // SRP session keys are typically 256+ bits
    expect(clientSession.key.length).toBeGreaterThanOrEqual(64)
  })

  it('different login sessions produce different session keys', () => {
    const { request } = createRegistration(TEST_EMAIL, TEST_PASSWORD)

    const e1 = generateLoginEphemeral()
    const se1 = srpServer.generateEphemeral(request.verifier)
    const s1 = deriveClientSession(TEST_EMAIL, TEST_PASSWORD, e1, request.salt, se1.public)

    const e2 = generateLoginEphemeral()
    const se2 = srpServer.generateEphemeral(request.verifier)
    const s2 = deriveClientSession(TEST_EMAIL, TEST_PASSWORD, e2, request.salt, se2.public)

    expect(s1.key).not.toBe(s2.key)
  })
})
