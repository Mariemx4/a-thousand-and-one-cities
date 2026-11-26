import { describe, expect, it } from 'vitest'
import { createSeed } from '../../src/data/seed/index.js'
import { buildReadingOrder, publicBlockers, searchChapters, shelves } from '../../src/domain/library.js'

const lib = () => createSeed()

describe('reading order', () => {
  it('starts with cover, endpaper, frontispiece and contents', () => {
    const kinds = buildReadingOrder(lib(), 'vol_tunisia').slice(0, 4).map((p) => p.kind)
    expect(kinds).toEqual(['cover', 'endpaper', 'frontis', 'contents'])
  })

  it('lists city chapters only in the contents, in display order', () => {
    const db = lib()
    db.chapters.push({ id: 'ch_tozeur', volumeId: 'vol_tunisia', cityName: 'Tozeur', slug: 'tozeur', displayOrder: 0, status: 'published' })
    const contents = buildReadingOrder(db, 'vol_tunisia').find((p) => p.kind === 'contents')
    expect(contents.entries.map((e) => e.chapter.cityName)).toEqual(['Tozeur', 'Gabès'])
  })

  it('places each section welcome directly before its content pages', () => {
    const pages = buildReadingOrder(lib(), 'vol_tunisia')
    const i = pages.findIndex((p) => p.key === 'sec:sec_gabes_oasis')
    expect(pages.slice(i + 1, i + 4).map((p) => p.page.id)).toEqual(['pg_gabes_storeys', 'pg_gabes_planters', 'pg_gabes_engraving'])
  })

  it('derives folios from position, so inserting a page renumbers what follows', () => {
    const db = lib()
    const before = buildReadingOrder(db, 'vol_tunisia').find((p) => p.key === 'pg:pg_gabes_henna').folio
    db.pages.push({ id: 'pg_new', sectionId: 'sec_gabes_oasis', type: 'text', title: 'New', body: '', displayOrder: 9, status: 'published' })
    const after = buildReadingOrder(db, 'vol_tunisia').find((p) => p.key === 'pg:pg_gabes_henna').folio
    expect(after).toBe(before + 1)
  })

  it('keeps everything under a draft section, chapter or volume out of the public reader', () => {
    const db = lib()
    db.pages.find((p) => p.id === 'pg_gabes_surf').status = 'published' // its section is still a draft
    expect(buildReadingOrder(db, 'vol_tunisia').some((p) => p.page?.id === 'pg_gabes_surf')).toBe(false)
    expect(publicBlockers(db, 'page', 'pg_gabes_surf')).toEqual([{ kind: 'section', name: 'The waterfront' }])

    db.chapters.find((c) => c.id === 'ch_gabes').status = 'draft'
    const pub = buildReadingOrder(db, 'vol_tunisia')
    expect(pub.some((p) => p.kind === 'chapter')).toBe(false)
    expect(searchChapters(db, 'gab')).toHaveLength(0)

    db.volumes.find((v) => v.id === 'vol_tunisia').status = 'draft'
    expect(buildReadingOrder(db, 'vol_tunisia')).toEqual([])
    expect(shelves(db).find((s) => s.continent.id === 'cont_africa').volumes).toHaveLength(0)
  })

  it('shows drafts in admin preview', () => {
    const pages = buildReadingOrder(lib(), 'vol_tunisia', { includeDrafts: true })
    expect(pages.some((p) => p.page?.id === 'pg_gabes_surf')).toBe(true)
  })
})

describe('search', () => {
  it('matches English and Arabic names of published chapters', () => {
    expect(searchChapters(lib(), 'latakia').map((r) => r.chapter.id)).toEqual(['ch_latakia'])
    expect(searchChapters(lib(), 'قابس').map((r) => r.chapter.id)).toEqual(['ch_gabes'])
  })
})
