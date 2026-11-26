import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/index.js'

/**
 * Load data through the API and keep it fresh: the fetcher re-runs whenever
 * the data source reports a change (a write in another component, another
 * tab, or the phone preview). Returns { data, error, loading, reload }.
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const latest = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchFn = useCallback(fetcher, deps)

  const run = useCallback(() => {
    const ticket = ++latest.current
    Promise.resolve()
      .then(fetchFn)
      .then(
        (data) => ticket === latest.current && setState({ data, error: null, loading: false }),
        (error) => ticket === latest.current && setState((s) => ({ data: s.data, error, loading: false }))
      )
  }, [fetchFn])

  useEffect(() => {
    setState({ data: undefined, error: null, loading: true })
    run()
    const unsubscribe = api.subscribe(run)
    return () => {
      latest.current++
      unsubscribe()
    }
  }, [run])

  return { ...state, reload: run }
}

/** The signed-in demo contributor, or null. */
export function useSession() {
  const { data, loading } = useApi(() => api.auth.me(), [])
  return { account: data ?? null, loading }
}
