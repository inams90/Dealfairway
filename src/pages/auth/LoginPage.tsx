import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { redirectUrl } from '../../lib/auth'
import { Alert, Button, Field } from '../../components/ui'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setError(friendlyAuthError(error.message))
      // On success the auth listener updates the session and the router redirects.
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: redirectUrl('/') },
      })
      if (error) setError(friendlyAuthError(error.message))
      else setSent(true)
    }
    setBusy(false)
  }

  return (
    <AuthLayout
      title="Log in"
      footer={
        <>
          <p>
            New to DealFairway?{' '}
            <Link className="font-semibold text-brand-fairway underline" to="/signup">
              Create an account
            </Link>
          </p>
          <p>
            <Link className="text-brand-deep/70 underline" to="/forgot-password">
              Forgot password?
            </Link>
          </p>
        </>
      }
    >
      {sent ? (
        <Alert kind="success">Check your email for a sign-in link. You can close this tab.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
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
          {mode === 'password' && (
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <Button type="submit" disabled={busy || !email || (mode === 'password' && !password)}>
            {mode === 'password' ? 'Log in' : 'Email me a sign-in link'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMode(mode === 'password' ? 'magic' : 'password')
              setError(null)
            }}
          >
            {mode === 'password' ? 'Use a sign-in link instead' : 'Use my password instead'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function friendlyAuthError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email and password don’t match. Try again or reset your password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.'
  if (m.includes('signups not allowed') || m.includes('user not found')) return 'No account found for that email.'
  if (m.includes('already registered')) return 'An account with that email already exists. Try logging in.'
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.'
  return message
}
