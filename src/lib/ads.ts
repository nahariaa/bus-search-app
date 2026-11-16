const client = import.meta.env.VITE_ADSENSE_CLIENT;
const slot = import.meta.env.VITE_ADSENSE_ROUTE_SLOT;
const cmpId = Number(import.meta.env.VITE_ADSENSE_CMP_ID);

export const adsConfig = import.meta.env.VITE_ADSENSE_ENABLED === 'true'
  && /^ca-pub-\d{16}$/.test(client ?? '') && /^\d{10}$/.test(slot ?? '')
  && Number.isSafeInteger(cmpId) && cmpId > 0 ? { client, slot, cmpId } : null;

interface ConsentData {
  cmpId?: number;
  cmpStatus?: string;
  eventStatus?: string;
  listenerId?: number;
  tcString?: string;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}

type TcfApi = {
  (command: 'addEventListener', version: 2, callback: (data: ConsentData, success: boolean) => void): void;
  (command: 'removeEventListener', version: 2, callback: () => void, listenerId: number): void;
};

type AdsWindow = Window & {
  __tcfapi?: TcfApi;
  adsbygoogle?: { push: (request: Record<string, never>) => unknown };
};

export function watchAdConsent(cmpId: number, update: (allowed: boolean) => void) {
  const api = (window as AdsWindow).__tcfapi;
  if (!api) return;
  let listenerId: number | undefined;
  let active = true;
  const unsubscribe = (id: number) => {
    try { api('removeEventListener', 2, () => {}, id); } catch { /* A failed CMP must leave the timetable usable. */ }
  };
  try {
    api('addEventListener', 2, (data, success) => {
      if (!active) {
        if (data?.listenerId !== undefined) unsubscribe(data.listenerId);
        return;
      }
      listenerId = data?.listenerId ?? listenerId;
      if (success && data?.eventStatus === 'cmpuishown') return;
      // Require an affirmative, usable signal from the configured CMP.
      update(Boolean(success && data?.cmpId === cmpId && data.cmpStatus === 'loaded' && data.tcString
        && ['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '')
        && data.vendor?.consents?.[755] && [1, 3, 4].every(purpose => data.purpose?.consents?.[purpose])));
    });
  } catch {
    update(false);
  }
  return () => {
    active = false;
    if (listenerId !== undefined) unsubscribe(listenerId);
  };
}

let scriptLoad: Promise<void> | undefined;
export function loadAdScript(client: string): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error('AdSense script timed out'));
    }, 8000);
    script.addEventListener('load', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('AdSense script failed')); }, { once: true });
    document.head.append(script);
  });
  return scriptLoad;
}

const initializedPlacements = new Set<string>();
export const placementInitialized = (placement: string) => initializedPlacements.has(placement);

export function initializePlacement(placement: string) {
  if (placementInitialized(placement)) return false;
  const browser = window as AdsWindow;
  browser.adsbygoogle ??= [];
  browser.adsbygoogle.push({});
  initializedPlacements.add(placement);
  return true;
}
