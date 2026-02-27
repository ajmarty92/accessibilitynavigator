import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateUrl } from './security.ts'

test('validateUrl', async (t) => {
  await t.test('should accept valid public URLs', async () => {
    const validUrls = [
      'https://google.com',
      'http://example.com',
      'https://8.8.8.8' // Google DNS
    ]

    for (const url of validUrls) {
      const result = await validateUrl(url)
      assert.strictEqual(result.valid, true, `URL should be valid: ${url}`)
    }
  })

  await t.test('should reject private IP addresses (IPv4)', async () => {
    const invalidUrls = [
      'http://127.0.0.1',
      'http://10.0.0.1',
      'http://192.168.1.1',
      'http://172.16.0.1',
      'http://169.254.0.1'
    ]

    for (const url of invalidUrls) {
      const result = await validateUrl(url)
      assert.strictEqual(result.valid, false, `URL should be invalid: ${url}`)
      assert.ok(result.reason, 'Reason should be provided')
    }
  })

  await t.test('should reject private IP addresses (IPv6)', async () => {
    const invalidUrls = [
      'http://[::1]',
      'http://[fc00::1]',
      'http://[fe80::1]'
    ]

    for (const url of invalidUrls) {
      const result = await validateUrl(url)
      assert.strictEqual(result.valid, false, `URL should be invalid: ${url}`)
      assert.ok(result.reason, 'Reason should be provided')
    }
  })

  await t.test('should reject IPv4-mapped IPv6 addresses', async () => {
    const invalidUrls = [
      'http://[::ffff:127.0.0.1]',
      'http://[::ffff:10.0.0.1]',
      'http://[::ffff:192.168.1.1]'
    ]

    for (const url of invalidUrls) {
      const result = await validateUrl(url)
      assert.strictEqual(result.valid, false, `URL should be invalid: ${url}`)
      assert.ok(result.reason, 'Reason should be provided')
    }
  })

  await t.test('should accept valid public IPv4-mapped IPv6 addresses', async () => {
    // 8.8.8.8 in IPv4-mapped IPv6
    const url = 'http://[::ffff:8.8.8.8]'
    const result = await validateUrl(url)
    assert.strictEqual(result.valid, true, `URL should be valid: ${url}`)
  })

  await t.test('should reject localhost', async () => {
    const result = await validateUrl('http://localhost')
    assert.strictEqual(result.valid, false, 'localhost should be rejected')
  })

  await t.test('should reject non-HTTP protocols', async () => {
    const invalidUrls = [
      'ftp://example.com',
      'file:///etc/passwd',
      'gopher://example.com'
    ]

    for (const url of invalidUrls) {
      const result = await validateUrl(url)
      assert.strictEqual(result.valid, false, `URL should be invalid: ${url}`)
      assert.strictEqual(result.reason, 'Invalid protocol. Only HTTP and HTTPS are allowed.')
    }
  })

  await t.test('should reject invalid URLs', async () => {
    const result = await validateUrl('not-a-url')
    assert.strictEqual(result.valid, false)
  })
})
