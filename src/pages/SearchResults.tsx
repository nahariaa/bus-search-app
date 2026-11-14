import { useLocation } from 'react-router-dom';
import BusSearchResults from '@/components/BusSearchResults';
import { buildSearchUrl, matchRoutes } from '@/lib/route-matching';
import { canonicalPlaceName } from '@/lib/timetable';
import BusSearchForm from '@/components/BusSearchForm';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';

const SearchResults = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const fromCity = canonicalPlaceName(searchParams.get('from') || '');
  const toCity = canonicalPlaceName(searchParams.get('to') || '');
  const matchingRoutes = matchRoutes(fromCity, toCity);
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
        {hasRoute && <BusSearchResults routes={matchingRoutes} fromCity={fromCity} toCity={toCity} />}
      </div>
    </>
  );
};

export default SearchResults;
