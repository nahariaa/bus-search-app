
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const PopularRoutes = () => {
  const routes = [
    { from: 'Chandigarh', to: 'Delhi', duration: '4h 30m', price: '₹250' },
    { from: 'Gurugram', to: 'Hisar', duration: '3h 45m', price: '₹180' },
    { from: 'Faridabad', to: 'Karnal', duration: '2h 15m', price: '₹150' },
    { from: 'Ambala', to: 'Rohtak', duration: '2h 30m', price: '₹160' },
    { from: 'Panipat', to: 'Yamunanagar', duration: '1h 45m', price: '₹120' },
    { from: 'Sonipat', to: 'Panchkula', duration: '3h 00m', price: '₹200' }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Popular Routes
          </h2>
          <p className="text-lg text-gray-600">
            Book tickets for the most traveled routes across Haryana
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {routes.map((route, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{route.from}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{route.to}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{route.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Starting from</p>
                    <p className="font-bold text-blue-600 text-lg">{route.price}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularRoutes;
