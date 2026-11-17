import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createContact, getContact, listContacts, updateContact } from '../lib/data'
import { CONTACT_SOURCES, CONTACT_TYPES, PROPERTY_INTERESTS, displayName } from '../lib/contacts'
import { findDuplicates, type DuplicateMatch } from '../lib/duplicates'
import { normalizePhone } from '../lib/phone'
import type { ContactDraft } from '../lib/import/csvImport'
import type { ContactRow } from '../types/database'
import { Alert, BackLink, Button, Field, PageTitle, SelectField, TextAreaField } from '../components/ui'

type FormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  type: string
  property_interest: string
  source: string
  tags: string
  notes: string
}

const empty: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  type: 'other',
  property_interest: '',
  source: 'other',
  tags: '',
  notes: '',
}

export function toDraft(f: FormState): ContactDraft {
  const phone = f.phone.trim()
  return {
    first_name: f.first_name.trim(),
    last_name: f.last_name.trim(),
    email: f.email.trim().toLowerCase() || null,
    phone: phone ? (normalizePhone(phone) ?? phone) : null,
    type: f.type as ContactDraft['type'],
    property_interest: (f.property_interest || null) as ContactDraft['property_interest'],
    source: f.source as ContactDraft['source'],
    tags: [...new Set(f.tags.split(',').map((t) => t.trim()).filter(Boolean))],
    notes: f.notes.trim(),
  }
}

export function ContactFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(empty)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dupes, setDupes] = useState<DuplicateMatch<ContactRow>[] | null>(null)

  useEffect(() => {
    if (!id) return
    getContact(id)
      .then((c) => {
        if (c)
          setForm({
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email ?? '',
            phone: c.phone ?? '',
            type: c.type,
            property_interest: c.property_interest ?? '',
            source: c.source,
            tags: c.tags.join(', '),
            notes: c.notes,
          })
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function save(skipDuplicateCheck = false) {
    const draft = toDraft(form)
    if (!draft.first_name && !draft.last_name && !draft.email && !draft.phone) {
      setError('Add at least a name, email or phone number.')
      return
    }
    if (draft.email && !/.+@.+\..+/.test(draft.email)) {
      setError('That email address doesn’t look right.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (!skipDuplicateCheck) {
        const others = (await listContacts()).filter((c) => c.id !== id)
        const matches = findDuplicates(draft, others)
        if (matches.length) {
          setDupes(matches)
          setBusy(false)
          return
        }
      }
      const saved = editing ? await updateContact(id!, draft) : await createContact(draft)
      navigate(`/clients/${saved.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void save()
  }

  if (loading) return <p role="status">Loading…</p>

  return (
    <div>
      <BackLink to={editing ? `/clients/${id}` : '/clients'}>{editing ? 'Back' : 'Clients'}</BackLink>
      <PageTitle>{editing ? 'Edit client' : 'New client'}</PageTitle>

      {dupes ? (
        <div className="space-y-3" role="alertdialog" aria-labelledby="dupe-title">
          <h2 id="dupe-title" className="text-lg font-semibold">
            This client may already exist
          </h2>
          <ul className="space-y-2">
            {dupes.map((d) => (
              <li key={d.contact.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-deep/5">
                <p className="font-medium">{displayName(d.contact)}</p>
                <p className="text-sm text-brand-deep/60">Same {d.reason}</p>
                <Link to={`/clients/${d.contact.id}`} className="mt-2 inline-block min-h-11 py-2.5 text-sm font-semibold text-brand-fairway">
                  Open existing client
                </Link>
              </li>
            ))}
          </ul>
          <Button type="button" variant="secondary" onClick={() => setDupes(null)}>
            Go back and edit
          </Button>
          <Button type="button" disabled={busy} onClick={() => save(true)}>
            Save anyway
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="first_name" autoComplete="off" value={form.first_name} onChange={set('first_name')} />
            <Field label="Last name" name="last_name" autoComplete="off" value={form.last_name} onChange={set('last_name')} />
          </div>
          <Field label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={set('phone')} />
          <Field label="Email" name="email" type="email" inputMode="email" autoComplete="off" value={form.email} onChange={set('email')} />
          <SelectField label="Type" name="type" options={CONTACT_TYPES} value={form.type} onChange={set('type')} />
          <SelectField
            label="Property interest"
            name="property_interest"
            placeholder="Not set"
            options={PROPERTY_INTERESTS}
            value={form.property_interest}
            onChange={set('property_interest')}
          />
          <SelectField label="Source" name="source" options={CONTACT_SOURCES} value={form.source} onChange={set('source')} />
          <Field label="Tags" name="tags" hint="Separate with commas, e.g. Past Client, VIP" value={form.tags} onChange={set('tags')} />
          <TextAreaField label="Notes" name="notes" value={form.notes} onChange={set('notes')} />
          <Button type="submit" disabled={busy}>
            {editing ? 'Save changes' : 'Add client'}
          </Button>
        </form>
      )}
    </div>
  )
}
