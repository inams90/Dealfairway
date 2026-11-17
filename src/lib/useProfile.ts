import { useEffect, useState } from 'react'
import type { ProfileRow } from '../types/database'
import { supabase } from './supabase'
import { useAuth } from './auth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        setProfile(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  return { profile, setProfile, loading, error }
}
