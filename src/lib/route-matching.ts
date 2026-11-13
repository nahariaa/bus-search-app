import { busRoutes, type BusRoute } from './bus-routes';
import { cleanLocation, locationKey, placeIncludes, placeName, placesById, resolvePlace } from './timetable';

export { cleanLocation, locationKey } from './timetable';

const valid = (route: BusRoute) => /^([01]\d|2[0-3]):[0-5]\d$/.test(route.departureTime) && route.fromId && route.toId;
const byOrigin = new Map<string, BusRoute[]>();
for (const route of busRoutes) {
  const group = byOrigin.get(route.fromId) ?? [];
  group.push(route);
  byOrigin.set(route.fromId, group);
}

export function matchRoutes(from: string, to?: string, records: BusRoute[] = busRoutes): BusRoute[] {
  const fromId = locationKey(from);
  const toId = to === undefined ? undefined : locationKey(to);
  if (!fromId || toId === '') return [];
  const originIds = [fromId, ...(placesById.get(fromId)?.members ?? [])];
  const candidates = records === busRoutes ? originIds.flatMap(id => byOrigin.get(id) ?? []) : records;
  return candidates.flatMap(route => {
    if (!valid(route) || !placeIncludes(fromId, route.fromId)) return [];
    if (toId === undefined || placeIncludes(toId, route.toId)) return [route];
    const via = route.viaIds.find(id => placeIncludes(toId, id));
    return via ? [{ ...route, matchedVia: placeName(via) }] : [];
  }).sort((a, b) => a.departureTime.localeCompare(b.departureTime) || a.id.localeCompare(b.id));
}

function publishedNames(ids: string[]): string[] {
  const unique = new Set(ids);
  for (const place of placesById.values()) {
    if (place.members.some(id => unique.has(id))) unique.add(place.id);
  }
  return [...unique].map(placeName).sort((a, b) => a.localeCompare(b));
}

export function boardingPoints(records: BusRoute[] = busRoutes): string[] {
  return publishedNames(records.filter(valid).map(route => route.fromId));
}

export function destinationsFrom(from: string, records: BusRoute[] = busRoutes): string[] {
  const fromId = locationKey(from);
  const ids = matchRoutes(from, undefined, records).flatMap(route => [route.toId, ...route.viaIds]);
  return publishedNames(ids.filter(id => !placeIncludes(fromId, id)));
}

export function placeSuggestions(query: string, available: string[]): string[] {
  const term = cleanLocation(query).toLowerCase();
  return available.filter(name => {
    const place = resolvePlace(name);
    return [name, place?.id ?? '', ...(place?.aliases ?? [])].some(alias => alias.toLowerCase().includes(term));
  });
}

export function buildSearchUrl(from: string, to: string): string {
  return `/search?${new URLSearchParams({ from: locationKey(from), to: locationKey(to) })}`;
}

export const routeMatchLabel = (route: BusRoute): string =>
  route.matchedVia ? `Towards ${route.to} · via ${route.matchedVia}` : `To ${route.to}`;

// Future static timetable pages must consume this shared matcher and snapshot.
export function timetablePairs(records: BusRoute[] = busRoutes): { from: string; to: string }[] {
  return boardingPoints(records).flatMap(from => destinationsFrom(from, records).map(to => ({ from, to })));
}
