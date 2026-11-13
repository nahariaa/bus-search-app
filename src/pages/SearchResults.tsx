import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BusSearchResults from '@/components/BusSearchResults';
import { cleanLocation, matchRoutes } from '@/lib/route-matching';
import BusSearchForm from '@/components/BusSearchForm';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const fromCity = cleanLocation(searchParams.get('from') || '');
  const toCity = cleanLocation(searchParams.get('to') || '');

  // Find matching routes
  const matchingRoutes = matchRoutes(fromCity, toCity);

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
            <h1 className="text-2xl font-semibold mb-6">Search bus timetables</h1>
            <div className="mb-8">
              <BusSearchForm key={location.search} initialFrom={fromCity} initialTo={toCity} />
            </div>
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
