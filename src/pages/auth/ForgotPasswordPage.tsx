import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { redirectUrl } from '../../lib/auth'
import { Alert, Button, Field } from '../../components/ui'
import { AuthLayout } from './AuthLayout'
import { friendlyAuthError } from './LoginPage'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl('/reset-password'),
    })
    setBusy(false)
    if (error) setError(friendlyAuthError(error.message))
    else setSent(true)
  }

  return (
    <AuthLayout
      title="Reset your password"
      footer={
        <Link className="font-semibold text-brand-fairway underline" to="/login">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <Alert kind="success">If an account exists for {email}, a reset link is on its way.</Alert>
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
          <Button type="submit" disabled={busy || !email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
