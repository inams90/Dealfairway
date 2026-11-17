import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useProfile } from '../lib/useProfile'
import { Alert, Button, Field, PageTitle } from '../components/ui'
import { ChevronLeftIcon } from '../components/icons'

export function ProfilePage() {
  const { user } = useAuth()
  const { profile, setProfile, loading, error: loadError } = useProfile()
  const [form, setForm] = useState({ full_name: '', brokerage: '', phone: '', reco_number: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        brokerage: profile.brokerage,
        phone: profile.phone,
        reco_number: profile.reco_number ?? '',
      })
    }
  }, [profile])

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setMessage(null)
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: form.full_name.trim(),
        brokerage: form.brokerage.trim(),
        phone: form.phone.trim(),
        reco_number: form.reco_number.trim() || null,
      })
      .select()
      .single()
    setBusy(false)
    if (error) return setMessage({ kind: 'error', text: error.message })
    setProfile(data)
    setMessage({ kind: 'success', text: 'Profile saved.' })
  }

  return (
    <div>
      <Link to="/more" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-brand-deep/70">
        <ChevronLeftIcon width={18} height={18} /> More
      </Link>
      <PageTitle>Profile</PageTitle>
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {loadError && <Alert kind="error">{loadError}</Alert>}
          {message && <Alert kind={message.kind}>{message.text}</Alert>}
          <Field label="Email" name="email" value={user?.email ?? ''} disabled readOnly />
          <Field label="Full name" name="full_name" autoComplete="name" value={form.full_name} onChange={set('full_name')} />
          <Field label="Brokerage" name="brokerage" autoComplete="organization" value={form.brokerage} onChange={set('brokerage')} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          <Field
            label="RECO registration number (optional)"
            name="reco_number"
            value={form.reco_number}
            onChange={set('reco_number')}
          />
          <Button type="submit" disabled={busy}>
            Save profile
          </Button>
        </form>
      )}
    </div>
  )
}
