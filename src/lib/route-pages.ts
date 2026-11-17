import { matchRoutes } from './route-matching';
import { locationKey, placeIncludes, placesById } from './timetable';
import { documentSources, routeConflicts } from './timetable-evidence';
import { hasHaryanaRoadwaysOperator } from './route-label';

export interface RoutePageSelection {
  slug: string;
  fromId: string;
  toId: string;
  reason: string;
  newPage?: true;
  depotConnection?: true;
}

// Preserve published paths and editorial notes. All services still come from the shared matcher.
const existingSelections: RoutePageSelection[] = [
  { slug: 'delhi-to-chandigarh', fromId: 'delhi', toId: 'chandigarh', reason: 'Search Console candidate with published Delhi terminal departures.' },
  { slug: 'gurugram-to-haridwar', fromId: 'gurugram', toId: 'haridwar', reason: 'Search Console candidate with published inter-state services.' },
  { slug: 'delhi-to-yamunanagar', fromId: 'delhi', toId: 'yamunanagar', reason: 'Search Console candidate with verified timetable coverage.' },
  { slug: 'fatehabad-to-delhi', fromId: 'fatehabad', toId: 'delhi', reason: 'Search Console candidate connecting western Haryana to Delhi.' },
  { slug: 'rohtak-to-gurugram', fromId: 'rohtak', toId: 'gurugram', reason: 'Search Console candidate with published regional departures.' },
  { slug: 'sirsa-to-delhi', fromId: 'sirsa', toId: 'delhi', reason: 'Search Console candidate with verified long-distance coverage.' },
  { slug: 'gurugram-to-hisar', fromId: 'gurugram', toId: 'hisar', reason: 'Existing homepage shortcut and Search Console candidate.' },
  { slug: 'delhi-to-ludhiana', fromId: 'delhi', toId: 'ludhiana', reason: 'Existing homepage shortcut; includes verified intermediate stops on Katra services.' },
  { slug: 'chandigarh-to-delhi', fromId: 'chandigarh', toId: 'delhi', reason: 'Existing homepage shortcut; independently supported reverse journey.' },
  { slug: 'bhiwani-to-delhi', fromId: 'bhiwani', toId: 'delhi', reason: 'Existing homepage shortcut backed by reviewed Delhi departures.' },
  { slug: 'sarai-kale-khan-delhi-to-jaipur', fromId: 'isbt-sarai-kale-khan-delhi', toId: 'jaipur', reason: 'Terminal-specific boarding coverage, distinct from Kashmiri Gate and Anand Vihar.' },
  { slug: 'jind-to-chandigarh', fromId: 'jind', toId: 'chandigarh', reason: 'Jind depot PDF publishes departures from Jind, including HR and CTU. Retain Kaithal for the three rows in the route conflict queue.' },
  { slug: 'chandigarh-to-jind', fromId: 'chandigarh', toId: 'jind', reason: 'Independent Chandigarh and Ambala publications support reverse travel, including named Chandigarh terminals.' },
  { slug: 'jind-to-delhi', fromId: 'jind', toId: 'delhi', reason: 'Jind depot PDF documents boarding in Jind and distinct Rohtak and Bahadurgarh variants.' },
  { slug: 'hisar-to-chandigarh', fromId: 'hisar', toId: 'chandigarh', reason: 'Hisar depot PDF records boarding in Hisar and distinguishes published operators.' },
  { slug: 'rohtak-to-chandigarh', fromId: 'rohtak', toId: 'chandigarh', reason: 'Rohtak depot PDF records local boarding and multiple published operators.' },
  { slug: 'gurugram-to-chandigarh', fromId: 'gurugram', toId: 'chandigarh', reason: 'Gurugram depot PDF records published Gurugram departures and service days.' },
  { slug: 'sirsa-to-chandigarh', fromId: 'sirsa', toId: 'chandigarh', reason: 'Sirsa depot archive records departures from Sirsa. The current official download has a different hash with identical extracted page text, so archive references stay separate.' },
];

// Both pages of the official depot-wise timetable directory. The two Delhi publications
// share one departure area. See docs/static-generation.md for the reviewed terminal groupings.
export const depotPlaceIds = [
  'ambala', 'bhiwani', 'chandigarh', 'charkhi-dadri', 'delhi', 'faridabad', 'fatehabad',
  'gurugram', 'hisar', 'jhajjar', 'jind', 'kaithal', 'karnal', 'kurukshetra', 'narnaul',
  'nuh', 'palwal', 'panchkula', 'panipat', 'rewari', 'rohtak', 'sirsa', 'sonipat', 'yamunanagar',
];
const depotIds = new Set(depotPlaceIds);
const isDepotPair = (fromId: string, toId: string) => depotIds.has(fromId) && depotIds.has(toId) && fromId !== toId;
const existingPairs = new Set(existingSelections.map(({ fromId, toId }) => `${fromId}:${toId}`));

export const routeManifest: RoutePageSelection[] = [
  ...existingSelections.map(selection => ({
    ...selection, ...(isDepotPair(selection.fromId, selection.toId) ? { depotConnection: true as const } : {}),
  })),
  { slug: 'bhiwani-to-mathura', fromId: 'bhiwani', toId: 'mathura', newPage: true,
    reason: 'The 04:30 Bhiwani departure has complementary depot and Android stop evidence.' },
  ...depotPlaceIds.flatMap(fromId => depotPlaceIds
    .filter(toId => fromId !== toId && !existingPairs.has(`${fromId}:${toId}`))
    .map(toId => ({
      slug: `${fromId}-to-${toId}`, fromId, toId, newPage: true as const, depotConnection: true as const,
      reason: 'Directional connection between two places in the official depot-wise timetable directory.',
    }))),
];

export function meaningfulPair(fromId: string, toId: string): boolean {
  return placesById.has(fromId) && placesById.has(toId)
    && locationKey(fromId) === fromId && locationKey(toId) === toId
    && !placeIncludes(fromId, toId) && !placeIncludes(toId, fromId);
}

export const routePath = (slug: string) => `/routes/${slug}`;

export function validateRouteManifest(selections: RoutePageSelection[] = routeManifest) {
  const slugs = new Set<string>();
  const pairs = new Set<string>();
  return selections.map(selection => {
    const { slug, fromId, toId } = selection;
    const pair = `${fromId}:${toId}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug) || pairs.has(pair)
      || !selection.reason.trim() || !meaningfulPair(fromId, toId)
      || (selection.depotConnection && !isDepotPair(fromId, toId))) {
      throw new Error(`Invalid static journey selection: ${slug} (${pair})`);
    }
    slugs.add(slug);
    pairs.add(pair);
    const services = matchRoutes(fromId, toId);
    if (!services.length && !selection.depotConnection) {
      throw new Error(`Static journey ${slug} has no supported departures; review routeManifest.`);
    }
    const sources = documentSources(services);
    const conflict = routeConflicts.get(pair);
    if (conflict && conflict.serviceIds.some((id, i) => !services.some(service => service.id === id
      && service.departureTime === conflict.departures[i] && service.pdfPage === conflict.page
      && service.sourceTimetable === conflict.source && service.via === conflict.publishedVia))) {
      throw new Error(`Review the open evidence conflict for ${slug} against the updated timetable.`);
    }
    return { ...selection, path: routePath(slug), from: placesById.get(fromId)!.name,
      to: placesById.get(toId)!.name, hasHaryanaRoadways: services.some(service => hasHaryanaRoadwaysOperator(service.operator)),
      routeNotice: conflict ? `The ${conflict.source} timetable lists ${conflict.departures.join(', ')} via ${conflict.publishedVia}. Confirm routing for these departures with the bus stand.` : null,
      services, sources };
  });
}

export const routePages = validateRouteManifest();
export type RoutePage = typeof routePages[number];

export const cityHubs = depotPlaceIds.map(id => {
  const journeys = routePages.filter(route => route.fromId === id && route.services.length);
  if (journeys.length === 0) throw new Error(`Departure hub ${id} needs a published boarding point.`);
  const boardingPoints = [...new Set(journeys.flatMap(route => route.services.map(service => service.from)))].sort();
  return { id, name: journeys[0].from, path: `/cities/${id}`, boardingPoints };
});
