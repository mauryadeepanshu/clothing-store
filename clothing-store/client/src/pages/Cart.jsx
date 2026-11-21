import usePageTitle from '../lib/usePageTitle';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { inr } from '../lib/format';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

export default function Cart() {
  usePageTitle('Your bag');
  const { items, loading, updateQuantity, removeItem, orderLines, couponCode, setCouponCode, savings } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState(couponCode);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [hints, setHints] = useState([]);

  useEffect(() => { api('/coupons/public', { auth: false }).then((d) => setHints(d.coupons)).catch(() => {}); }, []);

  // Totals always come from the server.
  const linesKey = JSON.stringify(orderLines);
  useEffect(() => {
    if (!items.length) { setQuote(null); return; }
    let alive = true;
    api('/orders/quote', { method: 'POST', body: { items: orderLines, couponCode }, auth: false })
      .then((q) => { if (alive) { setQuote(q); setQuoteError(''); } })
      .catch((e) => {
        if (!alive) return;
        // If only the coupon became invalid (e.g. items removed), drop it and re-quote.
        if (couponCode) { setCouponCode(''); setCouponError(e.message); } else setQuoteError(e.message);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, couponCode]);

  const apply = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) { setCouponError('Enter a coupon code'); return; }
    setApplying(true);
    setCouponError('');
    try {
      await api('/coupons/apply', { method: 'POST', body: { code: c, items: orderLines }, auth: false });
      setCouponCode(c);
      setCode(c);
      toast(`${c} applied`);
    } catch (err) {
      setCouponError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const run = (fn) => fn().catch((e) => toast(e.message, 'error'));

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (!items.length) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-5xl">Your bag is empty</h1>
        <p className="mt-3 text-sm text-stone">Browse new arrivals or pick up where you left off in your wishlist.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/shop?tag=new" className="btn">Shop new arrivals</Link>
          <Link to="/account/wishlist" className="btn-outline">View wishlist</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Your bag</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 py-6 sm:gap-6">
              <Link to={`/product/${i.slug}`} className="w-24 shrink-0 sm:w-32"><Img src={i.image} alt={i.name} className="aspect-[3/4] w-full object-cover" /></Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link to={`/product/${i.slug}`} className="hover:underline">{i.name}</Link>
                    <p className="mt-1 text-sm text-stone">Size {i.size}{i.color ? `, ${i.color}` : ''}</p>
                    <p className="mt-1 text-sm">{inr(i.price)}{i.mrp > i.price && <span className="ml-2 text-stone line-through">{inr(i.mrp)}</span>}</p>
                  </div>
                  <button onClick={() => run(() => removeItem(i.id))} aria-label={`Remove ${i.name}`} className="self-start p-1 text-stone hover:text-ink"><X size={18} /></button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-4">
                  <div className="flex items-center border border-ink/20">
                    <button className="p-2.5 disabled:opacity-30" disabled={i.quantity <= 1} onClick={() => run(() => updateQuantity(i.id, i.quantity - 1))} aria-label="Decrease quantity"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm">{i.quantity}</span>
                    <button className="p-2.5 disabled:opacity-30" disabled={i.quantity >= Math.min(10, i.stock)} onClick={() => run(() => updateQuantity(i.id, i.quantity + 1))} aria-label="Increase quantity"><Plus size={14} /></button>
                  </div>
                  <div className="text-right">
                    {i.stock <= 5 && <p className="text-xs text-sale">Only {i.stock} left</p>}
                    <p>{inr(i.price * i.quantity)}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit bg-mist/60 p-6">
          <h2 className="font-sans text-base font-medium">Order summary</h2>
          <form onSubmit={apply} className="mt-5" noValidate>
            <label htmlFor="coupon" className="label">Coupon code</label>
            {couponCode ? (
              <div className="flex items-center justify-between border border-ink bg-paper px-3 py-2.5 text-sm">
                <span><strong className="font-medium">{couponCode}</strong> applied</span>
                <button type="button" className="text-xs underline" onClick={() => { setCouponCode(''); setCode(''); }}>Remove</button>
              </div>
            ) : (
              <div className="flex">
                <input id="coupon" value={code} onChange={(e) => { setCode(e.target.value); setCouponError(''); }} placeholder="Enter code" className={`input uppercase ${couponError ? 'input-error' : ''}`} />
                <button className="btn px-4" disabled={applying}>{applying ? '…' : 'Apply'}</button>
              </div>
            )}
            {couponError && <p className="field-error">{couponError}</p>}
            {!couponCode && hints.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-stone">
                {hints.map((h) => (
                  <li key={h.code}><button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => setCode(h.code)}>{h.code}</button> {h.description}</li>
                ))}
              </ul>
            )}
          </form>

          {quoteError && <p className="mt-4 text-sm text-sale">{quoteError}</p>}
          {quote ? (
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(quote.subtotal)}</dd></div>
              {savings > 0 && <div className="flex justify-between text-stone"><dt>You save on sale items</dt><dd>{inr(savings)}</dd></div>}
              {quote.discount > 0 && <div className="flex justify-between text-sale"><dt>Coupon ({quote.couponCode})</dt><dd>−{inr(quote.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{quote.shippingFee ? inr(quote.shippingFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-ink/15 pt-3 text-base font-medium"><dt>Total</dt><dd>{inr(quote.total)}</dd></div>
            </dl>
          ) : !quoteError && <Spinner className="py-8" />}
          <button className="btn mt-6 w-full" disabled={!quote || Boolean(quoteError)} onClick={() => navigate('/checkout')}>Continue to checkout</button>
          <Link to="/shop" className="btn-ghost mt-4 flex justify-center">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
