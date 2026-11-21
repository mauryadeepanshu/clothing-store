import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SizeTable } from '../components/SizeGuide';
import usePageTitle from '../lib/usePageTitle';
import { useStore, rupees } from '../context/SettingsContext';

export default function Help() {
  usePageTitle('Help');
  const store = useStore();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="container-x max-w-3xl py-14 sm:py-20">
      <h1 className="text-5xl">Help</h1>
      <section id="shipping" className="scroll-mt-24 border-b border-ink/10 py-10">
        <h2 className="text-3xl">Shipping and returns</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80">
          <p>{Number(store.shippingFee) > 0 ? `Orders of ${rupees(store.freeShippingThreshold)} or more ship free; below that a flat ${rupees(store.shippingFee)} applies.` : 'Shipping is free on all orders.'} Orders are usually dispatched within {store.dispatchTime}; check the delivery date for your PIN code on any product page.</p>
          <p>{store.returnWindowDays > 0 ? `You can return unworn items with tags attached within ${store.returnWindowDays} days of delivery.` : 'Items can only be returned if they arrive damaged, defective or wrong.'} Cancel an order yourself from My account until it ships.</p>
        </div>
      </section>
      <section id="payments" className="scroll-mt-24 border-b border-ink/10 py-10">
        <h2 className="text-3xl">Payments</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80">
          <p>Pay online with UPI, debit or credit cards, net banking or wallets through Razorpay, or choose cash on delivery. We never see or store your card details.</p>
          <p>If money is debited but your order isn’t confirmed, the amount is refunded automatically to the original method within 5–7 working days.</p>
        </div>
      </section>
      <section id="sizes" className="scroll-mt-24 border-b border-ink/10 py-10">
        <h2 className="text-3xl">Size guide</h2>
        <div className="mt-6 space-y-10"><SizeTable kind="apparel" /><SizeTable kind="waist" /><SizeTable kind="shoes" /></div>
      </section>
      <section id="contact" className="scroll-mt-24 py-10">
        <h2 className="text-3xl">Contact</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">Use our <Link to="/contact" className="underline">contact form</Link> and we’ll reply within one working day. Full details are in our <Link to="/policies/shipping" className="underline">shipping</Link> and <Link to="/policies/returns" className="underline">returns</Link> policies.</p>
      </section>
    </div>
  );
}
