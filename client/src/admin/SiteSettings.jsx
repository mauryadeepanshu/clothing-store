import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import Field from '../components/Field';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

/** Homepage banner manager: announcement bar, hero and promotional banner. */
export default function SiteSettings() {
  const toast = useToast();
  const { settings, store, setSettings, setStore } = useSettings();
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (settings && store && !v) setV({ ...JSON.parse(JSON.stringify(settings)), store: { ...store } }); }, [settings, store, v]);
  if (!v) return <Spinner />;

  const set = (section, key) => (e) => setV({ ...v, [section]: { ...v[section], [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const d = await api('/admin/settings', { method: 'PUT', body: v });
      setSettings(d.settings);
      setStore(d.store);
      setV({ ...d.settings, store: d.store });
      toast('Settings saved');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} noValidate className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl">Store and homepage</h1>
        <p className="mt-1 text-sm text-stone">Changes go live as soon as you save. Links can be a page on this site (starting with /) or a full https:// address.</p>
      </div>

      <section className="space-y-4 bg-paper p-6">
        <h2 className="font-sans text-base font-medium">Business details</h2>
        <p className="text-sm text-stone">Shown on the Contact page, policies, invoices and emails. Leave anything you don’t have yet blank; it simply won’t be shown. Indian e-commerce rules require a grievance officer’s name and contact.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" name="st-name" value={v.store.name || ''} onChange={set('store', 'name')} />
          <Field label="Registered legal name (for invoices)" name="st-legal" value={v.store.legalName || ''} onChange={set('store', 'legalName')} />
          <Field label="Support email" name="st-email" type="email" value={v.store.email || ''} onChange={set('store', 'email')} />
          <Field label="Support phone" name="st-phone" value={v.store.phone || ''} onChange={set('store', 'phone')} />
          <Field label="Support hours" name="st-hours" value={v.store.supportHours || ''} onChange={set('store', 'supportHours')} placeholder="e.g. Mon–Sat, 10am–7pm" />
          <Field label="State of registration" name="st-state" value={v.store.state || ''} onChange={set('store', 'state')} />
          <Field label="Registered address" name="st-address" as="textarea" rows={2} value={v.store.address || ''} onChange={set('store', 'address')} className="sm:col-span-2" />
          <Field label="GSTIN (leave blank if not registered)" name="st-gstin" maxLength={15} value={v.store.gstin || ''} onChange={(e) => setV({ ...v, store: { ...v.store, gstin: e.target.value.toUpperCase() } })} placeholder="15 characters" />
          <div />
          <Field label="Grievance officer name" name="st-gname" value={v.store.grievanceName || ''} onChange={set('store', 'grievanceName')} />
          <Field label="Grievance officer email" name="st-gemail" type="email" value={v.store.grievanceEmail || ''} onChange={set('store', 'grievanceEmail')} />
        </div>
      </section>

      <section className="space-y-4 bg-paper p-6">
        <h2 className="font-sans text-base font-medium">Shipping and returns</h2>
        <p className="text-sm text-stone">Used in checkout totals, the return window, and the policy pages.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Free shipping on orders from (₹)" name="st-free" type="number" min="0" value={v.store.freeShippingThreshold ?? ''} onChange={set('store', 'freeShippingThreshold')} />
          <Field label="Shipping fee below that (₹)" name="st-fee" type="number" min="0" value={v.store.shippingFee ?? ''} onChange={set('store', 'shippingFee')} />
          <Field label="Return window (days after delivery, 0 = no returns)" name="st-ret" type="number" min="0" max="90" value={v.store.returnWindowDays ?? ''} onChange={set('store', 'returnWindowDays')} />
          <Field label="Usual dispatch time" name="st-dispatch" value={v.store.dispatchTime || ''} onChange={set('store', 'dispatchTime')} placeholder="e.g. 1–2 working days" />
        </div>
      </section>

      <section className="space-y-4 bg-paper p-6">
        <div className="flex items-center justify-between"><h2 className="font-sans text-base font-medium">Announcement bar</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v.announcement.enabled} onChange={set('announcement', 'enabled')} /> Show</label></div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Text" name="ann-text" maxLength={140} value={v.announcement.text} onChange={set('announcement', 'text')} />
          <Field label="Link (optional)" name="ann-link" value={v.announcement.link} onChange={set('announcement', 'link')} placeholder="/shop?tag=sale" />
        </div>
        {v.announcement.enabled && v.announcement.text && <p className="bg-ink px-4 py-2 text-center text-xs text-paper">{v.announcement.text}</p>}
      </section>

      <section className="space-y-4 bg-paper p-6">
        <h2 className="font-sans text-base font-medium">Hero</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <Field label="Image URL" name="hero-image" value={v.hero.image} onChange={set('hero', 'image')} placeholder="https://…" />
            <Field label="Image description (for screen readers)" name="hero-alt" value={v.hero.imageAlt} onChange={set('hero', 'imageAlt')} />
          </div>
          <Img src={v.hero.image} alt="Hero preview" className="aspect-[4/3] w-full object-cover" />
        </div>
        <Field label="Small line above the headline" name="hero-eyebrow" value={v.hero.eyebrow} onChange={set('hero', 'eyebrow')} />
        <Field label="Headline" name="hero-headline" as="textarea" rows={2} value={v.hero.headline} onChange={set('hero', 'headline')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main button text" name="hero-pl" value={v.hero.primaryLabel} onChange={set('hero', 'primaryLabel')} />
          <Field label="Main button link" name="hero-pk" value={v.hero.primaryLink} onChange={set('hero', 'primaryLink')} />
          <Field label="Second button text (optional)" name="hero-sl" value={v.hero.secondaryLabel} onChange={set('hero', 'secondaryLabel')} />
          <Field label="Second button link" name="hero-sk" value={v.hero.secondaryLink} onChange={set('hero', 'secondaryLink')} />
        </div>
      </section>

      <section className="space-y-4 bg-paper p-6">
        <div className="flex items-center justify-between"><h2 className="font-sans text-base font-medium">Promotional banner</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v.promo.enabled} onChange={set('promo', 'enabled')} /> Show</label></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <Field label="Image URL" name="promo-image" value={v.promo.image} onChange={set('promo', 'image')} />
            <Field label="Image description" name="promo-alt" value={v.promo.imageAlt} onChange={set('promo', 'imageAlt')} />
          </div>
          <Img src={v.promo.image} alt="Promo preview" className="aspect-[4/3] w-full object-cover" />
        </div>
        <Field label="Small line above the headline" name="promo-eyebrow" value={v.promo.eyebrow} onChange={set('promo', 'eyebrow')} />
        <Field label="Headline" name="promo-headline" value={v.promo.headline} onChange={set('promo', 'headline')} />
        <Field label="Body text" name="promo-body" as="textarea" rows={2} value={v.promo.body} onChange={set('promo', 'body')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" name="promo-cl" value={v.promo.ctaLabel} onChange={set('promo', 'ctaLabel')} />
          <Field label="Button link" name="promo-ck" value={v.promo.ctaLink} onChange={set('promo', 'ctaLink')} />
        </div>
      </section>

      {error && <p className="text-sm text-sale" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  );
}
