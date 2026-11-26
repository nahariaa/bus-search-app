const slots = {
  home: import.meta.env.VITE_ADSENSE_HOME_SLOT,
  routeInline: import.meta.env.VITE_ADSENSE_ROUTE_INLINE_SLOT,
  routeBottom: import.meta.env.VITE_ADSENSE_ROUTE_BOTTOM_SLOT,
};
const enableEuropeanAds = import.meta.env.VITE_ADSENSE_EEA_ENABLED === 'true';
const adChoiceKey = 'haryanabus-advertising-choice-v1';

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

export type AdChoice = 'granted' | 'denied';
type LocalAdRegion = 'india' | 'other';
type AdPrivacy =
  | { region: 'pending' | LocalAdRegion; choice: AdChoice }
  | { region: 'unavailable'; gpc?: boolean }
  | { region: 'europe'; choice: AdChoice | 'pending'; ready: boolean };

function hasGlobalPrivacyControl() {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function readAdChoice(): AdChoice {
  try {
    if (window.localStorage.getItem(adChoiceKey) === 'denied') return 'denied';
  } catch { /* Treat unavailable storage as a visit without a saved choice. */ }
  return 'granted';
}

// The static page can reserve ad space before the app hydrates. Hide that
// reservation before paint for preferences already available to the browser.
export const earlyAdOptOutScript = `(() => {
  let optedOut = navigator.globalPrivacyControl === true;
  try { optedOut ||= localStorage.getItem(${JSON.stringify(adChoiceKey)}) === 'denied'; } catch {}
  if (optedOut) document.documentElement.setAttribute('data-ads-opted-out', '');
})();`;

const initialAdPrivacy: AdPrivacy = { region: 'pending', choice: 'granted' };
let privacy: AdPrivacy = adsConfig && typeof window !== 'undefined'
  ? hasGlobalPrivacyControl() ? { region: 'unavailable', gpc: true } : { region: 'pending', choice: readAdChoice() }
  : initialAdPrivacy;
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

function applyAdChoice(region: LocalAdRegion, choice: AdChoice) {
  updatePrivacy({ region, choice });
  updateConsent(choice === 'granted');
}

export function setAdChoice(choice: AdChoice) {
  const { region } = privacy;
  if (region !== 'india' && region !== 'other') return;
  try {
    window.localStorage.setItem(adChoiceKey, choice);
  } catch {
    // The choice still applies to this page if browser storage is unavailable.
  }
  applyAdChoice(region, choice);
}

function startGoogleConsent(client: string) {
  const browser = window as AdsWindow;
  const google = browser.googlefc ??= { callbackQueue: [] };
  updatePrivacy({ region: 'europe', choice: 'pending', ready: false });
  google.callbackQueue.push({ CONSENT_API_READY: () => {
    const tcf = browser.__tcfapi;
    if (!tcf) return;
    try {
      tcf('addEventListener', 2.2, (data, success) => {
        const verified = success === true && data?.gdprApplies === true && data.cmpStatus === 'loaded';
        if (verified && data.eventStatus === 'cmpuishown') return;
        const decided = data?.eventStatus === 'tcloaded' || data?.eventStatus === 'useractioncomplete';
        const granted = Boolean(verified && decided
          && data.tcString?.trim() && data.vendor?.consents?.[755] === true
          && [1, 3, 4].every(purpose => data.purpose?.consents?.[purpose] === true));
        const choice = granted ? 'granted'
          : decided || success !== true || data?.cmpStatus === 'error' ? 'denied' : 'pending';
        updatePrivacy({ region: 'europe', choice, ready: verified && typeof browser.googlefc?.showRevocationMessage === 'function' });
        updateConsent(granted);
      });
    } catch {
      updatePrivacy({ region: 'europe', choice: 'denied', ready: false });
      updateConsent(false);
    }
  } });

  // Google's AdSense tag delivers the published message. Unit requests stay paused
  // until the TCF listener observes an affirmative choice.
  void loadAdScript(client).catch(() => {
    updateConsent(false);
  });
}

export async function startAdConsent() {
  if (!adsConfig || consentStarted) return;
  consentStarted = true;
  if (hasGlobalPrivacyControl()) {
    updatePrivacy({ region: 'unavailable', gpc: true });
    return;
  }

  window.addEventListener('storage', event => {
    if (event.key !== adChoiceKey && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    if (privacy.region === 'pending') {
      const choice = readAdChoice();
      document.documentElement.toggleAttribute('data-ads-opted-out', choice === 'denied');
      updatePrivacy({ region: 'pending', choice });
    } else if (privacy.region === 'india' || privacy.region === 'other') {
      applyAdChoice(privacy.region, readAdChoice());
    }
  });

  try {
    const response = await fetch('/api/ad-region', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const { region } = await response.json();
      if (region === 'india' || region === 'other') {
        applyAdChoice(region, readAdChoice());
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
export let adScriptFailed = false;
const scriptFailureListeners = new Set<() => void>();

export function watchAdScriptFailure(listener: () => void) {
  scriptFailureListeners.add(listener);
  if (adScriptFailed) listener();
  return () => { scriptFailureListeners.delete(listener); };
}

export function loadAdScript(client: string): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const browser = window as AdsWindow;
    browser.adsbygoogle ??= [];
    browser.adsbygoogle.pauseAdRequests = 1;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    const fail = (message: string) => {
      if (adScriptFailed) return;
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error(message));
      adScriptFailed = true;
      for (const listener of scriptFailureListeners) listener();
    };
    const timeout = window.setTimeout(() => fail('AdSense script timed out'), 8000);
    script.addEventListener('load', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener('error', () => fail('AdSense script failed'), { once: true });
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
