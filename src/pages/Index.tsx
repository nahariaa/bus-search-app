import React from 'react';
import Header from '@/components/Header';
import BusSearchForm from '@/components/BusSearchForm';
import FeaturesSection from '@/components/FeaturesSection';
import PopularRoutes from '@/components/PopularRoutes';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <SEO />
      
      {/* Header */}
      <Header />

      {/* Main Search Section */}
      <main className="relative py-16">
        <div className="container mx-auto px-4">
          {/* Search Form */}
          <div className="mb-16">
            <Card className="mx-auto max-w-4xl shadow-2xl border-0">
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Book Your Bus Journey
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Find and book bus tickets across Haryana with ease
                  </p>
                </div>
                
                <BusSearchForm />
                
                <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Why Book with Haryana Roadways?
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>Government certified service</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>Affordable ticket prices</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>Extensive route network</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advertisement Space */}
          <div className="mb-16">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  Advertisement Space
                </h2>
                <p className="text-gray-500">
                  Partner with us to reach thousands of daily commuters
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <FeaturesSection />

      {/* Popular Routes */}
      <PopularRoutes />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
