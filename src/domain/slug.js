/** URL-safe slug: "Gabès" → "gabes". */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A slug not already used in `taken` ("gabes", "gabes-2", …). */
export function uniqueSlug(text, taken) {
  const base = slugify(text) || 'untitled'
  let slug = base
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`
  return slug
}
