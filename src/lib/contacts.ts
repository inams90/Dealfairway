import type { ContactRow, ContactSource, ContactType, PropertyInterest } from '../types/database'

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'investor', label: 'Investor' },
  { value: 'other', label: 'Other' },
]

export const PROPERTY_INTERESTS: { value: PropertyInterest; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
]

export const CONTACT_SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'miltonlease', label: 'MiltonLease' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
]

const labelOf = <T extends string>(list: { value: T; label: string }[], v: T | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? ''

export const typeLabel = (v: ContactType | null | undefined) => labelOf(CONTACT_TYPES, v)
export const sourceLabel = (v: ContactSource | null | undefined) => labelOf(CONTACT_SOURCES, v)
export const interestLabel = (v: PropertyInterest | null | undefined) => labelOf(PROPERTY_INTERESTS, v)

type NameLike = Pick<ContactRow, 'first_name' | 'last_name'> & Partial<Pick<ContactRow, 'email' | 'phone'>>

export function displayName(c: NameLike) {
  const name = `${c.first_name} ${c.last_name}`.trim()
  return name || c.email || c.phone || 'Unnamed contact'
}

export function initials(c: NameLike) {
  const letters = [c.first_name, c.last_name].map((s) => s.trim()[0] ?? '').join('')
  return (letters || displayName(c)[0] || '?').toUpperCase()
}

export type ContactFilters = {
  q?: string
  type?: ContactType | ''
  interest?: PropertyInterest | ''
  source?: ContactSource | ''
  tag?: string
}

/** Client-side search + filter. Search matches name, email, phone digits and tags. */
export function filterContacts<T extends ContactRow>(contacts: T[], f: ContactFilters): T[] {
  const q = (f.q ?? '').trim().toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  return contacts.filter((c) => {
    if (f.type && c.type !== f.type) return false
    if (f.interest && c.property_interest !== f.interest) return false
    if (f.source && c.source !== f.source) return false
    if (f.tag && !c.tags.includes(f.tag)) return false
    if (!q) return true
    const hay = [c.first_name, c.last_name, `${c.first_name} ${c.last_name}`, c.email ?? '', ...c.tags]
      .join(' ')
      .toLowerCase()
    if (q.split(/\s+/).every((word) => hay.includes(word))) return true
    return qDigits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(qDigits)
  })
}

/** Sort A→Z by last name, then first name; nameless contacts last. */
export function sortContacts<T extends ContactRow>(contacts: T[]): T[] {
  const key = (c: ContactRow) => `${c.last_name || c.first_name || '~'} ${c.first_name}`.toLowerCase()
  return [...contacts].sort((a, b) => key(a).localeCompare(key(b)))
}

export function allTags(contacts: ContactRow[]): string[] {
  return [...new Set(contacts.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b))
}

/** "Today", "Yesterday", "12 days ago", or a date for older activity. */
export function relativeDay(iso: string | null, now = new Date()): string {
  if (!iso) return 'No activity yet'
  const d = new Date(iso)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}
