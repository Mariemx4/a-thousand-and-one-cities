import { Link } from 'react-router-dom'
import { useTitle } from '../hooks/useTitle.js'
import { EmptyState } from '../ui/kit.jsx'

export default function NotFound() {
  useTitle('Page not found')
  return (
    <section className="page-narrow">
      <EmptyState title="This page is not in the library." action={<Link className="btn-primary" to="/">Back to the entrance</Link>}>
        The link may be old, or the page may still be a draft.
      </EmptyState>
    </section>
  )
}
