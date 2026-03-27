// ============================================================================
// SRP (Secure Remote Password) — Client-side protocol
// ADR-001 §6 · architecture.md §3.3
//
// Zero-knowledge auth: the server NEVER sees the user's password.
// It stores only a salt + verifier. The protocol proves password knowledge
// without transmitting it.
//
// Flow:
//   Registration:  client generates salt + verifier → sends to server
//   Login step 1:  client sends email + public ephemeral A
//   Login step 2:  server responds with salt + public ephemeral B
//   Login step 3:  client derives session proof M1 → sends to server
//   Login step 4:  server verifies M1, responds with M2
//   Login step 5:  client verifies M2 → mutual authentication complete
// ============================================================================

import * as srpClient from 'secure-remote-password/client'
import type {
  SrpRegistrationRequest,
  SrpChallengeRequest,
  SrpVerifyRequest,
} from '@vida/types'

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface SrpRegistrationResult {
  /** Request payload to send to POST /api/auth/register */
  request: SrpRegistrationRequest
  /** SRP private key — needed during login, derived from (salt, email, password) */
  privateKey: string
}

/**
 * Generate the SRP registration payload.
 * Called once during account creation.
 *
 * The server stores { email, salt, verifier } — never the password.
 */
export function createRegistration(email: string, password: string): SrpRegistrationResult {
  const salt = srpClient.generateSalt()
  const privateKey = srpClient.derivePrivateKey(salt, email, password)
  const verifier = srpClient.deriveVerifier(privateKey)

  return {
    request: { email, salt, verifier },
    privateKey,
  }
}

// ---------------------------------------------------------------------------
// Login — step 1: initiate challenge
// ---------------------------------------------------------------------------

export interface SrpClientEphemeral {
  /** Sent to server as client_public */
  public: string
  /** Kept in memory — needed for step 3 */
  secret: string
}

/**
 * Generate client ephemeral key pair for login step 1.
 * Send `ephemeral.public` to the server as part of the challenge request.
 */
export function generateLoginEphemeral(): SrpClientEphemeral {
  return srpClient.generateEphemeral()
}

/**
 * Build the challenge request payload for POST /api/auth/challenge.
 */
export function createChallengeRequest(
  email: string,
  ephemeral: SrpClientEphemeral,
): SrpChallengeRequest {
  return {
    email,
    client_public: ephemeral.public,
  }
}

// ---------------------------------------------------------------------------
// Login — step 3: derive session + proof
// ---------------------------------------------------------------------------

export interface SrpClientSession {
  /** Shared session key (hex) — used to derive auth token, NOT for data encryption */
  key: string
  /** Client proof M1 — sent to server for verification */
  proof: string
}

/**
 * After receiving the server's challenge response (salt + server_public),
 * derive the SRP private key and compute the session + proof.
 *
 * @param email             - User's email
 * @param password          - User's plaintext password (never leaves this function)
 * @param clientEphemeral   - The ephemeral from step 1 (includes secret)
 * @param serverSalt        - Salt from server's challenge response
 * @param serverPublic      - Server's public ephemeral B from challenge response
 */
export function deriveClientSession(
  email: string,
  password: string,
  clientEphemeral: SrpClientEphemeral,
  serverSalt: string,
  serverPublic: string,
): SrpClientSession {
  const privateKey = srpClient.derivePrivateKey(serverSalt, email, password)

  const session = srpClient.deriveSession(
    clientEphemeral.secret,
    serverPublic,
    serverSalt,
    email,
    privateKey,
  )

  return { key: session.key, proof: session.proof }
}

/**
 * Build the verify request payload for POST /api/auth/verify.
 */
export function createVerifyRequest(
  email: string,
  session: SrpClientSession,
): SrpVerifyRequest {
  return {
    email,
    client_proof: session.proof,
  }
}

// ---------------------------------------------------------------------------
// Login — step 5: verify server proof
// ---------------------------------------------------------------------------

/**
 * Verify the server's proof M2 to confirm mutual authentication.
 * Throws if the server proof is invalid (possible MITM attack).
 *
 * @param clientPublicEphemeral - The public ephemeral A from step 1
 * @param clientSession         - The session from step 3
 * @param serverProof           - M2 from the server's verify response
 */
export function verifyServerProof(
  clientPublicEphemeral: string,
  clientSession: SrpClientSession,
  serverProof: string,
): void {
  srpClient.verifySession(
    clientPublicEphemeral,
    { key: clientSession.key, proof: clientSession.proof },
    serverProof,
  )
  // If this doesn't throw, mutual authentication is confirmed.
}

// ---------------------------------------------------------------------------
// Full login flow helper
// ---------------------------------------------------------------------------

/** Transient state held in memory during the login handshake */
export interface SrpLoginState {
  email: string
  ephemeral: SrpClientEphemeral
  session: SrpClientSession | null
}

/**
 * Start a login flow. Returns the state object and challenge request.
 * The caller sends the challenge request to the server and calls
 * `completeLogin()` with the server's response.
 */
export function startLogin(email: string): {
  state: SrpLoginState
  challengeRequest: SrpChallengeRequest
} {
  const ephemeral = generateLoginEphemeral()

  return {
    state: { email, ephemeral, session: null },
    challengeRequest: createChallengeRequest(email, ephemeral),
  }
}

/**
 * Complete the login after receiving the server's challenge response.
 * Returns the verify request to send to the server and the derived session.
 *
 * @param state          - From startLogin()
 * @param password       - User's password
 * @param serverSalt     - From SrpChallengeResponse
 * @param serverPublic   - From SrpChallengeResponse
 */
export function completeLogin(
  state: SrpLoginState,
  password: string,
  serverSalt: string,
  serverPublic: string,
): {
  verifyRequest: SrpVerifyRequest
  session: SrpClientSession
} {
  const session = deriveClientSession(
    state.email,
    password,
    state.ephemeral,
    serverSalt,
    serverPublic,
  )

  state.session = session

  return {
    verifyRequest: createVerifyRequest(state.email, session),
    session,
  }
}
