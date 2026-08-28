import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateApiKey, hashApiKey, looksLikeApiKey } from './api-keys.ts'

describe('generateApiKey', () => {
  it('produces a key with the expected prefix', () => {
    const { key, prefix } = generateApiKey()
    assert.ok(key.startsWith('an_live_'))
    assert.ok(key.startsWith(prefix))
  })

  it('never returns the same key twice', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    assert.notStrictEqual(a.key, b.key)
  })

  it('hash matches hashApiKey(key) and is not reversible-looking (not the key itself)', () => {
    const { key, hash } = generateApiKey()
    assert.strictEqual(hash, hashApiKey(key))
    assert.notStrictEqual(hash, key)
  })
})

describe('looksLikeApiKey', () => {
  it('accepts a well-formed key', () => {
    assert.strictEqual(looksLikeApiKey(generateApiKey().key), true)
  })

  it('rejects a session-shaped or empty value', () => {
    assert.strictEqual(looksLikeApiKey(''), false)
    assert.strictEqual(looksLikeApiKey('Bearer sometoken'), false)
    assert.strictEqual(looksLikeApiKey('sk_live_notours'), false)
  })
})
