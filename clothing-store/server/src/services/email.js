/* Transactional email. With SMTP configured, mail is sent via nodemailer; otherwise it is printed
   to the server console so every flow (including password reset links) still works in development. */
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
const smtpReady = () => Boolean(env.smtp.host);
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 })}`;
const link = (path) => `${env.clientUrl}${path}`;

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#FAFAF8;font-family:Helvetica,Arial,sans-serif;color:#000">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff">
    <tr><td style="padding:28px 32px;border-bottom:1px solid #EDEAE4;font-family:Georgia,serif;font-size:26px;letter-spacing:-1px">Modern</td></tr>
    <tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:24px">${esc(title)}</h1>${bodyHtml}</td></tr>
    <tr><td style="padding:20px 32px;background:#EDEAE4;font-size:12px;color:#8C857B">${esc(env.storeName)}${env.storeEmail ? ` · ${esc(env.storeEmail)}` : ''}</td></tr>
  </table></td></tr></table></body></html>`;
}
const button = (href, label) => `<p style="margin:24px 0"><a href="${href}" style="background:#000;color:#fff;padding:12px 22px;text-decoration:none;font-size:14px">${esc(label)}</a></p>`;
const p = (t) => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${t}</p>`;

function itemsTable(items, withPrices = true) {
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EDEAE4;font-size:14px">${esc(i.name)}<br><span style="color:#8C857B;font-size:12px">Size ${esc(i.size)}${i.color ? `, ${esc(i.color)}` : ''} × ${i.quantity}${i.exchangeSize ? ` → size ${esc(i.exchangeSize)}` : ''}</span></td>${withPrices ? `<td align="right" style="padding:8px 0;border-bottom:1px solid #EDEAE4;font-size:14px">${inr(i.lineTotal ?? i.unitPrice * i.quantity)}</td>` : ''}</tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

async function send({ to, subject, html, text }) {
  if (!to) return;
  if (!smtpReady()) {
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text}\n`);
    return;
  }
  try {
    await getTransport().sendMail({ from: env.mailFrom, to, subject, html, text });
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}: ${err.message}`);
  }
}
// Emails never block or fail a request.
const fire = (promise) => { promise.catch((e) => console.error('[email]', e.message)); };

const STATUS_COPY = {
  Confirmed: 'Your order is confirmed and being packed.',
  Shipped: 'Your order is on its way.',
  'Out for Delivery': 'Your order is out for delivery today.',
  Delivered: 'Your order has been delivered. We hope you love it. You can request a return or exchange within 15 days.',
  Cancelled: 'Your order has been cancelled.',
};

module.exports = {
  smtpReady,
  orderPlaced(order, user) {
    const url = link(`/account/orders/${order._id}`);
    const pay = order.paymentMethod === 'COD' ? `Please keep ${inr(order.total)} ready for cash on delivery.` : `We've received your payment of ${inr(order.total)}.`;
    fire(send({
      to: user.email,
      subject: `Order ${order.orderNumber} confirmed`,
      text: `Thanks for your order ${order.orderNumber}. ${pay} Track it: ${url}`,
      html: layout(`Thank you, ${user.name.split(' ')[0]}`, p(`Your order <strong>${esc(order.orderNumber)}</strong> is placed. ${pay}`) + itemsTable(order.items)
        + p(`<br>Subtotal ${inr(order.subtotal)}${order.discount ? `<br>Coupon ${esc(order.couponCode)} −${inr(order.discount)}` : ''}<br>Shipping ${order.shippingFee ? inr(order.shippingFee) : 'Free'}<br><strong>Total ${inr(order.total)}</strong>`)
        + button(url, 'Track your order')),
    }));
  },
  orderStatus(order, user, note) {
    const copy = STATUS_COPY[order.status];
    if (!copy) return;
    const url = link(`/account/orders/${order._id}`);
    fire(send({
      to: user.email,
      subject: `Order ${order.orderNumber}: ${order.status}`,
      text: `${copy}${note ? ` ${note}` : ''} ${url}`,
      html: layout(order.status, p(copy) + (note ? p(esc(note)) : '') + itemsTable(order.items, false) + button(url, 'View order')),
    }));
  },
  passwordReset(user, token) {
    const url = link(`/reset-password/${token}`);
    fire(send({
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password (link valid for 30 minutes): ${url}`,
      html: layout('Reset your password', p('We received a request to reset your password. This link is valid for 30 minutes.') + button(url, 'Choose a new password') + p('If you didn’t ask for this, you can ignore this email; your password won’t change.')),
    }));
  },
  welcome(user) {
    fire(send({
      to: user.email,
      subject: `Welcome to ${env.storeName}`,
      text: `Welcome, ${user.name}. Use code WELCOME10 for 10% off your first order: ${link('/shop')}`,
      html: layout(`Welcome, ${user.name.split(' ')[0]}`, p('Your account is ready. Use code <strong>WELCOME10</strong> for 10% off your first order over Rs. 999.') + button(link('/shop'), 'Start shopping')),
    }));
  },
  returnUpdate(ret, user) {
    const copy = {
      Requested: `We've received your ${ret.type} request and will review it within 2 working days.`,
      Approved: `Your ${ret.type} request is approved. Our courier partner will collect the item${ret.items.length > 1 ? 's' : ''} in the next 2–3 days. Please pack them with tags attached.`,
      Rejected: `Your ${ret.type} request could not be approved.`,
      'Picked Up': 'We have collected your items and are checking them.',
      Refunded: `Your refund of ${inr(ret.refundAmount)} has been issued. It usually reaches your account in 5–7 working days.`,
      Exchanged: 'Your replacement is on its way.',
    }[ret.status];
    const last = ret.history[ret.history.length - 1];
    fire(send({
      to: user.email,
      subject: `${ret.type === 'return' ? 'Return' : 'Exchange'} ${ret.returnNumber}: ${ret.status}`,
      text: `${copy}${last?.note ? ` ${last.note}` : ''}`,
      html: layout(`${ret.type === 'return' ? 'Return' : 'Exchange'} ${ret.status.toLowerCase()}`, p(copy) + (last?.note ? p(esc(last.note)) : '') + itemsTable(ret.items, false) + button(link('/account/returns'), 'View your returns')),
    }));
  },
  refundIssued(user, order, amount) {
    fire(send({
      to: user.email,
      subject: `Refund for order ${order.orderNumber}`,
      text: `We've refunded ${inr(amount)} for order ${order.orderNumber}. It usually reaches your account in 5–7 working days.`,
      html: layout('Your refund is on its way', p(`We've refunded <strong>${inr(amount)}</strong> for order ${esc(order.orderNumber)} to your original payment method. Banks usually take 5–7 working days to show it.`) + button(link(`/account/orders/${order._id}`), 'View order')),
    }));
  },
  backInStock(email, product, size) {
    const url = link(`/product/${product.slug}`);
    fire(send({
      to: email,
      subject: `${product.name} is back in size ${size}`,
      text: `${product.name} is back in stock in size ${size}: ${url}`,
      html: layout('It’s back', p(`<strong>${esc(product.name)}</strong> is back in stock in size <strong>${esc(size)}</strong>. Popular sizes sell out quickly.`) + button(url, 'Shop it now')),
    }));
  },
  contactToStore(msg) {
    const to = env.storeEmail || env.smtp.user;
    fire(send({
      to,
      subject: `[Contact] ${msg.subject} — ${msg.name}`,
      text: `${msg.name} <${msg.email}> ${msg.phone || ''} ${msg.orderNumber ? `Order ${msg.orderNumber}` : ''}\n\n${msg.message}`,
      html: layout('New customer message', p(`<strong>${esc(msg.name)}</strong> &lt;${esc(msg.email)}&gt; ${esc(msg.phone)}${msg.orderNumber ? `<br>Order ${esc(msg.orderNumber)}` : ''}`) + p(`<strong>${esc(msg.subject)}</strong>`) + p(esc(msg.message).replace(/\n/g, '<br>'))),
    }));
  },
};
