import { Link } from 'react-router-dom';
import NewsletterForm from './NewsletterForm';

const cols = [
  { title: 'Shop', links: [['Women', '/shop/women'], ['Men', '/shop/men'], ['Unisex', '/shop/unisex'], ['New in', '/shop?tag=new'], ['Sale', '/shop?tag=sale']] },
  { title: 'Account', links: [['Sign in', '/login'], ['Create account', '/register'], ['My orders', '/account/orders'], ['Wishlist', '/account/wishlist'], ['Bag', '/cart']] },
  { title: 'Help', links: [['Contact us', '/contact'], ['Size guide', '/help#sizes'], ['Shipping & delivery', '/policies/shipping'], ['Returns & refunds', '/policies/returns'], ['About us', '/about']] },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="font-display text-3xl">Hear about new drops first.</p>
          <p className="mt-2 max-w-sm text-sm text-paper/60">One email a fortnight. New arrivals, restocks and members-only offers.</p>
          <div className="mt-6"><NewsletterForm dark /></div>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-4 font-sans text-sm text-paper/50">{c.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="link-underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="overflow-hidden">
        <p aria-hidden="true" className="container-x -mb-[0.22em] select-none font-display text-[22vw] leading-none tracking-wordmark text-paper/[0.07] lg:text-[17rem]">Modern</p>
      </div>
      <div className="border-t border-paper/15">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-paper/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Modern Fashion Store. Prices include GST.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/policies/privacy" className="hover:text-paper">Privacy policy</Link>
            <Link to="/policies/terms" className="hover:text-paper">Terms and conditions</Link>
            <Link to="/policies/returns" className="hover:text-paper">Cancellation and refunds</Link>
            <Link to="/policies/shipping" className="hover:text-paper">Shipping policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
