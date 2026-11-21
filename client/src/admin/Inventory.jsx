import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

export default function Inventory() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [lowOnly, setLowOnly] = useState(false);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    api('/products?all=true&limit=48&sort=newest').then(async (first) => {
      let all = first.products;
      for (let p = 2; p <= first.pages; p++) {
        // eslint-disable-next-line no-await-in-loop
        const d = await api(`/products?all=true&limit=48&sort=newest&page=${p}`);
        all = all.concat(d.products);
      }
      setProducts(all);
    }).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  if (!products) return <Spinner />;
  const shown = lowOnly ? products.filter((p) => p.sizes.some((s) => s.stock <= 5)) : products;
  const value = (p, s) => drafts[p._id]?.[s.name] ?? s.stock;
  const dirty = (p) => p.sizes.some((s) => Number(value(p, s)) !== s.stock);

  const save = async (p) => {
    const sizes = p.sizes.map((s) => ({ name: s.name, stock: Number(value(p, s)) }));
    if (sizes.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) { toast('Stock must be a whole number, 0 or more', 'error'); return; }
    setSaving(p._id);
    try {
      const d = await api(`/admin/products/${p._id}/stock`, { method: 'PATCH', body: { sizes } });
      setProducts((list) => list.map((x) => (x._id === p._id ? { ...x, sizes: d.product.sizes, totalStock: d.product.totalStock } : x)));
      setDrafts((dr) => { const n = { ...dr }; delete n[p._id]; return n; });
      toast(`Stock updated for ${p.name}`);
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(''); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Inventory</h1>
          <p className="mt-1 text-sm text-stone">Edit stock per size, then save each product.</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Show only 5 or fewer</label>
      </div>
      <div className="mt-6 space-y-3">
        {shown.map((p) => (
          <div key={p._id} className="flex flex-wrap items-center gap-4 bg-paper p-4">
            <Img src={p.images[0]} alt={p.name} className="h-14 w-10 object-cover" />
            <div className="w-48 text-sm"><p>{p.name}</p><p className="text-xs text-stone">{p.totalStock} in stock</p></div>
            <div className="flex flex-1 flex-wrap gap-2">
              {p.sizes.map((s) => (
                <label key={s.name} className="text-xs">
                  <span className="mb-1 block text-stone">{s.name}</span>
                  <input type="number" min="0" value={value(p, s)} onChange={(e) => setDrafts({ ...drafts, [p._id]: { ...drafts[p._id], [s.name]: e.target.value } })}
                    className={`input w-20 py-1.5 ${Number(value(p, s)) === 0 ? 'border-sale/50' : Number(value(p, s)) <= 5 ? 'border-sand' : ''}`} />
                </label>
              ))}
            </div>
            <button className="btn btn-sm" disabled={!dirty(p) || saving === p._id} onClick={() => save(p)}>{saving === p._id ? 'Saving…' : 'Save'}</button>
          </div>
        ))}
        {!shown.length && <p className="bg-paper p-8 text-center text-sm text-stone">Every size has more than 5 in stock.</p>}
      </div>
    </div>
  );
}
