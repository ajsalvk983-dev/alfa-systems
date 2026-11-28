# Alfa Systems — Frontend

[![GitHub Repo](https://img.shields.io/badge/GitHub--Repo `ajsalvk983-dev/Alfa-Systems`-181717?logo=github&logoColor=white)](https://github.com/ajsalvk983-dev/Alfa-Systems)
[![Netlify Status](https://api.netlify.com/api/v1/badges/deployments)](https://app.netlify.com/dash)
[![License: MIT](https://img.shields.io/badge/License-MIT-000000.svg?logo=appveyor)](LICENSE)

## Project Introduction

**Alfa Systems** is a modern customer account integration platform enabling seamless customer management, order processing, and wishlist functionality for the Alfa e-commerce ecosystem. The frontend provides a responsive, accessible user interface for account management, product browsing, and shopping cart operations.

**Live Website**: <https://alfasystemstcr.com>

---

## Screenshots

*(Screenshots are currently unavailable in this environment. Placeholder boxes indicate where screenshots would appear.)*

| Section | Placeholder |
|---------|-------------|
| Homepage | `![homepage](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Homepage)` |
| Account Dashboard | `![account](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Account+Dashboard)` |
| Product Catalog | `![products](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Product+Catalog)` |
| Wishlist | `![wishlist](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Wishlist)` |

---

## Features

- **Customer Authentication**: Sign-up, login, session management via JWT cookies with `SameSite=None, Secure` partition for cross-origin deployments
- **Product Browsing**: Full product catalog with filtering, sorting, and responsive grid layout
- **Shopping Cart**: Add/remove items, cart persistence, checkout flow with Razorpay payment integration
- **Wishlist**: Add/remove products to/from personal wishlist with server-side sync (`/api/auth/wishlist` endpoints)
- **Address Management**: Save, edit, and delete shipping addresses per customer account
- **Service Requests**: Submit and track service requests from customer dashboard
- **Order History**: View past orders with itemized details and status tracking
- **Password Management**: Forgot-password and reset-password flows with single-use tokens
- **Email Verification**: Single-use verification tokens sent on signup and resendable via `/api/auth/resend-verification`
- **Responsive Design**: Mobile-first layout via CSS grid/flexbox; viewport sizes from 320px to 1440px
- **Accessibility**: Semantic HTML, ARIA labels, keyboard-navigable forms, focus-visible states

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Markup** | HTML5 (semantic elements, ARIA roles) |
| **Styling** | CSS3 (Flexbox, CSS Grid, custom properties) |
| **Interactivity** | Vanilla JavaScript (ES2024) — `auth.js`, `alfa.js`, `account.js`, `api.js` |
| **API Consumption** | `fetch()` with Bearer token headers; `authFetch()` helper with 401 auto-handling |
| **Build/Deploy** | Netlify (GitHub-connected) — static site hosting with branch deploys |
| **Backend Integration** | RESTful API on Render (`alfa-backend-mtwa.onrender.com`) — auth, products, orders, wishlist, addresses, service requests |

---

## Project Structure

```
ALFA WEB PJ/
├── account.html        # Account management page
├── account.js          # Account API calls (authFetch, profile/password/addresses/service-requests/wishlist)
├── alfa.html           # Core frontend layout (header, nav, footer)
├── alfa.js             # Wishlist sync, isProductWishlisted(), toggleWishlist(), localWishlistIds()
├── admin.html / admin.js # Admin panel (requires x-admin-password header)
├── api.js              # API base URL configuration (LIVE_API, API_URL, IS_LOCAL_HOST, USE_LOCAL_API)
├── auth.js             # Auth token management (AUTH_TOKEN_KEY, getAuthToken(), setCurrentUser(), logout(), authFetch)
├── about.html          # About page
├── about.css
├── admin.css           # Admin panel styling
├── admin.html          # Admin interface
├── carousel.css / carousel.js
├── cards.css
├── checkout.css / checkout.js
├── contact.html
├── design.css
├── about.css
├── footer (implied in layout)
├── header (implied in layout)
├── products.html / product.js / product.css # Product detail and listing pages
├── my-orders.js / orders.html # Order history pages
├── packages.json (if monorepo)
├── responsive.css      # Responsive breakpoints
├── services.html / services.js # Service request pages
├── site.css            # Global styles (41,845 lines — core layout, typography, colors)
├── theme.css           # Theme variables (light/dark mode, color palette)
└── .git                # Git version control
```

---

## Installation and Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ajsalvk983-dev/Alfa-Systems.git
   cd Alfa-Systems
   ```

2. **Install dependencies** (no `package.json` — static site; ensure Node.js is available for development tools):
   ```bash
   # No npm install required — this is a static HTML/CSS/JS project
   # If using live server extension in VS Code:
   npx live-server --port=3000
   ```

3. **Start the development server**:
   - Open `index.html` (or `alfa.html`) in a browser
   - Or run `npx serve` from the project root
   - The site renders statically; no build step required

4. **Configure the backend API endpoint** (see "Backend API Integration" below):
   - Edit `api.js` and set `LIVE_API` to the deployed backend URL, or run with `?api=local` for local development

5. **Test the application**:
   - Navigate through homepage, product catalog, account dashboard
   - Test authentication flow (sign up / log in / log out)
   - Verify wishlist sync functionality
   - Test responsive layout by resizing the browser viewport

---

## Configuration

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `LIVE_API` | Production API base URL (set in `api.js`) | `"https://alfa-backend-mtwa.onrender.com"` |
| `COOKIE_SECURE` | When `true`, session cookies use `Secure` flag (HTTPS required). When `false`, `SameSite=lax` for HTTP dev | `true` (production) / `false` (local development) |
| `ALLOWED_ORIGINS` | Backend CORS allowance (comma-separated list) | `https://alfasystemstcr.com` |
| `JWT_SECRET` | Backend JWT signing secret | Set in `.env` on the backend |
| `ADMIN_PASSWORD` | Admin route password ( `x-admin-password` header) | Set in `.env` on the backend |

> **Note**: The frontend does not have a `.env` file. All configuration is embedded in `api.js`. The backend `.env` file controls `ALLOWED_ORIGINS`, `JWT_SECRET`, `COOKIE_SECURE`, and `ADMIN_PASSWORD`.

---

## Backend API Integration

The frontend integrates with the **Alfa Systems backend** (`alfa-backend`) deployed at `https://alfa-backend-mtwa.onrender.com`. All API calls are routed through `api.js`, which resolves the correct base URL based on the execution environment.

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/products` | GET | No | Fetch product catalog |
| `/api/auth/me` | GET | Yes (JWT cookie) | Verify customer session, return profile |
| `/api/auth/login` | POST | Yes | Authenticate credentials, set `alfa_customer_session` cookie |
| `/api/auth/signup` | POST | Yes | Create new customer account |
| `/api/auth/logout` | POST | Yes | Clear session cookie |
| `/api/auth/wishlist` | GET/POST | Yes | Wishlist sync (GET = list, POST = add product) |
| `/api/auth/wishlist/:productId` | DELETE | Yes | Remove product from wishlist |
| `/api/auth/addresses` | GET/POST | Yes | Address management |
| `/api/auth/addresses/:id` | PUT/DELETE | Yes | Single address CRUD |
| `/api/auth/service-requests` | GET/POST | Yes | Service request CRUD |
| `/api/auth/password` | PATCH | Yes | Change password (verify current password) |
| `/api/auth/forgot-password` | POST | Yes | Initiate password reset (send token email) |
| `/api/auth/reset-password` | POST | Yes | Complete password reset (new hash, increment token_version) |
| `/api/auth/verify-email` | GET | Yes | Validate email verification token |
| `/api/auth/resend-verification` | POST | Yes | Invalidate old tokens, generate new verification token, send email |
| `/api/admin/check` | GET | `x-admin-password` | Admin route verification |
| `/api/admin/products` | GET/POST | `x-admin-password` | Admin product CRUD |
| `/api/orders` | POST | Yes (JWT cookie) | Create new order |
| `/api/health` | GET | No | Health check |

**API Client Usage** (from `auth.js`):
```javascript
const token = localStorage.getItem("alfaAuthToken");
if (token && !headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
```

**401 Handling** (from `auth.js`):
```javascript
if (response.status === 401 && token) {
  localStorage.removeItem("alfaAuthToken");
  setCurrentUser(null);
  window.dispatchEvent(new CustomEvent("alfa-auth-expired", { detail: { message: "Your session expired. Please sign in again." } }));
}
```

---

## Deployment Process Using Netlify and GitHub

1. **Connect the repository to Netlify**:
   - Go to <https://netlify.com> and click “New site from Git”
   - Select GitHub and choose the `ajsalvk983-dev/Alfa-Systems` repository
   - Set the build command to **leave blank** (static site, no build step)
   - Set the publish directory to **`/`** (root)

2. **Branch deploys**:
   - Every push to a branch generates a Netlify preview URL (e.g., `https://<uuid>.netlify.app`)
   - The `main` branch deploys to the production Netlify URL

3. **Environment variables** (in Netlify UI → Site → Site settings → Build & deploy environment variables):
   - `LIVE_API`: `https://alfa-backend-mtwa.onrender.com` (production backend URL)
   - `COOKIE_SECURE`: `true` (enables `Secure` flag on session cookies for production HTTPS)
   - `ALLOWED_ORIGINS`: `https://alfasystemstcr.com` (matches the deployed domain)

4. **Deploy on push**:
   - Push to `main` → Netlify auto-deploys
   - Push to feature branches → preview deploys for review
   - Manual deploys via Netlify UI "Trigger deploy"

5. **Rollback**:
   - In Netlify UI, select a previous deploy from the "Deploy history" and click "Restore"

---

## Future Improvements

- Migrate from vanilla JavaScript to a modern framework (React, Vue, or Svelte) for component reusability and state management
- Implement client-side routing for multi-page application (SPA) behavior without full page reloads
- Add TypeScript typings for API response shapes and event details
- Improve offline experience with service worker caching for product catalog and assets
- Add accessibility audit and remediate any WCAG 2.1 AA violations
- Implement rate-limit-aware UI (display remaining requests, back-off indicators)
- Add CSP (Content Security Policy) meta tags for enhanced XSS protection
- Integrate with a headless CMS for content-driven pages (about, services)

---

## License

*(License text to be added by the repository owner. Do not invent a license.)*

```
[License placeholder — e.g., MIT, Apache-2.0, or other. Consult the repository owner.]
```

---

## Contact and Support

- **GitHub**: <https://github.com/ajsalvk983-dev/Alfa-Systems>
- **Live Site**: <https://alfasystemstcr.com>
- **Backend**: <https://alfa-backend-mtwa.onrender.com>
- **Issues**: Use the [GitHub Issues](https://github.com/ajsalvk983-dev/Alfa-Systems/issues) tracker