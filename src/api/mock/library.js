// Library endpoints (public reads + admin editing).
import { buildReadingOrder, byOrder, libraryTree, publishedChapters, searchChapters, shelves } from '../../domain/library.js'
import { PUBLICATION } from '../../domain/constants.js'
import { uniqueSlug } from '../../domain/slug.js'
import { checkImageFile } from '../../domain/media.js'
import { ApiError, notFound } from '../errors.js'
import { findOr404, logActivity, newId, now, EDITOR_NAME } from './helpers.js'

const COLLECTION = { volume: 'volumes', chapter: 'chapters', section: 'sections', page: 'pages' }
const PARENT = { chapter: 'volumeId', section: 'chapterId', page: 'sectionId' }
const LABEL = { volume: 'countryName', chapter: 'cityName', section: 'title', page: 'title' }
const EDITABLE = {
  volume: ['countryName', 'nameAr', 'description', 'coverMediaId', 'cloth', 'continentId', 'status'],
  chapter: ['cityName', 'nameAr', 'openingTitle', 'openingText', 'coverMediaId', 'postmark', 'coordinates', 'status'],
  section: ['title', 'titleAr', 'category', 'welcomeText', 'status'],
  page: ['type', 'title', 'body', 'mediaId', 'imageUrl', 'alt', 'caption', 'credit', 'byline', 'videoUrl', 'status'],
}

const nextOrder = (rows) => rows.reduce((m, x) => Math.max(m, x.displayOrder), 0) + 1

export function libraryApi(store) {
  const lib = () => store.read()

  return {
    /** GET /api/shelves — continents with their published volumes. */
    shelves: () =>
      shelves(lib()).map((row) => ({ ...row, volumes: row.volumes.map((v) => ({ ...v, cover: lib().media.find((m) => m.id === v.coverMediaId) ?? null })) })),

    /** GET /api/media?ids= */
    media: (ids) => lib().media.filter((m) => ids.includes(m.id)),

    /** GET /api/volumes/:slug/reading-order?preview — the reader's pages. */
    readingOrder(volumeSlug, { preview = false } = {}) {
      const volume = lib().volumes.find((v) => v.slug === volumeSlug)
      if (!volume) throw notFound('That book')
      const pages = buildReadingOrder(lib(), volume.id, { includeDrafts: preview })
      if (!pages.length) throw notFound('That book')
      return { volume, pages }
    },

    /** GET /api/search?q= — published city chapters. */
    search: (q) => searchChapters(lib(), q),

    /** GET /api/chapters?published=true */
    publishedChapters: () => publishedChapters(lib()),

    /** GET /api/discover/random — a random published chapter. */
    random() {
      const all = publishedChapters(lib())
      if (!all.length) throw notFound('A published chapter')
      return all[Math.floor(Math.random() * all.length)]
    },

    // ---------------- admin ----------------

    /** GET /api/admin/library — everything, drafts included. */
    snapshot: () => {
      const s = lib()
      return { continents: s.continents, volumes: s.volumes, chapters: s.chapters, sections: s.sections, pages: s.pages, media: s.media, tree: libraryTree(s) }
    },

    /** PATCH /api/admin/{volumes|chapters|sections|pages}/:id */
    update(kind, id, patch) {
      const allowed = Object.fromEntries(Object.entries(patch).filter(([k]) => EDITABLE[kind]?.includes(k)))
      return store.write((db) => {
        const row = findOr404(db[COLLECTION[kind]], id, `That ${kind}`)
        const next = { ...row, ...allowed }
        if (kind === 'page' && next.status === PUBLICATION.PUBLISHED && next.type === 'image' && !next.alt?.trim()) {
          throw new ApiError(422, 'Add alt text before publishing an image page.')
        }
        const wasPublished = row.status === PUBLICATION.PUBLISHED
        Object.assign(row, allowed, { updatedAt: now() })
        if (kind === 'chapter' && 'cityName' in allowed) {
          row.slug = uniqueSlug(row.cityName, db.chapters.filter((c) => c.id !== id).map((c) => c.slug))
        }
        if ('status' in allowed && wasPublished !== (row.status === PUBLICATION.PUBLISHED)) {
          logActivity(db, EDITOR_NAME, row.status === PUBLICATION.PUBLISHED ? 'published' : 'unpublished', { kind, id, label: row[LABEL[kind]] })
        }
        return row
      })
    },

    /** PATCH /api/admin/{collection}/:id/order — move among siblings; orders are renumbered. */
    move(kind, id, delta) {
      return store.write((db) => {
        const rows = db[COLLECTION[kind]]
        const row = findOr404(rows, id, `That ${kind}`)
        const key = PARENT[kind]
        const siblings = rows.filter((x) => (key ? x[key] === row[key] : x.continentId === row.continentId)).sort(byOrder)
        const i = siblings.indexOf(row)
        const j = i + delta
        if (j < 0 || j >= siblings.length) return row
        ;[siblings[i], siblings[j]] = [siblings[j], siblings[i]]
        siblings.forEach((s, k) => (s.displayOrder = k + 1))
        return row
      })
    },

    /** POST /api/admin/volumes */
    createVolume({ continentId, countryName, nameAr = '' }) {
      if (!countryName?.trim()) throw new ApiError(422, 'A country name is required.')
      return store.write((db) => {
        const row = {
          id: newId('vol'), continentId, countryName: countryName.trim(), nameAr,
          slug: uniqueSlug(countryName, db.volumes.map((v) => v.slug)),
          volumeNumber: db.volumes.reduce((m, v) => Math.max(m, v.volumeNumber), 0) + 1,
          coverMediaId: null, cloth: 'oasis', description: '',
          displayOrder: nextOrder(db.volumes.filter((v) => v.continentId === continentId)),
          status: PUBLICATION.DRAFT, createdAt: now(),
        }
        db.volumes.push(row)
        logActivity(db, EDITOR_NAME, 'created a draft volume', { kind: 'volume', id: row.id, label: row.countryName })
        return row
      })
    },

    /** POST /api/admin/chapters */
    createChapter(volumeId, { cityName = 'New city', nameAr = '' } = {}) {
      return store.write((db) => createChapterIn(db, volumeId, { cityName, nameAr }))
    },

    /** POST /api/admin/sections */
    createSection(chapterId, { title = 'New section', category = 'discover' } = {}) {
      return store.write((db) => createSectionIn(db, chapterId, { title, category }))
    },

    /** POST /api/admin/pages */
    createPage(sectionId, type = 'text') {
      return store.write((db) => createPageIn(db, sectionId, { type, title: type === 'image' ? 'Untitled image' : 'Untitled page' }))
    },

    /** DELETE /api/admin/{collection}/:id — only empty containers can be removed. */
    remove(kind, id) {
      return store.write((db) => {
        const rows = db[COLLECTION[kind]]
        const row = findOr404(rows, id, `That ${kind}`)
        const childKind = { volume: 'chapter', chapter: 'section', section: 'page' }[kind]
        if (childKind && db[COLLECTION[childKind]].some((c) => c[PARENT[childKind]] === id)) {
          throw new ApiError(409, `Remove or move what is inside this ${kind} first.`)
        }
        if (row.status === PUBLICATION.PUBLISHED) throw new ApiError(409, `Unpublish this ${kind} before deleting it.`)
        db[COLLECTION[kind]] = rows.filter((x) => x.id !== id)
        // keep review records pointing at live content only
        db.stories.forEach((s) => s.draftPageId === id && (s.draftPageId = null))
        db.suggestions.forEach((s) => s.draftChapterId === id && (s.draftChapterId = null))
        logActivity(db, EDITOR_NAME, `deleted a draft ${kind}`, { kind, id: null, label: row[LABEL[kind]] })
        return { id }
      })
    },

    /** POST /api/admin/media — demo: the file is kept as a data URL. */
    async uploadImage(file) {
      const problem = checkImageFile(file)
      if (problem) throw new ApiError(422, problem)
      const dataUrl = await readAsDataUrl(file)
      return store.write((db) => {
        const row = { id: newId('media'), mediaType: 'image', sourceKind: 'upload', src: dataUrl, title: file.name, attribution: '', license: '', fileName: file.name, fileSize: file.size, mimeType: file.type, createdAt: now() }
        db.media.push(row)
        return row
      })
    },
  }
}

// ---- shared creators (also used when turning review records into drafts) ----

export function createChapterIn(db, volumeId, { cityName, nameAr = '' }) {
  findOr404(db.volumes, volumeId, 'That volume')
  const row = {
    id: newId('ch'), volumeId, cityName: cityName.trim(), nameAr,
    slug: uniqueSlug(cityName, db.chapters.map((c) => c.slug)),
    openingTitle: '', openingText: '', coverMediaId: null, postmark: '', coordinates: null,
    displayOrder: nextOrder(db.chapters.filter((c) => c.volumeId === volumeId)),
    status: PUBLICATION.DRAFT, createdAt: now(),
  }
  db.chapters.push(row)
  logActivity(db, EDITOR_NAME, 'created a draft chapter', { kind: 'chapter', id: row.id, label: row.cityName })
  return row
}

export function createSectionIn(db, chapterId, { title, category }) {
  findOr404(db.chapters, chapterId, 'That chapter')
  const row = {
    id: newId('sec'), chapterId, title, titleAr: '', category, welcomeText: '',
    displayOrder: nextOrder(db.sections.filter((s) => s.chapterId === chapterId)),
    status: PUBLICATION.DRAFT, createdAt: now(),
  }
  db.sections.push(row)
  return row
}

export function createPageIn(db, sectionId, fields) {
  findOr404(db.sections, sectionId, 'That section')
  const row = {
    id: newId('pg'), sectionId, type: 'text', title: 'Untitled page', body: '', mediaId: null, imageUrl: '',
    alt: '', caption: '', credit: '', videoUrl: '', ...fields,
    displayOrder: nextOrder(db.pages.filter((p) => p.sectionId === sectionId)),
    status: PUBLICATION.DRAFT, createdAt: now(),
  }
  db.pages.push(row)
  return row
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new ApiError(400, 'The file could not be read.'))
    r.readAsDataURL(file)
  })
}
