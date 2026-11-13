import { busRoutes, type BusRoute } from './bus-routes';

export const cleanLocation = (value: string): string => value.trim().replace(/\s+/g, ' ');

// Only clear name/spelling variants. Do not collapse Delhi or Faridabad terminals.
const aliases: Record<string, string> = {
  gurgaon: 'gurugram',
  hissar: 'hisar',
  patiyala: 'patiala',
  isbtdelhi: 'isbt delhi',
  isbtjaipur: 'isbt jaipur',
  'isbtkashmiri gate': 'isbt kashmiri gate',
  isbtkashmirigate: 'isbt kashmiri gate',
  'skk , delhi': 'skk delhi',
};

export const locationKey = (value: string): string => {
  const key = cleanLocation(value).toLowerCase();
  return aliases[key] || key;
};

// Via stops do not establish a boarding departure or an arrival timetable.
export function matchRoutes(
  from: string,
  to?: string,
  records: BusRoute[] = busRoutes,
): BusRoute[] {
  const fromKey = locationKey(from);
  const toKey = to === undefined ? undefined : locationKey(to);
  if (!fromKey || toKey === '') return [];
  return records.filter(route =>
    cleanLocation(route.departureTime) && cleanLocation(route.to) &&
    locationKey(route.from) === fromKey &&
    (toKey === undefined || locationKey(route.to) === toKey),
  );
}

function publishedNames(values: string[]): string[] {
  const names = new Map<string, string>();
  for (const value of values) {
    const key = locationKey(value);
    if (key && !names.has(key)) names.set(key, cleanLocation(value));
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

export function boardingPoints(records: BusRoute[] = busRoutes): string[] {
  return publishedNames(records.filter(route =>
    matchRoutes(route.from, route.to, [route]).length > 0,
  ).map(route => route.from));
}

export function destinationsFrom(from: string, records: BusRoute[] = busRoutes): string[] {
  return publishedNames(matchRoutes(from, undefined, records).map(route => route.to));
}
