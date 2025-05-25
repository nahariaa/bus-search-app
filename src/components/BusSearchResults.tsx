import React from 'react';
import { BusRoute } from '@/lib/bus-routes';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Bus as BusIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BusSearchResultsProps {
  routes: BusRoute[];
  fromCity: string;
  toCity: string;
  onBack: () => void;
}

const BusSearchResults: React.FC<BusSearchResultsProps> = ({
  routes,
  fromCity,
  toCity,
  onBack,
}) => {
  if (routes.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Buses Found</h2>
        <p className="text-gray-600 mb-6">
          No direct buses found from {fromCity} to {toCity}
        </p>
        <Button onClick={onBack} variant="outline">
          Try Another Search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Buses from {fromCity} to {toCity}
        </h2>
        <Button onClick={onBack} variant="outline">
          Back to Search
        </Button>
      </div>

      <div className="grid gap-4">
        {routes.map((route, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Departure Time */}
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Departure</p>
                    <p className="font-semibold">{route.departureTime}</p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Route</p>
                    <p className="font-semibold">Via {route.via}</p>
                  </div>
                </div>

                {/* Service Type */}
                <div className="flex items-center space-x-2">
                  <BusIcon className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-semibold">{route.typeOfService}</p>
                  </div>
                </div>

                {/* Service Days */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="font-semibold">{route.serviceDays.join(', ')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusSearchResults; 