import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { importContacts, listContacts } from '../lib/data'
import { displayName, typeLabel } from '../lib/contacts'
import { formatPhone } from '../lib/phone'
import {
  IMPORT_TARGETS,
  buildCandidates,
  guessMapping,
  parseCsv,
  planImport,
  type ColumnMapping,
  type ImportTarget,
  type ParsedCsv,
  type PlannedRow,
} from '../lib/import/csvImport'
import type { ContactRow } from '../types/database'
import { Alert, BackLink, Button, Card, Chip, PageTitle } from '../components/ui'

type Step = 'choose' | 'map' | 'review' | 'importing' | 'done'

const MAX_FILE_BYTES = 5 * 1024 * 1024

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ImportContactsPage() {
  const [step, setStep] = useState<Step>('choose')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [existing, setExisting] = useState<ContactRow[]>([])
  const [plan, setPlan] = useState<PlannedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState(0)
  const [showEmptyCols, setShowEmptyCols] = useState(false)
  const importDate = useMemo(today, [])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (file.size > MAX_FILE_BYTES) return setError('That file is larger than 5 MB. Split it into smaller files.')
    const p = parseCsv(await file.text())
    if (p.headers.length === 0 || p.rows.length === 0) return setError('No rows found. Is this a CSV file with a header row?')
    try {
      setExisting(await listContacts())
    } catch (err) {
      return setError((err as Error).message)
    }
    setFileName(file.name)
    setParsed(p)
    setMapping(guessMapping(p.headers))
    setStep('map')
  }

  const columnInfo = useMemo(() => {
    if (!parsed) return []
    return parsed.headers.map((h) => {
      const values = parsed.rows.map((r) => r[h]).filter(Boolean)
      return { header: h, sample: values[0] ?? '', filled: values.length }
    })
  }, [parsed])

  function goToReview() {
    if (!parsed) return
    const targets = Object.values(mapping)
    if (!targets.some((t) => ['first_name', 'last_name', 'full_name', 'email', 'phone'].includes(t))) {
      return setError('Match at least one column to a name, email or phone.')
    }
    setError(null)
    setPlan(planImport(buildCandidates(parsed, mapping, importDate), existing))
    setStep('review')
  }

  const toImport = plan.filter((r) => r.include)
  const duplicates = plan.filter((r) => r.duplicate)
  const problems = plan.filter((r) => r.problem)

  const toggle = (rowNumber: number) =>
    setPlan((p) => p.map((r) => (r.rowNumber === rowNumber && !r.problem ? { ...r, include: !r.include } : r)))

  async function runImport() {
    setStep('importing')
    setProgress(0)
    try {
      const n = await importContacts(
        toImport.map((r) => r.contact),
        setProgress,
      )
      setImported(n)
      setStep('done')
    } catch (e) {
      setError(`Import stopped: ${(e as Error).message}. ${progress} contacts were saved before the error.`)
      setStep('review')
    }
  }

  return (
    <div className="space-y-4">
      <BackLink to="/more">More</BackLink>
      <PageTitle>Import contacts</PageTitle>
      {error && <Alert kind="error">{error}</Alert>}

      {step === 'choose' && (
        <Card>
          <p className="mb-3 text-sm text-brand-deep/80">
            Choose a CSV file exported from your old CRM, Google Contacts, Outlook or a spreadsheet. Nothing is saved until
            you review and confirm.
          </p>
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-brand-deep px-4 font-semibold text-brand-cream">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} aria-label="CSV file" />
          </label>
        </Card>
      )}

      {step === 'map' && parsed && (
        <>
          <p className="text-sm text-brand-deep/70">
            <strong>{fileName}</strong>: {parsed.rows.length} rows. Check where each column goes. We’ve made our best guess.
          </p>
          <ul className="space-y-2">
            {columnInfo
              .filter((c) => showEmptyCols || c.filled > 0)
              .map((c) => (
                <li key={c.header} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-deep/5">
                  <label className="block">
                    <span className="block font-medium">{c.header}</span>
                    <span className="block truncate text-xs text-brand-deep/60">
                      {c.filled ? `e.g. ${c.sample} · ${c.filled} filled` : 'Empty in every row'}
                    </span>
                    <select
                      aria-label={`Import "${c.header}" as`}
                      className="mt-2 block min-h-11 w-full rounded-xl border border-brand-deep/20 bg-white px-3"
                      value={mapping[c.header]}
                      onChange={(e) => setMapping((m) => ({ ...m, [c.header]: e.target.value as ImportTarget }))}
                    >
                      {IMPORT_TARGETS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
          </ul>
          {columnInfo.some((c) => c.filled === 0) && (
            <button type="button" className="min-h-11 text-sm text-brand-deep/70 underline" onClick={() => setShowEmptyCols((s) => !s)}>
              {showEmptyCols ? 'Hide' : 'Show'} {columnInfo.filter((c) => c.filled === 0).length} empty columns
            </button>
          )}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] space-y-2 bg-brand-cream pt-2">
            <Button type="button" onClick={goToReview}>
              Review import
            </Button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat value={toImport.length} label="Will import" />
            <Stat value={duplicates.length} label="Duplicates" />
            <Stat value={problems.length} label="Can’t import" />
          </div>

          <Card title="Preview (first 10)">
            <ul className="divide-y divide-brand-deep/10 text-sm">
              {plan.slice(0, 10).map((r) => (
                <li key={r.rowNumber} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{displayName(r.contact)}</span>
                    {r.include ? <Chip tone="green">Import</Chip> : <Chip>Skip</Chip>}
                  </div>
                  <div className="text-brand-deep/60">
                    {[r.contact.email, r.contact.phone && formatPhone(r.contact.phone), typeLabel(r.contact.type)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.contact.tags.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {duplicates.length > 0 && (
            <Card title="Possible duplicates">
              <p className="mb-2 text-sm text-brand-deep/70">
                These share an email or phone with an existing client or an earlier row. They’re skipped unless you tick
                them. You can merge clients later.
              </p>
              <ul className="divide-y divide-brand-deep/10 text-sm">
                {duplicates.map((r) => {
                  const d = r.duplicate!
                  const other =
                    d.kind === 'existing'
                      ? `${displayName(d.match.contact)} (already in DealFairway, same ${d.match.reason})`
                      : `${displayName(plan.find((x) => x.rowNumber === d.rowNumber)!.contact)} (row ${d.rowNumber}, same ${d.reason})`
                  return (
                    <li key={r.rowNumber}>
                      <label className="flex min-h-12 items-start gap-3 py-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 accent-brand-fairway"
                          checked={r.include}
                          onChange={() => toggle(r.rowNumber)}
                        />
                        <span>
                          <span className="font-medium">
                            Row {r.rowNumber}: {displayName(r.contact)}
                          </span>
                          <span className="block text-brand-deep/60">Matches {other}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {problems.length > 0 && (
            <Card title="Can’t import">
              <ul className="text-sm text-brand-deep/70">
                {problems.map((r) => (
                  <li key={r.rowNumber}>
                    Row {r.rowNumber}: {r.problem}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-sm text-brand-deep/70">
            Imported clients are tagged <Chip>imported</Chip> and <Chip>imported {importDate}</Chip>.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('map')}>
              Back
            </Button>
            <Button type="button" disabled={toImport.length === 0} onClick={runImport}>
              Import {toImport.length}
            </Button>
          </div>
        </>
      )}

      {step === 'importing' && (
        <Card>
          <p role="status" className="mb-2">
            Importing… {progress} of {toImport.length}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-brand-deep/10">
            <div className="h-full bg-brand-fairway transition-all" style={{ width: `${(progress / Math.max(1, toImport.length)) * 100}%` }} />
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <p role="status" className="mb-3 text-lg font-semibold">
            Imported {imported} clients.
          </p>
          <Link
            to={`/clients?tag=${encodeURIComponent(`imported ${importDate}`)}`}
            className="flex min-h-12 items-center justify-center rounded-xl bg-brand-deep font-semibold text-brand-cream"
          >
            View imported clients
          </Link>
        </Card>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-deep/5">
      <div className="text-2xl font-bold text-brand-fairway">{value}</div>
      <div className="text-xs text-brand-deep/70">{label}</div>
    </div>
  )
}
