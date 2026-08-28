import crypto from 'node:crypto'
import { prisma } from './prisma.ts'

const KEY_PREFIX = 'an_live_'
const PREFIX_DISPLAY_LENGTH = 16 // "an_live_" + 8 hex chars, enough to identify a key in a list

export interface GeneratedApiKey {
  key: string // full plaintext key — only ever returned once, at creation
  prefix: string
  hash: string
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`
  return {
    key,
    prefix: key.slice(0, PREFIX_DISPLAY_LENGTH),
    hash: hashApiKey(key),
  }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX)
}

// Resolves a presented API key to the organization it acts on behalf of,
// or null if it's unknown or revoked. Updates lastUsedAt on success —
// best-effort, never blocks the caller on that write failing.
export async function resolveOrganizationFromApiKey(
  key: string
): Promise<{ organizationId: string; keyId: string } | null> {
  if (!looksLikeApiKey(key)) return null

  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } })
  if (!record || record.revokedAt) return null

  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined)

  return { organizationId: record.organizationId, keyId: record.id }
}
