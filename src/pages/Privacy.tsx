import InformationPage from '@/components/InformationPage';
import { CONTACT_EMAIL, CONTACT_EMAIL_LINK } from '@/lib/site';

const Privacy = () => (
  <InformationPage
    heading="Privacy"
    title="Privacy | HaryanaBus"
    description="How HaryanaBus handles timetable searches, hosting requests, browser storage, and enquiries sent by email."
    path="/privacy"
    revised="2026-11-15"
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
    <p>
      The HaryanaBus application uses no cookies or persistent browser storage. Your browser may cache site files.
      HaryanaBus currently runs without ads, visitor analytics scripts or third-party error reporting. The site
      serves its own assets. If you follow an external link, the destination handles your visit under its own privacy practices.
    </p>

    <h2>Privacy enquiries</h2>
    <p>
      For privacy enquiries, email <a href={CONTACT_EMAIL_LINK} className="break-words">{CONTACT_EMAIL}</a>.
      When you email HaryanaBus, we receive your email address, your message, and any attachments through Gmail,
      our email service. We use this information to handle your enquiry.
    </p>
  </InformationPage>
);

export default Privacy;
