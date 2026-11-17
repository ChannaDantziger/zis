import { ApiError } from '../http/api-error.js';
import type { HomeTaskStatus, HomeTasksRepository } from './home-tasks.types.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES: readonly HomeTaskStatus[] = ['open', 'in_progress', 'closed'];
const MAX_TITLE = 200, MAX_NOTE = 5000;

export function createHomeTasksService(repository: HomeTasksRepository): HomeTasksRepository {
  return {
    list: () => repository.list(),
    create: (title, description, status, userId) => {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > MAX_TITLE || !validNote(description) || !STATUSES.includes(status)) throw invalid();
      return repository.create(title.trim(), description?.trim() || null, status, userId);
    },
    change: (taskId, status, note, version, userId) => {
      if (!UUID.test(taskId) || !STATUSES.includes(status) || !validNote(note) || typeof version !== 'string' || !/^\d+(?:\.\d+)?$/.test(version)) throw invalid();
      return repository.change(taskId, status, note?.trim() || null, version, userId);
    },
  };
}

function validNote(value: string | null) { return value === null || (typeof value === 'string' && value.trim().length <= MAX_NOTE); }
function invalid() { return new ApiError(400, 'VALIDATION_ERROR', 'Invalid task input'); }
