const slots = {
  home: import.meta.env.VITE_ADSENSE_HOME_SLOT,
  routeInline: import.meta.env.VITE_ADSENSE_ROUTE_INLINE_SLOT,
  routeBottom: import.meta.env.VITE_ADSENSE_ROUTE_BOTTOM_SLOT,
};
const domainId = import.meta.env.VITE_ONETRUST_DOMAIN_ID;
const advertisingGroup = import.meta.env.VITE_ONETRUST_AD_GROUP;
const oneTrustCmpId = 28;

export const adsConfig = import.meta.env.VITE_ADSENSE_ENABLED === 'true'
  && Object.values(slots).every(slot => /^\d{10}$/.test(slot ?? ''))
  && new Set(Object.values(slots)).size === 3
  && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}(?:-test)?$/i.test(domainId ?? '')
  && /^C\d{4,}$/.test(advertisingGroup ?? '') && advertisingGroup !== 'C0001'
  ? { client: 'ca-pub-3647722960213142', slots, domainId, advertisingGroup } : null;

export type AdPosition = keyof typeof slots;

interface ConsentData {
  gdprApplies?: boolean;
  cmpId?: number;
  cmpStatus?: string;
  eventStatus?: string;
  tcString?: string;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}

type AdsWindow = Window & {
  __tcfapi?: (command: 'addEventListener', version: 2,
    callback: (data: ConsentData, success: boolean) => void) => void;
  OneTrust?: {
    getGeolocationData: () => { country?: string } | undefined;
    IsAlertBoxClosedAndValid: () => boolean;
    ToggleInfoDisplay: () => void;
  };
  OptanonWrapper?: () => void;
  OnetrustActiveGroups?: string;
  adsbygoogle?: { push: (request: Record<string, never>) => unknown; pauseAdRequests?: number };
};

let allowed = false;
let cmpStarted = false;
let cmpReady = false;
const consentListeners = new Set<(allowed: boolean) => void>();

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

export function startAdConsent() {
  if (!adsConfig || cmpStarted) return;
  cmpStarted = true;
  const { advertisingGroup, domainId } = adsConfig;
  const browser = window as AdsWindow;
  let subscribed = false;
  let regionalConsent: boolean | undefined;
  let tcfConsent = false;

  function readConsent() {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
      updateConsent(false);
      return;
    }

    if (regionalConsent !== false) {
      updateConsent(regionalConsent === true && tcfConsent);
      return;
    }

    try {
      const cmp = browser.OneTrust;
      const country = cmp?.getGeolocationData()?.country?.toUpperCase() ?? '';
      const activeGroups = browser.OnetrustActiveGroups?.split(',');
      updateConsent(Boolean(cmp && /^[A-Z]{2}$/.test(country) && !['XX', 'ZZ'].includes(country)
        && cmp.IsAlertBoxClosedAndValid() === true && activeGroups?.includes(advertisingGroup)));
    } catch {
      updateConsent(false);
    }
  }

  browser.OptanonWrapper = () => {
    cmpReady = typeof browser.OneTrust?.ToggleInfoDisplay === 'function';
    if (!cmpReady || subscribed || !browser.__tcfapi) return;
    subscribed = true;
    try {
      browser.__tcfapi('addEventListener', 2, (data, success) => {
        const verified = success === true && data
          && (data.cmpStatus === undefined || data.cmpStatus === 'loaded')
          && (data.cmpId === undefined || data.cmpId === oneTrustCmpId);
        const requiresTcf = verified && data.cmpId === oneTrustCmpId
          && data.gdprApplies === true && data.cmpStatus === 'loaded';
        if (requiresTcf && regionalConsent === true && data.eventStatus === 'cmpuishown') return;

        regionalConsent = verified ? data.gdprApplies : undefined;
        tcfConsent = Boolean(requiresTcf
          && (data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete')
          && data.tcString?.trim() && data.vendor?.consents?.[755] === true
          && [1, 3, 4].every(purpose => data.purpose?.consents?.[purpose] === true));
        readConsent();
      });
    } catch {
      regionalConsent = undefined;
      updateConsent(false);
    }
  };
  window.addEventListener('OneTrustGroupsUpdated', readConsent);
  window.addEventListener('OTConsentApplied', readConsent);

  // The published OneTrust SDK supplies the TCF API and the regional choices.
  const script = document.createElement('script');
  script.src = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
  script.async = true;
  script.dataset.domainScript = domainId;
  script.addEventListener('error', () => {
    cmpReady = false;
    regionalConsent = undefined;
    updateConsent(false);
  }, { once: true });
  document.head.append(script);
}

export function openAdPrivacyChoices() {
  const cmp = (window as AdsWindow).OneTrust;
  if (!cmpReady || !cmp) return false;
  try {
    cmp.ToggleInfoDisplay();
    return true;
  } catch {
    return false;
  }
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
    script.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('AdSense script failed')); }, { once: true });
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
