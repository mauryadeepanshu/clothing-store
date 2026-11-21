import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Stars from '../components/Stars';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

export default function Reviews() {
  const toast = useToast();
  const [rating, setRating] = useState('');
  const [list, setList] = useState(null);
  const load = useCallback(() => api(`/admin/reviews${rating ? `?rating=${rating}` : ''}`).then((d) => setList(d.reviews)).catch((e) => toast(e.message, 'error')), [rating, toast]);
  useEffect(() => { setList(null); load(); }, [load]);

  const remove = async (r) => {
    if (!window.confirm('Delete this review? Only remove reviews that are abusive, spam or not about the product.')) return;
    try { await api(`/admin/reviews/${r._id}`, { method: 'DELETE' }); toast('Review deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <h1 className="text-4xl">Reviews</h1>
      <p className="mt-1 text-sm text-stone">Only customers with a delivered order can review. Remove abuse or spam; keep honest negative reviews.</p>
      <div className="mt-6 flex gap-2">{['', '5', '4', '3', '2', '1'].map((r) => <button key={r || 'all'} className={`chip ${rating === r ? 'chip-active' : ''}`} onClick={() => setRating(r)}>{r ? `${r} star` : 'All'}</button>)}</div>
      <div className="mt-6 space-y-2">
        {!list ? <Spinner /> : list.map((r) => (
          <div key={r._id} className="flex gap-4 bg-paper p-4 text-sm">
            <Img src={r.product?.images?.[0]} alt="" className="h-16 w-12 shrink-0 object-cover" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} />{r.title && <span className="font-medium">{r.title}</span>}</div>
              <p className="mt-1">{r.comment}</p>
              <p className="mt-1 text-xs text-stone">{r.name} ({r.user?.email}), {date(r.createdAt)}, on <Link to={`/product/${r.product?.slug}`} className="underline">{r.product?.name}</Link></p>
            </div>
            <button onClick={() => remove(r)} className="self-start p-2 text-sale hover:bg-mist" aria-label="Delete review"><Trash2 size={16} /></button>
          </div>
        ))}
        {list && !list.length && <p className="bg-paper p-10 text-center text-sm text-stone">No reviews yet.</p>}
      </div>
    </div>
  );
}
