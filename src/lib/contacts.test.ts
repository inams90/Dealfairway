import { describe, expect, it } from 'vitest'
import type { ContactRow } from '../types/database'
import { allTags, displayName, filterContacts, initials, relativeDay, sortContacts } from './contacts'

const base: ContactRow = {
  id: '',
  user_id: 'u',
  first_name: '',
  last_name: '',
  email: null,
  phone: null,
  type: 'other',
  property_interest: null,
  source: 'other',
  notes: '',
  tags: [],
  last_activity_at: null,
  created_at: '',
  updated_at: '',
}
const c = (o: Partial<ContactRow>): ContactRow => ({ ...base, ...o })

const list = [
  c({ id: 'a', first_name: 'Sara', last_name: 'Khan', email: 'sara@example.com', type: 'tenant', source: 'miltonlease', tags: ['Hot Prospect'] }),
  c({ id: 'b', first_name: 'Ahmed', last_name: 'Ali', phone: '+19055550101', type: 'buyer', property_interest: 'residential', tags: ['Past Client'] }),
  c({ id: 'c', first_name: 'Lee', last_name: 'Wong', type: 'investor', property_interest: 'industrial', source: 'referral', tags: ['Past Client', 'VIP'] }),
]

describe('filterContacts', () => {
  it('searches by name, full name, email and tag', () => {
    expect(filterContacts(list, { q: 'sara' }).map((x) => x.id)).toEqual(['a'])
    expect(filterContacts(list, { q: 'ahmed ali' }).map((x) => x.id)).toEqual(['b'])
    expect(filterContacts(list, { q: 'example.com' }).map((x) => x.id)).toEqual(['a'])
    expect(filterContacts(list, { q: 'vip' }).map((x) => x.id)).toEqual(['c'])
  })
  it('searches phone digits regardless of format', () => {
    expect(filterContacts(list, { q: '555-0101' }).map((x) => x.id)).toEqual(['b'])
  })
  it('filters by type, interest, source and tag together', () => {
    expect(filterContacts(list, { tag: 'Past Client' }).map((x) => x.id)).toEqual(['b', 'c'])
    expect(filterContacts(list, { tag: 'Past Client', interest: 'industrial' }).map((x) => x.id)).toEqual(['c'])
    expect(filterContacts(list, { source: 'miltonlease', type: 'tenant' }).map((x) => x.id)).toEqual(['a'])
    expect(filterContacts(list, { type: 'seller' })).toEqual([])
  })
})

describe('helpers', () => {
  it('sorts by last name', () => {
    expect(sortContacts(list).map((x) => x.last_name)).toEqual(['Ali', 'Khan', 'Wong'])
  })
  it('lists unique tags alphabetically', () => {
    expect(allTags(list)).toEqual(['Hot Prospect', 'Past Client', 'VIP'])
  })
  it('falls back to email or phone when there is no name', () => {
    expect(displayName(c({ email: 'x@example.com' }))).toBe('x@example.com')
    expect(displayName(c({}))).toBe('Unnamed contact')
    expect(initials(c({ first_name: 'sara', last_name: 'khan' }))).toBe('SK')
  })
  it('describes last activity in plain words', () => {
    const now = new Date(2026, 10, 17, 15)
    expect(relativeDay(null, now)).toBe('No activity yet')
    expect(relativeDay(new Date(2026, 10, 17, 8).toISOString(), now)).toBe('Today')
    expect(relativeDay(new Date(2026, 10, 16, 23).toISOString(), now)).toBe('Yesterday')
    expect(relativeDay(new Date(2026, 10, 5).toISOString(), now)).toBe('12 days ago')
  })
})
