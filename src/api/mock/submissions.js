// Story submissions and city suggestions: submit → review → (accept) → draft content.
// Review never publishes anything; publishing happens in the Library editor.
import { STORY_STATUS, SUGGESTION_STATUS, ACCOUNT_STATUS } from '../../domain/constants.js'
import { assertTransition, canCreateDraft } from '../../domain/workflow.js'
import { validateStory, validateSuggestion, splitLinks } from '../../domain/validation.js'
import { isPublic, lineageOf } from '../../domain/library.js'
import { uniqueSlug } from '../../domain/slug.js'
import { publicAccount } from './editorAuth.js'
import { ApiError, forbidden, invalid } from '../errors.js'
import { findOr404, logActivity, newId, now, EDITOR_NAME } from './helpers.js'
import { createChapterIn, createPageIn, createSectionIn } from './library.js'

const accountName = (db, id) => db.accounts.find((a) => a.id === id)?.displayName ?? 'Visitor'

function cityLabel(db, story) {
  if (story.cityId) {
    const ch = db.chapters.find((c) => c.id === story.cityId)
    const vol = ch && db.volumes.find((v) => v.id === ch.volumeId)
    return ch ? `${ch.cityName}, ${vol?.countryName ?? ''}` : 'Unknown city'
  }
  return story.proposedCity ? `${story.proposedCity.city}, ${story.proposedCity.country} (proposed)` : '—'
}

function requireActiveContributor(db, session) {
  const account = session && db.accounts.find((a) => a.id === session)
  if (!account) throw forbidden('Sign in to share a story.')
  if (account.status !== ACCOUNT_STATUS.ACTIVE) throw forbidden('This account is suspended. Write to us if you think this is a mistake.')
  return account
}

/** Public-facing view of a record: internal notes are never included. */
const forContributor = (db, kind) => (r) => {
  const { notes, ...rest } = r
  const draftId = kind === 'story' ? r.draftPageId : r.draftChapterId
  const published = draftId && db[kind === 'story' ? 'pages' : 'chapters'].some((x) => x.id === draftId) && isPublic(db, kind === 'story' ? 'page' : 'chapter', draftId)
  return { ...rest, kind, cityLabel: kind === 'story' ? cityLabel(db, r) : `${r.city}, ${r.country}`, published: Boolean(published) }
}

function changeStatus(db, kind, record, to, { message } = {}) {
  assertTransition(kind, record.status, to)
  const needsMessage = to === STORY_STATUS.CHANGES_REQUESTED || to === SUGGESTION_STATUS.NEEDS_INFO
  if (needsMessage && !message?.trim()) throw new ApiError(422, 'Write a message so the contributor knows what to change.')
  record.status = to
  record.updatedAt = now()
  record.history.push({ at: record.updatedAt, status: to, by: 'acc_editor' })
  if (message?.trim()) record.messages.push({ at: record.updatedAt, from: 'editor', text: message.trim() })
}

export function submissionsApi(store, session) {
  const db = () => store.read()

  const stories = {
    /** POST /api/stories */
    submit(form) {
      const errors = validateStory(form)
      if (Object.keys(errors).length) throw invalid(errors)
      return store.write((d) => {
        const account = requireActiveContributor(d, session.get())
        const row = {
          id: newId('sub'), contributorId: account.id,
          cityId: form.cityId === 'other' ? null : form.cityId,
          proposedCity: form.cityId === 'other' ? { city: form.proposedCity.trim(), country: form.proposedCountry.trim() } : null,
          category: form.category, format: form.format,
          title: form.title.trim(), excerpt: form.excerpt.trim(),
          material: {
            body: form.format === 'text' ? form.body.trim() : '',
            imageSrc: form.format === 'image' ? form.imageDataUrl || form.imageUrl.trim() : '',
            alt: form.format === 'image' ? form.alt.trim() : '',
            caption: form.format === 'image' ? (form.caption ?? '').trim() : '',
            videoUrl: form.format === 'video' ? form.videoUrl.trim() : '',
          },
          status: STORY_STATUS.NEW, messages: [], notes: [], draftPageId: null,
          history: [{ at: now(), status: STORY_STATUS.NEW, by: account.id }], createdAt: now(), updatedAt: now(),
        }
        d.stories.unshift(row)
        logActivity(d, account.displayName, 'shared a story', { kind: 'story', id: row.id, label: row.title })
        return forContributor(d, 'story')(row)
      })
    },

    /** GET /api/admin/stories?status= */
    list({ status } = {}) {
      const d = db()
      return d.stories
        .filter((s) => !status || s.status === status)
        .map((s) => ({ ...s, contributorName: accountName(d, s.contributorId), cityLabel: cityLabel(d, s) }))
    },

    /** GET /api/admin/stories/:id */
    get(id) {
      const d = db()
      const s = findOr404(d.stories, id, 'That story')
      const page = s.draftPageId && d.pages.find((p) => p.id === s.draftPageId)
      return {
        ...s,
        contributor: publicAccount(d.accounts.find((a) => a.id === s.contributorId)),
        cityLabel: cityLabel(d, s),
        chapter: s.cityId ? d.chapters.find((c) => c.id === s.cityId) ?? null : null,
        draftPage: page ? { ...page, lineage: lineageOf(d, 'page', page.id), public: isPublic(d, 'page', page.id) } : null,
      }
    },

    /** PATCH /api/admin/stories/:id/status */
    setStatus(id, to, opts) {
      return store.write((d) => {
        const s = findOr404(d.stories, id, 'That story')
        changeStatus(d, 'story', s, to, opts)
        logActivity(d, EDITOR_NAME, verbFor(to), { kind: 'story', id, label: s.title })
        return s
      })
    },

    /** POST /api/admin/stories/:id/notes — internal, never shown to the contributor. */
    addNote(id, text) {
      if (!text?.trim()) throw new ApiError(422, 'The note is empty.')
      return store.write((d) => {
        const s = findOr404(d.stories, id, 'That story')
        s.notes.push({ at: now(), author: EDITOR_NAME, text: text.trim() })
        return s
      })
    },

    /**
     * POST /api/admin/stories/:id/draft-page
     * Turns an accepted story into a draft content page. Idempotent: if the
     * story already produced a page, that page is returned and nothing is created.
     */
    createDraftPage(id, { sectionId, chapterId, newSectionTitle } = {}) {
      return store.write((d) => {
        const s = findOr404(d.stories, id, 'That story')
        const existing = s.draftPageId && d.pages.find((p) => p.id === s.draftPageId)
        if (existing) return { page: existing, created: false }
        if (!canCreateDraft(s)) throw new ApiError(409, 'Accept the story before turning it into a page.')

        let section = sectionId && d.sections.find((x) => x.id === sectionId)
        if (!section) {
          if (!chapterId) throw new ApiError(422, 'Choose a chapter and a section.')
          section = createSectionIn(d, chapterId, { title: newSectionTitle?.trim() || 'New section', category: s.category })
        }
        const contributor = d.accounts.find((a) => a.id === s.contributorId)
        const byline = contributor ? [contributor.displayName, contributor.organization].filter(Boolean).join(' · ') : ''
        const m = s.material
        let fields
        if (s.format === 'image') {
          let mediaId = null
          let imageUrl = ''
          if (m.imageSrc?.startsWith('data:')) {
            const media = { id: newId('media'), mediaType: 'image', sourceKind: 'upload', src: m.imageSrc, title: s.title, attribution: byline, license: 'Shared with the library', createdAt: now() }
            d.media.push(media)
            mediaId = media.id
          } else imageUrl = m.imageSrc
          fields = { type: 'image', title: s.title, mediaId, imageUrl, alt: m.alt, caption: m.caption || s.excerpt, credit: byline ? `Shared by ${byline}` : '' }
        } else {
          fields = { type: 'text', title: s.title, body: m.body || s.excerpt, videoUrl: m.videoUrl || '' }
        }
        const page = createPageIn(d, section.id, { ...fields, byline, sourceSubmissionId: s.id })
        s.draftPageId = page.id
        s.updatedAt = now()
        logActivity(d, EDITOR_NAME, 'created a draft page from', { kind: 'story', id: s.id, label: s.title })
        return { page, created: true }
      })
    },
  }

  const suggestions = {
    /** POST /api/city-requests */
    submit(form) {
      const errors = validateSuggestion(form)
      if (Object.keys(errors).length) throw invalid(errors)
      return store.write((d) => {
        const account = session.get() && d.accounts.find((a) => a.id === session.get())
        const row = {
          id: newId('sug'), contributorId: account?.id ?? null,
          reporter: { name: form.name.trim(), email: form.email.trim(), organization: (form.organization ?? '').trim() },
          city: form.city.trim(), country: form.country.trim(), reason: form.reason.trim(), links: splitLinks(form.links),
          status: SUGGESTION_STATUS.NEW, messages: [], notes: [], draftChapterId: null,
          history: [{ at: now(), status: SUGGESTION_STATUS.NEW, by: account?.id ?? 'visitor' }], createdAt: now(), updatedAt: now(),
        }
        d.suggestions.unshift(row)
        logActivity(d, row.reporter.name, 'suggested a city', { kind: 'suggestion', id: row.id, label: `${row.city}, ${row.country}` })
        return forContributor(d, 'suggestion')(row)
      })
    },

    /** GET /api/admin/city-requests?status= */
    list({ status } = {}) {
      return db().suggestions.filter((s) => !status || s.status === status)
    },

    /** GET /api/admin/city-requests/:id */
    get(id) {
      const d = db()
      const s = findOr404(d.suggestions, id, 'That suggestion')
      const chapter = s.draftChapterId && d.chapters.find((c) => c.id === s.draftChapterId)
      return {
        ...s,
        contributor: s.contributorId ? publicAccount(d.accounts.find((a) => a.id === s.contributorId)) : null,
        draftChapter: chapter ? { ...chapter, volume: d.volumes.find((v) => v.id === chapter.volumeId), public: isPublic(d, 'chapter', chapter.id) } : null,
        matchingVolume: d.volumes.find((v) => v.countryName.toLowerCase() === s.country.toLowerCase()) ?? null,
      }
    },

    /** PATCH /api/admin/city-requests/:id/status */
    setStatus(id, to, opts) {
      return store.write((d) => {
        const s = findOr404(d.suggestions, id, 'That suggestion')
        changeStatus(d, 'suggestion', s, to, opts)
        logActivity(d, EDITOR_NAME, verbFor(to), { kind: 'suggestion', id, label: `${s.city}, ${s.country}` })
        return s
      })
    },

    addNote(id, text) {
      if (!text?.trim()) throw new ApiError(422, 'The note is empty.')
      return store.write((d) => {
        const s = findOr404(d.suggestions, id, 'That suggestion')
        s.notes.push({ at: now(), author: EDITOR_NAME, text: text.trim() })
        return s
      })
    },

    /**
     * POST /api/admin/city-requests/:id/draft-chapter
     * Creates a draft chapter (and, if needed, a draft country volume). Idempotent.
     */
    createDraftChapter(id, { volumeId, newVolume } = {}) {
      return store.write((d) => {
        const s = findOr404(d.suggestions, id, 'That suggestion')
        const existing = s.draftChapterId && d.chapters.find((c) => c.id === s.draftChapterId)
        if (existing) return { chapter: existing, created: false }
        if (!canCreateDraft(s)) throw new ApiError(409, 'Accept the suggestion before creating a chapter.')
        let vId = volumeId
        if (!vId) {
          if (!newVolume?.continentId) throw new ApiError(422, 'Choose a country volume or a continent for a new one.')
          const vol = {
            id: newId('vol'), continentId: newVolume.continentId, countryName: (newVolume.countryName || s.country).trim(), nameAr: '',
            slug: uniqueSlug(newVolume.countryName || s.country, d.volumes.map((v) => v.slug)),
            volumeNumber: d.volumes.reduce((m, v) => Math.max(m, v.volumeNumber), 0) + 1, coverMediaId: null, cloth: 'oasis', description: '',
            displayOrder: d.volumes.filter((v) => v.continentId === newVolume.continentId).length + 1, status: 'draft', createdAt: now(),
          }
          d.volumes.push(vol)
          vId = vol.id
          logActivity(d, EDITOR_NAME, 'created a draft volume', { kind: 'volume', id: vol.id, label: vol.countryName })
        }
        const chapter = createChapterIn(d, vId, { cityName: s.city })
        chapter.sourceSuggestionId = s.id
        s.draftChapterId = chapter.id
        s.updatedAt = now()
        return { chapter, created: true }
      })
    },
  }

  /** GET /api/me/submissions — the signed-in contributor's records, without internal notes. */
  function mine() {
    const d = db()
    const id = session.get()
    if (!id) return { stories: [], suggestions: [] }
    return {
      stories: d.stories.filter((s) => s.contributorId === id).map(forContributor(d, 'story')),
      suggestions: d.suggestions.filter((s) => s.contributorId === id).map(forContributor(d, 'suggestion')),
    }
  }

  return { stories, suggestions, mine }
}

function verbFor(status) {
  return {
    in_review: 'started reviewing',
    changes_requested: 'requested changes to',
    needs_info: 'asked for more information on',
    accepted: 'accepted',
    declined: 'declined',
  }[status] ?? `set status ${status} on`
}
