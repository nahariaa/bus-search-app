import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { cityHubs, routePages } from '../src/lib/route-pages';
import { snapshotId } from '../src/lib/timetable';
import { routeInventory } from './route-inventory';

// Derived build output, never another source of timetable facts.
await mkdir('.tools/generated/routes', { recursive: true });
for (const file of await readdir('.tools/generated/routes')) {
  if (file.endsWith('.json')) await unlink(`.tools/generated/routes/${file}`);
}
const placeNames = Object.fromEntries(routePages.flatMap(({ fromId, toId, from, to }) => [[fromId, from], [toId, to]]));
await writeFile('.tools/generated/public-routes.json', JSON.stringify({ snapshotId, cityHubs, placeNames,
  routes: routePages.map(({ slug, fromId, toId, hasHaryanaRoadways, depotConnection, services }) => [
    fromId, toId, hasHaryanaRoadways, Boolean(depotConnection), services.length > 0,
    ...(slug === `${fromId}-to-${toId}` ? [] : [slug]),
  ]) }));
for (const journey of routePages) {
  if (!journey.services.length) continue;
  await writeFile(`.tools/generated/routes/${journey.slug}.json`, JSON.stringify(journey));
}
await writeFile('.tools/generated/route-inventory.json', JSON.stringify(routeInventory(), null, 2) + '\n');
