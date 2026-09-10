# Task Progress & Production Status

## Completed Tasks

- [x] **Google Sign-In & Sign-Up**: Full OAuth 2.0 / Google Identity Services integration on frontend & backend (`/api/customers/google`).
- [x] **Authentication, Authorization & Validation Audit**:
  - JWT token verification with type checks (`customer` vs `admin`).
  - Bcrypt password hashing (12 rounds) with brute-force lockout (15m cooldown after 5 failed attempts).
  - Timing-safe verification code comparisons to prevent timing attacks.
  - Strict Zod schema validation across all customer & admin endpoints.
- [x] **Pay on Delivery Removal**: Deleted the Cash on Delivery / Pay on Delivery section and flow from the frontend purchase modal and restricted payment initiation strictly to verified online gateways (Paystack & Stripe).
- [x] **Dynamic Terms & Conditions & Privacy Policy CMS**:
  - Database schema created in `legal_pages` table with auto-initialization.
  - Pre-seeded comprehensive, production-ready Terms & Conditions and Privacy Policy tailored for luxury bridal gowns and bespoke orders.
  - Public endpoints (`GET /api/legal` and `GET /api/legal/:slug`) and responsive public storefront pages (`/terms`, `/privacy`).
  - Protected Admin Studio CMS (`/bb-studio/legal`) allowing the admin to edit, live-preview, and save terms & privacy policies directly to the database.
- [x] **Product Deletion & Foreign Key Cascading**: Cleaned up active cart and wishlist references in transaction before deletion, eliminating foreign key violation errors.
- [x] **Cloudinary Persistent Media Storage**: Configured to ensure product and lookbook images never vanish on Render's ephemeral filesystem when Cloudinary environment variables are set.
- [x] **Reliable Email Delivery with Resend API**: Added Resend support with automatic fallback to SMTP, solving Gmail/Render IP reputation blocks.

## Hosted Environment Variables Checklist (Render)

Ensure the following are set in your Render dashboard environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `SESSION_SECRET`: Random 32+ character string for JWT signing.
- `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`: Google OAuth Web Client ID with authorized origins set to your domain.
- `RESEND_API_KEY`: API key from [resend.com](https://resend.com).
- `RESEND_FROM`: Verified sender e.g. `"Beckbest Bridal" <onboarding@resend.dev>` or custom domain.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials for permanent media hosting.
- `FRONTEND_URL`: Hosted production domain URL.
