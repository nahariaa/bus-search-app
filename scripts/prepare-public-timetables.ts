import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { routePages } from '../src/lib/route-pages';
import { snapshotId } from '../src/lib/timetable';

// Derived build output, never another source of timetable facts.
await mkdir('.tools/generated/routes', { recursive: true });
for (const file of await readdir('.tools/generated/routes')) {
  if (file.endsWith('.json')) await unlink(`.tools/generated/routes/${file}`);
}
await writeFile('.tools/generated/public-routes.json', JSON.stringify({ snapshotId,
  routes: routePages.map(({ services: _services, ...summary }) => summary) }));
for (const journey of routePages) {
  await writeFile(`.tools/generated/routes/${journey.slug}.json`, JSON.stringify(journey));
}
