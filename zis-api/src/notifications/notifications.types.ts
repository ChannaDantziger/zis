import type { ApiListResponse } from '../contracts/common.contracts.js';

export const NOTIFICATION_FILTERS = ['all', 'unread', 'read'] as const;
export type NotificationFilter = typeof NOTIFICATION_FILTERS[number];
export interface AdminNotification {
  notificationId: string; notificationType: string; title: string; body: string;
  orderId: string | null; productVariantId: string | null;
  deliveryStatus: 'pending' | 'sent' | 'failed'; readAt: string | null; createdAt: string;
}
export interface NotificationListQuery { filter: NotificationFilter; page: number; pageSize: number; }
export interface NotificationPage extends ApiListResponse<AdminNotification> { unreadCount: number; }
export interface NotificationPreferences { pushNewOrderEnabled: boolean; pushActionRequiredEnabled: boolean; }
export type UpdateNotificationPreferences = Partial<NotificationPreferences>;
export interface NotificationsRepository {
  list(query: NotificationListQuery, adminUserId: string): Promise<NotificationPage>;
  markRead(notificationId: string, adminUserId: string): Promise<AdminNotification>;
  getPreferences(adminUserId: string): Promise<NotificationPreferences>;
  updatePreferences(input: UpdateNotificationPreferences, adminUserId: string): Promise<NotificationPreferences>;
}
export type NotificationsService = NotificationsRepository;