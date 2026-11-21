import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { date } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import Img from '../../components/Img';
import Spinner from '../../components/Spinner';

export default function ReturnForm({ orderId, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [type, setType] = useState('return');
  const [sel, setSel] = useState({}); // key -> { qty, exchangeSize }
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [upi, setUpi] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api(`/orders/${orderId}/return-eligibility`).then(setInfo).catch((e) => setError(e.message)); }, [orderId]);
  if (!info) return error ? <p className="text-sm text-sale">{error}</p> : <Spinner />;
  if (!info.eligible) return <p className="text-sm">This order isn’t eligible for returns. The return window may have closed, or every item is already in a return request.</p>;

  const keyOf = (i) => `${i.product}|${i.size}|${i.color}`;
  const toggle = (i) => setSel((s) => { const n = { ...s }; if (n[keyOf(i)]) delete n[keyOf(i)]; else n[keyOf(i)] = { qty: 1, exchangeSize: '' }; return n; });
  const chosen = info.items.filter((i) => sel[keyOf(i)]);

  const submit = async (e) => {
    e.preventDefault();
    if (!chosen.length) return setError('Select at least one item');
    if (!reason) return setError('Choose a reason');
    if (type === 'exchange' && chosen.some((i) => !sel[keyOf(i)].exchangeSize)) return setError('Choose the new size for each item');
    setBusy(true); setError('');
    try {
      await api('/returns', {
        method: 'POST',
        body: { orderId, type, reason, comment, refundUpi: upi, items: chosen.map((i) => ({ product: i.product, size: i.size, color: i.color, quantity: sel[keyOf(i)].qty, exchangeSize: sel[keyOf(i)].exchangeSize })) },
      });
      toast(type === 'return' ? 'Return requested' : 'Exchange requested');
      onClose();
      navigate('/account/returns');
    } catch (err) { setError(err.details?.refundUpi || err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6 text-sm">
      <p className="text-stone">Available until {date(info.windowEnds)}. Items must be unworn with tags attached.</p>
      <div className="grid grid-cols-2 gap-2">
        {[['return', 'Return for refund'], ['exchange', 'Exchange size']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setType(v)} aria-pressed={type === v} className={`chip py-3 ${type === v ? 'chip-active' : ''}`}>{l}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {info.items.map((i) => {
          const k = keyOf(i); const s = sel[k]; const sizes = info.sizesById[String(i.product)] || [];
          return (
            <li key={k} className={`border p-3 ${s ? 'border-ink' : 'border-ink/15'} ${i.returnable < 1 ? 'opacity-50' : ''}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-ink" disabled={i.returnable < 1} checked={Boolean(s)} onChange={() => toggle(i)} />
                <Img src={i.image} alt="" className="h-14 w-10 object-cover" />
                <span className="flex-1">{i.name}<span className="block text-stone">Size {i.size}{i.color ? `, ${i.color}` : ''}. {i.returnable < 1 ? 'Already in a return' : `${i.returnable} eligible`}</span></span>
              </label>
              {s && (
                <div className="mt-3 flex flex-wrap gap-3 pl-7">
                  <label>Qty <select className="input ml-1 w-auto py-1.5" value={s.qty} onChange={(e) => setSel({ ...sel, [k]: { ...s, qty: Number(e.target.value) } })}>{Array.from({ length: i.returnable }, (_, n) => <option key={n}>{n + 1}</option>)}</select></label>
                  {type === 'exchange' && (
                    <label>New size <select className="input ml-1 w-auto py-1.5" value={s.exchangeSize} onChange={(e) => setSel({ ...sel, [k]: { ...s, exchangeSize: e.target.value } })}>
                      <option value="">Choose</option>
                      {sizes.filter((z) => z.name !== i.size).map((z) => <option key={z.name} value={z.name} disabled={z.stock < s.qty}>{z.name}{z.stock < s.qty ? ' (sold out)' : ''}</option>)}
                    </select></label>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        <label htmlFor="ret-reason" className="label">Reason</label>
        <select id="ret-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input"><option value="">Choose a reason</option>{info.reasons.map((r) => <option key={r}>{r}</option>)}</select>
      </div>
      {type === 'return' && info.paymentMethod === 'COD' && (
        <div>
          <label htmlFor="ret-upi" className="label">UPI ID for your refund</label>
          <input id="ret-upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okbank" className="input" />
          <p className="mt-1 text-xs text-stone">You paid cash on delivery, so we’ll send the refund to this UPI ID.</p>
        </div>
      )}
      <div>
        <label htmlFor="ret-comment" className="label">Anything else? (optional)</label>
        <textarea id="ret-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
      </div>
      {error && <p className="text-sale" role="alert">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? 'Sending…' : type === 'return' ? 'Request return' : 'Request exchange'}</button>
    </form>
  );
}
