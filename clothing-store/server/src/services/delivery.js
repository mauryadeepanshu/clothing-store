const env = require('../config/env');

/**
 * Delivery estimate from PIN codes. This is a zone-based rule of thumb (no courier API):
 * same city 1–2 days, same state region 2–3, same postal zone 3–4, neighbouring zones 4–6, rest of India 5–7,
 * remote areas (North-East, J&K, Ladakh, Andaman, Lakshadweep) 7–10. Army postal (9xxxxx) is not serviceable.
 * Swap estimateDelivery() for a courier serviceability API (e.g. Shiprocket) when you have one.
 */
const NEIGHBOURS = { 1: [2, 3], 2: [1, 8], 3: [1, 4], 4: [3, 5], 5: [4, 6], 6: [5], 7: [8], 8: [2, 7] };
const REMOTE = [/^1[89]/, /^19/, /^7[89]/, /^744/, /^682555/, /^194/];

function addWorkingDays(from, days) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // no Sunday deliveries
  }
  return d;
}

function estimateDelivery(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { valid: false, message: 'Enter a valid 6-digit PIN code' };
  if (pin[0] === '9') return { valid: true, serviceable: false, message: 'We can’t deliver to army postal PIN codes yet' };
  const w = env.warehousePincode;
  let range;
  if (REMOTE.some((re) => re.test(pin))) range = [7, 10];
  else if (pin.slice(0, 3) === w.slice(0, 3)) range = [1, 2];
  else if (pin.slice(0, 2) === w.slice(0, 2)) range = [2, 3];
  else if (pin[0] === w[0]) range = [3, 4];
  else if ((NEIGHBOURS[w[0]] || []).includes(Number(pin[0]))) range = [4, 6];
  else range = [5, 7];
  // +1 day for orders placed after 2pm
  const start = new Date();
  const dispatchLag = start.getHours() >= 14 ? 1 : 0;
  return {
    valid: true,
    serviceable: true,
    pincode: pin,
    minDays: range[0] + dispatchLag,
    maxDays: range[1] + dispatchLag,
    from: addWorkingDays(start, range[0] + dispatchLag),
    to: addWorkingDays(start, range[1] + dispatchLag),
    cod: true,
  };
}

module.exports = { estimateDelivery };
