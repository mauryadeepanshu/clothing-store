const env = require('../config/env');
const SiteSettings = require('../models/SiteSettings');

/**
 * Business details and store rules. Values saved in Admin > Settings override the .env defaults.
 * Cached for 30 seconds; updateSettings() calls invalidate().
 */
const defaults = () => ({
  name: env.storeName,
  legalName: '',
  email: env.storeEmail,
  phone: env.storePhone,
  address: env.storeAddress,
  state: env.storeState,
  gstin: env.storeGstin,
  supportHours: '',
  grievanceName: '',
  grievanceEmail: '',
  freeShippingThreshold: env.freeShippingThreshold,
  shippingFee: env.shippingFee,
  returnWindowDays: 15,
  dispatchTime: '1–2 working days',
});

let cache = null;
let at = 0;

async function getStore() {
  if (cache && Date.now() - at < 30000) return cache;
  const doc = await SiteSettings.findOne({ key: 'site' }).lean().catch(() => null);
  const saved = doc?.data?.store || {};
  const merged = defaults();
  for (const [k, v] of Object.entries(saved)) if (v !== undefined && v !== null && v !== '') merged[k] = v;
  cache = merged;
  at = Date.now();
  return cache;
}

const invalidate = () => { cache = null; };

/** Fields a customer-facing page may show. */
const publicStore = (s) => ({
  name: s.name, legalName: s.legalName, email: s.email, phone: s.phone, address: s.address, state: s.state,
  gstin: s.gstin, supportHours: s.supportHours, grievanceName: s.grievanceName, grievanceEmail: s.grievanceEmail,
  freeShippingThreshold: s.freeShippingThreshold, shippingFee: s.shippingFee, returnWindowDays: s.returnWindowDays,
  dispatchTime: s.dispatchTime,
});

module.exports = { getStore, invalidate, publicStore, defaults };
