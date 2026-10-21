import { ApiError } from '../http/api-error.js';
import { MAX_PAGE_SIZE } from '../contracts/common.contracts.js';
import { TASK_STATUSES, type TasksRepository, type TasksService } from './tasks.types.js';

export const MAX_TASK_TITLE_LENGTH = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^\d+(?:\.\d+)?$/;

export function createTasksService(repository: TasksRepository): TasksService {
  return {
    list: async (query) => {
      if (!TASK_STATUSES.includes(query.status) || !Number.isSafeInteger(query.page) || query.page < 1
        || !Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE
        || !Number.isSafeInteger((query.page - 1) * query.pageSize)) throw invalid('Invalid task filters or pagination');
      return repository.list(query);
    },
    createManual: async (title, adminUserId) => {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > MAX_TASK_TITLE_LENGTH) throw invalid(`title must contain 1–${MAX_TASK_TITLE_LENGTH} characters`);
      return repository.createManual(title.trim(), adminUserId);
    },
    resolveManual: async (taskId, status, version, adminUserId) => {
      if (!UUID_PATTERN.test(taskId)) throw invalid('taskId must be a UUID');
      if (status !== 'done' && status !== 'dismissed') throw invalid('status must be done or dismissed');
      if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) throw invalid('version is required');
      return repository.resolveManual(taskId, status, version, adminUserId);
    },
  };
}

function invalid(message: string): ApiError { return new ApiError(400, 'VALIDATION_ERROR', message); }
