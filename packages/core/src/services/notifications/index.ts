// services/notifications — barrel (mod-notifications #53 ①)
export { createNotificationsService, registerNotificationsEffects } from './service'
export {
  NotificationNotFoundError,
  InvalidNotificationError,
  INBOX_PAGE_SIZE,
  type NotificationsService,
  type NotificationsServiceDeps,
  type NotificationsPrefsPort,
  type DeliverContext,
  type FireInput,
  type InboxQuery,
  type UnreadCounts,
  type NotificationView,
} from './types'
