import { useState } from 'react';
import { api, tokenStore } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Field from '../../components/Field';
import { check, PHONE_RE } from '../../lib/validators';
import { date } from '../../lib/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '' });
  const [pErr, setPErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErr, setPwErr] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    const found = check(p, { name: { required: true, label: 'Name', minLength: 2 }, phone: { label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' } });
    setPErr(found);
    if (Object.keys(found).length) return;
    setBusy('profile');
    try {
      const d = await api('/users/profile', { method: 'PUT', body: p });
      setUser(d.user);
      toast('Profile saved');
    } catch (err) { setPErr(err.details || {}); toast(err.message, 'error'); } finally { setBusy(''); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const found = check(pw, {
      currentPassword: { required: true, label: 'Current password' },
      newPassword: { required: true, label: 'New password', minLength: 8 },
      confirm: { required: true, label: 'Confirm password', match: 'newPassword', message: 'Passwords do not match' },
    });
    setPwErr(found);
    if (Object.keys(found).length) return;
    setBusy('pw');
    try {
      const d = await api('/users/password', { method: 'PUT', body: pw });
      if (d.token) tokenStore.set(d.token); // other devices are signed out; this one keeps working
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password updated. Other devices have been signed out.');
    } catch (err) { setPwErr({ currentPassword: err.message }); } finally { setBusy(''); }
  };

  return (
    <div className="grid gap-14 xl:grid-cols-2">
      <section>
        <h2 className="font-sans text-lg">Personal details</h2>
        <p className="mt-1 text-sm text-stone">{user.email}. Member since {date(user.createdAt)}.</p>
        <form onSubmit={saveProfile} noValidate className="mt-6 max-w-md space-y-5">
          <Field label="Full name" name="name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} error={pErr.name} />
          <Field label="Mobile number" name="phone" inputMode="numeric" maxLength={10} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} error={pErr.phone} />
          <button className="btn" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
        </form>
      </section>
      <section>
        <h2 className="font-sans text-lg">Change password</h2>
        <form onSubmit={savePassword} noValidate className="mt-6 max-w-md space-y-5">
          <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErr.currentPassword} />
          <Field label="New password" name="newPassword" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErr.newPassword} />
          <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErr.confirm} />
          <button className="btn" disabled={busy === 'pw'}>{busy === 'pw' ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </div>
  );
}
