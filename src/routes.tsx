import Index from './pages/Index';
import About from './pages/About';
import Privacy from './pages/Privacy';
import RouteDirectory from './pages/RouteDirectory';

export const publicRoutes = [
  { path: '/', element: <Index /> },
  { path: '/about', element: <About /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/routes', element: <RouteDirectory /> },
];
