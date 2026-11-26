import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { adScriptFailed, adsConfig, getAdPrivacy, getInitialAdPrivacy, initializePlacement, loadAdScript,
  placementInitialized, startAdConsent, subscribeAdPrivacy, watchAdConsent, watchAdScriptFailure,
  type AdPosition } from '@/lib/ads';

function AdSlot({ client, placement, slot, pending, inList }: {
  client: string; placement: string; slot: string; pending: boolean; inList: boolean;
}) {
  const [status, setStatus] = useState<'empty' | 'filled' | 'collapsed'>(() =>
    placementInitialized(placement) || adScriptFailed ? 'collapsed' : 'empty');
  const frame = useRef<HTMLElement>(null);
  const creative = useRef<HTMLDivElement>(null);
  const collapsed = status === 'collapsed';

  useEffect(() => {
    const container = frame.current;
    const target = creative.current;
    if (collapsed || !container || !target) return;

    let stop: (() => void) | undefined;
    const fail = () => {
      stop?.();
      stop = undefined;
      // Removing space below the viewport cannot move visible passenger content.
      const belowViewport = container.getBoundingClientRect().top >= document.documentElement.clientHeight;
      setStatus(belowViewport ? 'collapsed' : 'empty');
    };
    const unsubscribe = watchAdConsent(allowed => {
      stop?.();
      stop = undefined;
      setStatus('empty');
      if (!allowed || adScriptFailed || placementInitialized(placement) || !('IntersectionObserver' in window)) return;

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
              setStatus('filled');
            } else if (ad.dataset.adStatus === 'unfilled') {
              fail();
            }
          });
          status.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });
          target.append(ad);
          if (initializePlacement(placement)) fillTimeout = window.setTimeout(fail, 8000);
          else removeCreative();
        }).catch(() => { if (active) fail(); });
      }, { rootMargin: '160px' });
      observer.observe(container);

      stop = () => {
        active = false;
        observer.disconnect();
        removeCreative();
      };
    });
    const unsubscribeFailure = watchAdScriptFailure(fail);
    return () => { unsubscribe(); unsubscribeFailure(); stop?.(); };
  }, [client, collapsed, placement, slot]);

  if (collapsed) return null;
  const filled = status === 'filled';
  const aside = <aside ref={frame} data-ad-placement={placement} data-ad-pending={pending && !inList ? true : undefined}
    aria-label="Advertisement" aria-hidden={!filled} className="mx-auto h-72 w-full max-w-3xl py-2 text-center">
    <p className={`mb-2 text-xs text-slate-600 ${filled ? '' : 'invisible'}`}>Advertisement</p>
    <div ref={creative} className="h-[250px] w-full" />
  </aside>;
  return inList ? <li role="presentation" data-ad-pending={pending || undefined}>{aside}</li> : aside;
}

function AdPlacement({ client, path, position, slot }: {
  client: string; path: string; position: AdPosition; slot: string;
}) {
  const privacy = useSyncExternalStore(subscribeAdPrivacy, getAdPrivacy, getInitialAdPrivacy);
  useEffect(() => { void startAdConsent(); }, []);
  if (privacy.region === 'unavailable' || privacy.choice === 'denied') return null;
  return <AdSlot client={client} placement={`${path}:${position}`} slot={slot}
    pending={privacy.region === 'pending'} inList={position === 'routeInline'} />;
}

export default function Advertisement({ position, path }: { position: AdPosition; path: string }) {
  return adsConfig ? <AdPlacement key={`${path}:${position}`} path={path} position={position}
    client={adsConfig.client} slot={adsConfig.slots[position]} /> : null;
}
