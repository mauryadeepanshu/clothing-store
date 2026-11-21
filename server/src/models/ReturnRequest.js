const mongoose = require('mongoose');

const RETURN_STATUSES = ['Requested', 'Approved', 'Rejected', 'Picked Up', 'Refund Processing', 'Refunded', 'Exchanged'];

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    image: String,
    size: { type: String, required: true },
    color: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: Number,
    exchangeSize: { type: String, default: '' },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['return', 'exchange'], required: true },
    items: [returnItemSchema],
    reason: { type: String, required: true },
    comment: { type: String, maxlength: 500, default: '' },
    refundUpi: { type: String, default: '' }, // for cash-on-delivery refunds
    refundAmount: { type: Number, default: 0 },
    status: { type: String, enum: RETURN_STATUSES, default: 'Requested' },
    history: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
    refundId: { type: String, default: '' },
    refundMethod: { type: String, default: '' }, // razorpay | manual
    exchangeStockReserved: { type: Boolean, default: false },
    restocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);
returnSchema.index({ user: 1, createdAt: -1 });
returnSchema.index({ order: 1 });
returnSchema.index({ status: 1, createdAt: -1 });
returnSchema.statics.STATUSES = RETURN_STATUSES;

module.exports = mongoose.model('ReturnRequest', returnSchema);
