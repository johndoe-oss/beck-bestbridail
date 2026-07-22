# Fix Plan: Images & Payment Verification on Render

## Issue 1: Images Not Loading
- **Root Cause**: Server serves SVG placeholders for /attached_assets/generated_images/* instead of actual JPG files
- **Fix**: Update app.ts to serve actual JPG files from project directories, fallback to SVG only if missing

## Issue 2: Payment Verification Not Working
- **Root Cause 2a**: getBaseUrl() defaults to localhost:5173 when FRONTEND_URL env var not set
- **Root Cause 2b**: Security middleware may block payment verify route (reference params trigger SQL injection patterns)
- **Fix 2a**: Update getBaseUrl() to use request Host header and X-Forwarded-Host 
- **Fix 2b**: Add exception for /api/payments/verify in security middleware

## Steps
- [x] Step 1: Fix image serving in app.ts - serve actual JPG files
- [x] Step 2: Fix getBaseUrl() in payments.ts for Render deployment
- [x] Step 3: Add payment verify route exception in security.ts

