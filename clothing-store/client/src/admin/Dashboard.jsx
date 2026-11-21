import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { inr, date } from '../lib/format';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import Img from '../components/Img';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const { store } = useSettings();
  useEffect(() => { api('/admin/stats').then(setS).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="text-sale">{error}</p>;
  if (!s) return <Spinner />;
  const maxRev = Math.max(1, ...s.monthly.map((m) => m.revenue));

  const stats = [
    ['Revenue', inr(s.revenue), `${s.paidOrders} paid orders`],
    ['Orders', s.totalOrders, `${s.ordersByStatus.Placed || 0} awaiting confirmation`],
    ['Customers', s.totalCustomers, 'Registered accounts'],
    ['Products', s.totalProducts, `${s.lowStock.length} sizes running low`],
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-stone">Revenue counts paid online orders and delivered cash-on-delivery orders. {inr(s.pendingCODValue)} is pending in undelivered COD orders.</p>
      </div>

      {(() => {
        const a = s.attention || {};
        const missing = store ? [['support email', store.email], ['phone', store.phone], ['registered address', store.address], ['grievance officer', store.grievanceName && store.grievanceEmail]].filter(([, val]) => !val).map(([k]) => k) : [];
        const items = [
          a.refundsDue > 0 && <Link key="r" to="/admin/orders" className="underline">{a.refundsDue} order{a.refundsDue > 1 ? 's' : ''} need a refund</Link>,
          a.returnsWaiting > 0 && <Link key="rt" to="/admin/returns" className="underline">{a.returnsWaiting} return request{a.returnsWaiting > 1 ? 's' : ''} waiting</Link>,
          a.newMessages > 0 && <Link key="m" to="/admin/messages" className="underline">{a.newMessages} new message{a.newMessages > 1 ? 's' : ''}</Link>,
          a.stuckPayments > 0 && <span key="p">{a.stuckPayments} payment{a.stuckPayments > 1 ? 's' : ''} stuck in processing; check server logs</span>,
          missing.length > 0 && <Link key="s" to="/admin/homepage" className="underline">Business details missing: {missing.join(', ')}</Link>,
        ].filter(Boolean);
        return items.length ? (
          <div className="border-l-2 border-sale bg-paper p-4 text-sm" role="status">
            <p className="font-medium">Needs your attention</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
          </div>
        ) : null;
      })()}

      <div className="grid grid-cols-2 gap-px bg-ink/10 xl:grid-cols-4">
        {stats.map(([label, value, note]) => (
          <div key={label} className="bg-paper p-5">
            <p className="text-sm text-stone">{label}</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl">{value}</p>
            <p className="mt-1 text-xs text-stone">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section className="bg-paper p-5">
          <h2 className="font-sans text-base font-medium">Revenue, last 6 months</h2>
          <div className="mt-6 flex h-56 items-end gap-3" role="img" aria-label="Monthly revenue bar chart">
            {s.monthly.map((m) => (
              <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[11px] text-stone">{m.revenue ? inr(m.revenue) : ''}</span>
                <div className="w-full bg-ink transition-all" style={{ height: `${Math.max(2, (m.revenue / maxRev) * 100)}%`, opacity: m.revenue ? 1 : 0.15 }} title={`${m.orders} orders`} />
                <span className="text-xs">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-paper p-5">
          <h2 className="font-sans text-base font-medium">Orders by status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {['Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].map((st) => (
              <li key={st} className="flex items-center justify-between">
                <StatusBadge status={st} />
                <Link to={`/admin/orders?status=${encodeURIComponent(st)}`} className="hover:underline">{s.ordersByStatus[st] || 0}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="bg-paper p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-medium">Recent orders</h2>
            <Link to="/admin/orders" className="btn-ghost">All orders</Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="table-x min-w-[520px]">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td><Link to={`/admin/orders?open=${o._id}`} className="hover:underline">{o.orderNumber}</Link></td>
                    <td>{o.user?.name}</td><td>{date(o.createdAt)}</td><td>{inr(o.total)}</td><td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
                {!s.recentOrders.length && <tr><td colSpan={5} className="text-stone">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="space-y-8">
          <div className="bg-paper p-5">
            <h2 className="font-sans text-base font-medium">Best sellers</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {s.topProducts.map((p) => (
                <li key={p._id} className="flex items-center gap-3">
                  <Img src={p.images[0]} alt={p.name} className="h-12 w-9 object-cover" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-stone">{p.sold} sold</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-paper p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-medium">Low stock</h2>
              <Link to="/admin/inventory" className="btn-ghost">Restock</Link>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {s.lowStock.map((l) => (
                <li key={`${l._id}-${l.size}`} className="flex justify-between gap-3"><span className="truncate">{l.name} ({l.size})</span><span className={l.stock === 0 ? 'text-sale' : 'text-stone'}>{l.stock === 0 ? 'Sold out' : `${l.stock} left`}</span></li>
              ))}
              {!s.lowStock.length && <li className="text-stone">All sizes are well stocked.</li>}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
