import { useCallback, useEffect, useState } from 'react';
import { getPortfolio, type Portfolio } from '../api';

interface State {
  data: Portfolio | null;
  error: string | null;
  loading: boolean;
}

// Module-level cache: navigating home -> project -> home does not refetch or flash a loader.
let cached: Portfolio | null = null;

export function usePortfolio() {
  const [state, setState] = useState<State>({ data: cached, error: null, loading: !cached });

  const load = useCallback((signal?: AbortSignal) => {
    setState((s) => ({ ...s, loading: !s.data, error: null }));
    getPortfolio(signal)
      .then((data) => {
        cached = data;
        setState({ data, error: null, loading: false });
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState((s) => ({ ...s, error: err.message, loading: false }));
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, retry: () => load() };
}
