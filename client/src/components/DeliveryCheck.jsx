import { useState } from 'react';
import { Truck } from 'lucide-react';
import { api } from '../lib/api';

const KEY = 'mfs_pincode';
const day = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function DeliveryCheck() {
  const [pin, setPin] = useState(() => localStorage.getItem(KEY) || '');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const d = await api(`/delivery/estimate?pincode=${encodeURIComponent(pin.trim())}`, { auth: false });
      setRes(d);
      if (d.valid) localStorage.setItem(KEY, pin.trim());
    } catch (err) { setRes({ valid: false, message: err.message }); } finally { setBusy(false); }
  };

  return (
    <div className="text-sm">
      <form onSubmit={check} className="flex items-center gap-2" noValidate>
        <Truck size={18} strokeWidth={1.5} className="shrink-0" />
        <label htmlFor="pin" className="sr-only">Delivery PIN code</label>
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setRes(null); }} placeholder="Enter PIN code for delivery date" className="input py-2" />
        <button className="btn-outline btn-sm" disabled={busy || pin.length !== 6}>{busy ? '…' : 'Check'}</button>
      </form>
      {res && (
        <p className={`mt-2 pl-[26px] ${res.valid && res.serviceable ? '' : 'text-sale'}`} role="status">
          {!res.valid || !res.serviceable
            ? res.message
            : <>Delivery to {res.pincode} by <strong className="font-medium">{day(res.to)}</strong> (usually {day(res.from)}). Cash on delivery available.</>}
        </p>
      )}
    </div>
  );
}
