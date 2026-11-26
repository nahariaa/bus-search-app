import { setAdChoice, type AdChoice } from '@/lib/ads';

export default function RegionalAdChoices({ choice }: { choice: AdChoice }) {
  return <div className="space-y-2">
    <p role="status">{choice === 'granted'
      ? 'Ads are on. Ads are allowed by default in your region.'
      : 'Ads are off in this browser.'}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={choice === 'granted'} onClick={() => setAdChoice('granted')}
        className="min-h-11 rounded-md border border-slate-400 bg-white px-3 text-sm font-medium text-slate-950">
        Allow ads
      </button>
      <button type="button" aria-pressed={choice === 'denied'} onClick={() => setAdChoice('denied')}
        className="min-h-11 rounded-md border border-slate-400 bg-white px-3 text-sm font-medium text-slate-950">
        Keep ads off
      </button>
    </div>
  </div>;
}
