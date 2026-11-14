import { matchRoutes } from './route-matching';
import { placesById } from './timetable';

export interface RoutePageSelection {
  slug: string;
  fromId: string;
  toId: string;
  reason: string;
}

// Selection and presentation only. Services always come from the shared matcher.
export const routeManifest: RoutePageSelection[] = [
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
];

export function validateRouteManifest(selections: RoutePageSelection[] = routeManifest) {
  const slugs = new Set<string>();
  const pairs = new Set<string>();
  return selections.map(selection => {
    const { slug, fromId, toId } = selection;
    const pair = `${fromId}:${toId}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug) || pairs.has(pair)
      || fromId === toId || !placesById.has(fromId) || !placesById.has(toId)) {
      throw new Error(`Invalid static journey selection: ${slug} (${pair})`);
    }
    slugs.add(slug);
    pairs.add(pair);
    const services = matchRoutes(fromId, toId);
    if (!services.length) throw new Error(`Static journey ${slug} has no supported departures; review routeManifest.`);
    return { ...selection, path: `/routes/${slug}`, from: placesById.get(fromId)!.name,
      to: placesById.get(toId)!.name, services };
  });
}

export const routePages = validateRouteManifest();
export type RoutePage = typeof routePages[number];
