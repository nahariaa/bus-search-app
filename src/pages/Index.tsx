import BusSearchForm from '@/components/BusSearchForm';
import PopularRoutes from '@/components/PopularRoutes';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { cityHubs } from '@/lib/public-timetables';
import { BUS_STAND_ENQUIRIES_URL, CONTACT_EMAIL_LINK } from '@/lib/site';

const Index = () => (
  <>
    <SEO
      title="Haryana Roadways Bus Timetable & Route Timings | HaryanaBus"
      description="Search published Haryana Roadways bus timetables by boarding point and destination. See departure times, route stops and service days on HaryanaBus."
      path="/"
    />
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-12">
      <div className="mb-5 sm:mb-7 sm:text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Haryana Roadways bus timings
        </h1>
        <p className="mt-2 text-slate-600">
          Search published timetables by boarding point and destination.
        </p>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-7">
          <BusSearchForm />
        </CardContent>
      </Card>
      <section className="mt-6 space-y-2" aria-labelledby="browse-cities">
        <h2 id="browse-cities" className="text-xl font-semibold">Browse by departure city</h2>
        <ul className="flex flex-wrap gap-2">
          {cityHubs.filter(city => ['jind', 'chandigarh'].includes(city.id)).map(city => <li key={city.id}>
            <Link to={city.path} className="inline-block rounded-lg border bg-white px-4 py-2 text-blue-700 underline underline-offset-4">
              Departures from {city.name}
            </Link>
          </li>)}
          <li><Link to="/routes" className="inline-block rounded-lg border bg-white px-4 py-2 text-blue-700 underline underline-offset-4">All depot connections</Link></li>
        </ul>
      </section>
      <PopularRoutes />
      <section className="mt-6 space-y-2 border-t pt-4 text-sm text-slate-700" aria-labelledby="passenger-help">
        <h2 id="passenger-help" className="text-lg font-semibold text-slate-950">Timetable sources and passenger help</h2>
        <p>Schedules come from published depot timetables. Check your boarding point and service day before travel.</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-blue-700 [&_a]:inline-block [&_a]:py-1 [&_a]:underline [&_a]:underline-offset-4">
          <li><Link to="/about">How we use timetable sources</Link></li>
          <li><a href={BUS_STAND_ENQUIRIES_URL}>Official bus stand enquiries</a></li>
          <li><a href={CONTACT_EMAIL_LINK}>Report a timetable issue</a></li>
        </ul>
      </section>
    </div>
  </>
);

export default Index;
