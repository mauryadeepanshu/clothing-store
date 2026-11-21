import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { inr, date, dateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import Img from '../components/Img';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

const FLOW = ['Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function Orders() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const openId = params.get('open');
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [refundRef, setRefundRef] = useState('');
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState(null);
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (term) qs.set('q', term);
    api(`/admin/orders?${qs}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [page, status, term, toast]);
  useEffect(() => { setData(null); load(); }, [load]);

  useEffect(() => {
    if (!openId) { setOrder(null); return; }
    api(`/orders/${openId}`).then((d) => { setOrder(d.order); setNext(''); setNote(''); }).catch((e) => toast(e.message, 'error'));
  }, [openId, toast]);

  const setParam = (k, val) => {
    const n = new URLSearchParams(params);
    if (val) n.set(k, val); else n.delete(k);
    setParams(n);
  };

  const updateStatus = async () => {
    if (!next) return;
    if (next === 'Cancelled' && !window.confirm('Cancel this order and return its items to stock?')) return;
    setBusy(true);
    try {
      const d = await api(`/admin/orders/${order._id}/status`, { method: 'PATCH', body: { status: next, note } });
      setOrder(d.order);
      setNext(''); setNote('');
      toast(`Order marked ${d.order.status}`);
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const refundAction = async (kind) => {
    const amount = inr(order.total - (order.refunds || []).filter((r) => r.status !== 'failed').reduce((x, r) => x + r.amount, 0));
    const msg = kind === 'razorpay' ? `Refund ${amount} to the customer through Razorpay?` : `Record that you refunded ${amount} outside Razorpay${refundRef ? ` (ref ${refundRef})` : ''}?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const d = kind === 'razorpay'
        ? await api(`/admin/orders/${order._id}/refund`, { method: 'POST' })
        : await api(`/admin/orders/${order._id}/refunded`, { method: 'POST', body: { reference: refundRef } });
      setOrder(d.order); setRefundRef('');
      toast(kind === 'razorpay' ? 'Refund issued via Razorpay' : 'Refund recorded');
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const options = order && !['Cancelled', 'Delivered'].includes(order.status)
    ? [...FLOW.slice(FLOW.indexOf(order.status) + 1), 'Cancelled'] : [];

  return (
    <div>
      <h1 className="text-4xl">Orders</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }} className="flex">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number" className="input w-52 py-2" aria-label="Search by order number" />
          <button className="btn px-4 py-2">Search</button>
        </form>
        <select value={status} onChange={(e) => { setPage(1); setParam('status', e.target.value); }} className="input w-auto py-2" aria-label="Filter by status">
          <option value="">All statuses</option>
          {[...FLOW, 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!data ? <Spinner /> : (
          <table className="table-x min-w-[820px]">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o._id} className="cursor-pointer hover:bg-mist/50" onClick={() => setParam('open', o._id)}>
                  <td className="font-medium underline-offset-2 hover:underline">{o.orderNumber}</td>
                  <td>{date(o.createdAt)}</td>
                  <td>{o.user?.name}<p className="text-xs text-stone">{o.user?.email}</p></td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td>{inr(o.total)}</td>
                  <td>{o.paymentMethod}<p className={`text-xs ${o.paymentStatus === 'Refund Required' ? 'text-sale' : 'text-stone'}`}>{o.paymentStatus}</p></td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {!data.orders.length && <tr><td colSpan={7} className="py-10 text-center text-stone">No orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {data?.pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button className="chip" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <Modal open={Boolean(openId)} onClose={() => setParam('open', '')} title={order ? `Order ${order.orderNumber}` : 'Order'} wide>
        {!order ? <Spinner /> : (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={order.status} />
              <span className="text-stone">{dateTime(order.createdAt)}</span>
              <span className="text-stone">{order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Razorpay'}: {order.paymentStatus}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/invoice/${order._id}`} className="btn-outline btn-sm">GST invoice</Link>
              <Link to={`/invoice/${order._id}?type=packing`} className="btn-outline btn-sm">Packing slip</Link>
            </div>
            {order.paymentStatus === 'Refund Required' && (
              <div className="space-y-3 bg-sale/10 p-3 text-sm">
                <p className="text-sale">This order needs a refund.</p>
                <div className="flex flex-wrap items-center gap-2">
                  {order.paymentMethod === 'RAZORPAY' && <button className="btn btn-sm" disabled={busy} onClick={() => refundAction('razorpay')}>Refund via Razorpay</button>}
                  <input value={refundRef} onChange={(e) => setRefundRef(e.target.value)} maxLength={100} placeholder="UPI / bank reference" className="input w-56 py-1.5" aria-label="Refund reference" />
                  <button className="btn-outline btn-sm" disabled={busy} onClick={() => refundAction('manual')}>Mark refunded manually</button>
                </div>
              </div>
            )}
            {order.paymentStatus === 'Refund Processing' && <p className="bg-mist p-3 text-sm">A refund is being processed. Refresh in a moment.</p>}
            {order.refunds?.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Refunds</p>
                <ul className="mt-1 space-y-0.5 text-stone">{order.refunds.map((r, k) => <li key={k}>{inr(r.amount)}, {r.kind}, {r.status}{r.refundId ? ` (${r.refundId})` : ''}, {dateTime(r.at)}</li>)}</ul>
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <div><p className="font-medium">Customer</p><p className="text-stone">{order.user?.name}<br />{order.user?.email}</p></div>
              <div><p className="font-medium">Ship to</p><p className="text-stone">{order.shippingAddress.fullName}, {order.shippingAddress.phone}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p></div>
            </div>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {order.items.map((i) => (
                <li key={`${i.product}-${i.size}-${i.color}`} className="flex items-center gap-3 py-3">
                  <Img src={i.image} alt={i.name} className="h-14 w-10 object-cover" />
                  <span className="flex-1">{i.name} <span className="text-stone">({i.size}{i.color ? `, ${i.color}` : ''}) × {i.quantity}</span></span>
                  <span>{inr(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto max-w-xs space-y-1">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt>Coupon {order.couponCode}</dt><dd>−{inr(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{inr(order.shippingFee)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
            </dl>
            {options.length > 0 && (
              <div className="bg-mist/60 p-4">
                <p className="font-medium">Update status</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <select value={next} onChange={(e) => setNext(e.target.value)} className="input w-auto py-2" aria-label="New status">
                    <option value="">Choose status</option>
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note, e.g. tracking number (optional)" maxLength={200} className="input min-w-[200px] flex-1 py-2" aria-label="Status note" />
                  <button className="btn btn-sm" disabled={!next || busy} onClick={updateStatus}>{busy ? 'Saving…' : 'Update'}</button>
                </div>
              </div>
            )}
            <div>
              <p className="font-medium">History</p>
              <ul className="mt-2 space-y-1">
                {[...order.statusHistory].reverse().map((h) => <li key={h._id || h.at} className="flex gap-3"><span className="w-32 shrink-0 text-stone">{dateTime(h.at)}</span><span>{h.status}{h.note ? `: ${h.note}` : ''}</span></li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
