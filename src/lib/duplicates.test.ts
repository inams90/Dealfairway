import { describe, expect, it } from 'vitest'
import { DuplicateIndex, findDuplicates } from './duplicates'

const existing = [
  { id: '1', email: 'Pat.Lee@Example.com', phone: '+19055550101' },
  { id: '2', email: null, phone: '(416) 555-0102' },
  { id: '3', email: 'sam@example.com', phone: null },
]

describe('findDuplicates', () => {
  it('matches email case-insensitively and ignoring spaces', () => {
    expect(findDuplicates({ email: '  pat.lee@example.COM ' }, existing).map((m) => m.contact.id)).toEqual(['1'])
  })

  it('matches phone numbers written in different formats', () => {
    expect(findDuplicates({ phone: '905-555-0101' }, existing)[0]).toMatchObject({ contact: { id: '1' }, reason: 'phone' })
    expect(findDuplicates({ phone: '+1 416 555 0102' }, existing)[0].contact.id).toBe('2')
  })

  it('reports when both email and phone match', () => {
    expect(findDuplicates({ email: 'pat.lee@example.com', phone: '9055550101' }, existing)[0].reason).toBe(
      'email and phone',
    )
  })

  it('can match two different existing contacts', () => {
    expect(findDuplicates({ email: 'sam@example.com', phone: '4165550102' }, existing).map((m) => m.contact.id)).toEqual([
      '2',
      '3',
    ])
  })

  it('does not match on empty or invalid values', () => {
    expect(findDuplicates({ email: '', phone: '' }, existing)).toEqual([])
    expect(findDuplicates({ email: null, phone: 'n/a' }, [{ email: null, phone: 'n/a' }])).toEqual([])
    expect(findDuplicates({ email: 'new@example.com', phone: '6475550199' }, existing)).toEqual([])
  })
})

describe('DuplicateIndex', () => {
  it('finds matches added earlier', () => {
    const idx = new DuplicateIndex(existing)
    expect(idx.find({ phone: '905.555.0101' })?.contact.id).toBe('1')
    idx.add({ id: '4', email: 'new@example.com', phone: null })
    expect(idx.find({ email: 'NEW@example.com' })?.contact.id).toBe('4')
    expect(idx.find({ email: 'nobody@example.com' })).toBeNull()
  })
})
