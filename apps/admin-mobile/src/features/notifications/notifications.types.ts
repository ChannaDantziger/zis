export interface AdminNotification {
  notificationId: string; notificationType: string; title: string; body: string;
  orderId: string | null; productVariantId: string | null;
  deliveryStatus: 'pending' | 'sent' | 'failed'; readAt: string | null; createdAt: string;
}
export interface NotificationPage {
  data: AdminNotification[]; unreadCount: number;
  page: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
export interface NotificationPreferences { pushNewOrderEnabled: boolean; pushActionRequiredEnabled: boolean; }
export type NotificationFilter = 'all' | 'unread' | 'read';