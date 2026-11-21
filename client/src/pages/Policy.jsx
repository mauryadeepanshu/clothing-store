import { Link, useParams } from 'react-router-dom';
import { useStore, rupees } from '../context/SettingsContext';
import usePageTitle from '../lib/usePageTitle';
import NotFound from './NotFound';

// Update this date whenever you change a policy.
const UPDATED = '11 November 2026';

function content(s) {
  const name = s.legalName || s.name || 'Modern Fashion Store';
  const contactLine = <>{s.email ? <>Email <strong>{s.email}</strong>{s.phone ? <> or call <strong>{s.phone}</strong></> : null}{s.supportHours ? ` (${s.supportHours})` : ''}, or use</> : 'Use'} our <Link to="/contact" className="underline">contact form</Link>.</>;
  const grievance = s.grievanceName && s.grievanceEmail ? (
    <>
      <h2>Grievance officer</h2>
      <p>{s.grievanceName}, <strong>{s.grievanceEmail}</strong>{s.address ? `, ${s.address}` : ''}. We acknowledge complaints within 48 hours and aim to resolve them within one month.</p>
    </>
  ) : null;
  const days = Number(s.returnWindowDays) || 0;
  return {
    privacy: {
      title: 'Privacy policy',
      body: (
        <>
          <p>This policy explains what personal information {name} (“we”) collects when you use this website, why, and the choices you have. It is written to comply with India’s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your name, email address, mobile number and password (stored only as a one-way hash).</li>
            <li><strong>Order details:</strong> delivery addresses, items purchased, order and return history.</li>
            <li><strong>Payment details:</strong> online payments are processed by Razorpay. We never see or store your full card number, UPI PIN or net-banking password; we keep only the payment reference and status.</li>
            <li><strong>Messages:</strong> anything you send through our contact form or newsletter sign-up.</li>
            <li><strong>Stored in your browser:</strong> your login session, guest bag, recently viewed items and last delivery PIN code. These stay on your device and you can clear them any time.</li>
          </ul>
          <h2>How we use it</h2>
          <p>To process and deliver orders, handle returns and refunds, send order and account emails, answer your questions, prevent fraud, and meet tax and legal obligations. We send marketing emails only if you subscribe, and every one includes a way to stop.</p>
          <h2>Who we share it with</h2>
          <p>Only with the services needed to run the store: our payment gateway (Razorpay), courier partners (your name, address and phone for delivery), our email provider and our hosting and database providers. We do not sell your personal data.</p>
          <h2>How long we keep it</h2>
          <p>Account data is kept while your account is active. Order and invoice records are kept for as long as Indian tax and consumer laws require, even if you close your account.</p>
          <h2>Your rights</h2>
          <p>You can view and update your profile and addresses in My account at any time. To request a copy of your data, a correction, or deletion of your account, contact us. We respond within 30 days.</p>
          <h2>Contact</h2>
          <p>{contactLine}</p>
          {grievance}
        </>
      ),
    },
    terms: {
      title: 'Terms and conditions',
      body: (
        <>
          <p>These terms apply to your use of this website and any purchase from {name}. By placing an order you agree to them.</p>
          <h2>Accounts</h2>
          <p>You must be 18 or older, or use the site under a parent or guardian’s supervision. You are responsible for keeping your password confidential and for activity on your account. We may suspend accounts used for fraud or abuse.</p>
          <h2>Products and prices</h2>
          <p>Prices are in Indian Rupees and include GST. We work to show colours and details accurately, but screens vary. If an item is listed at an obviously wrong price because of an error, we may cancel the order and refund any amount paid.</p>
          <h2>Orders</h2>
          <p>Your order is accepted when we send the confirmation email. We may cancel an order if an item becomes unavailable, payment fails verification, or the delivery address is not serviceable; any amount paid is refunded in full.</p>
          <h2>Payment</h2>
          <p>We accept cards, UPI, net banking and wallets through Razorpay, and cash on delivery. Online payments are confirmed only after verification by our servers.</p>
          <h2>Coupons</h2>
          <p>Coupons cannot be exchanged for cash, cannot be combined, and may have a minimum order value, maximum discount, usage limit and expiry date shown when you apply them.</p>
          <h2>Returns</h2>
          <p>See our <Link to="/policies/returns" className="underline">cancellation and refund policy</Link>.</p>
          <h2>Liability</h2>
          <p>To the extent allowed by law, our liability for any order is limited to the amount you paid for it.</p>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of India{s.state ? `, and courts in ${s.state} have jurisdiction` : ''}.</p>
          <h2>Contact</h2>
          <p>{contactLine}</p>
          {grievance}
        </>
      ),
    },
    returns: {
      title: 'Cancellation and refund policy',
      body: (
        <>
          <h2>Cancelling an order</h2>
          <p>You can cancel an order yourself from <Link to="/account/orders" className="underline">My account → Orders</Link> until it ships. Prepaid orders cancelled this way are refunded in full to the original payment method.</p>
          <h2>Returns and exchanges</h2>
          {days > 0 ? (
            <ul>
              <li>Request a return or a size exchange within <strong>{days} days of delivery</strong> from the order page in your account.</li>
              <li>Items must be unworn, unwashed and have original tags attached.</li>
              <li>We arrange pickup from your delivery address. Please keep the items packed and ready.</li>
              <li>Exchanges depend on stock in the new size. If it’s unavailable, we’ll offer a refund instead.</li>
            </ul>
          ) : <p>Items cannot be returned or exchanged unless they arrive damaged, defective or wrong (see below).</p>}
          <h2>Refunds</h2>
          <ul>
            <li>Refunds are issued after the returned items are received and checked.</li>
            <li><strong>Prepaid orders:</strong> refunded to the original payment method through Razorpay. Banks typically take 5–7 working days to show it.</li>
            <li><strong>Cash on delivery orders:</strong> refunded to the UPI ID you give when requesting the return.</li>
            <li>The refund is the amount you paid for the returned items, after any coupon discount. Shipping charges are refunded only if the item was damaged, defective or wrong.</li>
            <li>Cancelled prepaid orders are refunded in full.</li>
          </ul>
          <h2>Damaged, defective or wrong items</h2>
          <p>Contact us as soon as possible after delivery with photos of the item and packaging, and we’ll arrange a free replacement or a full refund including shipping.</p>
          <h2>Questions</h2>
          <p>{contactLine}</p>
        </>
      ),
    },
    shipping: {
      title: 'Shipping and delivery policy',
      body: (
        <>
          <ul>
            <li><strong>Where we deliver:</strong> anywhere in India served by our courier partners. Check your PIN code on any product page.</li>
            <li><strong>Charges:</strong> {Number(s.shippingFee) > 0 ? <>free on orders of {rupees(s.freeShippingThreshold)} or more after discounts; {rupees(s.shippingFee)} below that.</> : 'free on all orders.'}</li>
            <li><strong>Dispatch:</strong> orders are usually packed and handed to the courier within {s.dispatchTime}.</li>
            <li><strong>Delivery time:</strong> depends on your location. The product page shows an estimated delivery date for your PIN code; remote areas can take longer.</li>
            <li><strong>Tracking:</strong> we email you when your order ships, and you can follow its progress in My account.</li>
            <li><strong>Cash on delivery:</strong> available on all serviceable PIN codes. Please keep the exact amount or UPI ready.</li>
            <li><strong>Missed delivery:</strong> the courier makes up to three attempts. Unclaimed COD orders are cancelled.</li>
          </ul>
          <p>Delays caused by weather, strikes or other events outside our control are rare but possible; we’ll keep you updated by email.</p>
          <h2>Questions</h2>
          <p>{contactLine}</p>
        </>
      ),
    },
  };
}

export default function Policy() {
  const { slug } = useParams();
  const store = useStore();
  const page = content(store)[slug];
  usePageTitle(page?.title);
  if (!page) return <NotFound />;
  return (
    <article className="container-x max-w-3xl py-14 sm:py-20">
      <h1 className="text-5xl leading-tight">{page.title}</h1>
      <p className="mt-3 text-sm text-stone">Last updated {UPDATED}</p>
      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-ink/85 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {page.body}
      </div>
    </article>
  );
}
