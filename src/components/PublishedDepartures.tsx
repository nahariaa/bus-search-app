import { Fragment } from 'react';
import type { RoutePage } from '@/lib/route-pages';
import { operatorLabel, routeMatchLabel } from '@/lib/route-label';
import Advertisement from './Advertisement';
import TimetableSource from './TimetableSource';

export default function PublishedDepartures({ journey }: { journey: RoutePage }) {
  const sources = new Map(journey.sources.map(document => [document.file, document]));
  return <section aria-labelledby="departures-heading" className="space-y-2">
    <h2 id="departures-heading" className="text-lg font-semibold">Published departures</h2>
    <ul role="list" className="divide-y rounded-lg border border-slate-200 bg-white">
      {journey.services.map((route, index) => (
        <Fragment key={route.id}>
          <li data-service-id={route.id}
            className="grid grid-cols-[3.4rem_minmax(0,1fr)] gap-x-2 px-3 py-2 text-sm sm:grid-cols-[4.25rem_minmax(0,1fr)] sm:gap-x-3 sm:px-4">
            <time dateTime={route.departureTime} className="text-base font-bold tabular-nums text-slate-950">{route.departureTime}</time>
            <div className="min-w-0 break-words sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-x-3">
              <div>
                <p className="text-slate-700">From {route.from}</p>
                <p className="font-semibold text-slate-950">{routeMatchLabel(route)}</p>
                {route.via && <p className="text-slate-700">Via {route.via}</p>}
              </div>
              <div className="text-slate-700">
                <p className="mt-0.5 leading-snug sm:mt-0">
                  {route.typeOfService || 'Service type not published'} · {operatorLabel(route.operator)} · {route.serviceDays.length ? route.serviceDays.join(', ') : 'Days not published'}
                </p>
                {route.android && !route.pdfPage && <p className="text-xs">Android timetable</p>}
                <TimetableSource route={route} source={sources.get(route.sourceTimetable)} className="text-sm" />
              </div>
            </div>
          </li>
          {index === 4 && journey.services.length >= 6 &&
            <Advertisement path={journey.path} position="routeInline" />
          }
        </Fragment>
      ))}
    </ul>
  </section>;
}
