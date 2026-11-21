const env = require('../config/env');

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Builds a GST tax invoice for an order. Prices in this store are GST-inclusive, so tax is
 * extracted from each line after spreading any coupon discount proportionally across lines.
 * Apparel rate depends on the per-piece selling value (GST_THRESHOLD / GST_RATE_LOW / GST_RATE_HIGH).
 */
function buildInvoice(order, hsnByProduct = {}, store = {}) {
  // Without a GSTIN the seller isn't GST-registered: issue a plain invoice with no tax breakdown.
  const registered = Boolean(store.gstin);
  const sellerState = store.state || env.storeState;
  const interState = String(order.shippingAddress.state || '').trim().toLowerCase() !== String(sellerState).trim().toLowerCase();
  const lines = order.items.map((it) => {
    const share = order.subtotal > 0 ? (it.lineTotal / order.subtotal) * order.discount : 0;
    const net = r2(it.lineTotal - share);
    const perPiece = net / it.quantity;
    const rate = perPiece <= env.gstThreshold ? env.gstRateLow : env.gstRateHigh;
    const taxable = r2(net / (1 + rate / 100));
    const tax = r2(net - taxable);
    return {
      description: `${it.name} (Size ${it.size}${it.color ? `, ${it.color}` : ''})`,
      hsn: hsnByProduct[String(it.product)] || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: r2(share),
      taxable,
      rate,
      cgst: interState ? 0 : r2(tax / 2),
      sgst: interState ? 0 : r2(tax - r2(tax / 2)),
      igst: interState ? tax : 0,
      total: net,
    };
  });
  if (order.shippingFee > 0) {
    const rate = env.shippingGstRate;
    const taxable = r2(order.shippingFee / (1 + rate / 100));
    const tax = r2(order.shippingFee - taxable);
    lines.push({
      description: 'Shipping charges', hsn: '9965', quantity: 1, unitPrice: order.shippingFee, discount: 0, taxable, rate,
      cgst: interState ? 0 : r2(tax / 2), sgst: interState ? 0 : r2(tax - r2(tax / 2)), igst: interState ? tax : 0, total: order.shippingFee,
    });
  }
  const sum = (k) => r2(lines.reduce((s, l) => s + l[k], 0));
  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    invoiceDate: order.createdAt,
    taxInvoice: registered,
    seller: {
      name: store.legalName || store.name || env.storeName, tradeName: store.name, address: store.address, state: sellerState,
      gstin: store.gstin, email: store.email, phone: store.phone,
    },
    interState,
    lines,
    totals: { taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), total: r2(order.total) },
  };
}

module.exports = { buildInvoice };
