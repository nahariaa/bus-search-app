import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routeSummaries } from '@/lib/public-timetables';

const routes = routeSummaries.filter(route => ['chandigarh-to-delhi', 'delhi-to-ludhiana', 'gurugram-to-hisar', 'bhiwani-to-delhi'].includes(route.slug));

const PopularRoutes = () => (
  <section className="mt-8 sm:mt-10" aria-labelledby="explore-routes-heading">
    <h2 id="explore-routes-heading" className="mb-3 text-xl font-semibold text-slate-900">
      Explore routes
    </h2>
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      {routes.map(({ from, to, path }) => {
        const url = path;
        return (
          <li key={url}>
            <Link
              to={url}
              className="flex min-h-12 items-center justify-between gap-2 rounded-lg border bg-white px-4 py-3 font-medium text-slate-900 hover:border-blue-400 hover:text-blue-700"
            >
              {from} to {to}
              <ArrowRight className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
    <Link to="/routes" className="mt-3 inline-block py-2 text-blue-700 underline underline-offset-4">Browse all route timetables</Link>
  </section>
);

export default PopularRoutes;
