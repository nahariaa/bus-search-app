import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { routeSummaries } from '@/lib/public-timetables';

export default function RouteDirectory() {
  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
    <SEO title="Haryana bus routes and published timetables | HaryanaBus"
      description="Browse published bus timetables for selected Haryana journeys, Delhi terminals and inter-state routes. See boarding points, service days and timetable sources."
      path="/routes" />
    <h1 className="text-3xl font-bold tracking-tight">Bus routes and timetables</h1>
    <p className="text-slate-700">Browse selected journeys with published departures in our timetable collection. Each page includes boarding points, operating days and source details.</p>
    <ul className="grid gap-3 sm:grid-cols-2">
      {routeSummaries.map(route => <li key={route.path}><Link to={route.path}
        className="block rounded-lg border bg-white p-4 font-medium text-blue-700 underline underline-offset-4 hover:border-blue-400">
        {route.from} to {route.to}
      </Link></li>)}
    </ul>
    <p className="text-sm text-slate-700">This is a selection of the available journeys, not a complete service directory. <Link to="/" className="text-blue-700 underline">Search other boarding points and destinations</Link>.</p>
  </div>;
}
