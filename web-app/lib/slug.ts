import crypto from 'node:crypto'

// A short random suffix keeps the slug unique without a DB round-trip to
// check collisions on every attempt, while the readable prefix makes the
// public URL recognizable (e.g. /statement/acme-schools-a1b2c3d4) rather
// than an opaque id.
export function generateSlug(readableName: string): string {
  const base = readableName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomBytes(4).toString('hex')
  return base ? `${base}-${suffix}` : suffix
}
