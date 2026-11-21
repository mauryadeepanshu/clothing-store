# Audit report: Modern Fashion Store

Date: 11 November 2026. Scope: every backend route, controller, service and model; the React storefront and admin panel; configuration and deployment. Each finding was confirmed in the code before it was changed, and each fix is covered by an automated test (see "Testing" in the README).

Severity: **Critical** = money or stock can be wrong; **High** = security weakness or data integrity risk; **Medium** = incorrect behaviour in some cases; **Low** = quality or polish.

## Payments and orders

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Critical | `finalizePaidOrder` checked "already paid?" and then wrote, so the checkout callback and the webhook arriving together could both deduct stock and use the coupon twice. | Atomic claim (`Pending → Processing` in one conditional update). Exactly one caller finalises; others return the result. Test: 5 simultaneous confirmations → stock deducted once. |
| 2 | Critical | Duplicate webhook deliveries were processed again. | Each Razorpay event id is stored with a unique index; repeats are acknowledged and skipped. |
| 3 | Critical | Coupon usage on online payments was taken after payment and the "limit reached" result was ignored, so limits could be exceeded. | The coupon use is reserved atomically when the Razorpay order is created and released if the payment never completes. |
| 4 | High | Signature was checked, but Razorpay was never asked whether the payment was actually captured or for the right amount (manual-capture accounts would mark authorised-only payments as paid). | Server fetches the payment: order id, amount and currency must match; authorised payments are captured; anything else is rejected. |
| 5 | High | Cancellation read `stockCommitted` and then wrote it, so a customer and an admin cancelling together restored stock twice. | Atomic status claim; stock is restored and the coupon released only by the request that won. |
| 6 | High | Admin status updates could overwrite a simultaneous customer cancellation. | Status changes are conditional on the status the admin saw (409 if it changed). |
| 7 | High | Multi-document writes (stock + coupon + order) were not atomic. | MongoDB transactions when available (Atlas), with automatic fallback to compensating writes on standalone servers. |
| 8 | High | Abandoned checkouts and missed webhooks were never reconciled. | Background check every 5 minutes asks Razorpay about unpaid orders, finalises paid ones, frees coupon holds. |
| 9 | Medium | No way to issue refunds; "Refund Required" orders needed manual Razorpay dashboard work. | Admin "Refund via Razorpay" for cancelled orders and returns, protected against double-clicks, capped at the amount paid; failures roll back with the error shown; `refund.processed/failed` webhooks tracked. |
| 10 | Medium | Cancelled COD orders were marked "Failed" payments. | New status "Voided" (nothing was charged). |
| 11 | Low | 5-digit random order numbers could collide. | 6 random characters (~1 billion per day). |

## Security

| # | Severity | Finding | Fix |
|---|---|---|---|
| 12 | High | Request bodies/queries could carry MongoDB operators (`{"email":{"$gt":""}}`, `?status[$ne]=x`); validation let non-string values through. | Request sanitiser strips `$`/dotted keys; validator rejects non-text values for text fields. |
| 13 | High | Sessions stayed valid for 7 days after a password change or reset. | `passwordChangedAt`; older tokens are rejected (the current browser gets a fresh token). |
| 14 | High | Uploads trusted the browser-supplied file type. | File content is checked (JPEG/PNG/WebP/AVIF signatures); files are renamed by detected type; anything else is deleted. |
| 15 | High | Helmet's default Content-Security-Policy would block Razorpay Checkout, Google Fonts and product images when the API serves the site. | Explicit CSP allowing only those sources. Tested: zero violations in production mode. |
| 16 | Medium | JWT algorithm not pinned. | HS256 only (tokens with `alg: none` rejected). |
| 17 | Medium | Rate limits only on login and forms. | Plus a general API limit and a checkout/payment limit. |
| 18 | Medium | Unsafe configuration started silently. | Startup checks (secret length, half-configured Razorpay) and production warnings (localhost URL, test keys, no webhook secret, no SMTP). |
| 19 | Low | Missing indexes for frequent queries (webhook lookup by Razorpay order id, order lists, returns, messages). | Indexes added; unused text index removed. |

## Business correctness

| # | Severity | Finding | Fix |
|---|---|---|---|
| 20 | High | Invoices were titled "Tax invoice" with GST breakdown even when no GSTIN was set. | Without a GSTIN a plain invoice with no tax lines is issued. GSTIN format is validated. |
| 21 | Medium | Business facts were hard-coded in pages (₹1,999 threshold, 15-day returns, "8 years" retention, a Maharashtra delivery claim, an invented company story). | Store details, shipping fee/threshold, return window and dispatch time are editable in Admin → Settings and used everywhere, including checkout totals. Invented claims removed. |
| 22 | Medium | No grievance officer details (required for Indian e-commerce sellers). | Configurable; shown on policy pages; the dashboard flags missing details. |

## Frontend

| # | Severity | Finding | Fix |
|---|---|---|---|
| 23 | Medium | Admin order search used a stale value (searched the previous term). | Fixed. |
| 24 | Medium | After a password change the current browser would be signed out by fix 13. | Client stores the new token. |
| 25 | Low | Errors showed as plain text with no retry. | Error state with "Try again" on shop, product and product rows. |
| 26 | Low | Product cards didn't show size availability or low stock. | Sizes on hover; "Only N left" badge. |
| 27 | Low | Checkout had no progress indication. | Bag → Delivery → Payment steps. |

## Windows (Smart App Control)

| # | Finding | Fix |
|---|---|---|
| 28 | Vite 5.4 needs Rollup `^4.20` and esbuild `^0.21.3`, both of which ship native binaries that Smart App Control blocks. The previous override used a version range, and no lockfile was shipped, so stale native packages could survive a reinstall. | Overrides pinned to `@rollup/wasm-node@4.24.0` and `esbuild-wasm@0.21.5` (both satisfy Vite's ranges), `package-lock.json` committed. Verified: no native Windows packages in the lockfile or `node_modules`; build and dev server work. No security setting needs to change. |

## Not changed (deliberate)

- JWT is stored in `localStorage`. Moving to httpOnly cookies would change every request and the deployment setup; the strict CSP above reduces the XSS risk that makes `localStorage` dangerous. Recommended as a future improvement.
- Duplicated small UI patterns (status lists in admin and account pages) were left as they are; consolidating them carries more risk than benefit right now.
