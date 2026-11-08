import { useEffect, useState } from 'react';

type Loaded<T> =
  | { key: string; ok: true; data: T; loadedAt: Date }
  | { key: string; ok: false; error: unknown };

/**
 * Loads data for `key`, again when the key changes, and again on reload().
 * A result only counts for the key and reload it was fetched for, so a late
 * response for an earlier key never shows. update() changes the loaded data.
 * loadedAt is when the data last arrived or changed, so date-based states can
 * be worked out without reading the clock during render.
 */
export function useApiResource<T>(key: string, load: () => Promise<T>) {
  const [reloads, setReloads] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const requestKey = `${key}#${reloads}`;

  useEffect(() => {
    let ignore = false;
    load().then(
      (data) => { if (!ignore) setLoaded({ key: requestKey, ok: true, data, loadedAt: new Date() }); },
      (error: unknown) => { if (!ignore) setLoaded({ key: requestKey, ok: false, error }); },
    );
    return () => { ignore = true; };
    // `load` is a new function each render; the request key decides when to fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  return {
    data: current?.ok ? current.data : undefined,
    loadedAt: current?.ok ? current.loadedAt : undefined,
    error: current && !current.ok ? current.error : undefined,
    isLoading: current === null,
    reload: () => setReloads((count) => count + 1),
    update: (change: (data: T) => T) => {
      const loadedAt = new Date();
      setLoaded((prev) => (prev?.ok ? { ...prev, data: change(prev.data), loadedAt } : prev));
    },
  };
}
