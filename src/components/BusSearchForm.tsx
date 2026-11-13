import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PlaceInput from './PlaceInput';
import { Label } from '@/components/ui/label';
import { Bus, MapPin, ArrowLeftRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { boardingPoints, buildSearchUrl, destinationsFrom, locationKey } from '@/lib/route-matching';
import { canonicalPlaceName } from '@/lib/timetable';

interface BusSearchFormProps {
  initialFrom?: string;
  initialTo?: string;
}

const BusSearchForm = ({ initialFrom = '', initialTo = '' }: BusSearchFormProps) => {
  const [fromCity, setFromCity] = useState(initialFrom);
  const [toCity, setToCity] = useState(initialTo);
  const navigate = useNavigate();

  const origins = useMemo(() => boardingPoints(), []);
  const destinations = useMemo(() => destinationsFrom(fromCity), [fromCity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const from = canonicalPlaceName(fromCity);
    const to = canonicalPlaceName(toCity);
    setFromCity(from);
    setToCity(to);
    
    if (!from || !to) {
      toast({
        title: "Missing Information",
        description: "Please fill in both departure and destination cities.",
        variant: "destructive"
      });
      return;
    }

    if (locationKey(from) === locationKey(to)) {
      toast({
        title: "Invalid Route",
        description: "Departure and destination cities cannot be the same.",
        variant: "destructive"
      });
      return;
    }

    // Navigate to search results page
    navigate(buildSearchUrl(from, to));
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
                <PlaceInput id="from-city" value={fromCity} onChange={setFromCity}
                  available={origins} placeholder="Enter departure city or terminal" />
              </div>
            </div>

            {/* To City */}
            <div className="space-y-2">
              <Label htmlFor="to-city" className="text-sm font-medium text-gray-700">
                Where are you going?
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <PlaceInput id="to-city" value={toCity} onChange={setToCity}
                  available={destinations} placeholder="Enter destination city or stop" />
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
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
        >
          <Bus className="mr-3 h-5 w-5" />
          Find Buses
        </Button>
      </form>
    </div>
  );
};

export default BusSearchForm;
