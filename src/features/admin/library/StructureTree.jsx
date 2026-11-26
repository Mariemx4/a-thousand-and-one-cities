import { useState } from 'react'
import { api } from '../../../api/index.js'
import { useAction } from '../../../hooks/useAction.js'
import { libraryTree, publicBlockers } from '../../../domain/library.js'
import { categoryName } from '../../../domain/constants.js'
import { toRoman } from '../../../ui/format.js'
import { Dialog, Field, StatusBadge } from '../../../ui/kit.jsx'
import { Icon } from '../../../ui/Icon.jsx'

/** The library as a tree in reading order, with ordering and "add" actions. */
export default function StructureTree({ lib, selected, onSelect, open }) {
  const [run] = useAction()
  const [newVolume, setNewVolume] = useState(false)
  const tree = libraryTree(lib)
  const add = async (fn, kind) => {
    const res = await run(fn)
    if (res.ok) onSelect(kind, res.result.id)
  }

  return (
    <aside className={`lib-tree ${open ? 'open' : ''}`} aria-label="Library structure">
      <div className="tree-head"><b>Volumes</b><span>in reading order</span></div>
      {tree.map(({ volume, continent, chapters }) => (
        <div key={volume.id} className="t-vol">
          <TreeRow lib={lib} kind="volume" row={volume} label={volume.countryName} meta={`Vol. ${String(volume.volumeNumber).padStart(2, '0')} · ${continent?.name}`} selected={selected} onSelect={onSelect} />
          {chapters.map(({ chapter, sections }, ci) => (
            <div key={chapter.id} className="t-ch">
              <TreeRow lib={lib} kind="chapter" row={chapter} label={chapter.cityName} meta={`Chapter ${toRoman(ci + 1)} · opening page`} selected={selected} onSelect={onSelect} movable first={ci === 0} last={ci === chapters.length - 1} />
              {sections.map(({ section, pages }, si) => (
                <div key={section.id} className="t-sec">
                  <TreeRow lib={lib} kind="section" row={section} label={section.title} meta={`${categoryName(section.category)} · Section ${toRoman(si + 1)} · welcome page`} selected={selected} onSelect={onSelect} movable first={si === 0} last={si === sections.length - 1} />
                  {pages.map((p, pi) => (
                    <TreeRow key={p.id} lib={lib} kind="page" row={p} label={p.title} icon={p.type} selected={selected} onSelect={onSelect} movable first={pi === 0} last={pi === pages.length - 1} />
                  ))}
                  <div className="t-add">
                    <button onClick={() => add(() => api.library.createPage(section.id, 'text'), 'page')}><Icon name="plus" size={13} /> Text page</button>
                    <button onClick={() => add(() => api.library.createPage(section.id, 'image'), 'page')}><Icon name="plus" size={13} /> Image page</button>
                  </div>
                </div>
              ))}
              <div className="t-add"><button onClick={() => add(() => api.library.createSection(chapter.id), 'section')}><Icon name="plus" size={13} /> Section</button></div>
            </div>
          ))}
          <div className="t-add"><button onClick={() => add(() => api.library.createChapter(volume.id), 'chapter')}><Icon name="plus" size={13} /> City chapter</button></div>
        </div>
      ))}
      <div className="t-add t-add-volume"><button onClick={() => setNewVolume(true)}><Icon name="plus" size={13} /> Country volume</button></div>
      {newVolume && <NewVolumeDialog lib={lib} onClose={() => setNewVolume(false)} onCreated={(v) => { setNewVolume(false); onSelect('volume', v.id) }} />}
    </aside>
  )
}

function TreeRow({ lib, kind, row, label, meta, icon, selected, onSelect, movable, first, last }) {
  const [run] = useAction()
  const active = selected.kind === kind && selected.id === row.id
  const hidden = row.status === 'published' && publicBlockers(lib, kind, row.id).length > 0
  return (
    <div className={`t-row t-${kind} ${active ? 'active' : ''}`}>
      <button className="t-main" onClick={() => onSelect(kind, row.id)} aria-current={active ? 'true' : undefined}>
        {icon && <span className="t-ic"><Icon name={icon} size={13} /></span>}
        <span className="t-label">{label}{meta && <small>{meta}</small>}</span>
        {hidden ? <StatusBadge status="draft" label="Hidden" /> : <StatusBadge status={row.status} />}
      </button>
      {movable && (
        <span className="t-move">
          <button disabled={first} onClick={() => run(() => api.library.move(kind, row.id, -1))} aria-label={`Move ${label} up`}><Icon name="up" size={13} /></button>
          <button disabled={last} onClick={() => run(() => api.library.move(kind, row.id, 1))} aria-label={`Move ${label} down`}><Icon name="down" size={13} /></button>
        </span>
      )}
    </div>
  )
}

function NewVolumeDialog({ lib, onClose, onCreated }) {
  const [form, setForm] = useState({ continentId: lib.continents[0].id, countryName: '', nameAr: '' })
  const [run, pending] = useAction()
  const submit = async (e) => {
    e.preventDefault()
    const res = await run(() => api.library.createVolume(form), { success: 'Draft volume created.' })
    if (res.ok) onCreated(res.result)
  }
  return (
    <Dialog title="New country volume" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field id="nv-continent" label="Shelf (continent)">
          <select id="nv-continent" className="input" value={form.continentId} onChange={(e) => setForm({ ...form, continentId: e.target.value })}>
            {lib.continents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field id="nv-name" label="Country"><input id="nv-name" className="input" required value={form.countryName} onChange={(e) => setForm({ ...form, countryName: e.target.value })} /></Field>
          <Field id="nv-ar" label="Arabic name" optional><input id="nv-ar" className="input" dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></Field>
        </div>
        <p className="adm-muted">New volumes start as drafts and stay off the shelves until published.</p>
        <div className="form-actions"><button className="adm-btn" disabled={pending || !form.countryName.trim()}>Create draft volume</button></div>
      </form>
    </Dialog>
  )
}
