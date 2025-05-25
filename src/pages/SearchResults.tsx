import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BusSearchResults from '@/components/BusSearchResults';
import { busRoutes } from '@/lib/bus-routes';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const fromCity = searchParams.get('from') || '';
  const toCity = searchParams.get('to') || '';

  // Find matching routes
  const matchingRoutes = busRoutes.filter(route => 
    route.from.toLowerCase() === fromCity.toLowerCase() &&
    route.to.toLowerCase() === toCity.toLowerCase()
  );

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        fromCity={fromCity}
        toCity={toCity}
        route={matchingRoutes[0]} // Pass the first route for structured data
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-6xl mx-auto">
          <CardContent className="p-6">
            <BusSearchResults
              routes={matchingRoutes}
              fromCity={fromCity}
              toCity={toCity}
              onBack={handleBack}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SearchResults; 