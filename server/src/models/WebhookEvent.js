const mongoose = require('mongoose');

// One document per Razorpay webhook event id. The unique index makes duplicate deliveries a no-op.
const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: String,
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // auto-delete after 30 days
  },
  { versionKey: false }
);

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
