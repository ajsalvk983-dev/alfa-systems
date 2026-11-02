# ALFA SYSTEMS site architecture

This guide describes the static storefront and its separate Express/MySQL API. The storefront can be hosted on GitHub Pages; the API is deployed separately to Render.

## Repository map

### Storefront

| File | Purpose |
|---|---|
| `alfa.html` | Home page, hero carousel, featured products and shared navigation. |
| `products.html` | Catalogue, category/filter controls and product search. |
| `product.html` | Product detail shell; `product.js` fills `#productDetail`. |
| `cart.html` | Cart contents and checkout/WhatsApp actions. |
| `checkout.html` | Customer, delivery and payment form; creates database orders. |
| `orders.html` | Guest order lookup and signed-in order history. |
| `account.html` | Sign-in, sign-up and customer dashboard. |
| `services.html` | Service request form and signed-in service history. |
| `about.html`, `contact.html` | Informational pages and contact details. |
| `admin.html` | Admin dashboard shell; never link it as a customer account page. |
| `products.js` | Static catalogue fallback used when the API is unavailable. Product prices are cleared before fallback data is displayed. |
| `api.js` | API base URL, local fixture mode and memoized product-catalogue fetch. |
| `auth.js` | Customer token storage, authenticated fetch, session restore and logout. |
| `alfa.js` | Shared storefront behavior: navigation, search, product cards, cart, wishlist, carousel and shared utilities. |
| `catalog.js` | Catalogue rendering, filters, sorting and URL search parameters. |
| `product.js` | Product detail rendering, quantity controls, wishlist and add-to-cart behavior. |
| `checkout.js` | Cart validation, checkout rendering, address prefill, order submission and confirmation. |
| `my-orders.js` | Guest token lookup and signed-in order history/details/timeline. |
| `account.js` | Account forms, tabs, profile, addresses, orders, services, wishlist and security actions. |
| `services.js` | Service request form submission. |
| `admin.js` | Admin session, customer/order/product/service management and dashboard behavior. |
| `alfa.css` | Shared foundation and core storefront components. |
| `site.css` | Shared site shell, navigation, top bar, footer and shared components. |
| `pages.css` | Page-specific layouts and content blocks. |
| `cards.css` | Product card and tile presentation. |
| `product.css` | Product-detail and related-product presentation. |
| `checkout.css` | Checkout, order history and confirmation presentation. |
| `carousel.css` | Home hero carousel visuals. Carousel behavior is vanilla JavaScript in `alfa.js`. |
| `responsive.css` | Responsive rules shared by pages. |
| `design.css` | Current shared design overrides, search panel, paper cards and mobile states. |
| `theme.css` | Spacing/color tokens and palette variables; loaded last on storefront pages. |
| `admin.css` | Admin-only design. |
| `.gitignore` | Excludes local environment files and workspace files from the frontend repository. |

### API

| File | Purpose |
|---|---|
| `server.js` | Express API, authentication, customer/admin routes, MySQL schema setup and server startup. |
| `migrations/001_customer_accounts.sql` | Repeatable MySQL migration for customer-account tables and account links on orders/service requests. |
| `package.json` | Runtime dependencies and `npm start`. There is currently no automated test suite configured. |
| `package-lock.json` | Locked Node dependency versions. |
| `.gitignore` | Excludes `.env`, `.env.*` and `node_modules`. Never commit local environment files. |

## CSS and script load order

The order below is the order in each page's HTML. Later rules can override earlier rules when selector specificity is equal. Inline styles and more-specific selectors can still win.

| Page | Stylesheets, first to last | Scripts, first to last |
|---|---|---|
| Home (`alfa.html`) | `site.css`, `alfa.css`, `pages.css`, `cards.css`, `carousel.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, then dynamically load `alfa.js` immediately |
| Catalogue (`products.html`) | `site.css`, `alfa.css`, `pages.css`, `cards.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, then dynamically load `alfa.js`; when it loads, wait for `loadProducts()` before loading `catalog.js` |
| Product (`product.html`) | `site.css`, `alfa.css`, `pages.css`, `cards.css`, `product.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, `alfa.js`, then wait for `loadProducts()` before loading `product.js` |
| Cart (`cart.html`) | `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, `alfa.js`, then wait for `loadProducts()` before `updateBadge()` and `renderCart()` |
| Checkout (`checkout.html`) | `site.css`, `alfa.css`, `pages.css`, `checkout.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, `alfa.js`, `checkout.js` |
| Orders (`orders.html`) | `checkout.css`, `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, `alfa.js`, `my-orders.js` |
| Account (`account.html`) | `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, `alfa.js`, `my-orders.js`, `account.js` |
| Services (`services.html`) | `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, dynamically load `alfa.js`, then load `services.js` when it finishes |
| About (`about.html`) | `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, then dynamically load `alfa.js` immediately |
| Contact (`contact.html`) | `site.css`, `alfa.css`, `pages.css`, `responsive.css`, `design.css`, `theme.css` | `products.js`, `api.js`, `auth.js`, then dynamically load `alfa.js` immediately |
| Admin (`admin.html`) | `admin.css` | `api.js`, `admin.js` |

Font Awesome and Google Fonts are loaded in the page head. The storefront does not load Bootstrap, jQuery or Popper; the home carousel uses native JavaScript.

### Which stylesheet controls what?

- **Navbar/search/top bar:** `site.css` and `alfa.css` provide the shared base; `responsive.css` sets responsive behavior; `design.css` supplies the final search/mobile overrides. `theme.css` provides the palette variables.
- **Product tiles:** `cards.css` defines the common cards. `product.css` controls the product-detail card and related tiles. `design.css` contains shared card/paper overrides.
- **Buttons:** shared button foundations are in `alfa.css`/`site.css`; page-specific buttons are in `pages.css` and `checkout.css`; final shared styling and states may be overridden in `design.css`.
- **Spacing and colors:** edit the tokens in `theme.css` first. The shared `.paper` component is styled in `design.css`.
- **Admin:** `admin.css` is separate from the storefront cascade.

## Where to edit common things

| Change | Start here |
|---|---|
| Palette colors, spacing scale, fonts | `theme.css` |
| Hero slide text and markup | `alfa.html`; carousel behavior is in `alfa.js` |
| Product source fallback | `products.js`; the live catalogue fetch is in `api.js` |
| Product cards/catalogue filters | `alfa.js`, `catalog.js`, `cards.css` |
| Product detail layout | `product.js`, `product.css`, `product.html` |
| Navbar or shared mobile search | Shared navbar markup in the HTML pages, then `alfa.js`, `site.css`, `design.css`, `responsive.css` |
| Cart and WhatsApp enquiry | `alfa.js`, `cart.html` |
| Checkout, address prefill, order submission | `checkout.js`, `checkout.html`, backend `/api/orders` |
| Account dashboard | `account.html`, `account.js`, `auth.js`, backend `/api/auth/*` |
| Service requests | `services.html`, `services.js`, backend `/api/service-requests` |
| Admin screens | `admin.html`, `admin.js`, `admin.css`, backend `/api/admin/*` |
| API hostname | `LIVE_API` in `api.js`; local fixture mode is restricted to local hosts with `?api=local` |

## Stable integration points

Do not rename these without updating every script that reads them:

- Shared navigation/search: `.navbar`, `.yt-search`, `.search`, `.search-icon`, `.nav-icons`, `.cart-count`/`#cartCount`.
- Home/catalogue: `#productGrid`, `#catalogGrid`, `#noResults`.
- Product detail: `#productDetail`; generated quantity control `#pdQty`.
- Cart: `#cartItemsCount`, `#cartList`, `#cartSummary`.
- Checkout: `#checkoutForm`, `#customerName`, `#customerPhone`, `#customerEmail`, `#deliveryAddress`, `#deliveryCity`, `#deliveryDistrict`, `#deliveryState`, `#deliveryPincode`, `#checkoutItems`, `#placeOrderButton`, `#orderConfirmation`.
- Orders: `#databaseOrdersState`, `#databaseOrdersList`; shared renderer `renderDatabaseOrder()`.
- Account: `#accountLogin`, `#accountProfile`, `#accountMessage`, `#accountAddressesList`, `#accountOrdersList`, `#accountServicesList`, `#accountWishlistList`.
- Services: `#serviceRequestForm`, `#serviceFormStatus`, `#serviceSubmit`.
- Admin: the view/form IDs in `admin.html` are selectors used throughout `admin.js`.
- Shared functions used across files include `loadProducts()`, `setupSearchDropdown()`, `renderProductGrid()`, `addToCart()`, `renderCart()`, `updateBadge()`, `placeOrder()`, `authFetch()`, `getUser()`, `saveAuthSession()` and `logout()`.

The search setup is shared by every storefront page. The home/about/contact/services/catalogue loaders must not wait for the product API before loading `alfa.js`; product data can load in the background.

## API endpoints

Public storefront:

- `GET /health`
- `GET /api/products`
- `GET /api/checkout/options`
- `POST /api/orders` (guest or signed-in checkout)
- `GET /api/orders/:id` (requires the guest order access token header)
- `POST /api/service-requests` (guest or signed-in)

Customer account:

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `PATCH /api/auth/profile`, `PATCH /api/auth/password`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`
- `POST /api/auth/logout-all`, `DELETE /api/auth/account`
- `GET/POST /api/auth/addresses`, `PATCH/DELETE /api/auth/addresses/:id`
- `GET /api/auth/wishlist`, `POST/DELETE /api/auth/wishlist/:productId`
- `GET /api/auth/service-requests`
- `GET /api/orders/mine`

Admin routes (all require the admin password header):

- `/api/admin/check`, `/api/admin/stats`
- `/api/admin/customers`, `/api/admin/customers/:id/status`, `/api/admin/customers/:id/password`
- `/api/admin/orders`, `/api/admin/orders/summary`, `/api/admin/orders/:id/status`, `/api/admin/orders/:id/delivery-charge`
- `/api/admin/products`, `/api/admin/products/:id`, `/api/admin/products/:id/visibility`
- `/api/admin/categories`
- `/api/admin/service-requests`, `/api/admin/service-requests/:id/status`

## Database

The existing store schema includes `products`, `orders` and `order_items`. Customer/account work uses:

- `users`: password hash, email verification, enabled state and token version.
- `email_verification_tokens`, `password_reset_tokens`: SHA-256 token hashes, one-use timestamps and expiry.
- `user_addresses`, `wishlist`.
- `orders.user_id`: associates orders only after sign-in or verified-email guest-order linking.
- `service_requests.user_id`: associates signed-in service submissions with their customer.
- `product_categories`: catalogue category records used by the API/admin.

The migration is [`001_customer_accounts.sql`](../../alfa-backend/migrations/001_customer_accounts.sql). Apply it to the correct production database before deploying the account UI/API. The SQL file uses a stored procedure and `DELIMITER`; run it with the MySQL CLI or a SQL client that supports those commands. The backend also performs idempotent schema setup during startup; keep that setup and the checked-in migration aligned when adding future columns.

## Environment variables

Set these in the Render backend service's **Environment** page; do not put production values in frontend files or commit `.env` files.

Required for the database:

- `DB_HOST`, `DB_PORT` (normally `3306`), `DB_USER`, `DB_PASS`, `DB_NAME`.
- `DB_SSL=true` when the database provider requires TLS.

Customer account/email:

- `JWT_SECRET`: long random secret; generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `FRONTEND_URL`: full deployed storefront URL, including any GitHub Pages project path, e.g. `https://OWNER.github.io/REPOSITORY/`.
- `RESEND_API_KEY` (or `EMAIL_API_KEY`): Resend API key. Verify the sender domain with Resend before using a production sender.
- `EMAIL_FROM`: verified sender, for example `ALFA SYSTEMS <accounts@example.com>`.
- `ALLOWED_ORIGINS`: optional comma-separated extra origins; use origins only (scheme + host, no page path).

Other:

- `ADMIN_PASSWORD`: required to use admin API routes.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: optional product image uploads.
- `PORT`: supplied by Render; the server listens on this value.

## Deploy steps

### GitHub Pages storefront

1. Commit and push the frontend repository to its deployment branch.
2. In GitHub, open **Settings > Pages** and select the intended branch and repository root (or the configured publishing folder).
3. Wait for the Pages deployment, then check the site URL and the browser console.
4. Confirm `LIVE_API` in `api.js` points at the deployed Render service. The browser uses that fixed API URL; `?api=local` is only for localhost testing.

### Render API and database

1. Back up the production database.
2. Run `migrations/001_customer_accounts.sql` against that database. Confirm the selected database/schema before executing it.
3. Create or update the Render web service with the backend repository and its root directory. Use `npm install` for install and `npm start` for start.
4. Set the database variables, `JWT_SECRET`, `FRONTEND_URL`, email provider key and verified `EMAIL_FROM` in Render's Environment page. Set `ADMIN_PASSWORD`; set `ALLOWED_ORIGINS` if a second frontend origin is required.
5. Deploy the backend and confirm `GET https://YOUR-SERVICE.onrender.com/health` returns `ok`. Then exercise signup, verification, reset email, sign-in, checkout, and admin access using a test account.
6. Publish the frontend. Recheck that `FRONTEND_URL` is exact; verification/reset emails use it to create links back to `account.html`.

Do not run account/order migrations against production without a backup and confirmation of the selected database.

## Debugging guide

- **A visual issue:** identify the page and viewport first. Check that page's stylesheet order above, then inspect the final override in `design.css` or the token in `theme.css`. Confirm whether a more-specific selector or inline style wins.
- **A click does nothing:** check the element ID/class against the Stable integration points, confirm its script is loaded in the page's order, and inspect the browser console. Pages that need catalogue data must wait for `loadProducts()` only before loading the catalogue/detail renderer, not before shared search setup.
- **Wrong product or price:** inspect `GET /api/products` and `api.js`. API data is authoritative; `products.js` is the offline fallback and must not supply stale prices.
- **Sign-in/session issue:** inspect the response from `/api/auth/*`, `alfaAuthToken` in local storage, Render `JWT_SECRET`, and `GET /api/auth/me`. A `401` removes the expired token and returns the account UI to sign-in.
- **Email not delivered:** check the Render email-key/sender variables and Resend's verified-domain/send logs. Reset responses intentionally do not disclose whether an email exists.
- **Order not linked to account:** guest orders are linked only after successful verification of the same email address. A phone-number match never links an order.
- **API unavailable:** check `/health`, Render logs, database connectivity and CORS. The browser's `?api=local` mode only works on local hosts and expects the API fixture on port `3000`.
- **Old WhatsApp history:** WhatsApp enquiries are not database orders. The orders page displays a migration note; signed-in orders come from the server and guest order access remains in its guest token storage.
