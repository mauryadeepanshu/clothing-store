const ApiError = require('./ApiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile numbers
const PIN_RE = /^\d{6}$/;

/**
 * Small schema validator.
 * rules: { field: { required, label, type, min, max, minLength, maxLength, pattern, enum, message } }
 * Collects every error and throws a 400 with a details map.
 */
function validate(data, rules) {
  const errors = {};
  for (const [field, r] of Object.entries(rules)) {
    let v = data?.[field];
    if (typeof v === 'string') v = v.trim();
    const name = r.label || field;
    if (v === undefined || v === null || v === '') {
      if (r.required) errors[field] = r.message || `${name} is required`;
      continue;
    }
    if (r.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) { errors[field] = `${name} must be a number`; continue; }
      if (r.min !== undefined && n < r.min) errors[field] = `${name} must be at least ${r.min}`;
      if (r.max !== undefined && n > r.max) errors[field] = `${name} must be at most ${r.max}`;
      continue;
    }
    if (r.type === 'array') { if (!Array.isArray(v)) errors[field] = `${name} must be a list`; continue; }
    if (r.type !== 'number' && typeof v !== 'string') { errors[field] = `${name} must be text`; continue; }
    if (typeof v === 'string') {
      if (r.minLength && v.length < r.minLength) errors[field] = `${name} must be at least ${r.minLength} characters`;
      if (r.maxLength && v.length > r.maxLength) errors[field] = `${name} must be at most ${r.maxLength} characters`;
      if (r.pattern && !r.pattern.test(v)) errors[field] = r.message || `${name} is invalid`;
    }
    if (r.enum && !r.enum.includes(v)) errors[field] = `${name} must be one of: ${r.enum.join(', ')}`;
  }
  if (Object.keys(errors).length) throw ApiError.badRequest(Object.values(errors)[0], errors);
}

const addressRules = {
  fullName: { required: true, label: 'Full name', minLength: 2, maxLength: 80 },
  phone: { required: true, label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' },
  line1: { required: true, label: 'Address line 1', minLength: 3, maxLength: 120 },
  line2: { label: 'Address line 2', maxLength: 120 },
  city: { required: true, label: 'City', maxLength: 60 },
  state: { required: true, label: 'State', maxLength: 60 },
  pincode: { required: true, label: 'PIN code', pattern: PIN_RE, message: 'Enter a valid 6-digit PIN code' },
};

const pickAddress = (a = {}) => ({
  fullName: String(a.fullName || '').trim(),
  phone: String(a.phone || '').trim(),
  line1: String(a.line1 || '').trim(),
  line2: String(a.line2 || '').trim(),
  city: String(a.city || '').trim(),
  state: String(a.state || '').trim(),
  pincode: String(a.pincode || '').trim(),
});

module.exports = { validate, EMAIL_RE, PHONE_RE, PIN_RE, addressRules, pickAddress };
