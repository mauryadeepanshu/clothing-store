import usePageTitle from '../lib/usePageTitle';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { inr, date } from '../lib/format';
import Spinner from '../components/Spinner';

export default function OrderSuccess() {
  usePageTitle('Order confirmed');
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message)); }, [id]);

  if (error) return <p className="container-x py-24 text-sale">{error}</p>;
  if (!order) return <Spinner className="min-h-[60vh]" />;
  const eta = new Date(new Date(order.createdAt).getTime() + 6 * 864e5);

  return (
    <div className="container-x max-w-2xl py-16 sm:py-24">
      <p className="text-sm text-stone">Order {order.orderNumber}</p>
      <h1 className="mt-2 text-5xl leading-tight sm:text-6xl">Thank you, {order.shippingAddress.fullName.split(' ')[0]}.</h1>
      <p className="mt-4 text-ink/80">
        {order.paymentMethod === 'COD'
          ? `Your order is confirmed. Please keep ${inr(order.total)} ready for when it arrives.`
          : `We’ve received your payment of ${inr(order.total)} and your order is confirmed.`}
        {' '}Expected delivery by {date(eta)}.
      </p>
      <div className="mt-10 border-y border-ink/10 py-6 text-sm">
        {order.items.map((i) => (
          <div key={`${i.product}-${i.size}`} className="flex justify-between py-1.5">
            <span>{i.name} <span className="text-stone">({i.size}) × {i.quantity}</span></span>
            <span>{inr(i.lineTotal)}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 font-medium"><span>Total</span><span>{inr(order.total)}</span></div>
      </div>
      <p className="mt-6 text-sm text-stone">Delivering to {order.shippingAddress.line1}, {order.shippingAddress.city} {order.shippingAddress.pincode}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to={`/account/orders/${order._id}`} className="btn">Track this order</Link>
        <Link to="/shop" className="btn-outline">Continue shopping</Link>
      </div>
    </div>
  );
}
