// A tiny persisted document store for the mock API.
// `storage` is injectable (localStorage in the browser, memory in tests).

export function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

export function createStore({ storage, key, version, seed }) {
  const listeners = new Set()

  const load = () => {
    try {
      const raw = storage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.__version === version) return parsed
      }
    } catch {
      /* unreadable storage: start from the seed */
    }
    return { ...seed(), __version: version }
  }

  let state = load()

  const persist = () => {
    try {
      storage.setItem(key, JSON.stringify(state))
    } catch {
      /* quota or private mode: the session still works in memory */
    }
  }
  const emit = () => listeners.forEach((fn) => fn())

  return {
    /** Current state. Treat as read-only; change it through `write`. */
    read: () => state,
    /** Apply `recipe` to a copy of the state, persist, and notify subscribers. */
    write(recipe) {
      const next = structuredClone(state)
      const result = recipe(next)
      state = next
      persist()
      emit()
      return result
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    reset() {
      state = { ...seed(), __version: version }
      persist()
      emit()
    },
    /** Reload after another tab (or the phone preview frame) changed storage. */
    reload() {
      state = load()
      emit()
    },
  }
}
