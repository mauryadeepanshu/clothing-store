import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { inr } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

export default function Products() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const qs = new URLSearchParams({ all: 'true', limit: '20', page: String(page), sort: 'newest' });
    if (term) qs.set('q', term);
    if (gender) qs.set('gender', gender);
    setData(null);
    api(`/products?${qs}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [term, gender, page, reload, toast]);

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? This can’t be undone.`)) return;
    try {
      await api(`/admin/products/${p._id}`, { method: 'DELETE' });
      toast('Product deleted');
      setReload((n) => n + 1);
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Products</h1>
        <Link to="/admin/products/new" className="btn"><Plus size={16} /> Add product</Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }} className="flex">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input w-64 py-2" aria-label="Search products" />
          <button className="btn px-4 py-2">Search</button>
        </form>
        <select value={gender} onChange={(e) => { setPage(1); setGender(e.target.value); }} className="input w-auto py-2" aria-label="Collection">
          <option value="">All collections</option><option value="women">Women</option><option value="men">Men</option><option value="unisex">Unisex</option>
        </select>
      </div>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!data ? <Spinner /> : (
          <table className="table-x min-w-[760px]">
            <thead><tr><th>Product</th><th>Category</th><th>Collection</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Img src={p.images[0]} alt={p.name} className="h-14 w-10 object-cover" />
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category?.name}</td>
                  <td className="capitalize">{p.gender}</td>
                  <td>{inr(p.finalPrice)}{p.finalPrice < p.price && <span className="ml-1 text-xs text-stone line-through">{inr(p.price)}</span>}</td>
                  <td className={p.totalStock === 0 ? 'text-sale' : p.totalStock < 10 ? 'text-sale/80' : ''}>{p.totalStock}</td>
                  <td>{p.isActive ? 'Live' : <span className="text-stone">Hidden</span>}</td>
                  <td className="text-right">
                    <Link to={`/admin/products/${p._id}/edit`} className="inline-flex p-2 hover:bg-mist" aria-label={`Edit ${p.name}`}><Pencil size={16} /></Link>
                    <button onClick={() => remove(p)} className="inline-flex p-2 text-sale hover:bg-mist" aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {!data.products.length && <tr><td colSpan={7} className="py-10 text-center text-stone">No products match.</td></tr>}
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
    </div>
  );
}
