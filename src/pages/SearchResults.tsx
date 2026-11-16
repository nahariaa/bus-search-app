import { Link, useLocation } from 'react-router-dom';
import BusSearchResults from '@/components/BusSearchResults';
import { useSearchData } from '@/hooks/use-search-data';
import BusSearchForm from '@/components/BusSearchForm';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';
import { routeSummaries } from '@/lib/public-timetables';

const SearchResults = () => {
  const { search } = useLocation();
  const { data, failed, start } = useSearchData(true);
  if (!data) return <>
    <SEO title="Search bus timetables | HaryanaBus" description="Search published Haryana Roadways bus timetables by boarding point and destination." path="/search" noIndex />
    <div className="mx-auto max-w-6xl px-4 py-7">
      <h1 className="text-2xl font-bold">Search bus timetables</h1>
      {failed ? <p role="alert">Could not load search timetables. <button className="min-h-11 underline" onClick={() => void start()}>Try again</button> or <a href="/routes" className="underline">browse published routes</a>.</p>
        : <p role="status">Loading search timetables…</p>}
    </div>
  </>;
  const { canonicalPlaceName, matchRoutes, buildSearchUrl, locationKey } = data;
  const searchParams = new URLSearchParams(search);
  const fromCity = canonicalPlaceName(searchParams.get('from') || '');
  const toCity = canonicalPlaceName(searchParams.get('to') || '');
  const matchingRoutes = matchRoutes(fromCity, toCity);
  const published = routeSummaries.find(route => route.fromId === locationKey(fromCity) && route.toId === locationKey(toCity));
  const hasRoute = Boolean(fromCity && toCity);
  const heading = hasRoute ? `${fromCity} to ${toCity} bus timetable` : 'Search bus timetables';

  return (
    <>
      <SEO
        title={`${heading} | HaryanaBus`}
        description={hasRoute
          ? `Check published bus departures from ${fromCity} to ${toCity} in the HaryanaBus timetable search.`
          : 'Search published Haryana Roadways bus timetables by boarding point and destination.'}
        path={hasRoute ? buildSearchUrl(fromCity, toCity) : '/search'}
        noIndex
      />
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <h1 className="mb-5 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {heading}
        </h1>
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <BusSearchForm key={search} initialFrom={fromCity} initialTo={toCity} />
          </CardContent>
        </Card>
        {published && <p className="mb-4 text-sm">
          <Link to={published.path} className="text-blue-700 underline underline-offset-4">
            Published {published.from} to {published.to} timetable and sources
          </Link>
        </p>}
        {hasRoute && <BusSearchResults routes={matchingRoutes} fromCity={fromCity} toCity={toCity} />}
      </div>
    </>
  );
};

export default SearchResults;
