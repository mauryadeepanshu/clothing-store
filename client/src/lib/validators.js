export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;
export const PIN_RE = /^\d{6}$/;

/** Returns { field: message } for every failing rule. Mirrors the server validator. */
export function check(values, rules) {
  const errors = {};
  for (const [field, r] of Object.entries(rules)) {
    const v = typeof values[field] === 'string' ? values[field].trim() : values[field];
    const name = r.label || field;
    if (v === undefined || v === null || v === '') {
      if (r.required) errors[field] = `${name} is required`;
      continue;
    }
    if (r.minLength && String(v).length < r.minLength) errors[field] = `${name} must be at least ${r.minLength} characters`;
    if (r.pattern && !r.pattern.test(String(v))) errors[field] = r.message || `${name} is invalid`;
    if (r.min !== undefined && Number(v) < r.min) errors[field] = `${name} must be at least ${r.min}`;
    if (r.match && v !== values[r.match]) errors[field] = r.message || 'Values do not match';
  }
  return errors;
}

export const addressRules = {
  fullName: { required: true, label: 'Full name', minLength: 2 },
  phone: { required: true, label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' },
  line1: { required: true, label: 'Address', minLength: 3 },
  city: { required: true, label: 'City' },
  state: { required: true, label: 'State' },
  pincode: { required: true, label: 'PIN code', pattern: PIN_RE, message: 'Enter a valid 6-digit PIN code' },
};
