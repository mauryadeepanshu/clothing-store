import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[80] focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>
      <Navbar />
      <CartDrawer />
      <main id="main" style={{ paddingTop: pathname === '/' ? 0 : 'var(--header-h)' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
