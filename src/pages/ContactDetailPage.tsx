import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteContact, getContact, listActivityForContact, listInquiriesForContact, listTasksForContact } from '../lib/data'
import { useAsync } from '../lib/useAsync'
import { displayName, initials, interestLabel, sourceLabel, typeLabel } from '../lib/contacts'
import { formatPhone } from '../lib/phone'
import { Alert, Avatar, BackLink, Card, Chip, EmptyState } from '../components/ui'
import { MailIcon, MessageIcon, PhoneIcon } from '../components/icons'
import type { ActivityKind } from '../types/database'

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  text: 'Text',
  meeting: 'Meeting',
  status_change: 'Status change',
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function ContactDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const contact = useAsync(() => getContact(id), [id])
  const tasks = useAsync(() => listTasksForContact(id), [id])
  const inquiries = useAsync(() => listInquiriesForContact(id), [id])
  const activity = useAsync(() => listActivityForContact(id), [id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (contact.loading && !contact.data) return <p role="status">Loading…</p>
  if (contact.error) return <Alert kind="error">{contact.error}</Alert>
  const c = contact.data
  if (!c) {
    return (
      <div>
        <BackLink to="/clients">Clients</BackLink>
        <EmptyState title="Client not found">It may have been deleted.</EmptyState>
      </div>
    )
  }

  const tel = c.phone ? `tel:${c.phone}` : undefined
  const sms = c.phone ? `sms:${c.phone}` : undefined
  const mail = c.email ? `mailto:${c.email}` : undefined
  const actions = [
    { label: 'Call', href: tel, icon: PhoneIcon },
    { label: 'Text', href: sms, icon: MessageIcon },
    { label: 'Email', href: mail, icon: MailIcon },
  ]

  async function onDelete() {
    try {
      await deleteContact(id)
      navigate('/clients', { replace: true })
    } catch (e) {
      setDeleteError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackLink to="/clients">Clients</BackLink>
        <Link to={`/clients/${id}/edit`} className="min-h-11 px-2 py-2.5 text-sm font-semibold text-brand-fairway">
          Edit
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Avatar text={initials(c)} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{displayName(c)}</h1>
          <div className="mt-1 flex flex-wrap gap-1">
            <Chip tone="green">{typeLabel(c.type)}</Chip>
            {c.property_interest && <Chip>{interestLabel(c.property_interest)}</Chip>}
            <Chip>Source: {sourceLabel(c.source)}</Chip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ label, href, icon: Icon }) =>
          href ? (
            <a
              key={label}
              href={href}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-brand-deep text-sm font-semibold text-brand-cream"
            >
              <Icon /> {label}
            </a>
          ) : (
            <span
              key={label}
              aria-disabled="true"
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-brand-deep/10 text-sm font-semibold text-brand-deep/40"
            >
              <Icon /> {label}
            </span>
          ),
        )}
      </div>

      <Card title="Details">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-brand-deep/60">Phone</dt>
            <dd>{c.phone ? formatPhone(c.phone) : '—'}</dd>
          </div>
          <div>
            <dt className="text-brand-deep/60">Email</dt>
            <dd className="break-all">{c.email ?? '—'}</dd>
          </div>
          {c.tags.length > 0 && (
            <div>
              <dt className="text-brand-deep/60">Tags</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <Link key={t} to={`/clients?tag=${encodeURIComponent(t)}`}>
                    <Chip>{t}</Chip>
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {c.notes && (
            <div>
              <dt className="text-brand-deep/60">Notes</dt>
              <dd className="whitespace-pre-wrap">{c.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card title="Tasks">
        {tasks.data?.length ? (
          <ul className="space-y-2 text-sm">
            {tasks.data.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className={t.status === 'done' ? 'text-brand-deep/50 line-through' : ''}>{t.title}</span>
                {t.due_at && <span className="shrink-0 text-brand-deep/60">{fmtDateTime(t.due_at)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-deep/60">No tasks for this client.</p>
        )}
      </Card>

      <Card title="Inquiries">
        {inquiries.data?.length ? (
          <ul className="space-y-2 text-sm">
            {inquiries.data.map((q) => (
              <li key={q.id}>
                <div className="flex justify-between gap-2 text-brand-deep/60">
                  <span>{fmtDateTime(q.created_at)}</span>
                  <Chip tone={q.status === 'new' ? 'red' : 'plain'}>{q.status.replace('_', ' ')}</Chip>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap">{q.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-deep/60">No inquiries from this client.</p>
        )}
      </Card>

      <Card title="Activity">
        {activity.data?.length ? (
          <ol className="space-y-3 border-l-2 border-brand-fairway/30 pl-3 text-sm">
            {activity.data.map((a) => (
              <li key={a.id}>
                <div className="text-brand-deep/60">
                  <strong className="text-brand-deep">{ACTIVITY_LABELS[a.kind]}</strong> · {fmtDateTime(a.occurred_at)}
                </div>
                {a.body && <p className="whitespace-pre-wrap">{a.body}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-brand-deep/60">No activity logged yet.</p>
        )}
      </Card>

      <div className="pt-2">
        {deleteError && <Alert kind="error">{deleteError}</Alert>}
        {confirmDelete ? (
          <div className="space-y-2 rounded-2xl border border-brand-red/30 bg-white p-4">
            <p className="text-sm">
              Delete <strong>{displayName(c)}</strong>? Their activity is deleted too; tasks and inquiries are kept but unlinked.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-12 rounded-xl border border-brand-deep/20 bg-white font-semibold">
                Cancel
              </button>
              <button type="button" onClick={onDelete} className="min-h-12 rounded-xl bg-brand-red font-semibold text-white">
                Delete client
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-12 w-full text-sm font-semibold text-brand-red">
            Delete client
          </button>
        )}
      </div>
    </div>
  )
}
