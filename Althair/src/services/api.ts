import { supabaseClient } from './supabaseClient';

const createHeaders = async () => {
  const session = await supabaseClient.auth.getSession();
  const token = session.data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  post: async <T>(path: string, body: any) => {
    const headers = await createHeaders();
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Server request failed');
    return (await response.json()) as T;
  },
  get: async <T>(path: string) => {
    const headers = await createHeaders();
    const response = await fetch(`/api${path}`, { headers });
    if (!response.ok) throw new Error('Server request failed');
    return (await response.json()) as T;
  }
};
