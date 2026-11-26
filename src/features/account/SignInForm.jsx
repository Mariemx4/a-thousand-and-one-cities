import { useState } from 'react'
import { api } from '../../api/index.js'
import { TEST_ACCESS } from '../../config.js'
import { Field } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { useToast } from '../../ui/Toast.jsx'

/** Contributor sign-in: email and password, plus the testing shortcut while enabled. */
export function SignInForm({ onSwitchToRegister }) {
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  const attempt = async (fn, success) => {
    setErrors({})
    setMessage('')
    setPending(true)
    try {
      const account = await fn()
      toast(success(account))
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
      else setMessage(err.message)
    } finally {
      setPending(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    attempt(() => api.auth.signIn(form), (a) => `Welcome back, ${a.displayName.split(' ')[0]}.`)
  }

  return (
    <div className="auth-card">
      <form className="form" onSubmit={submit} noValidate>
        {message && <p className="notice tone-terracotta" role="alert">{message}</p>}
        <Field id="si-email" label="Email" error={errors.email}>
          <input id="si-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={errors.email ? true : undefined} />
        </Field>
        <Field id="si-password" label="Password" error={errors.password}>
          <div className="password-row">
            <input id="si-password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-invalid={errors.password ? true : undefined} />
            <button type="button" className="reveal" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <div className="auth-row">
          <button type="button" className="link-btn" onClick={() => setMessage('Password reset arrives with the backend. For now, write to us from the contact page.')}>Forgot your password?</button>
        </div>
        <button className="btn-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'} <Icon name="arrow" size={15} /></button>
        {onSwitchToRegister && <p className="auth-alt">New to the library? <button type="button" className="link-btn" onClick={onSwitchToRegister}>Create an account</button></p>}
      </form>

      {TEST_ACCESS.enabled && (
        <div className="test-access">
          <span>Testing only · removed before launch</span>
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => attempt(() => api.auth.signInAsTestUser(), (a) => `Signed in as the test user (${a.displayName}).`)}>
            Sign in as test user
          </button>
        </div>
      )}
    </div>
  )
}
