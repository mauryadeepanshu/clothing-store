import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, RotateCcw, Ruler } from 'lucide-react';
import { api } from '../lib/api';
import { pushRecent } from '../lib/recent';
import usePageTitle from '../lib/usePageTitle';
import Img from '../components/Img';
import Price from '../components/Price';
import Stars from '../components/Stars';
import ProductGrid from '../components/ProductGrid';
import Reviews from '../components/Reviews';
import DeliveryCheck from '../components/DeliveryCheck';
import RecentlyViewed from '../components/RecentlyViewed';
import SizeGuideModal, { guideFor } from '../components/SizeGuide';
import { ProductPageSkeleton } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { useStore } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { EMAIL_RE } from '../lib/validators';

function NotifyMe({ product, size }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [state, setState] = useState({ status: 'idle', msg: '' });
  useEffect(() => setState({ status: 'idle', msg: '' }), [size]);
  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setState({ status: 'error', msg: 'Enter a valid email address' });
    setState({ status: 'loading', msg: '' });
    try {
      const d = await api(`/products/${product._id}/notify`, { method: 'POST', body: { email, size } });
      setState({ status: 'done', msg: d.message });
    } catch (err) { setState({ status: 'error', msg: err.message }); }
  };
  if (state.status === 'done') return <p className="mt-4 bg-mist/60 p-3 text-sm" role="status">{state.msg}.</p>;
  return (
    <form onSubmit={submit} noValidate className="mt-4 bg-mist/60 p-4 text-sm">
      <p className="font-medium">Size {size} is sold out</p>
      <p className="mt-1 text-stone">Get an email as soon as it’s back.</p>
      <div className="mt-3 flex">
        <label htmlFor="notify-email" className="sr-only">Email</label>
        <input id="notify-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="input py-2" />
        <button className="btn btn-sm" disabled={state.status === 'loading'}>Notify me</button>
      </div>
      {state.status === 'error' && <p className="field-error">{state.msg}</p>}
    </form>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true });
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState('');
  const [adding, setAdding] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const store = useStore();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const toast = useToast();
  usePageTitle(state.product?.name);

  useEffect(() => {
    setState({ loading: true });
    setActive(0); setSize(''); setQty(1); setSizeError('');
    api(`/products/${slug}`, { auth: false })
      .then((d) => {
        setState({ product: d.product, related: d.related });
        setColor(d.product.colors[0]?.name || '');
        if (d.product.sizes.length === 1 && d.product.sizes[0].stock > 0) setSize(d.product.sizes[0].name);
        pushRecent(d.product._id);
      })
      .catch((e) => setState({ error: e.status === 404 ? 'notfound' : e.message }));
  }, [slug, attempt]);

  if (state.loading) return <ProductPageSkeleton />;
  if (state.error === 'notfound') {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-4xl">This product isn’t available</h1>
        <p className="mt-3 text-sm text-stone">It may have sold out or been removed.</p>
        <Link to="/shop" className="btn mt-8">Browse the shop</Link>
      </div>
    );
  }
  if (state.error) return <div className="container-x py-16"><ErrorState message={state.error} onRetry={() => setAttempt((n) => n + 1)} /></div>;

  const { product: p, related } = state;
  const colorObj = p.colors.find((c) => c.name === color);
  const gallery = colorObj?.images?.length ? colorObj.images : p.images;
  const selected = p.sizes.find((s) => s.name === size);
  const maxQty = Math.min(10, selected?.stock || 10);
  const soldOut = p.totalStock === 0;
  const saved = has(p._id);
  const guide = guideFor(p.sizes);

  const add = async () => {
    if (!size) { setSizeError('Choose a size'); return; }
    setAdding(true);
    try { await addItem(p, size, color, qty); } catch (e) { toast(e.message, 'error'); } finally { setAdding(false); }
  };

  let stockText = '';
  if (soldOut) stockText = 'Sold out in every size';
  else if (selected) stockText = selected.stock === 0 ? '' : selected.stock <= 5 ? `Only ${selected.stock} left in size ${selected.name}` : 'In stock, ships in 1–2 days';
  else stockText = `In stock in ${p.sizes.filter((s) => s.stock > 0).length} of ${p.sizes.length} sizes`;

  return (
    <>
      <div className="container-x pt-6 text-xs text-stone">
        <Link to="/shop" className="hover:text-ink">Shop</Link> / <Link to={`/shop/${p.gender}`} className="capitalize hover:text-ink">{p.gender}</Link> / <Link to={`/shop?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link>
      </div>
      <div className="container-x grid gap-8 py-6 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        <div className={`grid gap-3 ${gallery.length > 1 ? 'sm:grid-cols-[72px_1fr]' : ''}`}>
          {gallery.length > 1 && (
            <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
              {gallery.map((src, i) => (
                <button key={src + i} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={`w-16 shrink-0 border sm:w-full ${i === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <Img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="order-1 aspect-[3/4] overflow-hidden bg-mist sm:order-2">
            <Img key={gallery[active] || gallery[0]} src={gallery[active] || gallery[0]} alt={`${p.name}${color ? ` in ${color}` : ''}`} className="h-full w-full animate-fadein object-cover" />
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="text-3xl leading-tight sm:text-4xl">{p.name}</h1>
          {p.ratingCount > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-stone hover:text-ink"><Stars value={p.ratingAvg} /> {p.ratingAvg.toFixed(1)} ({p.ratingCount} review{p.ratingCount > 1 ? 's' : ''})</a>
          )}
          <Price price={p.price} finalPrice={p.finalPrice} discountPercent={p.discountPercent} className="mt-3 text-lg" />
          <p className="mt-1 text-xs text-stone">Inclusive of all taxes</p>

          {p.colors.length > 0 && (
            <fieldset className="mt-8">
              <legend className="mb-3 text-sm">Colour: <span className="text-stone">{color}</span></legend>
              <div className="flex gap-2">
                {p.colors.map((c) => (
                  <button key={c.name} type="button" onClick={() => { setColor(c.name); setActive(0); }} aria-label={c.name} aria-pressed={color === c.name}
                    className={`h-9 w-9 rounded-full border p-0.5 ${color === c.name ? 'border-ink' : 'border-transparent'}`}>
                    <span className="block h-full w-full rounded-full border border-ink/15" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="mt-6">
            <legend className="mb-3 flex w-full justify-between text-sm">
              <span>Size{size && <span className="text-stone">: {size}</span>}</span>
              <button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1 text-xs text-stone underline underline-offset-2 hover:text-ink"><Ruler size={13} /> Size guide</button>
            </legend>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button key={s.name} type="button" aria-pressed={size === s.name}
                  onClick={() => { setSize(s.name); setSizeError(''); setQty((q) => Math.min(q, Math.max(1, Math.min(10, s.stock)))); }}
                  className={`min-w-[52px] border px-3 py-2.5 text-sm transition-colors ${s.stock === 0 ? 'text-stone/60 line-through' : ''} ${size === s.name ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'}`}>
                  {s.name}
                </button>
              ))}
            </div>
            {sizeError && <p className="field-error">{sizeError}</p>}
          </fieldset>

          {stockText && <p className={`mt-4 text-sm ${soldOut || (selected && selected.stock <= 5) ? 'text-sale' : 'text-stone'}`}>{stockText}</p>}
          {selected?.stock === 0 && <NotifyMe product={p} size={selected.name} />}

          <div className="mt-6 flex gap-3">
            <div className="flex items-center border border-ink/20">
              <button className="px-3 py-3 disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
              <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
              <button className="px-3 py-3 disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <button className="btn flex-1" onClick={add} disabled={soldOut || adding || selected?.stock === 0}>
              {soldOut || selected?.stock === 0 ? 'Sold out' : adding ? 'Adding…' : 'Add to bag'}
            </button>
            <button className="btn-outline px-4" onClick={() => toggle(p._id)} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved}>
              <Heart size={18} strokeWidth={1.5} className={saved ? 'fill-ink' : ''} />
            </button>
          </div>

          <div className="mt-8 space-y-3 border-y border-ink/10 py-5">
            <DeliveryCheck />
            <p className="flex items-center gap-2 text-sm"><RotateCcw size={18} strokeWidth={1.5} /> {store.returnWindowDays > 0 ? `Returns and size exchanges within ${store.returnWindowDays} days of delivery` : 'This item can’t be returned'}</p>
          </div>

          <div className="mt-6">
            <h2 className="font-sans text-sm font-medium">Description</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/80">{p.description}</p>
            {p.details?.length > 0 && (
              <>
                <h2 className="mt-6 font-sans text-sm font-medium">Details and care</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/80">{p.details.map((d) => <li key={d}>{d}</li>)}</ul>
              </>
            )}
          </div>
        </div>
      </div>

      <Reviews productId={p._id} />

      {related?.length > 0 && (
        <section className="container-x border-t border-ink/10 py-14">
          <h2 className="mb-8 text-3xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
      <RecentlyViewed excludeId={p._id} />
      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} kind={guide} />
    </>
  );
}
