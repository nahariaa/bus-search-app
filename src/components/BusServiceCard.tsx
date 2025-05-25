
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bus, Clock, MapPin, Calendar } from 'lucide-react';

interface BusServiceCardProps {
  service: {
    from: string;
    via: string;
    to: string;
    departureTime: string;
    typeOfService: string;
    operator: string;
    serviceDays: string[];
  };
}

const BusServiceCard = ({ service }: BusServiceCardProps) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border border-gray-200">
      <CardContent className="p-6">
        {/* Header with operator and service type */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{service.operator} Roadways</h3>
              <p className="text-sm text-gray-600">{service.typeOfService}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(service.departureTime)}</span>
            </div>
          </div>
        </div>

        {/* Route Information */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-900">{service.from}</p>
                  <p className="text-xs text-gray-500">Departure</p>
                </div>
              </div>
              
              <div className="flex-1 px-4">
                <div className="border-t-2 border-dashed border-gray-300 relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-1">via {service.via}</p>
              </div>
              
              <div className="flex items-center">
                <div className="mr-2">
                  <p className="text-sm font-medium text-gray-900">{service.to}</p>
                  <p className="text-xs text-gray-500">Destination</p>
                </div>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Days */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Service Days:</span>
            <div className="flex flex-wrap gap-1">
              {service.serviceDays.map((day, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Available for booking
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            Select Bus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusServiceCard;
