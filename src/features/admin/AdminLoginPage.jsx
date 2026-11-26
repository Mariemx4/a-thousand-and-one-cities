import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi } from '../../hooks/useApi.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Field, Spinner } from '../../ui/kit.jsx'
import { TEST_ACCESS } from '../../config.js'

/** /admin/login — editor sign-in for the library desk. */
export default function AdminLoginPage() {
  useTitle('Sign in · Library desk')
  const [params] = useSearchParams()
  const next = params.get('next')?.startsWith('/admin') ? params.get('next') : '/admin'
  const navigate = useNavigate()
  const { data: editor, loading } = useApi(() => api.editorAuth.me(), [])
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  if (loading) return <div className="page-loading"><Spinner /></div>
  if (editor) return <Navigate to={next} replace />

  const attempt = async (fn) => {
    setMessage('')
    setErrors({})
    setPending(true)
    try {
      await fn()
      navigate(next, { replace: true })
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
      else setMessage(err.message)
    } finally {
      setPending(false)
    }
  }
  const submit = (e) => {
    e.preventDefault()
    attempt(() => api.editorAuth.signIn(form))
  }

  return (
    <main className="admin-login">
      <form className="login-card" onSubmit={submit} noValidate>
        <img src="/media/alf-madina-logo.png" alt="" className="login-logo" />
        <span className="adm-eyebrow">Library desk</span>
        <h1>Editor sign-in</h1>
        <p className="adm-muted">For the editors of A Thousand and One Cities.</p>
        {message && <p className="notice tone-terracotta" role="alert">{message}</p>}
        <Field id="login-email" label="Email" error={errors.email}>
          <input id="login-email" className="input" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={errors.email ? true : undefined} />
        </Field>
        <Field id="login-password" label="Password" error={errors.password}>
          <input id="login-password" className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-invalid={errors.password ? true : undefined} />
        </Field>
        <button className="adm-btn login-submit" type="submit" disabled={pending}>Sign in</button>
        <Link className="login-back" to="/">← Back to the website</Link>
        {TEST_ACCESS.enabled && (
          <div className="test-access">
            <span>Testing only · removed before launch</span>
            <button type="button" className="adm-btn ghost" disabled={pending} onClick={() => attempt(() => api.editorAuth.signInAsTestEditor())}>Sign in as test editor</button>
          </div>
        )}
      </form>
    </main>
  )
}
