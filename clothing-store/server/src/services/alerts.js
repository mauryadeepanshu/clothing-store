const StockAlert = require('../models/StockAlert');
const mailer = require('./email');

/** After a stock change, email everyone waiting for a size that went from 0 to in-stock. */
async function notifyRestock(product, previousSizes) {
  const before = new Map((previousSizes || []).map((s) => [s.name, s.stock]));
  const restocked = product.sizes.filter((s) => s.stock > 0 && (before.get(s.name) ?? 0) === 0).map((s) => s.name);
  if (!restocked.length || !product.isActive) return 0;
  const alerts = await StockAlert.find({ product: product._id, size: { $in: restocked }, notifiedAt: null });
  for (const a of alerts) mailer.backInStock(a.email, product, a.size);
  if (alerts.length) await StockAlert.updateMany({ _id: { $in: alerts.map((a) => a._id) } }, { $set: { notifiedAt: new Date() } });
  return alerts.length;
}

module.exports = { notifyRestock };
