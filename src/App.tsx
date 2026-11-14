import { Toaster } from '@/components/ui/toaster';
import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import SearchResults from './pages/SearchResults';
import NotFound from './pages/NotFound';
import { publicRoutes } from './routes';
import { InitialJourney } from './lib/public-timetables';
import type { RoutePage } from './lib/route-pages';

export default function App({ initialJourney }: { initialJourney?: RoutePage }) {
  return <InitialJourney.Provider value={initialJourney}>
      <Toaster />
      <Routes>
        <Route element={<SiteLayout />}>
          {publicRoutes.map(route => <Route key={route.path} path={route.path} element={route.element} />)}
          <Route path="/search" element={<SearchResults />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
  </InitialJourney.Provider>;
}
