import { useEffect, useState } from 'react';

export interface ApiRequestState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function useApiRequest<T>(request: () => Promise<T>, initialData: T): ApiRequestState<T> {
  const [state, setState] = useState<ApiRequestState<T>>({
    data: initialData,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, loading: true, error: null }));

    request()
      .then(data => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch(error => {
        if (!active) return;
        setState(current => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Ocurrió un error al consultar la API.',
        }));
      });

    return () => {
      active = false;
    };
  }, [request]);

  return state;
}
