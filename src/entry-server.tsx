import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import App from './App';
import { publicRoutes } from './routes';
import { cityHubs, routePages } from './lib/route-pages';
export { routePages } from './lib/route-pages';
export { snapshotId } from './lib/timetable';

const journeysByPath = new Map(routePages.filter(journey => journey.services.length).map(journey => [journey.path, journey]));
export const staticPages = [
  ...[...publicRoutes, ...cityHubs].map(({ path }) => ({ path, indexable: true })),
  ...routePages.map(({ path, services }) => ({ path, indexable: services.length > 0 })),
  { path: '/404', indexable: false },
  { path: '/search', indexable: false },
];

export function render(path: string) {
  const context = {} as { helmet: HelmetServerState };
  const journey = journeysByPath.get(path);
  const body = renderToString(<HelmetProvider context={context}><StaticRouter location={path}><App initialJourney={journey} /></StaticRouter></HelmetProvider>);
  const { helmet } = context;
  return { body, head: helmet.title.toString() + helmet.meta.toString() + helmet.link.toString(), journey };
}
export { SITE_URL } from './lib/site';
