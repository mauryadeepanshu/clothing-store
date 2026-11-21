import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { inr, date } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

export default function Customers() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback((term = '') => {
    api(`/admin/customers${term ? `?q=${encodeURIComponent(term)}` : ''}`).then((d) => setList(d.customers)).catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (c) => {
    const verb = c.isBlocked ? 'Unblock' : 'Block';
    if (!window.confirm(`${verb} ${c.name}? ${c.isBlocked ? '' : 'They will be signed out and unable to log in.'}`)) return;
    try {
      const d = await api(`/admin/customers/${c._id}/block`, { method: 'PATCH' });
      setList((l) => l.map((x) => (x._id === c._id ? { ...x, isBlocked: d.isBlocked } : x)));
      toast(d.isBlocked ? 'Customer blocked' : 'Customer unblocked');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <h1 className="text-4xl">Customers</h1>
      <form onSubmit={(e) => { e.preventDefault(); setList(null); load(q.trim()); }} className="mt-6 flex">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="input w-64 py-2" aria-label="Search customers" />
        <button className="btn px-4 py-2">Search</button>
      </form>
      <div className="mt-6 overflow-x-auto bg-paper">
        {!list ? <Spinner /> : (
          <table className="table-x min-w-[720px]">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Spent</th><th className="text-right">Access</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id} className={c.isBlocked ? 'text-stone' : ''}>
                  <td>{c.name}</td><td>{c.email}</td><td>{c.phone || '—'}</td><td>{date(c.createdAt)}</td><td>{c.orders}</td><td>{inr(c.spent)}</td>
                  <td className="text-right"><button className={`btn-sm ${c.isBlocked ? 'btn' : 'btn-outline'}`} onClick={() => toggle(c)}>{c.isBlocked ? 'Unblock' : 'Block'}</button></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="py-10 text-center text-stone">No customers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
