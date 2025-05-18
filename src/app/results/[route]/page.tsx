import { busRoutes } from '@/data/busRoutes';
import { notFound } from 'next/navigation';
import React from 'react';
import Head from 'next/head';
import { BusRoute } from '@/types/bus';

function parseRouteParam(route: string) {
  // Split on '-to-' for multi-word city names
  const [fromRaw, toRaw] = route.split('-to-');
  const from = fromRaw ? fromRaw.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
  const to = toRaw ? toRaw.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
  return { from, to };
}

// @ts-expect-error Next.js dynamic route typing workaround
export async function generateMetadata({ params }) {
  const { from, to } = parseRouteParam(params.route);
  return {
    title: `${from} to ${to} Bus Timetable | Haryana Roadways Bus Timetable`,
    description: `Find all Haryana Roadways buses from ${from} to ${to}. Departure times, operators, and service days.`,
  };
}

function getBusTripsSchema(filteredRoutes: BusRoute[]) {
  return filteredRoutes.map((route) => ({
    '@context': 'https://schema.org',
    '@type': 'BusTrip',
    'busNumber': route.operator + '-' + route.departureTime.replace(/\s/g, ''),
    'provider': {
      '@type': 'Organization',
      'name': route.operator,
    },
    'departureBusStop': {
      '@type': 'BusStation',
      'name': route.from,
    },
    'arrivalBusStop': {
      '@type': 'BusStation',
      'name': route.via,
    },
    'departureTime': route.departureTime,
    'name': `${route.operator} ${route.typeOfService}`,
    'serviceDays': route.serviceDays.join(', '), // custom property
  }));
}

function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Haryana Roadways',
    'url': 'https://hartrans.gov.in/',
    'logo': 'https://hartrans.gov.in/images/logo.png',
  };
}

// @ts-expect-error Next.js dynamic route typing workaround
export default function ResultsPage({ params }) {
  const { from, to } = parseRouteParam(params.route);
  if (!from || !to) return notFound();

  const filteredRoutes = busRoutes.filter(route => {
    const matchesFrom = from.toLowerCase() === route.from.toLowerCase();
    const matchesTo = to.toLowerCase() === route.via.toLowerCase();
    return matchesFrom && matchesTo;
  });

  // JSON-LD schema for all buses in results
  const busTripsSchema = getBusTripsSchema(filteredRoutes);
  const orgSchema = getOrganizationSchema();

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([orgSchema, ...busTripsSchema]),
          }}
        />
      </Head>
      <main className="min-h-screen bg-[#f3fcfa] flex flex-col items-center p-0">
        <div className="w-full py-6 text-center bg-[#1a2340] text-white rounded-b-3xl shadow-lg mb-2">
          <h1 className="text-lg font-bold tracking-wide">{from} to {to} Bus Timetable</h1>
          <p className="text-xs mt-1 text-[#b3e5fc]">Haryana Roadways Bus Schedule</p>
        </div>
        <div className="w-80 max-w-xs mb-4">
          <div className="bg-[#e0f7f4] border border-[#b3e5fc] rounded-lg p-3 text-center text-[#1a2340] text-sm">
            Advertisement Space
          </div>
        </div>
        <div className="w-80 max-w-xs px-2 pb-8">
          <div className="mb-4 text-[#1a2340] text-sm text-center">
            Find all Haryana Roadways buses from <b>{from}</b> to <b>{to}</b> below. Timetable includes departure times, operators, and service days. Updated for 2024.
          </div>
          {filteredRoutes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-[#1a2340]">No buses found for this route.</div>
          ) : (
            <div className="space-y-4">
              {filteredRoutes.map((route, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow border border-[#e0f7f4]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[#1a2340] text-base">{route.operator}</span>
                    <span className="bg-[#e0f7f4] text-[#1a2340] text-xs px-2 py-1 rounded font-semibold border border-[#b3e5fc]">{route.typeOfService}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-lg font-semibold text-[#1a2340]">{route.departureTime}</span>
                    <span className="text-[#1a2340] text-sm">{route.from} → {route.via}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#22305a]">
                    <p>Service Days: {route.serviceDays.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
} 