import { useCallback, useEffect, useState } from 'react'

/** Loads data on mount (and when deps change); exposes reload() for after edits. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const run = useCallback(fn, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    run()
      .then((d) => active && (setData(d), setError(null)))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [run, tick])

  return { data, setData, error, loading, reload: () => setTick((t) => t + 1) }
}
