import { useEffect } from 'react'

const SITE = 'A Thousand and One Cities'

/** Sets the document title, e.g. "Gabès — A Thousand and One Cities". */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : `ألف مدينة ومدينة · ${SITE}`
  }, [title])
}
