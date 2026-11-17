import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listContacts } from '../lib/data'
import { useAsync } from '../lib/useAsync'
import {
  CONTACT_SOURCES,
  CONTACT_TYPES,
  PROPERTY_INTERESTS,
  allTags,
  displayName,
  filterContacts,
  initials,
  relativeDay,
  sortContacts,
  typeLabel,
  type ContactFilters,
} from '../lib/contacts'
import { Alert, Avatar, EmptyState, PageTitle, SelectField } from '../components/ui'
import { ChevronRightIcon, FilterIcon, PlusIcon, SearchIcon } from '../components/icons'

const FILTER_KEYS = ['type', 'interest', 'source', 'tag'] as const

export function ClientsPage() {
  const { data, error, loading } = useAsync(listContacts, [])
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const filters: ContactFilters = {
    q: params.get('q') ?? '',
    type: (params.get('type') ?? '') as ContactFilters['type'],
    interest: (params.get('interest') ?? '') as ContactFilters['interest'],
    source: (params.get('source') ?? '') as ContactFilters['source'],
    tag: params.get('tag') ?? '',
  }
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const contacts = useMemo(() => sortContacts(data ?? []), [data])
  const tags = useMemo(() => allTags(contacts), [contacts])
  const shown = useMemo(() => filterContacts(contacts, filters), [contacts, params]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageTitle>Clients</PageTitle>

      <div className="sticky top-14 z-[5] -mx-4 space-y-2 bg-brand-cream px-4 pb-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search clients</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-brand-deep/40" width={20} />
            <input
              type="search"
              placeholder="Search name, email, phone, tag"
              value={filters.q}
              onChange={(e) => setParam('q', e.target.value)}
              className="min-h-12 w-full rounded-xl border border-brand-deep/20 bg-white pr-3 pl-10 text-base outline-none focus:border-brand-fairway focus:ring-2 focus:ring-brand-fairway/30"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={`relative flex min-h-12 min-w-12 items-center justify-center rounded-xl border ${
              activeFilters ? 'border-brand-fairway bg-brand-fairway/10' : 'border-brand-deep/20 bg-white'
            }`}
          >
            <FilterIcon />
            <span className="sr-only">Filters</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-fairway text-xs text-white">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-deep/5">
            <SelectField label="Type" name="f-type" placeholder="Any" options={CONTACT_TYPES} value={filters.type} onChange={(e) => setParam('type', e.target.value)} />
            <SelectField label="Property" name="f-interest" placeholder="Any" options={PROPERTY_INTERESTS} value={filters.interest} onChange={(e) => setParam('interest', e.target.value)} />
            <SelectField label="Source" name="f-source" placeholder="Any" options={CONTACT_SOURCES} value={filters.source} onChange={(e) => setParam('source', e.target.value)} />
            <SelectField label="Tag" name="f-tag" placeholder="Any" options={tags.map((t) => ({ value: t, label: t }))} value={filters.tag} onChange={(e) => setParam('tag', e.target.value)} />
            {activeFilters > 0 && (
              <button
                type="button"
                className="col-span-2 min-h-11 text-sm font-medium text-brand-fairway"
                onClick={() => {
                  const next = new URLSearchParams(params)
                  FILTER_KEYS.forEach((k) => next.delete(k))
                  setParams(next, { replace: true })
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && !data && <p role="status" className="py-6 text-center text-brand-deep/60">Loading clients…</p>}

      {data && contacts.length === 0 && (
        <EmptyState title="No clients yet">
          Tap + to add one, or{' '}
          <Link to="/more/import" className="font-semibold text-brand-fairway underline">
            import your contacts
          </Link>
          .
        </EmptyState>
      )}

      {data && contacts.length > 0 && (
        <>
          <p className="mb-2 text-sm text-brand-deep/60">
            {shown.length === contacts.length ? `${contacts.length} clients` : `${shown.length} of ${contacts.length} clients`}
          </p>
          {shown.length === 0 ? (
            <EmptyState title="No matches">Try a different search or clear the filters.</EmptyState>
          ) : (
            <ul aria-label="Client list" className="divide-y divide-brand-deep/10 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-deep/5">
              {shown.map((c) => (
                <li key={c.id}>
                  <Link to={`/clients/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2">
                    <Avatar text={initials(c)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{displayName(c)}</span>
                      <span className="block truncate text-sm text-brand-deep/60">
                        {typeLabel(c.type)} · {relativeDay(c.last_activity_at)}
                      </span>
                    </span>
                    <ChevronRightIcon className="shrink-0 text-brand-deep/30" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link
        to="/clients/new"
        aria-label="Add client"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-fairway text-white shadow-lg"
      >
        <PlusIcon width={28} height={28} />
      </Link>
    </div>
  )
}
