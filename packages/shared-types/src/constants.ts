export const ANALYTICS_EVENTS = {
  APP_LAUNCHED: 'app_launched',
  HOST_CARD_VIEWED: 'host_card_viewed',
  HOST_SELECTED: 'host_selected',
  AUTH_ENTRY_CLICKED: 'auth_entry_clicked',
  CMS_SESSION_STARTED: 'cms_session_started',
} as const

export const SOURCE_CHANNEL = {
  MINIAPP: 'miniapp',
  ADMIN: 'admin',
  API: 'api',
  OPS: 'ops',
} as const

export const SOURCE_CHANNELS = Object.values(SOURCE_CHANNEL)

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
export type SourceChannel = (typeof SOURCE_CHANNEL)[keyof typeof SOURCE_CHANNEL]
