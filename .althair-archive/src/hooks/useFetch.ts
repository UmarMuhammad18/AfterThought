import { useEffect, useState } from 'react';

export const useFetch = <T,>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, ...options })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result as T);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url, JSON.stringify(options)]);

  return { data, loading, error };
};
