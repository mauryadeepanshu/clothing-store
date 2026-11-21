const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String, required: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
stockAlertSchema.index({ product: 1, size: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('StockAlert', stockAlertSchema);
