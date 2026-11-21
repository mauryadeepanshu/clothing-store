import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import { check, EMAIL_RE } from '../lib/validators';

export default function AdminLogin() {
  const { user, adminLogin, ready } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (ready && user?.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const found = check(v, { email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' }, password: { required: true, label: 'Password' } });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError('');
    try {
      await adminLogin(v.email, v.password);
      navigate('/admin', { replace: true });
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink p-4">
      <div className="w-full max-w-sm bg-paper p-8">
        <p className="font-display text-3xl tracking-wordmark">Modern</p>
        <h1 className="mt-6 font-sans text-xl">Store admin</h1>
        <p className="mt-1 text-sm text-stone">Sign in with an admin account.</p>
        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          <Field label="Email" name="email" type="email" autoComplete="username" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} />
          <Field label="Password" name="password" type="password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} />
          {formError && <p className="text-sm text-sale" role="alert">{formError}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <Link to="/" className="btn-ghost mt-6">Back to the store</Link>
      </div>
    </div>
  );
}
