import { createContext, useContext, useEffect, useState } from 'react';
import generated from '../../.tools/generated/public-routes.json';
import type { RoutePage } from './route-pages';

type PackedSummary = [fromId: string, toId: string, hasHaryanaRoadways: boolean, depotConnection: boolean,
  hasPublishedDepartures: boolean, customSlug?: string];
export const routeSummaries = (generated.routes as PackedSummary[]).map(([
  fromId, toId, hasHaryanaRoadways, depotConnection, hasPublishedDepartures, customSlug,
]) => {
  const slug = customSlug ?? `${fromId}-to-${toId}`;
  return {
    slug, fromId, toId, hasHaryanaRoadways, depotConnection, hasPublishedDepartures, path: `/routes/${slug}`,
    from: generated.placeNames[fromId] as string, to: generated.placeNames[toId] as string,
  };
});
export type RouteSummary = typeof routeSummaries[number];
export const routesBySlug = new Map(routeSummaries.map(route => [route.slug, route]));
const routesByPair = new Map(routeSummaries.map(route => [`${route.fromId}:${route.toId}`, route]));
export const connectionFrom = (fromId: string, toId: string) => routesByPair.get(`${fromId}:${toId}`);
export const cityHubs = generated.cityHubs;
export const publicSnapshotId = generated.snapshotId;
export const InitialJourney = createContext<RoutePage | undefined>(undefined);
const loaders = import.meta.glob<{ default: RoutePage }>('../../.tools/generated/routes/*.json');
const cache = new Map<string, RoutePage>();

export function usePublicJourney(slug: string, enabled: boolean) {
  const initialPage = useContext(InitialJourney);
  const initial = initialPage?.slug === slug ? initialPage : undefined;
  const [journey, setJourney] = useState(() => initial ?? cache.get(slug));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setFailed(false);
    if (initial) { cache.set(slug, initial); return; }
    const cached = cache.get(slug);
    if (cached) { setJourney(cached); return; }
    loaders[`../../.tools/generated/routes/${slug}.json`]()
      .then(({ default: data }) => { cache.set(slug, data); if (active) setJourney(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [slug, initial, attempt, enabled]);
  return { journey, failed,
    retry: () => { setFailed(false); setAttempt(value => value + 1); } };
}
