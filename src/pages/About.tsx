import InformationPage from '@/components/InformationPage';
import { ANDROID_TIMETABLE_APP_URL, ANDROID_TIMETABLE_NAME } from '@/lib/android-source';
import { BUS_STAND_ENQUIRIES_URL, CONTACT_EMAIL, CONTACT_EMAIL_LINK, PUBLISHER_NAME, SITE_DESCRIPTION } from '@/lib/site';

const About = () => (
  <InformationPage
    heading="About HaryanaBus"
    title="About HaryanaBus | Independent Haryana Roadways Timetable Guide"
    description={`Learn how ${PUBLISHER_NAME} independently publishes HaryanaBus, where its timetables come from, and how to report a correction.`}
    path="/about"
    revised="2026-11-17"
  >
    <p>{SITE_DESCRIPTION} It helps travellers find published departures, boarding points, stops along the route and service days where the timetable lists them.</p>

    <h2>Who runs the website</h2>
    <p>
      HaryanaBus is independently operated by {PUBLISHER_NAME}. Haryana’s Department of State Transport operates Haryana Roadways.
    </p>

    <h2>Where the timetables come from</h2>
    <p>
      HaryanaBus uses archived <a href="https://hartrans.gov.in/bus-time-table-depot-wise/">depot timetable PDFs</a> and
      the <a href={ANDROID_TIMETABLE_APP_URL}>{ANDROID_TIMETABLE_NAME}</a> Android timetable.
      Open “Timetable source” on a departure to see its references, boarding point details and any available stop list.
    </p>

    <h2>Confirm a departure</h2>
    <p>
      Published schedules can change. Check your boarding point, departure time and service day with the operator
      or departure bus stand before travel. If a published time looks wrong, ask the departure bus stand about that
      service using the <a href={BUS_STAND_ENQUIRIES_URL}>Haryana Roadways bus stand enquiry directory</a>.
    </p>

    <h2>Timetable corrections and website enquiries</h2>
    <p>
      Email <a href={CONTACT_EMAIL_LINK} className="break-words">{CONTACT_EMAIL}</a> to report an error on HaryanaBus or ask about the website.
      For timetable corrections, include the boarding point, destination, departure time, and a source or screenshot if available.
    </p>
  </InformationPage>
);

export default About;
