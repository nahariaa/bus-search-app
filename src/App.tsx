import { Toaster } from '@/components/ui/toaster';
import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import SearchResults from './pages/SearchResults';
import NotFound from './pages/NotFound';
import { publicRoutes } from './routes';
import RouteTimetable from './pages/RouteTimetable';
import DepartureCity from './pages/DepartureCity';
import { InitialJourney } from './lib/public-timetables';
import { adsConfig, earlyAdOptOutScript } from './lib/ads';
import type { RoutePage } from './lib/route-pages';

export default function App({ initialJourney }: { initialJourney?: RoutePage }) {
  return <InitialJourney.Provider value={initialJourney}>
      {adsConfig && <script dangerouslySetInnerHTML={{ __html: earlyAdOptOutScript }} />}
      <Toaster />
      <Routes>
        <Route element={<SiteLayout />}>
          {publicRoutes.map(route => <Route key={route.path} path={route.path} element={route.element} />)}
          <Route path="/routes/:slug" element={<RouteTimetable />} />
          <Route path="/cities/:slug" element={<DepartureCity />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
  </InitialJourney.Provider>;
}
