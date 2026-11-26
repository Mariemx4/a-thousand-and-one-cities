// Library rules as pure functions over a snapshot:
//   { continents, volumes, chapters, sections, pages, media }
// Nobody maintains page numbers or contents links by hand: they are derived here.
import { PUBLICATION } from './constants.js'

export const byOrder = (a, b) => a.displayOrder - b.displayOrder
const isPublished = (x) => x?.status === PUBLICATION.PUBLISHED
const visible = (x, includeDrafts) => includeDrafts || isPublished(x)

export const chaptersOf = (lib, volumeId, includeDrafts = false) =>
  lib.chapters.filter((c) => c.volumeId === volumeId && visible(c, includeDrafts)).sort(byOrder)
export const sectionsOf = (lib, chapterId, includeDrafts = false) =>
  lib.sections.filter((s) => s.chapterId === chapterId && visible(s, includeDrafts)).sort(byOrder)
export const pagesOf = (lib, sectionId, includeDrafts = false) =>
  lib.pages.filter((p) => p.sectionId === sectionId && visible(p, includeDrafts)).sort(byOrder)

export const mediaById = (lib, id) => lib.media.find((m) => m.id === id) ?? null

/** The image a page shows: a media asset, or a plain https link. */
export function resolveImage(lib, page) {
  const m = page.mediaId ? mediaById(lib, page.mediaId) : null
  if (m) return m
  if (page.imageUrl) return { src: page.imageUrl, title: page.title, attribution: page.credit || '', license: '' }
  return null
}

/**
 * The reader's pages for one volume:
 *   cover · endpaper · frontispiece · contents ·
 *   (chapter opener · (section welcome · content pages…)…)… · colophon
 *
 * Desktop spreads pair them as [—, cover] [endpaper, frontis] [contents, …].
 * The endpaper is decorative and desktop-only; every other page appears in
 * both the spread and the single-page phone reader, so nothing is lost.
 */
export function buildReadingOrder(lib, volumeId, { includeDrafts = false } = {}) {
  const volume = lib.volumes.find((v) => v.id === volumeId)
  if (!volume || !visible(volume, includeDrafts)) return []
  const continent = lib.continents.find((c) => c.id === volume.continentId)

  const pages = [
    { key: 'cover', kind: 'cover', volume, cover: mediaById(lib, volume.coverMediaId) },
    { key: 'endpaper', kind: 'endpaper', volume, desktopOnly: true },
    { key: 'frontis', kind: 'frontis', volume, continentName: continent?.name, chapterCount: 0 },
    { key: 'contents', kind: 'contents', volume, entries: [] },
  ]
  const contents = pages[3]

  chaptersOf(lib, volumeId, includeDrafts).forEach((chapter, ci) => {
    const sections = sectionsOf(lib, chapter.id, includeDrafts)
    contents.entries.push({ chapter, chapterNumber: ci + 1, index: pages.length })
    pages.push({ key: `ch:${chapter.id}`, kind: 'chapter', volume, chapter, chapterNumber: ci + 1, cover: mediaById(lib, chapter.coverMediaId), sections })

    sections.forEach((section, si) => {
      const items = pagesOf(lib, section.id, includeDrafts)
      // A section's welcome page always sits directly before its content pages.
      pages.push({ key: `sec:${section.id}`, kind: 'section', volume, chapter, section, sectionNumber: si + 1, items })
      items.forEach((page) => {
        pages.push({
          key: `pg:${page.id}`,
          kind: page.type === 'image' ? 'image' : 'text',
          volume, chapter, section, page,
          media: page.type === 'image' ? resolveImage(lib, page) : null,
        })
      })
    })
  })
  pages.push({ key: 'colophon', kind: 'colophon', volume })

  // Folios start on the frontispiece, as in a printed book.
  pages.forEach((p, i) => {
    p.index = i
    p.folio = i >= 2 ? i - 1 : null
  })
  contents.entries.forEach((e) => (e.folio = pages[e.index].folio))
  pages[2].chapterCount = contents.entries.length
  return pages
}

/** Which ancestors (or the item itself) still keep it out of the public site. */
export function publicBlockers(lib, kind, id) {
  const page = kind === 'page' ? lib.pages.find((x) => x.id === id) : null
  const section = lib.sections.find((x) => x.id === (page ? page.sectionId : kind === 'section' ? id : null))
  const chapter = lib.chapters.find((x) => x.id === (section ? section.chapterId : kind === 'chapter' ? id : null))
  const volume = lib.volumes.find((x) => x.id === (chapter ? chapter.volumeId : kind === 'volume' ? id : null))
  return [
    page && ['page', page.title, page.status],
    section && ['section', section.title, section.status],
    chapter && ['chapter', chapter.cityName, chapter.status],
    volume && ['volume', volume.countryName, volume.status],
  ]
    .filter(Boolean)
    .filter(([, , status]) => status !== PUBLICATION.PUBLISHED)
    .map(([k, name]) => ({ kind: k, name }))
}

export const isPublic = (lib, kind, id) => publicBlockers(lib, kind, id).length === 0

/** Published city chapters, each with its published volume. */
export function publishedChapters(lib) {
  return lib.volumes
    .filter(isPublished)
    .flatMap((volume) => chaptersOf(lib, volume.id).map((chapter) => ({ volume, chapter })))
}

/** Storefront search: published chapters only, English or Arabic names. */
export function searchChapters(lib, query) {
  const q = query.trim().toLowerCase()
  return publishedChapters(lib).filter(({ volume, chapter }) =>
    !q || [chapter.cityName, chapter.nameAr, volume.countryName, volume.nameAr, chapter.openingTitle].join(' ').toLowerCase().includes(q)
  )
}

/** The shelves: every continent in order, with its published volumes. */
export function shelves(lib) {
  return [...lib.continents].sort(byOrder).map((continent) => ({
    continent,
    volumes: lib.volumes
      .filter((v) => v.continentId === continent.id && isPublished(v))
      .sort(byOrder)
      .map((v) => ({ ...v, firstChapter: chaptersOf(lib, v.id)[0] ?? null })),
  }))
}

/** Admin tree: every volume → chapter → section → page, drafts included. */
export function libraryTree(lib) {
  return [...lib.volumes]
    .sort((a, b) => a.volumeNumber - b.volumeNumber)
    .map((volume) => ({
      volume,
      continent: lib.continents.find((c) => c.id === volume.continentId),
      chapters: chaptersOf(lib, volume.id, true).map((chapter) => ({
        chapter,
        sections: sectionsOf(lib, chapter.id, true).map((section) => ({ section, pages: pagesOf(lib, section.id, true) })),
      })),
    }))
}

/** Where an entity sits: { volume, chapter, section, page }. */
export function lineageOf(lib, kind, id) {
  const page = kind === 'page' ? lib.pages.find((x) => x.id === id) : undefined
  const section = lib.sections.find((x) => x.id === (page ? page.sectionId : kind === 'section' ? id : null))
  const chapter = lib.chapters.find((x) => x.id === (section ? section.chapterId : kind === 'chapter' ? id : null))
  const volume = lib.volumes.find((x) => x.id === (chapter ? chapter.volumeId : kind === 'volume' ? id : null))
  return { volume, chapter, section, page }
}
