import { busRoutes } from './bus-routes';

// Popular routes based on search volume
const POPULAR_ROUTES = [
  { from: 'Hisar', to: 'Delhi' },
  { from: 'Delhi', to: 'Hisar' },
  { from: 'Rohtak', to: 'Bhiwani' },
  { from: 'Chandigarh', to: 'Gurgaon' },
  { from: 'Panipat', to: 'Delhi' },
  { from: 'Ambala', to: 'Delhi' },
  { from: 'Karnal', to: 'Delhi' },
  { from: 'Kaithal', to: 'Kurukshetra' }
];

export const generateSitemap = () => {
  const baseUrl = 'https://haryanabus.com';
  
  // Start XML
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  // Add popular routes
  POPULAR_ROUTES.forEach(route => {
    const url = `${baseUrl}/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`;
    sitemap += `
  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  // Add all unique routes
  const uniqueRoutes = new Set();
  busRoutes.forEach(route => {
    const routeKey = `${route.from}-${route.to}`;
    if (!uniqueRoutes.has(routeKey)) {
      uniqueRoutes.add(routeKey);
      const url = `${baseUrl}/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`;
      sitemap += `
  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  });

  // Close XML
  sitemap += '\n</urlset>';
  
  return sitemap;
}; 