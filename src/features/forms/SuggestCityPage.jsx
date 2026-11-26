import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useSession } from '../../hooks/useApi.js'
import { useAction } from '../../hooks/useAction.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Field, bind } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { FormLayout, Confirmation, BackHome } from './FormLayout.jsx'

const EMPTY = { city: '', country: '', reason: '', links: '', name: '', organization: '', email: '' }

export default function SuggestCityPage() {
  useTitle('Suggest a city')
  const { account } = useSession()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)
  const [submit, pending] = useAction()
  const b = (k) => bind(form, setForm, errors, k)

  useEffect(() => {
    if (account) setForm((f) => ({ ...f, name: f.name || account.displayName, email: f.email || account.email, organization: f.organization || account.organization || '' }))
  }, [account])

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await submit(() => api.suggestions.submit(form))
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
      eyebrow="Help the collection grow"
      title="Suggest a city."
      intro={<p>Every shelf starts with its first book. Tell us which city deserves a chapter and why. If your organization would like to write it, say so — that is how new chapters begin.</p>}
      aside={<p className="form-notes">Suggestions are reviewed by the editors. Accepted cities become draft chapters, written with the people who know them.</p>}
    >
      {done ? (
        <Confirmation
          title={`Thank you. ${done.city} is on our list.`}
          recordId={done.id}
          status={done.status}
          actions={<>{account && <Link className="btn-primary" to="/account">See it in your account</Link>}<button className="btn-ghost" onClick={() => setDone(null)}>Suggest another city</button><BackHome /></>}
        >
          <p>An editor will review your suggestion{account ? '. You can follow its status in your account.' : ' and may write to you at the address you gave.'}</p>
        </Confirmation>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <Field id="f-city" label="City" error={errors.city}><input className="input" {...b('city')} /></Field>
            <Field id="f-country" label="Country" error={errors.country}><input className="input" {...b('country')} /></Field>
          </div>
          <Field id="f-reason" label="Why should it be in the library?" error={errors.reason}><textarea className="input input-prose" rows={5} {...b('reason')} /></Field>
          <Field id="f-links" label="Links" optional error={errors.links} hint="Articles, photos or videos about the city. Separate several links with a space."><input className="input" {...b('links')} /></Field>
          <div className="form-row">
            <Field id="f-name" label="Your name" error={errors.name}><input className="input" autoComplete="name" {...b('name')} /></Field>
            <Field id="f-email" label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" {...b('email')} /></Field>
          </div>
          <Field id="f-organization" label="Organization" optional hint="e.g. a JCI chapter, a school or a heritage club."><input className="input" {...b('organization')} /></Field>
          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send suggestion'} <Icon name="arrow" size={15} /></button>
          </div>
        </form>
      )}
    </FormLayout>
  )
}
