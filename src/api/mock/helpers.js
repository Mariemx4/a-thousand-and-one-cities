import { notFound } from '../errors.js'

export const now = () => new Date().toISOString()

let counter = 0
export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Simulated network latency, so loading states are real. */
export const latency = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve())

export function findOr404(list, id, what) {
  const row = list.find((x) => x.id === id)
  if (!row) throw notFound(what)
  return row
}

/** Append an entry to the activity log (newest first). */
export function logActivity(db, actor, verb, target) {
  db.activity.unshift({ id: newId('act'), at: now(), actor, verb, target })
  if (db.activity.length > 200) db.activity.length = 200
}

export const EDITOR_NAME = 'Library editor'
