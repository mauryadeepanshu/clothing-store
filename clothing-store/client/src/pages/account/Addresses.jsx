import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AddressForm from '../../components/AddressForm';

export default function Addresses() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // 'new' | address id | null
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const save = async (values) => {
    setBusy(true);
    setServerErrors({});
    try {
      const d = editing === 'new'
        ? await api('/users/addresses', { method: 'POST', body: values })
        : await api(`/users/addresses/${editing}`, { method: 'PUT', body: values });
      setUser({ ...user, addresses: d.addresses });
      setEditing(null);
      toast('Address saved');
    } catch (e) { setServerErrors(e.details); toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const d = await api(`/users/addresses/${id}`, { method: 'DELETE' });
      setUser({ ...user, addresses: d.addresses });
      toast('Address deleted');
    } catch (e) { toast(e.message, 'error'); }
  };

  const makeDefault = async (a) => {
    try {
      const d = await api(`/users/addresses/${a._id}`, { method: 'PUT', body: { ...a, isDefault: true } });
      setUser({ ...user, addresses: d.addresses });
    } catch (e) { toast(e.message, 'error'); }
  };

  if (editing) {
    const initial = editing === 'new' ? undefined : user.addresses.find((a) => a._id === editing);
    return (
      <div className="max-w-2xl">
        <h2 className="mb-6 font-sans text-lg">{editing === 'new' ? 'Add an address' : 'Edit address'}</h2>
        <AddressForm initial={initial} onSubmit={save} busy={busy} serverErrors={serverErrors} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {user.addresses.map((a) => (
          <div key={a._id} className={`border p-5 text-sm ${a.isDefault ? 'border-ink' : 'border-ink/15'}`}>
            <p className="font-medium">{a.label}{a.isDefault && <span className="ml-2 text-xs font-normal text-stone">Default</span>}</p>
            <p className="mt-2">{a.fullName}, {a.phone}</p>
            <p className="text-stone">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}</p>
            <div className="mt-4 flex gap-4">
              <button className="btn-ghost" onClick={() => setEditing(a._id)}>Edit</button>
              <button className="btn-ghost" onClick={() => remove(a._id)}>Delete</button>
              {!a.isDefault && <button className="btn-ghost" onClick={() => makeDefault(a)}>Make default</button>}
            </div>
          </div>
        ))}
        <button onClick={() => setEditing('new')} disabled={user.addresses.length >= 10} className="flex min-h-[160px] items-center justify-center border border-dashed border-ink/30 text-sm hover:border-ink disabled:opacity-50">
          Add a new address
        </button>
      </div>
    </div>
  );
}
