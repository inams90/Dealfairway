import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Alert, Button, Field } from '../../components/ui'
import { AuthLayout } from './AuthLayout'
import { MIN_PASSWORD_LENGTH } from './SignUpPage'

/** Reached from the password-reset email; the link signs the user in temporarily. */
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (!session) return <Navigate to="/forgot-password" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={busy || !password}>
          Save password
        </Button>
      </form>
    </AuthLayout>
  )
}
