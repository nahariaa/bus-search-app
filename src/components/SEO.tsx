import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BusRoute } from '@/lib/bus-routes';

interface SEOProps {
  title?: string;
  description?: string;
  route?: BusRoute;
  fromCity?: string;
  toCity?: string;
}

const SEO: React.FC<SEOProps> = ({ 
  title = "Haryana Roadways Bus Timetable | Online Bus Schedule & Timings",
  description = "Find Haryana Roadways bus schedules, timings, and online booking. View departure times, operators, and service days for all routes across Haryana.",
  route,
  fromCity,
  toCity 
}) => {
  // Generate structured data for bus routes
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Haryana Roadways",
      "url": window.location.origin,
      "logo": `${window.location.origin}/logo.png`,
      "sameAs": [
        "https://twitter.com/haryana_roadways",
        "https://www.facebook.com/haryana.roadways"
      ],
      "description": "Official Haryana Roadways bus timetable and online booking service",
      "areaServed": "Haryana",
      "serviceType": "Bus Transportation"
    };

    if (route) {
      return [
        baseData,
        {
          "@context": "https://schema.org",
          "@type": "BusTrip",
          "name": `${route.from} to ${route.to} Bus Service`,
          "departureBusStop": {
            "@type": "BusStop",
            "name": route.from,
            "address": {
              "@type": "PostalAddress",
              "addressRegion": "Haryana"
            }
          },
          "arrivalBusStop": {
            "@type": "BusStop",
            "name": route.to,
            "address": {
              "@type": "PostalAddress",
              "addressRegion": "Haryana"
            }
          },
          "departureTime": route.departureTime,
          "provider": {
            "@type": "Organization",
            "name": "Haryana Roadways"
          },
          "busNumber": route.operator,
          "serviceType": route.typeOfService,
          "serviceDays": route.serviceDays,
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "priceCurrency": "INR",
            "price": "0",
            "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
          }
        }
      ];
    }

    return [baseData];
  };

  // Generate dynamic title and description for search results
  const getDynamicMetadata = () => {
    if (fromCity && toCity) {
      const popularRoutes = [
        { from: 'Hisar', to: 'Delhi' },
        { from: 'Delhi', to: 'Hisar' },
        { from: 'Rohtak', to: 'Bhiwani' },
        { from: 'Chandigarh', to: 'Gurgaon' },
        { from: 'Panipat', to: 'Delhi' },
        { from: 'Ambala', to: 'Delhi' },
        { from: 'Karnal', to: 'Delhi' },
        { from: 'Kaithal', to: 'Kurukshetra' }
      ];

      const isPopularRoute = popularRoutes.some(
        route => route.from.toLowerCase() === fromCity.toLowerCase() && 
                route.to.toLowerCase() === toCity.toLowerCase()
      );

      return {
        title: `${fromCity} to ${toCity} Bus Timetable | Haryana Roadways Bus Schedule & Timings`,
        description: `Find all Haryana Roadways buses from ${fromCity} to ${toCity}. View departure times, operators, and service days. Book your bus tickets online.`,
        priority: isPopularRoute ? 0.9 : 0.8
      };
    }
    return { title, description, priority: 1.0 };
  };

  const metadata = getDynamicMetadata();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <meta name="keywords" content={`Haryana Roadways, bus timetable, ${fromCity || ''} to ${toCity || ''} bus schedule, online bus booking, Haryana bus timings`} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:site_name" content="Haryana Roadways Bus Timetable" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metadata.title} />
      <meta name="twitter:description" content={metadata.description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={window.location.href} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
    </Helmet>
  );
};

export default SEO; 