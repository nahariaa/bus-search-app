import { useParams } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import ConnectionLinks from '@/components/ConnectionLinks';
import SEO from '@/components/SEO';
import { cityHubs, routeSummaries } from '@/lib/public-timetables';
import { BUS_STAND_ENQUIRIES_URL, OFFICIAL_TIMETABLE_DIRECTORY_URL } from '@/lib/site';
import NotFound from './NotFound';

export default function DepartureCity() {
  const { slug } = useParams();
  const city = cityHubs.find(hub => hub.id === slug);
  return city ? <CityPage key={city.id} city={city} /> : <NotFound />;
}

function CityPage({ city }: { city: typeof cityHubs[number] }) {
  const { id, name, path, boardingPoints } = city;
  const departures = routeSummaries.filter(route => route.fromId === id)
    .sort((a, b) => a.to.localeCompare(b.to));
  const published = departures.filter(route => route.hasPublishedDepartures);
  const unlisted = departures.filter(route => !route.hasPublishedDepartures);
  return <article className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title={`Bus Departures from ${name} | HaryanaBus`}
      description={`Browse bus connections from the ${name} depot area, with published departure times and boarding points where listed.`}
      path={path} />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' }, { path, name }]} />
    <h1 className="text-3xl font-bold tracking-tight">Bus departures from {name}</h1>
    <section className="space-y-2 text-slate-700" aria-labelledby="city-boarding">
      <h2 id="city-boarding" className="text-lg font-semibold text-slate-950">Published boarding points</h2>
      <p>{boardingPoints.join(' · ')}</p>
      {boardingPoints.length > 1 && <p>Check the boarding point for your specific departure with the bus stand.</p>}
      <p className="flex flex-wrap gap-x-4 text-sm text-blue-700 [&_a]:inline-block [&_a]:py-1 [&_a]:underline [&_a]:underline-offset-4">
        <a href={BUS_STAND_ENQUIRIES_URL}>Official bus stand enquiries</a>
        <a href={OFFICIAL_TIMETABLE_DIRECTORY_URL}>Official depot timetable directory</a>
      </p>
    </section>
    <section className="space-y-2" aria-labelledby="from-city-routes">
      <h2 id="from-city-routes" className="text-lg font-semibold">Published timetables from {name}</h2>
      <ConnectionLinks routes={published} describeType />
    </section>
    {unlisted.length > 0 && <details className="rounded-lg border bg-white px-4">
      <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">Connections without a listed departure</summary>
      <ConnectionLinks routes={unlisted} describeType />
    </details>}
  </article>;
}
