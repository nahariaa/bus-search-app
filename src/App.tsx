import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import SearchResults from './pages/SearchResults';
import NotFound from './pages/NotFound';
import { publicRoutes } from './routes';

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<SiteLayout />}>
          {publicRoutes.map(route => <Route key={route.path} path={route.path} element={route.element} />)}
          <Route path="/search" element={<SearchResults />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>;
}
