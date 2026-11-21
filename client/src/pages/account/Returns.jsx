import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { inr, date } from '../../lib/format';
import Img from '../../components/Img';
import Spinner from '../../components/Spinner';

const STEPS = { return: ['Requested', 'Approved', 'Picked Up', 'Refunded'], exchange: ['Requested', 'Approved', 'Picked Up', 'Exchanged'] };

export default function Returns() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/returns/mine').then((d) => setList(d.returns)).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="text-sale">{error}</p>;
  if (!list) return <Spinner />;
  if (!list.length) {
    return (
      <div className="border border-dashed border-ink/20 p-10 text-center">
        <p className="font-display text-2xl">No returns or exchanges</p>
        <p className="mt-2 text-sm text-stone">Open a delivered order to return an item or swap its size while the return window is open.</p>
        <Link to="/account/orders" className="btn mt-6">View orders</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {list.map((r) => {
        const steps = STEPS[r.type];
        const idx = steps.indexOf(r.status);
        return (
          <li key={r._id} className="border border-ink/10 p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.type === 'return' ? 'Return' : 'Exchange'} {r.returnNumber}</p>
                <p className="text-stone">Order <Link to={`/account/orders/${r.order}`} className="underline">{r.orderNumber}</Link>, requested {date(r.createdAt)}. {r.reason}.</p>
              </div>
              {r.type === 'return' && <p>Refund {inr(r.refundAmount)}</p>}
            </div>
            <ul className="mt-4 space-y-2">
              {r.items.map((i, k) => (
                <li key={k} className="flex items-center gap-3">
                  <Img src={i.image} alt={i.name} className="h-12 w-9 object-cover" />
                  <span>{i.name} <span className="text-stone">size {i.size} × {i.quantity}{i.exchangeSize ? `, exchanging for size ${i.exchangeSize}` : ''}</span></span>
                </li>
              ))}
            </ul>
            {r.status === 'Rejected' ? (
              <p className="mt-4 text-sale">Not approved{r.history.at(-1)?.note ? `: ${r.history.at(-1).note}` : ''}</p>
            ) : (
              <ol className="mt-5 grid grid-cols-4 gap-1 text-xs" aria-label="Progress">
                {steps.map((s, i) => (
                  <li key={s}><div className={`h-1 ${i <= idx ? 'bg-ink' : 'bg-ink/10'}`} /><p className={`mt-2 ${i <= idx ? '' : 'text-stone'}`}>{s}</p></li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ul>
  );
}
