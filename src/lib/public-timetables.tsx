import { createContext, useContext, useEffect, useState } from 'react';
import generated from '../../.tools/generated/public-routes.json';
import type { RoutePage } from './route-pages';

export const routeSummaries = generated.routes;
export const publicSnapshotId = generated.snapshotId;
export const InitialJourney = createContext<RoutePage | undefined>(undefined);
const loaders = import.meta.glob<{ default: RoutePage }>('../../.tools/generated/routes/*.json');
const cache = new Map<string, RoutePage>();

export function usePublicJourney(slug: string) {
  const initial = useContext(InitialJourney);
  if (initial) cache.set(initial.slug, initial);
  const [journey, setJourney] = useState(() => cache.get(slug));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    const cached = cache.get(slug);
    if (cached) { setJourney(cached); return; }
    loaders[`../../.tools/generated/routes/${slug}.json`]()
      .then(({ default: data }) => { cache.set(slug, data); if (active) setJourney(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [slug, attempt]);
  return { journey: journey?.slug === slug ? journey : cache.get(slug), failed,
    retry: () => { setFailed(false); setAttempt(value => value + 1); } };
}
