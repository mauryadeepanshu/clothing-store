import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Stars, { StarInput } from './Stars';

export default function Reviews({ productId }) {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [shown, setShown] = useState(5);
  const [form, setForm] = useState(null); // null = closed
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/products/${productId}/reviews`).then(setData).catch(() => {}), [productId]);
  useEffect(() => { setShown(5); setForm(null); load(); }, [load]);

  if (!data) return null;
  const { summary, reviews, canReview, myReview } = data;

  const openForm = () => setForm(myReview ? { rating: myReview.rating, title: myReview.title, comment: myReview.comment } : { rating: 0, title: '', comment: '' });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.rating) errs.rating = 'Choose a star rating';
    if (form.comment.trim().length < 10) errs.comment = 'Write at least 10 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api(`/products/${productId}/reviews`, { method: 'POST', body: form });
      toast(myReview ? 'Review updated' : 'Thanks for your review');
      setForm(null);
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete your review?')) return;
    try { await api(`/products/${productId}/reviews`, { method: 'DELETE' }); toast('Review deleted'); load(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <section id="reviews" className="container-x scroll-mt-24 border-t border-ink/10 py-14">
      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <div>
          <h2 className="text-3xl">Reviews</h2>
          {summary.count > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-display text-5xl">{summary.avg.toFixed(1)}</span>
                <div><Stars value={summary.avg} size={16} /><p className="mt-1 text-sm text-stone">{summary.count} review{summary.count > 1 ? 's' : ''}</p></div>
              </div>
              <ul className="mt-5 space-y-1.5 text-sm">
                {summary.dist.map((d) => (
                  <li key={d.star} className="flex items-center gap-3">
                    <span className="w-10">{d.star} star</span>
                    <span className="h-1.5 flex-1 bg-mist"><span className="block h-full bg-ink" style={{ width: `${(d.count / summary.count) * 100}%` }} /></span>
                    <span className="w-6 text-right text-stone">{d.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="mt-3 text-sm text-stone">No reviews yet.</p>}

          <div className="mt-6 text-sm">
            {!user && <p className="text-stone"><Link to="/login" className="underline underline-offset-2">Sign in</Link> to review items you’ve bought.</p>}
            {user && canReview && !form && (
              <div className="flex flex-wrap gap-3">
                <button className="btn-outline btn-sm" onClick={openForm}>{myReview ? 'Edit your review' : 'Write a review'}</button>
                {myReview && <button className="btn-ghost" onClick={remove}>Delete</button>}
              </div>
            )}
            {user && !canReview && <p className="text-stone">Only customers who’ve received this item can review it.</p>}
          </div>
        </div>

        <div>
          {form && (
            <form onSubmit={submit} noValidate className="mb-10 space-y-4 bg-mist/50 p-5">
              <div><p className="label">Your rating</p><StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />{errors.rating && <p className="field-error">{errors.rating}</p>}</div>
              <div><label htmlFor="rv-title" className="label">Headline (optional)</label><input id="rv-title" maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. Perfect everyday shirt" /></div>
              <div><label htmlFor="rv-comment" className="label">Your review</label><textarea id="rv-comment" rows={4} maxLength={2000} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className={`input ${errors.comment ? 'input-error' : ''}`} placeholder="How was the fit, fabric and quality?" />{errors.comment && <p className="field-error">{errors.comment}</p>}</div>
              <div className="flex gap-3"><button className="btn" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button></div>
            </form>
          )}
          <ul className="divide-y divide-ink/10">
            {reviews.slice(0, shown).map((r) => (
              <li key={r._id} className="py-6 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  {r.title && <p className="font-medium">{r.title}</p>}
                </div>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/80">{r.comment}</p>
                <p className="mt-2 text-xs text-stone">{r.name}{r.mine ? ' (you)' : ''}, {date(r.createdAt)}. Verified purchase{r.size ? `, size ${r.size}` : ''}.</p>
              </li>
            ))}
          </ul>
          {reviews.length > shown && <button className="btn-outline btn-sm mt-4" onClick={() => setShown((n) => n + 5)}>Show more reviews</button>}
        </div>
      </div>
    </section>
  );
}
