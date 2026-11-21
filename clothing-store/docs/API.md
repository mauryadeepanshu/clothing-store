# API reference

Base URL: `http://localhost:5000/api` in development.

- Send JSON with `Content-Type: application/json`.
- Authenticated routes need `Authorization: Bearer <token>` (from register/login).
- **Auth** column: `—` public, `User` any signed-in account, `Admin` admin role only.
- Errors return `{ "message": "...", "details": { "field": "message" } }` (`details` only for validation errors) with status 400, 401, 403, 404, 409 or 500.
- All amounts are in rupees.

## Auth

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ name, email, password }` (password 8+ chars) | `{ token, user }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` |
| POST | `/auth/admin/login` | — | `{ email, password }` | `{ token, user }`, 403 if not admin |
| GET | `/auth/me` | User | — | `{ user }` |

### Password reset

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/forgot` | — | `{ email }` | Same message whether or not the account exists; emails a 30-minute link |
| POST | `/auth/reset` | — | `{ token, password }` | `{ token, user }` (signed in); link is single-use |

## Account

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| PUT | `/users/profile` | User | `{ name, phone? }` (10-digit Indian mobile) | `{ user }` |
| PUT | `/users/password` | User | `{ currentPassword, newPassword }` | `{ message, token }`. Other sessions are signed out; use the new token |
| POST | `/users/addresses` | User | Address + `label?`, `isDefault?` | `{ addresses }` |
| PUT | `/users/addresses/:id` | User | Address + `label?`, `isDefault?` | `{ addresses }` |
| DELETE | `/users/addresses/:id` | User | — | `{ addresses }` |

Address shape: `{ fullName, phone, line1, line2?, city, state, pincode }` (6-digit PIN).

## Catalogue

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products` | — | Query: `q`, `gender` (`men,women,unisex`, comma-separated), `category` (slugs), `sizes`, `colors`, `minPrice`, `maxPrice`, `tag` (`new`, `bestseller`, `trending`, `sale`), `sort` (`newest`, `popular`, `price-asc`, `price-desc`, `discount`), `page`, `limit` (max 48). Admins can add `all=true` to include hidden products. Returns `{ products, total, page, pages }` |
| GET | `/products/filters` | — | `{ sizes, colors: [{ name, hex }], price: { min, max } }` |
| GET | `/products/:idOrSlug` | — | `{ product, related }` |
| GET | `/categories` | — | `{ categories }` with `productCount`. Admins: `all=true` includes hidden |

Product fields include `price` (MRP), `discountPrice`, and server-maintained `finalPrice`, `discountPercent`, `totalStock`, plus `sizes: [{ name, stock }]` and `colors: [{ name, hex }]`.

## Cart (signed-in users; guests keep the cart in localStorage)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/cart` | User | — | `{ items }` |
| POST | `/cart` | User | `{ product, size, color?, quantity }` | `{ items }` |
| POST | `/cart/merge` | User | `{ items: [{ product, size, color, quantity }] }` | `{ items }` (merges a guest cart after login) |
| PATCH | `/cart/:itemId` | User | `{ quantity }` (1–10, within stock) | `{ items }` |
| DELETE | `/cart/:itemId` | User | — | `{ items }` |
| DELETE | `/cart` | User | — | `{ items: [] }` |

## Wishlist

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/wishlist` | User | `{ products }` |
| POST | `/wishlist/:productId` | User | `{ products }` |
| DELETE | `/wishlist/:productId` | User | `{ products }` |

## Coupons

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/coupons/public` | — | — | Active coupons for display: `{ coupons: [{ code, description, minOrder }] }` |
| POST | `/coupons/apply` | — | `{ code, items }` | `{ code, description, subtotal, discount, shippingFee, total }`, or 400 with the reason (expired, minimum order, usage limit…) |

## Orders

`items` everywhere below is `[{ product, size, color?, quantity }]`. **Prices sent by the client are ignored**; the server prices every line from the database.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/orders/quote` | — | `{ items, couponCode? }` | `{ items, subtotal, discount, couponCode, shippingFee, total }` |
| POST | `/orders` | User | `{ items, couponCode?, shippingAddress }` | `{ order }` — Cash on Delivery. Stock is deducted atomically |
| GET | `/orders/mine` | User | — | `{ orders }` |
| GET | `/orders/:id` | User | — | `{ order }` (owner or admin only) |
| POST | `/orders/:id/cancel` | User | — | `{ order }` — allowed while `Placed` or `Confirmed`; restores stock |

Order statuses: `Pending Payment`, `Placed`, `Confirmed`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`.
Payment statuses: `Pending`, `Processing` (being confirmed), `Paid`, `Failed`, `Refund Required`, `Refund Processing`, `Refunded`, `Partially Refunded`, `Voided` (cancelled COD, nothing charged).

## Payments (Razorpay)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/payments/config` | — | — | `{ enabled, keyId }` (public key id only) |
| POST | `/payments/razorpay/order` | User | `{ items, couponCode?, shippingAddress }` | `{ orderId, orderNumber, razorpayOrderId, amount (paise), currency, keyId, prefill }`. 503 if keys aren't configured |
| POST | `/payments/razorpay/verify` | User | `{ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ order }` after HMAC-SHA256 signature verification; 400 if the signature is invalid |
| POST | `/payments/razorpay/failed` | User | `{ orderId, reason? }` | `{ ok, action }`. Checks with Razorpay; if nothing was paid the coupon hold is released |
| POST | `/payments/webhook` | Razorpay signature | Raw Razorpay event | `{ received }`. Handles `payment.captured`, `order.paid`, `refund.processed`, `refund.failed`. Each event id is processed once |

## Reviews

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| GET | `/products/:id/reviews` | — (optional User) | `{ reviews, summary: { avg, count, dist }, canReview, myReview }` |
| POST | `/products/:id/reviews` | User | `{ rating 1–5, title?, comment }`. Only after a delivered order containing the product; one review per customer (re-posting edits it) |
| DELETE | `/products/:id/reviews` | User | Deletes your review |

## Search, delivery, stock alerts, contact, settings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products/suggest?q=` | — | Up to 6 products and 3 categories (2+ characters) |
| GET | `/products?ids=a,b` | — | Fetch specific products (recently viewed) |
| GET | `/delivery/estimate?pincode=` | — | `{ valid, serviceable, minDays, maxDays, from, to, cod }` |
| POST | `/products/:id/notify` | — | `{ email, size }` for a sold-out size; emailed when restocked |
| POST | `/contact` | — | `{ name, email, phone?, orderNumber?, subject, message }` |
| GET | `/settings` | — | Homepage settings and public store details |

## Invoices and returns

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/orders/:id/invoice` | User (owner) or Admin | `{ order, invoice }` with per-line HSN, taxable value, CGST/SGST or IGST |
| GET | `/orders/:orderId/return-eligibility` | User | Returnable quantities, sizes for exchange, reasons, window end |
| GET | `/returns/reasons` | — | Reasons and window length |
| POST | `/returns` | User | `{ orderId, type: return\|exchange, reason, items: [{ product, size, color, quantity, exchangeSize? }], comment?, refundUpi? }`. Within 15 days of delivery; COD returns need a UPI ID |
| GET | `/returns/mine` | User | Your requests |

## Newsletter

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/newsletter` | — | `{ email }` |

## Admin (all require the admin role)

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/admin/stats` | — | Revenue, counts, orders by status, 6-month revenue, top products, recent orders, low stock |
| GET | `/admin/orders` | `?status=&q=<order number>&page=` | `{ orders, total, page, pages }` |
| PATCH | `/admin/orders/:id/status` | `{ status, note? }` | `{ order }`. Status only moves forward; `Cancelled` restores stock and flags paid orders for refund. `Delivered` marks COD orders paid |
| POST | `/admin/orders/:id/refund` | — | `{ order }`. Full Razorpay refund of a cancelled prepaid order (Refund Required). Double requests are rejected |
| POST | `/admin/orders/:id/refunded` | `{ reference? }` | `{ order }`. Records a refund paid outside Razorpay |
| POST | `/admin/orders/:id/reconcile` | — | `{ action, order }`. Asks Razorpay about an unpaid online order |
| GET | `/admin/customers` | `?q=` | `{ customers }` with order count and total spent |
| PATCH | `/admin/customers/:id/block` | — | `{ isBlocked }` (toggle) |
| POST | `/admin/products` | Product body | `{ product }` |
| PUT | `/admin/products/:id` | Product body | `{ product }` |
| PATCH | `/admin/products/:id/stock` | `{ sizes: [{ name, stock }] }` | `{ product }` |
| DELETE | `/admin/products/:id` | — | `{ message }` |
| POST | `/admin/uploads` | `multipart/form-data`, field `images` (up to 8 files, 5 MB each, JPG/PNG/WEBP/AVIF) | `{ urls: ["/uploads/..."] }` |
| POST | `/admin/categories` | `{ name, description?, image?, isActive? }` | `{ category }` |
| PUT | `/admin/categories/:id` | same | `{ category }` |
| DELETE | `/admin/categories/:id` | — | 400 if products still use it |
| GET | `/admin/coupons` | — | `{ coupons }` |
| POST | `/admin/coupons` | `{ code, type: percent\|fixed, value, minOrder?, maxDiscount?, usageLimit?, expiresAt?, description?, isActive? }` | `{ coupon }` |
| PUT | `/admin/coupons/:id` | same | `{ coupon }` |
| DELETE | `/admin/coupons/:id` | — | `{ message }` |

| GET | `/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | — | Summary, daily sales, payment split, top products, order rows for CSV |
| PUT | `/admin/settings` | `{ announcement, hero, promo, store }` (store: business details, shipping fee/threshold, return window, dispatch time; GSTIN validated) | `{ settings, store }` |
| GET | `/admin/messages` | `?status=New\|Read\|Resolved` | `{ messages }` |
| PATCH | `/admin/messages/:id` | `{ status }` | `{ message }` |
| GET | `/admin/reviews` | `?rating=` | `{ reviews }` |
| DELETE | `/admin/reviews/:reviewId` | — | Removes a review and recalculates the rating |
| GET | `/admin/returns` | `?status=` | `{ returns }` |
| PATCH | `/admin/returns/:id` | `{ status, note?, method? }` (`method: manual` to skip the Razorpay refund) | Requested → Approved/Rejected → Picked Up → Refunded/Exchanged. Approving an exchange reserves stock; Picked Up restocks |

Product body: `{ name, description, hsn?, details?: string[], price, discountPrice?, gender, category (id), images: string[], sizes: [{ name, stock }], colors?: [{ name, hex }], isNewArrival?, isBestSeller?, isTrending?, isActive? }`.

## Example: COD order with curl

```bash
TOKEN=$(curl -s -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

PID=$(curl -s 'localhost:5000/api/products?category=t-shirts&limit=1' | node -pe 'JSON.parse(require("fs").readFileSync(0)).products[0]._id')

curl -s -X POST localhost:5000/api/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{
  \"items\": [{ \"product\": \"$PID\", \"size\": \"M\", \"quantity\": 1 }],
  \"shippingAddress\": { \"fullName\": \"Test User\", \"phone\": \"9876543210\", \"line1\": \"12 MG Road\",
                         \"city\": \"Thane\", \"state\": \"Maharashtra\", \"pincode\": \"400601\" }
}"
```
