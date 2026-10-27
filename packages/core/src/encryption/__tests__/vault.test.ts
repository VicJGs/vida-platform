import { describe, it, expect, beforeAll } from 'vitest'
import {
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
} from '../vault'

beforeAll(async () => {
  await initVault()
})

// ---------------------------------------------------------------------------
// Salt & Account Key generation
// ---------------------------------------------------------------------------

describe('generateSalt', () => {
  it('returns 16 bytes', () => {
    const salt = generateSalt()
    expect(salt).toBeInstanceOf(Uint8Array)
    expect(salt.length).toBe(16)
  })

  it('returns unique values', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).not.toEqual(b)
  })
})

describe('generateAccountKey', () => {
  it('returns 32 bytes', () => {
    const key = generateAccountKey()
    expect(key).toBeInstanceOf(Uint8Array)
    expect(key.length).toBe(32)
  })

  it('returns unique values', () => {
    const a = generateAccountKey()
    const b = generateAccountKey()
    expect(a).not.toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// Account Key formatting
// ---------------------------------------------------------------------------

describe('formatAccountKey / parseAccountKey', () => {
  it('round-trips correctly', () => {
    const original = generateAccountKey()
    const formatted = formatAccountKey(original)
    const parsed = parseAccountKey(formatted)
    expect(parsed).toEqual(original)
  })

  it('produces dash-separated uppercase groups', () => {
    const key = generateAccountKey()
    const formatted = formatAccountKey(key)
    expect(formatted).toMatch(/^[0-9A-F]{5}(-[0-9A-F]{1,5})+$/)
    expect(formatted.includes('-')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Key derivation — Argon2id
// ---------------------------------------------------------------------------

describe('deriveMasterKey', () => {
  it('returns 32-byte key', () => {
    const salt = generateSalt()
    const mk = deriveMasterKey('test-password', salt)
    expect(mk).toBeInstanceOf(Uint8Array)
    expect(mk.length).toBe(32)
  })

  it('is deterministic (same password + salt → same key)', () => {
    const salt = generateSalt()
    const mk1 = deriveMasterKey('my-password', salt)
    const mk2 = deriveMasterKey('my-password', salt)
    expect(mk1).toEqual(mk2)
  })

  it('different passwords → different keys', () => {
    const salt = generateSalt()
    const mk1 = deriveMasterKey('password-a', salt)
    const mk2 = deriveMasterKey('password-b', salt)
    expect(mk1).not.toEqual(mk2)
  })

  it('different salts → different keys', () => {
    const s1 = generateSalt()
    const s2 = generateSalt()
    const mk1 = deriveMasterKey('same-password', s1)
    const mk2 = deriveMasterKey('same-password', s2)
    expect(mk1).not.toEqual(mk2)
  })

  it('rejects wrong salt length', () => {
    expect(() => deriveMasterKey('pwd', new Uint8Array(8))).toThrow(/Salt must be/)
  })
})

// ---------------------------------------------------------------------------
// Vault Key derivation — BLAKE2b
// ---------------------------------------------------------------------------

describe('deriveVaultKey', () => {
  it('returns 32-byte key', () => {
    const mk = deriveMasterKey('pwd', generateSalt())
    const ak = generateAccountKey()
    const vk = deriveVaultKey(mk, ak)
    expect(vk).toBeInstanceOf(Uint8Array)
    expect(vk.length).toBe(32)
  })

  it('is deterministic', () => {
    const salt = generateSalt()
    const mk = deriveMasterKey('pwd', salt)
    const ak = generateAccountKey()
    const vk1 = deriveVaultKey(mk, ak)
    const vk2 = deriveVaultKey(mk, ak)
    expect(vk1).toEqual(vk2)
  })

  it('different account keys → different vault keys', () => {
    const mk = deriveMasterKey('pwd', generateSalt())
    const ak1 = generateAccountKey()
    const ak2 = generateAccountKey()
    expect(deriveVaultKey(mk, ak1)).not.toEqual(deriveVaultKey(mk, ak2))
  })

  it('rejects wrong key lengths', () => {
    expect(() => deriveVaultKey(new Uint8Array(16), new Uint8Array(32))).toThrow(/Master key/)
    expect(() => deriveVaultKey(new Uint8Array(32), new Uint8Array(16))).toThrow(/Account key/)
  })
})

// ---------------------------------------------------------------------------
// Full key chain — create & unlock round-trip
// ---------------------------------------------------------------------------

describe('createKeyChain / unlockKeyChain', () => {
  it('createKeyChain returns all components', () => {
    const { keyChain, salt } = createKeyChain('my-strong-password')
    expect(salt.length).toBe(16)
    expect(keyChain.master_key.length).toBe(32)
    expect(keyChain.account_key.length).toBe(32)
    expect(keyChain.vault_key.length).toBe(32)
  })

  it('unlockKeyChain reproduces the same vault key', () => {
    const { keyChain, salt } = createKeyChain('test-password-123')
    const restored = unlockKeyChain('test-password-123', keyChain.account_key, salt)
    expect(restored.vault_key).toEqual(keyChain.vault_key)
  })

  it('wrong password → different vault key', () => {
    const { keyChain, salt } = createKeyChain('correct-password')
    const wrong = unlockKeyChain('wrong-password', keyChain.account_key, salt)
    expect(wrong.vault_key).not.toEqual(keyChain.vault_key)
  })

  it('wrong account key → different vault key', () => {
    const { keyChain, salt } = createKeyChain('password')
    const wrongAk = generateAccountKey()
    const wrong = unlockKeyChain('password', wrongAk, salt)
    expect(wrong.vault_key).not.toEqual(keyChain.vault_key)
  })
})

// ---------------------------------------------------------------------------
// Encrypt / Decrypt — field-level (strings)
// ---------------------------------------------------------------------------

describe('encryptField / decryptField', () => {
  let vaultKey: Uint8Array
  beforeAll(() => {
    const { keyChain } = createKeyChain('test')
    vaultKey = keyChain.vault_key
  })

  it('round-trips plaintext', () => {
    const plaintext = 'Hello, Vida Platform!'
    const encrypted = encryptField(plaintext, vaultKey)
    const decrypted = decryptField(encrypted, vaultKey)
    expect(decrypted).toBe(plaintext)
  })

  it('handles empty string', () => {
    const encrypted = encryptField('', vaultKey)
    expect(decryptField(encrypted, vaultKey)).toBe('')
  })

  it('handles unicode / emoji', () => {
    const text = '日本語テスト 🔐🗝️'
    const encrypted = encryptField(text, vaultKey)
    expect(decryptField(encrypted, vaultKey)).toBe(text)
  })

  it('handles long text', () => {
    const text = 'x'.repeat(100_000)
    const encrypted = encryptField(text, vaultKey)
    expect(decryptField(encrypted, vaultKey)).toBe(text)
  })

  it('produces base64 nonce and ciphertext', () => {
    const encrypted = encryptField('test', vaultKey)
    expect(typeof encrypted.nonce).toBe('string')
    expect(typeof encrypted.ciphertext).toBe('string')
    expect(encrypted.nonce.length).toBeGreaterThan(0)
    expect(encrypted.ciphertext.length).toBeGreaterThan(0)
  })

  it('same plaintext → different ciphertext (random nonce)', () => {
    const a = encryptField('same text', vaultKey)
    const b = encryptField('same text', vaultKey)
    expect(a.nonce).not.toBe(b.nonce)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('wrong key → throws on decrypt', () => {
    const encrypted = encryptField('secret', vaultKey)
    const wrongKey = generateAccountKey() // 32 bytes, but not the right key
    expect(() => decryptField(encrypted, wrongKey)).toThrow()
  })

  it('tampered ciphertext → throws on decrypt', () => {
    const encrypted = encryptField('secret', vaultKey)
    // Flip a character in the ciphertext
    const tampered = {
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext.slice(0, -2) + 'AA',
    }
    expect(() => decryptField(tampered, vaultKey)).toThrow()
  })

  it('tampered nonce → throws on decrypt', () => {
    const encrypted = encryptField('secret', vaultKey)
    const tampered = {
      nonce: encrypted.nonce.slice(0, -2) + 'AA',
      ciphertext: encrypted.ciphertext,
    }
    expect(() => decryptField(tampered, vaultKey)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Encrypt / Decrypt — binary (bytes)
// ---------------------------------------------------------------------------

describe('encryptBytes / decryptBytes', () => {
  let vaultKey: Uint8Array
  beforeAll(() => {
    const { keyChain } = createKeyChain('test')
    vaultKey = keyChain.vault_key
  })

  it('round-trips binary data', () => {
    const data = new Uint8Array([0, 1, 2, 255, 128, 64])
    const { nonce, ciphertext } = encryptBytes(data, vaultKey)
    const decrypted = decryptBytes(ciphertext, nonce, vaultKey)
    expect(decrypted).toEqual(data)
  })

  it('handles empty data', () => {
    const data = new Uint8Array(0)
    const { nonce, ciphertext } = encryptBytes(data, vaultKey)
    const decrypted = decryptBytes(ciphertext, nonce, vaultKey)
    expect(decrypted).toEqual(data)
  })

  // libsodium-sumo encrypt/decrypt of 1 MB is inherently ~5s in JS; it sits right on
  // vitest's 5000ms default and tips over under full-suite load. Give it explicit head-room.
  it('handles large data (1 MB)', () => {
    const data = new Uint8Array(1_000_000)
    for (let i = 0; i < data.length; i++) data[i] = i % 256
    const { nonce, ciphertext } = encryptBytes(data, vaultKey)
    const decrypted = decryptBytes(ciphertext, nonce, vaultKey)
    expect(decrypted).toEqual(data)
  }, 20_000)

  it('wrong key → throws', () => {
    const data = new Uint8Array([1, 2, 3])
    const { nonce, ciphertext } = encryptBytes(data, vaultKey)
    const wrongKey = generateAccountKey()
    expect(() => decryptBytes(ciphertext, nonce, wrongKey)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Content hashing
// ---------------------------------------------------------------------------

describe('hashContent', () => {
  it('returns hex string', () => {
    const hash = hashContent('hello')
    expect(typeof hash).toBe('string')
    expect(hash).toMatch(/^[0-9a-f]{64}$/) // 32 bytes = 64 hex chars
  })

  it('is deterministic', () => {
    expect(hashContent('same')).toBe(hashContent('same'))
  })

  it('different content → different hash', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'))
  })
})

// ---------------------------------------------------------------------------
// Memory safety
// ---------------------------------------------------------------------------

describe('zeroKey', () => {
  it('zeroes all bytes in the buffer', () => {
    const key = generateAccountKey()
    expect(key.some((b) => b !== 0)).toBe(true) // not all zeros before
    zeroKey(key)
    expect(key.every((b) => b === 0)).toBe(true) // all zeros after
  })
})
