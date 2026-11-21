import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Field from '../components/Field';
import { check, EMAIL_RE, PHONE_RE } from '../lib/validators';
import usePageTitle from '../lib/usePageTitle';

const TOPICS = ['Order help', 'Returns and exchanges', 'Sizing advice', 'Payment or refund', 'Bulk or corporate order', 'Something else'];

export default function Contact() {
  usePageTitle('Contact us');
  const { user } = useAuth();
  const { store } = useSettings();
  const [v, setV] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', orderNumber: '', subject: TOPICS[0], message: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle');
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = check(v, {
      name: { required: true, label: 'Name', minLength: 2 },
      email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
      phone: { label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' },
      message: { required: true, label: 'Message', minLength: 10 },
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setState('loading');
    setFormError('');
    try {
      await api('/contact', { method: 'POST', body: v });
      setState('done');
    } catch (err) { setFormError(err.message); setErrors(err.details || {}); setState('idle'); }
  };

  return (
    <div className="container-x grid gap-14 py-14 sm:py-20 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-5xl">Contact us</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/80">We reply within one working day, Monday to Saturday. For order questions, include your order number so we can help faster.</p>
        <ul className="mt-10 space-y-5 text-sm">
          {store?.email && <li className="flex gap-3"><Mail size={18} strokeWidth={1.5} /><a href={`mailto:${store.email}`} className="underline underline-offset-2">{store.email}</a></li>}
          {store?.phone && <li className="flex gap-3"><Phone size={18} strokeWidth={1.5} /><span>{store.phone}<span className="block text-stone">Mon–Sat, 10am–7pm</span></span></li>}
          {store?.address && <li className="flex gap-3"><MapPin size={18} strokeWidth={1.5} /><span>{store.address}</span></li>}
        </ul>
      </div>
      {state === 'done' ? (
        <div className="self-start bg-mist/60 p-8">
          <h2 className="text-3xl">Message sent</h2>
          <p className="mt-3 text-sm text-ink/80">Thanks, {v.name.split(' ')[0]}. We’ll reply to {v.email} within one working day.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" name="name" autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
          <Field label="Email" name="email" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
          <Field label="Mobile (optional)" name="phone" inputMode="numeric" maxLength={10} value={v.phone} onChange={set('phone')} error={errors.phone} />
          <Field label="Order number (optional)" name="orderNumber" value={v.orderNumber} onChange={set('orderNumber')} placeholder="e.g. MF261109…" />
          <Field label="Topic" name="subject" as="select" value={v.subject} onChange={set('subject')} className="sm:col-span-2">
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </Field>
          <Field label="Message" name="message" as="textarea" rows={6} maxLength={3000} value={v.message} onChange={set('message')} error={errors.message} className="sm:col-span-2" />
          {formError && <p className="text-sm text-sale sm:col-span-2" role="alert">{formError}</p>}
          <button className="btn sm:col-span-2 sm:justify-self-start" disabled={state === 'loading'}>{state === 'loading' ? 'Sending…' : 'Send message'}</button>
        </form>
      )}
    </div>
  );
}
