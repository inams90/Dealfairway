import { describe, expect, it } from 'vitest'
import { firstName, formatLongDate, greetingFor } from './greeting'

describe('greetingFor', () => {
  it('says good morning before noon', () => {
    expect(greetingFor(new Date(2026, 10, 17, 8))).toBe('Good morning')
  })
  it('says good afternoon from noon to 6pm', () => {
    expect(greetingFor(new Date(2026, 10, 17, 12))).toBe('Good afternoon')
    expect(greetingFor(new Date(2026, 10, 17, 17, 59))).toBe('Good afternoon')
  })
  it('says good evening from 6pm', () => {
    expect(greetingFor(new Date(2026, 10, 17, 18))).toBe('Good evening')
  })
})

describe('formatLongDate', () => {
  it('formats weekday, month and day', () => {
    expect(formatLongDate(new Date(2026, 10, 17))).toBe('Tuesday, November 17')
  })
})

describe('firstName', () => {
  it('returns the first word', () => {
    expect(firstName('  Inam Sherwani ')).toBe('Inam')
    expect(firstName(null)).toBe('')
  })
})
