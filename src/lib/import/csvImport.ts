import Papa from 'papaparse'
import type { ContactRow, ContactSource, ContactType, PropertyInterest } from '../../types/database'
import { DuplicateIndex, type DuplicateMatch } from '../duplicates'
import { normalizePhone } from '../phone'

/** Where a CSV column's value goes in DealFairway. */
export type ImportTarget =
  | 'ignore'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'type'
  | 'property_interest'
  | 'source'
  | 'tags'
  | 'notes'

export const IMPORT_TARGETS: { value: ImportTarget; label: string }[] = [
  { value: 'ignore', label: 'Don’t import' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'full_name', label: 'Full name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'type', label: 'Type (buyer, seller…)' },
  { value: 'property_interest', label: 'Property interest' },
  { value: 'source', label: 'Source' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Add to notes' },
]

export type ColumnMapping = Record<string, ImportTarget>

export type ContactDraft = Pick<
  ContactRow,
  'first_name' | 'last_name' | 'email' | 'phone' | 'type' | 'property_interest' | 'source' | 'notes' | 'tags'
>

export type ParsedCsv = { headers: string[]; rows: Record<string, string>[] }

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const headers = (result.meta.fields ?? []).filter((h) => h !== '')
  const rows = result.data.map((r) => {
    const clean: Record<string, string> = {}
    for (const h of headers) clean[h] = typeof r[h] === 'string' ? r[h].trim() : ''
    return clean
  })
  return { headers, rows }
}

// ---------------------------------------------------------------- guessing

const norm = (h: string) => h.toLowerCase().replace(/\s+/g, ' ').trim()

/** Columns we deliberately leave out by default (private or not useful in a CRM). */
const IGNORE = [
  /salutation/,
  /^mail to$/,
  /title$/, // "Main Contact Title" (Mr./Mrs.), "Job Title" handled below
  /mass email|direct mail|preferred method/,
  /phone type|phone \d+ - (type|label)|e-?mail \d+ - (type|label)/,
  /gender|religion|income|marital/,
  /^user\d$/,
  /country/,
]

export function guessTarget(header: string): ImportTarget {
  const h = norm(header)
  const spouse = /spouse|partner/.test(h)

  if (/job title|company|organization|business type/.test(h)) return 'notes'
  if (IGNORE.some((re) => re.test(h))) return 'ignore'
  if (spouse) return /name|e-?mail|phone|birth/.test(h) ? 'notes' : 'ignore'

  if (/(^|\b)(first|given) ?name/.test(h)) return 'first_name'
  if (/(^|\b)(last|family) ?name|surname/.test(h)) return 'last_name'
  if (/^(name|full name|display name|contact name)$/.test(h)) return 'full_name'
  if (/e-?mail/.test(h)) return 'email'
  if (/phone|mobile|cell/.test(h)) return 'phone'
  if (/source notes/.test(h)) return 'notes'
  if (/source/.test(h)) return 'source'
  if (/property (interest|type)/.test(h)) return 'property_interest'
  if (/contact type|status|group|labels?$|categor|tags?$/.test(h)) return 'tags'
  if (/client type|prospect|^type$|buyer|seller/.test(h)) return 'type'
  if (/note|interest|hobb|birth|anniversary|referr|address|city|town|province|state|postal|zip|date added|move in/.test(h))
    return 'notes'
  return 'ignore'
}

export function guessMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(headers.map((h) => [h, guessTarget(h)]))
}

// ---------------------------------------------------------------- value mapping

export function mapContactType(value: string): ContactType | null {
  const v = value.toLowerCase()
  if (/buyer|purchaser/.test(v)) return 'buyer'
  if (/seller|vendor/.test(v)) return 'seller'
  if (/landlord|owner/.test(v)) return 'landlord'
  if (/tenant|renter|lessee/.test(v)) return 'tenant'
  if (/investor/.test(v)) return 'investor'
  return null
}

export function mapSource(value: string): ContactSource | null {
  const v = value.toLowerCase()
  if (!v) return null
  if (/milton ?lease/.test(v)) return 'miltonlease'
  if (/referr|friend|family|past client/.test(v)) return 'referral'
  if (/walk/.test(v)) return 'walk_in'
  if (/phone|call/.test(v)) return 'phone'
  return 'other'
}

export function mapPropertyInterest(value: string): PropertyInterest | null {
  const v = value.toLowerCase()
  if (/industrial|warehouse/.test(v)) return 'industrial'
  if (/commercial|retail|office/.test(v)) return 'commercial'
  if (/residential|home|house|condo|townhouse/.test(v)) return 'residential'
  return null
}

/** For "Main Contact Phone 2" → "Main Contact Phone Type 2"; "Phone 1 - Value" → "Phone 1 - Label"/"Type". */
function phoneTypeHeaders(header: string): string[] {
  return [
    header.replace(/phone(\s*)(\d+)$/i, 'Phone Type$1$2'),
    header.replace(/- value$/i, '- Label'),
    header.replace(/- value$/i, '- Type'),
  ].filter((x) => x !== header)
}

const isMobile = (label: string) => /mobile|cell/i.test(label)

function splitTags(value: string): string[] {
  return value
    .split(/:::|[;,|]/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith('*') && t.length <= 50)
}

// ---------------------------------------------------------------- building contacts

export type ImportCandidate = {
  /** Row number as shown in a spreadsheet (header is row 1). */
  rowNumber: number
  contact: ContactDraft
  /** Why this row can't be imported (e.g. completely empty). */
  problem?: string
}

export function importTags(date: string) {
  return ['imported', `imported ${date}`]
}

export function buildCandidates(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  importDate: string,
): ImportCandidate[] {
  const cols = (t: ImportTarget) => parsed.headers.filter((h) => mapping[h] === t)
  const emailCols = cols('email')
  const phoneCols = cols('phone')

  return parsed.rows.map((row, i) => {
    const notes: string[] = []
    const get = (h: string) => row[h] ?? ''
    const first = (t: ImportTarget) => cols(t).map(get).find(Boolean) ?? ''

    let first_name = first('first_name')
    let last_name = first('last_name')
    const full = first('full_name')
    if (full && !first_name && !last_name) {
      const parts = full.split(/\s+/)
      first_name = parts[0]
      last_name = parts.slice(1).join(' ')
    }

    // Email: first value that looks like an email; others go to notes.
    const emails = emailCols.map((h) => ({ h, v: get(h) })).filter((x) => x.v)
    const primaryEmail = emails.find((x) => /.+@.+\..+/.test(x.v))
    for (const x of emails) if (x !== primaryEmail) notes.push(`Other email: ${x.v}`)

    // Phone: prefer a mobile number; others go to notes with their label.
    const phones = phoneCols
      .map((h) => {
        const typeHeader = phoneTypeHeaders(h).find((t) => t in row)
        const label = (typeHeader ? get(typeHeader) : '') || (isMobile(h) ? 'Mobile' : '')
        return { h, v: get(h), label }
      })
      .filter((x) => x.v)
    const primaryPhone = phones.find((x) => isMobile(x.label)) ?? phones[0]
    for (const x of phones) if (x !== primaryPhone) notes.push(`Other phone${x.label ? ` (${x.label})` : ''}: ${x.v}`)

    let type: ContactType = 'other'
    for (const v of cols('type').map(get).filter(Boolean)) {
      const t = mapContactType(v)
      if (t) {
        type = t
        break
      }
    }

    const property_interest = cols('property_interest').map(get).map(mapPropertyInterest).find(Boolean) ?? null

    let source: ContactSource = 'other'
    const sourceText = first('source')
    if (sourceText) {
      source = mapSource(sourceText) ?? 'other'
      if (source === 'other' || source === 'referral') notes.push(`Source: ${sourceText}`)
    }

    const tags = new Set<string>()
    for (const h of cols('tags')) splitTags(get(h)).forEach((t) => tags.add(t))
    importTags(importDate).forEach((t) => tags.add(t))

    for (const h of cols('notes')) {
      const v = get(h)
      if (v) notes.push(`${h}: ${v}`)
    }

    const contact: ContactDraft = {
      first_name: first_name.slice(0, 100),
      last_name: last_name.slice(0, 100),
      email: primaryEmail?.v.toLowerCase().slice(0, 320) ?? null,
      phone: primaryPhone ? (normalizePhone(primaryPhone.v) ?? primaryPhone.v.slice(0, 40)) : null,
      type,
      property_interest,
      source,
      notes: notes.join('\n').slice(0, 20000),
      tags: [...tags],
    }

    const problem =
      !contact.first_name && !contact.last_name && !contact.email && !contact.phone
        ? 'No name, email or phone'
        : undefined
    return { rowNumber: i + 2, contact, problem }
  })
}

// ---------------------------------------------------------------- duplicates

export type ImportDuplicate =
  | { kind: 'existing'; match: DuplicateMatch<ContactRow> }
  | { kind: 'file'; rowNumber: number; reason: DuplicateMatch<unknown>['reason'] }

export type PlannedRow = ImportCandidate & { duplicate: ImportDuplicate | null; include: boolean }

/**
 * Marks rows that match a contact already in DealFairway, or an earlier row in
 * the same file. Duplicates are left out by default; the user can include them.
 */
export function planImport(candidates: ImportCandidate[], existing: ContactRow[]): PlannedRow[] {
  const existingIdx = new DuplicateIndex(existing)
  const fileIdx = new DuplicateIndex<ContactDraft & { rowNumber: number }>()
  return candidates.map((c) => {
    let duplicate: ImportDuplicate | null = null
    const ex = existingIdx.find(c.contact)
    if (ex) duplicate = { kind: 'existing', match: ex }
    else {
      const f = fileIdx.find(c.contact)
      if (f) duplicate = { kind: 'file', rowNumber: f.contact.rowNumber, reason: f.reason }
    }
    if (!c.problem) fileIdx.add({ ...c.contact, rowNumber: c.rowNumber })
    return { ...c, duplicate, include: !c.problem && !duplicate }
  })
}
