import { describe, expect, it } from 'vitest'
import type { ContactRow } from '../../types/database'
import { buildCandidates, guessMapping, guessTarget, parseCsv, planImport } from './csvImport'

// Made-up people only. Header layout mirrors a typical real-estate CRM export.
const crmExport = `﻿"Main Contact Title","Main Contact First Name","Main Contact Last Name","Mail To","Home Address1","Home City/Town","Main Contact Phone Type 1","Main Contact Phone 1","Main Contact Phone Type 2","Main Contact Phone 2","Accepts Mass Email","Main Contact Email 1","Main Contact Email 2","Spouse/Partner First Name","Contact Type","Prospect/Client Type","Contact Groups","Original Source","Religion","Notes","Date Added","Contact Status"
"Mr.","Test","Person","Mr. Test Person","1 Example St","Milton","Home","(905) 555-0101","Mobile","905-555-0102","Yes","test.person@example.com","alt@example.com","Pat","Client","Buyer","","Referral","Private","Likes bungalows","2016-12-14 10:55:17 PM","Past Client"
"","Demo","Client","Demo Client","","","Mobile","+1 (416) 555-0103","","","Yes","DEMO@example.com","","","Prospect","Investor","","","","","2017-01-02 09:00:00 AM","Hot Prospect"
"","Same","Email","Same Email","","","","","","","Yes","demo@example.com","","","Client","","","","","","2017-01-03 09:00:00 AM","Current Client"
"","","","","","","","","","","No","","","","Client","","","","","","2017-01-04 09:00:00 AM","Unassigned"
`

describe('parseCsv', () => {
  it('reads headers and rows, stripping the byte-order mark', () => {
    const p = parseCsv(crmExport)
    expect(p.headers[0]).toBe('Main Contact Title')
    expect(p.rows).toHaveLength(4)
    expect(p.rows[0]['Main Contact First Name']).toBe('Test')
  })
})

describe('guessMapping', () => {
  it('maps a real-estate CRM export sensibly', () => {
    const m = guessMapping(parseCsv(crmExport).headers)
    expect(m).toMatchObject({
      'Main Contact Title': 'ignore',
      'Main Contact First Name': 'first_name',
      'Main Contact Last Name': 'last_name',
      'Mail To': 'ignore',
      'Home Address1': 'notes',
      'Main Contact Phone Type 1': 'ignore',
      'Main Contact Phone 1': 'phone',
      'Accepts Mass Email': 'ignore',
      'Main Contact Email 1': 'email',
      'Spouse/Partner First Name': 'notes',
      'Contact Type': 'tags',
      'Prospect/Client Type': 'type',
      'Original Source': 'source',
      Religion: 'ignore',
      Notes: 'notes',
      'Date Added': 'notes',
      'Contact Status': 'tags',
    })
  })

  it.each([
    // Google Contacts
    ['Given Name', 'first_name'],
    ['Family Name', 'last_name'],
    ['E-mail 1 - Value', 'email'],
    ['E-mail 1 - Type', 'ignore'],
    ['Phone 1 - Value', 'phone'],
    ['Phone 1 - Type', 'ignore'],
    ['Group Membership', 'tags'],
    ['Labels', 'tags'],
    // Outlook
    ['First Name', 'first_name'],
    ['E-mail Address', 'email'],
    ['Mobile Phone', 'phone'],
    ['Categories', 'tags'],
    ['Job Title', 'notes'],
    // Spreadsheet
    ['Name', 'full_name'],
    ['Property Type', 'property_interest'],
    ['Lead Source', 'source'],
  ])('%s → %s', (header, target) => {
    expect(guessTarget(header)).toBe(target)
  })
})

describe('buildCandidates', () => {
  const parsed = parseCsv(crmExport)
  const rows = buildCandidates(parsed, guessMapping(parsed.headers), '2026-11-17')

  it('builds a contact with a normalized mobile phone preferred over home', () => {
    expect(rows[0].contact).toMatchObject({
      first_name: 'Test',
      last_name: 'Person',
      email: 'test.person@example.com',
      phone: '+19055550102',
      type: 'buyer',
      source: 'referral',
      property_interest: null,
    })
  })

  it('keeps extra phones, emails, spouse, address and notes in the notes field', () => {
    const notes = rows[0].contact.notes
    expect(notes).toContain('Other phone (Home): (905) 555-0101')
    expect(notes).toContain('Other email: alt@example.com')
    expect(notes).toContain('Spouse/Partner First Name: Pat')
    expect(notes).toContain('Home Address1: 1 Example St')
    expect(notes).toContain('Notes: Likes bungalows')
    expect(notes).toContain('Source: Referral')
    expect(notes).not.toContain('Private') // religion is not imported
  })

  it('tags contacts with their CRM status plus "imported" and the date', () => {
    expect(rows[0].contact.tags).toEqual(['Client', 'Past Client', 'imported', 'imported 2026-11-17'])
    expect(rows[1].contact.type).toBe('investor')
  })

  it('lowercases emails and flags rows with nothing to import', () => {
    expect(rows[1].contact.email).toBe('demo@example.com')
    expect(rows[3].problem).toBe('No name, email or phone')
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5])
  })

  it('splits a full name when there are no first/last columns', () => {
    const p = parseCsv('Name,Email\nJordan Q Example,jq@example.com\n')
    const [c] = buildCandidates(p, guessMapping(p.headers), '2026-11-17')
    expect(c.contact).toMatchObject({ first_name: 'Jordan', last_name: 'Q Example' })
  })
})

describe('planImport', () => {
  const parsed = parseCsv(crmExport)
  const candidates = buildCandidates(parsed, guessMapping(parsed.headers), '2026-11-17')

  it('flags duplicates inside the file and leaves them out by default', () => {
    const plan = planImport(candidates, [])
    expect(plan.map((p) => p.include)).toEqual([true, true, false, false])
    expect(plan[2].duplicate).toEqual({ kind: 'file', rowNumber: 3, reason: 'email' })
  })

  it('flags rows that match a contact already in DealFairway', () => {
    const existing = [{ id: 'x', email: null, phone: '+19055550102', first_name: 'Test' } as ContactRow]
    const plan = planImport(candidates, existing)
    expect(plan[0].duplicate).toMatchObject({ kind: 'existing', match: { contact: { id: 'x' }, reason: 'phone' } })
    expect(plan[0].include).toBe(false)
  })
})
