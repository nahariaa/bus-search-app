import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import BusSearchResults from '@/components/BusSearchResults';
import { routeSummaries, publicSnapshotId as snapshotId, usePublicJourney } from '@/lib/public-timetables';

export default function RouteTimetable({ summary }: { summary: typeof routeSummaries[number] }) {
  const { from, to, fromId, toId, path } = summary;
  const { journey, failed, retry } = usePublicJourney(summary.slug);
  const related = routeSummaries.filter(route => route.path !== path &&
    (route.fromId === fromId || route.toId === toId || (route.fromId === toId && route.toId === fromId)));
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
    <SEO title={`${from} to ${to} bus timetable | HaryanaBus`}
      description={`See published ${from} to ${to} bus departures, actual boarding points, service types, operating days and timetable sources. Confirm schedules before travelling.`}
      path={path} />
    <Link to="/routes" className="inline-block py-2 text-blue-700 underline underline-offset-4">All route timetables</Link>
    <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{from} to {to} bus timetable</h1>
    <div className="max-w-3xl space-y-3 text-slate-700">
      <p>Published {from} departures for {to}, including verified via stops. Times apply to each shown boarding point, not arrival at intermediate stops.</p>
      <details className="text-sm">
        <summary className="cursor-pointer py-2">Schedule and source notes</summary>
        <div className="space-y-2 pb-2">
          <p>Check operating days for each service. Buses continuing beyond {to} keep their true final destination below. Records from different timetables may overlap; these are not a count of buses running on a particular day.</p>
          <p>Source revision dates are not available in this snapshot. Timetable snapshot <code>{snapshotId.slice(0, 12)}</code> identifies the data used here and in interactive search; it is not a claim that schedules were recently checked.</p>
        </div>
      </details>
    </div>
    <Link to={`/search?${new URLSearchParams({ from: fromId, to: toId })}`} className="inline-flex min-h-12 items-center rounded-md bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800">
      Search {from} to {to}
    </Link>
    {journey ? <BusSearchResults routes={journey.services} fromCity={from} toCity={to} />
      : failed ? <div role="alert">Could not load this timetable. <button className="underline" onClick={retry}>Try again</button> or <a className="underline" href={path}>open the complete page</a>.</div>
      : <p role="status">Loading timetable…</p>}
    {related.length > 0 && <nav aria-label="Related route timetables" className="space-y-3 border-t pt-6">
      <h2 className="text-xl font-semibold">Related timetables</h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">{related.map(route => <li key={route.path}>
        <Link to={route.path} className="inline-block py-2 text-blue-700 underline underline-offset-4">{route.from} to {route.to}</Link>
      </li>)}</ul>
    </nav>}
  </div>;
}
