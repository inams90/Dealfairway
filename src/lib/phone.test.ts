import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    ['(905) 555-0123', '+19055550123'],
    ['905-555-0123', '+19055550123'],
    ['9055550123', '+19055550123'],
    ['+19055550123', '+19055550123'],
    ['+1 (905) 555-0123', '+19055550123'],
    ['1 905 555 0123', '+19055550123'],
    ['  416.555.0199 ', '+14165550199'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each([[''], ['   '], [null], ['12'], ['not a phone']])('returns null for %s', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe('formatPhone', () => {
  it('formats Canadian numbers nationally', () => {
    expect(formatPhone('+19055550123')).toBe('(905) 555-0123')
  })
  it('formats other countries internationally', () => {
    expect(formatPhone('+442079460958')).toBe('+44 20 7946 0958')
  })
})
