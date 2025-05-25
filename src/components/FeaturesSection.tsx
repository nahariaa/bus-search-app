
import React from 'react';
import { Shield, Clock, MapPin, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FeaturesSection = () => {
  const features = [
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Verified drivers and well-maintained buses for your safety'
    },
    {
      icon: Clock,
      title: 'On-Time Service',
      description: 'Punctual departures and arrivals with real-time tracking'
    },
    {
      icon: MapPin,
      title: 'Wide Network',
      description: 'Connecting all major cities and towns across Haryana'
    },
    {
      icon: CreditCard,
      title: 'Easy Booking',
      description: 'Simple online booking with multiple payment options'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Haryana Roadways?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the best in state transport with our commitment to quality, safety, and customer satisfaction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
