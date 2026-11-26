import { librarySeed } from './library.js'
import { accounts, stories, suggestions, messages, activity } from './records.js'

/** Bump when the fixtures change shape: stored demo data is then replaced. */
export const SEED_VERSION = 9

export function createSeed() {
  return structuredClone({ ...librarySeed, accounts, stories, suggestions, messages, activity })
}
