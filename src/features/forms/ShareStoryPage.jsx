import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi, useSession } from '../../hooks/useApi.js'
import { useAction } from '../../hooks/useAction.js'
import { useTitle } from '../../hooks/useTitle.js'
import { CATEGORIES, STORY_FORMATS } from '../../domain/constants.js'
import { checkImageFile, detectVideo } from '../../domain/media.js'
import { Field, bind, Spinner } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { FormLayout, Confirmation } from './FormLayout.jsx'
import { SignInForm } from '../account/SignInForm.jsx'

const EMPTY = { cityId: '', proposedCity: '', proposedCountry: '', category: '', format: 'text', title: '', excerpt: '', body: '', imageMode: 'upload', imageDataUrl: '', imageName: '', imageUrl: '', alt: '', caption: '', videoUrl: '' }

export default function ShareStoryPage() {
  useTitle('Share a story')
  const { account, loading } = useSession()
  const [done, setDone] = useState(null)

  return (
    <FormLayout
      eyebrow="Contribute to the library"
      title="Share your story."
      intro={<p>A dish, a song, a place, a tradition or a trip — from a city you know. An editor reads every story before it joins a chapter, and you can follow its status in your account.</p>}
      aside={<ul className="form-notes"><li>Short and specific beats long and general.</li><li>Photos: your own, or ones you have permission to share.</li><li>Videos stay on YouTube, Instagram or Facebook — paste the link.</li></ul>}
    >
      {loading ? (
        <Spinner />
      ) : done ? (
        <Confirmation
          title="Thank you. Your story is with the editors."
          recordId={done.id}
          status={done.status}
          actions={<><Link className="btn-primary" to="/account">Follow it in your account</Link><button className="btn-ghost" onClick={() => setDone(null)}>Share another story</button></>}
        >
          <p>“{done.title}” — {done.cityLabel}. Your story will be reviewed before appearing.</p>
        </Confirmation>
      ) : !account ? (
        <div className="gate">
          <h2>Sign in to share a story</h2>
          <p>Stories are credited to their contributors, so we ask you to sign in with a contributor account.</p>
          <SignInForm />
          <p className="gate-alt">New here? <Link to="/account?mode=register">Create a contributor account</Link></p>
        </div>
      ) : account.status !== 'active' ? (
        <div className="gate">
          <h2>This account is suspended</h2>
          <p>You can still read the library. <Link to="/contact">Write to us</Link> if you think this is a mistake.</p>
        </div>
      ) : (
        <StoryForm account={account} onDone={setDone} />
      )}
    </FormLayout>
  )
}

function StoryForm({ account, onDone }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submit, pending] = useAction()
  const { data: chapters = [] } = useApi(() => api.library.publishedChapters(), [])
  const b = (k) => bind(form, setForm, errors, k)
  const video = detectVideo(form.videoUrl)

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const problem = checkImageFile(file)
    if (problem) return setErrors((x) => ({ ...x, image: problem }))
    const r = new FileReader()
    r.onload = () => setForm((f) => ({ ...f, imageDataUrl: r.result, imageName: file.name }))
    r.readAsDataURL(file)
    setErrors((x) => ({ ...x, image: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, imageDataUrl: form.imageMode === 'upload' ? form.imageDataUrl : '', imageUrl: form.imageMode === 'url' ? form.imageUrl : '' }
    const res = await submit(() => api.stories.submit(payload))
    if (res.ok) onDone(res.result)
    else if (res.fieldErrors) {
      setErrors(res.fieldErrors)
      document.querySelector('[aria-invalid="true"]')?.focus()
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <p className="signed-as">Sharing as <b>{account.displayName}</b>{account.organization ? ` · ${account.organization}` : ''}</p>
      <div className="form-row">
        <Field id="f-cityId" label="City" error={errors.cityId}>
          <select className="input" {...b('cityId')}>
            <option value="">Choose a city…</option>
            {chapters.map(({ volume, chapter }) => <option key={chapter.id} value={chapter.id}>{chapter.cityName}, {volume.countryName}</option>)}
            <option value="other">Another city — propose it</option>
          </select>
        </Field>
        <Field id="f-category" label="Category" error={errors.category}>
          <select className="input" {...b('category')}>
            <option value="">Choose a category…</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.hint}</option>)}
          </select>
        </Field>
      </div>
      {form.cityId === 'other' && (
        <div className="form-row">
          <Field id="f-proposedCity" label="City name" error={errors.proposedCity}><input className="input" {...b('proposedCity')} /></Field>
          <Field id="f-proposedCountry" label="Country" error={errors.proposedCountry}><input className="input" {...b('proposedCountry')} /></Field>
        </div>
      )}
      <Field id="f-title" label="Title" error={errors.title} hint="A few words, e.g. “Mloukhia on Fridays”."><input className="input" {...b('title')} maxLength={90} /></Field>
      <Field id="f-excerpt" label="Short description" error={errors.excerpt} hint="One or two sentences. Shown with your story."><textarea className="input" rows={2} {...b('excerpt')} maxLength={280} /></Field>

      <fieldset className="field">
        <legend className="field-label">Your material</legend>
        <div className="segmented" role="radiogroup" aria-label="Format">
          {STORY_FORMATS.map((f) => (
            <label key={f.id} className={form.format === f.id ? 'on' : ''}>
              <input type="radio" name="format" value={f.id} checked={form.format === f.id} onChange={() => setForm((x) => ({ ...x, format: f.id }))} />
              <Icon name={f.id === 'text' ? 'text' : f.id} size={15} /> {f.name}
            </label>
          ))}
        </div>
      </fieldset>

      {form.format === 'text' && (
        <Field id="f-body" label="Your story" error={errors.body} hint="Leave a blank line between paragraphs."><textarea className="input input-prose" rows={8} {...b('body')} /></Field>
      )}

      {form.format === 'image' && (
        <div className="subform">
          <div className="segmented small" role="radiogroup" aria-label="Image source">
            {[['upload', 'Upload a photo'], ['url', 'Image link']].map(([m, l]) => (
              <label key={m} className={form.imageMode === m ? 'on' : ''}>
                <input type="radio" name="imageMode" checked={form.imageMode === m} onChange={() => setForm((x) => ({ ...x, imageMode: m }))} /> {l}
              </label>
            ))}
          </div>
          {form.imageMode === 'upload' ? (
            <Field id="f-image" label="Photograph" error={errors.image} hint="JPG, PNG or WebP, up to 2 MB. Stored in this browser for the demo.">
              <input id="f-image" className="input-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} aria-invalid={errors.image ? true : undefined} />
            </Field>
          ) : (
            <Field id="f-imageUrl" label="Image link" error={errors.image} hint="A full https:// link to the image."><input className="input" type="url" inputMode="url" {...b('imageUrl')} /></Field>
          )}
          {(form.imageMode === 'upload' ? form.imageDataUrl : form.imageUrl) && (
            <img className="image-preview" src={form.imageMode === 'upload' ? form.imageDataUrl : form.imageUrl} alt="" />
          )}
          <Field id="f-alt" label="Describe the photo" error={errors.alt} hint="For people who can’t see it, e.g. “Baskets of dried henna on a market stall”."><input className="input" {...b('alt')} /></Field>
          <Field id="f-caption" label="Caption" optional><input className="input" {...b('caption')} /></Field>
        </div>
      )}

      {form.format === 'video' && (
        <Field id="f-videoUrl" label="Video link" error={errors.videoUrl} hint={video && !video.error ? `Recognised: ${video.label}.` : 'YouTube, Instagram Reel or Facebook Reel. Videos are never uploaded to the library.'}>
          <input className="input" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" {...b('videoUrl')} />
        </Field>
      )}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send for review'} <Icon name="arrow" size={15} /></button>
        <span className="form-fine">Your story will be reviewed before appearing.</span>
      </div>
    </form>
  )
}
