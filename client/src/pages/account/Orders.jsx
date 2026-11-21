import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { inr, date } from '../../lib/format';
import Img from '../../components/Img';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/orders/mine').then((d) => setOrders(d.orders)).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="text-sale">{error}</p>;
  if (!orders) return <Spinner />;
  if (!orders.length) {
    return (
      <div className="border border-dashed border-ink/20 p-10 text-center">
        <p className="font-display text-2xl">No orders yet</p>
        <p className="mt-2 text-sm text-stone">When you place an order, you can track it here.</p>
        <Link to="/shop" className="btn mt-6">Start shopping</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o._id}>
          <Link to={`/account/orders/${o._id}`} className="block border border-ink/10 p-5 transition-colors hover:border-ink/40">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-stone">{date(o.createdAt)}, {o.items.reduce((s, i) => s + i.quantity, 0)} items, {inr(o.total)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-4 flex gap-2">
              {o.items.slice(0, 5).map((i) => <Img key={`${i.product}-${i.size}`} src={i.image} alt={i.name} className="aspect-[3/4] w-12 object-cover" />)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
