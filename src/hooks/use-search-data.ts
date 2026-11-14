import { useCallback, useEffect, useRef, useState } from 'react';
import { getSearchData, loadSearchData, type SearchData } from '@/lib/search-data';

export function useSearchData(automatic = false) {
  const [data, setData] = useState<SearchData | undefined>(getSearchData);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const start = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const engine = await loadSearchData();
      if (mounted.current) setData(engine);
      return engine;
    } catch {
      if (mounted.current) setFailed(true);
      return undefined;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => { if (automatic && !getSearchData()) void start(); }, [automatic, start]);
  return { data, loading, failed, start };
}
