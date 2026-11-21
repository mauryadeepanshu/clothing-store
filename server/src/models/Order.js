const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    size: { type: String, required: true },
    color: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }, // snapshot of server price at order time
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const ORDER_STATUSES = ['Pending Payment', 'Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'Order has no items'] },
    shippingAddress: {
      fullName: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['COD', 'RAZORPAY'], required: true },
    // Processing / Refund Processing are short-lived "claims" that stop two requests handling the same payment or refund.
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Paid', 'Failed', 'Refund Required', 'Refund Processing', 'Refunded', 'Partially Refunded', 'Voided'],
      default: 'Pending',
    },
    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'Placed' },
    statusHistory: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
    stockCommitted: { type: Boolean, default: false },
    couponReserved: { type: Boolean, default: false }, // a coupon use is held for this order
    processingSince: Date,
    refunds: [{
      refundId: String,
      amount: Number,
      status: { type: String, default: 'pending' }, // Razorpay: pending | processed | failed; 'manual' for UPI/cash refunds
      kind: { type: String, enum: ['order', 'return'], default: 'order' },
      returnId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRequest' },
      note: String,
      at: { type: Date, default: Date.now },
    }],
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 }, { sparse: true });
orderSchema.index({ paymentStatus: 1, status: 1 });

orderSchema.statics.STATUSES = ORDER_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
