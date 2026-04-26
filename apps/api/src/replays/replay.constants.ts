export const REPLAY_ERROR_CODES = {
  NOT_FOUND: 'GUITA-REPLAY-001',
  HOST_NOT_FOUND: 'GUITA-REPLAY-002',
  INVALID_CURSOR: 'GUITA-REPLAY-003',
} as const

export const REPLAY_EVENT_NAMES = {
  OPEN: 'guita.replay.open',
  COMPLETE: 'guita.replay.complete',
} as const
