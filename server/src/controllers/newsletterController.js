const Subscriber = require('../models/Subscriber');
const asyncHandler = require('../utils/asyncHandler');
const { validate, EMAIL_RE } = require('../utils/validate');

exports.subscribe = asyncHandler(async (req, res) => {
  validate(req.body, { email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' } });
  await Subscriber.updateOne({ email: req.body.email.toLowerCase().trim() }, { $setOnInsert: { email: req.body.email.toLowerCase().trim() } }, { upsert: true });
  res.status(201).json({ message: 'Subscribed' });
});
