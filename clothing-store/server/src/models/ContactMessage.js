const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    orderNumber: { type: String, default: '' },
    subject: { type: String, required: true },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ['New', 'Read', 'Resolved'], default: 'New' },
  },
  { timestamps: true }
);

contactSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactSchema);
