import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateSlug } from './slug.ts'

describe('generateSlug', () => {
  it('lowercases and hyphenates the readable name', () => {
    const slug = generateSlug('Acme Schools District')
    assert.match(slug, /^acme-schools-district-[0-9a-f]{8}$/)
  })

  it('strips characters unsafe for a URL segment', () => {
    const slug = generateSlug("O'Brien & Sons, Inc.")
    assert.doesNotMatch(slug, /['&,.]/)
  })

  it('never produces the same slug twice for the same input', () => {
    const a = generateSlug('Acme')
    const b = generateSlug('Acme')
    assert.notStrictEqual(a, b)
  })

  it('falls back to just the random suffix when the name has no usable characters', () => {
    const slug = generateSlug('!!!')
    assert.match(slug, /^[0-9a-f]{8}$/)
  })
})
