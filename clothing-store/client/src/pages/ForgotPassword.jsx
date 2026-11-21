import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Field from '../components/Field';
import { EMAIL_RE } from '../lib/validators';
import usePageTitle from '../lib/usePageTitle';

export default function ForgotPassword() {
  usePageTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address'); return; }
    setBusy(true); setError('');
    try { const d = await api('/auth/forgot', { method: 'POST', body: { email }, auth: false }); setDone(d.message); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="container-x grid max-w-md py-16 sm:py-24">
      <h1 className="text-5xl">Forgot password</h1>
      {done ? (
        <>
          <p className="mt-4 text-sm leading-relaxed">{done} The link is valid for 30 minutes. Check your spam folder if it doesn’t arrive in a few minutes.</p>
          <Link to="/login" className="btn mt-8">Back to sign in</Link>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-stone">Enter your account email and we’ll send you a link to choose a new password.</p>
          <form onSubmit={submit} noValidate className="mt-10 space-y-5">
            <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <button className="btn w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
          <Link to="/login" className="btn-ghost mt-8">Back to sign in</Link>
        </>
      )}
    </div>
  );
}
