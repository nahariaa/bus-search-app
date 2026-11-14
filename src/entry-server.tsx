import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import App from './App';
import { publicRoutes } from './routes';
export { routePages } from './lib/route-pages';
export { snapshotId } from './lib/timetable';

export const publicPaths = publicRoutes.map(route => route.path);
export function render(path: string) {
  const context = {} as { helmet: HelmetServerState };
  const body = renderToString(<HelmetProvider context={context}><StaticRouter location={path}><App /></StaticRouter></HelmetProvider>);
  const { helmet } = context;
  return { body, head: helmet.title.toString() + helmet.meta.toString() + helmet.link.toString() };
}
export { SITE_URL } from './lib/site';
