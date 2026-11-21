import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { dateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

export default function Messages() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);
  const [openId, setOpenId] = useState(null);
  const load = useCallback(() => api(`/admin/messages${status ? `?status=${status}` : ''}`).then((d) => setList(d.messages)).catch((e) => toast(e.message, 'error')), [status, toast]);
  useEffect(() => { setList(null); load(); }, [load]);

  const setMsgStatus = async (m, s) => {
    try {
      const d = await api(`/admin/messages/${m._id}`, { method: 'PATCH', body: { status: s } });
      setList((l) => l.map((x) => (x._id === m._id ? d.message : x)));
    } catch (e) { toast(e.message, 'error'); }
  };
  const open = (m) => { setOpenId(openId === m._id ? null : m._id); if (m.status === 'New') setMsgStatus(m, 'Read'); };

  return (
    <div>
      <h1 className="text-4xl">Messages</h1>
      <p className="mt-1 text-sm text-stone">From the Contact page. Reply by email; the customer’s address is on each message.</p>
      <div className="mt-6 flex gap-2">{['', 'New', 'Read', 'Resolved'].map((s) => <button key={s || 'all'} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>{s || 'All'}</button>)}</div>
      <div className="mt-6 space-y-2">
        {!list ? <Spinner /> : list.map((m) => (
          <div key={m._id} className="bg-paper">
            <button className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left text-sm" onClick={() => open(m)} aria-expanded={openId === m._id}>
              {m.status === 'New' && <span className="h-2 w-2 rounded-full bg-ink" aria-label="New" />}
              <span className={m.status === 'New' ? 'font-medium' : ''}>{m.name}</span>
              <span className="flex-1 truncate text-stone">{m.subject}: {m.message}</span>
              <span className="text-xs text-stone">{dateTime(m.createdAt)}</span>
            </button>
            {openId === m._id && (
              <div className="border-t border-ink/10 p-4 text-sm">
                <p className="text-stone">{m.email}{m.phone ? `, ${m.phone}` : ''}{m.orderNumber ? `. Order ${m.orderNumber}` : ''}</p>
                <p className="mt-3 whitespace-pre-wrap">{m.message}</p>
                <div className="mt-4 flex gap-2">
                  <a className="btn btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>Reply by email</a>
                  {m.status !== 'Resolved' ? <button className="btn-outline btn-sm" onClick={() => setMsgStatus(m, 'Resolved')}>Mark resolved</button> : <button className="btn-outline btn-sm" onClick={() => setMsgStatus(m, 'Read')}>Reopen</button>}
                </div>
              </div>
            )}
          </div>
        ))}
        {list && !list.length && <p className="bg-paper p-10 text-center text-sm text-stone">No messages.</p>}
      </div>
    </div>
  );
}
