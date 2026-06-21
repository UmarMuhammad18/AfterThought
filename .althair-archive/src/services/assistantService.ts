import { api } from './api';

export const assistantService = {
  chat: async (message: string, model = 'gemma-3') => {
    return api.post<{ response: string; intent?: string }>('/ai/chat', { message, model });
  },
  memories: async () => api.get('/memories')
};
