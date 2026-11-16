import { Link } from 'react-router-dom';
import type { RouteSummary } from '@/lib/public-timetables';

export default function ConnectionLinks({ routes, describeType = false }: {
  routes: RouteSummary[];
  describeType?: boolean;
}) {
  return <ul className="divide-y divide-slate-100">
    {routes.map(route => <li key={route.path} className="flex flex-wrap items-baseline gap-x-2">
      <Link to={route.path} className="inline-block min-h-9 py-2 text-sm text-blue-700 underline underline-offset-4">
        {route.from} to {route.to}{describeType && (route.hasPublishedDepartures ? ' bus timetable' : ' bus connection')}
      </Link>
      {!route.hasPublishedDepartures && <span className="pb-2 text-xs text-slate-600">No departure listed</span>}
    </li>)}
  </ul>;
}
