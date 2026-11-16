import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import ConnectionLinks from '@/components/ConnectionLinks';
import SEO from '@/components/SEO';
import { cityHubs, routeSummaries } from '@/lib/public-timetables';

const depotGroups = cityHubs.map(city => ({
  ...city,
  routes: routeSummaries.filter(route => route.depotConnection && route.fromId === city.id)
    .sort((a, b) => a.to.localeCompare(b.to)),
})).sort((a, b) => a.name.localeCompare(b.name));
const otherRoutes = routeSummaries.filter(route => !route.depotConnection);

export default function RouteDirectory() {
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title="Haryana Roadways depot connections and bus timetables | HaryanaBus"
      description="Browse directional bus connections between Haryana Roadways depot areas, with published timetables and boarding points where available."
      path="/routes" />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' }]} />
    <h1 className="text-3xl font-bold tracking-tight">Bus routes and timetables</h1>
    <section className="space-y-3" aria-labelledby="depot-departures">
      <h2 id="depot-departures" className="text-xl font-semibold">Connections by departure depot</h2>
      <p className="text-slate-700">Choose a depot to find a dedicated page to every other depot area. Timetable pages show the boarding point listed in the source.</p>
      <div className="grid items-start gap-2 sm:grid-cols-2">
        {depotGroups.map(({ id, name, path, routes }) => (
          <details key={id} className="rounded-lg border bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-2.5 font-semibold">{name}</summary>
            <div className="border-t px-4 pb-2">
              <Link to={path} className="inline-block min-h-9 py-2 text-sm font-semibold text-blue-700 underline underline-offset-4">All connections from {name}</Link>
              <ConnectionLinks routes={routes} />
            </div>
          </details>
        ))}
      </div>
    </section>
    {otherRoutes.length > 0 && <section className="space-y-2" aria-labelledby="other-timetables">
      <h2 id="other-timetables" className="text-xl font-semibold">Other published timetables</h2>
      <ConnectionLinks routes={otherRoutes} />
    </section>}
    <p className="text-sm text-slate-700"><Link to="/" className="text-blue-700 underline">Search other boarding points and destinations</Link>.</p>
  </div>;
}
