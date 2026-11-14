import Index from './pages/Index';
import About from './pages/About';
import Privacy from './pages/Privacy';
import RouteDirectory from './pages/RouteDirectory';
import RouteTimetable from './pages/RouteTimetable';
import { routeSummaries } from './lib/public-timetables';

// The router and build consume this same list of indexable pages.
export const publicRoutes = [
  { path: '/', element: <Index /> },
  { path: '/about', element: <About /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/routes', element: <RouteDirectory /> },
  ...routeSummaries.map(journey => ({ path: journey.path, element: <RouteTimetable summary={journey} /> })),
];
