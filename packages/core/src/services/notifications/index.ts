// services/notifications — barrel (mod-notifications #53 ①)
export { createNotificationsService } from './service'
export {
  NotificationNotFoundError,
  INBOX_PAGE_SIZE,
  type NotificationsService,
  type NotificationsServiceDeps,
  type InboxQuery,
  type UnreadCounts,
  type NotificationView,
} from './types'
