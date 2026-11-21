import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import Img from '../components/Img';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';

const EMPTY = { name: '', description: '', image: '', hsn: '', isActive: true };

export default function Categories() {
  const toast = useToast();
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [v, setV] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/categories?all=true').then((d) => setCats(d.categories)).catch((e) => toast(e.message, 'error')), [toast]);
  useEffect(() => { load(); }, [load]);

  const open = (c) => { setEditing(c ? c._id : 'new'); setV(c ? { name: c.name, description: c.description, image: c.image, hsn: c.hsn || '', isActive: c.isActive } : EMPTY); setError(''); };

  const save = async (e) => {
    e.preventDefault();
    if (v.name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setBusy(true);
    try {
      await api(editing === 'new' ? '/admin/categories' : `/admin/categories/${editing}`, { method: editing === 'new' ? 'POST' : 'PUT', body: v });
      toast('Category saved');
      setEditing(null);
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete the “${c.name}” category?`)) return;
    try { await api(`/admin/categories/${c._id}`, { method: 'DELETE' }); toast('Category deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl">Categories</h1>
        <button className="btn" onClick={() => open(null)}><Plus size={16} /> Add category</button>
      </div>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!cats ? <Spinner /> : (
          <table className="table-x min-w-[560px]">
            <thead><tr><th>Category</th><th>Products</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c._id}>
                  <td><div className="flex items-center gap-3"><Img src={c.image} alt={c.name} className="h-10 w-10 object-cover" /><div><p>{c.name}{c.hsn && <span className="ml-2 text-xs text-stone">HSN {c.hsn}</span>}</p><p className="text-xs text-stone">{c.description}</p></div></div></td>
                  <td>{c.productCount}</td>
                  <td>{c.isActive ? 'Visible' : <span className="text-stone">Hidden</span>}</td>
                  <td className="text-right">
                    <button className="inline-flex p-2 hover:bg-mist" onClick={() => open(c)} aria-label={`Edit ${c.name}`}><Pencil size={16} /></button>
                    <button className="inline-flex p-2 text-sale hover:bg-mist" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add category' : 'Edit category'}>
        <form onSubmit={save} noValidate className="space-y-4">
          <Field label="Name" name="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <Field label="Description" name="description" as="textarea" rows={2} maxLength={300} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          <Field label="GST HSN code (printed on invoices)" name="hsn" inputMode="numeric" maxLength={8} value={v.hsn} onChange={(e) => setV({ ...v, hsn: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 6109" />
          <Field label="Image URL" name="image" value={v.image} onChange={(e) => setV({ ...v, image: e.target.value })} placeholder="https://…" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} /> Visible in store</label>
          {error && <p className="text-sm text-sale">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button>
        </form>
      </Modal>
    </div>
  );
}
