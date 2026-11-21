import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Img from './Img';
import { inr } from '../lib/format';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, subtotal, updateQuantity, removeItem, count } = useCart();
  const toast = useToast();

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;
  const run = (p) => Promise.resolve().then(p).catch((e) => toast(e.message, 'error'));

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your bag">
      <button className="absolute inset-0 animate-fadein bg-ink/40" aria-label="Close bag" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slidein flex-col bg-paper">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-sans text-base">Your bag ({count})</h2>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close bag" className="p-1"><X size={22} strokeWidth={1.5} /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-2xl">Your bag is empty</p>
            <p className="text-sm text-stone">Pieces you add will wait here for you.</p>
            <Link to="/shop" onClick={() => setDrawerOpen(false)} className="btn mt-2">Start shopping</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4 py-5">
                  <Link to={`/product/${i.slug}`} onClick={() => setDrawerOpen(false)} className="w-20 shrink-0">
                    <Img src={i.image} alt={i.name} className="aspect-[3/4] w-full object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col text-sm">
                    <div className="flex justify-between gap-2">
                      <Link to={`/product/${i.slug}`} onClick={() => setDrawerOpen(false)} className="hover:underline">{i.name}</Link>
                      <span className="shrink-0">{inr(i.price * i.quantity)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone">Size {i.size}{i.color ? `, ${i.color}` : ''}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-ink/20">
                        <button className="p-2 disabled:opacity-30" disabled={i.quantity <= 1} onClick={() => run(() => updateQuantity(i.id, i.quantity - 1))} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <span className="w-8 text-center text-xs" aria-live="polite">{i.quantity}</span>
                        <button className="p-2 disabled:opacity-30" disabled={i.quantity >= Math.min(10, i.stock)} onClick={() => run(() => updateQuantity(i.id, i.quantity + 1))} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      <button className="text-xs text-stone underline underline-offset-2 hover:text-ink" onClick={() => run(() => removeItem(i.id))}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink/10 px-5 py-5">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <p className="mt-1 text-xs text-stone">Shipping and coupons are calculated at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/cart" onClick={() => setDrawerOpen(false)} className="btn-outline">View bag</Link>
                <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="btn">Checkout</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
