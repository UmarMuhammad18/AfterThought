import { api } from './api';
import type { Task } from '../lib/types';

export const taskService = {
  list: async () => api.get<Task[]>('/tasks'),
  create: async (payload: Partial<Task>) => api.post<Task>('/tasks', payload),
  update: async (id: string, payload: Partial<Task>) => api.post<Task>(`/tasks/${id}`, payload),
  delete: async (id: string) => api.post('/tasks/delete', { id })
};
