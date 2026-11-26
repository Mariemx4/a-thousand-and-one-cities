import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon.jsx'
import { StatusBadge } from '../../ui/kit.jsx'
import { reference } from '../../ui/format.js'

/** Editorial two-column page used by every storefront form. */
export function FormLayout({ eyebrow, title, intro, aside, children }) {
  return (
    <section className="form-page">
      <div className="form-intro">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {intro}
        {aside}
      </div>
      <div className="form-card">{children}</div>
    </section>
  )
}

/** Shown after a successful submission. */
export function Confirmation({ title, recordId, status, children, actions }) {
  return (
    <div className="confirmation" role="status">
      <span className="confirm-mark"><Icon name="check" size={22} /></span>
      <h2>{title}</h2>
      {recordId && (
        <p className="confirm-ref">
          Reference <b>{reference(recordId)}</b> {status && <StatusBadge status={status} />}
        </p>
      )}
      {children}
      <div className="confirm-actions">{actions}</div>
    </div>
  )
}

export const BackHome = () => <Link className="btn-ghost" to="/">Back to the library</Link>
