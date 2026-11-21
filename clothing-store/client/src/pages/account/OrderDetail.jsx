import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { inr, date, dateTime } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import Img from '../../components/Img';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ReturnForm from './ReturnForm';

const STEPS = ['Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  useEffect(() => { api(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message)); }, [id]);

  const cancel = async () => {
    if (!window.confirm('Cancel this order? This can’t be undone.')) return;
    setCancelling(true);
    try {
      const d = await api(`/orders/${id}/cancel`, { method: 'POST' });
      setOrder((o) => ({ ...d.order, user: o.user }));
      toast('Order cancelled');
    } catch (e) { toast(e.message, 'error'); } finally { setCancelling(false); }
  };

  if (error) return <p className="text-sale">{error}</p>;
  if (!order) return <Spinner />;
  const stepIdx = STEPS.indexOf(order.status);
  const a = order.shippingAddress;

  return (
    <div>
      <Link to="/account/orders" className="btn-ghost">All orders</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl">Order {order.orderNumber}</h2>
          <p className="mt-1 text-sm text-stone">Placed {date(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status !== 'Cancelled' && stepIdx >= 0 && (
        <ol className="mt-8 grid grid-cols-5 gap-1 text-[11px] sm:text-xs" aria-label="Delivery progress">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={`h-1 ${i <= stepIdx ? 'bg-ink' : 'bg-ink/10'}`} />
              <p className={`mt-2 ${i <= stepIdx ? '' : 'text-stone'}`}>{s}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 grid gap-10 xl:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {order.items.map((i) => (
            <li key={`${i.product}-${i.size}-${i.color}`} className="flex gap-4 py-4 text-sm">
              <Img src={i.image} alt={i.name} className="aspect-[3/4] w-16 object-cover" />
              <div className="flex-1">
                <p>{i.name}</p>
                <p className="text-stone">Size {i.size}{i.color ? `, ${i.color}` : ''}. Qty {i.quantity} × {inr(i.unitPrice)}</p>
              </div>
              <p>{inr(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-6 text-sm">
          <dl className="space-y-1.5">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-sale"><dt>Coupon {order.couponCode}</dt><dd>−{inr(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingFee ? inr(order.shippingFee) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-ink/15 pt-2 font-medium"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
          </dl>
          <div>
            <p className="font-medium">Payment</p>
            <p className="text-stone">{order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online (Razorpay)'}: {order.paymentStatus}</p>
          </div>
          <div>
            <p className="font-medium">Delivery address</p>
            <p className="text-stone">{a.fullName}, {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}</p>
          </div>
          {order.status !== 'Cancelled' && (
            <Link to={`/invoice/${order._id}`} className="btn-outline w-full">Download invoice</Link>
          )}
          {order.status === 'Delivered' && order.deliveredAt && new Date(order.deliveredAt).getTime() + 15 * 864e5 > Date.now() && (
            <button className="btn w-full" onClick={() => setReturnOpen(true)}>Return or exchange items</button>
          )}
          {['Placed', 'Confirmed'].includes(order.status) && (
            <button className="btn-outline w-full" onClick={cancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel order'}</button>
          )}
        </div>
      </div>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Return or exchange">
        {returnOpen && <ReturnForm orderId={order._id} onClose={() => setReturnOpen(false)} />}
      </Modal>

      <h3 className="mt-12 font-sans text-sm font-medium">History</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {[...order.statusHistory].reverse().map((h) => (
          <li key={h._id || h.at} className="flex gap-4"><span className="w-36 shrink-0 text-stone">{dateTime(h.at)}</span><span>{h.status}{h.note ? `: ${h.note}` : ''}</span></li>
        ))}
      </ul>
    </div>
  );
}
