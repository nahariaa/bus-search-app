
import React from 'react';
import BusServiceCard from './BusServiceCard';

const BusResults = () => {
  const sampleBusService = {
    from: "ISBT Delhi",
    via: "Ambala",
    to: "Ludhiana",
    departureTime: "00:30",
    typeOfService: "Ordinary",
    operator: "HR",
    serviceDays: ["All Day"]
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Bus Services</h2>
        <div className="space-y-4">
          <BusServiceCard service={sampleBusService} />
        </div>
      </div>
    </div>
  );
};

export default BusResults;
