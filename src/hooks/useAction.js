import { useCallback, useState } from 'react'
import { useToast } from '../ui/Toast.jsx'

/**
 * Run a write (an API call) with a pending flag and error reporting.
 * Field errors (422) are returned to the caller; anything else is toasted.
 */
export function useAction() {
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const run = useCallback(
    async (fn, { success } = {}) => {
      setPending(true)
      try {
        const result = await fn()
        if (success) toast(typeof success === 'function' ? success(result) : success)
        return { ok: true, result }
      } catch (error) {
        if (error?.fieldErrors) return { ok: false, fieldErrors: error.fieldErrors, error }
        toast(error?.message || 'Something went wrong. Please try again.', { tone: 'error' })
        return { ok: false, error }
      } finally {
        setPending(false)
      }
    },
    [toast]
  )

  return [run, pending]
}
