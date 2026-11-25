import { useEffect, useRef, useState } from 'react';
import { adsConfig, initializePlacement, loadAdScript, placementInitialized, watchAdConsent, type AdPosition } from '@/lib/ads';

function AdPlacement({ client, placement, slot }: { client: string; placement: string; slot: string }) {
  const [filled, setFilled] = useState(false);
  const frame = useRef<HTMLElement>(null);
  const creative = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = frame.current!;
    const target = creative.current!;
    let stop: (() => void) | undefined;
    const unsubscribe = watchAdConsent(allowed => {
      stop?.();
      stop = undefined;
      setFilled(false);
      if (!allowed || placementInitialized(placement) || !('IntersectionObserver' in window)) return;

      let active = true;
      let element: HTMLModElement | undefined;
      let status: MutationObserver | undefined;
      let fillTimeout: number | undefined;

      function removeCreative() {
        status?.disconnect();
        window.clearTimeout(fillTimeout);
        element?.remove();
      }

      const observer = new IntersectionObserver(entries => {
        if (!active || !entries.some(entry => entry.isIntersecting) || target.clientWidth < 120) return;
        observer.disconnect();
        void loadAdScript(client).then(() => {
          if (!active || !target.isConnected || target.clientWidth < 120 || placementInitialized(placement)) return;
          const ad = document.createElement('ins');
          ad.className = 'adsbygoogle';
          // AdSense supports a fixed height and a bounded, expandable width.
          ad.style.cssText = 'display:block;width:100%;min-width:120px;max-width:300px;height:250px;margin-inline:auto';
          ad.dataset.adClient = client;
          ad.dataset.adSlot = slot;
          element = ad;
          status = new MutationObserver(() => {
            if (ad.dataset.adStatus === 'filled') {
              window.clearTimeout(fillTimeout);
              setFilled(true);
            } else if (ad.dataset.adStatus === 'unfilled') {
              removeCreative();
              setFilled(false);
            }
          });
          status.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });
          target.append(ad);
          if (initializePlacement(placement)) fillTimeout = window.setTimeout(removeCreative, 8000);
          else removeCreative();
        }).catch(removeCreative);
      }, { rootMargin: '160px' });
      observer.observe(container);

      stop = () => {
        active = false;
        observer.disconnect();
        removeCreative();
      };
    });
    return () => { unsubscribe(); stop?.(); };
  }, [client, placement, slot]);

  return <aside ref={frame} data-ad-placement={placement} aria-label="Advertisement" aria-hidden={!filled}
    className="mx-auto h-72 w-full max-w-3xl py-2 text-center">
    <p className={`mb-2 text-xs text-slate-600 ${filled ? '' : 'invisible'}`}>Advertisement</p>
    <div ref={creative} className="h-[250px] w-full" />
  </aside>;
}

export default function Advertisement({ position, path }: { position: AdPosition; path: string }) {
  const placement = `${path}:${position}`;
  return adsConfig ? <AdPlacement key={placement} placement={placement} client={adsConfig.client}
    slot={adsConfig.slots[position]} /> : null;
}
