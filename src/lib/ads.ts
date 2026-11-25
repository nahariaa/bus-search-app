const slots = {
  home: import.meta.env.VITE_ADSENSE_HOME_SLOT,
  routeInline: import.meta.env.VITE_ADSENSE_ROUTE_INLINE_SLOT,
  routeBottom: import.meta.env.VITE_ADSENSE_ROUTE_BOTTOM_SLOT,
};
const enableEuropeanAds = import.meta.env.VITE_ADSENSE_EEA_ENABLED === 'true';
const indiaChoiceKey = 'haryanabus-advertising-choice-v1';

export const adsConfig = import.meta.env.VITE_ADSENSE_ENABLED === 'true'
  && Object.values(slots).every(slot => /^\d{10}$/.test(slot ?? ''))
  && new Set(Object.values(slots)).size === 3
  ? { client: 'ca-pub-3647722960213142', slots } : null;

export type AdPosition = keyof typeof slots;

interface ConsentData {
  gdprApplies?: boolean;
  cmpStatus?: string;
  eventStatus?: string;
  tcString?: string;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}

type AdsWindow = Window & {
  __tcfapi?: (command: 'addEventListener', version: 2.2,
    callback: (data: ConsentData, success: boolean) => void) => void;
  googlefc?: {
    callbackQueue: Array<{ CONSENT_API_READY: () => void }>;
    showRevocationMessage?: () => void;
  };
  adsbygoogle?: { push: (request: Record<string, never>) => unknown; pauseAdRequests?: number };
};

type IndiaChoice = 'granted' | 'denied' | null;
type AdPrivacy =
  | { region: 'pending' | 'unavailable' }
  | { region: 'india'; choice: IndiaChoice }
  | { region: 'europe'; ready: boolean };

const initialAdPrivacy: AdPrivacy = { region: 'pending' };
let privacy: AdPrivacy = initialAdPrivacy;
let allowed = false;
let consentStarted = false;
const consentListeners = new Set<(allowed: boolean) => void>();
const privacyListeners = new Set<() => void>();

export const getInitialAdPrivacy = (): AdPrivacy => initialAdPrivacy;
export const getAdPrivacy = (): AdPrivacy => privacy;

export function subscribeAdPrivacy(listener: () => void) {
  privacyListeners.add(listener);
  return () => { privacyListeners.delete(listener); };
}

function updatePrivacy(next: AdPrivacy) {
  privacy = next;
  for (const listener of privacyListeners) listener();
}

function updateConsent(next: boolean) {
  if (allowed === next) return;
  allowed = next;
  const ads = (window as AdsWindow).adsbygoogle;
  if (ads && !next) ads.pauseAdRequests = 1;
  for (const listener of consentListeners) listener(next);
}

export function watchAdConsent(listener: (allowed: boolean) => void) {
  consentListeners.add(listener);
  listener(allowed);
  return () => { consentListeners.delete(listener); };
}

function readIndiaChoice(): IndiaChoice {
  try {
    const saved = window.localStorage.getItem(indiaChoiceKey);
    return saved === 'granted' || saved === 'denied' ? saved : null;
  } catch {
    return null;
  }
}

function applyIndiaChoice(choice: IndiaChoice) {
  updatePrivacy({ region: 'india', choice });
  updateConsent(choice === 'granted');
}

export function setIndiaAdChoice(choice: Exclude<IndiaChoice, null>) {
  if (privacy.region !== 'india') return;
  try {
    window.localStorage.setItem(indiaChoiceKey, choice);
  } catch {
    // The choice still applies to this page if browser storage is unavailable.
  }
  applyIndiaChoice(choice);
}

function startGoogleConsent(client: string) {
  const browser = window as AdsWindow;
  const google = browser.googlefc ??= { callbackQueue: [] };
  updatePrivacy({ region: 'europe', ready: false });
  google.callbackQueue.push({ CONSENT_API_READY: () => {
    const tcf = browser.__tcfapi;
    if (!tcf) return;
    try {
      tcf('addEventListener', 2.2, (data, success) => {
        const verified = success === true && data?.gdprApplies === true && data.cmpStatus === 'loaded';
        if (verified && data.eventStatus === 'cmpuishown') return;
        updatePrivacy({ region: 'europe', ready: verified && typeof browser.googlefc?.showRevocationMessage === 'function' });
        updateConsent(Boolean(verified
          && (data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete')
          && data.tcString?.trim() && data.vendor?.consents?.[755] === true
          && [1, 3, 4].every(purpose => data.purpose?.consents?.[purpose] === true)));
      });
    } catch {
      updateConsent(false);
    }
  } });

  // Google's AdSense tag delivers the published message. Unit requests stay paused
  // until the TCF listener observes an affirmative choice.
  void loadAdScript(client).catch(() => {
    updateConsent(false);
    updatePrivacy({ region: 'unavailable' });
  });
}

export async function startAdConsent() {
  if (!adsConfig || consentStarted) return;
  consentStarted = true;
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
    updatePrivacy({ region: 'unavailable' });
    return;
  }

  try {
    const response = await fetch('/api/ad-region', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const { region } = await response.json();
      if (region === 'india') {
        applyIndiaChoice(readIndiaChoice());
        window.addEventListener('storage', event => {
          if (event.key === indiaChoiceKey || event.key === null) applyIndiaChoice(readIndiaChoice());
        });
        return;
      }
      if (region === 'europe' && enableEuropeanAds) {
        startGoogleConsent(adsConfig.client);
        return;
      }
    }
  } catch {
    // Failed or unknown region information leaves advertising off.
  }
  updatePrivacy({ region: 'unavailable' });
}

export function openAdPrivacyChoices() {
  if (privacy.region !== 'europe' || !privacy.ready) return false;
  const google = (window as AdsWindow).googlefc;
  if (!google?.showRevocationMessage) return false;
  updateConsent(false);
  google.callbackQueue.push({ CONSENT_API_READY: () => google.showRevocationMessage?.() });
  return true;
}

let scriptLoad: Promise<void> | undefined;
export function loadAdScript(client: string): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const browser = window as AdsWindow;
    browser.adsbygoogle ??= [];
    browser.adsbygoogle.pauseAdRequests = 1;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error('AdSense script timed out'));
    }, 8000);
    script.addEventListener('load', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener('error', () => { window.clearTimeout(timeout); script.remove(); reject(new Error('AdSense script failed')); }, { once: true });
    document.head.append(script);
  });
  return scriptLoad;
}

const initializedPlacements = new Set<string>();
export const placementInitialized = (placement: string) => initializedPlacements.has(placement);

export function initializePlacement(placement: string) {
  if (!allowed || placementInitialized(placement)) return false;
  const browser = window as AdsWindow;
  browser.adsbygoogle ??= [];
  browser.adsbygoogle.pauseAdRequests = 0;
  initializedPlacements.add(placement);
  browser.adsbygoogle.push({});
  return true;
}
