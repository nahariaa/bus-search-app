import { createContext, useContext, useEffect, useState } from 'react';
import generated from '../../.tools/generated/public-routes.json';
import type { RoutePage } from './route-pages';

export const routeSummaries = generated.routes;
export const cityHubs = generated.cityHubs;
export const publicSnapshotId = generated.snapshotId;
export const InitialJourney = createContext<RoutePage | undefined>(undefined);
const loaders = import.meta.glob<{ default: RoutePage }>('../../.tools/generated/routes/*.json');
const cache = new Map<string, RoutePage>();

export function usePublicJourney(slug: string) {
  const initialPage = useContext(InitialJourney);
  const initial = initialPage?.slug === slug ? initialPage : undefined;
  const [journey, setJourney] = useState(() => initial ?? cache.get(slug));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    if (initial) { cache.set(slug, initial); return; }
    const cached = cache.get(slug);
    if (cached) { setJourney(cached); return; }
    loaders[`../../.tools/generated/routes/${slug}.json`]()
      .then(({ default: data }) => { cache.set(slug, data); if (active) setJourney(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [slug, initial, attempt]);
  return { journey, failed,
    retry: () => { setFailed(false); setAttempt(value => value + 1); } };
}
