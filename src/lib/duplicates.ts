import { normalizePhone } from './phone'

type Matchable = { email?: string | null; phone?: string | null }

export const emailKey = (email: string | null | undefined) => (email ?? '').trim().toLowerCase() || null
export const phoneKey = (phone: string | null | undefined) => normalizePhone(phone)

export type DuplicateMatch<T> = { contact: T; reason: 'email' | 'phone' | 'email and phone' }

/**
 * Duplicate rule (Prompt 6): two contacts are the same person if they share an
 * email address (case-insensitive) or a phone number (compared in E.164, Canada default).
 */
export function findDuplicates<T extends Matchable>(candidate: Matchable, existing: T[]): DuplicateMatch<T>[] {
  const e = emailKey(candidate.email)
  const p = phoneKey(candidate.phone)
  if (!e && !p) return []
  const out: DuplicateMatch<T>[] = []
  for (const c of existing) {
    const sameEmail = !!e && emailKey(c.email) === e
    const samePhone = !!p && phoneKey(c.phone) === p
    if (sameEmail || samePhone) {
      out.push({ contact: c, reason: sameEmail && samePhone ? 'email and phone' : sameEmail ? 'email' : 'phone' })
    }
  }
  return out
}

/** Fast lookup index for checking many candidates (e.g. a CSV import). */
export class DuplicateIndex<T extends Matchable> {
  private byEmail = new Map<string, T>()
  private byPhone = new Map<string, T>()

  constructor(items: T[] = []) {
    items.forEach((i) => this.add(i))
  }

  add(item: T) {
    const e = emailKey(item.email)
    const p = phoneKey(item.phone)
    if (e && !this.byEmail.has(e)) this.byEmail.set(e, item)
    if (p && !this.byPhone.has(p)) this.byPhone.set(p, item)
  }

  find(candidate: Matchable): DuplicateMatch<T> | null {
    const e = emailKey(candidate.email)
    const p = phoneKey(candidate.phone)
    const byE = e ? this.byEmail.get(e) : undefined
    const byP = p ? this.byPhone.get(p) : undefined
    if (byE && byE === byP) return { contact: byE, reason: 'email and phone' }
    if (byE) return { contact: byE, reason: 'email' }
    if (byP) return { contact: byP, reason: 'phone' }
    return null
  }
}
