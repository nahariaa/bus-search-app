import { locationKey, matchRoutes, timetablePairs } from '../src/lib/route-matching';
import { meaningfulPair, routePages, routePath } from '../src/lib/route-pages';
import { documentSources, routeConflicts } from '../src/lib/timetable-evidence';
import { SITE_URL } from '../src/lib/site';
import { snapshotId } from '../src/lib/timetable';

const reviewedWithheld = [
  { fromId: 'yamunanagar', toId: 'shahabad' },
  { fromId: 'faridabad', toId: 'yamunanagar' },
  { fromId: 'karnal', toId: 'gurugram' },
  { fromId: 'isbt-anand-vihar-delhi', toId: 'haridwar' },
];

export function routeInventory() {
  const published = new Map(routePages.map(route => [`${route.fromId}:${route.toId}`, route]));
  const pairs = new Map<string, { fromId: string; toId: string }>();
  for (const { from, to } of timetablePairs()) {
    const fromId = locationKey(from);
    const toId = locationKey(to);
    if (meaningfulPair(fromId, toId)) pairs.set(`${fromId}:${toId}`, { fromId, toId });
  }
  for (const pair of reviewedWithheld) pairs.set(`${pair.fromId}:${pair.toId}`, pair);
  for (const [id, { fromId, toId }] of published) pairs.set(id, { fromId, toId });

  const candidates = Array.from(pairs.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([id, pair]) => {
    const { fromId, toId } = pair;
    const selection = published.get(id);
    const services = selection?.services ?? matchRoutes(fromId, toId);
    const sources = selection?.sources ?? documentSources(services);
    const conflict = routeConflicts.get(id);
    const path = selection?.path ?? routePath(`${fromId}-to-${toId}`);
    return {
      id, fromId, toId, path, candidateUrl: SITE_URL + path, recordCount: services.length,
      distinctDocumentCount: sources.length,
      documents: sources.map(({ file, sha256, versionStatus }) => ({ file, sha256, versionStatus })),
      evidence: services.length ? 'reviewed-snapshot-records' : 'no-supported-departures',
      reviewStatus: conflict ? 'unresolved-route-conflict' : selection
        ? (services.length ? 'reviewed-for-publication' : 'connection-only')
        : (services.length ? 'editorial-review-pending' : 'withheld'),
      indexable: Boolean(selection && services.length),
      publication: selection ? (selection.newPage ? 'selected-for-release' : 'existing') : 'withheld',
      reason: selection
        ? (services.length ? selection.reason : 'Depot connection page without a supported through departure in the reviewed snapshot.')
        : (services.length ? 'Outside the publication scope. Review passenger usefulness and sources before selecting.' : 'No supported departure in the reviewed snapshot.'),
    };
  });
  return { snapshotId, prioritization: 'Provisional. No Search Console export was supplied.', candidates };
}
