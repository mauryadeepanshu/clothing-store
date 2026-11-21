import { useState } from 'react';
import Field from './Field';
import { addressRules, check } from '../lib/validators';
import { INDIAN_STATES } from '../lib/format';

export const EMPTY_ADDRESS = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

/** Controlled-by-submit address form. onSubmit receives clean values; serverErrors maps field -> message. */
export default function AddressForm({ initial = EMPTY_ADDRESS, onSubmit, submitLabel = 'Save address', busy, serverErrors = {}, showLabel = true, showDefault = true, onCancel }) {
  const [v, setV] = useState({ ...EMPTY_ADDRESS, ...initial });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const err = (k) => errors[k] || serverErrors[k];

  const submit = (e) => {
    e.preventDefault();
    const found = check(v, addressRules);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit({ ...v, phone: v.phone.trim(), pincode: v.pincode.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {showLabel && (
        <Field label="Label" name="label" value={v.label} onChange={set('label')} placeholder="Home, Work…" maxLength={30} className="sm:col-span-2" />
      )}
      <Field label="Full name" name="fullName" autoComplete="name" value={v.fullName} onChange={set('fullName')} error={err('fullName')} />
      <Field label="Mobile number" name="phone" autoComplete="tel-national" inputMode="numeric" maxLength={10} value={v.phone} onChange={set('phone')} error={err('phone')} />
      <Field label="Flat, house, building" name="line1" autoComplete="address-line1" value={v.line1} onChange={set('line1')} error={err('line1')} className="sm:col-span-2" />
      <Field label="Area, street, landmark (optional)" name="line2" autoComplete="address-line2" value={v.line2} onChange={set('line2')} className="sm:col-span-2" />
      <Field label="City" name="city" autoComplete="address-level2" value={v.city} onChange={set('city')} error={err('city')} />
      <Field label="State" name="state" as="select" value={v.state} onChange={set('state')} error={err('state')}>
        <option value="">Select state</option>
        {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
      </Field>
      <Field label="PIN code" name="pincode" autoComplete="postal-code" inputMode="numeric" maxLength={6} value={v.pincode} onChange={set('pincode')} error={err('pincode')} />
      {showDefault && (
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" checked={v.isDefault} onChange={set('isDefault')} className="h-4 w-4 accent-ink" /> Make this my default address
        </label>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
