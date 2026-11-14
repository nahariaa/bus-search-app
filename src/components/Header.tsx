import { Bus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const navLinkClass = 'flex min-h-11 items-center rounded-sm px-2 text-sm text-slate-200 underline-offset-4 hover:text-white hover:underline aria-[current=page]:text-white aria-[current=page]:underline';

const Header = () => (
  <header className="bg-slate-900 text-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 py-2 sm:px-6">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-xl font-bold">
        <Bus className="h-6 w-6 text-blue-400" aria-hidden="true" />
        HaryanaBus
      </Link>
      <nav aria-label="Main navigation" className="-ml-2 flex flex-wrap gap-x-1 sm:ml-0">
        <NavLink to="/" end className={navLinkClass}>Timetable search</NavLink>
        <NavLink to="/routes" className={navLinkClass}>Routes</NavLink>
        <NavLink to="/about" className={navLinkClass}>About</NavLink>
        <NavLink to="/privacy" className={navLinkClass}>Privacy</NavLink>
      </nav>
    </div>
  </header>
);

export default Header;
