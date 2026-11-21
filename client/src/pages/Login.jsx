import usePageTitle from '../lib/usePageTitle';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import { check, EMAIL_RE } from '../lib/validators';

export default function Login() {
  usePageTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [v, setV] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = check(v, {
      email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
      password: { required: true, label: 'Password' },
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError('');
    try {
      const user = await login(v.email, v.password);
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x grid max-w-md py-16 sm:py-24">
      <h1 className="text-5xl">Sign in</h1>
      <p className="mt-3 text-sm text-stone">Track orders, save addresses and keep your wishlist in sync.</p>
      <form onSubmit={submit} noValidate className="mt-10 space-y-5">
        <Field label="Email" name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} />
        <div className="-mt-2 text-right"><Link to="/forgot-password" className="text-xs text-stone underline underline-offset-2 hover:text-ink">Forgot password?</Link></div>
        {formError && <p className="text-sm text-sale" role="alert">{formError}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-8 text-sm">New here? <Link to="/register" state={location.state} className="underline underline-offset-4">Create an account</Link></p>
    </div>
  );
}
