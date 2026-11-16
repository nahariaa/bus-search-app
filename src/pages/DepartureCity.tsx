import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEO from '@/components/SEO';
import { cityHubs, routeSummaries } from '@/lib/public-timetables';
import { BUS_STAND_ENQUIRIES_URL, OFFICIAL_TIMETABLE_DIRECTORY_URL } from '@/lib/site';

export default function DepartureCity({ city }: { city: typeof cityHubs[number] }) {
  const { id, name, path, boardingPoints } = city;
  const departures = routeSummaries.filter(route => route.fromId === id);
  const arrivals = routeSummaries.filter(route => route.toId === id).slice(0, 4);
  const links = (routes: typeof routeSummaries) => <ul className="grid gap-2 sm:grid-cols-2">
    {routes.map(route => <li key={route.path}>
      <Link to={route.path} className="block rounded-lg border bg-white px-4 py-3 font-medium text-blue-700 underline underline-offset-4 hover:border-blue-400">
        {route.from} to {route.to} bus timetable
      </Link>
    </li>)}
  </ul>;
  return <article className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title={`Bus Departures from ${name} | HaryanaBus`}
      description={`Browse published bus timetables for departures from ${name}, with boarding points, operators and official timetable sources for each journey.`}
      path={path} />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' }, { path, name }]} />
    <h1 className="text-3xl font-bold tracking-tight">Bus departures from {name}</h1>
    <section className="space-y-2" aria-labelledby="from-city-routes">
      <h2 id="from-city-routes" className="text-lg font-semibold">Timetables from {name}</h2>
      {links(departures)}
    </section>
    <section className="space-y-2 text-slate-700" aria-labelledby="city-boarding">
      <h2 id="city-boarding" className="text-lg font-semibold text-slate-950">Boarding points</h2>
      <p>These timetables group departures by the published boarding point. The operating depot is listed separately on each timetable.</p>
      <ul className="list-disc space-y-1 pl-5">{boardingPoints.map(point => <li key={point}>{point}</li>)}</ul>
      {boardingPoints.length > 1 && <p>Confirm your terminal with the bus stand when a row gives only the city name.</p>}
      <p className="text-sm text-blue-700 [&_a]:inline-block [&_a]:py-1 [&_a]:underline [&_a]:underline-offset-4">
        <a href={BUS_STAND_ENQUIRIES_URL}>Official bus stand enquiries</a>{' · '}
        <a href={OFFICIAL_TIMETABLE_DIRECTORY_URL}>Official depot timetable directory</a>
      </p>
    </section>
    {arrivals.length > 0 && <section className="space-y-2" aria-labelledby="to-city-routes">
      <h2 id="to-city-routes" className="text-lg font-semibold">Timetables to {name}</h2>
      {links(arrivals)}
    </section>}
  </article>;
}
