import { Link } from 'react-router-dom';
import { setIndiaAdChoice } from '@/lib/ads';

export default function IndiaAdChoices({ choice, compact = false }: {
  choice: 'granted' | 'denied' | null;
  compact?: boolean;
}) {
  return <div className="space-y-2">
    {compact && <>
      <p className="font-semibold text-slate-900">Advertising choices</p>
      <p className="text-sm text-slate-700">Google can use cookies and device data to show, personalize and measure ads.
        {' '}<Link to="/privacy" className="text-blue-700 underline">Privacy details</Link>
      </p>
    </>}
    <div className={`flex flex-wrap gap-2 ${compact ? 'justify-center' : ''}`}>
      <button type="button" aria-pressed={choice === 'granted'} onClick={() => setIndiaAdChoice('granted')}
        className="min-h-11 rounded-md border border-slate-400 bg-white px-3 text-sm font-medium text-slate-950">
        Allow ads
      </button>
      <button type="button" aria-pressed={choice === 'denied'} onClick={() => setIndiaAdChoice('denied')}
        className="min-h-11 rounded-md border border-slate-400 bg-white px-3 text-sm font-medium text-slate-950">
        Keep ads off
      </button>
    </div>
    {!compact && <p role="status">{choice === 'granted' ? 'Ads are allowed.' : 'Ads are off.'}</p>}
  </div>;
}
