import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { cityHubs, routePages } from '../src/lib/route-pages';
import { snapshotId } from '../src/lib/timetable';
import { routeInventory } from './route-inventory';

// Derived build output, never another source of timetable facts.
await mkdir('.tools/generated/routes', { recursive: true });
for (const file of await readdir('.tools/generated/routes')) {
  if (file.endsWith('.json')) await unlink(`.tools/generated/routes/${file}`);
}
await writeFile('.tools/generated/public-routes.json', JSON.stringify({ snapshotId, cityHubs,
  routes: routePages.map(({ slug, fromId, toId, from, to, path, hasHaryanaRoadways }) => (
    { slug, fromId, toId, from, to, path, hasHaryanaRoadways }
  )) }));
for (const journey of routePages) {
  await writeFile(`.tools/generated/routes/${journey.slug}.json`, JSON.stringify(journey));
}
await writeFile('.tools/generated/route-inventory.json', JSON.stringify(routeInventory(), null, 2) + '\n');
