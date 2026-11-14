import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

const SiteLayout = () => {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const main = useRef<HTMLElement>(null);
  const previousKey = useRef(key);

  useEffect(() => {
    if (previousKey.current === key) return;
    previousKey.current = key;
    main.current?.focus({ preventScroll: true });
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [key, navigationType]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" ref={main} tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default SiteLayout;
