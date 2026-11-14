import { Link } from 'react-router-dom';
import { BUS_STAND_ENQUIRIES_URL, CONTACT_EMAIL, CONTACT_EMAIL_LINK, SITE_DESCRIPTION } from '@/lib/site';

const linkClass = 'rounded-sm underline decoration-slate-400 underline-offset-4 hover:text-white';

const Footer = () => (
  <footer className="bg-slate-900 text-slate-200">
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <p>{SITE_DESCRIPTION}</p>
      <nav aria-label="Footer navigation">
        <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <li><Link to="/" className={linkClass}>Timetable search</Link></li>
          <li><Link to="/about" className={linkClass}>About</Link></li>
          <li><Link to="/privacy" className={linkClass}>Privacy</Link></li>
        </ul>
      </nav>
      <ul className="space-y-2 text-sm">
        <li>HaryanaBus contact email <a href={CONTACT_EMAIL_LINK} className={`${linkClass} break-words`}>{CONTACT_EMAIL}</a></li>
        <li>Journey enquiries <a href={BUS_STAND_ENQUIRIES_URL} className={linkClass}>Haryana Roadways bus-stand directory</a></li>
      </ul>
      <p className="border-t border-slate-700 pt-4 text-sm text-slate-400">&copy; HaryanaBus</p>
    </div>
  </footer>
);

export default Footer;
