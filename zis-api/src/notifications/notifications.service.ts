import { MAX_PAGE_SIZE } from '../contracts/common.contracts.js';
import { ApiError } from '../http/api-error.js';
import { NOTIFICATION_FILTERS, type NotificationsRepository, type NotificationsService, type UpdateNotificationPreferences } from './notifications.types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFERENCE_KEYS = ['pushNewOrderEnabled', 'pushActionRequiredEnabled'];

export function createNotificationsService(repository: NotificationsRepository): NotificationsService {
  return {
    list: (query, adminUserId) => {
      if (!NOTIFICATION_FILTERS.includes(query.filter) || !Number.isSafeInteger(query.page) || query.page < 1 || !Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE || !Number.isSafeInteger((query.page - 1) * query.pageSize)) throw invalid('Invalid notification filter or pagination');
      return repository.list(query, adminUserId);
    },
    markRead: (notificationId, adminUserId) => {
      if (!UUID_PATTERN.test(notificationId)) throw invalid('notificationId must be a UUID');
      return repository.markRead(notificationId, adminUserId);
    },
    getPreferences: (adminUserId) => repository.getPreferences(adminUserId),
    updatePreferences: (input, adminUserId) => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Preferences must be a JSON object');
      const entries = Object.entries(input);
      if (!entries.length || entries.some(([key, value]) => !PREFERENCE_KEYS.includes(key) || typeof value !== 'boolean')) throw invalid('Only boolean pushNewOrderEnabled and pushActionRequiredEnabled are accepted');
      return repository.updatePreferences(input as UpdateNotificationPreferences, adminUserId);
    },
  };
}
function invalid(message: string): ApiError { return new ApiError(400, 'VALIDATION_ERROR', message); }