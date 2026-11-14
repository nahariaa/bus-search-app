import React from 'react';
import type { BusRoute } from '@/lib/bus-routes';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Bus as BusIcon, Calendar } from 'lucide-react';
import { routeMatchLabel } from '@/lib/route-label';
import { BUS_STAND_ENQUIRIES_URL } from '@/lib/site';

interface BusSearchResultsProps {
  routes: BusRoute[];
  fromCity: string;
  toCity: string;
}

const BusSearchResults: React.FC<BusSearchResultsProps> = ({
  routes,
  fromCity,
  toCity,
}) => {
  const hasMatches = routes.length > 0;

  return (
    <section className="space-y-4" aria-labelledby="results-heading">
      <div className="space-y-2 break-words">
        <h2 id="results-heading" className="text-xl font-semibold text-slate-900">
          {hasMatches ? 'Published departures' : 'No matching timetable found'}
        </h2>
        {!hasMatches && (
          <p className="text-sm text-slate-700">
            This timetable collection has no matching departure from {fromCity} to {toCity}.
            Try a different boarding point or destination, or ask the departure bus stand about service.
          </p>
        )}
        <p className="text-sm text-slate-700">
          Service can change. Confirm journey details with the operator or departure bus stand.
          {' '}<a href={BUS_STAND_ENQUIRIES_URL} className="text-blue-700 underline underline-offset-4">Haryana Roadways bus stand enquiries</a>
        </p>
      </div>

      <div className="grid gap-4">
        {routes.map(route => (
          <Card key={route.id} data-service-id={route.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Departure Time */}
                <div className="flex min-w-0 items-center space-x-2 break-words [&>svg]:shrink-0">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Departure</p>
                    <p className="font-semibold">{route.departureTime}</p>
                    <p className="text-sm text-gray-600">From {route.from}</p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="flex min-w-0 items-center space-x-2 break-words [&>svg]:shrink-0">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Route</p>
                    <p className="font-semibold">{routeMatchLabel(route)}</p>
                    {route.via && <p className="text-sm text-gray-600">Via {route.via}</p>}
                  </div>
                </div>

                {/* Service Type */}
                <div className="flex min-w-0 items-center space-x-2 break-words [&>svg]:shrink-0">
                  <BusIcon className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-semibold">{route.typeOfService || 'Not published'}</p>
                  </div>
                </div>

                {/* Service Days */}
                <div className="flex min-w-0 items-center space-x-2 break-words [&>svg]:shrink-0">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Service days</p>
                    <p className="font-semibold">{route.serviceDays.join(', ') || 'Not published'}</p>
                  </div>
                </div>
              </div>
              <details className="mt-4 text-sm text-gray-600">
                <summary className="cursor-pointer">Timetable source</summary>
                <p>{route.sourceTimetable} · PDF page {route.pdfPage}</p>
                <p>Operating depot: {route.operatingDepot || 'Not published'}{route.depotSource === 'filename' ? ' (from timetable title)' : ''}</p>
                <p>Operator: {route.operator || 'Not published'}</p>
                <p className="break-words">Source references: {route.sourceRefs.join(', ') || 'Not published'}</p>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default BusSearchResults;
