# Beckbest Bridal

A premium full-stack e-commerce platform for Beckbest Bridal — built with React, Express, PostgreSQL, and TypeScript.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment secrets

Configure the following in your Replit Secrets panel (or `.env`):

| Secret | Required | Description |
|--------|----------|-------------|
| `SESSION_SECRET` | ✅ Yes | JWT signing key — set a long random string |
| `DATABASE_URL` | ✅ Auto-set | PostgreSQL connection (Replit manages this) |
| `SMTP_HOST` | Optional | Email server host (e.g. `smtp.sendgrid.net`) |
| `SMTP_PORT` | Optional | Email server port (e.g. `587`) |
| `SMTP_USER` | Optional | Email username |
| `SMTP_PASS` | Optional | Email password / API key |
| `SMTP_FROM` | Optional | Sender address (e.g. `"Beckbest Bridal" <hello@beckbestbridal.com>`) |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio Account SID for SMS |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio phone number (e.g. `+14155552671`) |
| `ADMIN_EMAIL` | Optional | Override default admin email for seed |
| `ADMIN_PASSWORD` | Optional | Override default admin password for seed |

> **Note:** Email and SMS gracefully degrade when not configured — verification codes are logged to the server console instead.

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Seed initial data (admin + sample products)

```bash
npm run seed
```

Default admin credentials (change immediately after first login):
- **Email:** `admin@beckbestbridal.com`
- **Password:** `BeckBest@2024!`

### 5. Start the app

Everything lives under a single `package.json` now — one install, one set of scripts.

Start the API server, storefront, and design sandbox together:

```bash
npm run dev
```

This runs all three concurrently:
- **API server** — http://localhost:5000
- **Storefront (beckbest-bridal)** — http://localhost:5173 (proxies `/api` to the server above)
- **Design sandbox (mockup-sandbox)** — http://localhost:5174

Or run them individually in separate terminals:

```bash
npm run dev:api      # API server
npm run dev:web      # Storefront
npm run dev:sandbox  # Design sandbox
```

---

## Accessing the Admin Portal

The admin portal is intentionally hidden. It is **not linked anywhere** on the public website.

Navigate directly to:
```
https://your-domain.com/bb-studio
```

Log in with your admin credentials (set during seed, or via environment variables).

> **Security note:** The `/admin` path returns a 404 by design to prevent route enumeration.

---

## Architecture

```
artifacts/
├── api-server/         # Express 5 REST API (Node.js 24, TypeScript)
│   ├── src/routes/     # Route handlers
│   │   ├── products.ts           # Public product catalog
│   │   ├── categories.ts         # Public categories
│   │   ├── customers/            # Customer auth, cart, wishlist, orders
│   │   └── portal/               # Admin portal routes
│   ├── src/lib/        # JWT, Email, SMS utilities
│   ├── src/middlewares/ # Auth middleware (customer + admin)
│   └── uploads/        # Uploaded product images (served at /api/uploads/)
├── beckbest-bridal/    # React + Vite storefront + admin portal
│   └── src/
│       ├── pages/      # All pages (storefront + admin portal)
│       └── components/ # Shared UI components
└── mockup-sandbox/     # React + Vite design/mockup sandbox (standalone)

lib/
├── api-spec/           # OpenAPI spec (source of truth)
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod validation schemas
└── db/                 # Drizzle ORM schema + DB connection
```

> **Note:** the whole project shares a single root `package.json` — there's
> just one `npm install`. Former `@workspace/*` package imports (e.g.
> `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`) now
> resolve straight to their source files in `lib/` via aliases configured in
> each app's `vite.config.ts` / `tsconfig.json` / `build.mjs`, instead of
> being pnpm-workspace-linked packages.

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, TanStack Query
- **Backend:** Express 5, Node.js 24, TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** JWT (RS256), bcryptjs (12 rounds)
- **Security:** Helmet, express-rate-limit, CORS
- **Email:** Nodemailer (SMTP)
- **SMS:** Twilio
- **File uploads:** Multer (images stored in `uploads/`, served statically)
- **API codegen:** Orval (OpenAPI → React Query hooks + Zod schemas)

---

## API Overview

Base URL: `/api`

| Area | Endpoints |
|------|-----------|
| Health | `GET /api/healthz` |
| Products | `GET /api/products`, `GET /api/products/featured`, `GET /api/products/:id` |
| Categories | `GET /api/categories` |
| Customer Auth | `POST /api/customers/register`, `/login`, `/verify-email`, `/resend-verification`, `/logout` |
| Customer | `GET /api/customers/me`, cart CRUD, wishlist CRUD, orders |
| Admin Auth | `POST /api/bb-portal/login`, `/logout`, `GET /api/bb-portal/me` |
| Admin Products | Full CRUD at `/api/bb-portal/products` |
| Admin Categories | `/api/bb-portal/categories` |
| Media Upload | `POST /api/bb-portal/media/upload` (multipart/form-data, returns `{ url, filename }`) |
| Admin Customers | `GET /api/bb-portal/customers`, `/customers/:id` |
| Admin Orders | `GET /api/bb-portal/orders`, `PATCH /api/bb-portal/orders/:id` |
| Notifications | `POST /api/bb-portal/notifications/email`, `/notifications/sms` |
| Stats | `GET /api/bb-portal/stats` |

---

## Customer Email Verification Flow

1. Customer registers → 6-digit code is generated and emailed
2. Customer enters code at `/verify-email` → account activated
3. If SMTP is not configured, the code is logged to the API server console

---

## Development

```bash
# Regenerate API hooks after changing openapi.yaml
npm run codegen

# Push schema changes to DB
npm run db:push

# Full typecheck
npm run typecheck

# Build everything
npm run build
```

---

## Security Features

- **JWT authentication** — signed with `SESSION_SECRET`, stored client-side in localStorage
- **bcrypt** — passwords hashed with 12 rounds
- **Helmet** — security HTTP headers
- **Rate limiting** — 10 auth requests / 15 min, 300 general / 15 min
- **CORS** — configured for same-origin
- **Admin route obfuscation** — `/admin` returns 404; real admin is at `/bb-studio` (frontend) and `/bb-portal` (API)
- **Input validation** — all inputs validated with Zod schemas before touching the database
- **SQL injection prevention** — Drizzle ORM with parameterized queries throughout

---

© 2024 Beckbest Bridal
