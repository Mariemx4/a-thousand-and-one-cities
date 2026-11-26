// Review workflows: which status changes are allowed for each record type.
import { STORY_STATUS as S, SUGGESTION_STATUS as G, MESSAGE_STATUS as M } from './constants.js'

const STORY_FLOW = {
  [S.NEW]: [S.IN_REVIEW, S.CHANGES_REQUESTED, S.ACCEPTED, S.DECLINED],
  [S.IN_REVIEW]: [S.CHANGES_REQUESTED, S.ACCEPTED, S.DECLINED],
  [S.CHANGES_REQUESTED]: [S.IN_REVIEW, S.ACCEPTED, S.DECLINED],
  [S.ACCEPTED]: [S.IN_REVIEW],
  [S.DECLINED]: [S.IN_REVIEW],
}
const SUGGESTION_FLOW = {
  [G.NEW]: [G.IN_REVIEW, G.NEEDS_INFO, G.ACCEPTED, G.DECLINED],
  [G.IN_REVIEW]: [G.NEEDS_INFO, G.ACCEPTED, G.DECLINED],
  [G.NEEDS_INFO]: [G.IN_REVIEW, G.ACCEPTED, G.DECLINED],
  [G.ACCEPTED]: [G.IN_REVIEW],
  [G.DECLINED]: [G.IN_REVIEW],
}
const MESSAGE_FLOW = {
  [M.NEW]: [M.OPEN, M.RESOLVED],
  [M.OPEN]: [M.RESOLVED],
  [M.RESOLVED]: [M.OPEN],
}
const FLOWS = { story: STORY_FLOW, suggestion: SUGGESTION_FLOW, message: MESSAGE_FLOW }

export function nextStatuses(kind, status) {
  return FLOWS[kind]?.[status] ?? []
}

export function assertTransition(kind, from, to) {
  if (!nextStatuses(kind, from).includes(to)) {
    throw new Error(`A ${kind} cannot move from “${from}” to “${to}”.`)
  }
}

/** Only accepted records may become draft library content. */
export const canCreateDraft = (record) => record?.status === 'accepted'
