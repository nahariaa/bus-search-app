
import React from 'react';
import { Bus } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8 px-4">
      <div className="container mx-auto text-center">
        <div className="flex items-center justify-center mb-4">
          <Bus className="h-12 w-12 text-blue-400 mr-4" />
          <h1 className="text-4xl md:text-5xl font-bold">
            Haryana Roadways
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-gray-300 font-light">
          Your Trusted Travel Partner
        </p>
        <p className="text-lg text-gray-400 mt-2">
          Safe • Reliable • Affordable State Transport Services
        </p>
      </div>
    </header>
  );
};

export default Header;
