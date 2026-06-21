import { api } from './api';
import type { Goal } from '../lib/types';

export const goalService = {
  list: async () => api.get<Goal[]>('/goals'),
  create: async (payload: Partial<Goal>) => api.post<Goal>('/goals', payload),
  update: async (id: string, payload: Partial<Goal>) => api.post<Goal>(`/goals/${id}`, payload),
  delete: async (id: string) => api.post('/goals/delete', { id })
};
