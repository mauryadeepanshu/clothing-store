import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, tokenStore } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import { check } from '../lib/validators';
import usePageTitle from '../lib/usePageTitle';

export default function ResetPassword() {
  usePageTitle('Choose a new password');
  const { token } = useParams();
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [v, setV] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = check(v, {
      password: { required: true, label: 'New password', minLength: 8 },
      confirm: { required: true, label: 'Confirm password', match: 'password', message: 'Passwords do not match' },
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true); setFormError('');
    try {
      const d = await api('/auth/reset', { method: 'POST', body: { token, password: v.password }, auth: false });
      tokenStore.set(d.token);
      setUser(d.user);
      toast('Password updated. You’re signed in.');
      navigate(d.user.role === 'admin' ? '/admin' : '/account', { replace: true });
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="container-x grid max-w-md py-16 sm:py-24">
      <h1 className="text-5xl">New password</h1>
      <form onSubmit={submit} noValidate className="mt-10 space-y-5">
        <Field label="New password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} error={errors.confirm} />
        {formError && <p className="text-sm text-sale" role="alert">{formError} {formError.includes('expired') && <Link to="/forgot-password" className="underline">Request a new link</Link>}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Save password and sign in'}</button>
      </form>
    </div>
  );
}
