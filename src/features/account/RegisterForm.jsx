import { useState } from 'react'
import { api } from '../../api/index.js'
import { CATEGORIES } from '../../domain/constants.js'
import { PASSWORD_MIN } from '../../domain/validation.js'
import { Field, bind } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { useToast } from '../../ui/Toast.jsx'

const EMPTY = { displayName: '', email: '', phone: '', password: '', confirmPassword: '', city: '', country: '', organization: '', bio: '', interests: [], consent: false }

function strength(pw) {
  let score = 0
  if (pw.length >= PASSWORD_MIN) score++
  if (pw.length >= 14) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][score]
}

/** Contributor registration: who you are, how to sign in, what you would like to share. */
export function RegisterForm({ onSwitchToSignIn }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)
  const b = (k) => bind(form, setForm, errors, k)
  const toggleInterest = (id) => setForm((f) => ({ ...f, interests: f.interests.includes(id) ? f.interests.filter((x) => x !== id) : [...f.interests, id] }))

  const submit = async (e) => {
    e.preventDefault()
    setPending(true)
    try {
      const a = await api.auth.register(form)
      toast(`Welcome to the library, ${a.displayName.split(' ')[0]}.`)
    } catch (err) {
      if (err.fieldErrors) {
        setErrors(err.fieldErrors)
        requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus())
      } else toast(err.message, { tone: 'error' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="form auth-card register-form" onSubmit={submit} noValidate>
      <fieldset className="form-group">
        <legend>About you</legend>
        <Field id="f-displayName" label="Full name" error={errors.displayName} hint="Shown with the stories you share."><input className="input" autoComplete="name" {...b('displayName')} /></Field>
        <div className="form-row">
          <Field id="f-email" label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" {...b('email')} /></Field>
          <Field id="f-phone" label="Phone number" error={errors.phone} hint="With your country code, e.g. +216 20 123 456. Only editors see it.">
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+216 20 123 456" {...b('phone')} />
          </Field>
        </div>
        <div className="form-row">
          <Field id="f-city" label="City" error={errors.city}><input className="input" autoComplete="address-level2" {...b('city')} /></Field>
          <Field id="f-country" label="Country" error={errors.country}><input className="input" autoComplete="country-name" {...b('country')} /></Field>
        </div>
        <Field id="f-organization" label="Organization" optional hint="e.g. a JCI chapter, school or heritage club. Credited on chapters you help create.">
          <input className="input" autoComplete="organization" {...b('organization')} />
        </Field>
      </fieldset>

      <fieldset className="form-group">
        <legend>Your password</legend>
        <div className="form-row">
          <Field id="f-password" label="Password" error={errors.password} hint={form.password ? `Strength: ${strength(form.password)}` : `At least ${PASSWORD_MIN} characters, with numbers or symbols.`}>
            <input className="input" type="password" autoComplete="new-password" {...b('password')} />
          </Field>
          <Field id="f-confirmPassword" label="Confirm password" error={errors.confirmPassword}><input className="input" type="password" autoComplete="new-password" {...b('confirmPassword')} /></Field>
        </div>
      </fieldset>

      <fieldset className="form-group">
        <legend>What you would like to share <span className="field-optional">optional</span></legend>
        <div className="interest-chips" role="group" aria-label="Categories you would like to contribute to">
          {CATEGORIES.map((c) => (
            <label key={c.id} className={form.interests.includes(c.id) ? 'on' : ''}>
              <input type="checkbox" checked={form.interests.includes(c.id)} onChange={() => toggleInterest(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
        <Field id="f-bio" label="A line about you" optional error={errors.bio} hint="e.g. “Grew up in the Jara quarter; I collect my grandmother’s recipes.”">
          <textarea className="input" rows={2} maxLength={280} {...b('bio')} />
        </Field>
      </fieldset>

      <label className={`consent ${errors.consent ? 'has-error' : ''}`}>
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'consent-err' : undefined} />
        <span>I understand that editors review every contribution before it appears, and that published stories are credited with my name.</span>
      </label>
      {errors.consent && <span className="field-error" id="consent-err" role="alert">{errors.consent}</span>}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={pending}>{pending ? 'Creating your account…' : 'Create account'} <Icon name="arrow" size={15} /></button>
        {onSwitchToSignIn && <span className="auth-alt">Already have an account? <button type="button" className="link-btn" onClick={onSwitchToSignIn}>Sign in</button></span>}
      </div>
    </form>
  )
}
