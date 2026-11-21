import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Heart, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../lib/api';
import { inr } from '../lib/format';
import Img from './Img';

const NAV = [['Women', '/shop/women'], ['Men', '/shop/men'], ['Unisex', '/shop/unisex'], ['New in', '/shop?tag=new'], ['Sale', '/shop?tag=sale']];

function SearchPanel({ onClose }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ products: [], categories: [] });
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRes({ products: [], categories: [] }); return undefined; }
    const t = setTimeout(() => api(`/products/suggest?q=${encodeURIComponent(term)}`, { auth: false }).then((d) => { setRes(d); setActive(-1); }).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (to) => { onClose(); navigate(to); };
  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && res.products[active]) return go(`/product/${res.products[active].slug}`);
    if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(res.products.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    if (e.key === 'Escape') onClose();
  };
  const has = res.products.length || res.categories.length;

  return (
    <div className="animate-fadein border-t border-ink/10 bg-paper text-ink">
      <form onSubmit={submit} className="container-x flex items-center gap-3 py-4" role="search">
        <Search size={20} strokeWidth={1.5} className="text-stone" />
        <label htmlFor="site-search" className="sr-only">Search products</label>
        <input id="site-search" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoComplete="off"
          role="combobox" aria-expanded={Boolean(has)} aria-controls="search-suggestions" aria-activedescendant={active >= 0 ? `sugg-${active}` : undefined}
          placeholder="Search jeans, dresses, hoodies…" className="flex-1 bg-transparent py-2 font-display text-2xl outline-none placeholder:text-stone/60" />
        <button type="submit" className="btn btn-sm">Search</button>
      </form>
      {q.trim().length >= 2 && (
        <div id="search-suggestions" className="container-x pb-6">
          {!has && <p className="text-sm text-stone">No matches for “{q.trim()}”. Press Search to look in descriptions too.</p>}
          {res.categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {res.categories.map((c) => <button key={c._id} onClick={() => go(`/shop?category=${c.slug}`)} className="chip">{c.name}</button>)}
            </div>
          )}
          <ul role="listbox" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {res.products.map((p, i) => (
              <li key={p._id} id={`sugg-${i}`} role="option" aria-selected={i === active}>
                <button onClick={() => go(`/product/${p.slug}`)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center gap-3 p-2 text-left text-sm ${i === active ? 'bg-mist' : ''}`}>
                  <Img src={p.images[0]} alt="" className="h-14 w-10 shrink-0 object-cover" />
                  <span className="flex-1">{p.name}<span className="block text-stone">{inr(p.finalPrice)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { count, setDrawerOpen } = useCart();
  const { user } = useAuth();
  const { ids } = useWishlist();
  const { settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const bar = settings?.announcement?.enabled && settings.announcement.text ? settings.announcement : null;
  const overHero = location.pathname === '/' && !scrolled && !menuOpen && !searchOpen;

  useEffect(() => {
    document.documentElement.style.setProperty('--header-h', bar ? '96px' : '64px');
  }, [bar]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const linkCls = ({ isActive }) => `link-underline py-1 ${isActive ? 'bg-[length:100%_1px]' : ''}`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {bar && (
          <div className="flex h-8 items-center justify-center bg-ink px-4 text-center text-xs text-paper">
            {bar.link ? <Link to={bar.link} className="truncate hover:underline">{bar.text}</Link> : <span className="truncate">{bar.text}</span>}
          </div>
        )}
        <div className={`transition-colors duration-300 ${overHero ? 'bg-transparent text-paper' : 'border-b border-ink/10 bg-paper/95 text-ink backdrop-blur'}`}>
          <div className="container-x flex h-16 items-center gap-4">
            <button className="-ml-2 p-2 lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
            <Link to="/" className="font-display text-[1.7rem] leading-none tracking-wordmark" aria-label="Modern Fashion Store home">Modern</Link>
            <nav className="ml-8 hidden items-center gap-7 text-sm lg:flex" aria-label="Main">
              {NAV.map(([label, to]) => <NavLink key={label} to={to} className={linkCls} end>{label}</NavLink>)}
            </nav>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button className="p-2" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" aria-expanded={searchOpen}><Search size={20} strokeWidth={1.5} /></button>
              <Link to={user ? '/account/wishlist' : '/login'} className="relative hidden p-2 sm:block" aria-label="Wishlist">
                <Heart size={20} strokeWidth={1.5} />
                {ids.size > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-current" />}
              </Link>
              <Link to={user ? (user.role === 'admin' ? '/admin' : '/account') : '/login'} className="p-2" aria-label={user ? 'My account' : 'Sign in'}><User size={20} strokeWidth={1.5} /></Link>
              <button className="relative p-2" onClick={() => setDrawerOpen(true)} aria-label={`Bag, ${count} items`}>
                <ShoppingBag size={20} strokeWidth={1.5} />
                {count > 0 && <span className={`absolute -right-0.5 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-medium ${overHero ? 'bg-paper text-ink' : 'bg-ink text-paper'}`}>{count}</span>}
              </button>
            </div>
          </div>
          {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-fadein overflow-y-auto bg-paper text-ink lg:hidden" style={{ top: 'var(--header-h)' }}>
          <nav className="container-x flex flex-col py-6" aria-label="Mobile">
            {NAV.map(([label, to]) => <Link key={label} to={to} className="border-b border-ink/10 py-4 font-display text-3xl">{label}</Link>)}
            <div className="mt-8 flex flex-col gap-3 text-sm">
              <Link to={user ? '/account' : '/login'}>{user ? `Signed in as ${user.name}` : 'Sign in or create an account'}</Link>
              <Link to={user ? '/account/wishlist' : '/login'}>Wishlist</Link>
              <Link to="/help">Help and size guide</Link>
              <Link to="/contact">Contact us</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
