import usePageTitle from '../lib/usePageTitle';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { inr } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import AddressForm from '../components/AddressForm';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function Checkout() {
  usePageTitle('Checkout');
  const { user, setUser } = useAuth();
  const { items, orderLines, couponCode, setCouponCode, clear, loading } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const addresses = user.addresses || [];
  const [addressId, setAddressId] = useState(() => (addresses.find((a) => a.isDefault) || addresses[0])?._id || 'new');
  const [newAddress, setNewAddress] = useState(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState('COD');
  const [rzp, setRzp] = useState({ enabled: false });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => { api('/payments/config', { auth: false }).then(setRzp).catch(() => {}); }, []);

  const linesKey = JSON.stringify(orderLines);
  useEffect(() => {
    if (!items.length) return;
    api('/orders/quote', { method: 'POST', body: { items: orderLines, couponCode } })
      .then((q) => { setQuote(q); setError(''); })
      .catch((e) => {
        if (couponCode) { setCouponCode(''); toast(`Coupon removed: ${e.message}`, 'error'); } else setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, couponCode]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (!items.length && !placing) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-4xl">There’s nothing to check out yet</h1>
        <Link to="/shop" className="btn mt-8">Browse the shop</Link>
      </div>
    );
  }

  const shippingAddress = addressId === 'new' ? newAddress : addresses.find((a) => a._id === addressId);

  const place = async () => {
    if (!shippingAddress) { setError('Add a delivery address to continue'); return; }
    setError('');
    setPlacing(true);
    try {
      if (addressId === 'new' && saveAddress) {
        const d = await api('/users/addresses', { method: 'POST', body: newAddress }).catch(() => null);
        if (d) setUser((u) => ({ ...u, addresses: d.addresses }));
      }
      const body = { items: orderLines, couponCode, shippingAddress };

      if (method === 'COD') {
        const { order } = await api('/orders', { method: 'POST', body });
        await clear();
        navigate(`/order/${order._id}/success`, { replace: true });
        return;
      }

      // Razorpay: server creates and prices the order; the browser only opens checkout.
      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay. Check your connection and try again.');
      const rp = await api('/payments/razorpay/order', { method: 'POST', body });
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: rp.keyId,
          amount: rp.amount,
          currency: rp.currency,
          order_id: rp.razorpayOrderId,
          name: 'Modern Fashion Store',
          description: `Order ${rp.orderNumber}`,
          prefill: rp.prefill,
          theme: { color: '#000000' },
          handler: async (response) => {
            try {
              // Signature is verified on the server; the order is only marked paid there.
              await api('/payments/razorpay/verify', { method: 'POST', body: { orderId: rp.orderId, ...response } });
              await clear();
              navigate(`/order/${rp.orderId}/success`, { replace: true });
              resolve();
            } catch (e) { reject(e); }
          },
          modal: {
            ondismiss: () => {
              api('/payments/razorpay/failed', { method: 'POST', body: { orderId: rp.orderId, reason: 'Checkout closed' } }).catch(() => {});
              reject(new Error('Payment was cancelled. Your bag is unchanged.'));
            },
          },
        });
        checkout.on('payment.failed', (resp) => {
          api('/payments/razorpay/failed', { method: 'POST', body: { orderId: rp.orderId, reason: resp.error?.description } }).catch(() => {});
        });
        checkout.open();
      });
    } catch (e) {
      // 409 after paying = item sold out at the last moment: the order is cancelled and a full refund queued.
      setError(e.message);
      setPlacing(false);
    }
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <ol className="mb-6 flex items-center gap-3 text-xs text-stone" aria-label="Checkout progress">
        <li><Link to="/cart" className="hover:text-ink">1. Bag</Link></li><li aria-hidden="true">—</li>
        <li className={shippingAddress ? '' : 'font-medium text-ink'}>2. Delivery</li><li aria-hidden="true">—</li>
        <li className={shippingAddress ? 'font-medium text-ink' : ''}>3. Payment</li>
      </ol>
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-12">
          <section>
            <h2 className="font-sans text-lg">Delivery address</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label key={a._id} className={`cursor-pointer border p-4 text-sm transition-colors ${addressId === a._id ? 'border-ink' : 'border-ink/15 hover:border-ink/40'}`}>
                  <input type="radio" name="address" className="sr-only" checked={addressId === a._id} onChange={() => setAddressId(a._id)} />
                  <p className="font-medium">{a.label}{a.isDefault && <span className="ml-2 text-xs font-normal text-stone">Default</span>}</p>
                  <p className="mt-1">{a.fullName}, {a.phone}</p>
                  <p className="text-stone">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}</p>
                </label>
              ))}
              <label className={`flex cursor-pointer items-center justify-center border border-dashed p-4 text-sm ${addressId === 'new' ? 'border-ink' : 'border-ink/30'}`}>
                <input type="radio" name="address" className="sr-only" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                Deliver to a new address
              </label>
            </div>
            {addressId === 'new' && (
              <div className="mt-6">
                {newAddress ? (
                  <div className="flex items-start justify-between border border-ink p-4 text-sm">
                    <div>
                      <p>{newAddress.fullName}, {newAddress.phone}</p>
                      <p className="text-stone">{newAddress.line1}{newAddress.line2 ? `, ${newAddress.line2}` : ''}, {newAddress.city}, {newAddress.state} {newAddress.pincode}</p>
                    </div>
                    <button className="btn-ghost" onClick={() => setNewAddress(null)}>Edit</button>
                  </div>
                ) : (
                  <AddressForm initial={{ fullName: user.name, phone: user.phone || '' }} onSubmit={setNewAddress} submitLabel="Use this address" showDefault={false} showLabel={false} />
                )}
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save to my addresses
                </label>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-sans text-lg">Payment</h2>
            <div className="mt-5 space-y-3">
              <label className={`flex cursor-pointer gap-3 border p-4 text-sm ${method === 'RAZORPAY' ? 'border-ink' : 'border-ink/15'} ${!rzp.enabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                <input type="radio" name="pay" className="mt-0.5 h-4 w-4 accent-ink" disabled={!rzp.enabled} checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} />
                <span>
                  <span className="font-medium">Pay online</span>
                  <span className="block text-stone">{rzp.enabled ? 'UPI, cards, net banking and wallets, secured by Razorpay.' : 'Online payment isn’t set up on this store yet.'}</span>
                </span>
              </label>
              <label className={`flex cursor-pointer gap-3 border p-4 text-sm ${method === 'COD' ? 'border-ink' : 'border-ink/15'}`}>
                <input type="radio" name="pay" className="mt-0.5 h-4 w-4 accent-ink" checked={method === 'COD'} onChange={() => setMethod('COD')} />
                <span>
                  <span className="font-medium">Cash on delivery</span>
                  <span className="block text-stone">Pay in cash or UPI when your order arrives.</span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit bg-mist/60 p-6">
          <h2 className="font-sans text-base font-medium">Order summary</h2>
          <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 text-sm">
                <Img src={i.image} alt={i.name} className="aspect-[3/4] w-14 object-cover" />
                <div className="flex-1">
                  <p>{i.name}</p>
                  <p className="text-xs text-stone">Size {i.size}, qty {i.quantity}</p>
                </div>
                <p>{inr(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          {quote ? (
            <dl className="mt-6 space-y-2 border-t border-ink/15 pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(quote.subtotal)}</dd></div>
              {quote.discount > 0 && <div className="flex justify-between text-sale"><dt>Coupon ({quote.couponCode})</dt><dd>−{inr(quote.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{quote.shippingFee ? inr(quote.shippingFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-ink/15 pt-3 text-base font-medium"><dt>Total</dt><dd>{inr(quote.total)}</dd></div>
            </dl>
          ) : !error && <Spinner className="py-6" />}
          {!couponCode && <p className="mt-3 text-xs text-stone">Have a coupon? <Link to="/cart" className="underline">Apply it in your bag</Link>.</p>}
          {error && <p className="mt-4 text-sm text-sale" role="alert">{error}</p>}
          <button className="btn mt-6 w-full" onClick={place} disabled={placing || !quote}>
            {placing ? 'Placing order…' : method === 'COD' ? `Place order${quote ? ` · ${inr(quote.total)}` : ''}` : `Pay ${quote ? inr(quote.total) : ''}`}
          </button>
          <p className="mt-3 text-center text-xs text-stone">Prices and stock are confirmed when you place your order.</p>
        </aside>
      </div>
    </div>
  );
}
