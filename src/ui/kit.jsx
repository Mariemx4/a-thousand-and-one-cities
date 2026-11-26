// Small shared building blocks used across the storefront and admin.
import { useEffect, useRef } from 'react'
import { STATUS_META } from '../domain/constants.js'
import { Icon } from './Icon.jsx'

export function StatusBadge({ status, label }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'mute' }
  return <span className={`badge tone-${meta.tone}`}>{label ?? meta.label}</span>
}

/** Label + control + hint/error, with ids wired for accessibility. */
export function Field({ id, label, hint, error, optional, children, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="field-optional">optional</span>}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${id}-err`} role="alert">{error}</span>
      ) : hint ? (
        <span className="field-hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  )
}

/** Props for an input bound to a form object: value, onChange, aria. */
export const bind = (form, setForm, errors, key) => ({
  id: `f-${key}`,
  name: key,
  value: form[key] ?? '',
  onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  'aria-invalid': errors?.[key] ? true : undefined,
  'aria-describedby': errors?.[key] ? `f-${key}-err` : undefined,
})

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />
}

export function Skeleton({ lines = 3 }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => <span key={i} style={{ width: `${90 - i * 14}%` }} />)}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-body">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty-state is-error" role="alert">
      <p className="empty-title">Something went wrong.</p>
      <p className="empty-body">{error?.message ?? 'Please try again.'}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  )
}

/** Accessible dialog: Escape closes, focus moves in and returns on close. */
export function Dialog({ title, onClose, children, wide = false, labelledBy = 'dialog-title' }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('input, select, textarea, button:not(.dialog-close)')?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        {title && <h2 id={labelledBy} className="dialog-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
