import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { inr, date } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';

const EMPTY = { code: '', description: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expiresAt: '', isActive: true };

export default function Coupons() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/admin/coupons').then((d) => setList(d.coupons)).catch((e) => toast(e.message, 'error')), [toast]);
  useEffect(() => { load(); }, [load]);

  const open = (c) => {
    setEditing(c ? c._id : 'new');
    setErrors({});
    setV(c ? { ...EMPTY, ...c, maxDiscount: c.maxDiscount ?? '', usageLimit: c.usageLimit ?? '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' } : EMPTY);
  };
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(v.code.trim())) errs.code = '3–20 letters, numbers, - or _';
    if (!(Number(v.value) > 0)) errs.value = 'Enter a value above 0';
    if (v.type === 'percent' && Number(v.value) > 90) errs.value = 'Percent cannot exceed 90';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api(editing === 'new' ? '/admin/coupons' : `/admin/coupons/${editing}`, { method: editing === 'new' ? 'POST' : 'PUT', body: v });
      toast('Coupon saved');
      setEditing(null);
      load();
    } catch (err) { setErrors(err.details || { code: err.message }); } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try { await api(`/admin/coupons/${c._id}`, { method: 'DELETE' }); toast('Coupon deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  const describe = (c) => (c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? `, max ${inr(c.maxDiscount)}` : ''}` : `${inr(c.value)} off`);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl">Coupons</h1>
        <button className="btn" onClick={() => open(null)}><Plus size={16} /> Add coupon</button>
      </div>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!list ? <Spinner /> : (
          <table className="table-x min-w-[760px]">
            <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c._id}>
                    <td><p className="font-medium">{c.code}</p><p className="text-xs text-stone">{c.description}</p></td>
                    <td>{describe(c)}</td>
                    <td>{c.minOrder ? inr(c.minOrder) : '—'}</td>
                    <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                    <td>{c.expiresAt ? date(c.expiresAt) : 'Never'}</td>
                    <td>{!c.isActive ? <span className="text-stone">Paused</span> : expired ? <span className="text-sale">Expired</span> : 'Active'}</td>
                    <td className="text-right">
                      <button className="inline-flex p-2 hover:bg-mist" onClick={() => open(c)} aria-label={`Edit ${c.code}`}><Pencil size={16} /></button>
                      <button className="inline-flex p-2 text-sale hover:bg-mist" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="py-10 text-center text-stone">No coupons yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add coupon' : 'Edit coupon'}>
        <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" name="code" value={v.code} onChange={set('code')} error={errors.code} className="sm:col-span-2" style={{ textTransform: 'uppercase' }} />
          <Field label="Description shown to shoppers" name="description" value={v.description} onChange={set('description')} maxLength={200} className="sm:col-span-2" />
          <Field label="Type" name="type" as="select" value={v.type} onChange={set('type')}>
            <option value="percent">Percent off</option><option value="fixed">Fixed amount off</option>
          </Field>
          <Field label={v.type === 'percent' ? 'Percent' : 'Amount (₹)'} name="value" type="number" min="1" value={v.value} onChange={set('value')} error={errors.value} />
          <Field label="Minimum order (₹)" name="minOrder" type="number" min="0" value={v.minOrder} onChange={set('minOrder')} />
          {v.type === 'percent' && <Field label="Maximum discount (₹)" name="maxDiscount" type="number" min="0" value={v.maxDiscount} onChange={set('maxDiscount')} />}
          <Field label="Usage limit (blank for unlimited)" name="usageLimit" type="number" min="1" value={v.usageLimit} onChange={set('usageLimit')} />
          <Field label="Expires on (optional)" name="expiresAt" type="date" value={v.expiresAt} onChange={set('expiresAt')} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v.isActive} onChange={set('isActive')} /> Active</label>
          <button className="btn sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button>
        </form>
      </Modal>
    </div>
  );
}
