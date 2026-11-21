import usePageTitle from '../lib/usePageTitle';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import { check, EMAIL_RE } from '../lib/validators';

export default function Register() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [v, setV] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = check(v, {
      name: { required: true, label: 'Name', minLength: 2 },
      email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
      password: { required: true, label: 'Password', minLength: 8 },
      confirm: { required: true, label: 'Confirm password', match: 'password', message: 'Passwords do not match' },
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError('');
    try {
      await register(v.name, v.email, v.password);
      navigate(location.state?.from || '/account', { replace: true });
    } catch (err) {
      setFormError(err.message);
      if (err.details) setErrors(err.details);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x grid max-w-md py-16 sm:py-24">
      <h1 className="text-5xl">Create account</h1>
      <p className="mt-3 text-sm text-stone">Use code WELCOME10 for 10% off your first order.</p>
      <form onSubmit={submit} noValidate className="mt-10 space-y-5">
        <Field label="Full name" name="name" autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={v.password} onChange={set('password')} error={errors.password} placeholder="At least 8 characters" />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} error={errors.confirm} />
        {formError && <p className="text-sm text-sale" role="alert">{formError}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-8 text-sm">Already have an account? <Link to="/login" state={location.state} className="underline underline-offset-4">Sign in</Link></p>
    </div>
  );
}
