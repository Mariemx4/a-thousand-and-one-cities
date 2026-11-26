import { useEffect, useState } from 'react'
import { api } from '../../api/index.js'
import { useSession } from '../../hooks/useApi.js'
import { useAction } from '../../hooks/useAction.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Field, bind } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { FormLayout, Confirmation, BackHome } from './FormLayout.jsx'

const EMPTY = { name: '', email: '', subject: '', message: '' }

export default function ContactPage() {
  useTitle('Contact')
  const { account } = useSession()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)
  const [submit, pending] = useAction()
  const b = (k) => bind(form, setForm, errors, k)

  useEffect(() => {
    if (account) setForm((f) => ({ ...f, name: f.name || account.displayName, email: f.email || account.email }))
  }, [account])

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await submit(() => api.messages.send(form))
    if (res.ok) {
      setDone(res.result)
      setForm(EMPTY)
    } else if (res.fieldErrors) {
      setErrors(res.fieldErrors)
      document.querySelector('[aria-invalid="true"]')?.focus()
    }
  }

  return (
    <FormLayout
      eyebrow="Contact the project"
      title="Write to us."
      intro={<p>Questions, corrections, partnerships, or a class that wants to write a chapter together. A person reads every message.</p>}
    >
      {done ? (
        <Confirmation title="Thank you. Your message has reached the editors." recordId={done.id} status="new" actions={<><button className="btn-ghost" onClick={() => setDone(null)}>Write another message</button><BackHome /></>}>
          <p>We usually reply within a few days.</p>
        </Confirmation>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <Field id="f-name" label="Name" error={errors.name}><input className="input" autoComplete="name" {...b('name')} /></Field>
            <Field id="f-email" label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" {...b('email')} /></Field>
          </div>
          <Field id="f-subject" label="Subject" error={errors.subject}><input className="input" {...b('subject')} /></Field>
          <Field id="f-message" label="Message" error={errors.message}><textarea className="input input-prose" rows={7} {...b('message')} /></Field>
          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'} <Icon name="arrow" size={15} /></button>
          </div>
        </form>
      )}
    </FormLayout>
  )
}
