import { useEffect, useRef, useState } from 'react';
import { adsConfig, initializePlacement, loadAdScript, placementInitialized, watchAdConsent } from '@/lib/ads';

type Configuration = NonNullable<typeof adsConfig>;

function AdPlacement({ config, placement }: { config: Configuration; placement: string }) {
  const [allowed, setAllowed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const frame = useRef<HTMLElement>(null);
  const started = useRef(false);
  const slot = useRef<HTMLModElement>(null);

  useEffect(() => watchAdConsent(config.cmpId, setAllowed), [config.cmpId]);
  useEffect(() => {
    const container = frame.current;
    const element = slot.current;
    if (!allowed || !container || !element) return;
    if (started.current || placementInitialized(placement)) { setHidden(true); return; }

    let active = true;
    let fillTimeout: number | undefined;
    const status = new MutationObserver(() => {
      if (element.dataset.adStatus === 'unfilled') setHidden(true);
      if (element.dataset.adStatus) window.clearTimeout(fillTimeout);
    });
    status.observe(element, { attributes: true, attributeFilter: ['data-ad-status'] });
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void loadAdScript(config.client).then(() => {
        if (!active) return;
        started.current = initializePlacement(placement);
        if (!started.current) { setHidden(true); return; }
        fillTimeout = window.setTimeout(() => setHidden(true), 8000);
      }).catch(() => { if (active) setHidden(true); });
    }, { rootMargin: '160px' });
    observer.observe(container);
    return () => {
      active = false;
      observer.disconnect();
      status.disconnect();
      window.clearTimeout(fillTimeout);
    };
  }, [allowed, config.client, placement]);

  if (!allowed || (!started.current && placementInitialized(placement))) return null;
  return <aside ref={frame} data-ad-placement={placement} aria-label="Advertisement"
    className={`mx-auto mt-10 min-h-[280px] w-full max-w-3xl border-t pt-3 text-center ${hidden ? 'invisible' : ''}`}>
    <p className="mb-2 text-xs text-slate-600">Advertisement</p>
    <ins ref={slot} className="adsbygoogle block h-[250px] w-full" data-ad-client={config.client} data-ad-slot={config.slot} />
  </aside>;
}

export default function Advertisement({ placement }: { placement: string }) {
  return adsConfig ? <AdPlacement config={adsConfig} placement={placement} /> : null;
}
