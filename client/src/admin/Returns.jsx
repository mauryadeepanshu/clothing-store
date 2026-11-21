import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { inr, date, dateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Img from '../components/Img';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';

const STATUSES = ['Requested', 'Approved', 'Rejected', 'Picked Up', 'Refunded', 'Exchanged'];
const NEXT = { Requested: ['Approved', 'Rejected'], Approved: ['Picked Up'], 'Picked Up': ['Refunded', 'Exchanged'] };
const HINT = {
  Approved: 'Approving an exchange reserves the new size from stock.',
  'Picked Up': 'Returned items go back into stock.',
  Refunded: 'Prepaid orders: “Refund via Razorpay” sends the money automatically. Cash-on-delivery orders: send it to the customer’s UPI ID first, then record it here.',
};

export default function Returns() {
  const toast = useToast();
  const [status, setStatus] = useState('Requested');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setList(null);
    api(`/admin/returns${status ? `?status=${encodeURIComponent(status)}` : ''}`).then((d) => setList(d.returns)).catch((e) => toast(e.message, 'error'));
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (next, method) => {
    if (next === 'Rejected' && !note.trim()) { toast('Add a note explaining why it’s rejected', 'error'); return; }
    if (next === 'Refunded' && !window.confirm(method === 'manual' ? `Record that you sent ${inr(open.refundAmount)} to the customer yourself?` : `Refund ${inr(open.refundAmount)} through Razorpay now?`)) return;
    setBusy(true);
    try {
      const d = await api(`/admin/returns/${open._id}`, { method: 'PATCH', body: { status: next, note, method } });
      setOpen(d.return); setNote('');
      toast(`Marked ${next.toLowerCase()}`);
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const options = open ? (NEXT[open.status] || []).filter((s) => (open.type === 'return' ? s !== 'Exchanged' : s !== 'Refunded')) : [];
  return (
    <div>
      <h1 className="text-4xl">Returns and exchanges</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => <button key={s || 'all'} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>{s || 'All'}</button>)}
      </div>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!list ? <Spinner /> : (
          <table className="table-x min-w-[760px]">
            <thead><tr><th>Request</th><th>Date</th><th>Customer</th><th>Type</th><th>Items</th><th>Refund</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id} className="cursor-pointer hover:bg-mist/50" onClick={() => { setOpen(r); setNote(''); }}>
                  <td className="font-medium">{r.returnNumber}<p className="text-xs font-normal text-stone">Order {r.orderNumber}</p></td>
                  <td>{date(r.createdAt)}</td><td>{r.user?.name}</td><td className="capitalize">{r.type}</td>
                  <td>{r.items.reduce((s, i) => s + i.quantity, 0)}</td><td>{r.type === 'return' ? inr(r.refundAmount) : '–'}</td><td>{r.status}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="py-10 text-center text-stone">Nothing here.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open ? `${open.type === 'return' ? 'Return' : 'Exchange'} ${open.returnNumber}` : ''} wide>
        {open && (
          <div className="space-y-5 text-sm">
            <p><strong className="font-medium">{open.status}</strong>. Order {open.orderNumber}, {open.order?.paymentMethod === 'COD' ? 'cash on delivery' : 'prepaid'}. Reason: {open.reason}.</p>
            {open.comment && <p className="bg-mist/60 p-3">“{open.comment}”</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="font-medium">Customer</p><p className="text-stone">{open.user?.name}<br />{open.user?.email}<br />{open.user?.phone}</p></div>
              <div><p className="font-medium">Pickup address</p><p className="text-stone">{open.order?.shippingAddress?.line1}, {open.order?.shippingAddress?.city} {open.order?.shippingAddress?.pincode}<br />{open.order?.shippingAddress?.phone}</p></div>
            </div>
            {open.type === 'return' && <p>Refund amount <strong className="font-medium">{inr(open.refundAmount)}</strong>{open.refundUpi && <> to UPI <strong className="font-medium">{open.refundUpi}</strong></>}</p>}
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {open.items.map((i, k) => (
                <li key={k} className="flex items-center gap-3 py-3"><Img src={i.image} alt={i.name} className="h-14 w-10 object-cover" /><span>{i.name} <span className="text-stone">size {i.size} × {i.quantity}{i.exchangeSize ? ` → size ${i.exchangeSize}` : ''}</span></span></li>
              ))}
            </ul>
            {options.length > 0 && (
              <div className="space-y-3 bg-mist/60 p-4">
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note for the customer (required to reject)" className="input py-2" aria-label="Note" />
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (o === 'Refunded' && open.order?.paymentMethod === 'RAZORPAY'
                    ? [<button key="rz" className="btn btn-sm" disabled={busy} onClick={() => act(o, 'razorpay')}>Refund {inr(open.refundAmount)} via Razorpay</button>,
                       <button key="mn" className="btn-outline btn-sm" disabled={busy} onClick={() => act(o, 'manual')}>Mark refunded manually</button>]
                    : <button key={o} className={o === 'Rejected' ? 'btn-outline btn-sm' : 'btn btn-sm'} disabled={busy} onClick={() => act(o, 'manual')}>{o === 'Refunded' ? `Mark ${inr(open.refundAmount)} refunded (sent to UPI)` : `Mark ${o.toLowerCase()}`}</button>))}
                </div>
                {options.map((o) => HINT[o] && <p key={o} className="text-xs text-stone">{HINT[o]}</p>)}
              </div>
            )}
            <ul className="space-y-1">{[...open.history].reverse().map((h, k) => <li key={k} className="flex gap-3"><span className="w-32 shrink-0 text-stone">{dateTime(h.at)}</span><span>{h.status}{h.note ? `: ${h.note}` : ''}</span></li>)}</ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
