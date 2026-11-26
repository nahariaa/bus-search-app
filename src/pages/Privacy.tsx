import { useEffect, useState, useSyncExternalStore } from 'react';
import InformationPage from '@/components/InformationPage';
import RegionalAdChoices from '@/components/RegionalAdChoices';
import { CONTACT_EMAIL, CONTACT_EMAIL_LINK } from '@/lib/site';
import { adsConfig, getAdPrivacy, getInitialAdPrivacy, openAdPrivacyChoices, startAdConsent,
  subscribeAdPrivacy } from '@/lib/ads';

function PrivacyChoices() {
  const [unavailable, setUnavailable] = useState(false);
  const privacy = useSyncExternalStore(subscribeAdPrivacy, getAdPrivacy, getInitialAdPrivacy);
  useEffect(() => { void startAdConsent(); }, []);
  if (privacy.region === 'india' || privacy.region === 'other') return <RegionalAdChoices choice={privacy.choice} />;
  if (privacy.region === 'pending') return <p role="status">Loading advertising choices…</p>;
  if (privacy.region === 'unavailable' && privacy.gpc) return <p role="status">Ads are off because your browser sends Global Privacy Control.</p>;
  if (privacy.region !== 'europe' || !privacy.ready) return <p role="status">Advertising choices are unavailable for this visit.</p>;
  return <>
    <p><button type="button" onClick={() => setUnavailable(!openAdPrivacyChoices())}
      className="min-h-11 rounded-sm font-medium text-blue-700 underline underline-offset-4">
      Change privacy choices
    </button></p>
    {unavailable && <p role="status">Privacy choices could not open. Reload this page and try again.</p>}
  </>;
}

const Privacy = () => (
  <InformationPage
    heading="Privacy"
    title="Privacy | HaryanaBus"
    description="How HaryanaBus handles timetable searches, hosting requests, browser storage, and enquiries sent by email."
    path="/privacy"
    revised="2026-11-27"
  >
    <h2>Timetable searches and browser history</h2>
    <p>
      HaryanaBus searches a bundled copy of the timetables in your browser. The boarding point and destination
      appear in the results URL and can remain in browser history or be visible to anyone you share the link with.
      Search runs without an account or a separate search API. Enter only place names in the search fields.
    </p>

    <h2>Hosting and web requests</h2>
    <p>
      Vercel serves the website and its files. When your browser requests a page or file, Vercel receives request
      information such as your IP address and the requested URL. Opening a results link directly or refreshing it
      sends the boarding point and destination in the URL with that request. Vercel may process request information,
      including logs, to deliver and protect the site and operate its hosting service.
      See <a href="https://vercel.com/legal/privacy-notice">Vercel’s privacy notice</a>.
    </p>

    <h2>Cookies, analytics and ads</h2>
    {adsConfig ? <>
      <p>The homepage can show a Google AdSense display ad after the departure-city links, before Popular Routes.
        Published route timetables with at least six departures can show an ad after the fifth departure.
        Timetables with at least 25 departures can show a second ad after the timetable and related links.</p>
      <p>HaryanaBus uses the approximate country provided by Vercel to choose which advertising controls apply.
        In India and other countries outside the EEA, UK and Switzerland, ads are on by default. Use the controls
        below to turn ads off or back on. HaryanaBus saves this choice in your browser. Ads are off when your
        browser sends Global Privacy Control or when HaryanaBus cannot determine your region.</p>
      <p>When advertising is enabled for the EEA, UK and Switzerland, Google Privacy &amp; Messaging uses the
        Transparency and Consent Framework to ask for permission and store your choice. Use the control below
        to reopen Google’s options and withdraw consent. Turning ads off removes existing ads and stops new
        ad requests.</p>
      <p>Google and other advertising partners may use cookies, device or browser identifiers, your IP address
        and page information to select, deliver and personalize ads, measure their performance and detect
        invalid traffic. HaryanaBus uses no separate visitor analytics or third-party error reporting.</p>
      <p><a href="https://policies.google.com/technologies/partner-sites">How Google uses information from partner sites</a></p>
      <PrivacyChoices />
    </> : <p>
      The HaryanaBus application uses no cookies or persistent browser storage. Your browser may cache site files.
      HaryanaBus currently runs without ads, visitor analytics scripts or third-party error reporting. The site
      serves its own assets. If you follow an external link, the destination handles your visit under its own privacy practices.
    </p>}

    <h2>Privacy enquiries</h2>
    <p>
      For privacy enquiries, email <a href={CONTACT_EMAIL_LINK} className="break-words">{CONTACT_EMAIL}</a>.
      When you email HaryanaBus, we receive your email address, your message, and any attachments through Gmail,
      our email service. We use this information to handle your enquiry.
    </p>
  </InformationPage>
);

export default Privacy;
