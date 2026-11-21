import { useState } from 'react';
import { api } from '../lib/api';
import { EMAIL_RE } from '../lib/validators';

export default function NewsletterForm({ dark = false }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setState({ status: 'error', message: 'Enter a valid email address' });
    setState({ status: 'loading', message: '' });
    try {
      await api('/newsletter', { method: 'POST', body: { email }, auth: false });
      setState({ status: 'done', message: 'You’re on the list. Watch your inbox for new drops.' });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  const border = dark ? 'border-paper/40 focus-within:border-paper' : 'border-ink/30 focus-within:border-ink';
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <div className={`flex border-b ${border} transition-colors`}>
        <label htmlFor={`nl-${dark}`} className="sr-only">Email address</label>
        <input
          id={`nl-${dark}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-current placeholder:opacity-60"
        />
        <button type="submit" disabled={state.status === 'loading'} className="py-3 pl-4 text-sm font-medium">
          {state.status === 'loading' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {state.message && (
        <p className={`mt-2 text-xs ${state.status === 'error' ? (dark ? 'text-sand' : 'text-sale') : ''}`} role="status">{state.message}</p>
      )}
    </form>
  );
}
