import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEO from '@/components/SEO';
import { cityHubs, routeSummaries } from '@/lib/public-timetables';

const byOrigin = new Map<string, typeof routeSummaries>();
for (const route of routeSummaries) {
  const routes = byOrigin.get(route.fromId) ?? [];
  routes.push(route);
  byOrigin.set(route.fromId, routes);
}
const groups = Array.from(byOrigin.values()).sort(([a], [b]) => a.from.localeCompare(b.from));

export default function RouteDirectory() {
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title="Haryana bus routes and published timetables | HaryanaBus"
      description="Browse published bus timetables for selected Haryana journeys, Delhi terminals and inter-state routes. See boarding points, service days and timetable sources."
      path="/routes" />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' }]} />
    <h1 className="text-3xl font-bold tracking-tight">Bus routes and timetables</h1>
    <p className="text-slate-700">Browse selected timetable pages by published departure city or terminal.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map(routes => {
        const { fromId, from } = routes[0];
        const hub = cityHubs.find(city => city.id === fromId);
        return <section key={fromId} aria-labelledby={`origin-${fromId}`} className="rounded-lg border bg-white px-4 py-3">
          <h2 id={`origin-${fromId}`} className="text-lg font-semibold">{from}</h2>
          <ul className="mt-1 [&_a]:inline-block [&_a]:py-1.5 [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-4">
            {routes.map(route => <li key={route.path}><Link to={route.path}>{route.from} to {route.to}</Link></li>)}
            {hub && <li><Link to={hub.path}>Browse departures from {from}</Link></li>}
          </ul>
        </section>;
      })}
    </div>
    <p className="text-sm text-slate-700"><Link to="/" className="text-blue-700 underline">Search other boarding points and destinations</Link>.</p>
  </div>;
}
