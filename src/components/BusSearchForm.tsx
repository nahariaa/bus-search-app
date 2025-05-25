import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, MapPin, ArrowLeftRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { busRoutes, BusRoute } from '@/lib/bus-routes';

const BusSearchForm = () => {
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Get unique cities from bus routes
  const uniqueCities = Array.from(new Set(
    busRoutes.flatMap(route => [route.from, route.via, route.to])
  )).sort();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCity || !toCity) {
      toast({
        title: "Missing Information",
        description: "Please fill in both departure and destination cities.",
        variant: "destructive"
      });
      return;
    }

    if (fromCity.toLowerCase() === toCity.toLowerCase()) {
      toast({
        title: "Invalid Route",
        description: "Departure and destination cities cannot be the same.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Navigate to search results page
    navigate(`/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`);
  };

  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="space-y-6">
        {/* Route Selection */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From City */}
            <div className="space-y-2">
              <Label htmlFor="from-city" className="text-sm font-medium text-gray-700">
                Boarding From
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="from-city"
                  type="text"
                  placeholder="Enter departure city"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  list="from-cities"
                />
                <datalist id="from-cities">
                  {uniqueCities.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* To City */}
            <div className="space-y-2">
              <Label htmlFor="to-city" className="text-sm font-medium text-gray-700">
                Where are you going?
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="to-city"
                  type="text"
                  placeholder="Enter destination city"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  list="to-cities"
                />
                <datalist id="to-cities">
                  {uniqueCities.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Swap Button - Fixed for mobile */}
          <div className="flex justify-center -mt-2 mb-2 md:absolute md:left-1/2 md:top-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 md:mt-0 md:mb-0 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={swapCities}
              className="h-10 w-10 p-0 rounded-full border-2 border-blue-500 bg-white hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200"
              title="Swap cities"
            >
              <ArrowLeftRight className="h-4 w-4 text-blue-500" />
            </Button>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
        >
          <Bus className="mr-3 h-5 w-5" />
          {isLoading ? 'Searching...' : 'Find Buses'}
        </Button>
      </form>
    </div>
  );
};

export default BusSearchForm;
