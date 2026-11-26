const googleConsentCountries = new Set([
  'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB',
  'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO',
  'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

export function GET(request: Request): Response {
  const country = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase();
  const region = !country ? null
    : googleConsentCountries.has(country) ? 'europe'
    : country === 'IN' ? 'india' : 'other';
  return Response.json({ region }, {
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
