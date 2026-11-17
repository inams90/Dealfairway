import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { redirectUrl } from '../../lib/auth'
import { Alert, Button, Field } from '../../components/ui'
import { AuthLayout } from './AuthLayout'
import { friendlyAuthError } from './LoginPage'

export const MIN_PASSWORD_LENGTH = 8

export function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // full_name is copied into the profiles table by a database trigger.
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: redirectUrl('/') },
    })
    setBusy(false)
    if (error) return setError(friendlyAuthError(error.message))
    if (!data.session) setNeedsConfirm(true)
    // With a session, the auth listener signs the user in and the router redirects.
  }

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <p>
          Already have an account?{' '}
          <Link className="font-semibold text-brand-fairway underline" to="/login">
            Log in
          </Link>
        </p>
      }
    >
      {needsConfirm ? (
        <Alert kind="success">
          Almost there! We sent a confirmation link to <strong>{email}</strong>. Open it on this phone to finish.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <Field
            label="Full name"
            name="full_name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy || !email || !password || !fullName}>
            Create account
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
