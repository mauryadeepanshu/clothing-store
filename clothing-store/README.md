# Modern Fashion Store

A full-stack clothing store: React + Vite + Tailwind storefront, a separate admin panel, and an Express + MongoDB API with JWT auth, server-side pricing, stock control, coupons, Cash on Delivery and Razorpay payments.

**Shopper features:** live search suggestions, filters and sorting, colour-specific product photos, size-guide pop-up, PIN-code delivery estimates, verified-purchase reviews and ratings, back-in-stock email alerts, recently viewed items, wishlist, persistent bag, coupons, COD and Razorpay checkout, order tracking, cancellation, returns and size exchanges, downloadable GST invoices, forgot/reset password, and order emails.

**Admin features:** dashboard, products (with per-colour photos), inventory, categories (with HSN codes), orders with status updates, GST invoice and packing slip printing, returns and exchanges, customers, contact messages, review moderation, coupons, sales reports with CSV export, and a homepage manager for the announcement bar, hero and promo banner.

**Reliability:** server-side pricing, atomic stock and coupon handling, MongoDB transactions on Atlas, idempotent Razorpay confirmation (checkout, webhook and background check), one-click Razorpay refunds. See `docs/AUDIT.md` for the audit and every fix.

**Pages:** home, shop, product, bag, checkout, account, About, Contact, Help (size guides), and the Privacy, Terms, Cancellation & Refund, and Shipping policies that Razorpay requires before enabling live payments.

```
clothing-store/
├── client/                  React app (storefront + admin panel)
│   ├── src/
│   │   ├── admin/           Admin pages: dashboard, products, inventory, categories, orders, customers, coupons
│   │   ├── components/      Navbar, footer, cart drawer, product card, route guards, forms
│   │   ├── context/         Auth, cart, wishlist and toast providers (Context API)
│   │   ├── lib/             API client, formatting, validators
│   │   └── pages/           Home, shop, product, cart, checkout, auth, help, account/*
│   ├── .env.example
│   └── vite.config.js       Proxies /api and /uploads to the backend in development
├── server/                  Express REST API
│   ├── src/
│   │   ├── config/          env + MongoDB connection
│   │   ├── controllers/     auth, users, products, categories, cart, wishlist, coupons, orders, payments, admin
│   │   ├── middleware/      auth (JWT + admin role), errors, image upload
│   │   ├── models/          User, Product, Category, Order, Coupon, Cart, Wishlist, Review, ReturnRequest,
│   │   │                    StockAlert, ContactMessage, SiteSettings, Subscriber
│   │   ├── routes/          All routes in one file (routes/index.js)
│   │   ├── services/        pricing, orders, email, gst (invoices), delivery estimates, back-in-stock alerts
│   │   ├── seed/            Sample catalogue (24 products) and seed script
│   │   └── utils/           validation, errors, self-check
│   ├── uploads/             Admin-uploaded product images
│   └── .env.example
└── docs/API.md              Endpoint reference
```

## 1. Requirements

- Node.js 18 or newer (`node -v`). On Windows, install the LTS version from nodejs.org.
- A free MongoDB Atlas cluster.
- Optional: a Razorpay account (Test Mode) for online payments, and an SMTP account for emails.

## 2. Set up MongoDB Atlas

1. Sign in at https://cloud.mongodb.com and create a free **M0** cluster.
2. **Database Access**: add a database user with a password (role: *Read and write to any database*).
3. **Network Access**: add your current IP address (for a hosted API, add the host's IPs; `0.0.0.0/0` only if the host has no fixed IPs).
4. **Database → Connect → Drivers**: copy the connection string and add a database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/modern-fashion-store?retryWrites=true&w=majority`
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).

Atlas clusters support transactions, which the store uses automatically for orders, stock and coupons. The server logs `transactions enabled` at startup.

## 3. Install and run on Windows (PowerShell)

```powershell
# 1. Unzip, then open PowerShell in the project folder
cd C:\path\to\clothing-store

# 2. Backend
cd server
Copy-Item .env.example .env
notepad .env          # fill in MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (see section 4)
npm install
npm run seed          # sample catalogue + your admin account
npm run dev           # API on http://localhost:5000, leave this window open

# 3. Frontend, in a second PowerShell window
cd C:\path\to\clothing-store\client
npm install
npm run dev           # store on http://localhost:5173
```

Generate a JWT secret in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Smart App Control:** the client uses the WebAssembly builds of Rollup and esbuild (see `overrides` in `client/package.json` and the committed `package-lock.json`), so no native `.node` or `.exe` build tools are installed and nothing needs to be unblocked. If you installed an older version of this project, remove the old packages first:

```powershell
cd client
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

On macOS/Linux the same commands work with `cp` instead of `Copy-Item`.

## 4. Environment variables (`server/.env`)

| Variable | Required | What to put |
|---|---|---|
| `MONGO_URI` | Yes | Atlas connection string (section 2) |
| `JWT_SECRET` | Yes | 32+ random characters (command above). The server refuses to start without it |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Yes | The admin account created by the seed script (password 8+ characters) |
| `CLIENT_URL` | Yes | Frontend origin(s), comma-separated. `http://localhost:5173` locally |
| `PORT`, `JWT_EXPIRES_IN`, `NODE_ENV` | No | Defaults 5000, 7d, development |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | For online payments | Both or neither. Without them, checkout offers Cash on Delivery only |
| `RAZORPAY_WEBHOOK_SECRET` | Recommended | Section 7 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | For real emails | Section 7a. Without SMTP, emails are printed in the API terminal |
| `STORE_*`, `WAREHOUSE_PINCODE` | Optional | Starting values for business details; you can edit them later in **Admin → Settings** |
| `GST_THRESHOLD`, `GST_RATE_LOW`, `GST_RATE_HIGH`, `SHIPPING_GST_RATE` | Optional | Apparel GST slabs (default 5% up to ₹2,500 per piece, 18% above; shipping 18%). Confirm with your CA |
| `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FEE` | Optional | Starting values; editable in Admin → Settings |

The client needs no `.env` locally. For a separately hosted frontend set `VITE_API_URL` (section 10).

## 5. Admin account

1. Put `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in `server/.env`.
2. Run `npm run seed` (first time) or `npm run seed -- --admin-only` (to create or reset only the admin, leaving products and orders alone).
3. Sign in at **http://localhost:5173/admin/login**.
4. Open **Admin → Settings** and fill in your business details: legal name, support email and phone, registered address, GSTIN (if registered) and grievance officer. The dashboard lists anything still missing.

Public sign-ups are always customers. The admin role can only be granted by the seed script.

`npm run seed` replaces products, categories and coupons. Users, orders, carts, wishlists and settings are never touched.

## 6. Everyday operations

- **Orders:** Dashboard → Orders. Move orders forward (Confirmed → Shipped → Out for Delivery → Delivered). Cancelling returns stock automatically.
- **Refunds:** cancelled prepaid orders show **Refund via Razorpay**. Cash/UPI refunds: send the money, then **Mark refunded manually** with the reference.
- **Returns:** Requested → Approved → Picked Up (restocks) → Refunded (Razorpay for prepaid, manual for COD) or Exchanged.
- **Unpaid online orders** are re-checked with Razorpay every 5 minutes; paid ones are confirmed automatically, abandoned ones release their coupon.

## 7. Razorpay (online payments)

1. Create an account at https://dashboard.razorpay.com and switch to **Test Mode**.
2. **Settings → API Keys → Generate Test Key**. Copy the Key ID (`rzp_test_...`) and Key Secret into `server/.env`.
3. Restart the API. The checkout's "Pay online" option becomes active.

How it's secured:

- The server prices the bag and creates the Razorpay order for that exact amount. Prices, discounts and stock sent by the browser are ignored.
- On success the server checks the HMAC-SHA256 signature, then asks Razorpay whether the payment is captured, belongs to this order and matches the amount. Authorised payments are captured. Only then is the order marked **Paid** and stock deducted.
- The checkout callback, webhook and background check can all report the same payment, even at the same moment. One atomic claim makes sure stock and coupons are processed exactly once.
- A coupon use is reserved when payment starts and released if it never completes, so usage limits can't be exceeded.
- If an item sells out between payment and confirmation, the order is cancelled, nothing is deducted, and it shows **Refund Required** with a one-click Razorpay refund.
- The Key Secret never reaches the browser.

Test payments: use Razorpay's test UPI ID `success@razorpay`, or the test cards listed at https://razorpay.com/docs/payments/payments/test-card-details/.

## 7a. Emails (order updates, password reset, back-in-stock)

The store sends: welcome, order confirmation, every order status change, cancellation, return/exchange updates, back-in-stock alerts, password-reset links, and contact-form messages (to `STORE_EMAIL`).

**Without SMTP (development):** nothing is sent. Each email is printed in the server terminal, including the password-reset link, so every flow can still be tested.

**With Gmail (simplest for testing):**
1. Turn on 2-Step Verification for the Google account.
2. Google Account → Security → **App passwords** → create one for "Mail".
3. In `server/.env`: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<the 16-character app password>`, `MAIL_FROM="Modern Fashion Store <you@gmail.com>"`.

Gmail allows about 500 emails a day. For a live store use a transactional provider (Brevo, Resend, Amazon SES, Zoho); they all give SMTP credentials that go in the same variables.

## 8. Razorpay webhook (recommended for production)

If a shopper pays and closes the tab before returning, the webhook still confirms the order.

1. Razorpay Dashboard → **Webhooks → Add New Webhook**
2. URL: `https://<your-api-domain>/api/payments/webhook`
3. Secret: any strong string; put the same value in `RAZORPAY_WEBHOOK_SECRET`
4. Events: `payment.captured`, `order.paid`, `refund.processed`, `refund.failed`

Webhooks need a public URL, so they won't reach `localhost` (use a tunnel such as ngrok to test locally). Each event is processed once even if Razorpay delivers it repeatedly. Without a webhook, payments are still confirmed by the checkout callback and the 5-minute background check.

## 9. Testing

### What was tested (11 November 2026)

| Suite | Result | Covers |
|---|---|---|
| Payments, concurrency and security (API) | 57/57 | Coupon hold and release; 5 simultaneous confirmations → stock deducted once; duplicate webhooks; forged signatures; wrong amounts; failed and authorised payments; late payments; paid-but-sold-out; double-click refunds; Razorpay refund failure and retry; 3 buyers for 1 unit; simultaneous cancellations; ship-vs-cancel race; cart kept on failure; return refunds and exchange stock; background payment check; NoSQL injection; stale tokens after password change; `alg:none` tokens; fake image uploads; store settings, shipping fee and invoices |
| Features (API) | 49/49 | Registration, login, admin login, products, cart, COD, reviews, returns, alerts, contact, reports, password reset, emails |
| Shopper journeys (browser) | 30/30 + full checkout | Search suggestions, filters, product page, bag, coupons, registration at checkout, COD order, invoice, returns, reviews, password reset, admin pages |
| Admin refunds and settings (browser) | 5/5 | Dashboard alerts, Razorpay refund button, settings reflected in policies |
| Responsive layout (browser) | 3/3 | No horizontal scrolling at 360, 768 and 1280 px on 9 key pages |
| Production mode | 4/4 | API serves the built site, no Content-Security-Policy violations, link-preview tags |
| Windows dependencies | Pass | No native Rollup/esbuild packages in the lockfile or `node_modules`; build and dev server work |

**How:** the tests ran in a sandbox against FerretDB, a MongoDB-compatible database, because MongoDB Atlas and Razorpay's servers can't be reached from there. That means:

- **Razorpay was simulated.** A stand-in implemented the API calls the store makes (create order, fetch payment, capture, refund). This proves the store's logic, not Razorpay itself. **Do one real test-mode payment and refund with your own keys before going live.**
- **The transaction path was not run.** FerretDB has no transactions, so the tests exercised the fallback path. Atlas will use the transaction path, which uses standard MongoDB session APIs.
- **Atomicity was enforced by the test harness.** FerretDB doesn't make concurrent conditional writes atomic (measured), so the harness enforced MongoDB's documented single-document atomicity to make the race tests meaningful.

### Quick manual check after setup

1. Register a customer, add items, apply `WELCOME10`, check out with Cash on Delivery.
2. In admin, move the order to **Delivered**. As the customer: download the invoice, request a return, write a review.
3. With Razorpay test keys: pay with UPI ID `success@razorpay`. The order becomes **Placed** and stock drops. Pay with `failure@razorpay`: no order is confirmed and your bag is kept.
4. Cancel a prepaid order as the customer, then use **Refund via Razorpay** in admin and check the refund in the Razorpay dashboard.
5. Forgot password: the reset link appears in the API terminal if SMTP isn't configured.

## 10. Deployment

The simplest setup is **API on Render** and **frontend on Vercel or Netlify**, with Atlas as the database.

### API (Render, Railway or any Node host)

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment: everything from `server/.env`, plus `NODE_ENV=production` and `CLIENT_URL=https://your-frontend-domain`
- In Atlas Network Access, allow your host's outbound IPs (or `0.0.0.0/0` if the host has no fixed IPs).
- Run the seed once from your machine against the production `MONGO_URI`, or from the host's shell.

**Uploaded images:** files in `server/uploads/` live on the server's disk. Many hosts (Render free tier, Railway, Heroku) wipe the disk on redeploy. Either attach a persistent disk mounted at `server/uploads`, or paste image URLs from a CDN/object storage (the product form accepts URLs as well as uploads).

### Frontend (Vercel or Netlify)

- Root directory: `client`
- Build command: `npm run build`, output directory: `dist`
- Environment variable: `VITE_API_URL=https://your-api-domain` (no trailing slash)
- Add an SPA rewrite so deep links work:
  - Vercel: create `client/vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
  - Netlify: create `client/public/_redirects` containing `/*  /index.html  200`

### Single server alternative

Build the client (`cd client && npm run build`), then start the API with `NODE_ENV=production`. The API serves `client/dist` itself, so the whole store runs from one URL. Leave `VITE_API_URL` empty in this case.

### Production checklist

- Use MongoDB Atlas (transactions on). Check the startup log says `transactions enabled`.
- Set `NODE_ENV=production`, `CLIENT_URL` to your real domain, and live Razorpay keys after completing Razorpay's KYC.
- Configure the Razorpay webhook (section 8) and SMTP (section 7a). The API prints a warning at startup for anything missing.
- Fill in every business detail in Admin → Settings; the dashboard lists what's missing.
- Keep the API on HTTPS (Render, Railway and Vercel provide it automatically).

### Before going live

- Switch Razorpay to Live Mode keys and complete Razorpay's KYC.
- Use a strong `JWT_SECRET` and admin password, and restrict Atlas network access.
- Fill in `STORE_*` details and your GSTIN, and set up SMTP so customers receive emails.
- Review the policy pages (`client/src/pages/Policy.jsx`) and adjust them to your actual business terms. They are a solid starting template, not legal advice.
- Confirm GST rates (`GST_*` variables) and HSN codes (Admin → Categories, or per product) with your CA.

## Remaining limitations

These need your accounts, data or decisions, or are larger changes left for later:

- **Real Razorpay test:** payments were tested against a simulated Razorpay. Run one real test-mode payment, webhook and refund with your keys.
- **Transactions on Atlas:** the transaction code path is standard but was not executed in the sandbox (no MongoDB available). It is used automatically on Atlas.
- **Business and legal content:** policy pages are a template written from your settings, not legal advice. Have them reviewed. Confirm GST rates and HSN codes with your CA.
- **Emails need SMTP:** without it nothing is sent to customers.
- **Delivery estimates** are PIN-code-zone estimates, not live courier data. Shipping labels and tracking numbers need a courier integration (e.g. Shiprocket).
- **Product photos:** the sample photos are Unsplash links; replace them with your own product photography.
- **Image storage:** uploaded images live on the API server's disk. On hosts that wipe the disk on redeploy, attach a persistent disk or move to object storage (S3, Cloudinary).
- **Login tokens** are stored in the browser's `localStorage` (protected by a strict Content-Security-Policy). Moving to httpOnly cookies is a recommended future hardening.
- **Link previews** (WhatsApp etc.) show product details only when the API serves the site.
- **Not built:** inventory per colour (stock is per size), multiple warehouses, GST e-invoicing (IRN) for large turnover, abandoned-cart emails.

## Notes

- **Link previews (WhatsApp, etc.):** chat apps don't run JavaScript, so product previews need the server to fill in the page's preview tags. This works in the single-server setup (section 10). If the frontend is hosted separately on Vercel/Netlify, previews show the store name only.
- **Delivery estimates** use PIN-code zones from your warehouse (no courier API). Swap `estimateDelivery()` in `server/src/services/delivery.js` for a courier API such as Shiprocket when you have an account.
- **Invoices** are printable pages; "Save as PDF" in the print dialog downloads them.

- Product photos in the sample data are Unsplash URLs. If one fails to load, the store shows a neutral placeholder with the product name.
- Prices are stored in rupees and are GST-inclusive. Orders snapshot the unit price at purchase time.
- The API is rate-limited on login/registration (30 attempts per 15 minutes per IP).
- Full endpoint reference: [docs/API.md](docs/API.md).

## Troubleshooting

**Windows: "An Application Control policy has blocked this file" (`rollup...node` or `esbuild.exe`)**
Smart App Control or an organisation policy is blocking native binaries. The client's `package.json` already forces the WebAssembly builds of Rollup and esbuild (`overrides`), which run as plain JavaScript. If you installed before this change, reinstall:

```powershell
cd client
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
npm run dev
```

The server has no native dependencies (it uses `bcryptjs`, not `bcrypt`), so it is unaffected.
